let cart = [];
let totalAmount = 0;
let orders = [];
let deliveryMethods = [];

// --- Customer Functions ---

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const cartItem = cart.find(item => item.id === productId);
  if (cartItem) {
    cartItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  updateCartTotal();
}

function changeQuantity(productId, delta) {
  const cartItem = cart.find(item => item.id === productId);
  if (!cartItem) return;
  cartItem.quantity += delta;
  if (cartItem.quantity < 1) cartItem.quantity = 1;
  updateCartTotal();
}

function updateCartTotal() {
  const methodIndex = document.getElementById("delivery-method").selectedIndex;
  const shippingFee = methodIndex >= 0 ? deliveryMethods[methodIndex].fee : 0;
  totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById("subtotal-amount").innerText = totalAmount;
  document.getElementById("shipping-fee").innerText = shippingFee;
  document.getElementById("total-amount").innerText = totalAmount + shippingFee;
}

// --- Delivery ---
function addDeliveryMethod() {
  const name = document.getElementById("delivery-method-name").value;
  const fee = parseFloat(document.getElementById("delivery-fee").value);
  const estimate = document.getElementById("delivery-estimate").value;
  const address = document.getElementById("delivery-address").value;

  if (!name || isNaN(fee) || !estimate) { alert("Fill required fields"); return; }

  const methodIndex = deliveryMethods.findIndex(d=>d.name===name);
  const methodObj = { name, fee, estimate, address };
  if (methodIndex >= 0) deliveryMethods[methodIndex] = methodObj;
  else deliveryMethods.push(methodObj);

  renderDeliveryList();
  updateDeliveryDropdown();
}

function renderDeliveryList() {
  const div = document.getElementById("delivery-list");
  div.innerHTML = deliveryMethods.map(d=>`<p>${d.name} - ₦${d.fee} (${d.estimate}) ${d.address? '| Pickup: '+d.address : ''}</p>`).join('');
}

function updateDeliveryDropdown() {
  const select = document.getElementById("delivery-method");
  select.innerHTML = deliveryMethods.map(d=>`<option value="${d.name}">${d.name} - ₦${d.fee}</option>`).join('');
  updateShipping();
}

function updateShipping() {
  const methodIndex = document.getElementById("delivery-method").selectedIndex;
  if (methodIndex >=0) {
    const method = deliveryMethods[methodIndex];
    document.getElementById("pickup-address").innerText = method.address || "";
  }
  updateCartTotal();
}

// --- Checkout ---
function proceedCheckout(event) {
  event.preventDefault();
  if (cart.length === 0) { alert("Cart is empty"); return; }

  const customerName = document.getElementById("name").value;
  const customerEmail = document.getElementById("email").value;
  const customerPhone = document.getElementById("phone").value;

  const methodIndex = document.getElementById("delivery-method").selectedIndex;
  const shippingFee = methodIndex>=0 ? deliveryMethods[methodIndex].fee : 0;
  const deliveryMethod = methodIndex>=0 ? deliveryMethods[methodIndex].name : "";

  const order = {
    customerName,
    customerEmail,
    customerPhone,
    products: cart.map(p=>({...p})),
    totalAmount: cart.reduce((sum,item)=>sum+item.price*item.quantity,0)+shippingFee,
    totalCost: cart.reduce((sum,item)=>sum+item.cost*item.quantity,0),
    profit: cart.reduce((sum,item)=>sum+(item.price-item.cost)*item.quantity,0),
    deliveryMethod,
    shippingFee,
    date: new Date().toLocaleString()
  };

  orders.push(order);
  cart = [];
  updateAdminOrders();
  updateCartTotal();

  // EmailJS
  const templateParams = {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    total_amount: order.totalAmount,
    products: order.products.map(p=>`${p.name} x${p.quantity} (₦${p.price})`).join(", "),
    delivery_method: deliveryMethod
  };
  emailjs.send("service_opcf6cl","template_4zrsdni",templateParams)
    .then(()=>alert("Order placed! Notification sent."))
    .catch(()=>alert("Order placed but email failed."));
}

// --- Products ---
let products = [];
let productIdCounter = 0;

function addProduct() {
  const name = document.getElementById("product-name").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const cost = parseFloat(document.getElementById("product-cost").value);
  const colors = document.getElementById("product-colors").value.split(",").map(c=>c.trim());
  const sizes = document.getElementById("product-sizes").value.split(",").map(s=>s.trim());
  const file = document.getElementById("product-image-upload").files[0];

  if(!name||!price||!cost||!colors.length||!sizes.length||!file){alert("Fill all fields"); return;}

  const reader=new FileReader();
  reader.onload=e=>{
    const imageSrc=e.target.result;
    const id=productIdCounter++;
    const product={id,name,price,cost,colors,sizes,imageSrc};
    products.push(product);
    renderProduct(product);
    renderCollection(product);
    // clear fields
    document.getElementById("product-name").value="";
    document.getElementById("product-price").value="";
    document.getElementById("product-cost").value="";
    document.getElementById("product-colors").value="";
    document.getElementById("product-sizes").value="";
    document.getElementById("product-image-upload").value="";
  };
  reader.readAsDataURL(file);
}

