
// =====================================================
// MIZUMI AQUATICS — PRODUCT MANAGEMENT
// Express API + MongoDB
// =====================================================

const API_URL = "http://localhost:5000/api/v1";
const TOKEN_KEY = "mizumiAdminToken";
const EMAIL_KEY = "mizumiAdminEmail";
const PAGE_SIZE = 9;

const token = sessionStorage.getItem(TOKEN_KEY);

if (!token) {
    window.location.replace("login.html");
}


// =====================================================
// DOM ELEMENTS
// =====================================================

const elements = {
    adminEmail: document.getElementById("adminEmail"),

    total: document.getElementById("summaryTotal"),
    inStock: document.getElementById("summaryInStock"),
    outOfStock: document.getElementById("summaryOutOfStock"),

    search: document.getElementById("productSearch"),
    category: document.getElementById("categoryFilter"),
    availability: document.getElementById("availabilityFilter"),
    sort: document.getElementById("sortFilter"),

    resultCount: document.getElementById("productResultCount"),
    tableBody: document.getElementById("productTableBody"),
    emptyState: document.getElementById("emptyState"),

    paginationInfo: document.getElementById("paginationInfo"),
    previousPage: document.getElementById("previousPage"),
    nextPage: document.getElementById("nextPage"),
    currentPage: document.getElementById("currentPage"),

    addButton: document.getElementById("addProductButton"),
    emptyAddButton: document.getElementById("emptyAddButton"),

    modal: document.getElementById("productModal"),
    modalTitle: document.getElementById("productModalTitle"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    closeModal: document.getElementById("closeProductModal"),
    cancelForm: document.getElementById("cancelProductForm"),

    form: document.getElementById("productForm"),
    productId: document.getElementById("productId"),
    name: document.getElementById("productName"),
    sku: document.getElementById("productSKU"),
    categoryInput: document.getElementById("productCategory"),
    subcategory: document.getElementById("productSubcategory"),
    price: document.getElementById("productPrice"),
    stock: document.getElementById("productStock"),
    size: document.getElementById("productSize"),
    care: document.getElementById("productCare"),
    tag: document.getElementById("productTag"),
    image: document.getElementById("productImage"),
    description: document.getElementById("productDescription"),

    formMessage: document.getElementById("formMessage"),
    saveButton: document.getElementById("saveProductButton"),

    deleteModal: document.getElementById("deleteModal"),
    deleteBackdrop: document.getElementById("deleteBackdrop"),
    cancelDelete: document.getElementById("cancelDelete"),
    confirmDelete: document.getElementById("confirmDelete"),

    toast: document.getElementById("adminToast"),

    logout: document.getElementById("logoutButton"),
    sidebar: document.getElementById("adminSidebar"),
    menuButton: document.getElementById("mobileMenuButton"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),


    imageFile: document.getElementById("productImageFile"),
    imagePreview: document.getElementById("productImagePreview"),
    previewImg: document.getElementById("productPreviewImg"),
    removeImage: document.getElementById("removeProductImage"),
    galleryFiles: document.getElementById("productGalleryFiles"),
    galleryExisting: document.getElementById("productGalleryExisting"),
    gallerySelected: document.getElementById("productGallerySelected"),
    specifications: {
        scientificName: document.getElementById("specScientificName"),
        origin: document.getElementById("specOrigin"),
        adultSize: document.getElementById("specAdultSize"),
        temperament: document.getElementById("specTemperament"),
        diet: document.getElementById("specDiet"),
        waterTemperature: document.getElementById("specWaterTemperature"),
        phRange: document.getElementById("specPhRange"),
        minimumTankSize: document.getElementById("specMinimumTankSize"),
        careLevel: document.getElementById("specCareLevel"),
        notes: document.getElementById("specNotes")
    }
};


// =====================================================
// STATE
// =====================================================

const state = {
    page: 1,
    totalPages: 1,
    totalProducts: 0,
    products: [],
    search: "",
    category: "",
    availability: "",
    sort: "newest",
    deleteProductId: null,
    isSaving: false,
    isDeleting: false,
    currentGallery: []
};


// =====================================================
// ADMIN INFORMATION
// =====================================================

const adminEmail = sessionStorage.getItem(EMAIL_KEY);

if (adminEmail) {
    elements.adminEmail.textContent = adminEmail;
}


// =====================================================
// HELPERS
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


function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}


