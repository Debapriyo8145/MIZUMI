
"use strict";

/* =========================================
   MIZUMI — ANNOUNCEMENT MANAGEMENT
========================================= */

const API_BASE_URL = "http://localhost:5000/api/v1";
const ADMIN_TOKEN_KEY = "mizumiAdminToken";
const ADMIN_EMAIL_KEY = "mizumiAdminEmail";

const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);

if (!token) {
    window.location.href = "login.html";
}

let savedAnnouncement = null;

const elements = {
    form: document.getElementById("announcementForm"),
    primary: document.getElementById("primaryText"),
    secondary: document.getElementById("secondaryText"),
    active: document.getElementById("isActive"),

    primaryCount: document.getElementById("primaryCount"),
    secondaryCount: document.getElementById("secondaryCount"),

    preview: document.getElementById("announcementPreview"),
    previewPrimary: document.getElementById("previewPrimary"),
    previewSecondary: document.getElementById("previewSecondary"),
    previewDivider: document.getElementById("previewDivider"),

    status: document.getElementById("announcementStatus"),
    message: document.getElementById("announcementMessage"),

    saveButton: document.getElementById("saveAnnouncement"),
    refreshButton: document.getElementById("refreshAnnouncement"),
    resetButton: document.getElementById("resetAnnouncement"),

    adminEmail: document.getElementById("adminEmail"),
    logoutButton: document.getElementById("logoutButton"),

    mobileMenuButton: document.getElementById("mobileMenuButton"),
    sidebar: document.getElementById("adminSidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop")
};

/* -------------------- API -------------------- */

async function announcementRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem(ADMIN_EMAIL_KEY);
        window.location.href = "login.html";
        throw new Error("Your admin session has expired.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "Announcement request failed.");
    }

    return result;
}

/* -------------------- NOTIFICATIONS -------------------- */

function showMessage(message, type = "success") {
    elements.message.textContent = message;
    elements.message.className = `announcement-message ${type}`;
    elements.message.hidden = false;
}

function clearMessage() {
    elements.message.textContent = "";
    elements.message.hidden = true;
}

/* -------------------- FORM DATA -------------------- */

function getFormData() {
    return {
        primaryText: elements.primary.value.trim(),
        secondaryText: elements.secondary.value.trim(),
        isActive: elements.active.checked
    };
}

function updateCounters() {
    elements.primaryCount.textContent = elements.primary.value.length;
    elements.secondaryCount.textContent = elements.secondary.value.length;
}

function updatePreview() {
    const primary = elements.primary.value.trim();
    const secondary = elements.secondary.value.trim();

    elements.previewPrimary.textContent = primary || "YOUR ANNOUNCEMENT";
    elements.previewSecondary.textContent = secondary;
    elements.previewDivider.hidden = !secondary;

    elements.preview.classList.toggle(
        "is-hidden",
        !elements.active.checked
    );

    updateCounters();
}

function updateStatus(isActive) {
    elements.status.textContent = isActive
        ? "Announcement active"
        : "Announcement hidden";

    elements.status.classList.toggle("is-active", isActive);
    elements.status.classList.toggle("is-inactive", !isActive);
}

/* -------------------- LOAD ANNOUNCEMENT -------------------- */

async function loadAnnouncement() {
    clearMessage();

    elements.refreshButton.disabled = true;
    elements.refreshButton.textContent = "Loading...";

    try {
        const result = await announcementRequest("/announcement");
        const announcement = result.announcement;

        if (!announcement) {
            throw new Error("No announcement data was returned.");
        }

        savedAnnouncement = {
            primaryText: announcement.primaryText || "",
            secondaryText: announcement.secondaryText || "",
            isActive: announcement.isActive !== false
        };

        elements.primary.value = savedAnnouncement.primaryText;
        elements.secondary.value = savedAnnouncement.secondaryText;
        elements.active.checked = savedAnnouncement.isActive;

        updatePreview();
        updateStatus(savedAnnouncement.isActive);

    } catch (error) {
        console.error("Announcement loading error:", error);
        showMessage(error.message || "Unable to load announcement.", "error");

    } finally {
        elements.refreshButton.disabled = false;
        elements.refreshButton.textContent = "↻ Refresh";
    }
}

