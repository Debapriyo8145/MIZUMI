/* =====================================================
   MIZUMI AQUATICS — HERO MANAGER
===================================================== */

"use strict";

const API_URL = "http://localhost:5000/api/v1";
const TOKEN_KEY = "mizumiAdminToken";
const EMAIL_KEY = "mizumiAdminEmail";

const token = sessionStorage.getItem(TOKEN_KEY);

if (!token) {
    window.location.replace("login.html");
}

const $ = (id) => document.getElementById(id);

const elements = {
    adminEmail: $("adminEmail"),
    form: $("heroForm"),

    eyebrow: $("heroEyebrow"),
    heading: $("heroHeading"),
    description: $("heroDescription"),

    primaryButtonText: $("primaryButtonText"),
    primaryButtonUrl: $("primaryButtonUrl"),
    secondaryButtonText: $("secondaryButtonText"),
    secondaryButtonUrl: $("secondaryButtonUrl"),
    heroNote: $("heroNote"),

    isActive: $("heroIsActive"),

    imageFile: $("heroImageFile"),
    imagePreview: $("heroImagePreview"),
    uploadPlaceholder: $("heroUploadPlaceholder"),
    uploadArea: $("heroUploadArea"),
    chooseImage: $("chooseHeroImage"),
    removeImage: $("removeHeroImage"),
    uploadMessage: $("heroUploadMessage"),

    positionX: $("imagePositionX"),
    positionY: $("imagePositionY"),
    overlay: $("overlayOpacity"),

    positionXValue: $("positionXValue"),
    positionYValue: $("positionYValue"),
    overlayValue: $("overlayValue"),

    descriptionCounter: $("descriptionCounter"),

    preview: $("heroLivePreview"),
    previewEyebrow: $("previewEyebrow"),
    previewHeading: $("previewHeading"),
    previewDescription: $("previewDescription"),
    previewPrimary: $("previewPrimaryButton"),
    previewSecondary: $("previewSecondaryButton"),
    previewNote: $("previewNote"),

    status: $("heroStatus"),
    statusText: $("heroStatusText"),

    saveButton: $("saveHeroButton"),
    resetButton: $("resetHeroButton"),

    toast: $("heroToast"),

    sidebar: $("adminSidebar"),
    menuButton: $("mobileMenuButton"),
    sidebarBackdrop: $("sidebarBackdrop"),
    logout: $("logoutButton")
};

let originalHero = null;
let currentImageUrl = "";
let selectedImage = null;
let temporaryImageUrl = null;
let isSaving = false;
let toastTimer = null;

const DEFAULT_HERO = {
    eyebrow: "A WORLD BENEATH THE SURFACE",
    heading: "Bring Nature Into Your Living Space.",
    description:
        "Discover extraordinary freshwater fish, thoughtfully selected aquarium essentials and everything you need to create your own underwater world.",
    primaryButtonText: "Explore Our Collection",
    primaryButtonUrl: "shop.html",
    secondaryButtonText: "Our Services",
    secondaryButtonUrl: "#services",
    heroNote: "INSPIRED BY NATURE. CREATED FOR AQUATIC LIFE.",
    imageUrl: "",
    imagePositionX: 50,
    imagePositionY: 48,
    overlayOpacity: 65,
    isActive: true
};


/* =====================================================
   ADMIN INFORMATION
===================================================== */

const adminEmail = sessionStorage.getItem(EMAIL_KEY);

if (adminEmail && elements.adminEmail) {
    elements.adminEmail.textContent = adminEmail;
}


/* =====================================================
   API HELPERS
===================================================== */

async function heroRequest(endpoint, options = {}) {
    const headers = {
        Accept: "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        window.location.replace("login.html");
        throw new Error("Your admin session has expired.");
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || `Request failed (${response.status}).`);
    }

    return result;
}


/* =====================================================
   TOAST
===================================================== */

function showToast(message, type = "success") {
    elements.toast.textContent = message;
    elements.toast.className = `hero-toast show ${type}`;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        elements.toast.className = "hero-toast";
    }, 3500);
}


