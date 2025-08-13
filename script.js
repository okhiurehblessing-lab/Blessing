// --- Store Variables ---
let products = [];
let cart = [];
let deliveryZones = [];
let orders = [];
let colors = [];
let sizes = [];
let adminEmail = ""; // admin email for notifications

// --- Admin Updates ---
function updateAdminEmail(){
  const email = document.getElementById("admin-email").value;
  if(email) {
    adminEmail = email;
    alert("Admin email updated!");
  }
}

function updateLogo() {
  const file = document.getElementById("admin-logo").files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector(".logo").src = reader.result;
    }
    reader.readAsDataURL(file);
  }
}

function updateStoreName(){
  const name = document.getElementById("admin-store-name").value;
  if(name) document.getElementById("store-name").textContent = name;
}

function updateAnnouncement(){
  const ann = document.getElementById("admin-announcement").value;
  if(ann) document.getElementById("announcements").textContent = ann;
}

function updateWhatsApp(){
  const num = document.getElementById("admin-whatsapp").value;
  if(num) document.getElementById("whatsapp-icon").href = `https://wa.me/${num.replace(/\D/g,'')}`;
}

function updateHeaderColor(){
  const color = document.getElementById("header-color-picker").value;
  document.querySelector("header").style.backgroundColor = color;
}

function updateButtonColor(){
  const color = document.getElementById("button-color-picker").value;
  document.querySelectorAll("button").forEach(b => b.style.backgroundColor = color);
}

function updateBankDetails(){
  document.getElementById("bank-name").textContent = document.getElementById("admin-bank-name").value;
  document.getElementById("bank-account-name").textContent = document.getElementById("admin-bank-account-name").value;
  document.getElementById("bank-account").textContent = document.getElementById("admin-bank-account").value;
}

// --- Delivery & Shipping ---
function addDeliveryMethod(){
  const method = document.getElementById("delivery-method-name").value;
  const area = document.getElementById("delivery-area").value;
  const fee = parseFloat(document.getElementById("delivery-fee").value);
  const estimate = document.getElementById("delivery-estimate").value;
  
  if(method && area && !isNaN(fee)){
    const existing = deliveryZones.find(d => d.method === method && d.area === area);
    if(existing){
      existing.fee = fee;
      existing.estimate = estimate;
    } else {
      deliveryZones.push({method, area, fee, estimate});
    }
    renderDeliveryList();
  }
}

function renderDeliveryList(){
  const list = document.getElementById("delivery-list");
  list.innerHTML = "";
  deliveryZones.forEach(d => {
    const p = document.createElement("p");
    p.textContent = `${d.method} - ${d.area}: ₦${d.fee} (${d.estimate})`;
    list.appendChild(p);
  });
  
  const select = document.getElementById("delivery-method");
  select.innerHTML = "";
  deliveryZones.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.fee;
    opt.textContent = `${d.method} - ${d.area} (₦${d.fee})`;
    select.appendChild(opt);
  });
}

// --- Product Management ---
function addColor(){
  const color = document.getElementById("product-color").value;
  if(color && !colors.includes(color)){
    colors.push(color);
    renderColors();
  }
}

function renderColors(){
  const list = document.getElementById("color-list");
  list.innerHTML = "";
  colors.forEach(c => {
    const p = document.createElement("p");
    p.textContent = c;
    list.appendChild(p);
  });
}

function addSize(){
  const size = document.getElementById("product-size").value;
  if(size && !sizes.includes(size)){
    sizes.push(size);
    renderSizes();
  }
}

function renderSizes(){
  const list = document.getElementById("size-list");
  list.innerHTML = "";
  sizes.forEach(s => {
    const p = document.createElement("p");
    p.textContent = s;
    list.appendChild(p);
  });
}

function addProduct(){
  const name = document.getElementById("product-name").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const cost = parseFloat(document.getElementById("product-cost").value);
  const file = document.getElementById("product-image-upload").files[0];
  
  if(!name || isNaN(price) || isNaN(cost) || !file) return alert("Complete all product fields");

  const reader = new FileReader();
  reader.onload = () => {
    const product = {name, price, cost, image: reader.result, colors: [...colors], sizes: [...sizes]};
    products.push(product);
    colors = []; sizes = [];
    renderColors(); renderSizes();
    renderProducts();
  };
  reader.readAsDataURL(file);
}