/* -------------------- SAVE ANNOUNCEMENT -------------------- */

async function saveAnnouncement(event) {
    event.preventDefault();
    clearMessage();

    const announcement = getFormData();

    if (!announcement.primaryText) {
        showMessage("Please enter the main announcement text.", "error");
        elements.primary.focus();
        return;
    }

    if (announcement.primaryText.length > 100) {
        showMessage("Main announcement cannot exceed 100 characters.", "error");
        return;
    }

    if (announcement.secondaryText.length > 150) {
        showMessage("Supporting text cannot exceed 150 characters.", "error");
        return;
    }

    elements.saveButton.disabled = true;
    elements.saveButton.textContent = "Saving...";

    try {
        const result = await announcementRequest("/announcement", {
            method: "PUT",
            body: JSON.stringify(announcement)
        });

        const updated = result.announcement || announcement;

        savedAnnouncement = {
            primaryText: updated.primaryText ?? announcement.primaryText,
            secondaryText: updated.secondaryText ?? announcement.secondaryText,
            isActive: updated.isActive ?? announcement.isActive
        };

        elements.primary.value = savedAnnouncement.primaryText;
        elements.secondary.value = savedAnnouncement.secondaryText;
        elements.active.checked = savedAnnouncement.isActive;

        updatePreview();
        updateStatus(savedAnnouncement.isActive);

        showMessage(
            result.message || "Announcement saved successfully.",
            "success"
        );

    } catch (error) {
        console.error("Announcement save error:", error);
        showMessage(error.message || "Unable to save announcement.", "error");

    } finally {
        elements.saveButton.disabled = false;
        elements.saveButton.innerHTML = 'Save announcement <span>→</span>';
    }
}

/* -------------------- RESET CHANGES -------------------- */

function resetAnnouncement() {
    if (!savedAnnouncement) return;

    elements.primary.value = savedAnnouncement.primaryText;
    elements.secondary.value = savedAnnouncement.secondaryText;
    elements.active.checked = savedAnnouncement.isActive;

    updatePreview();
    updateStatus(savedAnnouncement.isActive);
    clearMessage();
}

/* -------------------- AUTHENTICATION -------------------- */

function setupAdminAccount() {
    const email = sessionStorage.getItem(ADMIN_EMAIL_KEY);

    if (email) {
        elements.adminEmail.textContent = email;
    }

    elements.logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem(ADMIN_EMAIL_KEY);
        window.location.href = "login.html";
    });
}

/* -------------------- MOBILE SIDEBAR -------------------- */

function setupMobileSidebar() {
    if (!elements.mobileMenuButton || !elements.sidebar) return;

    function closeSidebar() {
        elements.sidebar.classList.remove("open");
        elements.sidebarBackdrop.classList.remove("show");
        elements.mobileMenuButton.setAttribute("aria-expanded", "false");
    }

    elements.mobileMenuButton.addEventListener("click", () => {
        const isOpen = elements.sidebar.classList.toggle("open");

        elements.sidebarBackdrop.classList.toggle("show", isOpen);
        elements.mobileMenuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    elements.sidebarBackdrop.addEventListener("click", closeSidebar);
}

/* -------------------- INITIALIZATION -------------------- */

function initializeAnnouncementPage() {
    if (!token) return;

    setupAdminAccount();
    setupMobileSidebar();

    elements.primary.addEventListener("input", updatePreview);
    elements.secondary.addEventListener("input", updatePreview);
    elements.active.addEventListener("change", updatePreview);

    elements.form.addEventListener("submit", saveAnnouncement);
    elements.refreshButton.addEventListener("click", loadAnnouncement);
    elements.resetButton.addEventListener("click", resetAnnouncement);

    loadAnnouncement();
}

initializeAnnouncementPage();