/* =====================================================
   IMAGE URL
===================================================== */

function getImageUrl(imageUrl) {
    if (!imageUrl) return "";

    try {
        const url = new URL(imageUrl, "http://localhost:5000");

        if (
            url.origin !== "http://localhost:5000" &&
            url.origin !== window.location.origin
        ) {
            return "";
        }

        return url.href;
    } catch {
        return "";
    }
}


/* =====================================================
   LOAD HERO SETTINGS
===================================================== */

async function loadHero() {
    try {
        elements.statusText.textContent = "Loading settings...";

        const result = await heroRequest("/hero");

        if (!result.hero) {
            throw new Error("Hero settings were not returned by the server.");
        }

        originalHero = {
            ...DEFAULT_HERO,
            ...result.hero
        };

        currentImageUrl = originalHero.imageUrl || "";
        selectedImage = null;

        if (temporaryImageUrl) {
            URL.revokeObjectURL(temporaryImageUrl);
            temporaryImageUrl = null;
        }

        populateForm(originalHero);
        updatePreview();
        updateStatus();

    } catch (error) {
        console.error("Hero loading error:", error);
        showToast(error.message || "Could not load hero settings.", "error");
        elements.statusText.textContent = "Unable to load";
    }
}


/* =====================================================
   POPULATE FORM
===================================================== */

function populateForm(hero) {
    elements.eyebrow.value = hero.eyebrow || "";
    elements.heading.value = hero.heading || "";
    elements.description.value = hero.description || "";

    elements.primaryButtonText.value = hero.primaryButtonText || "";
    elements.primaryButtonUrl.value = hero.primaryButtonUrl || "";

    elements.secondaryButtonText.value = hero.secondaryButtonText || "";
    elements.secondaryButtonUrl.value = hero.secondaryButtonUrl || "";

    elements.heroNote.value = hero.heroNote || "";

    elements.isActive.checked = hero.isActive !== false;

    elements.positionX.value = hero.imagePositionX ?? 50;
    elements.positionY.value = hero.imagePositionY ?? 48;
    elements.overlay.value = hero.overlayOpacity ?? 65;

    elements.imageFile.value = "";

    updateImageDisplay();
    updateRangeLabels();
    updateDescriptionCounter();
}


/* =====================================================
   IMAGE DISPLAY
===================================================== */

function updateImageDisplay() {
    const imageUrl = selectedImage && temporaryImageUrl
        ? temporaryImageUrl
        : getImageUrl(currentImageUrl);

    if (imageUrl) {
        elements.imagePreview.src = imageUrl;
        elements.imagePreview.hidden = false;
        elements.uploadPlaceholder.hidden = true;
        elements.removeImage.hidden = false;
    } else {
        elements.imagePreview.removeAttribute("src");
        elements.imagePreview.hidden = true;
        elements.uploadPlaceholder.hidden = false;
        elements.removeImage.hidden = true;
    }
}


/* =====================================================
   IMAGE SELECTION
===================================================== */

elements.chooseImage.addEventListener("click", () => {
    elements.imageFile.click();
});

elements.uploadArea.addEventListener("click", (event) => {
    if (event.target.closest("img")) return;
    elements.imageFile.click();
});

elements.imageFile.addEventListener("change", () => {
    const file = elements.imageFile.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showToast("Please select a JPG, PNG or WebP image.", "error");
        elements.imageFile.value = "";
        return;
    }

    if (file.size > 8 * 1024 * 1024) {
        showToast("Image size must be 8 MB or smaller.", "error");
        elements.imageFile.value = "";
        return;
    }

    selectedImage = file;

    if (temporaryImageUrl) {
        URL.revokeObjectURL(temporaryImageUrl);
    }

    temporaryImageUrl = URL.createObjectURL(file);

    updateImageDisplay();
    updatePreview();

    elements.uploadMessage.textContent =
        `${file.name} selected. Save settings to upload this image.`;
});


/* =====================================================
   REMOVE SELECTED IMAGE
===================================================== */

