const API_BASE = window.location.origin;
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
});

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const brandFilter = document.getElementById('brandFilter');
const sortSelect = document.getElementById('sortSelect');
const cartPanel = document.getElementById('cartPanel');
const cartItemsEl = document.getElementById('cartItems');
const subtotalEl = document.getElementById('cartSubtotal');
const shippingEl = document.getElementById('shippingFee');
const totalEl = document.getElementById('cartTotal');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');

const btnViewProducts = document.getElementById('btn-view-products');
const btnViewCart = document.getElementById('btn-view-cart');
const btnCloseCart = document.getElementById('btn-close-cart');
const btnCheckout = document.getElementById('btn-checkout');
const btnCloseModal = document.getElementById('btn-close-modal');

const productTemplate = document.getElementById('productCardTemplate');
const cartItemTemplate = document.getElementById('cartItemTemplate');

let products = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('phoneStoreCart') || '[]');

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  products = await res.json();
  filteredProducts = products;
  renderBrandOptions(products);
  renderProducts(products);
}

function renderBrandOptions(list) {
  const brands = [...new Set(list.map((item) => item.brand))];
  brandFilter.innerHTML = '<option value="">Tất cả thương hiệu</option>' + brands.map((b) => `<option value="${b}">${b}</option>`).join('');
}

function renderProducts(list) {
  productGrid.innerHTML = '';
  list.forEach((product) => {
    const node = productTemplate.content.cloneNode(true);
    node.querySelector('.product-card__image').src = product.thumbnail;
    node.querySelector('h3').textContent = product.name;
    node.querySelector('.product-card__brand').textContent = product.brand;
    node.querySelector('.product-card__desc').textContent = product.description;
    node.querySelector('.price').textContent = currencyFormatter.format(product.price);
    node.querySelector('.rating').textContent = `★ ${product.rating}`;
    const badgeContainer = node.querySelector('.product-card__badges');
    badgeContainer.innerHTML = product.badges.map((badge) => `<span>${badge}</span>`).join('');
    const btn = node.querySelector('button');
    btn.addEventListener('click', () => addToCart(product));
    productGrid.appendChild(node);
  });
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      variant: product.variants[0],
      quantity: 1
    });
  }
  persistCart();
  renderCart();
  openCart();
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  cart.forEach((item) => {
    const node = cartItemTemplate.content.cloneNode(true);
    node.querySelector('.cart-item__name').textContent = item.name;
    node.querySelector('.cart-item__variant').textContent = item.variant;
    node.querySelector('.cart-item__quantity').textContent = `Số lượng: ${item.quantity}`;
    node.querySelector('.cart-item__price').textContent = currencyFormatter.format(item.quantity * item.price);

    node.querySelector('[data-action="decrease"]').addEventListener('click', () => updateQuantity(item.id, -1));
    node.querySelector('[data-action="increase"]').addEventListener('click', () => updateQuantity(item.id, 1));
    node.querySelector('[data-action="remove"]').addEventListener('click', () => removeItem(item.id));

    cartItemsEl.appendChild(node);
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 30000 : 0;
  const total = subtotal + shipping;

  subtotalEl.textContent = currencyFormatter.format(subtotal);
  shippingEl.textContent = currencyFormatter.format(shipping);
  totalEl.textContent = currencyFormatter.format(total);

  btnCheckout.disabled = cart.length === 0;
}

function updateQuantity(productId, delta) {
  cart = cart
    .map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    .filter((item) => item.quantity > 0);
  persistCart();
  renderCart();
}

function removeItem(productId) {
  cart = cart.filter((item) => item.id !== productId);
  persistCart();
  renderCart();
}

function persistCart() {
  localStorage.setItem('phoneStoreCart', JSON.stringify(cart));
}

function openCart() {
  cartPanel.classList.add('open');
}

function closeCart() {
  cartPanel.classList.remove('open');
}

function openModal() {
  checkoutModal.classList.add('show');
  checkoutModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  checkoutModal.classList.remove('show');
  checkoutModal.setAttribute('aria-hidden', 'true');
}

function applyFilters() {
  const keyword = searchInput.value.toLowerCase().trim();
  const brand = brandFilter.value;
  const sort = sortSelect.value;

  filteredProducts = products.filter((product) => {
    const matchesKeyword =
      product.name.toLowerCase().includes(keyword) ||
      product.brand.toLowerCase().includes(keyword) ||
      product.description.toLowerCase().includes(keyword);
    const matchesBrand = brand ? product.brand === brand : true;
    return matchesKeyword && matchesBrand;
  });

  switch (sort) {
    case 'price-asc':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      filteredProducts.sort((a, b) => b.rating - a.rating);
      break;
    default:
      break;
  }

  renderProducts(filteredProducts);
}

async function handleCheckout(event) {
  event.preventDefault();
  if (cart.length === 0) {
    alert('Giỏ hàng trống!');
    return;
  }

  const formData = new FormData(checkoutForm);
  const customer = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    note: formData.get('note')
  };
  const payment = {
    method: formData.get('paymentMethod')
  };

  try {
    await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, cart, payment })
    });

    if (!res.ok) {
      throw new Error('Không thể tạo đơn hàng');
    }

    const order = await res.json();
    alert(`Đặt hàng thành công! Mã đơn: ${order.id}`);
    cart = [];
    persistCart();
    renderCart();
    checkoutForm.reset();
    closeModal();
    closeCart();
  } catch (error) {
    console.error(error);
    alert('Có lỗi xảy ra. Vui lòng thử lại.');
  }
}

searchInput.addEventListener('input', applyFilters);
brandFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

btnViewProducts.addEventListener('click', () => {
  window.scrollTo({ top: productGrid.offsetTop - 80, behavior: 'smooth' });
});

btnViewCart.addEventListener('click', openCart);
btnCloseCart.addEventListener('click', closeCart);
btnCheckout.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
checkoutForm.addEventListener('submit', handleCheckout);

fetchProducts().then(renderCart);

