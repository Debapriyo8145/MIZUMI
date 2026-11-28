
const API_BASE_URL = "http://localhost:5000/api/v1";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const accountMessage = document.getElementById("accountMessage");
const loggedInPanel = document.getElementById("loggedInPanel");


/* =================================
   GENERAL MESSAGES
================================= */

function showMessage(message, type = "error") {
    accountMessage.textContent = message;
    accountMessage.className = `account-message show ${type}`;
}

function clearMessage() {
    accountMessage.textContent = "";
    accountMessage.className = "account-message";
}

function showLogin() {
    document.getElementById("verificationNotice")?.remove();
    clearMessage();

    document.getElementById("authSidebar").classList.remove("hidden");

    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loggedInPanel.classList.add("hidden");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    document.querySelector(".account-intro").classList.remove("hidden");
}

function showRegister() {
    document.getElementById("verificationNotice")?.remove();
    clearMessage();

    document.getElementById("authSidebar").classList.remove("hidden");

    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    loggedInPanel.classList.add("hidden");

    loginTab.classList.remove("active");
    registerTab.classList.add("active");

    document.querySelector(".account-intro").classList.remove("hidden");
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

document.querySelectorAll("[data-switch]").forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.switch === "register") {
            showRegister();
        } else {
            showLogin();
        }
    });
});


/* =================================
   PASSWORD VISIBILITY
================================= */

document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);
        const icon = button.querySelector("i");

        input.type = input.type === "password" ? "text" : "password";

        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
    });
});


/* =================================
   API REQUEST
================================= */

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...options.headers
        }
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
        const error = new Error(result.message || "Something went wrong.");
        error.code = result.code;
        error.accountCreated = result.accountCreated === true;
        throw error;
    }

    return result;
}

function setLoading(button, loading, originalText) {
    button.disabled = loading;

    button.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...'
        : originalText;
}


/* =================================
   EMAIL VERIFICATION NOTICE
================================= */

function showVerificationPending(email, message) {
    document.getElementById("authSidebar").classList.remove("hidden");
    loggedInPanel.classList.add("hidden");
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    document.querySelector(".account-intro").classList.add("hidden");

    loginTab.classList.remove("active");
    registerTab.classList.remove("active");

    const notice = document.createElement("section");
    notice.className = "account-form";
    notice.setAttribute("aria-live", "polite");

    const heading = document.createElement("h2");
    heading.textContent = "Verify your email";

    const paragraph = document.createElement("p");
    paragraph.textContent = message;

    const address = document.createElement("p");
    address.textContent = email
        ? `Verification link requested for: ${email}`
        : "Enter your registered email address to request another verification link.";

    const resendButton = document.createElement("button");
    resendButton.type = "button";
    resendButton.className = "account-submit";
    resendButton.textContent = "Resend verification email";

    const loginButton = document.createElement("button");
    loginButton.type = "button";
    loginButton.className = "account-switch";
    loginButton.textContent = "Back to sign in";

    resendButton.addEventListener("click", async () => {
        const targetEmail = email || window.prompt("Enter your registered email address:");
        if (!targetEmail) return;

        resendButton.disabled = true;
        resendButton.textContent = "Sending...";

        try {
            const result = await apiRequest("/customer-auth/resend-verification", {
                method: "POST",
                body: JSON.stringify({ email: targetEmail })
            });
            paragraph.textContent = result.message;
        } catch (error) {
            paragraph.textContent = error.message;
        } finally {
            resendButton.disabled = false;
            resendButton.textContent = "Resend verification email";
        }
    });

    loginButton.addEventListener("click", showLogin);
    notice.append(heading, paragraph, address, resendButton, loginButton);

    const previousNotice = document.getElementById("verificationNotice");
    if (previousNotice) previousNotice.remove();
    notice.id = "verificationNotice";

    accountMessage.insertAdjacentElement("afterend", notice);
    clearMessage();
}


/* =================================
   CUSTOMER REGISTRATION
================================= */

registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    const button = document.getElementById("registerSubmit");

    const originalText =
        'Create Account <i class="fa-solid fa-arrow-right"></i>';

    const body = {
        name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        phone: document.getElementById("registerPhone").value.trim(),
        password: document.getElementById("registerPassword").value
    };

    if (body.password.length < 8) {
        showMessage("Password must contain at least 8 characters.");
        return;
    }

    setLoading(button, true, originalText);

    try {
        const result = await apiRequest("/customer-auth/register", {
            method: "POST",
            body: JSON.stringify(body)
        });

        registerForm.reset();
        showVerificationPending(
            body.email,
            result.message || "Account created. Check your inbox for the verification link."
        );

    } catch (error) {
        if (error.accountCreated) {
            registerForm.reset();
            showVerificationPending(body.email, error.message);
        } else {
            showMessage(error.message);
        }

    } finally {
        setLoading(button, false, originalText);
    }
});


