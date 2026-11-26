
/* =========================================================
   MIZUMI AQUATICS — SHOP PAGE LOGIC
   Backend-integrated version
   Node.js + Express + MongoDB
   ========================================================= */

const MIZUMI_SHOP_CONFIG = {
    currency: "INR",
    locale: "en-IN",
    productsPerPage: 9,
    apiBaseUrl: "http://localhost:5000/api/v1",
    cartStorageKey: "mizumi_cart",
    wishlistStorageKey: "mizumi_wishlist"
};

// Products are loaded from the Node.js API.
let shopProducts = [];
let shopRequestSequence = 0;

const shopState = {
    category: "all",
    query: "",
    minPrice: 0,
    maxPrice: 5000,
    inStock: false,
    outStock: false,
    types: [],
    sort: "featured",
    page: 1,
    totalProducts: 0,
    totalPages: 1,

    wishlist: JSON.parse(
        localStorage.getItem(MIZUMI_SHOP_CONFIG.wishlistStorageKey) || "[]"
    ),

    cart: JSON.parse(
        localStorage.getItem(MIZUMI_SHOP_CONFIG.cartStorageKey) || "[]"
    )
};


// =========================================================
// UTILITY FUNCTIONS
// =========================================================

const shopMoney = value =>
    new Intl.NumberFormat(MIZUMI_SHOP_CONFIG.locale, {
        style: "currency",
        currency: MIZUMI_SHOP_CONFIG.currency,
        maximumFractionDigits: 0
    }).format(value);


const shopEscape = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));


async function shopApiRequest(endpoint, options = {}) {
    const response = await fetch(
        `${MIZUMI_SHOP_CONFIG.apiBaseUrl}${endpoint}`,
        options
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || `Request failed (${response.status})`
        );
    }

    return data;
}


// =========================================================
// FETCH PRODUCTS FROM BACKEND
// =========================================================

async function fetchShopProducts() {
    const requestId = ++shopRequestSequence;

    const params = new URLSearchParams({
        page: String(shopState.page),
        limit: String(MIZUMI_SHOP_CONFIG.productsPerPage),
        sort: shopState.sort
    });

    if (shopState.query) params.set("search", shopState.query);
    if (shopState.category !== "all") {
        params.set("category", shopState.category);
    }
    if (shopState.types.length) {
        params.set("types", shopState.types.join(","));
    }
    if (shopState.minPrice > 0) {
        params.set("minPrice", String(shopState.minPrice));
    }
    if (shopState.maxPrice < 5000) {
        params.set("maxPrice", String(shopState.maxPrice));
    }

    if (shopState.inStock && !shopState.outStock) {
        params.set("availability", "in-stock");
    } else if (shopState.outStock && !shopState.inStock) {
        params.set("availability", "out-of-stock");
    }

    const data = await shopApiRequest(`/products?${params.toString()}`);

    if (requestId !== shopRequestSequence) return false;

    // Support the controller's response and common wrapped API responses.
    const products = Array.isArray(data.products)
        ? data.products
        : Array.isArray(data.data?.products)
            ? data.data.products
            : Array.isArray(data.data)
                ? data.data
                : [];

    shopProducts = products.map(product => ({
        ...product,
        id: String(product._id || product.id || ""),
        stockQuantity: Number(product.stock) || 0,
        stock: Number(product.stock) > 0,
        created: new Date(product.createdAt || 0).getTime()
    }));

    shopState.totalProducts = Number(
        data.totalProducts ?? data.data?.totalProducts ?? products.length
    );

    shopState.totalPages = Math.max(
        1,
        Number(data.totalPages ?? data.data?.totalPages ?? 1)
    );

    console.log("MIZUMI shop response:", {
        returned: products.length,
        total: shopState.totalProducts,
        category: shopState.category,
        filters: params.toString()
    });

    return true;
}


// =========================================================
// PRODUCT CARD RENDERING
// =========================================================

