
/* =========================================================
   MIZUMI AQUATICS — DYNAMIC PRODUCT DETAILS
   Category-aware specifications and product gallery
========================================================= */

"use strict";

const PRODUCT_CONFIG = {
    apiBaseUrl: "http://localhost:5000/api/v1",
    currency: "INR",
    locale: "en-IN",
    cartKey: "mizumi_cart"
};

const PRODUCT_FIELDS = {
    fish: {
        title: "Fish care & specifications",
        eyebrow: "CARE GUIDE",
        fields: [
            ["scientificName", "Scientific name"],
            ["origin", "Origin"],
            ["size", "Size"],
            ["temperament", "Temperament"],
            ["diet", "Diet"],
            ["waterTemperature", "Water temperature"],
            ["phRange", "pH range"],
            ["minimumTankSize", "Minimum tank size"],
            ["careLevel", "Care level"]
        ]
    },
    plants: {
        title: "Plant specifications",
        eyebrow: "PLANT CARE GUIDE",
        fields: [
            ["scientificName", "Scientific name"],
            ["origin", "Origin"],
            ["growthRate", "Growth rate"],
            ["lightRequirement", "Light requirement"],
            ["co2Requirement", "CO₂ requirement"],
            ["placement", "Placement"],
            ["temperature", "Temperature"],
            ["phRange", "pH range"]
        ]
    },
    food: {
        title: "Food specifications",
        eyebrow: "FEEDING INFORMATION",
        fields: [
            ["brand", "Brand"],
            ["foodType", "Food type"],
            ["suitableSpecies", "Suitable species"],
            ["pelletSize", "Pellet size"],
            ["feedingInstructions", "Feeding instructions"],
            ["netWeight", "Net weight"],
            ["expiryInformation", "Expiry information"]
        ]
    },
    equipment: {
        title: "Equipment specifications",
        eyebrow: "PRODUCT DETAILS",
        fields: [
            ["brand", "Brand"],
            ["modelName", "Model name"],
            ["equipmentType", "Equipment type"],
            ["powerConsumption", "Power consumption"],
            ["voltage", "Voltage"],
            ["dimensions", "Dimensions"],
            ["compatibility", "Compatibility"]
        ]
    },
    hardscape: {
        title: "Hardscape specifications",
        eyebrow: "MATERIAL DETAILS",
        fields: [
            ["material", "Material"],
            ["typeName", "Type name"],
            ["weight", "Weight"],
            ["colour", "Colour"],
            ["suitableAquariumType", "Suitable aquarium type"]
        ]
    }
};

const $ = id => document.getElementById(id);

let currentProduct = null;
let productQuantity = 1;
let productImages = [];
let activeImageIndex = 0;

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

const money = value => new Intl.NumberFormat(
    PRODUCT_CONFIG.locale,
    {
        style: "currency",
        currency: PRODUCT_CONFIG.currency,
        maximumFractionDigits: 2
    }
).format(Number(value) || 0);

function isFish(product) {
    return ["fish", "cichlid", "goldfish"].includes(
        String(product.category || "").toLowerCase()
    );
}

function getCategoryName(category) {
    const names = {
        fish: "Freshwater Fish",
        cichlid: "Cichlids",
        goldfish: "Goldfish",
        plants: "Aquatic Plants",
        food: "Fish Food",
        equipment: "Aquarium Equipment",
        hardscape: "Aquarium Hardscape"
    };

    return names[category] || "MIZUMI Collection";
}

function getSpecificationTemplate(category) {
    return PRODUCT_FIELDS[
        isFish({ category }) ? "fish" : category
    ] || null;
}

/* ---------------- PRODUCT LOADING ---------------- */

async function loadProduct() {
    const params = new URLSearchParams(location.search);
    const productId = params.get("id");

    if (!productId) {
        throw new Error("No product ID was provided.");
    }

    const response = await fetch(
        `${PRODUCT_CONFIG.apiBaseUrl}/products/${encodeURIComponent(productId)}`,
        { headers: { Accept: "application/json" } }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success || !result.product) {
        throw new Error(result.message || "Product could not be found.");
    }

    currentProduct = result.product;

    renderProduct(currentProduct);
    loadRelatedProducts(currentProduct);
}

/* ---------------- PRODUCT RENDERING ---------------- */