/* =================================
   CUSTOMER LOGIN
================================= */

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    const button = document.getElementById("loginSubmit");

    const originalText =
        'Sign In <i class="fa-solid fa-arrow-right"></i>';

    const body = {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
    };

    setLoading(button, true, originalText);

    try {
        const result = await apiRequest("/customer-auth/login", {
            method: "POST",
            body: JSON.stringify(body)
        });

        loginForm.reset();

        if (result.customer) {
            renderCustomer(result.customer);
        } else {
            const profile = await apiRequest("/customer-auth/me");
            renderCustomer(profile.customer);
        }

        showMessage(
            result.message || "Login successful.",
            "success"
        );

    } catch (error) {
        if (error.code === "ACCOUNT_NOT_FOUND") {
            showRegister();
            document.getElementById("registerEmail").value = body.email;
            showMessage(error.message);
        } else if (error.code === "EMAIL_NOT_VERIFIED") {
            showVerificationPending(body.email, error.message);
        } else {
            showMessage(error.message);
        }

    } finally {
        setLoading(button, false, originalText);
    }
});


/* =================================
   RENDER CUSTOMER ACCOUNT
================================= */

function renderCustomer(customer) {
    if (!customer) return;

    document.getElementById("authSidebar").classList.add("hidden");

    document.querySelector(".account-intro").classList.add("hidden");

    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");

    loginTab.classList.remove("active");
    registerTab.classList.remove("active");

    loggedInPanel.classList.remove("hidden");

    const name = customer.name || "Customer";
    const email = customer.email || "";
    const phone = customer.phone || "";

    document.getElementById("dashboardCustomerName").textContent = name;

    document.getElementById("dashboardCustomerEmail").textContent = email;

    document.getElementById("customerAvatar").textContent =
        name.trim().charAt(0).toUpperCase() || "M";

    document.getElementById("profileName").value = name;
    document.getElementById("profileEmail").value = email;
    document.getElementById("profilePhone").value = phone;

    clearMessage();

    showDashboardSection("profileSection");
    loadAddresses();
}


/* =================================
   DASHBOARD NAVIGATION
================================= */

function showDashboardSection(sectionId) {
    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.classList.toggle(
            "hidden",
            section.id !== sectionId
        );
    });

    document.querySelectorAll(
        ".dashboard-menu-item[data-section]"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionId
        );
    });

    if (sectionId === "addressesSection") {
        loadAddresses();
    }

    if (sectionId === "ordersSection") {
        showOrderList();
        loadMyOrders(1);
        loadOrderOverview();
    }
}

document.querySelectorAll(
    ".dashboard-menu-item[data-section]"
).forEach(button => {
    button.addEventListener("click", () => {
        showDashboardSection(button.dataset.section);
    });
});


/* =====================================================
   CUSTOMER ORDER HISTORY
===================================================== */

let orderCurrentPage = 1;
let orderTotalPages = 1;
let orderCurrentStatus = "";

const ordersList = document.getElementById("ordersList");
const ordersMessage = document.getElementById("ordersMessage");
const orderListView = document.getElementById("orderListView");
const orderDetailView = document.getElementById("orderDetailView");
const orderDetailContent = document.getElementById("orderDetailContent");


/* -------------------- ORDER MESSAGES -------------------- */

function showOrdersMessage(message, type = "error") {
    ordersMessage.textContent = message;
    ordersMessage.className = `account-message show ${type}`;
}

function clearOrdersMessage() {
    ordersMessage.textContent = "";
    ordersMessage.className = "account-message";
}

function showOrderList() {
    orderListView.classList.remove("hidden");
    orderDetailView.classList.add("hidden");
}


/* -------------------- FORMAT HELPERS -------------------- */

function formatOrderDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function formatOrderCurrency(value) {
    const amount = Number(value);

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
}

function createOrderElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function getStatusLabel(status) {
    const labels = {
        pending: "Pending",
        confirmed: "Confirmed",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled"
    };

    return labels[status] || "Unknown";
}


/* -------------------- ORDER SUMMARY -------------------- */

