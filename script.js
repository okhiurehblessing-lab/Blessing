// --- Store Variables ---
let products = JSON.parse(localStorage.getItem("products")) || [];
let cart = [];
let deliveryZones = JSON.parse(localStorage.getItem("deliveryZones")) || [];
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let colors = [];
let sizes = [];
let collections = JSON.parse(localStorage.getItem("collections")) || [];
let adminEmail = localStorage.getItem("adminEmail") || "";

// --- Admin Updates ---
function saveAll(){
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("deliveryZones", JSON.stringify(deliveryZones));
  localStorage.setItem("orders", JSON.stringify(orders));
  localStorage.setItem("collections", JSON.stringify(collections));
  localStorage.setItem("adminEmail", adminEmail);
  alert("All changes saved! ✅");
}

function updateAdminEmail(){
  const email = document.getElementById("admin-email").value;
  if(email){
    adminEmail = email;
    localStorage.setItem("adminEmail", email);
    alert("Admin email updated!");
  }
}

function updateLogo() {
  const file = document.getElementById("admin-logo").files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector(".logo").src = reader.result;
      localStorage.setItem("logo", reader.result);
    }
    reader.readAsDataURL(file);
  }
}

function updateStoreName(){
  const name = document.getElementById("admin-store-name").value;
  if(name){
    document.getElementById("store-name").textContent = name;
    localStorage.setItem("storeName", name);
  }
}

function updateAnnouncement(){
  const ann = document.getElementById("admin-announcement").value;
  if(ann){
    document.getElementById("announcements").textContent = ann;
    localStorage.setItem("announcement", ann);
  }
}

function updateWhatsApp(){
  const num = document.getElementById("admin-whatsapp").value;
  if(num){
    document.getElementById("whatsapp-icon").href = `https://wa.me/${num.replace(/\D/g,'')}`;
    localStorage.setItem("whatsapp", num);
  }
}

function updateHeaderColor(){
  const color = document.getElementById("header-color-picker").value;
  document.querySelector("header").style.backgroundColor = color;
  localStorage.setItem("headerColor", color);
}

function updateButtonColor(){
  const color = document.getElementById("button-color-picker").value;
  document.querySelectorAll("button").forEach(b => b.style.backgroundColor = color);
  localStorage.setItem("buttonColor", color);
}

function updateBankDetails(){
  const name = document.getElementById("admin-bank-name").value;
  const accountName = document.getElementById("admin-bank-account-name").value;
  const account = document.getElementById("admin-bank-account").value;
  document.getElementById("bank-name").textContent = name;
  document.getElementById("bank-account-name").textContent = accountName;
  document.getElementById("bank-account").textContent = account;
  localStorage.setItem("bankDetails", JSON.stringify({name, accountName, account}));
}

// --- Delivery & Shipping ---
function addDeliveryMethod(){
  const method = document.getElementById("delivery-method-name").value;
  const area = document.getElementById("delivery-area").value;
  const fee = parseFloat(document.getElementById("delivery-fee").value);
  const estimate = document.getElementById("delivery-estimate").value;
  
  if(method && area && !isNaN(fee)){
    const existing = deliveryZones.find(d => d.method===method && d.area===area);
    if(existing){
      existing.fee = fee; existing.estimate = estimate;
    } else deliveryZones.push({method, area, fee, estimate});
    renderDeliveryList();
  }
}

function renderDeliveryList(){
  const list = document.getElementById("delivery-list");
  list.innerHTML = "";
  deliveryZones.forEach((d,i)=>{
    const p = document.createElement("p");
    p.textContent = `${d.method} - ${d.area}: ₦${d.fee} (${d.estimate}) `;
    const del = document.createElement("button");
    del.textContent="Delete"; del.onclick=()=>{deliveryZones.splice(i,1); renderDeliveryList();}
    p.appendChild(del);
    list.appendChild(p);
  });
  
  const select = document.getElementById("delivery-method");
  select.innerHTML = "";
  deliveryZones.forEach(d=>{
    const opt = document.createElement("option");
    opt.value = d.fee; opt.textContent = `${d.method} - ${d.area} (₦${d.fee})`;
    select.appendChild(opt);
  });
}

// --- Product Management ---
function addColor(){ const color = document.getElementById("product-color").value;
if(color && !colors.includes(color)){colors.push(color); renderColors();} }

function renderColors(){
  const list = document.getElementById("color-list"); list.innerHTML="";
  colors.forEach((c,i)=>{const p=document.createElement("p"); p.textContent=c;
  const del=document.createElement("button"); del.textContent="Delete"; del.onclick=()=>{colors.splice(i,1);renderColors();}
  p.appendChild(del); list.appendChild(p);});
}

