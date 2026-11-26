
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

function getImageUrl(imagePath) {
    if (!imagePath) return "";

    try {
        return new URL(
            imagePath,
            new URL(MIZUMI_CONFIG.apiBaseUrl).origin
        ).href;
    } catch (error) {
        console.warn("Invalid image URL:", imagePath);
        return "";
    }
}

/* -------------------- ANNOUNCEMENT -------------------- */

async function loadAnnouncement() {
    const bar = $("#announcementBar");
    const primary = $("#announcementPrimary");
    const secondary = $("#announcementSecondary");

    if (!bar || !primary || !secondary) return;

    try {
        const response = await fetch(
            `${MIZUMI_CONFIG.apiBaseUrl}/announcement`,
            {
                headers: { Accept: "application/json" }
            }
        );

        if (!response.ok) {
            throw new Error(`Announcement API: ${response.status}`);
        }

        const result = await response.json();
        const announcement = result.announcement;

        if (!result.success || !announcement) {
            throw new Error("Invalid announcement response.");
        }

        if (!announcement.isActive) {
            bar.hidden = true;
            return;
        }

        primary.textContent = announcement.primaryText || "";

        secondary.textContent = announcement.secondaryText
            ? ` | ${announcement.secondaryText}`
            : "";

        bar.hidden = false;

    } catch (error) {
        console.warn("Could not load announcement:", error);
        // Keep the default announcement visible.
    }
}

/* -------------------- DYNAMIC HOMEPAGE HERO -------------------- */

async function loadHero() {
    const heroSection = $("#homepageHero");

    if (!heroSection) {
        console.warn("Homepage hero element #homepageHero was not found.");
        return;
    }

    try {
        const response = await fetch(
            `${MIZUMI_CONFIG.apiBaseUrl}/hero`,
            {
                headers: { Accept: "application/json" }
            }
        );

        if (!response.ok) {
            throw new Error(`Hero API: ${response.status}`);
        }

        const result = await response.json();
        const hero = result.hero;

        if (!result.success || !hero) {
            throw new Error("Invalid hero response.");
        }

        if (!hero.isActive) {
            heroSection.hidden = true;
            return;
        }

        heroSection.hidden = false;

        // Eyebrow
        const eyebrow = $("#heroEyebrow");
        if (eyebrow) {
            eyebrow.textContent = hero.eyebrow || "";
        }

        // Heading
        const heading = $("#heroHeading");
        if (heading) {
            heading.textContent = hero.heading || "";
            heading.style.whiteSpace = "pre-line";
        }

        // Description
        const description = $("#heroDescription");
        if (description) {
            description.textContent = hero.description || "";
        }

        // Primary button
        const primaryButton = $("#heroPrimaryButton");

        if (primaryButton) {
            primaryButton.href = hero.primaryButtonUrl || "shop.html";

            primaryButton.replaceChildren(
                document.createTextNode(hero.primaryButtonText || "")
            );

            const arrow = document.createElement("i");
            arrow.className = "fa-solid fa-arrow-right";
            arrow.setAttribute("aria-hidden", "true");

            primaryButton.appendChild(arrow);
        }

        // Secondary button
        const secondaryButton = $("#heroSecondaryButton");

        if (secondaryButton) {
            secondaryButton.href = hero.secondaryButtonUrl || "#services";
            secondaryButton.textContent = hero.secondaryButtonText || "";
        }

        // Bottom note
        const note = $("#heroNote");

        if (note) {
            note.textContent = hero.heroNote || "";
        }

        // Background image and overlay
        if (hero.imageUrl) {
            const imageUrl = getImageUrl(hero.imageUrl);

            if (imageUrl) {
                const opacity = Math.min(
                    100,
                    Math.max(0, Number(hero.overlayOpacity ?? 65))
                ) / 100;

                const positionX = Math.min(
                    100,
                    Math.max(0, Number(hero.imagePositionX ?? 50))
                );

                const positionY = Math.min(
                    100,
                    Math.max(0, Number(hero.imagePositionY ?? 48))
                );

                heroSection.style.backgroundImage = `
                    linear-gradient(
                        90deg,
                        rgba(10,31,25,${opacity}),
                        rgba(10,31,25,${opacity * 0.4}) 55%,
                        rgba(10,31,25,0.05)
                    ),
                    url("${imageUrl}")
                `;

                heroSection.style.backgroundPosition =
                    `${positionX}% ${positionY}%`;

                heroSection.style.backgroundSize = "cover";
                heroSection.style.backgroundRepeat = "no-repeat";
            }
        }

    } catch (error) {
        console.error("Could not load homepage hero:", error);
        // The original CSS hero remains as a fallback.
    }
}