async function loadOrderOverview() {
    const totalElement = document.getElementById("orderStatTotal");
    const deliveredElement = document.getElementById("orderStatDelivered");
    const progressElement = document.getElementById("orderStatProgress");

    if (!totalElement || !deliveredElement || !progressElement) {
        return;
    }

    totalElement.textContent = "—";
    deliveredElement.textContent = "—";
    progressElement.textContent = "—";

    try {
        /*
          The backend currently returns a maximum of 25 orders per page.
          Fetch every page so the summary counts the customer's complete
          history rather than only the first page.
        */

        const firstPage = await apiRequest(
            "/orders/my?page=1&limit=25"
        );

        const allOrders = Array.isArray(firstPage.orders)
            ? [...firstPage.orders]
            : [];

        const totalPages = Math.max(
            1,
            Number(firstPage.totalPages) || 1
        );

        if (totalPages > 1) {
            const remainingPages = await Promise.all(
                Array.from(
                    { length: totalPages - 1 },
                    (_, index) => apiRequest(
                        `/orders/my?page=${index + 2}&limit=25`
                    )
                )
            );

            remainingPages.forEach(result => {
                if (Array.isArray(result.orders)) {
                    allOrders.push(...result.orders);
                }
            });
        }

        const delivered = allOrders.filter(
            order => order.orderStatus === "delivered"
        ).length;

        const inProgress = allOrders.filter(order =>
            [
                "pending",
                "confirmed",
                "processing",
                "shipped"
            ].includes(order.orderStatus)
        ).length;

        totalElement.textContent = String(
            firstPage.totalOrders ?? allOrders.length
        );

        deliveredElement.textContent = String(delivered);
        progressElement.textContent = String(inProgress);

    } catch (error) {
        console.error("Unable to load order overview:", error);

        totalElement.textContent = "—";
        deliveredElement.textContent = "—";
        progressElement.textContent = "—";
    }
}


/* -------------------- FETCH ORDER HISTORY -------------------- */

async function loadMyOrders(page = 1) {
    clearOrdersMessage();

    ordersList.replaceChildren();

    const loading = createOrderElement(
        "div",
        "orders-loading"
    );

    const spinner = createOrderElement(
        "i",
        "fa-solid fa-spinner fa-spin"
    );

    loading.append(
        spinner,
        document.createTextNode(" Loading your orders...")
    );

    ordersList.appendChild(loading);

    const query = new URLSearchParams({
        page: String(page),
        limit: "10"
    });

    if (orderCurrentStatus) {
        query.set("status", orderCurrentStatus);
    }

    try {
        const result = await apiRequest(
            `/orders/my?${query.toString()}`
        );

        const orders = Array.isArray(result.orders)
            ? result.orders
            : [];

        orderCurrentPage = result.currentPage || page;

        orderTotalPages = Math.max(
            1,
            result.totalPages || 1
        );

        renderMyOrders(
            orders,
            result.totalOrders || 0
        );

        updateOrdersPagination();

    } catch (error) {
        ordersList.replaceChildren();

        const errorBox = createOrderElement(
            "div",
            "orders-error"
        );

        const message = createOrderElement(
            "p",
            "",
            error.message
        );

        const retryButton = createOrderElement(
            "button",
            "order-retry-button",
            "Try Again"
        );

        retryButton.type = "button";

        retryButton.addEventListener("click", () => {
            loadMyOrders(orderCurrentPage);
        });

        errorBox.append(message, retryButton);
        ordersList.appendChild(errorBox);

        document.getElementById(
            "ordersPagination"
        ).classList.add("hidden");
    }
}


/* -------------------- RENDER PRODUCT ROW -------------------- */

function createOrderProductRow(item) {
    const productRow = createOrderElement(
        "div",
        "order-product-row"
    );

    const imageWrap = createOrderElement(
        "div",
        "order-product-image-wrap"
    );

    if (item.image && typeof item.image === "string") {
        const image = document.createElement("img");

        image.src = item.image;
        image.alt = item.name || "Ordered product";
        image.loading = "lazy";

        image.onerror = () => {
            image.remove();

            if (!imageWrap.querySelector("i")) {
                imageWrap.appendChild(
                    createOrderElement(
                        "i",
                        "fa-solid fa-fish"
                    )
                );
            }
        };

        imageWrap.appendChild(image);

    } else {
        imageWrap.appendChild(
            createOrderElement(
                "i",
                "fa-solid fa-fish"
            )
        );
    }

    const productInfo = createOrderElement(
        "div",
        "order-product-info"
    );

    const productName = createOrderElement(
        "strong",
        "order-product-name",
        item.name || "Aquarium product"
    );

    const productMeta = createOrderElement(
        "span",
        "order-product-meta",
        `Qty: ${Number(item.quantity) || 0} · ${formatOrderCurrency(item.price)}`
    );

    productInfo.append(productName, productMeta);

    const lineTotal = createOrderElement(
        "strong",
        "order-product-line-total",
        formatOrderCurrency(item.subtotal)
    );

    productRow.append(
        imageWrap,
        productInfo,
        lineTotal
    );

    return productRow;
}


