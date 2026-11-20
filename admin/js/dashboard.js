
// =====================================================
// MIZUMI AQUATICS — ADMIN DASHBOARD
// =====================================================

"use strict";

const API_URL = "http://localhost:5000/api/v1";
const TOKEN_KEY = "mizumiAdminToken";
const EMAIL_KEY = "mizumiAdminEmail";

const token = sessionStorage.getItem(TOKEN_KEY);

// Redirect to login if no admin session exists.
if (!token) {
    window.location.replace("login.html");
}

// =====================================================
// DOM ELEMENTS
// =====================================================

const totalProductsElement = document.getElementById("totalProducts");
const inStockElement = document.getElementById("inStockProducts");
const outOfStockElement = document.getElementById("outOfStockProducts");
const totalOrdersElement = document.getElementById("totalOrders");

const recentProductsBody = document.getElementById("recentProductsBody");
const productsError = document.getElementById("productsError");

const adminEmailElement = document.getElementById("adminEmail");

const logoutButton = document.getElementById("logoutButton");
const mobileMenuButton = document.getElementById("mobileMenuButton");

const adminSidebar = document.getElementById("adminSidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

// =====================================================
// ADMIN INFORMATION
// =====================================================

const adminEmail = sessionStorage.getItem(EMAIL_KEY);

if (adminEmailElement && adminEmail) {
    adminEmailElement.textContent = adminEmail;
}

// =====================================================
// DATE
// =====================================================

const currentDateElement = document.getElementById("currentDate");

if (currentDateElement) {
    currentDateElement.textContent = new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());
}

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);

        window.location.replace("login.html");

        throw new Error("Your session has expired.");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "API request failed.");
    }

    return data;
}

async function fetchProducts(params = {}) {
    const query = new URLSearchParams(params);
    return apiRequest(`/products?${query.toString()}`);
}

// =====================================================
// SAFE HTML
// =====================================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// =====================================================
// FORMAT PRICE
// =====================================================

function formatPrice(price) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(price) || 0);
}

// =====================================================
// LOAD PRODUCT STATISTICS
// =====================================================

async function loadProductStatistics() {
    const [allProducts, inStock, outOfStock] = await Promise.all([
        fetchProducts({ limit: 1 }),
        fetchProducts({ availability: "in-stock", limit: 1 }),
        fetchProducts({ availability: "out-of-stock", limit: 1 })
    ]);

    totalProductsElement.textContent =
        allProducts.totalProducts ?? 0;

    inStockElement.textContent =
        inStock.totalProducts ?? 0;

    outOfStockElement.textContent =
        outOfStock.totalProducts ?? 0;
}

// =====================================================
// LOAD ORDER STATISTICS
// =====================================================

async function loadOrderStatistics() {
    if (!totalOrdersElement) return;

    try {
        const data = await apiRequest("/orders/stats");

        totalOrdersElement.textContent =
            data.stats?.totalOrders ?? 0;

    } catch (error) {
        console.error("Order statistics error:", error);

        totalOrdersElement.textContent = "—";
    }
}

// =====================================================
// RENDER RECENT PRODUCTS
// =====================================================

function renderRecentProducts(products) {
    if (!products || products.length === 0) {
        recentProductsBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">
                    No products found in your catalogue.
                </td>
            </tr>
        `;
        return;
    }

    recentProductsBody.innerHTML = products.map(product => {
        const stock = Number(product.stock) || 0;

        const stockClass = stock > 0 ? "" : "out";

        const stockLabel = stock > 0
            ? `${stock} available`
            : "Out of stock";

        return `
            <tr>
                <td>
                    <span class="table-product-name">
                        ${escapeHTML(product.name)}
                    </span>

                    <span class="table-product-sku">
                        ${escapeHTML(product.sku)}
                    </span>
                </td>

                <td>
                    <span class="table-category">
                        ${escapeHTML(product.category)}
                    </span>
                </td>

                <td>
                    <span class="table-price">
                        ${formatPrice(product.price)}
                    </span>
                </td>

                <td>
                    <span class="stock-badge ${stockClass}">
                        ${escapeHTML(stockLabel)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// =====================================================
// LOAD RECENT PRODUCTS
// =====================================================

async function loadRecentProducts() {
    const data = await fetchProducts({
        limit: 5,
        sort: "newest",
        page: 1
    });

    renderRecentProducts(data.products);
}

// =====================================================
// LOAD DASHBOARD
// =====================================================

async function loadDashboard() {
    if (productsError) {
        productsError.hidden = true;
    }

    const results = await Promise.allSettled([
        loadProductStatistics(),
        loadRecentProducts(),
        loadOrderStatistics()
    ]);

    const productFailure = results.some((result, index) =>
        index < 2 && result.status === "rejected"
    );

    if (productFailure) {
        console.error("Product dashboard loading error:", results);

        if (productsError) {
            productsError.hidden = false;
        }

        recentProductsBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">
                    Could not load catalogue information.
                </td>
            </tr>
        `;

        totalProductsElement.textContent = "—";
        inStockElement.textContent = "—";
        outOfStockElement.textContent = "—";
    }
}

// =====================================================
// MOBILE SIDEBAR
// =====================================================

function openSidebar() {
    adminSidebar.classList.add("open");
    sidebarBackdrop.classList.add("show");

    mobileMenuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    adminSidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("show");

    mobileMenuButton.setAttribute("aria-expanded", "false");
}

mobileMenuButton.addEventListener("click", () => {
    const isOpen = adminSidebar.classList.contains("open");

    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarBackdrop.addEventListener("click", closeSidebar);

// =====================================================
// LOGOUT
// =====================================================

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);

    window.location.replace("login.html");
});

// =====================================================
// INITIALIZE
// =====================================================

if (token) {
    loadDashboard();
}
