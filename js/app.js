/* =========================================================
   Agri-Fishery Cooperative — Order & Inventory System
   js/app.js
   Scope: state + localStorage, tab navigation, product CRUD,
          order creation (cart), toast notifications.
   ========================================================= */
'use strict';

/* ---------- 1. Constants ---------- */
const STORAGE_KEYS = {
  products: 'coop_products',
  orders: 'coop_orders',
};
const LOW_STOCK_THRESHOLD = 20; // kg
const TOAST_DURATION = 3000;    // ms
const TOAST_EXIT_MS = 200;      // matches the toastOut animation in CSS
const VALID_CATEGORIES = ['Crop', 'Fishery'];

/* ---------- 2. State ---------- */
const loadFromStorage = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let products = loadFromStorage(STORAGE_KEYS.products);
let orders = loadFromStorage(STORAGE_KEYS.orders);
let cart = [];                // temporary, not persisted: { productId, name, price, qty, lineTotal }
let activeCategory = 'All';   // inventory filter

/** Sync the products and orders arrays back to localStorage. Returns true on success. */
const saveData = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    showToast('Could not save data. Browser storage may be full or disabled.', 'error');
    return false;
  }
};

/* ---------- 3. DOM references ---------- */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const els = {
  tabs: $$('.nav-tab'),
  views: $$('.view'),

  // Inventory
  productForm: $('#product-form'),
  productFormTitle: $('#product-form-title'),
  productId: $('#product-id'),
  productName: $('#product-name'),
  productCategory: $('#product-category'),
  productPrice: $('#product-price'),
  productStock: $('#product-stock'),
  productSubmitBtn: $('#product-submit-btn'),
  productCancelBtn: $('#product-cancel-btn'),
  chips: $$('.filter-bar .chip'),
  productsTbody: $('#products-tbody'),
  productsEmpty: $('#products-empty'),

  // Create order
  orderForm: $('#order-form'),
  buyerName: $('#buyer-name'),
  buyerContact: $('#buyer-contact'),
  orderDate: $('#order-date'),
  itemProduct: $('#item-product'),
  itemQty: $('#item-qty'),
  itemStockHint: $('#item-stock-hint'),
  itemError: $('#item-error'),
  lineTotal: $('#line-total'),
  addItemBtn: $('#add-item-btn'),
  cartTable: $('#cart-table'),
  cartTbody: $('#cart-tbody'),
  cartEmpty: $('#cart-empty'),
  grandTotal: $('#grand-total'),
  clearCartBtn: $('#clear-cart-btn'),

  // Misc
  toastContainer: $('#toast-container'),
  footerYear: $('#footer-year'),
};

/* ---------- 4. Utilities ---------- */
const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const formatCurrency = (value) => currencyFormatter.format(value);
const formatKg = (value) =>
  Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Avoid floating-point drift on money and weight values. */
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