/* -------------------- RENDER ORDER CARDS -------------------- */

function renderMyOrders(orders, totalOrders) {
    ordersList.replaceChildren();

    if (orders.length === 0) {
        const empty = createOrderElement(
            "div",
            "orders-empty"
        );

        const icon = createOrderElement(
            "i",
            "fa-solid fa-box-open"
        );

        const heading = createOrderElement(
            "h3",
            "",
            orderCurrentStatus
                ? "No orders found for this status."
                : "Your orders will appear here."
        );

        const paragraph = createOrderElement(
            "p",
            "",
            orderCurrentStatus
                ? "Try selecting another order status."
                : "Once you place an order, you can track its progress here."
        );

        const shopLink = createOrderElement(
            "a",
            "orders-shop-link",
            "Explore the shop"
        );

        shopLink.href = "shop.html";

        const arrow = createOrderElement(
            "i",
            "fa-solid fa-arrow-right"
        );

        shopLink.appendChild(arrow);

        empty.append(
            icon,
            heading,
            paragraph,
            shopLink
        );

        ordersList.appendChild(empty);

        return;
    }

    orders.forEach(order => {
        const card = createOrderElement(
            "article",
            "order-card"
        );

        /* ORDER HEADER */

        const header = createOrderElement(
            "div",
            "order-card-header"
        );

        const orderIdentity = createOrderElement(
            "div",
            "order-card-identity"
        );

        const orderNumber = createOrderElement(
            "strong",
            "order-number",
            order.orderNumber || "Order"
        );

        const orderDate = createOrderElement(
            "span",
            "order-date",
            formatOrderDate(order.createdAt)
        );

        orderIdentity.append(
            orderNumber,
            orderDate
        );

        const status = createOrderElement(
            "span",
            `order-status status-${order.orderStatus}`,
            getStatusLabel(order.orderStatus)
        );

        header.append(
            orderIdentity,
            status
        );

        /* PRODUCT LIST */

        const products = createOrderElement(
            "div",
            "order-card-products"
        );

        const orderItems = Array.isArray(order.items)
            ? order.items
            : [];

        const itemCount = orderItems.reduce(
            (total, item) =>
                total + (Number(item.quantity) || 0),
            0
        );

        if (orderItems.length === 0) {
            products.appendChild(
                createOrderElement(
                    "span",
                    "order-items-fallback",
                    "Product details unavailable"
                )
            );

        } else {
            orderItems.forEach(item => {
                products.appendChild(
                    createOrderProductRow(item)
                );
            });
        }

        const itemCountLabel = createOrderElement(
            "div",
            "order-item-count",
            `${itemCount} item${itemCount === 1 ? "" : "s"} in this order`
        );

        products.appendChild(itemCountLabel);

        /* ORDER FOOTER */

        const footer = createOrderElement(
            "div",
            "order-card-footer"
        );

        const total = createOrderElement(
            "strong",
            "order-card-total",
            formatOrderCurrency(order.total)
        );

        const detailsButton = createOrderElement(
            "button",
            "order-details-button",
            "View Details"
        );

        detailsButton.type = "button";

        detailsButton.dataset.orderId =
            order.orderNumber || order._id;

        detailsButton.addEventListener("click", () => {
            loadMyOrderDetails(detailsButton.dataset.orderId);
        });

        footer.append(
            total,
            detailsButton
        );

        card.append(
            header,
            products,
            footer
        );

        ordersList.appendChild(card);
    });

    showOrdersMessage(
        `${totalOrders} order${totalOrders === 1 ? "" : "s"} found.`,
        "success"
    );
}


/* -------------------- PAGINATION -------------------- */

function updateOrdersPagination() {
    const pagination = document.getElementById(
        "ordersPagination"
    );

    const previousButton = document.getElementById(
        "ordersPrevious"
    );

    const nextButton = document.getElementById(
        "ordersNext"
    );

    const pageInfo = document.getElementById(
        "ordersPageInfo"
    );

    pagination.classList.toggle(
        "hidden",
        orderTotalPages <= 1
    );

    previousButton.disabled = orderCurrentPage <= 1;

    nextButton.disabled =
        orderCurrentPage >= orderTotalPages;

    pageInfo.textContent =
        `Page ${orderCurrentPage} of ${orderTotalPages}`;
}

document.getElementById("ordersPrevious").addEventListener(
    "click",
    () => {
        if (orderCurrentPage > 1) {
            loadMyOrders(orderCurrentPage - 1);
        }
    }
);