function renderShopProduct(product) {

    const saved = shopState.wishlist.includes(product.id);

    const badgeClass = product.stock ? "" : "sold";

    const productUrl = `product_view.html?id=${encodeURIComponent(product.id)}`;

    const imageHTML = product.image
        ? `
            <a class="shop-product-detail-link" href="${productUrl}" aria-label="View ${shopEscape(product.name)} details">
                <img
                    src="${shopEscape(product.image)}"
                    alt="${shopEscape(product.name)}"
                    loading="lazy"
                >
            </a>
        `
        : `
            <a class="shop-product-image-placeholder shop-product-detail-link" href="${productUrl}" aria-label="View ${shopEscape(product.name)} details">
                <i class="fa-solid fa-fish"></i>
            </a>
        `;

    return `
        <article class="shop-product-card">

            <div class="shop-product-media">

                ${imageHTML}

                <span class="shop-product-badge ${badgeClass}">
                    ${shopEscape(product.tag)}
                </span>

                <button
                    class="shop-wishlist ${saved ? "is-saved" : ""}"
                    type="button"
                    data-shop-wishlist="${shopEscape(product.id)}"
                    aria-label="${saved ? "Remove from" : "Add to"} wishlist"
                >
                    <i class="${saved ? "fa-solid" : "fa-regular"} fa-heart"></i>
                </button>

            </div>

            <div class="shop-product-info">

                <span class="shop-product-type">
                    ${shopEscape(product.subcategory)}
                </span>

                <h3><a class="shop-product-title-link" href="${productUrl}">${shopEscape(product.name)}</a></h3>

                <p class="shop-product-description">
                    ${shopEscape(product.description)}
                </p>

                <div class="shop-product-meta">

                    <span>
                        <i class="fa-solid fa-ruler-combined"></i>
                        ${shopEscape(product.size)}
                    </span>

                    <span>
                        <i class="fa-solid fa-seedling"></i>
                        ${shopEscape(product.care)}
                    </span>

                </div>

                <div class="shop-product-bottom">

                    <span class="shop-product-price">
                        ${shopMoney(product.price)}

                        <small>
                            ${product.stock
                                ? "Available to enquire"
                                : "Currently unavailable"}
                        </small>
                    </span>

                    <a class="shop-view-details" href="${productUrl}">Details <i class="fa-solid fa-arrow-right"></i></a>

                    <button
                        class="shop-add-btn"
                        type="button"
                        data-shop-add="${shopEscape(product.id)}"
                        ${product.stock ? "" : "disabled"}
                    >
                        ${
                            product.stock
                                ? '<i class="fa-solid fa-bag-shopping me-1"></i> Add'
                                : "Sold out"
                        }
                    </button>

                </div>

            </div>

        </article>
    `;
}


// =========================================================
// PAGINATION
// =========================================================

function renderShopPagination(totalPages) {

    const target = document.getElementById("shopPagination");

    if (totalPages <= 1) {
        target.innerHTML = "";
        return;
    }

    let html = `
        <button
            type="button"
            data-shop-page="${shopState.page - 1}"
            ${shopState.page === 1 ? "disabled" : ""}
            aria-label="Previous page"
        >
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

    for (let page = 1; page <= totalPages; page++) {

        if (totalPages > 6 && page > 3 && page < totalPages - 1) {

            if (page === 4) {
                html += '<span class="px-1 small">…</span>';
            }

            continue;
        }

        html += `
            <button
                type="button"
                data-shop-page="${page}"
                class="${page === shopState.page ? "active" : ""}"
                aria-label="Page ${page}"
            >
                ${page}
            </button>
        `;
    }

    html += `
        <button
            type="button"
            data-shop-page="${shopState.page + 1}"
            ${shopState.page === totalPages ? "disabled" : ""}
            aria-label="Next page"
        >
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    target.innerHTML = html;
}