function generateSkuPreview(name, category) {
    if (!name || !category) return "";

    const words = name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) return "";

    let nameCode;

    if (words.length === 1) {
        nameCode = words[0].slice(0, 4);
    } else if (words.length === 2) {
        nameCode = words.map(word => word.slice(0, 2)).join("");
    } else {
        nameCode = words.map(word => word[0]).join("");
    }

    const categoryCodes = {
        fish: "FSH",
        goldfish: "GLD",
        cichlid: "CIC",
        plants: "PLT",
        equipment: "EQP",
        food: "FOD",
        hardscape: "HDS"
    };

    const categoryCode = categoryCodes[category.toLowerCase()];

    if (!categoryCode) return "";

    const now = new Date();
    const dateCode = [
        String(now.getDate()).padStart(2, "0"),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getFullYear()).slice(-2)
    ].join("");

    return `${nameCode}-${categoryCode}-${dateCode}-###`;
}



function showToast(message, type = "success") {
    elements.toast.textContent = message;
    elements.toast.className = `admin-toast show ${type}`;

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        elements.toast.className = "admin-toast";
    }, 3500);
}


function showFormMessage(message) {
    elements.formMessage.textContent = message;
    elements.formMessage.hidden = false;
}


function hideFormMessage() {
    elements.formMessage.textContent = "";
    elements.formMessage.hidden = true;
}

function showProductImagePreview(source) {
    if (!source) {
        elements.imagePreview.hidden = true;
        elements.previewImg.removeAttribute("src");
        return;
    }

    elements.previewImg.src = source;
    elements.imagePreview.hidden = false;
}

function uploadSelectedProductImage(productId) {
    const file = elements.imageFile.files[0];

    if (!file) {
        return Promise.resolve(null);
    }

    const formData = new FormData();
    formData.append("image", file);

    return fetch(
        `${API_URL}/products/${encodeURIComponent(productId)}/image`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        }
    ).then(async response => {
        let data = {};

        try {
            data = await response.json();
        } catch {
            throw new Error("The server returned an invalid image upload response.");
        }

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(EMAIL_KEY);
            window.location.replace("login.html");
            throw new Error("Your admin session has expired.");
        }

        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "Image upload failed.");
        }

        return data;
    });
}


async function uploadSelectedGalleryImages(productId) {
    const files = Array.from(elements.galleryFiles.files || []);
    if (!files.length) return null;

    const formData = new FormData();
    files.forEach(file => formData.append("images", file));

    const response = await fetch(`${API_URL}/products/${encodeURIComponent(productId)}/gallery`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
        window.location.replace("login.html");
        throw new Error("Your admin session has expired.");
    }
    if (!response.ok || data.success !== true) throw new Error(data.message || "Gallery upload failed.");
    return data;
}

function renderAdminGallery(images = []) {
    state.currentGallery = Array.isArray(images) ? images : [];
    elements.galleryExisting.innerHTML = "";
    state.currentGallery.forEach((url, index) => {
        const wrap = document.createElement("div");
        wrap.className = "product-gallery-thumb";
        const img = document.createElement("img");
        img.src = url;
        img.alt = `Product gallery image ${index + 1}`;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Remove image";
        button.addEventListener("click", () => removeGalleryImage(index));
        wrap.append(img, button);
        elements.galleryExisting.append(wrap);
    });
}

async function removeGalleryImage(index) {
    const productId = elements.productId.value;
    if (!productId || !window.confirm("Remove this gallery image?")) return;
    try {
        const data = await apiRequest(`/products/${encodeURIComponent(productId)}/gallery/${index}`, { method: "DELETE" });
        renderAdminGallery(data.gallery || []);
        showToast("Gallery image removed.");
    } catch (error) {
        showToast(error.message || "Unable to remove image.", "error");
    }
}

function setSpecificationFields(specifications = {}) {
    Object.entries(elements.specifications).forEach(([key, input]) => {
        input.value = specifications[key] || "";
    });
}