document.getElementById("ordersNext").addEventListener(
    "click",
    () => {
        if (orderCurrentPage < orderTotalPages) {
            loadMyOrders(orderCurrentPage + 1);
        }
    }
);


/* -------------------- STATUS FILTER -------------------- */

document.getElementById("orderStatusFilter").addEventListener(
    "change",
    event => {
        orderCurrentStatus = event.target.value;
        loadMyOrders(1);
    }
);


/* -------------------- ORDER DETAILS -------------------- */

async function loadMyOrderDetails(identifier) {
    clearOrdersMessage();

    orderListView.classList.add("hidden");
    orderDetailView.classList.remove("hidden");

    orderDetailContent.replaceChildren();

    const loading = createOrderElement(
        "div",
        "orders-loading",
        "Loading order details..."
    );

    orderDetailContent.appendChild(loading);

    try {
        const result = await apiRequest(
            `/orders/my/${encodeURIComponent(identifier)}`
        );

        if (!result.order) {
            throw new Error(
                "Order details could not be found."
            );
        }

        renderOrderDetails(result.order);

    } catch (error) {
        orderDetailContent.replaceChildren();

        const errorBox = createOrderElement(
            "div",
            "orders-error",
            error.message
        );

        orderDetailContent.appendChild(errorBox);
    }
}


/* -------------------- ORDER TRACKING TIMELINE -------------------- */

function renderOrderTimeline(order) {
    const steps = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered"
    ];

    const timeline = createOrderElement(
        "div",
        "order-timeline"
    );

    const currentIndex = steps.indexOf(
        order.orderStatus
    );

    if (order.orderStatus === "cancelled") {
        const cancelled = createOrderElement(
            "div",
            "order-cancelled-message"
        );

        const icon = createOrderElement(
            "i",
            "fa-solid fa-circle-xmark"
        );

        const text = createOrderElement(
            "span",
            "",
            "This order has been cancelled."
        );

        cancelled.append(icon, text);
        timeline.appendChild(cancelled);

    } else {
        steps.forEach((step, index) => {
            const item = createOrderElement(
                "div",
                "order-timeline-step"
            );

            if (index < currentIndex) {
                item.classList.add("completed");

            } else if (index === currentIndex) {
                item.classList.add("current");
            }

            const marker = createOrderElement(
                "span",
                "timeline-marker"
            );

            const label = createOrderElement(
                "span",
                "timeline-label",
                getStatusLabel(step)
            );

            item.append(marker, label);
            timeline.appendChild(item);
        });
    }

    return timeline;
}


/* -------------------- RENDER ORDER DETAILS -------------------- */

