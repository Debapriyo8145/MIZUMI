
/* =========================================================
   MIZUMI AQUATICS — ADMIN ORDERS MANAGEMENT
   Vanilla JavaScript + Express API
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const ORDERS_CONFIG = {
    apiBaseUrl: "http://localhost:5000/api/v1",
    tokenKey: "mizumiAdminToken",
    emailKey: "mizumiAdminEmail",
    pageSize: 10,
    bulkFetchSize: 100,
    currency: "INR",
    locale: "en-IN"
};

const ORDER_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled"
];

const ORDER_TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
};

/* =========================================================
   STATE
   ========================================================= */

const ordersState = {
    orders: [],
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,

    status: "all",
    search: "",
    dateFilter: "all",

    selectedOrder: null,
    pendingStatus: null,

    selectedOrderIds: new Set(),

    loading: false,
    bulkProcessing: false
};

/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

const ordersMoney = (amount) => {
    return new Intl.NumberFormat(ORDERS_CONFIG.locale, {
        style: "currency",
        currency: ORDERS_CONFIG.currency,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
};

const ordersEscape = (value = "") => {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
};

const ordersDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
};

const ordersDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
};

const ordersStatusLabel = (status) => {
    return String(status || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, char => char.toUpperCase());
};

const ordersStatusBadge = (status) => {
    const safeStatus = ORDER_STATUSES.includes(status)
        ? status
        : "pending";

    return `
        <span class="order-status-badge ${safeStatus}">
            ${ordersEscape(ordersStatusLabel(safeStatus))}
        </span>
    `;
};

const ordersPaymentBadge = (status) => {
    const allowed = ["pending", "paid", "failed", "refunded"];

    const safeStatus = allowed.includes(status)
        ? status
        : "pending";

    return `
        <span class="order-payment-badge ${safeStatus}">
            ${ordersEscape(ordersStatusLabel(safeStatus))}
        </span>
    `;
};

const getOrderId = (order) => {
    return String(order?._id || order?.id || "");
};

/* =========================================================
   AUTHENTICATION
   ========================================================= */

function getOrdersToken() {
    return sessionStorage.getItem(ORDERS_CONFIG.tokenKey);
}

function checkOrdersAuthentication() {
    const token = getOrdersToken();

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    const email = sessionStorage.getItem(ORDERS_CONFIG.emailKey);
    const userElement = $("#adminUserName");

    if (userElement && email) {
        userElement.textContent = email;
    }

    return true;
}

/* =========================================================
   API HELPER
   ========================================================= */