function renderSelectedGalleryPreviews(files) {
    elements.gallerySelected.innerHTML = "";
    files.forEach((file, index) => {
        const wrap = document.createElement("div");
        wrap.className = "product-gallery-thumb selected";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = `Selected gallery image ${index + 1}`;
        const caption = document.createElement("small");
        caption.textContent = file.name;
        wrap.append(img, caption);
        elements.gallerySelected.append(wrap);
    });
}

function setSaveLoading(loading) {
    state.isSaving = loading;
    elements.saveButton.disabled = loading;

    elements.saveButton.textContent = loading
        ? "Saving..."
        : "Save product";
}


function setDeleteLoading(loading) {
    state.isDeleting = loading;
    elements.confirmDelete.disabled = loading;

    elements.confirmDelete.textContent = loading
        ? "Deleting..."
        : "Delete product";
}


// =====================================================
// API REQUEST HANDLER
// =====================================================

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(options.body ? {
                "Content-Type": "application/json"
            } : {}),
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(EMAIL_KEY);

        window.location.replace("login.html");

        throw new Error("Your admin session has expired. Please log in again.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}


// =====================================================
// PRODUCT STATISTICS
// =====================================================

async function loadStatistics() {
    const [all, available, unavailable] = await Promise.all([
        apiRequest("/products?limit=1"),
        apiRequest("/products?availability=in-stock&limit=1"),
        apiRequest("/products?availability=out-of-stock&limit=1")
    ]);

    elements.total.textContent = all.totalProducts ?? 0;
    elements.inStock.textContent = available.totalProducts ?? 0;
    elements.outOfStock.textContent = unavailable.totalProducts ?? 0;
}


// =====================================================
// PRODUCT TABLE
// =====================================================

function renderProducts(products) {
    if (!products.length) {
        elements.tableBody.innerHTML = "";
        elements.emptyState.hidden = false;
        return;
    }

    elements.emptyState.hidden = true;

    elements.tableBody.innerHTML = products.map(product => {
        const stock = Number(product.stock) || 0;
        const available = stock > 0;

        return `
            <tr>
                <td>
                    <span class="catalogue-product-name">
                        ${escapeHTML(product.name)}
                    </span>

                    <span class="catalogue-product-category">
                        ${escapeHTML(product.subcategory)}
                    </span>
                </td>

                <td>
                    <span class="catalogue-sku">
                        ${escapeHTML(product.sku)}
                    </span>
                </td>

                <td>
                    <span class="catalogue-category">
                        ${escapeHTML(product.category)}
                    </span>
                </td>

                <td>
                    <span class="catalogue-price">
                        ${formatPrice(product.price)}
                    </span>
                </td>

                <td>
                    <span class="catalogue-stock">
                        ${stock}
                    </span>
                </td>

                <td>
                    <span class="catalogue-status ${available ? "" : "out"}">
                        ${available ? "In stock" : "Out of stock"}
                    </span>
                </td>

                <td>
                    <div class="catalogue-actions">

                        <button
                            type="button"
                            class="catalogue-action edit-product"
                            data-id="${escapeHTML(product._id)}"
                            aria-label="Edit ${escapeHTML(product.name)}"
                            title="Edit product"
                        >
                            ✎
                        </button>

                        <button
                            type="button"
                            class="catalogue-action delete delete-product"
                            data-id="${escapeHTML(product._id)}"
                            aria-label="Delete ${escapeHTML(product.name)}"
                            title="Delete product"
                        >
                            ×
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");
}


// =====================================================
// LOAD PRODUCT LIST
// =====================================================

async function loadProducts() {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="catalogue-loading">
                Loading your catalogue...
            </td>
        </tr>
    `;

    elements.emptyState.hidden = true;

    const params = new URLSearchParams({
        page: String(state.page),
        limit: String(PAGE_SIZE),
        sort: state.sort
    });

    if (state.search) {
        params.set("search", state.search);
    }

    if (state.category) {
        params.set("category", state.category);
    }

    if (state.availability) {
        params.set("availability", state.availability);
    }

    try {
        const data = await apiRequest(`/products?${params.toString()}`);

        state.products = data.products || [];
        state.totalProducts = data.totalProducts || 0;
        state.totalPages = data.totalPages || 1;
        state.page = data.currentPage || 1;

        renderProducts(state.products);
        updatePagination();

        elements.resultCount.textContent =
            `${state.totalProducts} product${state.totalProducts === 1 ? "" : "s"}`;

    } catch (error) {
        console.error("Product loading error:", error);

        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="catalogue-loading">
                    Unable to load products. Please try again.
                </td>
            </tr>
        `;

        elements.resultCount.textContent = "Unable to load products";
        showToast(error.message, "error");
    }
}


// =====================================================
// PAGINATION
// =====================================================

function updatePagination() {
    const start = state.totalProducts === 0
        ? 0
        : ((state.page - 1) * PAGE_SIZE) + 1;

    const end = Math.min(
        state.page * PAGE_SIZE,
        state.totalProducts
    );

    elements.paginationInfo.textContent =
        `Showing ${start}–${end} of ${state.totalProducts} products`;

    elements.currentPage.textContent = state.page;

    elements.previousPage.disabled = state.page <= 1;
    elements.nextPage.disabled = state.page >= state.totalPages;
}


// =====================================================
// PRODUCT FORM
// =====================================================


function openProductModal(product = null) {
    elements.form.reset();
    hideFormMessage();
    elements.imageFile.value = "";
    elements.galleryFiles.value = "";
    elements.gallerySelected.innerHTML = "";
    renderAdminGallery([]);
    setSpecificationFields({});
    showProductImagePreview(null);
    elements.productId.value = "";

    if (product) {
        elements.modalTitle.textContent = "Edit product";

        elements.productId.value = product._id;
        elements.name.value = product.name || "";
        elements.sku.value = product.sku || "";
        elements.categoryInput.value = product.category || "";
        elements.subcategory.value = product.subcategory || "";
        elements.price.value = product.price ?? "";
        elements.stock.value = product.stock ?? 0;
        elements.size.value = product.size || "";
        elements.care.value = product.care || "Beginner";
        elements.tag.value = product.tag || "";
        elements.image.value = product.image || "";
        showProductImagePreview(product.image || null);
        elements.description.value = product.description || "";
        renderAdminGallery(product.gallery || []);
        setSpecificationFields(product.specifications || {});

        elements.sku.readOnly = true;
        elements.sku.placeholder = "Existing SKU";
        elements.sku.title = "SKU cannot be changed.";
    } else {
        elements.modalTitle.textContent = "Add a product";

        elements.stock.value = 0;
        elements.care.value = "Beginner";

        elements.sku.value = "";
        elements.sku.readOnly = true;
        elements.sku.placeholder = "Generated automatically when saved";
        elements.sku.title = "SKU will be generated automatically.";
        
        updateSkuPreview();
    }

    elements.modal.classList.add("show");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    elements.name.focus();
}



function updateSkuPreview() {
    if (elements.productId.value) return;

    const preview = generateSkuPreview(
        elements.name.value.trim(),
        elements.categoryInput.value
    );

    elements.sku.value = "";
    elements.sku.placeholder = preview
        ? `${preview} (sequence assigned on save)`
        : "Generated automatically when saved";
}


function closeProductModal() {
    elements.modal.classList.remove("show");
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    elements.form.reset();
    hideFormMessage();
}


// =====================================================
// COLLECT AND VALIDATE FORM DATA
// =====================================================


function getProductFormData() {
    const priceValue = elements.price.value.trim();
    const stockValue = elements.stock.value.trim();

    if (priceValue === "" || stockValue === "") {
        throw new Error("Please provide both price and stock quantity.");
    }

    const price = Number(priceValue);
    const stock = Number(stockValue);

    if (!Number.isFinite(price) || price < 0) {
        throw new Error("Enter a valid non-negative price.");
    }

    if (!Number.isInteger(stock) || stock < 0) {
        throw new Error("Stock must be a non-negative whole number.");
    }

    const image = elements.image.value.trim();

    if (image) {
        let parsedImage;

        try {
            parsedImage = new URL(image);
        } catch {
            throw new Error("Please enter a valid image URL.");
        }

        if (!["http:", "https:"].includes(parsedImage.protocol)) {
            throw new Error("Image URL must use HTTP or HTTPS.");
        }
    }

    return {
        name: elements.name.value.trim(),
        category: elements.categoryInput.value,
        subcategory: elements.subcategory.value.trim(),
        price,
        stock,
        size: elements.size.value.trim(),
        care: elements.care.value,
        tag: elements.tag.value.trim(),
        image,
        description: elements.description.value.trim(),
        specifications: Object.fromEntries(
            Object.entries(elements.specifications).map(([key, input]) => [key, input.value.trim()])
        )
    };
}



// =====================================================
// CREATE / UPDATE PRODUCT
// =====================================================


async function saveProduct(event) {
    event.preventDefault();

    if (state.isSaving) return;

    hideFormMessage();

    let productData;

    try {
        productData = getProductFormData();
    } catch (error) {
        showFormMessage(error.message);
        return;
    }

    const productId = elements.productId.value;
    const isEditing = Boolean(productId);

    const endpoint = isEditing
        ? `/products/${encodeURIComponent(productId)}`
        : "/products";

    const method = isEditing ? "PUT" : "POST";

    setSaveLoading(true);

    try {
        const savedData = await apiRequest(endpoint, {
            method,
            body: JSON.stringify(productData)
        });

        const savedProductId =
            savedData.product?._id || productId;

        if (!savedProductId) {
            throw new Error(
                "Product was saved, but its ID was not returned."
            );
        }

        let imageUploadFailed = false;

        if (elements.imageFile.files.length > 0) {
            try {
                await uploadSelectedProductImage(savedProductId);
            } catch (imageError) {
                imageUploadFailed = true;
                console.error("Image upload error:", imageError);
            }
        }

        let galleryUploadFailed = false;
        if (elements.galleryFiles.files.length > 0) {
            try {
                await uploadSelectedGalleryImages(savedProductId);
            } catch (galleryError) {
                galleryUploadFailed = true;
                console.error("Gallery upload error:", galleryError);
            }
        }

        closeProductModal();

        if (imageUploadFailed || galleryUploadFailed) {
            showToast(
                "Product saved, but one or more photo uploads failed. Edit the product to try again.",
                "error"
            );
        } else {
            showToast(
                isEditing
                    ? "Product updated successfully."
                    : "Product added successfully."
            );
        }

        await Promise.all([
            loadProducts(),
            loadStatistics()
        ]);

    } catch (error) {
        console.error("Save product error:", error);
        showFormMessage(error.message);

    } finally {
        setSaveLoading(false);
    }
}



// =====================================================
// EDIT PRODUCT
// =====================================================

function editProduct(productId) {
    const product = state.products.find(
        item => String(item._id) === String(productId)
    );

    if (!product) {
        showToast("Product information not found. Refresh the page.", "error");
        return;
    }

    openProductModal(product);
}


// =====================================================
// DELETE PRODUCT
// =====================================================

function openDeleteModal(productId) {
    state.deleteProductId = productId;

    elements.deleteModal.classList.add("show");
    elements.deleteModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}


function closeDeleteModal() {
    state.deleteProductId = null;

    elements.deleteModal.classList.remove("show");
    elements.deleteModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}


async function deleteProduct() {
    if (!state.deleteProductId || state.isDeleting) return;

    setDeleteLoading(true);

    try {
        await apiRequest(
            `/products/${encodeURIComponent(state.deleteProductId)}`,
            { method: "DELETE" }
        );

        closeDeleteModal();

        // Move back one page if the last item on the page was removed
        if (state.products.length === 1 && state.page > 1) {
            state.page--;
        }

        showToast("Product removed from the active catalogue.");

        await Promise.all([
            loadProducts(),
            loadStatistics()
        ]);

    } catch (error) {
        console.error("Delete product error:", error);
        showToast(error.message, "error");

    } finally {
        setDeleteLoading(false);
    }
}


// =====================================================
// SEARCH AND FILTERS
// =====================================================

let searchTimer;

elements.search.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        state.search = elements.search.value.trim();
        state.page = 1;
        loadProducts();
    }, 350);
});


elements.category.addEventListener("change", () => {
    state.category = elements.category.value;
    state.page = 1;
    loadProducts();
});


elements.availability.addEventListener("change", () => {
    state.availability = elements.availability.value;
    state.page = 1;
    loadProducts();
});


elements.sort.addEventListener("change", () => {
    state.sort = elements.sort.value;
    state.page = 1;
    loadProducts();
});


// =====================================================
// PAGE NAVIGATION
// =====================================================

elements.previousPage.addEventListener("click", () => {
    if (state.page <= 1) return;

    state.page--;
    loadProducts();
});


elements.nextPage.addEventListener("click", () => {
    if (state.page >= state.totalPages) return;

    state.page++;
    loadProducts();
});


// =====================================================
// TABLE ACTIONS
// =====================================================

elements.tableBody.addEventListener("click", event => {
    const editButton = event.target.closest(".edit-product");
    const deleteButton = event.target.closest(".delete-product");

    if (editButton) {
        editProduct(editButton.dataset.id);
    }

    if (deleteButton) {
        openDeleteModal(deleteButton.dataset.id);
    }
});


// =====================================================
// MODAL EVENTS
// =====================================================

elements.addButton.addEventListener("click", () => {
    openProductModal();
});


elements.emptyAddButton.addEventListener("click", () => {
    openProductModal();
});


elements.closeModal.addEventListener("click", closeProductModal);
elements.cancelForm.addEventListener("click", closeProductModal);
elements.modalBackdrop.addEventListener("click", closeProductModal);
elements.name.addEventListener("input", updateSkuPreview);
elements.categoryInput.addEventListener("change", updateSkuPreview);

elements.imageFile.addEventListener("change", () => {
    const file = elements.imageFile.files[0];

    if (!file) {
        showProductImagePreview(elements.image.value);
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        elements.imageFile.value = "";
        showFormMessage("Choose a JPG, PNG or WEBP image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        elements.imageFile.value = "";
        showFormMessage("Image must be 5 MB or smaller.");
        return;
    }

    hideFormMessage();

    const previewUrl = URL.createObjectURL(file);
    showProductImagePreview(previewUrl);
});

elements.removeImage.addEventListener("click", () => {
    elements.imageFile.value = "";
    elements.image.value = "";
    showProductImagePreview(null);
});

elements.galleryFiles.addEventListener("change", () => {
    const files = Array.from(elements.galleryFiles.files || []);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (state.currentGallery.length + files.length > 8) {
        elements.galleryFiles.value = "";
        elements.gallerySelected.innerHTML = "";
        showFormMessage(`You can add only ${8 - state.currentGallery.length} more gallery image(s). Maximum is 8.`);
        return;
    }
    const invalid = files.find(file => !allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
        elements.galleryFiles.value = "";
        elements.gallerySelected.innerHTML = "";
        showFormMessage(!allowedTypes.includes(invalid.type) ? "Gallery images must be JPG, PNG or WEBP." : "Each gallery image must be 5 MB or smaller.");
        return;
    }
    hideFormMessage();
    renderSelectedGalleryPreviews(files);
});

elements.form.addEventListener("submit", saveProduct);


elements.cancelDelete.addEventListener("click", closeDeleteModal);
elements.deleteBackdrop.addEventListener("click", closeDeleteModal);
elements.confirmDelete.addEventListener("click", deleteProduct);


// Close open modal with Escape
document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (elements.modal.classList.contains("show")) {
        closeProductModal();
    }

    if (elements.deleteModal.classList.contains("show")) {
        closeDeleteModal();
    }

    closeSidebar();
});


// =====================================================
// MOBILE SIDEBAR
// =====================================================

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


elements.menuButton.addEventListener("click", () => {
    const isOpen = elements.sidebar.classList.contains("open");

    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
});


elements.sidebarBackdrop.addEventListener("click", closeSidebar);


// =====================================================
// LOGOUT
// =====================================================

elements.logout.addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);

    window.location.replace("login.html");
});


// =====================================================
// INITIALIZE
// =====================================================

async function initializeProductsPage() {
    try {
        await Promise.all([
            loadProducts(),
            loadStatistics()
        ]);
    } catch (error) {
        console.error("Product page initialization error:", error);
    }
}

initializeProductsPage();