function renderOrderDetails(order) {
    orderDetailContent.replaceChildren();

    const heading = createOrderElement(
        "div",
        "order-detail-heading"
    );

    const title = createOrderElement(
        "h3",
        "",
        order.orderNumber || "Order Details"
    );

    const date = createOrderElement(
        "p",
        "",
        `Placed on ${formatOrderDate(order.createdAt)}`
    );

    heading.append(title, date);

    const trackingHeading = createOrderElement(
        "h4",
        "order-subheading",
        "Order Status"
    );

    const timeline = renderOrderTimeline(order);

    const productsHeading = createOrderElement(
        "h4",
        "order-subheading",
        "Items Ordered"
    );

    const productList = createOrderElement(
        "div",
        "order-detail-products"
    );

    
    (order.items || []).forEach(item => {
    const product = createOrderElement(
        "div",
        "order-detail-product"
    );

    // Product image
    const imageWrap = createOrderElement(
        "div",
        "order-detail-image-wrap"
    );

    if (item.image && typeof item.image === "string") {
        const image = document.createElement("img");

        image.src = item.image;
        image.alt = item.name || "Ordered product";
        image.loading = "lazy";

        image.onerror = () => {
            image.remove();

            if (!imageWrap.querySelector("i")) {
                imageWrap.appendChild(
                    createOrderElement("i", "fa-solid fa-fish")
                );
            }
        };

        imageWrap.appendChild(image);
    } else {
        imageWrap.appendChild(
            createOrderElement("i", "fa-solid fa-fish")
        );
    }

    // Product information
    const productInfo = createOrderElement(
        "div",
        "order-detail-product-info"
    );

    const name = createOrderElement(
        "strong",
        "",
        item.name || "Product"
    );

    const quantity = createOrderElement(
        "span",
        "",
        `Quantity: ${Number(item.quantity) || 1}`
    );

    productInfo.append(name, quantity);

    // Product price
    const price = createOrderElement(
        "strong",
        "order-detail-product-price",
        formatOrderCurrency(item.subtotal)
    );

    product.append(imageWrap, productInfo, price);
    productList.appendChild(product);
    });


    /* PRICE SUMMARY */

    const summary = createOrderElement(
        "div",
        "order-detail-summary"
    );

    const subtotalRow = createOrderElement(
        "div",
        "order-summary-row"
    );

    subtotalRow.append(
        createOrderElement("span", "", "Subtotal"),
        createOrderElement(
            "span",
            "",
            formatOrderCurrency(order.subtotal)
        )
    );

    const shippingRow = createOrderElement(
        "div",
        "order-summary-row"
    );

    shippingRow.append(
        createOrderElement("span", "", "Shipping"),
        createOrderElement(
            "span",
            "",
            formatOrderCurrency(order.shippingFee)
        )
    );

    const discountRow = createOrderElement(
        "div",
        "order-summary-row"
    );

    discountRow.append(
        createOrderElement("span", "", "Discount"),
        createOrderElement(
            "span",
            "",
            `-${formatOrderCurrency(order.discount)}`
        )
    );

    const totalRow = createOrderElement(
        "div",
        "order-summary-row order-summary-total"
    );

    totalRow.append(
        createOrderElement("strong", "", "Total"),
        createOrderElement(
            "strong",
            "",
            formatOrderCurrency(order.total)
        )
    );

    summary.append(
        subtotalRow,
        shippingRow,
        discountRow,
        totalRow
    );

    /* PAYMENT */

    const paymentHeading = createOrderElement(
        "h4",
        "order-subheading",
        "Payment"
    );

    const paymentInfo = createOrderElement(
        "div",
        "order-detail-info"
    );

    paymentInfo.append(
        createOrderElement(
            "p",
            "",
            `Method: ${
                order.paymentMethod === "cash_on_delivery"
                    ? "Cash on Delivery"
                    : order.paymentMethod || "Not specified"
            }`
        ),

        createOrderElement(
            "p",
            "",
            `Payment status: ${order.paymentStatus || "Pending"}`
        )
    );

    /* DELIVERY ADDRESS */

    const addressHeading = createOrderElement(
        "h4",
        "order-subheading",
        "Delivery Address"
    );

    const address = order.shippingAddress || {};

    const addressInfo = createOrderElement(
        "div",
        "order-detail-info"
    );

    addressInfo.textContent = [
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.state,
        address.postalCode,
        address.country
    ].filter(Boolean).join(", ");

    /* STATUS HISTORY */

    const historyHeading = createOrderElement(
        "h4",
        "order-subheading",
        "Status History"
    );

    const history = createOrderElement(
        "div",
        "order-status-history"
    );

    (order.statusHistory || []).forEach(entry => {
        const row = createOrderElement(
            "div",
            "order-history-entry"
        );

        const status = createOrderElement(
            "strong",
            "",
            getStatusLabel(entry.status)
        );

        const note = createOrderElement(
            "p",
            "",
            entry.note || ""
        );

        const changedAt = createOrderElement(
            "small",
            "",
            formatOrderDate(entry.changedAt)
        );

        row.append(status, note, changedAt);
        history.appendChild(row);
    });

    orderDetailContent.append(
        heading,
        trackingHeading,
        timeline,
        productsHeading,
        productList,
        summary,
        paymentHeading,
        paymentInfo,
        addressHeading,
        addressInfo,
        historyHeading,
        history
    );
}


/* -------------------- BACK TO ORDER LIST -------------------- */

document.getElementById("backToOrders").addEventListener(
    "click",
    () => {
        showOrderList();
        loadMyOrders(orderCurrentPage);
    }
);


/* =================================
   CUSTOMER PROFILE UPDATE
================================= */

document.getElementById("profileForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();
        clearMessage();

        const button = document.getElementById(
            "profileSaveButton"
        );

        const originalText =
            'Save Changes <i class="fa-solid fa-arrow-right"></i>';

        const body = {
            name: document.getElementById("profileName").value.trim(),
            phone: document.getElementById("profilePhone").value.trim()
        };

        if (body.name.length < 2) {
            showMessage(
                "Name must contain at least 2 characters."
            );
            return;
        }

        if (!/^\+?[0-9\s()-]{10,20}$/.test(body.phone)) {
            showMessage("Please enter a valid mobile number.");
            return;
        }

        setLoading(button, true, originalText);

        try {
            const result = await apiRequest(
                "/customer-auth/me",
                {
                    method: "PATCH",
                    body: JSON.stringify(body)
                }
            );

            if (result.customer) {
                renderCustomer(result.customer);
            }

            showMessage(
                "Your profile has been updated successfully.",
                "success"
            );

        } catch (error) {
            showMessage(error.message);

        } finally {
            setLoading(button, false, originalText);
        }
    }
);


