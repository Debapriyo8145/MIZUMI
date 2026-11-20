/* =========================================================
   MIZUMI AQUATICS — HOMEPAGE JAVASCRIPT
   Vanilla JavaScript + Express API
   ========================================================= */

"use strict";

/* -------------------- CONFIGURATION -------------------- */

const MIZUMI_CONFIG = {
    apiBaseUrl: "http://localhost:5000/api/v1",
    currency: "INR",
    locale: "en-IN",
    productsPerSection: 8
};

/* -------------------- DOM HELPERS -------------------- */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatPrice(amount) {
    return new Intl.NumberFormat(MIZUMI_CONFIG.locale, {
        style: "currency",
        currency: MIZUMI_CONFIG.currency,
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

/* -------------------- PRODUCT DATA -------------------- */

let allProducts = [];

function loadStoredCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("mizumi_cart") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Could not read saved cart:", error);
    return [];
  }
}

let cart = loadStoredCart();

// Fallback products are displayed only when the API is unavailable.
const fallbackProducts = [
    {
        _id: "demo-betta",
        sku: "MIZ-BET-001",
        name: "Premium Betta",
        category: "fish",
        subcategory: "Betta",
        description: "A colourful freshwater centrepiece.",
        price: 450,
        image: "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=700",
        tag: "Featured",
        stock: 8
    },
    {
        _id: "demo-guppy",
        sku: "MIZ-GUP-001",
        name: "Fancy Guppy",
        category: "fish",
        subcategory: "Guppy",
        description: "A vibrant addition to suitable community aquariums.",
        price: 120,
        image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=700",
        tag: "Popular",
        stock: 20
    },
    {
        _id: "demo-goldfish",
        sku: "MIZ-GOL-001",
        name: "Fancy Goldfish",
        category: "goldfish",
        subcategory: "Goldfish",
        description: "An elegant ornamental freshwater fish.",
        price: 350,
        image: "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=700",
        tag: "Collection",
        stock: 10
    },
    {
        _id: "demo-cichlid",
        sku: "MIZ-CIC-001",
        name: "Electric Blue Cichlid",
        category: "cichlid",
        subcategory: "Cichlid",
        description: "A striking freshwater aquarium species.",
        price: 550,
        image: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=700",
        tag: "Featured",
        stock: 6
    },
    {
        _id: "demo-filter",
        sku: "MIZ-FLT-001",
        name: "Aquarium Filter",
        category: "equipment",
        subcategory: "Filtration",
        description: "Filtration for a healthier aquarium environment.",
        price: 799,
        image: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=700",
        tag: "Essential",
        stock: 5
    },
    {
        _id: "demo-plants",
        sku: "MIZ-PLT-001",
        name: "Aquatic Plant Collection",
        category: "plants",
        subcategory: "Aquatic Plants",
        description: "Bring natural greenery into your aquarium.",
        price: 299,
        image: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=700",
        tag: "Natural",
        stock: 12
    },
    {
        _id: "demo-hardscape",
        sku: "MIZ-HSC-001",
        name: "Natural Hardscape",
        category: "hardscape",
        subcategory: "Hardscape",
        description: "Create depth with aquarium-safe materials.",
        price: 499,
        image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=700",
        tag: "Aquascaping",
        stock: 7
    },
    {
        _id: "demo-food",
        sku: "MIZ-FOO-001",
        name: "Tropical Fish Food",
        category: "food",
        subcategory: "Fish Food",
        description: "A convenient addition to a balanced feeding routine.",
        price: 199,
        image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=700",
        tag: "Daily Care",
        stock: 15
    }
];

/* -------------------- PRODUCT NORMALIZATION -------------------- */

function normalizeProduct(product) {
    return {
        id: String(product._id || product.id || product.sku || ""),
        sku: product.sku || "",
        name: product.name || "Unnamed product",
        category: String(product.category || "").toLowerCase(),
        subcategory: product.subcategory || "",
        description: product.description || "",
        price: Number(product.price) || 0,
        image: product.image || "",
        tag: product.tag || "",
        stock: Number(product.stock) || 0,
        isActive: product.isActive !== false
    };
}

/* -------------------- LOAD PRODUCTS FROM API -------------------- */

function showSectionMessage(containerId, message) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = `
        <div class="col-12">
            <p class="text-muted small mb-0">
                ${escapeHTML(message)}
            </p>
        </div>
    `;
}