function renderProduct(product) {
    const category = String(product.category || "").toLowerCase();
    const available = Number(product.stock) > 0;

    $("productContent").hidden = false;
    $("productLoading").hidden = true;
    $("productError").hidden = true;

    $("productName").textContent = product.name || "";
    $("breadcrumbProduct").textContent = product.name || "Product";
    $("productCategory").textContent = getCategoryName(category);
    $("productSku").textContent = product.sku
        ? `SKU: ${product.sku}`
        : "";

    $("productDescription").textContent =
        product.description || "Discover this selection from MIZUMI Aquatics.";

    $("productLongDescription").textContent =
        product.description || "Product information will be updated soon.";

    $("productPrice").textContent = money(product.price);

    $("productAvailability").textContent = available
        ? "Available to order"
        : "Currently unavailable";

    $("productStockPill").textContent = available
        ? "In stock"
        : "Out of stock";

    $("productStockPill").classList.toggle("is-unavailable", !available);

    // Product tag
    const tag = $("productTag");

    tag.textContent = product.tag || "";
    tag.hidden = !product.tag;

    // Fish-only note
    $("liveFishNote").hidden = !isFish(product);

    // Generic quick facts
    renderQuickFacts(product);

    // Category-specific specifications
    renderSpecifications(product);

    // Images and gallery
    renderGallery(product);

    // Quantity and cart
    productQuantity = 1;
    updateQuantity();

    $("productAddToCart").disabled = !available;
    $("productAddToCart").innerHTML = available
        ? '<i class="fa-solid fa-bag-shopping"></i> Add to bag'
        : "Currently unavailable";

    document.title = `${product.name} | MIZUMI Aquatics`;
}

/* ---------------- QUICK FACTS ---------------- */

function renderQuickFacts(product) {
    const facts = [];

    if (product.subcategory) {
        facts.push(["Category", product.subcategory]);
    }

    if (Number(product.stock) > 0) {
        facts.push(["Availability", "In stock"]);
    }

    $("productQuickFacts").innerHTML = facts.map(
        ([label, value]) => `
            <div class="product-quick-fact">
                <span>${escapeHTML(label)}</span>
                <strong>${escapeHTML(value)}</strong>
            </div>
        `
    ).join("");
}

/* ---------------- CATEGORY SPECIFICATIONS ---------------- */

function renderSpecifications(product) {
    const category = String(product.category || "").toLowerCase();
    const template = getSpecificationTemplate(category);

    const panel = document.querySelector(".product-specifications-panel");
    const heading = panel?.querySelector("h3");
    const list = $("productSpecifications");
    const empty = $("productSpecificationEmpty");

    if (!template) {
        if (heading) heading.textContent = "Product specifications";
        list.innerHTML = "";
        empty.hidden = false;
        return;
    }

    if (heading) heading.textContent = template.title;

    const specifications = product.specifications || {};

    const populatedFields = template.fields.filter(
        ([key]) => specifications[key] !== undefined &&
                   specifications[key] !== null &&
                   String(specifications[key]).trim() !== ""
    );

    list.innerHTML = populatedFields.map(([key, label]) => `
        <div class="product-specification-row">
            <dt>${escapeHTML(label)}</dt>
            <dd>${escapeHTML(specifications[key])}</dd>
        </div>
    `).join("");

    empty.hidden = populatedFields.length > 0;
}

/* ---------------- PRODUCT GALLERY ---------------- */

function renderGallery(product) {
    productImages = [
        product.image,
        ...(Array.isArray(product.gallery) ? product.gallery : [])
    ].filter(Boolean);

    activeImageIndex = 0;

    const mainImage = $("productMainImage");
    const placeholder = $("productImagePlaceholder");
    const thumbnails = $("productThumbnails");

    thumbnails.innerHTML = "";

    if (!productImages.length) {
        mainImage.hidden = true;
        $("productImageZoom").hidden = true;
        placeholder.hidden = false;
        return;
    }

    mainImage.hidden = false;
    placeholder.hidden = true;
    $("productImageZoom").hidden = false;

    productImages.forEach((image, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "product-thumbnail";
        button.classList.toggle("active", index === 0);
        button.setAttribute("aria-label", `View photograph ${index + 1}`);

        const img = document.createElement("img");
        img.src = image;
        img.alt = `${product.name} photograph ${index + 1}`;
        img.loading = "lazy";

        button.appendChild(img);

        button.addEventListener("click", () => {
            setActiveImage(index);
        });

        thumbnails.appendChild(button);
    });

    setActiveImage(0);
}

function setActiveImage(index) {
    if (!productImages[index]) return;

    activeImageIndex = index;

    $("productMainImage").src = productImages[index];
    $("productMainImage").alt = currentProduct.name;

    document.querySelectorAll(".product-thumbnail").forEach(
        (thumbnail, i) => thumbnail.classList.toggle("active", i === index)
    );
}