/* =================================
   CUSTOMER SESSION
================================= */

async function checkCustomerSession() {
    try {
        const result = await apiRequest(
            "/customer-auth/me"
        );

        renderCustomer(result.customer);

    } catch (error) {
        showLogin();
    }
}


/* =================================
   CUSTOMER LOGOUT
================================= */

document.getElementById("logoutButton").addEventListener(
    "click",
    async () => {
        const button = document.getElementById("logoutButton");

        button.disabled = true;

        try {
            await apiRequest(
                "/customer-auth/logout",
                { method: "POST" }
            );

            loggedInPanel.classList.add("hidden");

            showLogin();

            showMessage(
                "You have been signed out successfully.",
                "success"
            );

        } catch (error) {
            showMessage(error.message);

        } finally {
            button.disabled = false;
        }
    }
);


/* =================================
   CUSTOMER ADDRESS MANAGEMENT
================================= */

let savedAddresses = [];

const addressList = document.getElementById("addressList");
const addressForm = document.getElementById("addressForm");
const addressMessage = document.getElementById("addressMessage");


/* -------------------- ADDRESS MESSAGES -------------------- */

function showAddressMessage(message, type = "error") {
    addressMessage.textContent = message;
    addressMessage.className = `account-message show ${type}`;
}

function clearAddressMessage() {
    addressMessage.textContent = "";
    addressMessage.className = "account-message";
}


/* -------------------- ADDRESS FORM -------------------- */

function closeAddressForm() {
    addressForm.reset();
    addressForm.classList.add("hidden");

    document.getElementById("editingAddressId").value = "";

    document.getElementById("addressFormTitle").textContent =
        "Add New Address";

    document.getElementById("saveAddressButton").innerHTML =
        'Save Address <i class="fa-solid fa-arrow-right"></i>';

    clearAddressMessage();
}

