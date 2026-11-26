(() => {
  'use strict';
  const API = 'http://localhost:5000/api/v1';
  const CART_KEY = 'mizumi_cart';
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  let product = null;
  let quantity = 1;
  let activeImage = '';
  let gallery = [];
  let toastTimer;

  async function api(path) {
    const response = await fetch(`${API}${path}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }

  function setImage(src, index) {
    activeImage = src;
    const main = $('productMainImage');
    const placeholder = $('productImagePlaceholder');
    if (src) {
      main.src = src; main.alt = `${product?.name || 'Product'} photograph ${index + 1}`;
      main.hidden = false; placeholder.hidden = true; $('productImageZoom').hidden = false;
    } else {
      main.hidden = true; placeholder.hidden = false; $('productImageZoom').hidden = true;
    }
    document.querySelectorAll('.product-thumbnail').forEach((button, i) => button.classList.toggle('is-active', i === index));
  }

  function renderGallery() {
    const unique = [...new Set([product.image, ...(Array.isArray(product.gallery) ? product.gallery : [])].filter(Boolean))];
    gallery = unique;
    const target = $('productThumbnails');
    target.innerHTML = gallery.map((src, index) => `<button type="button" class="product-thumbnail ${index === 0 ? 'is-active' : ''}" data-gallery-index="${index}" aria-label="View photograph ${index + 1}"><img src="${esc(src)}" alt="${esc(product.name)} photograph ${index + 1}" loading="lazy"></button>`).join('');
    target.hidden = gallery.length <= 1;
    $('productImageZoom').hidden = !gallery.length;
    setImage(gallery[0] || '', 0);
  }

  function renderFacts() {
    const facts = [
      ['fa-ruler-combined', 'Available size', product.size],
      ['fa-seedling', 'Care level', product.specifications?.careLevel || product.care],
      ['fa-boxes-stacked', 'Category', product.subcategory || product.category],
      ['fa-fish', 'Stock', Number(product.stock) > 0 ? `${product.stock} available` : 'Currently unavailable']
    ].filter(item => item[2]);
    $('productQuickFacts').innerHTML = facts.map(([icon, label, value]) => `<div class="product-fact"><i class="fa-solid ${icon}"></i><div><span>${esc(label)}</span><strong>${esc(value)}</strong></div></div>`).join('');
  }

  function renderSpecifications() {
    const labels = {
      scientificName: 'Scientific name', origin: 'Origin', adultSize: 'Adult size', temperament: 'Temperament',
      diet: 'Diet', waterTemperature: 'Water temperature', phRange: 'pH range', minimumTankSize: 'Minimum tank size',
      careLevel: 'Care level', notes: 'Additional notes'
    };
    const specs = product.specifications || {};
    const rows = Object.entries(labels).filter(([key]) => String(specs[key] || '').trim());
    $('productSpecifications').innerHTML = rows.map(([key, label]) => `<div><dt>${esc(label)}</dt><dd>${esc(specs[key])}</dd></div>`).join('');
    $('productSpecifications').hidden = rows.length === 0;
    $('productSpecificationEmpty').hidden = rows.length !== 0;
  }

  function renderProduct() {
    document.title = `${product.name} | MIZUMI Aquatics`;
    $('breadcrumbProduct').textContent = product.name;
    $('productCategory').textContent = `${product.category || 'Aquatic'} / ${product.subcategory || 'Collection'}`;
    $('productName').textContent = product.name;
    $('productSku').textContent = product.sku ? `SKU: ${product.sku}` : '';
    $('productDescription').textContent = product.description || 'A carefully selected addition to your aquatic environment.';
    $('productLongDescription').textContent = product.description || 'Product information will be updated soon.';
    $('productPrice').textContent = money(product.price);
    const inStock = Number(product.stock) > 0;
    $('productAvailability').textContent = inStock ? 'Price shown in Indian Rupees' : 'Please contact us for availability';
    $('productStockPill').textContent = inStock ? 'In stock' : 'Unavailable';
    $('productStockPill').classList.toggle('is-sold', !inStock);
    $('productTag').textContent = product.tag || '';
    $('productTag').hidden = !product.tag;
    $('productAddToCart').disabled = !inStock;
    $('productAddToCart').innerHTML = inStock ? '<i class="fa-solid fa-bag-shopping"></i> Add to bag' : 'Currently unavailable';
    $('liveFishNote').hidden = !['fish','goldfish','cichlid'].includes(String(product.category).toLowerCase());
    renderGallery(); renderFacts(); renderSpecifications();
    $('productLoading').hidden = true; $('productError').hidden = true; $('productContent').hidden = false;
    loadRelated();
  }

  async function loadRelated() {
    if (!product?.category) return;
    try {
      const data = await api(`/products?category=${encodeURIComponent(product.category)}&limit=4&page=1`);
      const list = Array.isArray(data.products) ? data.products : (data.data?.products || []);
      const related = list.filter(item => String(item._id || item.id) !== String(product._id)).slice(0, 3);
      if (!related.length) return;
      $('relatedProducts').innerHTML = related.map(item => `<article class="related-product-card"><a href="product_view.html?id=${encodeURIComponent(item._id || item.id)}">${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">` : '<div class="related-placeholder"><i class="fa-solid fa-fish"></i></div>'}<div class="related-product-copy"><span>${esc(item.subcategory || item.category || 'Aquatic')}</span><h3>${esc(item.name)}</h3><strong>${money(item.price)}</strong></div></a></article>`).join('');
      $('relatedSection').hidden = false;
    } catch (error) { console.warn('Related products unavailable:', error.message); }
  }

  function readCart() { try { const data = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
  function updateCartBadge() { const count = readCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0); $('productCartCount').textContent = count; }
  function addToCart() {
    if (!product || Number(product.stock) <= 0) return;
    const cart = readCart();
    const id = String(product._id || product.id);
    const found = cart.find(item => String(item.productId || item.id) === id);
    if (found) found.quantity = Math.min(Number(product.stock) || 99, (Number(found.quantity) || 0) + quantity);
    else cart.push({ productId: id, sku: product.sku || '', name: product.name, price: Number(product.price) || 0, image: product.image || gallery[0] || '', quantity: Math.min(Number(product.stock) || 99, quantity), category: product.category || 'aquarium essentials' });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('mizumi:cart-updated', { detail: { cart } }));
    updateCartBadge(); showToast(`${product.name} added to your bag`);
  }
  function showToast(message) { $('productToastMessage').textContent = message; $('productToast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('productToast').classList.remove('show'), 3200); }
  function showError(message) { $('productLoading').hidden = true; $('productContent').hidden = true; $('productError').hidden = false; $('productErrorMessage').textContent = message; }

  async function init() {
    $('productCurrentYear').textContent = new Date().getFullYear(); updateCartBadge();
    const mobileToggle = $('productMobileToggle'); const navLinks = $('productNavLinks');
    mobileToggle.addEventListener('click', () => { const open = navLinks.classList.toggle('show'); mobileToggle.setAttribute('aria-expanded', String(open)); mobileToggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>'; });
    if (!productId) { showError('This product link is missing its product ID. Return to the shop and select a product.'); return; }
    try { const data = await api(`/products/${encodeURIComponent(productId)}`); product = data.product || data.data?.product || data.data; if (!product) throw new Error('Product details were not returned.'); renderProduct(); }
    catch (error) { console.error('Product detail loading error:', error); showError(error.message || 'Unable to load this product right now.'); }
  }

  document.addEventListener('click', event => {
    const thumb = event.target.closest('[data-gallery-index]');
    if (thumb) setImage(gallery[Number(thumb.dataset.galleryIndex)], Number(thumb.dataset.galleryIndex));
  });
  $('quantityMinus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); $('productQuantity').textContent = quantity; });
  $('quantityPlus').addEventListener('click', () => { quantity = Math.min(Math.max(1, Number(product?.stock) || 1), quantity + 1); $('productQuantity').textContent = quantity; });
  $('productAddToCart').addEventListener('click', addToCart);
  $('productImageZoom').addEventListener('click', () => { if (!activeImage) return; $('lightboxImage').src = activeImage; $('lightboxImage').alt = `${product.name} photograph`; $('productLightbox').hidden = false; });
  $('lightboxClose').addEventListener('click', () => { $('productLightbox').hidden = true; });
  $('productLightbox').addEventListener('click', event => { if (event.target === $('productLightbox')) $('productLightbox').hidden = true; });
  window.addEventListener('storage', event => { if (event.key === CART_KEY) updateCartBadge(); });
  window.addEventListener('mizumi:cart-updated', updateCartBadge);
  init();
})();