const generateId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Today as YYYY-MM-DD in the user's LOCAL time (toISOString would shift the date across time zones). */
const todayISO = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/** Next sequential order number, e.g. ORD-0001. Based on the highest existing number so deletions never cause reuse. */
const generateOrderNumber = () => {
  const highest = orders.reduce((max, order) => {
    const match = /^ORD-(\d+)$/.exec(order.id ?? '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ORD-${String(highest + 1).padStart(4, '0')}`;
};

const findProduct = (id) => products.find((product) => product.id === id);
const sortByName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

const isProductInOrders = (productId) =>
  orders.some((order) => Array.isArray(order.items) && order.items.some((item) => item.productId === productId));

/* ---------- 5. Form error helpers ---------- */
const clearErrors = (form) => {
  $$('.form-error', form).forEach((el) => { el.textContent = ''; });
  $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
};

const setFieldError = (input, message) => {
  input.setAttribute('aria-invalid', 'true');
  const errorEl = document.getElementById(`${input.id}-error`);
  if (errorEl) errorEl.textContent = message;
};

const focusFirstInvalid = (form) => $('[aria-invalid="true"]', form)?.focus();

/* ---------- 6. Toast notifications ---------- */
const TOAST_ICONS = { success: '\u2713', error: '!', warning: '!', info: 'i' };

const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${TOAST_ICONS[type] ?? TOAST_ICONS.info}</span>
    <p class="toast__message"></p>
    <button type="button" class="toast__close" aria-label="Dismiss notification">&times;</button>
  `;
  $('.toast__message', toast).textContent = message; // textContent: message is never parsed as HTML

  let timerId;
  const removeToast = () => {
    clearTimeout(timerId);
    if (!toast.isConnected || toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), TOAST_EXIT_MS);
  };

  $('.toast__close', toast).addEventListener('click', removeToast);
  els.toastContainer.append(toast);
  timerId = setTimeout(removeToast, TOAST_DURATION);
};

/* ---------- 7. Tab navigation ---------- */
const switchView = (viewId) => {
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.view === viewId;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  els.views.forEach((view) => {
    const isActive = view.id === viewId;
    view.classList.toggle('is-active', isActive);
    view.hidden = !isActive;
  });
};

const initTabs = () => {
  els.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));

    // Arrow-key / Home / End navigation between tabs
    tab.addEventListener('keydown', (event) => {
      const targets = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: els.tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const nextTab = els.tabs[(targets[event.key] + els.tabs.length) % els.tabs.length];
      nextTab.focus();
      switchView(nextTab.dataset.view);
    });
  });
};

/* ---------- 8. Product management ---------- */
const stockBadge = (stock) => {
  if (stock <= 0) return '<span class="badge badge--low">Out of Stock</span>';
  if (stock < LOW_STOCK_THRESHOLD) return '<span class="badge badge--low">Low Stock</span>';
  return '<span class="badge badge--ok">In Stock</span>';
};

const renderProducts = () => {
  const visible = products
    .filter((product) => activeCategory === 'All' || product.category === activeCategory)
    .sort(sortByName);

  els.productsTbody.innerHTML = visible
    .map(({ id, name, category, price, stock }) => {
      const safeName = escapeHtml(name);
      return `
        <tr>
          <td data-label="Name">${safeName}</td>
          <td data-label="Category"><span class="badge badge--${category.toLowerCase()}">${escapeHtml(category)}</span></td>
          <td data-label="Price/kg" class="num">${formatCurrency(price)}</td>
          <td data-label="Stock (kg)" class="num">${formatKg(stock)}</td>
          <td data-label="Status">${stockBadge(stock)}</td>
          <td data-label="Actions" class="actions-col">
            <button type="button" class="btn btn--small btn--outline" data-action="edit" data-id="${id}" aria-label="Edit ${safeName}">Edit</button>
            <button type="button" class="btn btn--small btn--danger" data-action="delete" data-id="${id}" aria-label="Delete ${safeName}">Delete</button>
          </td>
        </tr>`;
    })
    .join('');

  const isEmpty = visible.length === 0;
  els.productsEmpty.hidden = !isEmpty;
  els.productsEmpty.textContent = products.length === 0
    ? 'No products yet. Add a product using the form.'
    : `No ${activeCategory} products found.`;
  els.productsTbody.closest('.table-wrap').hidden = isEmpty;
};

const setEditMode = (product = null) => {
  const isEditing = Boolean(product);
  els.productId.value = isEditing ? product.id : '';
  els.productFormTitle.textContent = isEditing ? 'Edit Product' : 'Add Product';
  els.productSubmitBtn.textContent = isEditing ? 'Update Product' : 'Save Product';
  els.productCancelBtn.textContent = isEditing ? 'Cancel Edit' : 'Cancel / Clear';
};

const startEditProduct = (id) => {
  const product = findProduct(id);
  if (!product) return;

  clearErrors(els.productForm);
  setEditMode(product);
  els.productName.value = product.name;
  els.productCategory.value = product.category;
  els.productPrice.value = product.price;
  els.productStock.value = product.stock;

  els.productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  els.productName.focus();
};

const handleProductSubmit = (event) => {
  event.preventDefault();
  clearErrors(els.productForm);

  const id = els.productId.value;
  const name = els.productName.value.trim();
  const category = els.productCategory.value;
  const price = parseFloat(els.productPrice.value);
  const stock = parseFloat(els.productStock.value);

  // --- Validation ---
  if (!name) {
    setFieldError(els.productName, 'Product name is required.');
  } else if (products.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
    setFieldError(els.productName, 'A product with this name already exists.');
  }

  if (!VALID_CATEGORIES.includes(category)) {
    setFieldError(els.productCategory, 'Please select a category.');
  }

  if (els.productPrice.value === '' || !Number.isFinite(price) || price <= 0) {
    setFieldError(els.productPrice, 'Enter a price greater than 0.');
  }

  if (els.productStock.value === '' || !Number.isFinite(stock) || stock < 0) {
    setFieldError(els.productStock, 'Enter a stock amount of 0 or more.');
  }

  if ($('[aria-invalid="true"]', els.productForm)) {
    focusFirstInvalid(els.productForm);
    return;
  }

  // --- Add or update ---
  const data = { name, category, price: round2(price), stock: round2(stock) };
  const existing = id ? findProduct(id) : null;

  if (existing) {
    Object.assign(existing, data);
  } else {
    products.push({ id: generateId('prd'), ...data });
  }

  if (!saveData()) return;

  els.productForm.reset(); // the reset handler leaves edit mode and clears errors
  syncCartWithProducts();
  renderProducts();
  renderProductOptions();
  renderCart();
  showToast(existing ? `"${name}" updated.` : `"${name}" added to inventory.`, 'success');
};

const deleteProduct = (id) => {
  const product = findProduct(id);
  if (!product) return;

  // Crucial rule: products that appear in any order cannot be deleted.
  if (isProductInOrders(id)) {
    showToast(`Cannot delete "${product.name}" because it is part of existing orders.`, 'error');
    return;
  }

  if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  const wasInCart = cart.some((item) => item.productId === id);
  products = products.filter((p) => p.id !== id);
  if (!saveData()) {
    products.push(product); // roll back if the save failed
    return;
  }

  if (els.productId.value === id) els.productForm.reset(); // was being edited
  syncCartWithProducts();
  renderProducts();
  renderProductOptions();
  renderCart();
  showToast(
    wasInCart
      ? `"${product.name}" deleted and removed from the current order.`
      : `"${product.name}" deleted.`,
    'success'
  );
};

const initProducts = () => {
  els.productForm.addEventListener('submit', handleProductSubmit);

  // Fires before the native reset; leave edit mode and clear leftovers.
  els.productForm.addEventListener('reset', () => {
    setEditMode(null);
    clearErrors(els.productForm);
  });

  els.chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.category;
      els.chips.forEach((c) => {
        const isActive = c === chip;
        c.classList.toggle('is-active', isActive);
        c.setAttribute('aria-pressed', String(isActive));
      });
      renderProducts();
    });
  });

  // Event delegation for Edit / Delete buttons
  els.productsTbody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'edit') startEditProduct(id);
    if (action === 'delete') deleteProduct(id);
  });
};

/* ---------- 9. Order creation ---------- */
const getCartQty = (productId) => cart.find((item) => item.productId === productId)?.qty ?? 0;
const getRemainingStock = (product) => round2(product.stock - getCartQty(product.id));

/** Keep cart rows consistent when products are edited or deleted. */
const syncCartWithProducts = () => {
  cart = cart.reduce((kept, item) => {
    const product = findProduct(item.productId);
    if (product) {
      kept.push({
        ...item,
        name: product.name,
        price: product.price,
        lineTotal: round2(product.price * item.qty),
      });
    }
    return kept;
  }, []);
};

const renderProductOptions = () => {
  const previous = els.itemProduct.value;
  const available = products.filter((product) => product.stock > 0).sort(sortByName);

  els.itemProduct.innerHTML =
    '<option value="" selected disabled>Select product</option>' +
    available
      .map(
        ({ id, name, category, price }) =>
          `<option value="${id}">${escapeHtml(name)} (${escapeHtml(category)}) \u2014 ${formatCurrency(price)}/kg</option>`
      )
      .join('');

  if (available.some((product) => product.id === previous)) els.itemProduct.value = previous;
  updateItemPreview();
};

/** Live line total + remaining-stock hint for the item currently being composed. */
const updateItemPreview = () => {
  const product = findProduct(els.itemProduct.value);
  const qty = parseFloat(els.itemQty.value);
  const total = product && Number.isFinite(qty) && qty > 0 ? round2(product.price * qty) : 0;

  els.lineTotal.textContent = formatCurrency(total);
  els.itemStockHint.textContent = product
    ? `${formatKg(getRemainingStock(product))} kg available`
    : '';
};

const setItemError = (message, input) => {
  clearItemError();
  els.itemError.textContent = message;
  if (input) {
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }
};

const clearItemError = () => {
  els.itemError.textContent = '';
  els.itemProduct.removeAttribute('aria-invalid');
  els.itemQty.removeAttribute('aria-invalid');
};

const getCartTotal = () => round2(cart.reduce((sum, item) => sum + item.lineTotal, 0));

const renderCart = () => {
  els.cartTbody.innerHTML = cart
    .map(
      ({ productId, name, price, qty, lineTotal }) => `
        <tr>
          <td data-label="Product">${escapeHtml(name)}</td>
          <td data-label="Price/kg" class="num">${formatCurrency(price)}</td>
          <td data-label="Qty (kg)" class="num">${formatKg(qty)}</td>
          <td data-label="Line Total" class="num">${formatCurrency(lineTotal)}</td>
          <td data-label="Remove" class="actions-col">
            <button type="button" class="btn btn--small btn--danger" data-action="remove-item" data-id="${productId}" aria-label="Remove ${escapeHtml(name)} from order">Remove</button>
          </td>
        </tr>`
    )
    .join('');

  const isEmpty = cart.length === 0;
  els.cartEmpty.hidden = !isEmpty;
  els.cartTable.closest('.table-wrap').hidden = isEmpty;
  els.grandTotal.textContent = formatCurrency(getCartTotal());
  updateItemPreview();
};

const handleAddItem = () => {
  clearItemError();

  const product = findProduct(els.itemProduct.value);
  const qty = round2(parseFloat(els.itemQty.value));

  if (!product) return setItemError('Please select a product.', els.itemProduct);
  if (!Number.isFinite(qty) || qty <= 0) {
    return setItemError('Enter a quantity greater than 0.', els.itemQty);
  }

  const remaining = getRemainingStock(product);
  if (qty > remaining) {
    return setItemError(
      `Only ${formatKg(remaining)} kg of ${product.name} is available.`,
      els.itemQty
    );
  }

  // Adding the same product again merges into the existing cart row.
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.qty = round2(existing.qty + qty);
    existing.lineTotal = round2(existing.price * existing.qty);
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      lineTotal: round2(product.price * qty),
    });
  }

  // Reset the item selector for the next entry
  els.itemProduct.selectedIndex = 0;
  els.itemQty.value = '';
  renderCart();
  els.itemProduct.focus();
};

const removeCartItem = (productId) => {
  cart = cart.filter((item) => item.productId !== productId);
  renderCart();
};

const clearCart = () => {
  if (cart.length === 0) return;
  cart = [];
  clearItemError();
  renderCart();
  showToast('Order items cleared.', 'info');
};

const isValidContact = (value) => {
  const digits = value.replace(/\D/g, '');
  return /^[+\d][\d\s\-()]*$/.test(value) && digits.length >= 7 && digits.length <= 15;
};

const handleOrderSubmit = (event) => {
  event.preventDefault();
  clearErrors(els.orderForm);

  const buyerName = els.buyerName.value.trim();
  const contact = els.buyerContact.value.trim();
  const orderDate = els.orderDate.value;

  if (!buyerName) setFieldError(els.buyerName, 'Buyer name is required.');

  if (!contact) {
    setFieldError(els.buyerContact, 'Contact number is required.');
  } else if (!isValidContact(contact)) {
    setFieldError(els.buyerContact, 'Enter a valid contact number (7\u201315 digits).');
  }

  if (!orderDate) setFieldError(els.orderDate, 'Order date is required.');

  if ($('[aria-invalid="true"]', els.orderForm)) {
    focusFirstInvalid(els.orderForm);
    showToast('Please fix the highlighted fields.', 'error');
    return;
  }

  if (cart.length === 0) {
    setItemError('Add at least one item to the order.', els.itemProduct);
    showToast('Add at least one item before submitting.', 'error');
    return;
  }

  // Re-check stock at submit time (products may have been edited since items were added).
  const problem = cart
    .map((item) => ({ item, product: findProduct(item.productId) }))
    .find(({ item, product }) => !product || item.qty > product.stock);
  if (problem) {
    const { item, product } = problem;
    showToast(
      product
        ? `Not enough stock for ${item.name}: only ${formatKg(product.stock)} kg available.`
        : `${item.name} is no longer in inventory.`,
      'error'
    );
    return;
  }

  const order = {
    id: generateOrderNumber(),
    buyerName,
    contact,
    orderDate,
    status: 'Pending',
    items: cart.map(({ productId, name, price, qty, lineTotal }) => ({
      productId, name, price, qty, lineTotal,
    })),
    total: getCartTotal(),
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  if (!saveData()) {
    orders.pop(); // roll back if the save failed
    return;
  }

  cart = [];
  els.orderForm.reset();
  els.orderDate.value = todayISO();
  renderCart();
  renderProductOptions();
  showToast(`Order ${order.id} for ${buyerName} submitted (${formatCurrency(order.total)}).`, 'success');
};

const initOrderForm = () => {
  els.orderDate.value = todayISO();

  els.itemProduct.addEventListener('change', () => {
    clearItemError();
    updateItemPreview();
  });
  els.itemQty.addEventListener('input', () => {
    clearItemError();
    updateItemPreview();
  });
  els.addItemBtn.addEventListener('click', handleAddItem);

  // Pressing Enter in the quantity field adds the item instead of submitting the whole order
  els.itemQty.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddItem();
    }
  });

  els.cartTbody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="remove-item"]');
    if (button) removeCartItem(button.dataset.id);
  });

  els.clearCartBtn.addEventListener('click', clearCart);
  els.orderForm.addEventListener('submit', handleOrderSubmit);
};

/* ---------- 10. Init ---------- */
const init = () => {
  if (els.footerYear) els.footerYear.textContent = new Date().getFullYear();

  initTabs();
  initProducts();
  initOrderForm();

  renderProducts();
  renderProductOptions();
  renderCart();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}