function openAddressForm(address = null) {
    clearAddressMessage();
    addressForm.reset();

    document.getElementById("editingAddressId").value =
        address?._id || "";

    document.getElementById("addressFormTitle").textContent =
        address ? "Edit Address" : "Add New Address";

    document.getElementById("addressLabel").value =
        address?.label || "Home";

    document.getElementById("addressLine1").value =
        address?.addressLine1 || "";

    document.getElementById("addressLine2").value =
        address?.addressLine2 || "";

    document.getElementById("addressCity").value =
        address?.city || "";

    document.getElementById("addressState").value =
        address?.state || "";

    document.getElementById("addressPostalCode").value =
        address?.postalCode || "";

    document.getElementById("addressCountry").value =
        address?.country || "India";

    document.getElementById("addressIsDefault").checked =
        address
            ? Boolean(address.isDefault)
            : savedAddresses.length === 0;

    document.getElementById("saveAddressButton").innerHTML =
        address
            ? 'Update Address <i class="fa-solid fa-arrow-right"></i>'
            : 'Save Address <i class="fa-solid fa-arrow-right"></i>';

    addressForm.classList.remove("hidden");

    addressForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* -------------------- LOAD ADDRESSES -------------------- */

async function loadAddresses() {
    if (!addressList) return;

    addressList.innerHTML =
        '<div class="address-loading">Loading your saved addresses...</div>';

    try {
        const result = await apiRequest(
            "/customer-addresses"
        );

        savedAddresses = Array.isArray(result.addresses)
            ? result.addresses
            : [];

        renderAddresses();

    } catch (error) {
        addressList.replaceChildren();

        const errorElement = document.createElement("div");

        errorElement.className = "address-empty";
        errorElement.textContent = error.message;

        addressList.appendChild(errorElement);
    }
}


/* -------------------- RENDER ADDRESSES -------------------- */

function renderAddresses() {
    addressList.replaceChildren();

    document.getElementById("addressCount").textContent =
        `${savedAddresses.length} of 2 addresses saved`;

    document.getElementById("addAddressButton").disabled =
        savedAddresses.length >= 2;

    if (savedAddresses.length === 0) {
        const empty = document.createElement("div");
        empty.className = "address-empty";

        const icon = document.createElement("i");
        icon.className = "fa-solid fa-location-dot";

        const heading = document.createElement("strong");
        heading.textContent = "No saved addresses yet.";

        const paragraph = document.createElement("p");

        paragraph.textContent =
            "Add a delivery address to make your next purchase easier.";

        empty.append(icon, heading, paragraph);

        addressList.appendChild(empty);

        return;
    }

    savedAddresses.forEach(address => {
        const card = document.createElement("article");

        card.className = `address-card ${
            address.isDefault ? "default-address" : ""
        }`;

        const top = document.createElement("div");
        top.className = "address-card-top";

        const type = document.createElement("span");
        type.className = "address-type";
        type.textContent = address.label || "Address";

        top.appendChild(type);

        if (address.isDefault) {
            const badge = document.createElement("span");

            badge.className = "address-default-badge";
            badge.textContent = "Default";

            top.appendChild(badge);
        }

        const details = document.createElement("p");

        details.textContent = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(Boolean).join(", ");

        const actions = document.createElement("div");
        actions.className = "address-card-actions";

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.id = address._id;
        editButton.textContent = "Edit";

        actions.appendChild(editButton);

        if (!address.isDefault) {
            const defaultButton = document.createElement("button");

            defaultButton.type = "button";
            defaultButton.dataset.action = "default";
            defaultButton.dataset.id = address._id;
            defaultButton.textContent = "Set as Default";

            actions.appendChild(defaultButton);
        }

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-address";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = address._id;
        deleteButton.textContent = "Delete";

        actions.appendChild(deleteButton);

        card.append(top, details, actions);

        addressList.appendChild(card);
    });
}


/* -------------------- ADD ADDRESS BUTTON -------------------- */

document.getElementById("addAddressButton").addEventListener(
    "click",
    () => {
        if (savedAddresses.length >= 2) {
            showAddressMessage(
                "You can save a maximum of two addresses."
            );
            return;
        }

        openAddressForm();
    }
);


/* -------------------- CANCEL ADDRESS FORM -------------------- */

document.getElementById("cancelAddressButton").addEventListener(
    "click",
    closeAddressForm
);

document.getElementById("cancelAddressButtonSecondary").addEventListener(
    "click",
    closeAddressForm
);


/* -------------------- SAVE ADDRESS -------------------- */

addressForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearAddressMessage();

    const addressId =
        document.getElementById("editingAddressId").value;

    const body = {
        label: document.getElementById("addressLabel").value,
        addressLine1: document.getElementById("addressLine1").value.trim(),
        addressLine2: document.getElementById("addressLine2").value.trim(),
        city: document.getElementById("addressCity").value.trim(),
        state: document.getElementById("addressState").value.trim(),
        postalCode: document.getElementById("addressPostalCode").value.trim(),
        country: document.getElementById("addressCountry").value.trim(),
        isDefault: document.getElementById("addressIsDefault").checked
    };

    if (
        !body.addressLine1 ||
        !body.city ||
        !body.state ||
        !body.postalCode ||
        !body.country
    ) {
        showAddressMessage(
            "Please complete all required address fields."
        );
        return;
    }

    const button = document.getElementById("saveAddressButton");

    const originalText = addressId
        ? "Update Address"
        : "Save Address";

    setLoading(button, true, originalText);

    try {
        const result = await apiRequest(
            addressId
                ? `/customer-addresses/${addressId}`
                : "/customer-addresses",
            {
                method: addressId ? "PATCH" : "POST",
                body: JSON.stringify(body)
            }
        );

        savedAddresses = result.addresses || [];

        closeAddressForm();
        renderAddresses();

        showAddressMessage(
            result.message,
            "success"
        );

    } catch (error) {
        showAddressMessage(error.message);

    } finally {
        setLoading(button, false, originalText);
    }
});


/* -------------------- ADDRESS CARD ACTIONS -------------------- */

addressList.addEventListener("click", async event => {
    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) return;

    const addressId = button.dataset.id;
    const action = button.dataset.action;

    const address = savedAddresses.find(
        item => item._id === addressId
    );

    if (!address) return;

    if (action === "edit") {
        openAddressForm(address);
        return;
    }

    if (action === "delete") {
        if (!confirm("Are you sure you want to delete this address?")) {
            return;
        }

        button.disabled = true;

        try {
            const result = await apiRequest(
                `/customer-addresses/${addressId}`,
                { method: "DELETE" }
            );

            savedAddresses = result.addresses || [];

            renderAddresses();

            showAddressMessage(
                result.message,
                "success"
            );

        } catch (error) {
            showAddressMessage(error.message);
        }

        return;
    }

    if (action === "default") {
        button.disabled = true;

        try {
            const result = await apiRequest(
                `/customer-addresses/${addressId}/default`,
                { method: "PATCH" }
            );

            savedAddresses = result.addresses || [];

            renderAddresses();

            showAddressMessage(
                result.message,
                "success"
            );

        } catch (error) {
            showAddressMessage(error.message);
        }
    }
});


/* =================================
   INITIALIZE CUSTOMER SESSION
================================= */

checkCustomerSession();