async function loadProducts() {
    showSectionMessage("fishProducts", "Loading fish...");
    showSectionMessage("essentialProducts", "Loading products...");

    try {
        const response = await fetch(
            `${MIZUMI_CONFIG.apiBaseUrl}/products?limit=50&sort=featured`,
            {
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Product API returned ${response.status}`);
        }

        const result = await response.json();

        const products = Array.isArray(result)
            ? result
            : result.products ||
              result.data?.products ||
              result.data ||
              [];

        if (!Array.isArray(products) || products.length === 0) {
            throw new Error("No products were returned by the API.");
        }

        allProducts = products.map(normalizeProduct);


    } catch (error) {
        console.error("Could not load live products:", error);

        // Never show demo products as if they were real inventory.
        allProducts = [];
    }

    renderHomepageSections();
}

/* -------------------- PRODUCT CATEGORIES -------------------- */

function isFishProduct(product) {
    return ["fish", "cichlid", "goldfish"].includes(product.category);
}

function renderHomepageSections() {
    const activeProducts = allProducts.filter(
        product => product.isActive
    );

    const fish = activeProducts
        .filter(isFishProduct)
        .slice(0, MIZUMI_CONFIG.productsPerSection);

    const essentials = activeProducts
        .filter(product => !isFishProduct(product))
        .slice(0, MIZUMI_CONFIG.productsPerSection);

    renderProducts(fish, "fishProducts");
    renderProducts(essentials, "essentialProducts");
}

/* -------------------- PRODUCT CARD -------------------- */


function createProductCard(product) {
    const imageMarkup = product.image
        ? `
            <img
                src="${escapeHTML(product.image)}"
                alt="${escapeHTML(product.name)}"
                loading="lazy"
                data-product-image
            >
        `
        : `
            <div class="product-image-fallback" role="img"
                 aria-label="Product image not available">
                <i class="fa-solid fa-fish"></i>
            </div>
        `;

    return `
        <div class="col-6 col-md-3">
            <article
                class="product-card"
                data-product-id="${escapeHTML(product.id)}"
                data-sku="${escapeHTML(product.sku)}"
                data-category="${escapeHTML(product.category)}"
            >
                <div class="product-image">
                    ${imageMarkup}

                    ${
                        product.tag
                            ? `<span class="product-tag">
                                ${escapeHTML(product.tag)}
                               </span>`
                            : ""
                    }
                </div>

                <div class="product-info">
                    <span class="product-category">
                        ${escapeHTML(product.subcategory || product.category)}
                    </span>

                    <h3>${escapeHTML(product.name)}</h3>
                    <p>${escapeHTML(product.description)}</p>

                    <div class="product-bottom">
                        <span class="product-price">
                            ${formatPrice(product.price)}
                        </span>

                        <button
                            class="add-cart"
                            type="button"
                            data-add-to-cart="${escapeHTML(product.id)}"
                            aria-label="Add ${escapeHTML(product.name)} to cart"
                            ${product.stock <= 0 ? "disabled" : ""}
                        >
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>

                    ${
                        product.stock <= 0
                            ? '<small class="text-muted">Currently unavailable</small>'
                            : ""
                    }
                </div>
            </article>
        </div>
    `;
}


function renderProducts(products, containerId) {
    const container = document.getElementById(containerId);

    if (!container) return;

    if (!products.length) {
        container.innerHTML = `
            <div class="col-12">
                <p class="text-muted small">
                    No products available right now.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = products
        .map(createProductCard)
        .join("");
    
    container.querySelectorAll("[data-product-image]").forEach(image => {
        image.addEventListener("error", () => {
            const wrapper = image.closest(".product-image");

            if (!wrapper) return;

            wrapper.innerHTML = `
                <div class="product-image-fallback" role="img"
                     aria-label="Product image unavailable">
                    <i class="fa-solid fa-fish"></i>
                </div>
            `;
        }, { once: true });
    });

}

/* -------------------- CATEGORY FILTERS -------------------- */

function setupCategoryFilters() {
    const buttons = $$(".filter-btn");

    if (!buttons.length) return;

    buttons.forEach(button => {
        button.addEventListener("click", () => {

            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const category = button.dataset.filter || "all";

            const filtered = allProducts.filter(product => {

                if (!product.isActive || !isFishProduct(product)) {
                    return false;
                }

                if (category === "all" || category === "fish") {
                    return true;
                }

                return (
                    product.category === category ||
                    product.subcategory.toLowerCase() ===
                    category.toLowerCase()
                );
            });

            renderProducts(
                filtered.slice(0, MIZUMI_CONFIG.productsPerSection),
                "fishProducts"
            );
        });
    });
}


function showCartToast(message) {
  let toast = document.getElementById("homepageCartToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "homepageCartToast";
    toast.className = "shop-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <i class="fa-solid fa-check"></i>
    <span>${escapeHTML(message)}</span>
    <a href="cart.html" class="shop-toast-link">View Cart</a>
  `;

  toast.classList.add("show");

  clearTimeout(showCartToast.timer);

  showCartToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}
/* -------------------- SHOPPING CART -------------------- */
function addToCart(productId) {
    const product = allProducts.find(
        item => item.id === productId
    );

    if (!product) return;

    if (product.stock <= 0) {
        alert("This product is currently unavailable.");
        return;
    }

    const existing = cart.find(
        item => item.productId === productId
    );

    if (existing) {

        if (existing.quantity >= product.stock) {
            alert("You have reached the available stock quantity.");
            return;
        }

        existing.quantity += 1;

    } else {

        cart.push({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    updateCart();
    showCartToast(`${product.name} added to your cart successfully`);
}


function changeQuantity(productId, change) {
    const item = cart.find(
        cartItem => cartItem.productId === productId
    );

    if (!item) return;

    const product = allProducts.find(
        productItem => productItem.id === productId
    );

    const nextQuantity = item.quantity + change;

    if (nextQuantity <= 0) {

        cart = cart.filter(
            cartItem => cartItem.productId !== productId
        );

    } else if (product && nextQuantity > product.stock) {

        alert("You have reached the available stock quantity.");
        return;

    } else {

        item.quantity = nextQuantity;
    }

    updateCart();
}

function updateCart() {
  const cartContainer = $("#cartItems");
  const countElement = $("#cartCount");
  const totalElement = $("#cartTotal");

  // Save the same cart format used by shop.js and cart.js.
  localStorage.setItem("mizumi_cart", JSON.stringify(cart));

  const quantity = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0), 0
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0
  );

  if (countElement) countElement.textContent = quantity;
  if (totalElement) totalElement.textContent = formatPrice(subtotal);

  if (!cartContainer) return;

  if (!cart.length) {
    cartContainer.innerHTML =
      '<p class="text-muted small">Your bag is currently empty.</p>';
    return;
  }

  cartContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img
        src="${escapeHTML(item.image || "https://placehold.co/100x100?text=MIZUMI")}"
        alt="${escapeHTML(item.name)}"
      >
      <div class="cart-item-info">
        <h6>${escapeHTML(item.name)}</h6>
        <p>${formatPrice(item.price)}</p>
        <div class="quantity-controls">
          <button type="button"
            data-quantity="${escapeHTML(item.productId)}"
            data-change="-1"
            aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button"
            data-quantity="${escapeHTML(item.productId)}"
            data-change="1"
            aria-label="Increase quantity">+</button>
        </div>
      </div>
    </div>
  `).join("");
}

function setupCartEvents() {

    document.addEventListener("click", event => {

        const addButton = event.target.closest("[data-add-to-cart]");

        if (addButton) {
            addToCart(addButton.dataset.addToCart);
            return;
        }

        const quantityButton = event.target.closest("[data-quantity]");

        if (quantityButton) {
            changeQuantity(
                quantityButton.dataset.quantity,
                Number(quantityButton.dataset.change)
            );
        }
    });

    const checkoutButton = $("#checkoutBtn");

    if (checkoutButton) {

        checkoutButton.addEventListener("click", () => {

            if (!cart.length) {
                alert("Your shopping bag is empty.");
                return;
            }

            // Checkout is not connected to an order API yet.
            // The backend must verify prices, stock, delivery
            // and customer details.

            console.log("Checkout items:", cart.map(item => ({
                productId: item.productId,
                sku: item.sku,
                quantity: item.quantity
            })));

            alert(
                "Online checkout is not connected yet. Please contact the store to place your order."
            );
        });
    }
}

/* -------------------- HOMEPAGE SEARCH -------------------- */

function setupSearch() {
    const toggle = $("#searchToggle");
    const panel = $("#searchPanel");
    const input = $("#siteSearch");

    if (toggle && panel) {

        toggle.addEventListener("click", () => {

            const opening = panel.classList.contains("d-none");

            panel.classList.toggle("d-none");

            toggle.setAttribute(
                "aria-expanded",
                String(opening)
            );

            if (opening && input) {
                input.focus();
            }
        });
    }

    if (!input) return;

    function goToSearchResults() {
        const query = input.value.trim();

        if (!query) return;

        window.location.href =
            `shop.html?search=${encodeURIComponent(query)}`;
    }

    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            event.preventDefault();
            goToSearchResults();
        }
    });

    const form = input.closest("form");

    if (form) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            goToSearchResults();
        });
    }
}

