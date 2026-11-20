(() => {
  "use strict";

  /* =========================================
     CONFIGURATION
  ========================================= */

  const API_URL = "http://localhost:5000/api/v1";
  const CART_KEY = "mizumi_cart";
  const POLICY_VERSION = "2026-11-18";

  /* =========================================
     ELEMENTS
  ========================================= */

  const elements = {
    layout: document.getElementById("checkoutLayout"),
    empty: document.getElementById("checkoutEmpty"),
    alert: document.getElementById("checkoutAlert"),

    items: document.getElementById("checkoutItems"),
    itemCount: document.getElementById("summaryItemCount"),
    subtotal: document.getElementById("checkoutSubtotal"),
    total: document.getElementById("checkoutTotal"),

    placeOrder: document.getElementById("placeOrderBtn"),
    placeOrderText: document.getElementById("placeOrderText"),
    placeOrderIcon: document.getElementById("placeOrderIcon"),
    policyAcceptance: document.getElementById("policyAcceptance"),

    confirmation: document.getElementById("orderConfirmation"),
    confirmationNumber: document.getElementById("confirmationOrderNumber"),
    confirmationTotal: document.getElementById("confirmationTotal"),
    confirmationMessage: document.getElementById("confirmationMessage"),

    mobileToggle: document.getElementById("checkoutMobileToggle"),
    navLinks: document.getElementById("checkoutNavLinks"),

    currentYear: document.getElementById("checkoutCurrentYear"),
    // Keep all your existing elements here

    savedAddressSection: document.getElementById("savedAddressSection"),
    savedAddressSelect: document.getElementById("savedAddressSelect"),

    addressSaveModal: document.getElementById("addressSaveModal"),
    newAddressLabel: document.getElementById("newAddressLabel"),
    addressSaveError: document.getElementById("addressSaveError"),
    saveAddressYes: document.getElementById("saveAddressYes"),
    saveAddressNo: document.getElementById("saveAddressNo")

  };

  /* =========================================
     STATE
  ========================================= */

  let cart = [];
  let submitting = false;

  let isCustomerLoggedIn = false;
  let savedAddresses = [];
  let addressPromptHandled = false;
  let savingAddress = false;

  /* =========================================
     HELPERS
  ========================================= */

  function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function readCart() {
    try {
      const storedCart = JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      );

      if (!Array.isArray(storedCart)) {
        return [];
      }

      return storedCart.filter(item =>
        item &&
        typeof item === "object" &&
        item.productId &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
      );

    } catch (error) {
      console.error("Unable to read shopping cart:", error);
      return [];
    }
  }

  function showAlert(message) {
    elements.alert.textContent = message;
    elements.alert.hidden = false;

    elements.alert.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function hideAlert() {
    elements.alert.textContent = "";
    elements.alert.hidden = true;
  }

  /* =========================================
     SAVED CUSTOMER ADDRESSES
  ========================================= */

  async function loadSavedAddresses() {
    try {
      const response = await fetch(`${API_URL}/customer-addresses`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      });

      // A guest is allowed to checkout without saved addresses.
      if (response.status === 401 || response.status === 403) {
        isCustomerLoggedIn = false;
        return;
      }

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(result.message || "Unable to load saved addresses.");
      }

      isCustomerLoggedIn = true;
      savedAddresses = Array.isArray(result.addresses)
        ? result.addresses
        : [];

      renderSavedAddresses();

    } catch (error) {
      console.error("Saved address loading error:", error);
    }
  }

  function renderSavedAddresses() {
    const section = elements.savedAddressSection;
    const select = elements.savedAddressSelect;

    select.replaceChildren();

    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = "Enter a different address";
    select.appendChild(blankOption);

    if (!savedAddresses.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;

    // Put the primary address first.
    const orderedAddresses = [...savedAddresses].sort(
      (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))
    );

    orderedAddresses.forEach(address => {
      const option = document.createElement("option");
      option.value = address._id;

      const label = address.label || "Address";
      const primary = address.isDefault ? " (Primary)" : "";

      option.textContent =
        `${label}${primary} — ${address.addressLine1}, ${address.city}`;

      select.appendChild(option);
    });

    const primaryAddress =
      orderedAddresses.find(address => address.isDefault) ||
      orderedAddresses[0];

    select.value = primaryAddress._id;
    fillAddressFields(primaryAddress);
  }

  function fillAddressFields(address) {
    document.getElementById("addressLine1").value =
      address.addressLine1 || "";

    document.getElementById("addressLine2").value =
      address.addressLine2 || "";

    document.getElementById("city").value = address.city || "";
    document.getElementById("state").value = address.state || "";
    document.getElementById("postalCode").value =
      address.postalCode || "";

    document.getElementById("country").value =
      address.country || "India";
  }

  function getCurrentAddressPayload() {
    return {
      label: elements.newAddressLabel.value,
      addressLine1: getField("addressLine1"),
      addressLine2: getField("addressLine2"),
      city: getField("city"),
      state: getField("state"),
      postalCode: getField("postalCode"),
      country: getField("country") || "India",
      isDefault: true
    };
  }

  function showAddressSaveModal() {
    elements.addressSaveError.hidden = true;
    elements.addressSaveError.textContent = "";
    elements.addressSaveModal.hidden = false;
  }

  function hideAddressSaveModal() {
    elements.addressSaveModal.hidden = true;
  }

  async function saveAddressAndContinue() {
    if (savingAddress || submitting) return;

    savingAddress = true;
    elements.saveAddressYes.disabled = true;
    elements.saveAddressNo.disabled = true;
    elements.saveAddressYes.textContent = "Saving...";

    try {
      const response = await fetch(`${API_URL}/customer-addresses`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(getCurrentAddressPayload())
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(result.message || "Unable to save this address.");
      }

      savedAddresses = Array.isArray(result.addresses)
        ? result.addresses
        : [];

      addressPromptHandled = true;
      renderSavedAddresses();
      hideAddressSaveModal();

      await placeOrder();

    } catch (error) {
      console.error("Save address error:", error);
      elements.addressSaveError.textContent =
        error.message || "Unable to save this address. You can still continue without saving.";
      elements.addressSaveError.hidden = false;

    } finally {
      savingAddress = false;
      elements.saveAddressYes.disabled = false;
      elements.saveAddressNo.disabled = false;
      elements.saveAddressYes.textContent = "Yes, save address";
    }
  }

  function continueWithoutSavingAddress() {
    if (savingAddress || submitting) return;

    addressPromptHandled = true;
    hideAddressSaveModal();
    placeOrder();
  }

  function setLoading(isLoading) {
    submitting = isLoading;
    elements.placeOrder.disabled = isLoading;

    elements.placeOrderText.textContent = isLoading
      ? "Placing Your Order..."
      : "Place Order";

    elements.placeOrderIcon.className = isLoading
      ? "fa-solid fa-spinner fa-spin"
      : "fa-solid fa-arrow-right";
  }

  function getCartSubtotal() {
    return cart.reduce((total, item) => {
      return total +
        (Number(item.price) || 0) * Number(item.quantity);
    }, 0);
  }

  function getTotalQuantity() {
    return cart.reduce((total, item) => {
      return total + Number(item.quantity);
    }, 0);
  }

  /* =========================================
     RENDER CART SUMMARY
  ========================================= */

  function renderCart() {
    elements.items.replaceChildren();

    if (!cart.length) {
      elements.layout.hidden = true;
      elements.empty.hidden = false;
      return;
    }

    elements.layout.hidden = false;
    elements.empty.hidden = true;

    cart.forEach(item => {
      const itemElement = document.createElement("div");
      itemElement.className = "checkout-item";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "checkout-item-image";

      if (item.image) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name || "Aquarium product";
        image.loading = "lazy";

        image.onerror = () => {
          imageWrapper.replaceChildren();

          const placeholder = document.createElement("div");
          placeholder.className = "checkout-item-placeholder";

          const icon = document.createElement("i");
          icon.className = "fa-solid fa-fish";

          placeholder.appendChild(icon);
          imageWrapper.appendChild(placeholder);
        };

        imageWrapper.appendChild(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "checkout-item-placeholder";

        const icon = document.createElement("i");
        icon.className = "fa-solid fa-fish";

        placeholder.appendChild(icon);
        imageWrapper.appendChild(placeholder);
      }

      const info = document.createElement("div");
      info.className = "checkout-item-info";

      const name = document.createElement("h3");
      name.textContent = item.name || "Aquarium Product";

      const quantity = document.createElement("p");
      quantity.textContent = `Quantity: ${item.quantity}`;

      info.append(name, quantity);

      const price = document.createElement("div");
      price.className = "checkout-item-price";
      price.textContent = formatPrice(
        (Number(item.price) || 0) * Number(item.quantity)
      );

      itemElement.append(imageWrapper, info, price);
      elements.items.appendChild(itemElement);
    });

    const subtotal = getCartSubtotal();

    elements.itemCount.textContent =
      `${getTotalQuantity()} item${getTotalQuantity() === 1 ? "" : "s"}`;

    elements.subtotal.textContent = formatPrice(subtotal);
    elements.total.textContent = formatPrice(subtotal);
  }

  /* =========================================
     FORM VALIDATION
  ========================================= */

  function getField(id) {
    return document.getElementById(id).value.trim();
  }

  function validateCheckout() {
    const requiredFields = [
      "customerName",
      "customerPhone",
      "addressLine1",
      "city",
      "state",
      "postalCode"
    ];

    for (const id of requiredFields) {
      const field = document.getElementById(id);

      if (!field.value.trim()) {
        field.focus();
        showAlert("Please complete all required fields.");
        return false;
      }
    }

    const phone = getField("customerPhone").replace(/[\s+-]/g, "");

    if (!/^\d{10,15}$/.test(phone)) {
      document.getElementById("customerPhone").focus();
      showAlert("Please enter a valid phone number.");
      return false;
    }

    const email = getField("customerEmail");

    if (email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        document.getElementById("customerEmail").focus();
        showAlert("Please enter a valid email address.");
        return false;
      }
    }

    const postalCode = getField("postalCode");

    if (!/^[a-zA-Z0-9\s-]{3,12}$/.test(postalCode)) {
      document.getElementById("postalCode").focus();
      showAlert("Please enter a valid PIN code.");
      return false;
    }
    const policyBox = elements.policyAcceptance;

    if (!policyBox.checked) {
      policyBox.focus();
    
      const policyContainer = policyBox.closest(".checkout-policy");
      policyContainer.classList.add("is-invalid");
    
      showAlert(
        "Please accept the Terms & Conditions, Privacy Policy, and Return & Refund Policy before placing your order."
      );
    
      return false;
    }

    policyBox.closest(".checkout-policy").classList.remove("is-invalid");
    return true;
  }

  /* =========================================
     BUILD ORDER REQUEST
  ========================================= */

  function buildOrderPayload() {
    return {
      customer: {
        name: getField("customerName"),
        phone: getField("customerPhone"),
        email: getField("customerEmail")
      },

      shippingAddress: {
        addressLine1: getField("addressLine1"),
        addressLine2: getField("addressLine2"),
        city: getField("city"),
        state: getField("state"),
        postalCode: getField("postalCode"),
        country: getField("country") || "India"
      },

      items: cart.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      })),

      paymentMethod: "cash_on_delivery",

      customerNote: getField("customerNote"),
      policyAcceptance: {
        accepted: elements.policyAcceptance.checked,
        version: POLICY_VERSION
      }
    };
  }

  /* =========================================
     PLACE ORDER
  ========================================= */


  async function placeOrder() {
      if (submitting) return;
  
      hideAlert();
  
      if (!cart.length) {
          showAlert("Your shopping cart is empty.");
          return;
      }
    
      
      if (!validateCheckout()) {
          return;
        }

      // Ask signed-in customers to save their first address.
      if (
          isCustomerLoggedIn &&
          savedAddresses.length === 0 &&
          !addressPromptHandled
        ) {
          showAddressSaveModal();
          return;
        }

      setLoading(true);

    
      try {
          // Build the order data from the checkout form.
          const payload = buildOrderPayload();
      
          const response = await fetch(`${API_URL}/orders`, {
              method: "POST",
              credentials: "include",
              headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
              },
              body: JSON.stringify(payload)
          });
        
          let result;
        
          try {
              result = await response.json();
          } catch {
              throw new Error("The server returned an invalid response.");
          }
        
          if (!response.ok) {
              throw new Error(
                  result.message || "Unable to place your order."
              );
          }
        
          if (!result.order || !result.order.orderNumber) {
              throw new Error(
                  "The server did not return a valid order confirmation."
              );
          }
        
          // Clear cart only after successful order creation.
          localStorage.removeItem(CART_KEY);
          cart = [];
        
          // Display confirmation.
          showConfirmation(result.order);
        
      } catch (error) {
          console.error("Checkout error:", error);
          showAlert(error.message || "Something went wrong.");
      } finally {
          setLoading(false);
      }
  }


  /* =========================================
     ORDER CONFIRMATION
  ========================================= */

  function showConfirmation(order) {
    elements.layout.hidden = true;
    elements.empty.hidden = true;
    elements.alert.hidden = true;
    elements.confirmation.hidden = false;

    elements.confirmationNumber.textContent = order.orderNumber;

    elements.confirmationTotal.textContent =
      formatPrice(order.total);

    elements.confirmationMessage.textContent =
      "Your order has been successfully placed. Thank you for shopping with MIZUMI Aquatics.";

    document.querySelector(".checkout-hero").hidden = true;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* =========================================
     MOBILE NAVIGATION
  ========================================= */

  function setupMobileNavigation() {
    if (!elements.mobileToggle || !elements.navLinks) return;

    elements.mobileToggle.addEventListener("click", () => {
      const isOpen = elements.navLinks.classList.toggle("is-open");

      elements.mobileToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      elements.mobileToggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    elements.navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        elements.navLinks.classList.remove("is-open");

        elements.mobileToggle.setAttribute(
          "aria-expanded",
          "false"
        );

        elements.mobileToggle.innerHTML =
          '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  /* =========================================
     INITIALIZATION
  ========================================= */

  function initialize() {
    cart = readCart();

    renderCart();
    setupMobileNavigation();
    elements.policyAcceptance.addEventListener("change", () => {
    if (elements.policyAcceptance.checked) {
      elements.policyAcceptance
        .closest(".checkout-policy")
        .classList.remove("is-invalid");
    }
    });

    if (elements.currentYear) {
      elements.currentYear.textContent =
        new Date().getFullYear();
    }

    elements.savedAddressSelect.addEventListener("change", () => {
      const selectedAddress = savedAddresses.find(
        address => address._id === elements.savedAddressSelect.value
      );

      if (selectedAddress) {
        fillAddressFields(selectedAddress);
      }
    });

    elements.saveAddressYes.addEventListener(
      "click",
      saveAddressAndContinue
    );

    elements.saveAddressNo.addEventListener(
      "click",
      continueWithoutSavingAddress
    );

    elements.placeOrder.addEventListener("click", placeOrder);
  }

  initialize();
  loadSavedAddresses();
})();