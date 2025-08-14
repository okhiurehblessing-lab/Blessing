/* =========================
   PERSISTED STATE (LocalStorage)
   ========================= */
const LS = {
  products: 'ms_products',           // [{id,name,price,original,colors[],sizes[],images[],desc,collections[]}]
  collections: 'ms_collections',     // {collectionName: [productId,...]}
  config: 'ms_config',               // {name, primaryColor, buttonColor, logoDataUrl}
  delivery: 'ms_delivery',           // {zones:[{name,fee}], otherFee}
  bank: 'ms_bank',                   // {bankName, accountName, accountNumber}
  comms: 'ms_comms',                 // {adminEmail, defaultCustomerEmail, whatsapp}
  announcements: 'ms_ann',           // string
  orders: 'ms_orders',               // [{id,items[],itemsTotal,shipFee,grandTotal,customer,shipping}]
  cart: 'ms_cart'                    // [{productId, name, price, original, color, size, image, qty}]
};

const getLS = (k,d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const setLS = (k,v) => localStorage.setItem(k, JSON.stringify(v));

/* Defaults */
let products = getLS(LS.products, []);
let collections = getLS(LS.collections, {});     // name -> productIds
let config = getLS(LS.config, { name:'MyStore', primaryColor:'#FF5722', buttonColor:'#FF9800', logoDataUrl:'assets/logo.png' });
let delivery = getLS(LS.delivery, { zones:[], otherFee:0 });
let bank = getLS(LS.bank, { bankName:'', accountName:'', accountNumber:'' });
let comms = getLS(LS.comms, { adminEmail:'', defaultCustomerEmail:'', whatsapp:'' });
let announcements = getLS(LS.announcements, '');
let orders = getLS(LS.orders, []);
let cart = getLS(LS.cart, []);

/* Utility: money */
const ₦ = n => '₦' + (Number(n)||0).toLocaleString();

/* =========================
   APPLY THEME ON LOAD (Store + Admin)
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.setProperty('--primary-color', config.primaryColor || '#FF5722');
  document.body.style.setProperty('--button-color', config.buttonColor || '#FF9800');

  const storeLogo = document.getElementById('store-logo');
  if (storeLogo) storeLogo.src = config.logoDataUrl || 'assets/logo.png';

  const storeName = document.getElementById('store-name');
  if (storeName) storeName.textContent = config.name || 'MyStore';

  const annBox = document.getElementById('announcements');
  if (annBox) annBox.textContent = announcements || '';

  const wa = document.getElementById('whatsapp-link');
  if (wa && comms.whatsapp) wa.href = `https://wa.me/${comms.whatsapp}`;

  /* Render relevant views */
  if (document.getElementById('products-grid')) {
    buildCollectionsFilter();
    renderStoreProducts();
    updateCartUI();
    wireStoreUI();
  }

  if (document.body.classList.contains('admin-body')) {
    wireAdminTabs();
    fillAdminForms();
    renderAdminProducts();
    renderCollectionsAdmin();
    renderOrdersAdmin();
    renderZonesList();
  }
});

/* =========================
   STORE: Rendering
   ========================= */
const productsGrid = document.getElementById('products-grid');
function renderStoreProducts() {
  if (!productsGrid) return;
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const colFilter = document.getElementById('collection-filter')?.value || 'all';

  let list = products.slice();
  if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || (p.desc||'').toLowerCase().includes(search));
  if (colFilter !== 'all') {
    const ids = collections[colFilter] || [];
    list = list.filter(p => ids.includes(p.id));
  }

  productsGrid.innerHTML = '';
  if (list.length === 0) {
    productsGrid.innerHTML = `<div class="empty">No products found.</div>`;
    return;
  }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const mainImg = (p.images && p.images[0]) || 'assets/product1.png';
    card.innerHTML = `
      <img src="${mainImg}" alt="${p.name}">
      <h3>${p.name}</h3>
      <div class="price">${₦(p.price)}</div>
      <button class="secondary-btn view-btn" data-id="${p.id}">View</button>
    `;
    productsGrid.appendChild(card);
  });
}

