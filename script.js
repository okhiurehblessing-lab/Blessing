// ======= STORE & ADMIN DATA =======
let products = JSON.parse(localStorage.getItem('products')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {};
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];

// ======= ADMIN PANEL FUNCTIONS =======
function saveSettings() {
  settings.storeName = document.getElementById('admin-store-name').value;
  settings.mainColor = document.getElementById('admin-main-color').value;
  settings.buttonColor = document.getElementById('admin-button-color').value;
  settings.announcement = document.getElementById('admin-announcement').value;
  settings.adminEmail = document.getElementById('admin-email').value;
  settings.whatsapp = document.getElementById('whatsapp-number').value;
  settings.bankName = document.getElementById('bank-name').value;
  settings.accountName = document.getElementById('account-name').value;
  settings.accountNumber = document.getElementById('account-number').value;

  const logoFile = document.getElementById('admin-logo').files[0];
  if (logoFile) {
    const reader = new FileReader();
    reader.onload = () => {
      settings.logo = reader.result;
      localStorage.setItem('settings', JSON.stringify(settings));
      applySettings();
    };
    reader.readAsDataURL(logoFile);
  } else {
    localStorage.setItem('settings', JSON.stringify(settings));
    applySettings();
  }
}

function addProduct() {
  const name = document.getElementById('product-name').value;
  const original = Number(document.getElementById('product-original').value);
  const price = Number(document.getElementById('product-price').value);
  const colors = document.getElementById('product-colors').value.split('\n');
  const sizes = document.getElementById('product-sizes').value.split('\n');
  const imgFile = document.getElementById('product-image').files[0];

  if (!name || !price || !imgFile) return alert("Name, Price, and Image required!");

  const reader = new FileReader();
  reader.onload = () => {
    const product = { id: Date.now(), name, original, price, colors, sizes, img: reader.result };
    products.push(product);
    localStorage.setItem('products', JSON.stringify(products));
    displayProductsAdmin();
    displayProductsStore();
  };
  reader.readAsDataURL(imgFile);
}

function displayProductsAdmin() {
  const container = document.getElementById('existing-products');
  if (!container) return;
  container.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = `
      <strong>${p.name}</strong> | N${p.price} | Colors: ${p.colors.join(', ')} | Sizes: ${p.sizes.join(', ')}
      <button onclick="editProduct(${p.id})">Edit</button>
      <button onclick="deleteProduct(${p.id})">Delete</button>
    `;
    container.appendChild(div);
  });
}

function editProduct(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-original').value = p.original;
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-colors').value = p.colors.join('\n');
  document.getElementById('product-sizes').value = p.sizes.join('\n');
  deleteProduct(id);
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  localStorage.setItem('products', JSON.stringify(products));
  displayProductsAdmin();
  displayProductsStore();
}

function applySettings() {
  document.getElementById('store-name').textContent = settings.storeName || 'Your Store';
  document.getElementById('store-logo').style.backgroundImage = settings.logo ? `url(${settings.logo})` : '';
  document.body.style.setProperty('--main-color', settings.mainColor || '#FF5733');
  document.body.style.setProperty('--button-color', settings.buttonColor || '#33FF57');
  document.getElementById('whatsapp-icon').onclick = () => {
    window.open(`https://wa.me/${settings.whatsapp || ''}`);
  };
}

// ======= STORE FUNCTIONS =======
function displayProductsStore(filter = '') {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = '';
  products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.img}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>N${p.price}</p>
      `;
      card.onclick = () => openProductModal(p);
      grid.appendChild(card);
    });
}

function openProductModal(product) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <img src="${product.img}" alt="${product.name}">
      <h2>${product.name}</h2>
      <p>Price: N${product.price}</p>
      <p>Colors: ${product.colors.join(', ')}</p>
      <p>Sizes: ${product.sizes.join(', ')}</p>
      <input type="number" id="quantity" min="1" value="1">
      <button id="add-to-cart-btn">Add to Cart</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.close').onclick = () => modal.remove();
  modal.querySelector('#add-to-cart-btn').onclick = () => {
    addToCart(product.id, Number(modal.querySelector('#quantity').value));
    modal.remove();
  };
}

function addToCart(id, quantity) {
  const existing = cart.find(c => c.id === id);
  if (existing) existing.quantity += quantity;
  else cart.push({ id, quantity });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  document.getElementById('cart-count').textContent = cart.reduce((sum, c) => sum + c.quantity, 0);
}

function showCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = 'block';
  const itemsContainer = document.getElementById('cart-items');
  const totalContainer = document.getElementById('cart-total');
  itemsContainer.innerHTML = '';
  if (cart.length === 0) itemsContainer.textContent = 'No products in cart';
  else {
    let total = 0;
    cart.forEach(c => {
      const p = products.find(pr => pr.id === c.id);
      const div = document.createElement('div');
      div.innerHTML = `${p.name} x ${c.quantity} = N${p.price*c.quantity} 
      <button onclick="removeFromCart(${c.id})">Remove</button>`;
      itemsContainer.appendChild(div);
      total += p.price * c.quantity;
    });
    totalContainer.textContent = `Total: N${total}`;
  }
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  showCart();
  updateCartCount();
}

document.getElementById('cart-icon').onclick = showCart;
document.getElementById('close-cart').onclick = () => document.getElementById('cart-modal').style.display = 'none';
document.getElementById('search-bar').oninput = e => displayProductsStore(e.target.value);

displayProductsAdmin();
displayProductsStore();
applySettings();
updateCartCount();

// Save settings button
const saveBtn = document.getElementById('save-settings');
if (saveBtn) saveBtn.onclick = saveSettings;

// Add product button
const addProdBtn = document.getElementById('add-product');
if (addProdBtn) addProdBtn.onclick = addProduct;