function addSize(){ const size=document.getElementById("product-size").value;
if(size && !sizes.includes(size)){sizes.push(size); renderSizes();} }

function renderSizes(){
  const list=document.getElementById("size-list"); list.innerHTML="";
  sizes.forEach((s,i)=>{const p=document.createElement("p"); p.textContent=s;
  const del=document.createElement("button"); del.textContent="Delete"; del.onclick=()=>{sizes.splice(i,1);renderSizes();}
  p.appendChild(del); list.appendChild(p);});
}

function addProduct(){
  const name=document.getElementById("product-name").value;
  const price=parseFloat(document.getElementById("product-price").value);
  const cost=parseFloat(document.getElementById("product-cost").value);
  const collection=document.getElementById("product-collection").value;
  const file=document.getElementById("product-image-upload").files[0];

  if(!name||isNaN(price)||isNaN(cost)||!file) return alert("Complete all product fields");
  const reader=new FileReader();
  reader.onload=()=>{
    const product={name,price,cost,image:reader.result,colors:[...colors],sizes:[...sizes],collection};
    products.push(product); if(collection && !collections.includes(collection)) collections.push(collection);
    colors=[]; sizes=[];
    renderColors(); renderSizes(); renderProducts(); renderCollections();
  }
  reader.readAsDataURL(file);
}

function renderCollections(){
  const div=document.getElementById("collection-products"); div.innerHTML="";
  collections.forEach(c=>{
    const p=document.createElement("p"); p.textContent=c; div.appendChild(p);
  });
}

function renderProducts(){
  const container=document.getElementById("products"); container.innerHTML="";
  products.forEach((p,idx)=>{
    const div=document.createElement("div"); div.className="product-card";
    div.innerHTML=`
      <img src="${p.image}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>₦${p.price}</p>
      <p>Collection: ${p.collection || "None"}</p>
      <div><label>Color:</label>
      <select id="color-${idx}">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div>
      <div><label>Size:</label>
      <select id="size-${idx}">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}</select></div>
      <div>
        <button onclick="addToCart(${idx},1)">+</button>
        <span id="qty-${idx}">0</span>
        <button onclick="addToCart(${idx},-1)">-</button>
      </div>
      <button onclick="deleteProduct(${idx})">Delete Product</button>
    `;
    container.appendChild(div);
  });
}

function deleteProduct(idx){ products.splice(idx,1); renderProducts(); }

// --- Cart Management ---
function addToCart(idx,delta){
  let product=products[idx];
  let qtyEl=document.getElementById(`qty-${idx}`);
  let cartItem=cart.find(c=>c.idx===idx && c.color===document.getElementById(`color-${idx}`).value && c.size===document.getElementById(`size-${idx}`).value);
  if(!cartItem && delta>0){cartItem={idx,color:document.getElementById(`color-${idx}`).value,size:document.getElementById(`size-${idx}`).value,qty:0};cart.push(cartItem);}
  if(cartItem){cartItem.qty+=delta;if(cartItem.qty<0) cartItem.qty=0;if(cartItem.qty===0) cart=cart.filter(c=>c!==cartItem); qtyEl.textContent=cartItem.qty;}
  updateTotals();
}

function updateTotals(){
  let subtotal=cart.reduce((sum,c)=>sum+products[c.idx].price*c.qty,0);
  let shipping=parseFloat(document.getElementById("delivery-method").value)||0;
  document.getElementById("subtotal-amount").textContent=subtotal.toFixed(2);
  document.getElementById("shipping-fee").textContent=shipping.toFixed(2);
  document.getElementById("total-amount").textContent=(subtotal+shipping).toFixed(2);
}

// --- Search ---
function searchProducts(){
  const query=document.getElementById("search-bar").value.toLowerCase();
  const container=document.getElementById("products"); container.innerHTML="";
  products.forEach((p,idx)=>{if(p.name.toLowerCase().includes(query)){const div=document.createElement("div");div.className="product-card";
    div.innerHTML=`<img src="${p.image}" alt="${p.name}"><h4>${p.name}</h4><p>₦${p.price}</p><div><label>Color:</label><select id="color-${idx}">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div><div><label>Size:</label><select id="size-${idx}">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}</select></div><div><button onclick="addToCart(${idx},1)">+</button><span id="qty-${idx}">0</span><button onclick="addToCart(${idx},-1)">-</button></div>`;container.appendChild(div);}});
}

// --- Checkout & EmailJS ---
function proceedCheckout(e){
  e.preventDefault(); if(cart.length===0) return alert("Cart is empty"); if(!adminEmail) return alert("Please set admin email in panel first!");
  const name=document.getElementById