/* ---------------- QUANTITY ---------------- */

function updateQuantity() {
    $("productQuantity").textContent = productQuantity;
}

$("quantityMinus").addEventListener("click", () => {
    productQuantity = Math.max(1, productQuantity - 1);
    updateQuantity();
});

$("quantityPlus").addEventListener("click", () => {
    if (!currentProduct) return;

    const stock = Number(currentProduct.stock) || 0;

    if (productQuantity < stock) {
        productQuantity++;
        updateQuantity();
    }
});

/* ---------------- CART ---------------- */

function readCart() {
    try {
        const cart = JSON.parse(
            localStorage.getItem(PRODUCT_CONFIG.cartKey) || "[]"
        );

        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(
        PRODUCT_CONFIG.cartKey,
        JSON.stringify(cart)
    );
}

function renderCartCount() {
    const cart = readCart();

    $("productCartCount").textContent = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );
}

function addProductToCart() {
    if (!currentProduct || Number(currentProduct.stock) <= 0) return;

    const cart = readCart();

    const existing = cart.find(
        item => item.productId === currentProduct._id
    );

    const existingQuantity = existing
        ? Number(existing.quantity)
        : 0;

    if (existingQuantity + productQuantity > Number(currentProduct.stock)) {
        showToast("Requested quantity exceeds available stock.");
        return;
    }

    if (existing) {
        existing.quantity += productQuantity;
    } else {
        cart.push({
            productId: currentProduct._id,
            sku: currentProduct.sku,
            name: currentProduct.name,
            price: Number(currentProduct.price),
            image: currentProduct.image || "",
            quantity: productQuantity,
            category: currentProduct.category
        });
    }

    saveCart(cart);
    renderCartCount();
    showToast(`${currentProduct.name} added to your bag.`);
}

function showToast(message) {
    $("productToastMessage").textContent = message;
    $("productToast").classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        $("productToast").classList.remove("show");
    }, 2600);
}

$("productAddToCart").addEventListener("click", addProductToCart);

/* ---------------- LIGHTBOX ---------------- */

function openLightbox() {
    if (!productImages.length) return;

    $("lightboxImage").src = productImages[activeImageIndex];
    $("lightboxImage").alt = currentProduct.name;
    $("productLightbox").hidden = false;
}

function closeLightbox() {
    $("productLightbox").hidden = true;
}

$("productImageZoom").addEventListener("click", openLightbox);
$("lightboxClose").addEventListener("click", closeLightbox);

$("productLightbox").addEventListener("click", event => {
    if (event.target === $("productLightbox")) closeLightbox();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeLightbox();
});

/* ---------------- RELATED PRODUCTS ---------------- */

async function loadRelatedProducts(product) {
    try {
        const response = await fetch(
            `${PRODUCT_CONFIG.apiBaseUrl}/products?category=${encodeURIComponent(product.category)}&limit=5&sort=featured`
        );

        const result = await response.json();

        if (!response.ok || !result.success) return;

        const related = (result.products || [])
            .filter(item => item._id !== product._id)
            .slice(0, 4);

        if (!related.length) return;

        $("relatedProducts").innerHTML = related.map(item => `
            <article class="related-product-card">
                <a href="product_view.html?id=${encodeURIComponent(item._id)}">
                    <img
                        src="${escapeHTML(item.image || "")}"
                        alt="${escapeHTML(item.name)}"
                        loading="lazy"
                    >
                    <span>${escapeHTML(item.subcategory || getCategoryName(item.category))}</span>
                    <h3>${escapeHTML(item.name)}</h3>
                    <strong>${money(item.price)}</strong>
                </a>
            </article>
        `).join("");

        $("relatedSection").hidden = false;

    } catch (error) {
        console.warn("Related products could not be loaded:", error);
    }
}

/* ---------------- MOBILE NAVIGATION ---------------- */

$("productMobileToggle").addEventListener("click", () => {
    const links = $("productNavLinks");
    const open = links.classList.toggle("show");

    $("productMobileToggle").setAttribute(
        "aria-expanded",
        String(open)
    );
});

/* ---------------- INITIALIZATION ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
    $("productCurrentYear").textContent = new Date().getFullYear();

    renderCartCount();

    try {
        await loadProduct();
    } catch (error) {
        console.error("Product page error:", error);

        $("productLoading").hidden = true;
        $("productError").hidden = false;
        $("productErrorMessage").textContent = error.message;
    }
});