// =========================================================
// ACTIVE FILTERS
// =========================================================

function renderShopActiveFilters() {

    const chips = [];

    if (shopState.category !== "all") {
        chips.push({
            label: shopState.category,
            action: "category"
        });
    }

    if (shopState.query) {
        chips.push({
            label: `Search: ${shopState.query}`,
            action: "query"
        });
    }

    if (shopState.inStock) {
        chips.push({
            label: "In stock",
            action: "inStock"
        });
    }

    if (shopState.outStock) {
        chips.push({
            label: "Out of stock",
            action: "outStock"
        });
    }

    shopState.types.forEach(type => {
        chips.push({
            label: type,
            action: `type:${type}`
        });
    });

    if (shopState.minPrice > 0 || shopState.maxPrice < 5000) {
        chips.push({
            label: `${shopMoney(shopState.minPrice)} – ${shopMoney(shopState.maxPrice)}`,
            action: "price"
        });
    }

    document.getElementById("shopActiveFilters").innerHTML =
        chips.map(chip => `
            <button
                class="shop-filter-chip"
                type="button"
                data-shop-remove-filter="${shopEscape(chip.action)}"
            >
                ${shopEscape(chip.label)}
                <i class="fa-solid fa-xmark"></i>
            </button>
        `).join("");
}


// =========================================================
// MAIN SHOP RENDER FUNCTION
// =========================================================

async function renderShop() {

    const grid = document.getElementById("shopProductGrid");
    const emptyState = document.getElementById("shopEmptyState");
    const resultCount = document.getElementById("shopResultCount");

    grid.setAttribute("aria-busy", "true");

    grid.innerHTML = `
        <p class="text-muted small">Loading products…</p>
    `;

    try {

        const applied = await fetchShopProducts();

        if (!applied) return;

        shopState.page = Math.min(
            shopState.page,
            shopState.totalPages
        );

        resultCount.textContent = shopState.totalProducts;

        grid.innerHTML = shopProducts
            .map(renderShopProduct)
            .join("");

        emptyState.classList.toggle(
            "d-none",
            shopProducts.length !== 0
        );

        grid.classList.toggle(
            "d-none",
            shopProducts.length === 0
        );

        renderShopPagination(shopState.totalPages);
        renderShopActiveFilters();

        document.querySelectorAll(".shop-category-card").forEach(card => {

            card.classList.toggle(
                "is-active",
                card.dataset.category === shopState.category
            );

        });

    } catch (error) {

        console.error("MIZUMI product loading error:", error);

        resultCount.textContent = "0";

        grid.classList.remove("d-none");
        emptyState.classList.add("d-none");

        grid.innerHTML = `
            <div class="shop-api-error" role="alert">

                <strong>We couldn't load the catalogue.</strong>

                <p>${shopEscape(error.message)}</p>

                <button
                    type="button"
                    class="shop-filter-chip"
                    id="shopRetryProducts"
                >
                    Try again
                </button>

            </div>
        `;

        renderShopPagination(1);
        renderShopActiveFilters();

    } finally {

        grid.setAttribute("aria-busy", "false");

    }
}


// =========================================================
// TOAST NOTIFICATION
// =========================================================