function renderProducts(){
  const container = document.getElementById("products");
  container.innerHTML = "";
  products.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>₦${p.price}</p>
      <div>
        <label>Color:</label>
        <select id="color-${idx}">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join("")}</select>
      </div>
      <div>
        <label>Size:</label>
        <select id="size-${idx}">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}</select>
      </div>
      <div>
        <button onclick="addToCart(${idx},1)">+</button>
        <span id="qty-${idx}">0</span>
        <button onclick="addToCart(${idx},-1)">-</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// --- Cart Management ---
function addToCart(idx, delta){
  let product = products[idx];
  let qtyEl = document.getElementById(`qty-${idx}`);
  let cartItem = cart.find(c=>c.idx===idx && c.color===document.getElementById(`color-${idx}`).value && c.size===document.getElementById(`size-${idx}`).value);
  if(!cartItem && delta>0){
    cartItem = {idx, color: document.getElementById(`color-${idx}`).value, size: document.getElementById(`size-${idx}`).value, qty:0};
    cart.push(cartItem);
  }
  if(cartItem){
    cartItem.qty += delta;
    if(cartItem.qty<0) cartItem.qty=0;
    if(cartItem.qty===0) cart = cart.filter(c=>c!==cartItem);
    qtyEl.textContent = cartItem.qty;
  }
  updateTotals();
}

function updateTotals(){
  let subtotal = cart.reduce((sum,c)=>sum + products[c.idx].price*c.qty,0);
  let shipping = parseFloat(document.getElementById("delivery-method").value) || 0;
  document.getElementById("subtotal-amount").textContent = subtotal.toFixed(2);
  document.getElementById("shipping-fee").textContent = shipping.toFixed(2);
  document.getElementById("total-amount").textContent = (subtotal + shipping).toFixed(2);
}

// --- Search ---
function searchProducts(){
  const query = document.getElementById("search-bar").value.toLowerCase();
  const container = document.getElementById("products");
  container.innerHTML = "";
  products.forEach((p, idx)=>{
    if(p.name.toLowerCase().includes(query)){
      const div = document.createElement("div");
      div.className = "product-card";
      div.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>₦${p.price}</p>
        <div>
          <label>Color:</label>
          <select id="color-${idx}">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join("")}</select>
        </div>
        <div>
          <label>Size:</label>
          <select id="size-${idx}">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}</select>
        </div>
        <div>
          <button onclick="addToCart(${idx},1)">+</button>
          <span id="qty-${idx}">0</span>
          <button onclick="addToCart(${idx},-1)">-</button>
        </div>
      `;
      container.appendChild(div);
    }
  });
}

// --- Checkout & EmailJS ---
function proceedCheckout(e){
  e.preventDefault();
  if(cart.length===0) return alert("Cart is empty");
  if(!adminEmail) return alert("Please set admin email in panel first!");

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("customer-address").value;
  const deliveryFee = parseFloat(document.getElementById("delivery-method").value) || 0;
  const subtotal = cart.reduce((sum,c)=>sum + products[c.idx].price*c.qty,0);
  const total = subtotal + deliveryFee;

  let orderDetails = cart.map(c=>{
    const prod = products[c.idx];
    return `${prod.name} - Color: ${c.color}, Size: ${c.size}, Qty: ${c.qty}, Price: ₦${prod.price}`;
  }).join("\n");

  const templateParams = {
    from_name: name,
    email: email,
    phone: phone,
    address: address,
    delivery_fee: deliveryFee,
    subtotal: subtotal,
    total_amount: total,
    order_details: orderDetails,
    admin_email: adminEmail
  };

  emailjs.send('service_opcf6cl','template_4zrsdni', templateParams)
  .then(() => alert("Order submitted successfully!"), err => alert("Email send failed: "+err));

  orders.push({name,email,phone,address,subtotal,total,deliveryFee,cart:[...cart]});
  renderOrders();

  cart = [];
  renderProducts();
  updateTotals();
}

// --- Admin Orders ---
function renderOrders(){
  const container = document.getElementById("order-records");
  container.innerHTML = "";
  if(orders.length===0) container.innerHTML = "<p>No orders yet.</p>";
  orders.forEach(o=>{
    const div = document.createElement("div");
    div.className = "order-card";
    div.innerHTML = `
      <p><b>${o.name}</b> - ₦${o.total}</p>
      <p>${o.phone} | ${o.address}</p>
      <p>Products:</p>
      <pre>${o.cart.map(c=>{
        const prod = products[c.idx];
        return `${prod.name} - Color: ${c.color}, Size: ${c.size}, Qty: ${c.qty}, Price: ₦${prod.price}`;
      }).join("\n")}</pre>
    `;
    container.appendChild(div);
  });
}

// --- Shipping Update on Checkout ---
function updateShipping(){
  updateTotals();
}