/* Build/Refresh collections filter dropdown on store */
function buildCollectionsFilter() {
  const sel = document.getElementById('collection-filter');
  if (!sel) return;
  sel.innerHTML = `<option value="all">All Collections</option>`;
  Object.keys(collections).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    sel.appendChild(opt);
  });
}

/* =========================
   STORE: Product Modal
   ========================= */
const productModal = document.getElementById('product-modal');
const pmMain = document.getElementById('pm-main');
const pmThumbs = document.getElementById('pm-thumbs');
const pmName = document.getElementById('pm-name');
const pmPrice = document.getElementById('pm-price');
const pmColorsWrap = document.querySelector('#pm-colors .options');
const pmSizesWrap = document.querySelector('#pm-sizes .options');
const pmQty = document.getElementById('pm-qty');
let currentProduct = null;

function openProductModal(pid) {
  currentProduct = products.find(p => p.id === pid);
  if (!currentProduct) return;

  // Images
  const imgs = currentProduct.images?.length ? currentProduct.images : ['assets/product1.png'];
  pmMain.src = imgs[0];
  pmThumbs.innerHTML = '';
  imgs.forEach((src, i) => {
    const t = document.createElement('img');
    t.src = src; t.className = 'thumb';
    t.onclick = () => pmMain.src = src;
    pmThumbs.appendChild(t);
  });

  // Basics
  pmName.textContent = currentProduct.name;
  pmPrice.textContent = ₦(currentProduct.price);
  pmQty.value = 1;

  // Options (not comma separated: proper selectable chips)
  pmColorsWrap.innerHTML = '';
  currentProduct.colors.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = c;
    b.onclick = () => selectOne(pmColorsWrap, b);
    pmColorsWrap.appendChild(b);
  });

  pmSizesWrap.innerHTML = '';
  currentProduct.sizes.forEach(s => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = s;
    b.onclick = () => selectOne(pmSizesWrap, b);
    pmSizesWrap.appendChild(b);
  });

  productModal.style.display = 'flex';
}
function selectOne(container, btn) {
  [...container.children].forEach(ch => ch.classList.remove('selected'));
  btn.classList.add('selected');
}
document.getElementById('pm-minus')?.addEventListener('click', ()=> {
  pmQty.value = Math.max(1, (parseInt(pmQty.value)||1)-1);
});
document.getElementById('pm-plus')?.addEventListener('click', ()=> {
  pmQty.value = (parseInt(pmQty.value)||1)+1;
});
document.getElementById('pm-add')?.addEventListener('click', ()=> {
  if (!currentProduct) return;
  const color = pmColorsWrap.querySelector('.selected')?.textContent || '';
  const size = pmSizesWrap.querySelector('.selected')?.textContent || '';
  const qty = Math.max(1, parseInt(pmQty.value)||1);
  const img = pmMain.src;

  // One line-item per unique (id+color+size)
  const key = (i)=> `${i.productId}|${i.color}|${i.size}`;
  const existing = cart.find(i => key(i) === `${currentProduct.id}|${color}|${size}`);
  if (existing) existing.qty += qty;
  else cart.push({
    productId: currentProduct.id,
    name: currentProduct.name,
    price: currentProduct.price,
    original: currentProduct.original||0,
    color, size, image: img, qty
  });
  setLS(LS.cart, cart);
  updateCartUI();
  productModal.style.display = 'none';
  openCart(); // show cart immediately (Bumpa vibe)
});

/* =========================
   STORE: Cart + Checkout
   ========================= */
const cartModal = document.getElementById('cart-modal');
const cartCount = document.getElementById('cart-count');
const cartItemsEl = document.getElementById('cart-items');
const itemsTotalEl = document.getElementById('items-total');
const shipMethod = document.getElementById('shipping-method');
const shipDetails = document.getElementById('shipping-details');
const shipState = document.getElementById('ship-state');
const lagosZoneRow = document.getElementById('lagos-zone-row');
const lagosZoneSel = document.getElementById('lagos-zone');
const otherFeeRow = document.getElementById('other-fee-row');
const otherFeeInput = document.getElementById('other-fee');
const shipFeeEl = document.getElementById('ship-fee');
const grandTotalEl = document.getElementById('grand-total');
const bankBox = document.getElementById('bank-box');