function showShopToast(message) {
    const toast = document.getElementById("shopToast");
    if (!toast) return;

    toast.innerHTML = `
        <i class="fa-solid fa-check"></i>
        <span>${shopEscape(message)}</span>
        <a href="cart.html" class="shop-toast-link">View Cart</a>
    `;

    toast.classList.add("show");

    clearTimeout(showShopToast.timer);

    showShopToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


// =========================================================
// CART MANAGEMENT
// =========================================================

function persistShopCart() {

    localStorage.setItem(
        MIZUMI_SHOP_CONFIG.cartStorageKey,
        JSON.stringify(shopState.cart)
    );

}


function addShopToCart(productId) {

    const product = shopProducts.find(
        item => item.id === productId
    );

    if (!product || !product.stock) return;

    const existing = shopState.cart.find(
        item => item.productId === productId
    );

    if (existing) {

        existing.quantity += 1;

    } else {

        shopState.cart.push({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            category: product.category
        });

    }

    persistShopCart();

    renderShopCart();

    showShopToast(`${product.name} added to your bag`);
}


function renderShopCart() {
    try {
        const savedCart = JSON.parse(
            localStorage.getItem(MIZUMI_SHOP_CONFIG.cartStorageKey) || "[]"
        );

        shopState.cart = Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
        console.error("Cart storage error:", error);
        shopState.cart = [];
    }

    const count = shopState.cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    const badge = document.getElementById("cartCount");

    if (badge) {
        badge.textContent = count;
        badge.classList.toggle("d-none", count === 0);
    }
}


// =========================================================
// RESET FILTERS
// =========================================================

function resetShopFilters() {

    shopState.category = "all";
    shopState.query = "";
    shopState.minPrice = 0;
    shopState.maxPrice = 5000;
    shopState.inStock = false;
    shopState.outStock = false;
    shopState.types = [];
    shopState.page = 1;

    document.getElementById("shopSearchInput").value = "";

    document.getElementById("minPrice").value = 0;

    document.getElementById("maxPrice").value = 5000;

    document.getElementById("priceRange").value = 5000;

    document.getElementById("filterInStock").checked = false;

    document.getElementById("filterOutStock").checked = false;

    document.querySelectorAll('input[name="productType"]').forEach(input => {
        input.checked = false;
    });

    renderShop();
}


// =========================================================
// INITIALIZE SHOP PAGE
// =========================================================

function initShopPage() {
    renderShopCart();

    window.addEventListener("storage", event => {
        if (event.key === MIZUMI_SHOP_CONFIG.cartStorageKey) {
            renderShopCart();
        }
    });

    document.getElementById("shopCurrentYear").textContent =
        new Date().getFullYear();

    // Keep the header cart badge synchronized across pages/tabs.
    renderShopCart();

    window.addEventListener("storage", event => {
        if (event.key === MIZUMI_SHOP_CONFIG.cartStorageKey) {
            renderShopCart();
        }
    });
    // -----------------------------------------------------
    // MOBILE NAVIGATION
    // -----------------------------------------------------

    const mobileToggle = document.getElementById("shopMobileToggle");

    const navLinks = document.getElementById("shopNavLinks");

    mobileToggle.addEventListener("click", () => {

        const open = navLinks.classList.toggle("show");

        mobileToggle.setAttribute("aria-expanded", String(open));

        mobileToggle.innerHTML = open
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';

    });


    // -----------------------------------------------------
    // SEARCH
    // -----------------------------------------------------

    const searchPanel = document.getElementById("shopSearchPanel");

    const searchInput = document.getElementById("shopSearchInput");

    document.getElementById("shopSearchToggle").addEventListener("click", () => {

        searchPanel.classList.toggle("d-none");

        if (!searchPanel.classList.contains("d-none")) {
            searchInput.focus();
        }

    });


    // Debounce search to avoid unnecessary API requests.
    let searchTimer;

    searchInput.addEventListener("input", () => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {

            shopState.query = searchInput.value.trim();

            shopState.page = 1;

            renderShop();

        }, 300);

    });


    document.getElementById("shopSearchClear").addEventListener("click", () => {

        searchInput.value = "";

        shopState.query = "";

        shopState.page = 1;

        renderShop();

        searchInput.focus();

    });


    // -----------------------------------------------------
    // CATEGORY CARDS
    // -----------------------------------------------------

    document.getElementById("shopCategoryStrip").addEventListener("click", event => {

        const card = event.target.closest("[data-category]");

        if (!card) return;

        shopState.category = card.dataset.category;

        shopState.page = 1;

        renderShop();

        document.querySelector(".shop-main-section").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });


    // -----------------------------------------------------
    // SIDEBAR FILTERS
    // -----------------------------------------------------

    document.getElementById("filterInStock").addEventListener("change", event => {

        shopState.inStock = event.target.checked;

        shopState.page = 1;

        renderShop();

    });


    document.getElementById("filterOutStock").addEventListener("change", event => {

        shopState.outStock = event.target.checked;

        shopState.page = 1;

        renderShop();

    });


    document.querySelectorAll('input[name="productType"]').forEach(input => {

        input.addEventListener("change", () => {

            shopState.types = [
                ...document.querySelectorAll('input[name="productType"]:checked')
            ].map(item => item.value);

            shopState.page = 1;

            renderShop();

        });

    });


    // -----------------------------------------------------
    // PRICE FILTERS
    // -----------------------------------------------------

    const minInput = document.getElementById("minPrice");

    const maxInput = document.getElementById("maxPrice");

    const priceRange = document.getElementById("priceRange");


    function applyPrice() {

        shopState.minPrice = Math.max(
            0,
            Number(minInput.value) || 0
        );

        shopState.maxPrice = Math.max(
            shopState.minPrice,
            Number(maxInput.value) || 5000
        );

        priceRange.value = Math.min(
            5000,
            shopState.maxPrice
        );

        shopState.page = 1;

        renderShop();

    }


    minInput.addEventListener("change", applyPrice);

    maxInput.addEventListener("change", applyPrice);


    priceRange.addEventListener("input", () => {

        maxInput.value = priceRange.value;

        applyPrice();

    });


    // -----------------------------------------------------
    // SORTING
    // -----------------------------------------------------

    document.getElementById("shopSort").addEventListener("change", event => {

        shopState.sort = event.target.value;

        shopState.page = 1;

        renderShop();

    });


    // -----------------------------------------------------
    // PRODUCT ACTIONS AND PAGINATION
    // -----------------------------------------------------

    document.addEventListener("click", event => {


        // Pagination

        const pageButton = event.target.closest("[data-shop-page]");

        if (pageButton && !pageButton.disabled) {

            shopState.page = Number(pageButton.dataset.shopPage);

            renderShop();

            document.querySelector(".shop-results-toolbar").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }


        // Retry product loading

        if (event.target.closest("#shopRetryProducts")) {

            renderShop();

        }


        // Add to cart

        const addButton = event.target.closest("[data-shop-add]");

        if (addButton) {

            addShopToCart(addButton.dataset.shopAdd);

        }


        // Wishlist

        const wishButton = event.target.closest("[data-shop-wishlist]");

        if (wishButton) {

            const id = wishButton.dataset.shopWishlist;

            shopState.wishlist = shopState.wishlist.includes(id)

                ? shopState.wishlist.filter(item => item !== id)

                : [...shopState.wishlist, id];


            localStorage.setItem(
                MIZUMI_SHOP_CONFIG.wishlistStorageKey,
                JSON.stringify(shopState.wishlist)
            );

            renderShop();

            showShopToast(
                shopState.wishlist.includes(id)
                    ? "Saved to wishlist"
                    : "Removed from wishlist"
            );

        }


        // Cart quantity

        const qtyButton = event.target.closest("[data-shop-qty]");

        if (qtyButton) {

            const item = shopState.cart.find(
                product => product.productId === qtyButton.dataset.shopQty
            );

            if (item) {

                item.quantity += Number(qtyButton.dataset.shopChange);

                if (item.quantity <= 0) {

                    shopState.cart = shopState.cart.filter(
                        product => product.productId !== item.productId
                    );

                }

                persistShopCart();

                renderShopCart();

            }

        }


        // Remove from cart

        const removeButton = event.target.closest("[data-shop-remove]");

        if (removeButton) {

            shopState.cart = shopState.cart.filter(
                product => product.productId !== removeButton.dataset.shopRemove
            );

            persistShopCart();

            renderShopCart();

        }


        // Remove active filter

        const chip = event.target.closest("[data-shop-remove-filter]");

        if (chip) {

            const action = chip.dataset.shopRemoveFilter;

            if (action === "category") {
                shopState.category = "all";
            }

            if (action === "query") {

                shopState.query = "";

                searchInput.value = "";

            }

            if (action === "inStock") {

                shopState.inStock = false;

                document.getElementById("filterInStock").checked = false;

            }

            if (action === "outStock") {

                shopState.outStock = false;

                document.getElementById("filterOutStock").checked = false;

            }

            if (action === "price") {

                shopState.minPrice = 0;

                shopState.maxPrice = 5000;

                minInput.value = 0;

                maxInput.value = 5000;

                priceRange.value = 5000;

            }

            if (action.startsWith("type:")) {

                const type = action.split(":")[1];

                shopState.types = shopState.types.filter(
                    item => item !== type
                );

                const input = document.querySelector(
                    `input[name="productType"][value="${type}"]`
                );

                if (input) {
                    input.checked = false;
                }

            }

            shopState.page = 1;

            renderShop();

        }

    });


    // -----------------------------------------------------
    // CLEAR FILTERS
    // -----------------------------------------------------

    document.getElementById("shopClearFilters").addEventListener("click", resetShopFilters);

    document.getElementById("shopEmptyReset").addEventListener("click", resetShopFilters);


    // -----------------------------------------------------
    // MOBILE FILTER PANEL
    // -----------------------------------------------------

    document.getElementById("shopFilterToggle").addEventListener("click", () => {

        const sidebar = document.getElementById("shopSidebar");

        sidebar.classList.toggle("is-open");

        document.getElementById("shopFilterToggle").innerHTML =
            sidebar.classList.contains("is-open")

                ? '<i class="fa-solid fa-xmark"></i> Close filters'

                : '<i class="fa-solid fa-sliders"></i> Filters';

    });


    // -----------------------------------------------------
    // NEWSLETTER
    // -----------------------------------------------------

    document.getElementById("shopNewsletterForm").addEventListener("submit", event => {

        event.preventDefault();

        document.getElementById("shopNewsletterMessage").textContent =
            "Thanks for joining! Connect the newsletter API to save subscriptions.";

        event.target.reset();

    });


    // -----------------------------------------------------
    // CHECKOUT PLACEHOLDER
    // -----------------------------------------------------

    document.getElementById("shopCheckoutBtn").addEventListener("click", () => {

        if (!shopState.cart.length) {

            showShopToast("Your shopping bag is empty");

            return;

        }

        const payload = {

            items: shopState.cart.map(item => ({

                productId: item.productId,

                sku: item.sku,

                quantity: item.quantity

            })),

            currency: MIZUMI_SHOP_CONFIG.currency

        };

        console.log("MIZUMI checkout payload (demo):", payload);

        alert(
            "This is a frontend demo. Connect your backend order API and payment gateway to enable checkout. Live fish orders should be availability-checked before payment."
        );

    });


    // -----------------------------------------------------
    // URL CATEGORY SUPPORT
    // -----------------------------------------------------
    // Read search and category from URL
    const params = new URLSearchParams(window.location.search);
      
    const requestedCategory = params.get("category");
    const requestedSearch = params.get("search");
      
    const validCategories = [
      "all", "fish", "goldfish", "cichlid",
      "plants", "equipment", "food", "hardscape"
    ];
    
    if (validCategories.includes(requestedCategory)) {
      shopState.category = requestedCategory;
    }
    
    if (requestedSearch) {
      shopState.query = requestedSearch.trim();
      document.getElementById("shopSearchInput").value = shopState.query;
    }


    // -----------------------------------------------------
    // INITIALIZE
    // -----------------------------------------------------

    renderShop();

    renderShopCart();

}


// =========================================================
// START SHOP PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", initShopPage);
