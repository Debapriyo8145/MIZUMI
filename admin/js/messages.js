
/* =========================================================
   MIZUMI AQUATICS — CUSTOMER MESSAGES
   API: http://localhost:5000/api/v1/contact
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const API_BASE = "http://localhost:5000/api/v1";
    const TOKEN_KEY = "mizumiAdminToken";
    const EMAIL_KEY = "mizumiAdminEmail";
    const PAGE_LIMIT = 20;

    const state = {
        messages: [],
        selectedMessage: null,
        status: "all",
        search: "",
        page: 1,
        totalPages: 1,
        totalContacts: 0,
        loading: false,
        searchTimer: null,
        toastTimer: null
    };


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const elements = {
        adminEmail: document.getElementById("adminEmail"),
        logoutButton: document.getElementById("logoutButton"),

        adminSidebar: document.getElementById("adminSidebar"),
        mobileMenuButton: document.getElementById("mobileMenuButton"),
        sidebarBackdrop: document.getElementById("sidebarBackdrop"),

        totalMessages: document.getElementById("totalMessages"),
        newMessages: document.getElementById("newMessages"),
        repliedMessages: document.getElementById("repliedMessages"),

        sidebarNewMessages: document.getElementById("sidebarNewMessages"),
        newTabCount: document.getElementById("newTabCount"),

        messageSearch: document.getElementById("messageSearch"),
        messageResultCount: document.getElementById("messageResultCount"),
        messagesList: document.getElementById("messagesList"),

        messagesPaginationInfo: document.getElementById("messagesPaginationInfo"),
        previousMessagesPage: document.getElementById("previousMessagesPage"),
        nextMessagesPage: document.getElementById("nextMessagesPage"),

        messageDetailsPanel: document.getElementById("messageDetailsPanel"),
        messageEmptyState: document.getElementById("messageEmptyState"),
        messageDetails: document.getElementById("messageDetails"),

        detailSubject: document.getElementById("detailSubject"),
        deleteMessageButton: document.getElementById("deleteMessageButton"),

        customerAvatar: document.getElementById("customerAvatar"),
        detailName: document.getElementById("detailName"),
        detailEmail: document.getElementById("detailEmail"),
        detailPhone: document.getElementById("detailPhone"),
        detailStatus: document.getElementById("detailStatus"),
        detailDate: document.getElementById("detailDate"),
        detailMessage: document.getElementById("detailMessage"),

        replyCount: document.getElementById("replyCount"),
        replyHistory: document.getElementById("replyHistory"),

        messageReplyForm: document.getElementById("messageReplyForm"),
        replyMessage: document.getElementById("replyMessage"),
        sendReplyButton: document.getElementById("sendReplyButton"),

        refreshMessages: document.getElementById("refreshMessages"),

        messagesToast: document.getElementById("messagesToast"),
        messagesToastMessage: document.getElementById("messagesToastMessage")
    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    if (elements.adminEmail) {
        elements.adminEmail.textContent =
            sessionStorage.getItem(EMAIL_KEY) || "Administrator";
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeHTML(value = "") {
        return String(value).replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }


    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    function formatDateTime(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    function getInitials(name = "") {
        const parts = String(name).trim().split(/\s+/).filter(Boolean);

        if (!parts.length) return "?";

        return parts
            .slice(0, 2)
            .map(part => part.charAt(0))
            .join("")
            .toUpperCase();
    }


    function getMessageId(message) {
        return String(message?._id || message?.id || "");
    }


    function showToast(message, type = "success") {
        if (!elements.messagesToast || !elements.messagesToastMessage) {
            return;
        }

        clearTimeout(state.toastTimer);

        elements.messagesToastMessage.textContent = message;

        elements.messagesToast.classList.toggle(
            "error",
            type === "error"
        );

        elements.messagesToast.classList.add("show");

        state.toastTimer = setTimeout(() => {
            elements.messagesToast.classList.remove("show");
        }, 3500);
    }


    function setLoading(button, loading, originalText) {
        if (!button) return;

        button.disabled = loading;

        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.textContent = "Please wait...";
        } else {
            button.innerHTML =
                button.dataset.originalText || originalText;
        }
    }


    function resetDetailsScroll() {
        if (elements.messageDetailsPanel) {
            elements.messageDetailsPanel.scrollTop = 0;
        }
    }


    function showEmptyState() {
        if (elements.messageDetails) {
            elements.messageDetails.hidden = true;
        }

        if (elements.messageEmptyState) {
            elements.messageEmptyState.hidden = false;
        }

        resetDetailsScroll();
    }


    function showSelectedMessage() {
        if (elements.messageEmptyState) {
            elements.messageEmptyState.hidden = true;
        }

        if (elements.messageDetails) {
            elements.messageDetails.hidden = false;
        }
    }


    /* =====================================================
       API HELPER
    ===================================================== */

    async function messagesAPI(endpoint, options = {}) {

        const requestOptions = {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.body ? {
                    "Content-Type": "application/json"
                } : {}),
                ...options.headers
            }
        };

        let response;

        try {
            response = await fetch(
                `${API_BASE}${endpoint}`,
                requestOptions
            );
        } catch (error) {
            throw new Error(
                "Unable to connect to the server. Check whether the backend is running."
            );
        }

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(EMAIL_KEY);

            window.location.replace("login.html");

            throw new Error("Your session has expired.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Something went wrong. Please try again."
            );
        }

        return data;
    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function closeMobileSidebar() {
        elements.adminSidebar?.classList.remove("open");
        elements.sidebarBackdrop?.classList.remove("show");

        elements.mobileMenuButton?.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    elements.mobileMenuButton?.addEventListener("click", () => {

        const isOpen =
            elements.adminSidebar?.classList.toggle("open");

        elements.sidebarBackdrop?.classList.toggle(
            "show",
            Boolean(isOpen)
        );

        elements.mobileMenuButton?.setAttribute(
            "aria-expanded",
            String(Boolean(isOpen))
        );
    });


    elements.sidebarBackdrop?.addEventListener(
        "click",
        closeMobileSidebar
    );


    elements.logoutButton?.addEventListener("click", () => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);

        window.location.replace("login.html");
    });


    /* =====================================================
       STATUS COUNTS
    ===================================================== */

    async function loadMessageStats() {

        try {

            const [allData, newData, repliedData] = await Promise.all([

                messagesAPI("/contact?status=all&page=1&limit=1"),

                messagesAPI("/contact?status=new&page=1&limit=1"),

                messagesAPI("/contact?status=replied&page=1&limit=1")

            ]);

            const total = Number(allData.totalContacts || 0);
            const newCount = Number(newData.totalContacts || 0);
            const repliedCount = Number(repliedData.totalContacts || 0);

            if (elements.totalMessages) {
                elements.totalMessages.textContent = total;
            }

            if (elements.newMessages) {
                elements.newMessages.textContent = newCount;
            }

            if (elements.repliedMessages) {
                elements.repliedMessages.textContent = repliedCount;
            }

            if (elements.sidebarNewMessages) {
                elements.sidebarNewMessages.textContent =
                    newCount > 0 ? newCount : "";
            }

            if (elements.newTabCount) {
                elements.newTabCount.textContent = newCount;
            }

        } catch (error) {
            console.error("Message statistics error:", error);
        }
    }


    /* =====================================================
       LOAD MESSAGES
    ===================================================== */

    async function loadMessages() {

        if (state.loading) return;

        state.loading = true;

        if (elements.messagesList) {
            elements.messagesList.setAttribute("aria-busy", "true");

            elements.messagesList.innerHTML = `
                <div class="messages-loading">
                    Loading customer enquiries...
                </div>
            `;
        }

        updatePagination();

        try {

            const params = new URLSearchParams({
                status: state.status,
                page: String(state.page),
                limit: String(PAGE_LIMIT)
            });

            if (state.search.trim()) {
                params.set("search", state.search.trim());
            }

            const data = await messagesAPI(
                `/contact?${params.toString()}`
            );

            state.messages = Array.isArray(data.contacts)
                ? data.contacts
                : [];

            state.totalContacts = Number(data.totalContacts || 0);

            state.totalPages = Math.max(
                1,
                Number(data.totalPages || 1)
            );

            // Keep selected message highlighted only if it is in this list.
            renderMessages();
            updatePagination();

        } catch (error) {

            console.error("Load messages error:", error);

            if (elements.messagesList) {
                elements.messagesList.innerHTML = `
                    <div class="messages-empty-state">
                        <strong>Unable to load messages</strong>
                        <p>${escapeHTML(error.message)}</p>
                    </div>
                `;
            }

            showToast(error.message, "error");

        } finally {

            state.loading = false;

            elements.messagesList?.setAttribute("aria-busy", "false");

            updatePagination();

            if (elements.refreshMessages) {
                elements.refreshMessages.disabled = false;
            }
        }
    }


    /* =====================================================
       RENDER MESSAGE LIST
    ===================================================== */

    function renderMessages() {

        if (!elements.messagesList) return;

        if (elements.messageResultCount) {
            elements.messageResultCount.textContent =
                `${state.totalContacts} ${
                    state.totalContacts === 1 ? "message" : "messages"
                }`;
        }

        if (!state.messages.length) {

            elements.messagesList.innerHTML = `
                <div class="messages-empty-state">
                    <strong>No messages found</strong>
                    <p>
                        Customer enquiries will appear here
                        when someone contacts MIZUMI.
                    </p>
                </div>
            `;

            return;
        }

        const selectedId = getMessageId(state.selectedMessage);

        elements.messagesList.innerHTML = state.messages.map(contact => {

            const id = getMessageId(contact);
            const active = selectedId && selectedId === id;
            const isNew = contact.status === "new";

            const preview = String(contact.message || "")
                .replace(/\s+/g, " ")
                .trim();

            return `
                <button
                    type="button"
                    class="message-item
                        ${isNew ? "unread" : ""}
                        ${active ? "active" : ""}"
                    data-message-id="${escapeHTML(id)}"
                    aria-label="Open message from ${escapeHTML(contact.name || "Customer")}"
                    aria-pressed="${Boolean(active)}"
                >

                    <span class="message-avatar">
                        ${escapeHTML(getInitials(contact.name))}
                    </span>

                    <span class="message-item-main">

                        <span class="message-item-top">
                            <span class="message-item-name">
                                ${escapeHTML(contact.name || "Customer")}
                            </span>

                            <span class="message-item-date">
                                ${escapeHTML(formatDate(contact.createdAt))}
                            </span>
                        </span>

                        <span class="message-item-topic">
                            ${escapeHTML(contact.topic || "General enquiry")}
                        </span>

                        <span class="message-item-preview">
                            ${escapeHTML(preview)}
                        </span>

                        <span class="message-item-bottom">

                            <span class="message-status ${escapeHTML(contact.status || "new")}">
                                ${escapeHTML(contact.status || "new")}
                            </span>

                            ${isNew
                                ? `<span class="message-unread-dot" title="Unread"></span>`
                                : ""
                            }

                        </span>

                    </span>

                </button>
            `;

        }).join("");
    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function updatePagination() {

        if (elements.messagesPaginationInfo) {
            elements.messagesPaginationInfo.textContent =
                state.totalContacts === 0
                    ? "No messages"
                    : `Page ${state.page} of ${state.totalPages} · ${state.totalContacts} messages`;
        }

        if (elements.previousMessagesPage) {
            elements.previousMessagesPage.disabled =
                state.page <= 1 || state.loading;
        }

        if (elements.nextMessagesPage) {
            elements.nextMessagesPage.disabled =
                state.page >= state.totalPages || state.loading;
        }
    }


    elements.previousMessagesPage?.addEventListener("click", () => {

        if (state.page <= 1 || state.loading) return;

        state.page--;
        loadMessages();
    });


    elements.nextMessagesPage?.addEventListener("click", () => {

        if (state.page >= state.totalPages || state.loading) return;

        state.page++;
        loadMessages();
    });


    /* =====================================================
       OPEN MESSAGE
    ===================================================== */

    elements.messagesList?.addEventListener("click", async event => {

        const messageButton = event.target.closest("[data-message-id]");

        if (!messageButton) return;

        const id = messageButton.dataset.messageId;

        if (!id) return;

        await openMessage(id);
    });


    async function openMessage(id) {

        try {

            const data = await messagesAPI(
                `/contact/${encodeURIComponent(id)}`
            );

            const contact = data.contact;

            if (!contact) {
                throw new Error("Message details were not returned.");
            }

            state.selectedMessage = contact;

            // Show the selected message and hide the empty state.
            renderMessages();
            renderMessageDetails(contact);
            showSelectedMessage();

            // Start at the top of the selected conversation.
            resetDetailsScroll();

            /*
             * Mark new messages as read after opening.
             */
            if (contact.status === "new") {

                try {

                    const updated = await messagesAPI(
                        `/contact/${encodeURIComponent(id)}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                status: "read"
                            })
                        }
                    );

                    if (updated.contact) {
                        state.selectedMessage = updated.contact;
                    }

                    renderMessages();
                    renderMessageDetails(state.selectedMessage);

                    await Promise.all([
                        loadMessages(),
                        loadMessageStats()
                    ]);

                } catch (error) {
                    console.error("Unable to mark message as read:", error);
                    showToast("Message opened, but its read status could not be updated.", "error");
                }
            }

        } catch (error) {

            console.error("Open message error:", error);

            showToast(error.message, "error");
        }
    }


    /* =====================================================
       RENDER MESSAGE DETAILS
    ===================================================== */

    function renderMessageDetails(contact) {

        if (!contact) return;

        const name = contact.name || "Customer";
        const email = contact.email || "";
        const phone = contact.phone || "";

        if (elements.customerAvatar) {
            elements.customerAvatar.textContent = getInitials(name);
        }

        if (elements.detailName) {
            elements.detailName.textContent = name;
        }

        // Real email link.
        if (elements.detailEmail) {
            elements.detailEmail.textContent =
                email || "Email not provided";

            elements.detailEmail.href = email
                ? `mailto:${email}`
                : "#";

            elements.detailEmail.style.pointerEvents =
                email ? "auto" : "none";
        }

        // Real telephone link.
        if (elements.detailPhone) {
            elements.detailPhone.textContent =
                phone || "Phone not provided";

            elements.detailPhone.href = phone
                ? `tel:${phone.replace(/[^\d+]/g, "")}`
                : "#";

            elements.detailPhone.style.pointerEvents =
                phone ? "auto" : "none";
        }

        if (elements.detailSubject) {
            elements.detailSubject.textContent =
                contact.topic || "General enquiry";
        }

        if (elements.detailMessage) {
            elements.detailMessage.textContent =
                contact.message || "";
        }

        if (elements.detailDate) {
            elements.detailDate.textContent =
                formatDateTime(contact.createdAt);
        }

        if (elements.detailStatus) {

            const status = contact.status || "new";

            elements.detailStatus.textContent = status;

            elements.detailStatus.className =
                `message-status-badge ${status}`;
        }

        renderReplyHistory(contact.replies || []);

        if (elements.replyMessage) {
            elements.replyMessage.value = "";
        }

        showSelectedMessage();
    }


    /* =====================================================
       REPLY HISTORY
    ===================================================== */

    function renderReplyHistory(replies) {

        if (!elements.replyHistory) return;

        const safeReplies = Array.isArray(replies)
            ? replies
            : [];

        if (elements.replyCount) {
            elements.replyCount.textContent =
                `${safeReplies.length} ${
                    safeReplies.length === 1 ? "reply" : "replies"
                }`;
        }

        if (!safeReplies.length) {

            elements.replyHistory.innerHTML = `
                <p class="no-replies">
                    No replies have been sent yet.
                </p>
            `;

            return;
        }

        elements.replyHistory.innerHTML = safeReplies.map(reply => {

            return `
                <article class="reply-entry">

                    <div class="reply-entry-top">
                        <strong>${escapeHTML(reply.sentBy || "Admin")}</strong>

                        <span>
                            ${escapeHTML(formatDateTime(reply.sentAt))}
                        </span>
                    </div>

                    <p>${escapeHTML(reply.message || "")}</p>

                </article>
            `;

        }).join("");
    }


    /* =====================================================
       SEND EMAIL REPLY
    ===================================================== */

    elements.messageReplyForm?.addEventListener("submit", async event => {

        event.preventDefault();

        if (!state.selectedMessage) {
            showToast("Select a customer message first.", "error");
            return;
        }

        const message = elements.replyMessage?.value.trim() || "";

        if (message.length < 2) {
            showToast("Please enter a reply before sending.", "error");
            return;
        }

        if (message.length > 5000) {
            showToast("Reply cannot exceed 5000 characters.", "error");
            return;
        }

        const id = getMessageId(state.selectedMessage);

        if (!id) {
            showToast("Unable to identify the selected message.", "error");
            return;
        }

        setLoading(
            elements.sendReplyButton,
            true,
            "Send reply"
        );

        try {

            const data = await messagesAPI(
                `/contact/${encodeURIComponent(id)}/reply`,
                {
                    method: "POST",
                    body: JSON.stringify({ message })
                }
            );

            if (!data.emailSent && data.emailSent !== undefined) {
                throw new Error(
                    data.message || "The email was not sent."
                );
            }

            if (data.contact) {
                state.selectedMessage = data.contact;
            }

            renderMessageDetails(state.selectedMessage);
            showSelectedMessage();

            await Promise.all([
                loadMessages(),
                loadMessageStats()
            ]);

            showToast("Reply sent successfully.");

        } catch (error) {

            console.error("Send reply error:", error);

            showToast(error.message, "error");

        } finally {

            setLoading(
                elements.sendReplyButton,
                false,
                "Send reply"
            );
        }
    });


    /* =====================================================
       DELETE MESSAGE
    ===================================================== */

    elements.deleteMessageButton?.addEventListener("click", async () => {

        if (!state.selectedMessage) return;

        const id = getMessageId(state.selectedMessage);

        if (!id) {
            showToast("Unable to identify the selected message.", "error");
            return;
        }

        const customerName =
            state.selectedMessage.name || "this customer";

        const confirmed = window.confirm(
            `Delete the message from ${customerName}?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        setLoading(
            elements.deleteMessageButton,
            true,
            "Delete"
        );

        try {

            await messagesAPI(
                `/contact/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            state.selectedMessage = null;

            showEmptyState();

            await Promise.all([
                loadMessages(),
                loadMessageStats()
            ]);

            showToast("Message deleted successfully.");

        } catch (error) {

            console.error("Delete message error:", error);

            showToast(error.message, "error");

        } finally {

            setLoading(
                elements.deleteMessageButton,
                false,
                "Delete"
            );
        }
    });


    /* =====================================================
       STATUS FILTER TABS
    ===================================================== */

    document.querySelectorAll("#messageTabs [data-status]").forEach(tab => {

        tab.addEventListener("click", () => {

            const status = tab.dataset.status;

            if (!["all", "new", "read", "replied"].includes(status)) {
                return;
            }

            if (state.loading) return;

            state.status = status;
            state.page = 1;

            document.querySelectorAll("#messageTabs [data-status]").forEach(item => {

                const active = item === tab;

                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            loadMessages();
        });
    });


    /* =====================================================
       SEARCH
    ===================================================== */

    elements.messageSearch?.addEventListener("input", () => {

        clearTimeout(state.searchTimer);

        state.searchTimer = setTimeout(() => {

            state.search = elements.messageSearch.value.trim();
            state.page = 1;

            loadMessages();

        }, 350);
    });


    /* =====================================================
       REFRESH
    ===================================================== */

    elements.refreshMessages?.addEventListener("click", async () => {

        if (state.loading) return;

        elements.refreshMessages.disabled = true;

        await Promise.all([
            loadMessages(),
            loadMessageStats()
        ]);

        elements.refreshMessages.disabled = false;
    });


    /* =====================================================
       INITIALISE
    ===================================================== */

    async function initialiseMessages() {

        showEmptyState();

        await Promise.all([
            loadMessages(),
            loadMessageStats()
        ]);
    }

    initialiseMessages();

});