/* -------------------- PRODUCT DATA -------------------- */

let allProducts = [];

/* -------------------- SHOPPING CART DATA -------------------- */

function loadStoredCart() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("mizumi_cart") || "[]"
        );

        return Array.isArray(saved) ? saved : [];

    } catch (error) {
        console.error("Could not read saved cart:", error);
        return [];
    }
}

let cart = loadStoredCart();

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

/* -------------------- SECTION MESSAGES -------------------- */

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

/* -------------------- LOAD PRODUCTS FROM API -------------------- */

async function loadProducts() {
    showSectionMessage("fishProducts", "Loading fish...");
    showSectionMessage("essentialProducts", "Loading products...");

    try {
        const response = await fetch(
            `${MIZUMI_CONFIG.apiBaseUrl}/products?limit=50&sort=featured`,
            {
                headers: { Accept: "application/json" }
            }
        );

        if (!response.ok) {
            throw new Error(`Product API: ${response.status}`);
        }

        const result = await response.json();

        const products = Array.isArray(result)
            ? result
            : result.products ||
              result.data?.products ||
              result.data ||
              [];

        if (!Array.isArray(products)) {
            throw new Error("Invalid product response.");
        }

        allProducts = products.map(normalizeProduct);

    } catch (error) {
        console.error("Could not load live products:", error);

        // Do not present demo products as real store inventory.
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
    const image = getImageUrl(product.image) ||
        "https://placehold.co/700x700?text=MIZUMI";

    const productUrl = product.id
        ? `product_view.html?id=${encodeURIComponent(product.id)}`
        : "shop.html";

    const isAvailable = product.stock > 0;

    return `
        <div class="col-6 col-md-3">
            <article
                class="product-card"
                data-product-id="${escapeHTML(product.id)}"
                data-sku="${escapeHTML(product.sku)}"
                data-category="${escapeHTML(product.category)}"
            >

                <a
                    href="${productUrl}"
                    class="homepage-product-link"
                    aria-label="View ${escapeHTML(product.name)} details"
                >
                    <div class="product-image">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(product.name)}"
                            loading="lazy"
                            data-product-image
                        >

                        ${
                            product.tag
                                ? `<span class="product-tag">
                                    ${escapeHTML(product.tag)}
                                   </span>`
                                : ""
                        }

                    </div>
                </a>

                <div class="product-info">

                    <span class="product-category">
                        ${escapeHTML(
                            product.subcategory || product.category
                        )}
                    </span>

                    <h3>
                        <a
                            href="${productUrl}"
                            class="homepage-product-title"
                        >
                            ${escapeHTML(product.name)}
                        </a>
                    </h3>

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
                            ${!isAvailable ? "disabled" : ""}
                        >
                            <i
                                class="fa-solid fa-plus"
                                aria-hidden="true"
                            ></i>
                        </button>

                    </div>

                    <div class="homepage-product-actions">
                        <a
                            href="${productUrl}"
                            class="homepage-details-link"
                        >
                            View Details
                            <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>

                    ${
                        !isAvailable
                            ? '<small class="text-muted">Currently unavailable</small>'
                            : ""
                    }

                </div>

            </article>
        </div>
    `;
}

/* -------------------- RENDER PRODUCTS -------------------- */

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

    // Product image fallback
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

            const category = (
                button.dataset.filter || "all"
            ).toLowerCase();

            const filtered = allProducts.filter(product => {
                if (!product.isActive || !isFishProduct(product)) {
                    return false;
                }

                if (category === "all" || category === "fish") {
                    return true;
                }

                return (
                    product.category === category ||
                    product.subcategory.toLowerCase() === category
                );
            });

            renderProducts(
                filtered.slice(0, MIZUMI_CONFIG.productsPerSection),
                "fishProducts"
            );
        });
    });
}