function renderProduct(product){
  const section=document.getElementById("products");
  const card=document.createElement("div");
  card.className="product-card";
  card.innerHTML=`
    <img src="${product.imageSrc}" alt="${product.name}">
    <h3>${product.name}</h3>
    <p>₦${product.price}</p>
    <p>Colors: ${product.colors.join(", ")}</p>
    <p>Sizes: ${product.sizes.join(", ")}</p>
    <div>
      <button onclick="changeQuantity(${product.id},-1)">−</button>
      <span id="qty-${product.id}">1</span>
      <button onclick="changeQuantity(${product.id},1)">+</button>
    </div>
    <button onclick="addToCart(${product.id})">Add to Cart</button>
  `;
  section.appendChild(card);
}

function renderCollection(product){
  const section=document.getElementById("collection-products");
  const card=document.createElement("div");
  card.className="product-card";
  card.innerHTML=`
    <img src="${product.imageSrc}" alt="${product.name}">
    <h3>${product.name}</h3>
    <p>₦${product.price}</p>
    <p>Colors: ${product.colors.join(", ")}</p>
    <p>Sizes: ${product.sizes.join(", ")}</p>
    <button onclick="addToCart(${product.id})">Add to Cart</button>
  `;
  section.appendChild(card);
}

// --- Orders & Profit ---
function updateAdminOrders(){
  const orderDiv=document.getElementById("order-records");
  orderDiv.innerHTML="";
  if(!orders.length){orderDiv.innerHTML="<p>No orders yet.</p>"; return;}

  let totalSales=0; let totalProfit=0;
  orders.forEach((order,index)=>{
    totalSales+=order.totalAmount;
    totalProfit+=order.profit;
    const div=document.createElement("div");
    div.className="order-card";
    div.innerHTML=`
      <h4>Order #${index+1} - ${order.date}</h4>
      <p>Customer: ${order.customerName}</p>
      <p>Phone: ${order.customerPhone}</p>
      <p>Email: ${order.customerEmail}</p>
      <p>Delivery: ${order.deliveryMethod} | Shipping: ₦${order.shippingFee}</p>
      <p>Products: ${order.products.map(p=>`${p.name} x${p.quantity} (₦${p.price}, Cost ₦${p.cost})`).join(", ")}</p>
      <p>Total: ₦${order.totalAmount} | Profit: ₦${order.profit}</p>
    `;
    orderDiv.appendChild(div);
  });
  const totalDiv=document.createElement("div");
  totalDiv.innerHTML=`<h3>Total Sales: ₦${totalSales}</h3><h3>Total Profit: ₦${totalProfit}</h3>`;
  orderDiv.appendChild(totalDiv);
}

// --- Store Customization ---
function updateLogo(){const file=document.getElementById("admin-logo").files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>document.querySelector(".logo").src=e.target.result;reader.readAsDataURL(file);}
function updateStoreName(){const name=document.getElementById("admin-store-name").value;if(name)document.getElementById("store-name").innerText=name;}
function updateAnnouncement(){const msg=document.getElementById("admin-announcement").value;if(msg)document.getElementById("announcements").innerHTML=`<p>${msg}</p>`;}
function updateWhatsApp(){const number=document.getElementById("admin-whatsapp").value;if(number)document.getElementById("whatsapp-icon").href=`https://wa.me/${number.replace(/\D/g,'')}`;}
function updateHeaderColor(){const color=document.getElementById("header-color-picker").value;document.querySelector("header").style.backgroundColor=color;}
function updateButtonColor(){const color=document.getElementById("button-color-picker").value;document.querySelectorAll("button").forEach(btn=>btn.style.backgroundColor=color);}
function updateBankDetails(){const name=document.getElementById("admin-bank-name").value;const account=document.getElementById("admin-bank-account").value;if(name)document.getElementById("bank-name").innerText=name;if(account)document.getElementById("bank-account").innerText=account;}

// --- Search ---
function searchProducts(){
  const query=document.getElementById("search-bar").value.toLowerCase();
  document.querySelectorAll(".product-card").forEach(card=>{
    const name=card.querySelector("h3").innerText.toLowerCase();
    card.style.display=name.includes(query)?"block":"none";
  });
}
