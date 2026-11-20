/* MIZUMI AQUATICS — CART PAGE
   Reads and writes the exact mizumi_cart format used by shop.js.
   Frontend demonstration only: connect checkout to a trusted backend before accepting orders/payments.
*/
(() => {
  'use strict';
  const STORAGE_KEY = 'mizumi_cart';
  const CURRENCY = 'INR';
  const LOCALE = 'en-IN';
  const money = value => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(Number(value) || 0);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

  const els = {
    navCount: document.getElementById('cartNavCount'),
    countLabel: document.getElementById('cartItemCountLabel'),
    list: document.getElementById('cartItemsList'),
    subtotal: document.getElementById('cartSubtotal'),
    total: document.getElementById('cartEstimatedTotal'),
    checkout: document.getElementById('cartCheckoutBtn'),
    clear: document.getElementById('cartClearBtn'),
    layout: document.getElementById('cartLayout'),
    empty: document.getElementById('cartEmptyState'),
    liveNote: document.getElementById('cartLiveNote'),
    feedback: document.getElementById('cartFeedback')
  };

  let cart = readCart();
  let feedbackTimer;

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(item => ({
        productId: String(item.productId || item.id || ''),
        sku: String(item.sku || ''),
        name: String(item.name || 'Aquarium product'),
        price: Math.max(0, Number(item.price) || 0),
        image: String(item.image || ''),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        category: String(item.category || 'aquarium essentials')
      })).filter(item => item.productId);
    } catch (error) {
      console.warn('MIZUMI cart data could not be read:', error);
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('mizumi:cart-updated', { detail: { cart } }));
  }

  function showFeedback(message) {
    els.feedback.textContent = message;
    els.feedback.classList.add('is-visible');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => els.feedback.classList.remove('is-visible'), 2400);
  }

  function itemCount() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
  function subtotal() { return cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }

  function render() {
    const count = itemCount();
    const amount = subtotal();
    els.navCount.textContent = count;
    els.countLabel.textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
    els.subtotal.textContent = money(amount);
    // Shipping and taxes are intentionally not estimated until business rules are configured.
    els.total.textContent = money(amount);
    els.checkout.disabled = cart.length === 0;
    els.clear.disabled = cart.length === 0;
    els.clear.style.opacity = cart.length ? '1' : '.45';

    const isEmpty = cart.length === 0;
    els.layout.hidden = isEmpty;
    els.empty.hidden = !isEmpty;
    els.liveNote.hidden = isEmpty;

    if (isEmpty) {
      els.list.innerHTML = '';
      return;
    }

    els.list.innerHTML = cart.map(item => {
      const lineTotal = item.price * item.quantity;
      const image = item.image || 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=400&q=80';
      return `
        <article class="cart-item-row" data-cart-product="${escapeHTML(item.productId)}">
          <div class="cart-product-cell">
            <div class="cart-product-image"><img src="${escapeHTML(image)}" alt="${escapeHTML(item.name)}" loading="lazy"></div>
            <div class="cart-product-copy">
              <span class="cart-product-category">${escapeHTML(item.category)}</span>
              <h3>${escapeHTML(item.name)}</h3>
              <span class="cart-product-sku">${item.sku ? `SKU: ${escapeHTML(item.sku)}` : 'MIZUMI selection'}</span>
              <button class="cart-product-remove" type="button" data-cart-remove="${escapeHTML(item.productId)}">Remove</button>
            </div>
          </div>
          <div class="cart-item-price">${money(item.price)}</div>
          <div class="cart-quantity-control" aria-label="Quantity for ${escapeHTML(item.name)}">
            <button type="button" data-cart-quantity="${escapeHTML(item.productId)}" data-cart-delta="-1" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-quantity="${escapeHTML(item.productId)}" data-cart-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <div class="cart-item-total">${money(lineTotal)}</div>
        </article>`;
    }).join('');
  }

  function updateQuantity(productId, delta) {
    const item = cart.find(entry => entry.productId === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(entry => entry.productId !== productId);
    saveCart();
    render();
  }

  document.addEventListener('click', event => {
    const quantityButton = event.target.closest('[data-cart-quantity]');
    if (quantityButton) {
      updateQuantity(quantityButton.dataset.cartQuantity, Number(quantityButton.dataset.cartDelta));
      return;
    }
    const removeButton = event.target.closest('[data-cart-remove]');
    if (removeButton) {
      const item = cart.find(entry => entry.productId === removeButton.dataset.cartRemove);
      cart = cart.filter(entry => entry.productId !== removeButton.dataset.cartRemove);
      saveCart();
      render();
      showFeedback(item ? `${item.name} removed from your bag.` : 'Item removed.');
    }
  });

  els.clear.addEventListener('click', () => {
    if (!cart.length) return;
    cart = [];
    saveCart();
    render();
    showFeedback('Your shopping bag has been cleared.');
  });

  els.checkout.addEventListener('click', () => {
  if (!cart.length) return;

  window.location.href = 'checkout.html';
  });

  const mobileToggle = document.getElementById('cartMobileToggle');
  const navLinks = document.getElementById('cartNavLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      mobileToggle.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
  }

  // Keep this page in sync if another tab updates the shared bag.
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) { cart = readCart(); render(); }
  });
  window.addEventListener('mizumi:cart-updated', () => { cart = readCart(); render(); });
  document.getElementById('cartCurrentYear').textContent = new Date().getFullYear();
  render();
})();