function updateCartUI() {
  cartCount.textContent = cart.reduce((s,i)=>s+i.qty,0);

  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = '';
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<div class="empty">Your cart is empty.</div>`;
  } else {
    cart.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img src="${it.image}" alt="${it.name}">
        <div class="ci-info">
          <div class="ci-name">${it.name}</div>
          <div class="ci-opts">${it.color?`Color: ${it.color}`:''} ${it.size?`| Size: ${it.size}`:''}</div>
          <div class="ci-price">${₦(it.price)} <span class="muted">x</span> ${it.qty}</div>
          <div class="qty-controls">
            <button data-act="minus" data-i="${idx}">−</button>
            <button data-act="plus" data-i="${idx}">+</button>
            <button data-act="remove" data-i="${idx}" class="danger">Remove</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(row);
    });
  }

  // Totals
  const itemsTotal = cart.reduce((s,i)=> s + (i.price*i.qty), 0);
  itemsTotalEl.textContent = ₦(itemsTotal);

  // Build Lagos zones select
  if (lagosZoneSel) {
    lagosZoneSel.innerHTML = '';
    delivery.zones.forEach(z=>{
      const o = document.createElement('option');
      o.value = z.name;
      o.textContent = `${z.name} (${₦(z.fee)})`;
      lagosZoneSel.appendChild(o);
    });
  }
  if (otherFeeInput) otherFeeInput.value = delivery.otherFee||0;

  const shipFee = calcShipFee();
  shipFeeEl.textContent = ₦(shipFee);
  grandTotalEl.textContent = ₦(itemsTotal + shipFee);

  // Bank box
  if (bankBox) {
    if (bank.bankName && bank.accountName && bank.accountNumber) {
      bankBox.innerHTML = `
        <h4>Pay to:</h4>
        <div><strong>${bank.bankName}</strong></div>
        <div>${bank.accountName}</div>
        <div>${bank.accountNumber}</div>
      `;
      bankBox.classList.remove('hidden');
    } else {
      bankBox.classList.add('hidden');
      bankBox.innerHTML = '';
    }
  }
}

function calcShipFee(){
  if (!shipMethod || shipMethod.value === 'pickup') return 0;
  if (shipState?.value === 'Lagos') {
    const selName = lagosZoneSel?.value;
    const z = delivery.zones.find(z=>z.name===selName);
    return z ? Number(z.fee)||0 : 0;
  } else {
    return Number(delivery.otherFee)||0;
  }
}

function openCart(){ cartModal.style.display = 'flex'; }
function closeCart(){ cartModal.style.display = 'none'; }

/* Wire store UI */
function wireStoreUI(){
  // search + filter
  document.getElementById('search-input')?.addEventListener('input', renderStoreProducts);
  document.getElementById('collection-filter')?.addEventListener('change', renderStoreProducts);

  // open product modal
  document.getElementById('products-grid')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.view-btn');
    if (btn) openProductModal(btn.dataset.id);
  });

  // cart open/close
  document.getElementById('cart-btn')?.addEventListener('click', ()=>{
    updateCartUI();
    openCart();
  });
  document.querySelectorAll('.close').forEach(x=>{
    x.addEventListener('click', ()=>{
      const mid = x.getAttribute('data-close');
      document.getElementById(mid).style.display='none';
    });
  });
  window.addEventListener('click', (e)=>{
    if (e.target === productModal) productModal.style.display='none';
    if (e.target === cartModal) cartModal.style.display='none';
  });

  // quantity controls in cart
  cartItemsEl?.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if (!b) return;
    const i = parseInt(b.dataset.i);
    if (b.dataset.act === 'plus') cart[i].qty++;
    if (b.dataset.act === 'minus') cart[i].qty = Math.max(1, cart[i].qty-1);
    if (b.dataset.act === 'remove') cart.splice(i,1);
    setLS(LS.cart, cart);
    updateCartUI();
  });

  // shipping toggles
  shipMethod?.addEventListener('change',()=>{
    if (shipMethod.value === 'delivery') {
      shipDetails.classList.remove('hidden');
    } else {
      shipDetails.classList.add('hidden');
    }
    updateCartUI();
  });
  shipState?.addEventListener('change',()=>{
    if (shipState.value === 'Lagos') {
      lagosZoneRow.classList.remove('hidden');
      otherFeeRow.classList.add('hidden');
    } else {
      lagosZoneRow.classList.add('hidden');
      otherFeeRow.classList.remove('hidden');
    }
    updateCartUI();
  });
  lagosZoneSel?.addEventListener('change', updateCartUI);

  // checkout form
  document.getElementById('checkout-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    if (cart.length===0) { alert('Your cart is empty'); return; }

    const itemsTotal = cart.reduce((s,i)=> s + (i.price*i.qty), 0);
    const shipping = {
      method: shipMethod.value,
      state: shipMethod.value==='delivery' ? shipState.value : 'Pickup',
      zone: shipMethod.value==='delivery' && shipState.value==='Lagos' ? lagosZoneSel.value : '',
      address: shipMethod.value==='delivery' ? (document.getElementById('ship-address').value || '') : '',
      fee: calcShipFee()
    };
    const grandTotal = itemsTotal + shipping.fee;

    const customer = {
      name: document.getElementById('cust-name').value,
      email: document.getElementById('cust-email').value,
      phone: document.getElementById('cust-phone').value
    };

    // Save order
    const order = {
      id: 'ORD-' + Date.now(),
      items: cart.slice(),
      itemsTotal, shipFee: shipping.fee, grandTotal,
      customer, shipping,
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    setLS(LS.orders, orders);

    // EmailJS: notify admin + customer
    const payload = {
      order_id: order.id,
      items: JSON.stringify(order.items),
      items_total: ₦(itemsTotal),
      shipping_fee: ₦(shipping.fee),
      grand_total: ₦(grandTotal),
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_method: shipping.method,
      shipping_state: shipping.state,
      shipping_zone: shipping.zone,
      shipping_address: shipping.address
    };
    if (comms.adminEmail) {
      emailjs.send('service_opcf6cl','template_4zrsdni', {...payload, to_email: comms.adminEmail}, 'RN5H1CcY7Fqkakg5w');
    }
    const custEmail = customer.email || comms.defaultCustomerEmail;
    if (custEmail) {
      emailjs.send('service_opcf6cl','template_zc87bdl', {...payload, to_email: custEmail}, 'RN5H1CcY7Fqkakg5w');
    }

    alert('Order placed! You will receive an email shortly.');
    cart = [];
    setLS(LS.cart, cart);
    updateCartUI();
    closeCart();
  });
}

/* =========================
   ADMIN: Tabs & Forms
   ========================= */
function wireAdminTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden'));
      document.getElementById(id).classList.remove('hidden');
    });
  });

  // Product save/reset
  document.getElementById('save-product').addEventListener('click', saveOrUpdateProduct);
  document.getElementById('reset-product').addEventListener('click', resetProductForm);

  // Collections
  document.getElementById('create-collection').addEventListener('click', createCollection);

  // Customize
  document.getElementById('save-customize').addEventListener('click', saveCustomize);

  // Delivery
  document.getElementById('add-zone').addEventListener('click', addZone);
  document.getElementById('save-delivery').addEventListener('click', saveDelivery);

  // Bank
  document.getElementById('save-bank').addEventListener('click', saveBank);

  // Comms
  document.getElementById('save-comm').addEventListener('click', saveComms);

  // Announcements
  document.getElementById('save-ann').addEventListener('click', saveAnnouncements);
}

function fillAdminForms(){
  // Customize
  document.getElementById('store-name-input').value = config.name || 'MyStore';
  document.getElementById('primary-color').value = config.primaryColor || '#FF5722';
  document.getElementById('button-color').value = config.buttonColor || '#FF9800';

  // Delivery
  document.getElementById('other-states-fee').value = delivery.otherFee || 0;

  // Bank
  document.getElementById('bank-name').value = bank.bankName || '';
  document.getElementById('account-name').value = bank.accountName || '';
  document.getElementById('account-number').value = bank.accountNumber || '';

  // Comms
  document.getElementById('admin-email').value = comms.adminEmail || '';
  document.getElementById('customer-email').value = comms.defaultCustomerEmail || '';
  document.getElementById('whatsapp-number').value = comms.whatsapp || '';

  // Announcements
  document.getElementById('ann-text').value = announcements || '';
}

/* PRODUCTS CRUD */
let editBuffer = null; // hold product being edited (id or null)

function saveOrUpdateProduct(){
  const name = document.getElementById('p-name').value.trim();
  const price = Number(document.getElementById('p-price').value);
  const original = Number(document.getElementById('p-original').value)||0;
  const colors = document.getElementById('p-colors').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const sizes = document.getElementById('p-sizes').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const desc = document.getElementById('p-desc').value.trim();
  const files = document.getElementById('p-images').files;

  if (!name || !price) return alert('Name and selling price are required');

  const saveProduct = (images) => {
    if (editBuffer) {
      // update existing
      const idx = products.findIndex(p=>p.id===editBuffer);
      if (idx>-1) {
        products[idx] = {...products[idx], name, price, original, colors, sizes, desc, images: images.length?images:products[idx].images};
      }
      editBuffer = null;
      document.getElementById('edit-hint').classList.add('hidden');
    } else {
      const id = 'P' + Date.now();
      products.push({id, name, price, original, colors, sizes, images: images.length?images:['assets/product1.png'], desc, collections:[]});
    }
    setLS(LS.products, products);
    renderAdminProducts();
    renderStoreProducts();
    resetProductForm();
    alert('Saved!');
  };

  if (files.length) {
    // read multiple images to data URLs
    const readers = [];
    const images = [];
    for (let f of files) {
      readers.push(new Promise(res=>{
        const r = new FileReader();
        r.onload = ()=>{ images.push(r.result); res(); };
        r.readAsDataURL(f);
      }));
    }
    Promise.all(readers).then(()=> saveProduct(images));
  } else {
    saveProduct([]);
  }
}

function resetProductForm(){
  ['p-name','p-price','p-original','p-colors','p-sizes','p-desc','p-images'].forEach(id=>{
    const el = document.getElementById(id);
    if (el.type==='file') el.value = '';
    else el.value = '';
  });
}

function renderAdminProducts(){
  const box = document.getElementById('admin-products-list');
  if (!box) return;
  box.innerHTML = '';
  if (!products.length) { box.innerHTML = '<div class="empty">No products yet.</div>'; return; }

  products.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <img src="${(p.images&&p.images[0])||'assets/product1.png'}" alt="${p.name}">
      <div class="ai-main">
        <div class="ai-title">${p.name}</div>
        <div>${₦(p.price)} <span class="muted">| Original:</span> ${₦(p.original||0)}</div>
        <div class="muted">${(p.collections||[]).join(', ')}</div>
      </div>
      <div class="ai-actions">
        <button data-edit="${p.id}">Edit</button>
        <button data-del="${p.id}" class="danger">Delete</button>
      </div>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-edit');
      const p = products.find(x=>x.id===id);
      if (!p) return;
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-price').value = p.price;
      document.getElementById('p-original').value = p.original||0;
      document.getElementById('p-colors').value = p.colors.join('\n');
      document.getElementById('p-sizes').value = p.sizes.join('\n');
      document.getElementById('p-desc').value = p.desc||'';
      editBuffer = id;
      document.getElementById('edit-hint').classList.remove('hidden');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  box.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-del');
      if (!confirm('Delete this product?')) return;
      products = products.filter(p=>p.id!==id);
      // remove from collections
      Object.keys(collections).forEach(c=>{
        collections[c] = (collections[c]||[]).filter(pid=>pid!==id);
        if (!collections[c].length) delete collections[c];
      });
      setLS(LS.products, products);
      setLS(LS.collections, collections);
      renderAdminProducts();
      renderCollectionsAdmin();
      renderStoreProducts();
    });
  });
}

/* COLLECTIONS */
function createCollection(){
  const name = (document.getElementById('new-collection-name').value||'').trim();
  if (!name) return alert('Type a collection name');
  if (!collections[name]) collections[name] = [];
  setLS(LS.collections, collections);
  document.getElementById('new-collection-name').value = '';
  renderCollectionsAdmin();
  buildCollectionsFilter(); // store dropdown
}

function renderCollectionsAdmin(){
  const wrap = document.getElementById('collections-wrapper');
  if (!wrap) return;
  wrap.innerHTML = '';
  const names = Object.keys(collections).sort();
  if (!names.length) {
    wrap.innerHTML = '<div class="empty">No collections yet. Create one above.</div>';
    return;
  }
  names.forEach(name=>{
    const sec = document.createElement('div');
    sec.className = 'collection-block';
    sec.innerHTML = `<h3>${name}</h3><div class="collection-grid" data-col="${name}"></div>`;
    wrap.appendChild(sec);
    const grid = sec.querySelector('.collection-grid');

    products.forEach(p=>{
      const id = `col-${name}-${p.id}`;
      const checked = (collections[name]||[]).includes(p.id) ? 'checked' : '';
      const item = document.createElement('label');
      item.className = 'collection-item';
      item.innerHTML = `
        <input type="checkbox" id="${id}" data-col="${name}" data-pid="${p.id}" ${checked}>
        <img src="${(p.images&&p.images[0])||'assets/product1.png'}" alt="${p.name}">
        <span>${p.name}</span>
      `;
      grid.appendChild(item);
    });

    grid.addEventListener('change', (e)=>{
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      const col = cb.getAttribute('data-col');
      const pid = cb.getAttribute('data-pid');
      const arr = collections[col] || [];
      if (cb.checked) {
        if (!arr.includes(pid)) arr.push(pid);
      } else {
        const i = arr.indexOf(pid);
        if (i>-1) arr.splice(i,1);
      }
      collections[col] = arr;
      // attach collections to product for admin list display
      products = products.map(p=> p.id===pid ? {...p, collections: Object.keys(collections).filter(c=> (collections[c]||[]).includes(pid))} : p);
      setLS(LS.collections, collections);
      setLS(LS.products, products);
      renderAdminProducts();
      buildCollectionsFilter();
      renderStoreProducts();
    });
  });
}

/* CUSTOMIZATION */
function saveCustomize(){
  config.name = document.getElementById('store-name-input').value || 'MyStore';
  config.primaryColor = document.getElementById('primary-color').value || '#FF5722';
  config.buttonColor = document.getElementById('button-color').value || '#FF9800';

  const file = document.getElementById('logo-upload').files[0];
  if (file){
    const r = new FileReader();
    r.onload = ()=> {
      config.logoDataUrl = r.result;
      setLS(LS.config, config);
      applyConfig();
      alert('Customization saved!');
    };
    r.readAsDataURL(file);
  } else {
    setLS(LS.config, config);
    applyConfig();
    alert('Customization saved!');
  }
}
function applyConfig(){
  document.body.style.setProperty('--primary-color', config.primaryColor);
  document.body.style.setProperty('--button-color', config.buttonColor);
  const sn = document.getElementById('store-name'); if (sn) sn.textContent = config.name;
  const sl = document.getElementById('store-logo'); if (sl && config.logoDataUrl) sl.src = config.logoDataUrl;
}

/* DELIVERY */
function renderZonesList(){
  const list = document.getElementById('zones-list');
  if (!list) return;
  list.innerHTML = '';
  if (!delivery.zones.length) list.innerHTML = '<div class="empty">No Lagos zones yet.</div>';
  delivery.zones.forEach((z,i)=>{
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="ai-main">
        <div class="ai-title">${z.name}</div>
        <div>${₦(z.fee)}</div>
      </div>
      <div class="ai-actions">
        <button data-zi="${i}">Edit</button>
        <button data-zd="${i}" class="danger">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-zd]').forEach(b=>{
    b.onclick = ()=>{
      const i = +b.getAttribute('data-zd');
      delivery.zones.splice(i,1);
      setLS(LS.delivery, delivery);
      renderZonesList();
    };
  });
  list.querySelectorAll('[data-zi]').forEach(b=>{
    b.onclick = ()=>{
      const i = +b.getAttribute('data-zi');
      const z = delivery.zones[i];
      document.getElementById('zone-name').value = z.name;
      document.getElementById('zone-fee').value = z.fee;
      // remove then re-add on save
      delivery.zones.splice(i,1);
      setLS(LS.delivery, delivery);
      renderZonesList();
    };
  });
}
function addZone(){
  const name = document.getElementById('zone-name').value.trim();
  const fee = Number(document.getElementById('zone-fee').value)||0;
  if (!name) return alert('Zone name required');
  delivery.zones.push({name, fee});
  document.getElementById('zone-name').value = '';
  document.getElementById('zone-fee').value = '';
  setLS(LS.delivery, delivery);
  renderZonesList();
}
function saveDelivery(){
  delivery.otherFee = Number(document.getElementById('other-states-fee').value)||0;
  setLS(LS.delivery, delivery);
  alert('Delivery settings saved');
}

/* BANK */
function saveBank(){
  bank.bankName = document.getElementById('bank-name').value.trim();
  bank.accountName = document.getElementById('account-name').value.trim();
  bank.accountNumber = document.getElementById('account-number').value.trim();
  setLS(LS.bank, bank);
  alert('Bank details saved');
}

/* COMMS */
function saveComms(){
  comms.adminEmail = document.getElementById('admin-email').value.trim();
  comms.defaultCustomerEmail = document.getElementById('customer-email').value.trim();
  comms.whatsapp = document.getElementById('whatsapp-number').value.trim();
  setLS(LS.comms, comms);
  alert('Saved. WhatsApp icon will link to your number on the store.');
}

/* ANNOUNCEMENTS */
function saveAnnouncements(){
  announcements = document.getElementById('ann-text').value;
  setLS(LS.announcements, announcements);
  alert('Announcements saved');
}

/* ORDERS & GAINS */
function renderOrdersAdmin(){
  const box = document.getElementById('orders-list');
  if (!box) return;
  box.innerHTML = '';
  if (!orders.length) { box.innerHTML = '<div class="empty">No orders yet.</div>'; return; }

  let totalRevenue = 0, totalCost = 0;
  orders.slice().reverse().forEach(o=>{
    const itemsHtml = o.items.map(i=>{
      const cost = (i.original||0) * i.qty;
      const rev = i.price * i.qty;
      totalRevenue += rev; totalCost += cost;
      return `<div class="order-line">
        <span>${i.name}</span>
        <span>${i.color?`(${i.color})`:''} ${i.size?`[${i.size}]`:''}</span>
        <span>${i.qty} × ${₦(i.price)} = ${₦(rev)} <span class="muted">| cost ${₦(cost)}</span></span>
      </div>`;
    }).join('');
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-header">
        <strong>${o.id}</strong>
        <span class="muted">${new Date(o.createdAt).toLocaleString()}</span>
      </div>
      <div class="order-body">
        ${itemsHtml}
        <div class="order-totals">
          <div>Items: ${₦(o.itemsTotal)} | Shipping: ${₦(o.shipFee)}</div>
          <div><strong>Grand: ${₦(o.grandTotal)}</strong></div>
        </div>
        <div class="order-customer muted">
          ${o.customer.name} • ${o.customer.email} • ${o.customer.phone}
        </div>
        <div class="order-ship muted">
          ${o.shipping.method==='pickup' ? 'Pickup' : `${o.shipping.state}${o.shipping.zone?` • ${o.shipping.zone}`:''} • ${o.shipping.address||''}`}
        </div>
      </div>
    `;
    box.appendChild(card);
  });

  document.getElementById('total-revenue').textContent = ₦(totalRevenue);
  document.getElementById('total-cost').textContent = ₦(totalCost);
  document.getElementById('total-gain').textContent = ₦(totalRevenue - totalCost);
}