elements.removeImage.addEventListener("click", () => {
    selectedImage = null;
    currentImageUrl = "";

    elements.imageFile.value = "";

    if (temporaryImageUrl) {
        URL.revokeObjectURL(temporaryImageUrl);
        temporaryImageUrl = null;
    }

    updateImageDisplay();
    updatePreview();

    elements.uploadMessage.textContent =
        "No image selected. The current homepage image will be removed after saving.";
});


/* =====================================================
   UPLOAD IMAGE
===================================================== */

async function uploadHeroImage() {
    if (!selectedImage) return null;

    const formData = new FormData();
    formData.append("image", selectedImage);

    const result = await heroRequest("/hero/image", {
        method: "POST",
        body: formData
    });

    if (!result.imageUrl) {
        throw new Error("The server did not return the uploaded image URL.");
    }

    currentImageUrl = result.imageUrl;
    selectedImage = null;

    elements.imageFile.value = "";

    if (temporaryImageUrl) {
        URL.revokeObjectURL(temporaryImageUrl);
        temporaryImageUrl = null;
    }

    updateImageDisplay();

    return result.imageUrl;
}


/* =====================================================
   FORM DATA
===================================================== */

function getFormData() {
    return {
        eyebrow: elements.eyebrow.value.trim(),
        heading: elements.heading.value.trim(),
        description: elements.description.value.trim(),

        primaryButtonText: elements.primaryButtonText.value.trim(),
        primaryButtonUrl: elements.primaryButtonUrl.value.trim(),

        secondaryButtonText: elements.secondaryButtonText.value.trim(),
        secondaryButtonUrl: elements.secondaryButtonUrl.value.trim(),

        heroNote: elements.heroNote.value.trim(),

        imagePositionX: Number(elements.positionX.value),
        imagePositionY: Number(elements.positionY.value),
        overlayOpacity: Number(elements.overlay.value),

        isActive: elements.isActive.checked
    };
}


/* =====================================================
   VALIDATION
===================================================== */

function isSafeDestination(value) {
    if (!value) return false;

    const trimmed = value.trim();

    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
        return false;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }

    return !trimmed.startsWith("//");
}

function validateForm(data) {
    if (!data.heading) {
        showToast("Please enter a main heading.", "error");
        elements.heading.focus();
        return false;
    }

    if (!data.description) {
        showToast("Please enter a description.", "error");
        elements.description.focus();
        return false;
    }

    if (data.primaryButtonText && !isSafeDestination(data.primaryButtonUrl)) {
        showToast("Enter a valid primary button destination.", "error");
        elements.primaryButtonUrl.focus();
        return false;
    }

    if (data.secondaryButtonText && !isSafeDestination(data.secondaryButtonUrl)) {
        showToast("Enter a valid secondary button destination.", "error");
        elements.secondaryButtonUrl.focus();
        return false;
    }

    return true;
}


/* =====================================================
   SAVE SETTINGS
===================================================== */

elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) return;

    const data = getFormData();

    if (!validateForm(data)) return;

    isSaving = true;
    elements.saveButton.disabled = true;
    elements.saveButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        // Upload first so the selected image is stored before settings save.
        await uploadHeroImage();

        // Empty imageUrl means remove the current hero background.
        data.imageUrl = currentImageUrl;

        const result = await heroRequest("/hero", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        originalHero = {
            ...DEFAULT_HERO,
            ...result.hero
        };

        currentImageUrl = originalHero.imageUrl || "";

        populateForm(originalHero);
        updatePreview();
        updateStatus();

        showToast("Homepage hero settings saved successfully.");

    } catch (error) {
        console.error("Hero save error:", error);
        showToast(error.message || "Could not save hero settings.", "error");

    } finally {
        isSaving = false;
        elements.saveButton.disabled = false;
        elements.saveButton.innerHTML =
            '<i class="fa-regular fa-floppy-disk"></i> Save hero settings';
    }
});


/* =====================================================
   RESET UNSAVED CHANGES
===================================================== */