async function ordersApi(endpoint, options = {}) {
    const token = getOrdersToken();

    if (!token) {
        window.location.href = "login.html";
        throw new Error("Your session has expired. Please log in again.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(
            `${ORDERS_CONFIG.apiBaseUrl}${endpoint}`,
            {
                ...options,
                headers
            }
        );
    } catch (error) {
        throw new Error(
            "Unable to connect to the server. Check whether your backend is running."
        );
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        sessionStorage.removeItem(ORDERS_CONFIG.tokenKey);
        sessionStorage.removeItem(ORDERS_CONFIG.emailKey);

        window.location.href = "login.html";

        throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

/* =========================================================
   TOAST NOTIFICATIONS
   ========================================================= */

let ordersToastTimer;

function showOrdersToast(message, type = "success") {
    const toast = $("#ordersToast");
    const messageElement = $("#ordersToastMessage");

    if (!toast || !messageElement) {
        console[type === "error" ? "error" : "log"](message);
        return;
    }

    messageElement.textContent = message;

    const icon = toast.querySelector("i");

    if (icon) {
        icon.className = type === "error"
            ? "fa-solid fa-circle-exclamation"
            : "fa-solid fa-circle-check";
    }

    toast.classList.toggle("error", type === "error");
    toast.classList.add("show");

    clearTimeout(ordersToastTimer);

    ordersToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

/* =========================================================
   DATE FILTER
   ========================================================= */

function getOrdersDateRange() {
    const now = new Date();

    const start = new Date(now);
    const end = new Date(now);

    if (ordersState.dateFilter === "today") {
        // Today's local date.
    } else if (ordersState.dateFilter === "7days") {
        start.setDate(start.getDate() - 6);
    } else if (ordersState.dateFilter === "30days") {
        start.setDate(start.getDate() - 29);
    } else {
        return null;
    }

    const toLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    return {
        startDate: toLocalDateString(start),
        endDate: toLocalDateString(end)
    };
}

/* =========================================================
   FETCH ORDER STATISTICS
   ========================================================= */

async function fetchOrderStats() {
    try {
        const data = await ordersApi("/orders/stats");
        const stats = data.stats || {};

        const setText = (selector, value) => {
            const element = $(selector);
            if (element) element.textContent = value;
        };

        setText("#totalOrdersStat", stats.totalOrders ?? 0);
        setText("#pendingOrdersStat", stats.pendingOrders ?? 0);
        setText("#processingOrdersStat", stats.processingOrders ?? 0);
        setText("#deliveredOrdersStat", stats.deliveredOrders ?? 0);
        setText("#revenueStat", ordersMoney(stats.revenue || 0));
        setText("#sidebarPendingCount", stats.pendingOrders ?? 0);

    } catch (error) {
        console.error("Order statistics error:", error);

        [
            "#totalOrdersStat",
            "#pendingOrdersStat",
            "#processingOrdersStat",
            "#deliveredOrdersStat",
            "#revenueStat"
        ].forEach(selector => {
            const element = $(selector);
            if (element) element.textContent = "—";
        });

        showOrdersToast(error.message, "error");
    }
}

/* =========================================================
   FETCH ORDERS
   ========================================================= */

async function fetchOrders() {
    if (ordersState.loading) return;

    ordersState.loading = true;

    const tableBody = $("#ordersTableBody");
    const refreshButton = $("#refreshOrdersBtn");

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="orders-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading orders...
                </td>
            </tr>
        `;
    }

    $("#ordersEmptyState")?.classList.add("d-none");

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    try {
        const params = new URLSearchParams({
            page: String(ordersState.currentPage),
            limit: String(ORDERS_CONFIG.pageSize)
        });

        if (ordersState.status !== "all") {
            params.set("status", ordersState.status);
        }

        if (ordersState.search) {
            params.set("search", ordersState.search);
        }

        const dateRange = getOrdersDateRange();

        if (dateRange) {
            params.set("startDate", dateRange.startDate);
            params.set("endDate", dateRange.endDate);
        }

        const data = await ordersApi(
            `/orders?${params.toString()}`
        );

        ordersState.orders = data.orders || [];
        ordersState.totalOrders = Number(data.totalOrders) || 0;
        ordersState.totalPages = Math.max(1, Number(data.totalPages) || 1);
        ordersState.currentPage = Number(data.currentPage) || 1;

        // Remove selections for orders no longer on this page.
        const visibleIds = new Set(
            ordersState.orders.map(getOrderId)
        );

        ordersState.selectedOrderIds.forEach(id => {
            if (!visibleIds.has(id)) {
                ordersState.selectedOrderIds.delete(id);
            }
        });

        renderOrdersTable();
        renderOrdersPagination();
        updateBulkSelectionUI();

    } catch (error) {
        console.error("Fetch orders error:", error);

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="orders-loading">
                        ${ordersEscape(error.message)}
                    </td>
                </tr>
            `;
        }

        showOrdersToast(error.message, "error");

    } finally {
        ordersState.loading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

/* =========================================================
   RENDER ORDERS TABLE
   ========================================================= */

function renderOrdersTable() {
    const tableBody = $("#ordersTableBody");
    const emptyState = $("#ordersEmptyState");

    if (!tableBody) return;

    const resultCount = $("#ordersResultCount");
    const allCount = $("#allOrdersCount");

    if (resultCount) {
        resultCount.textContent =
            `${ordersState.totalOrders} order${ordersState.totalOrders === 1 ? "" : "s"}`;
    }

    if (allCount) {
        allCount.textContent = ordersState.totalOrders;
    }

    if (!ordersState.orders.length) {
        tableBody.innerHTML = "";
        emptyState?.classList.remove("d-none");
        return;
    }

    emptyState?.classList.add("d-none");

    tableBody.innerHTML = ordersState.orders.map(order => {
        const orderId = getOrderId(order);
        const customerName = order.customer?.name || "Unknown Customer";
        const customerPhone = order.customer?.phone || "—";

        const itemCount = (order.items || []).reduce(
            (total, item) => total + (Number(item.quantity) || 0),
            0
        );

        const isPending = order.orderStatus === "pending";
        const isSelected = ordersState.selectedOrderIds.has(orderId);

        return `
            <tr>
                <td class="order-select-cell">
                    ${
                        isPending
                            ? `
                                <input
                                    type="checkbox"
                                    class="order-row-checkbox"
                                    data-order-select="${ordersEscape(orderId)}"
                                    aria-label="Select order ${ordersEscape(order.orderNumber || "")}"
                                    ${isSelected ? "checked" : ""}
                                >
                            `
                            : "—"
                    }
                </td>

                <td>
                    <span class="order-number">
                        ${ordersEscape(order.orderNumber || "—")}
                    </span>

                    <span class="order-date-small">
                        ${ordersEscape(ordersDate(order.createdAt))}
                    </span>
                </td>

                <td>
                    <span class="order-customer-name">
                        ${ordersEscape(customerName)}
                    </span>

                    <span class="order-customer-phone">
                        ${ordersEscape(customerPhone)}
                    </span>
                </td>

                <td>
                    ${ordersEscape(ordersDate(order.createdAt))}
                </td>

                <td>
                    <span class="order-items-count">
                        ${itemCount} item${itemCount === 1 ? "" : "s"}
                    </span>
                </td>

                <td>
                    <span class="order-total">
                        ${ordersEscape(ordersMoney(order.total))}
                    </span>
                </td>

                <td>
                    ${ordersPaymentBadge(order.paymentStatus)}
                </td>

                <td>
                    ${ordersStatusBadge(order.orderStatus)}
                </td>

                <td>
                    <button
                        type="button"
                        class="order-view-btn"
                        data-view-order="${ordersEscape(orderId)}"
                    >
                        <i class="fa-regular fa-eye"></i>
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* =========================================================
   PAGINATION
   ========================================================= */

function renderOrdersPagination() {
    const start = ordersState.totalOrders === 0
        ? 0
        : (ordersState.currentPage - 1) * ORDERS_CONFIG.pageSize + 1;

    const end = Math.min(
        ordersState.currentPage * ORDERS_CONFIG.pageSize,
        ordersState.totalOrders
    );

    const info = $("#ordersPaginationInfo");
    const currentPage = $("#ordersCurrentPage");
    const previous = $("#ordersPrevPage");
    const next = $("#ordersNextPage");

    if (info) {
        info.textContent =
            `Showing ${start}–${end} of ${ordersState.totalOrders} orders`;
    }

    if (currentPage) {
        currentPage.textContent = ordersState.currentPage;
    }

    if (previous) {
        previous.disabled = ordersState.currentPage <= 1;
    }

    if (next) {
        next.disabled = ordersState.currentPage >= ordersState.totalPages;
    }
}

/* =========================================================
   STATUS TABS
   ========================================================= */

function setOrdersStatus(status) {
    if (status !== "all" && !ORDER_STATUSES.includes(status)) {
        return;
    }

    ordersState.status = status;
    ordersState.currentPage = 1;
    ordersState.selectedOrderIds.clear();

    $$(".order-status-tab").forEach(tab => {
        tab.classList.toggle(
            "active",
            tab.dataset.status === status
        );
    });

    const heading = $(".orders-toolbar-heading h2");

    if (heading) {
        heading.textContent = status === "all"
            ? "All Orders"
            : `${ordersStatusLabel(status)} Orders`;
    }

    updateBulkSelectionUI();
    fetchOrders();
}

/* =========================================================
   SEARCH
   ========================================================= */

let ordersSearchTimer;

function setupOrdersSearch() {
    const input = $("#orderSearchInput");

    if (!input) return;

    input.addEventListener("input", () => {
        clearTimeout(ordersSearchTimer);

        ordersSearchTimer = setTimeout(() => {
            ordersState.search = input.value.trim();
            ordersState.currentPage = 1;
            ordersState.selectedOrderIds.clear();

            fetchOrders();
        }, 400);
    });
}

/* =========================================================
   BULK SELECTION
   ========================================================= */

function getVisiblePendingOrders() {
    return ordersState.orders.filter(order =>
        order.orderStatus === "pending"
    );
}

function updateBulkSelectionUI() {
    const selectedCount = ordersState.selectedOrderIds.size;

    const countElement = $("#bulkSelectedCount");
    const confirmButton = $("#bulkConfirmBtn");
    const cancelButton = $("#bulkCancelBtn");

    if (countElement) {
        countElement.textContent =
            `${selectedCount} selected`;
    }

    const disabled = selectedCount === 0 || ordersState.bulkProcessing;

    if (confirmButton) {
        confirmButton.disabled = disabled;
    }

    if (cancelButton) {
        cancelButton.disabled = disabled;
    }

    const visiblePending = getVisiblePendingOrders();

    const allVisibleSelected =
        visiblePending.length > 0 &&
        visiblePending.every(order =>
            ordersState.selectedOrderIds.has(getOrderId(order))
        );

    const selectCurrentPageButton = $("#selectCurrentPageOrders");

    if (selectCurrentPageButton) {
        selectCurrentPageButton.textContent = allVisibleSelected
            ? "Deselect current page"
            : "Select current page";
    }

    const selectAllButton = $("#selectAllPendingBtn");

    if (selectAllButton) {
        selectAllButton.disabled =
            visiblePending.length === 0 || ordersState.bulkProcessing;
    }

    [
        "#confirmAllPendingBtn",
        "#cancelAllPendingBtn",
        "#selectCurrentPageOrders"
    ].forEach(selector => {
        const button = $(selector);

        if (button) {
            button.disabled = ordersState.bulkProcessing;
        }
    });

    const headerCheckbox = $("#selectAllPendingCheckbox");

    if (headerCheckbox) {
        headerCheckbox.checked =
            visiblePending.length > 0 && allVisibleSelected;

        headerCheckbox.indeterminate =
            selectedCount > 0 && !allVisibleSelected;
    }
}

function selectVisiblePendingOrders() {
    const pendingOrders = getVisiblePendingOrders();

    if (!pendingOrders.length) {
        showOrdersToast("There are no pending orders on this page.", "error");
        return;
    }

    pendingOrders.forEach(order => {
        ordersState.selectedOrderIds.add(getOrderId(order));
    });

    renderOrdersTable();
    updateBulkSelectionUI();
}

function toggleVisiblePendingOrders() {
    const pendingOrders = getVisiblePendingOrders();

    if (!pendingOrders.length) return;

    const allSelected = pendingOrders.every(order =>
        ordersState.selectedOrderIds.has(getOrderId(order))
    );

    pendingOrders.forEach(order => {
        const id = getOrderId(order);

        if (allSelected) {
            ordersState.selectedOrderIds.delete(id);
        } else {
            ordersState.selectedOrderIds.add(id);
        }
    });

    renderOrdersTable();
    updateBulkSelectionUI();
}

function clearBulkSelection() {
    ordersState.selectedOrderIds.clear();
    renderOrdersTable();
    updateBulkSelectionUI();
}

/* =========================================================
   BULK ORDER FETCHING
   Fetch every pending order, not just the current page.
   ========================================================= */

async function fetchAllPendingOrders() {
    const allOrders = [];

    let page = 1;
    let totalPages = 1;

    do {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(ORDERS_CONFIG.bulkFetchSize),
            status: "pending"
        });

        const data = await ordersApi(
            `/orders?${params.toString()}`
        );

        const batch = data.orders || [];

        allOrders.push(...batch);

        totalPages = Math.max(
            1,
            Number(data.totalPages) || 1
        );

        page++;
    } while (page <= totalPages);

    // Recheck the status in case an order changed while fetching.
    return allOrders.filter(order =>
        order.orderStatus === "pending"
    );
}

/* =========================================================
   UPDATE A SINGLE ORDER
   Uses the existing backend endpoint.
   ========================================================= */

async function updateOneOrderStatus(orderId, newStatus, note = "") {
    return ordersApi(
        `/orders/${encodeURIComponent(orderId)}/status`,
        {
            method: "PATCH",
            body: JSON.stringify({
                orderStatus: newStatus,
                note
            })
        }
    );
}

/* =========================================================
   BULK STATUS UPDATE
   ========================================================= */

async function processBulkOrders(orders, newStatus, source = "selected") {
    if (ordersState.bulkProcessing) return;

    const uniqueOrders = [
        ...new Map(
            orders
                .filter(order =>
                    order.orderStatus === "pending" && getOrderId(order)
                )
                .map(order => [getOrderId(order), order])
        ).values()
    ];

    if (!uniqueOrders.length) {
        showOrdersToast("No pending orders were found.", "error");
        return;
    }

    const actionLabel = newStatus === "confirmed"
        ? "confirm"
        : "cancel";

    const warning = newStatus === "cancelled"
        ? "\n\nCancelled orders will have their product stock restored."
        : "";

    const confirmed = window.confirm(
        `Are you sure you want to ${actionLabel} ${uniqueOrders.length} pending order(s)?${warning}`
    );

    if (!confirmed) return;

    ordersState.bulkProcessing = true;
    updateBulkSelectionUI();

    const confirmButton = $("#bulkConfirmBtn");
    const cancelButton = $("#bulkCancelBtn");

    const originalConfirmText = confirmButton?.innerHTML;
    const originalCancelText = cancelButton?.innerHTML;

    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.textContent = "Processing...";
    }

    if (cancelButton) {
        cancelButton.disabled = true;
        cancelButton.textContent = "Processing...";
    }

    let successful = 0;
    let failed = 0;
    const failedOrders = [];

    try {
        // Process sequentially. This avoids overwhelming the API
        // and ensures each cancellation uses the existing stock-restoration logic.
        for (const order of uniqueOrders) {
            const orderId = getOrderId(order);

            try {
                await updateOneOrderStatus(
                    orderId,
                    newStatus,
                    `Bulk ${actionLabel} from admin orders page.`
                );

                successful++;

                ordersState.selectedOrderIds.delete(orderId);

            } catch (error) {
                failed++;

                failedOrders.push({
                    orderNumber: order.orderNumber || orderId,
                    message: error.message
                });

                console.error(
                    `Failed to ${actionLabel} order ${orderId}:`,
                    error
                );
            }
        }

        if (failed === 0) {
            showOrdersToast(
                `${successful} order(s) ${newStatus} successfully.`
            );
        } else {
            showOrdersToast(
                `${successful} successful, ${failed} failed. Check the console for details.`,
                "error"
            );

            console.table(failedOrders);
        }

    } finally {
        ordersState.bulkProcessing = false;

        if (confirmButton) {
            confirmButton.innerHTML =
                originalConfirmText || "Confirm selected";
        }

        if (cancelButton) {
            cancelButton.innerHTML =
                originalCancelText || "Cancel selected";
        }

        updateBulkSelectionUI();

        await Promise.all([
            fetchOrders(),
            fetchOrderStats()
        ]);
    }
}

/* =========================================================
   BULK SELECTED ACTIONS
   ========================================================= */

async function confirmSelectedOrders() {
    const selectedIds = [...ordersState.selectedOrderIds];

    const selectedOrders = ordersState.orders.filter(order =>
        selectedIds.includes(getOrderId(order)) &&
        order.orderStatus === "pending"
    );

    await processBulkOrders(
        selectedOrders,
        "confirmed",
        "selected"
    );
}

async function cancelSelectedOrders() {
    const selectedIds = [...ordersState.selectedOrderIds];

    const selectedOrders = ordersState.orders.filter(order =>
        selectedIds.includes(getOrderId(order)) &&
        order.orderStatus === "pending"
    );

    await processBulkOrders(
        selectedOrders,
        "cancelled",
        "selected"
    );
}

/* =========================================================
   CONFIRM ALL PENDING ORDERS
   ========================================================= */

async function confirmAllPendingOrders() {
    if (ordersState.bulkProcessing) return;

    ordersState.bulkProcessing = true;
    updateBulkSelectionUI();

    try {
        showOrdersToast("Loading all pending orders...");

        const pendingOrders = await fetchAllPendingOrders();

        if (!pendingOrders.length) {
            showOrdersToast("There are no pending orders to confirm.");
            return;
        }

        // The processing function manages its own busy state.
        ordersState.bulkProcessing = false;

        await processBulkOrders(
            pendingOrders,
            "confirmed",
            "all"
        );

    } catch (error) {
        showOrdersToast(error.message, "error");

    } finally {
        ordersState.bulkProcessing = false;
        updateBulkSelectionUI();
    }
}

/* =========================================================
   CANCEL ALL PENDING ORDERS
   ========================================================= */

async function cancelAllPendingOrders() {
    if (ordersState.bulkProcessing) return;

    ordersState.bulkProcessing = true;
    updateBulkSelectionUI();

    try {
        showOrdersToast("Loading all pending orders...");

        const pendingOrders = await fetchAllPendingOrders();

        if (!pendingOrders.length) {
            showOrdersToast("There are no pending orders to cancel.");
            return;
        }

        // The processing function manages its own busy state.
        ordersState.bulkProcessing = false;

        await processBulkOrders(
            pendingOrders,
            "cancelled",
            "all"
        );

    } catch (error) {
        showOrdersToast(error.message, "error");

    } finally {
        ordersState.bulkProcessing = false;
        updateBulkSelectionUI();
    }
}

/* =========================================================
   ORDER DETAILS
   ========================================================= */

async function openOrderDetails(orderId) {
    const modal = $("#orderDetailsModal");
    const content = $("#orderDetailsContent");

    if (!modal || !content) return;

    modal.classList.remove("d-none");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    const numberElement = $("#orderDetailsNumber");

    if (numberElement) {
        numberElement.textContent = "Loading...";
    }

    const saveButton = $("#saveOrderStatusBtn");

    if (saveButton) {
        saveButton.disabled = true;
    }

    content.innerHTML = `
        <div class="orders-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading order details...
        </div>
    `;

    try {
        const data = await ordersApi(
            `/orders/${encodeURIComponent(orderId)}`
        );

        ordersState.selectedOrder = data.order;
        ordersState.pendingStatus = data.order.orderStatus;

        renderOrderDetails(data.order);

    } catch (error) {
        content.innerHTML = `
            <p class="text-danger">
                ${ordersEscape(error.message)}
            </p>
        `;

        showOrdersToast(error.message, "error");
    }
}

/* =========================================================
   RENDER ORDER DETAILS
   ========================================================= */

function renderOrderDetails(order) {
    const content = $("#orderDetailsContent");

    if (!content) return;

    const numberElement = $("#orderDetailsNumber");

    if (numberElement) {
        numberElement.textContent =
            order.orderNumber || "Order details";
    }

    const customer = order.customer || {};
    const address = order.shippingAddress || {};
    const items = Array.isArray(order.items) ? order.items : [];

    const currentStatus = order.orderStatus;

    const allowedStatuses =
        ORDER_TRANSITIONS[currentStatus] || [];

    const canUpdate = allowedStatuses.length > 0;

    const itemHTML = items.map(item => `
        <div class="order-detail-product">
            <div class="order-detail-product-info">
                <strong>
                    ${ordersEscape(item.name || "Product")}
                </strong>

                <small>
                    SKU: ${ordersEscape(item.sku || "—")}
                    · ${Number(item.quantity) || 0} ×
                    ${ordersEscape(ordersMoney(item.price))}
                </small>
            </div>

            <span class="order-detail-product-price">
                ${ordersEscape(ordersMoney(item.subtotal))}
            </span>
        </div>
    `).join("");

    const history = Array.isArray(order.statusHistory)
        ? [...order.statusHistory].reverse()
        : [];

    const historyHTML = history.map(entry => `
        <div class="order-history-item">
            <strong>
                ${ordersEscape(ordersStatusLabel(entry.status))}
            </strong>

            <small>
                ${ordersEscape(ordersDateTime(entry.changedAt))}
            </small>

            <p>
                ${ordersEscape(entry.note || "")}
            </p>
        </div>
    `).join("");

    const statusOptions = canUpdate
        ? allowedStatuses.map(status => `
            <option value="${status}">
                ${ordersEscape(ordersStatusLabel(status))}
            </option>
        `).join("")
        : `
            <option value="${ordersEscape(currentStatus)}">
                ${ordersEscape(ordersStatusLabel(currentStatus))}
            </option>
        `;

    content.innerHTML = `
        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Customer Information
            </h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <small>Customer Name</small>
                    <strong>${ordersEscape(customer.name || "—")}</strong>
                </div>

                <div class="order-detail-field">
                    <small>Phone Number</small>
                    <strong>${ordersEscape(customer.phone || "—")}</strong>
                </div>

                <div class="order-detail-field">
                    <small>Email Address</small>
                    <strong>${ordersEscape(customer.email || "Not provided")}</strong>
                </div>

                <div class="order-detail-field">
                    <small>Order Date</small>
                    <strong>${ordersEscape(ordersDateTime(order.createdAt))}</strong>
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Shipping Address
            </h3>

            <div class="order-detail-field">
                <strong>
                    ${ordersEscape(address.addressLine1 || "")}
                    ${address.addressLine2
                        ? ", " + ordersEscape(address.addressLine2)
                        : ""}
                </strong>

                <strong>
                    ${ordersEscape(address.city || "")},
                    ${ordersEscape(address.state || "")}
                    ${ordersEscape(address.postalCode || "")}
                </strong>

                <strong>
                    ${ordersEscape(address.country || "India")}
                </strong>
            </div>
        </section>

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Ordered Products
            </h3>

            <div class="order-detail-products">
                ${itemHTML || "<p>No products found.</p>"}
            </div>
        </section>

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Order Summary
            </h3>

            <div class="order-detail-totals">
                <div class="order-detail-total-row">
                    <span>Subtotal</span>
                    <strong>${ordersEscape(ordersMoney(order.subtotal))}</strong>
                </div>

                <div class="order-detail-total-row">
                    <span>Shipping</span>
                    <strong>${ordersEscape(ordersMoney(order.shippingFee))}</strong>
                </div>

                <div class="order-detail-total-row">
                    <span>Discount</span>
                    <strong>${ordersEscape(ordersMoney(order.discount))}</strong>
                </div>

                <div class="order-detail-total-row grand-total">
                    <span>Total</span>
                    <strong>${ordersEscape(ordersMoney(order.total))}</strong>
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Payment Information
            </h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <small>Payment Method</small>
                    <strong>
                        ${ordersEscape(ordersStatusLabel(order.paymentMethod))}
                    </strong>
                </div>

                <div class="order-detail-field">
                    <small>Payment Status</small>
                    <strong>
                        ${ordersEscape(ordersStatusLabel(order.paymentStatus))}
                    </strong>
                </div>
            </div>
        </section>

        ${order.customerNote ? `
            <section class="order-detail-section">
                <h3 class="order-detail-heading">
                    Customer Note
                </h3>

                <div class="order-detail-field">
                    <strong>${ordersEscape(order.customerNote)}</strong>
                </div>
            </section>
        ` : ""}

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Update Order Status
            </h3>

            <div class="order-detail-field">
                <div class="order-status-control">
                    <label for="orderStatusSelect">
                        Order Status
                    </label>

                    <select
                        id="orderStatusSelect"
                        ${canUpdate ? "" : "disabled"}
                    >
                        ${statusOptions}
                    </select>

                    <label for="orderStatusNote">
                        Internal Status Note
                    </label>

                    <textarea
                        id="orderStatusNote"
                        maxlength="500"
                        placeholder="Add an optional note about this status update..."
                        ${canUpdate ? "" : "disabled"}
                    ></textarea>

                    ${!canUpdate ? `
                        <small>
                            This order has reached a final status.
                        </small>
                    ` : ""}
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3 class="order-detail-heading">
                Order Timeline
            </h3>

            <div class="order-status-history">
                ${historyHTML || "<p>No status history available.</p>"}
            </div>
        </section>
    `;

    const saveButton = $("#saveOrderStatusBtn");

    if (saveButton) {
        saveButton.disabled = !canUpdate;
    }

    if (canUpdate) {
        $("#orderStatusSelect")?.addEventListener("change", event => {
            ordersState.pendingStatus = event.target.value;

            if (saveButton) {
                saveButton.disabled =
                    ordersState.pendingStatus === order.orderStatus;
            }
        });
    }
}

/* =========================================================
   UPDATE ORDER STATUS — SINGLE ORDER
   ========================================================= */

async function saveOrderStatus() {
    const order = ordersState.selectedOrder;

    if (!order) return;

    const newStatus = $("#orderStatusSelect")?.value;
    const note = $("#orderStatusNote")?.value.trim() || "";

    if (!newStatus || newStatus === order.orderStatus) {
        return;
    }

    const allowedStatuses =
        ORDER_TRANSITIONS[order.orderStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
        showOrdersToast("This status change is not allowed.", "error");
        return;
    }

    if (newStatus === "cancelled") {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this order? Its product stock will be restored."
        );

        if (!confirmed) return;
    }

    const saveButton = $("#saveOrderStatusBtn");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        const data = await updateOneOrderStatus(
            getOrderId(order),
            newStatus,
            note
        );

        ordersState.selectedOrder = data.order;

        closeOrderDetails();

        showOrdersToast(
            data.message || "Order status updated successfully."
        );

        await Promise.all([
            fetchOrders(),
            fetchOrderStats()
        ]);

    } catch (error) {
        showOrdersToast(error.message, "error");

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Status";
        }
    }
}

/* =========================================================
   CLOSE ORDER DETAILS
   ========================================================= */

function closeOrderDetails() {
    const modal = $("#orderDetailsModal");

    if (!modal) return;

    modal.classList.add("d-none");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    ordersState.selectedOrder = null;
    ordersState.pendingStatus = null;

    const saveButton = $("#saveOrderStatusBtn");

    if (saveButton) {
        saveButton.disabled = true;
    }
}

/* =========================================================
   REFRESH ALL DATA
   ========================================================= */

async function refreshOrdersPage() {
    await Promise.all([
        fetchOrders(),
        fetchOrderStats()
    ]);
}

/* =========================================================
   BULK ACTION EVENT LISTENERS
   ========================================================= */

function setupBulkOrderEvents() {
    // Individual row checkbox selection.
    $("#ordersTableBody")?.addEventListener("change", event => {
        const checkbox = event.target.closest("[data-order-select]");

        if (!checkbox) return;

        const orderId = checkbox.dataset.orderSelect;

        if (!orderId) return;

        if (checkbox.checked) {
            ordersState.selectedOrderIds.add(orderId);
        } else {
            ordersState.selectedOrderIds.delete(orderId);
        }

        updateBulkSelectionUI();
    });

    // Select all pending orders on the current page.
    $("#selectAllPendingBtn")?.addEventListener("click", () => {
        selectVisiblePendingOrders();
    });

    // Optional current-page toggle button.
    $("#selectCurrentPageOrders")?.addEventListener("click", () => {
        toggleVisiblePendingOrders();
    });

    // Optional table header checkbox.
    $("#selectAllPendingCheckbox")?.addEventListener("change", event => {
        if (event.target.checked) {
            selectVisiblePendingOrders();
        } else {
            getVisiblePendingOrders().forEach(order => {
                ordersState.selectedOrderIds.delete(getOrderId(order));
            });

            renderOrdersTable();
            updateBulkSelectionUI();
        }
    });

    // Confirm selected orders.
    $("#bulkConfirmBtn")?.addEventListener("click", () => {
        confirmSelectedOrders();
    });

    // Cancel selected orders.
    $("#bulkCancelBtn")?.addEventListener("click", () => {
        cancelSelectedOrders();
    });

    // Confirm every pending order across all pages.
    $("#confirmAllPendingBtn")?.addEventListener("click", () => {
        confirmAllPendingOrders();
    });

    // Cancel every pending order across all pages.
    $("#cancelAllPendingBtn")?.addEventListener("click", () => {
        cancelAllPendingOrders();
    });
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupOrdersEvents() {
    // Status tabs.
    $("#orderStatusTabs")?.addEventListener("click", event => {
        const tab = event.target.closest("[data-status]");

        if (!tab) return;

        setOrdersStatus(tab.dataset.status);
    });

    // Search.
    setupOrdersSearch();

    // Date filter.
    $("#orderDateFilter")?.addEventListener("change", event => {
        ordersState.dateFilter = event.target.value;
        ordersState.currentPage = 1;
        ordersState.selectedOrderIds.clear();

        fetchOrders();
    });

    // Pagination.
    $("#ordersPrevPage")?.addEventListener("click", () => {
        if (ordersState.currentPage <= 1) return;

        ordersState.currentPage--;
        fetchOrders();
    });

    $("#ordersNextPage")?.addEventListener("click", () => {
        if (ordersState.currentPage >= ordersState.totalPages) return;

        ordersState.currentPage++;
        fetchOrders();
    });

    // Refresh.
    $("#refreshOrdersBtn")?.addEventListener(
        "click",
        refreshOrdersPage
    );

    // View order.
    $("#ordersTableBody")?.addEventListener("click", event => {
        const button = event.target.closest("[data-view-order]");

        if (!button) return;

        openOrderDetails(button.dataset.viewOrder);
    });

    // Save status.
    $("#saveOrderStatusBtn")?.addEventListener(
        "click",
        saveOrderStatus
    );

    // Close modal.
    $("#closeOrderDetailsBtn")?.addEventListener(
        "click",
        closeOrderDetails
    );

    $("#closeOrderFooterBtn")?.addEventListener(
        "click",
        closeOrderDetails
    );

    $("#orderDetailsModal")?.addEventListener("click", event => {
        if (event.target.id === "orderDetailsModal") {
            closeOrderDetails();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            !$("#orderDetailsModal")?.classList.contains("d-none")
        ) {
            closeOrderDetails();
        }
    });

    // Bulk actions.
    setupBulkOrderEvents();

    // Logout.
    $("#logoutBtn")?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Are you sure you want to log out?"
        );

        if (!confirmed) return;

        sessionStorage.removeItem(ORDERS_CONFIG.tokenKey);
        sessionStorage.removeItem(ORDERS_CONFIG.emailKey);

        window.location.href = "login.html";
    });

    // Sidebar toggle.
    $("#sidebarToggle")?.addEventListener("click", () => {
        $("#adminSidebar")?.classList.toggle("open");
    });
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    if (!checkOrdersAuthentication()) {
        return;
    }

    setupOrdersEvents();
    updateBulkSelectionUI();

    refreshOrdersPage();
});