/* -------------------- MOBILE NAVIGATION -------------------- */

function setupMobileNavigation() {
    const toggle = $("#mobileToggle");
    const navLinks = $("#navLinks");

    if (!toggle || !navLinks) return;

    toggle.addEventListener("click", () => {

        const open = navLinks.classList.toggle("show");

        toggle.setAttribute(
            "aria-expanded",
            String(open)
        );

        toggle.innerHTML = open
            ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    });

    $$("a", navLinks).forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("show");

            toggle.setAttribute("aria-expanded", "false");

            toggle.innerHTML =
                '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        });
    });
}

/* -------------------- NEWSLETTER -------------------- */

function setupNewsletter() {
    const form = $("#newsletterForm");
    const message = $("#newsletterMessage");

    if (!form) return;

    form.addEventListener("submit", event => {

        event.preventDefault();

        const email = $('input[type="email"]', form)?.value.trim();

        if (!email) return;

        // Newsletter API endpoint has not been implemented yet.

        if (message) {
            message.textContent =
                "Newsletter sign-up is not available yet. Please check back soon.";
        }

        form.reset();
    });
}

/* -------------------- INITIALIZATION -------------------- */

function initializeHomepage() {

    const year = $("#currentYear");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    setupMobileNavigation();
    setupSearch();
    setupCategoryFilters();
    setupCartEvents();
    setupNewsletter();

    updateCart();

    loadProducts();
}

/* Wait until the HTML has loaded before attaching events. */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeHomepage
    );

} else {

    initializeHomepage();
}