/* -------------------- CART TOAST -------------------- */

function showCartToast(message) {
    let toast = $("#homepageCartToast");

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

/* -------------------- ADD TO CART -------------------- */

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

    showCartToast(
        `${product.name} added to your cart successfully`
    );
}

/* -------------------- CHANGE CART QUANTITY -------------------- */

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

/* -------------------- UPDATE CART -------------------- */

function updateCart() {
    const cartContainer = $("#cartItems");
    const countElement = $("#cartCount");
    const totalElement = $("#cartTotal");

    localStorage.setItem("mizumi_cart", JSON.stringify(cart));

    const quantity = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    const subtotal = cart.reduce(
        (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
    );

    if (countElement) {
        countElement.textContent = quantity;
    }

    if (totalElement) {
        totalElement.textContent = formatPrice(subtotal);
    }

    if (!cartContainer) return;

    if (!cart.length) {
        cartContainer.innerHTML =
            '<p class="text-muted small">Your shopping bag is currently empty.</p>';
        return;
    }

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img
                src="${escapeHTML(
                    getImageUrl(item.image) ||
                    "https://placehold.co/100x100?text=MIZUMI"
                )}"
                alt="${escapeHTML(item.name)}"
            >

            <div class="cart-item-info">
                <h6>${escapeHTML(item.name)}</h6>
                <p>${formatPrice(item.price)}</p>

                <div class="quantity-controls">
                    <button
                        type="button"
                        data-quantity="${escapeHTML(item.productId)}"
                        data-change="-1"
                        aria-label="Decrease quantity"
                    >−</button>

                    <span>${Number(item.quantity) || 0}</span>

                    <button
                        type="button"
                        data-quantity="${escapeHTML(item.productId)}"
                        data-change="1"
                        aria-label="Increase quantity"
                    >+</button>
                </div>
            </div>
        </div>
    `).join("");
}

/* -------------------- CART EVENTS -------------------- */

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

            console.log(
                "Checkout items:",
                cart.map(item => ({
                    productId: item.productId,
                    sku: item.sku,
                    quantity: item.quantity
                }))
            );

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

        toggle.setAttribute(
            "aria-label",
            open ? "Close navigation" : "Open navigation"
        );

        toggle.innerHTML = open
            ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    });

    $$("a", navLinks).forEach(link => {
        link.addEventListener("click", () => {

            navLinks.classList.remove("show");

            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation");

            toggle.innerHTML =
                '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        });
    });
}

/* -------------------- NEWSLETTER -------------------- */

function setupNewsletter() {
    // Support both the homepage and older newsletter element IDs.
    const form =
        $("#newsletterForm") ||
        $("#shopNewsletterForm");

    const message =
        $("#newsletterMessage") ||
        $("#shopNewsletterMessage");

    if (!form) return;

    form.addEventListener("submit", event => {
        event.preventDefault();

        const email = $('input[type="email"]', form)?.value.trim();

        if (!email) return;

        // Newsletter API has not been implemented yet.
        if (message) {
            message.textContent =
                "Newsletter sign-up is not available yet. Please check back soon.";
        }

        form.reset();
    });
}

/* -------------------- FOOTER YEAR -------------------- */

function updateFooterYear() {
    const year = new Date().getFullYear();

    const elements = [
        $("#currentYear"),
        $("#shopCurrentYear")
    ];

    elements.forEach(element => {
        if (element) {
            element.textContent = year;
        }
    });
}

/* -------------------- HOMEPAGE INITIALIZATION -------------------- */

function initializeHomepage() {
    updateFooterYear();

    // Dynamic homepage content
    loadAnnouncement();
    loadHero();
    loadProducts();

    // User interactions
    setupMobileNavigation();
    setupSearch();
    setupCategoryFilters();
    setupCartEvents();
    setupNewsletter();

    // Shopping cart
    updateCart();
}

/* -------------------- START APPLICATION -------------------- */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeHomepage,
        { once: true }
    );
} else {
    initializeHomepage();
}


// MIZUMI PAGE LOADER
window.addEventListener("load", function () {
    const loader = document.getElementById("pageLoader");

    if (!loader) return;

    loader.classList.add("loaded");

    setTimeout(() => {
        loader.remove();
    }, 650);
});