elements.resetButton.addEventListener("click", () => {
    if (!originalHero) return;

    if (temporaryImageUrl) {
        URL.revokeObjectURL(temporaryImageUrl);
        temporaryImageUrl = null;
    }

    selectedImage = null;
    currentImageUrl = originalHero.imageUrl || "";

    populateForm(originalHero);
    updatePreview();

    elements.uploadMessage.textContent =
        "Recommended: wide landscape image, ideally 1920 × 900 px or larger.";

    showToast("Unsaved changes have been reset.");
});


/* =====================================================
   LIVE PREVIEW
===================================================== */

function updatePreview() {
    const data = getFormData();

    elements.previewEyebrow.textContent = data.eyebrow;
    elements.previewHeading.textContent = data.heading;
    elements.previewDescription.textContent = data.description;

    elements.previewPrimary.innerHTML = "";

    const primaryText = document.createTextNode(
        data.primaryButtonText || "Primary button"
    );

    const arrow = document.createElement("i");
    arrow.className = "fa-solid fa-arrow-right";

    elements.previewPrimary.append(primaryText, arrow);

    elements.previewSecondary.textContent =
        data.secondaryButtonText || "Secondary button";

    elements.previewNote.textContent = data.heroNote;

    const imageUrl = selectedImage && temporaryImageUrl
        ? temporaryImageUrl
        : getImageUrl(currentImageUrl);

    if (imageUrl) {
        elements.preview.style.setProperty(
            "--preview-image",
            `url("${imageUrl}")`
        );
    } else {
        elements.preview.style.setProperty("--preview-image", "none");
    }

    elements.preview.style.setProperty(
        "--preview-x",
        `${data.imagePositionX}%`
    );

    elements.preview.style.setProperty(
        "--preview-y",
        `${data.imagePositionY}%`
    );

    elements.preview.style.setProperty(
        "--preview-overlay",
        String(data.overlayOpacity / 100)
    );

    elements.preview.style.display = data.isActive ? "flex" : "none";
}


/* =====================================================
   RANGE CONTROLS
===================================================== */

function updateRangeLabels() {
    elements.positionXValue.textContent = `${elements.positionX.value}%`;
    elements.positionYValue.textContent = `${elements.positionY.value}%`;
    elements.overlayValue.textContent = `${elements.overlay.value}%`;
}

[
    elements.positionX,
    elements.positionY,
    elements.overlay
].forEach(input => {
    input.addEventListener("input", () => {
        updateRangeLabels();
        updatePreview();
    });
});


/* =====================================================
   DESCRIPTION COUNTER
===================================================== */

function updateDescriptionCounter() {
    elements.descriptionCounter.textContent =
        `${elements.description.value.length} / 500`;
}

elements.description.addEventListener("input", () => {
    updateDescriptionCounter();
    updatePreview();
});


/* =====================================================
   LIVE TEXT PREVIEW
===================================================== */

[
    elements.eyebrow,
    elements.heading,
    elements.primaryButtonText,
    elements.primaryButtonUrl,
    elements.secondaryButtonText,
    elements.secondaryButtonUrl,
    elements.heroNote
].forEach(input => {
    input.addEventListener("input", updatePreview);
});

elements.isActive.addEventListener("change", () => {
    updatePreview();
    updateStatus();
});


/* =====================================================
   STATUS
===================================================== */

function updateStatus() {
    const isActive = elements.isActive.checked;

    elements.status.classList.toggle("active", isActive);
    elements.status.classList.toggle("inactive", !isActive);

    elements.statusText.textContent = isActive
        ? "Hero is active"
        : "Hero is hidden";
}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

function openSidebar() {
    elements.sidebar.classList.add("open");
    elements.sidebarBackdrop.classList.add("show");
    elements.menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    elements.sidebar.classList.remove("open");
    elements.sidebarBackdrop.classList.remove("show");
    elements.menuButton.setAttribute("aria-expanded", "false");
}

elements.menuButton?.addEventListener("click", () => {
    const isOpen = elements.sidebar.classList.contains("open");

    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

elements.sidebarBackdrop?.addEventListener("click", closeSidebar);


/* =====================================================
   LOGOUT
===================================================== */

elements.logout?.addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    window.location.replace("login.html");
});


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    loadHero();
});