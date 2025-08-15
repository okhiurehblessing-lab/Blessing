/***********************
 * Minimal persistent DB
 ***********************/
const DB = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Defaults
const defaults = {
  settings: {
    storeName: "Essysessentials",
    announcementText: "Welcome to Essysessentials — Free delivery on orders over ₦10,000!",
    announcementBg: "#fffbe6",
    announcementTextColor: "#111",
    theme: { bg:"#ffffff", btn:"#111", btnText:"#ffffff", accent:"#25d366" },
    whatsapp: "2348012345678",
    adminEmail: "",
    storeEmail: "",
    bank: { bankName:"", accountName:"", accountNumber:"" },
    shipping: {
      outsideLagosFee: 3000,
      pickupNote: "",
      zones: [ {name:"Mainland", fee:1500}, {name:"Island", fee:2000} ]
    }
  },
  collections: [
    {id: "all", name:"All"},
  ],
  products: [],
  orders: [],
  cart: []
};

let settings = DB.get("settings", defaults.settings);
let collections = DB.get("collections", defaults.collections);
let products = DB.get("products", defaults.products);
let orders = DB.get("orders", defaults.orders);
let cart = DB.get("cart", defaults.cart);

function saveAll(){
  DB.set("settings", settings);
  DB.set("collections", collections);
  DB.set("products", products);
  DB.set("orders", orders);
  DB.set("cart", cart);
}

/***********************
 * Helpers
 ***********************/
const ₦ = n => "₦" + (Number(n||0)).toLocaleString();

function dataURLFromFiles(files){
  const arr = Array.from(files || []);
  return Promise.all(arr.map(file => new Promise(res=>{
    const r=new FileReader();
    r.onload=()=>res(r.result);
    r.readAsDataURL(file);
  })));
}

function applyThemeLive(){
  document.documentElement.style.setProperty("--bg", settings.theme.bg);
  document.documentElement.style.setProperty("--btn", settings.theme.btn);
  document.documentElement.style.setProperty("--btnText", settings.theme.btnText);
  document.documentElement.style.setProperty("--annBg", settings.announcementBg);
  document.documentElement.style.setProperty("--annText", settings.announcementTextColor);
}

/***********************
 * STORE PAGE
 ***********************/
function initStore(){
  applyThemeLive();

  const bar = document.getElementById("announceBar");
  if(bar){ bar.textContent = settings.announcementText; }

  const sname = document.getElementById("storeName");
  if(sname){ sname.textContent = settings.storeName; }

  const wa = document.getElementById("waLink");
  if(wa){
    const num = (settings.whatsapp || "").replace(/\D/g,"");
    wa.href = num ? `https://wa.me/${num}` : "#";
  }

  // Search + filter
  const filter = document.getElementById("collectionFilter");
  if(filter){
    filter.innerHTML = `<option value="">All collections</option>` + 
      collections.filter(c=>c.id!=="all").map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
    filter.addEventListener("change", renderGrid);
  }
  const search = document.getElementById("searchInput");
  if(search){ search.addEventListener("input", renderGrid); }

  // Product modal wiring
  document.getElementById("closeProductModal")?.addEventListener("click", closeProductModal);
  document.getElementById("pmMinus")?.addEventListener("click", ()=> {
    const q = document.getElementById("pmQty");
    q.value = Math.max(1, Number(q.value||1)-1);
  });
  document.getElementById("pmPlus")?.addEventListener("click", ()=> {
    const q = document.getElementById("pmQty");
    q.value = Number(q.value||1)+1;
  });

  // Cart drawer
  document.getElementById("cartButton")?.addEventListener("click", openCart);
  document.getElementById("closeCart")?.addEventListener("click", closeCart);
  document.getElementById("placeOrder")?.addEventListener("click", placeOrder);
  document.getElementById("deliveryMethod")?.addEventListener("change", onDeliveryChange);

  // Lagos zones
  const zoneSel = document.getElementById("lagosZone");
  if(zoneSel){
    zoneSel.innerHTML = settings.shipping.zones.map((z,i)=>`<option value="${i}">${z.name} (${₦(z.fee)})</option>`).join("");
    zoneSel.addEventListener("change", updateCartSummary);
  }

  updateCartBadge();
  renderGrid();
  renderCart();
  updateCartSummary();
  updateBankNote();
}

function renderGrid(){
  const grid = document.getElementById("productGrid");
  if(!grid) return;

  const term = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const col = document.getElementById("collectionFilter")?.value || "";

  const filtered = products.filter(p => {
    const inCol = col ? (p.collectionId === col) : true;
    const inSearch = !term || (p.name?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term));
    return inCol && inSearch;
  });

  grid.innerHTML = filtered.map(p => {
    const img = (p.images && p.images[0]) || "assets/placeholder.jpg";
    const out = (Number(p.stock||0) === 0);
    const inCart = cart.find(ci=>ci.productId===p.id);
    const badge = out ? '<span class="badge out-badge">Out of stock</span>' : '';

    // if in cart, show qty controls on card
    let actionHtml = '';
    if(inCart){
      actionHtml = `
        <div class="card-qty">
          <button class="qty-btn card-minus" data-id="${p.id}">−</button>
          <span class="qv">${inCart.qty}</span>
          <button class="qty-btn card-plus" data-id="${p.id}">+</button>
        </div>
      `;
    } else {
      actionHtml = `<button class="btn primary add-btn" data-id="${p.id}" ${out ? 'disabled' : ''}>Add to cart</button>`;
    }

    return `
      <div class="card product-card" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${img}" alt="${p.name}">
          ${badge}
        </div>
        <div class="pd">
          <p class="p-name">${p.name}</p>
          <p class="p-price">${₦(p.price)}</p>
          ${actionHtml}
        </div>
      </div>
    `;
  }).join("");

  // Click handlers
  grid.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("click", (e)=>{
      if(e.target.classList.contains("add-btn") || e.target.classList.contains("card-minus") || e.target.classList.contains("card-plus")) return;
      const id = card.getAttribute("data-id");
      openProductModal(id);
    });
  });

  grid.querySelectorAll(".add-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      addToCart(id, 1);
    });
  });

  grid.querySelectorAll(".card-minus").forEach(b=>{
    b.addEventListener("click",(e)=>{
      e.stopPropagation();
      const id = b.getAttribute("data-id");
      const item = cart.find(c=>c.productId===id);
      if(!item) return;
      item.qty = Math.max(0, item.qty - 1);
      if(item.qty === 0) cart = cart.filter(c=>c.productId!==id);
      DB.set("cart", cart);
      updateCartBadge(); renderGrid(); renderCart(); updateCartSummary();
    });
  });
  grid.querySelectorAll(".card-plus").forEach(b=>{
    b.addEventListener("click",(e)=>{
      e.stopPropagation();
      const id = b.getAttribute("data-id");
      const item = cart.find(c=>c.productId===id);
      if(item){ item.qty +=1; }
      else { cart.push({productId:id, qty:1}); }
      DB.set("cart", cart);
      updateCartBadge(); renderGrid(); renderCart(); updateCartSummary();
    });
  });
}

let currentProductId = null;
function openProductModal(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  currentProductId = id;

  document.getElementById("pmImage").src = (p.images && p.images[0]) || "assets/placeholder.jpg";
  document.getElementById("pmName").textContent = p.name;
  document.getElementById("pmPrice").textContent = ₦(p.price);
  document.getElementById("pmDesc").textContent = p.description || "";

  const opts = document.getElementById("pmOptions");
  opts.innerHTML = "";
  if (p.colors?.length){
    const row = document.createElement("div");
    row.innerHTML = `<div class="lbl">Colors</div>`;
    p.colors.forEach(c=>{
      const b = document.createElement("button");
      b.type="button"; b.className="opt"; b.textContent=c;
      b.addEventListener("click", ()=> {
        row.querySelectorAll(".opt").forEach(o=>o.classList.remove("active"));
        b.classList.add("active");
        row.setAttribute("data-value", c);
      });
      row.appendChild(b);
    });
    opts.appendChild(row);
  }
  if (p.sizes?.length){
    const row = document.createElement("div");
    row.innerHTML = `<div class="lbl">Sizes</div>`;
    p.sizes.forEach(s=>{
      const b = document.createElement("button");
      b.type="button"; b.className="opt"; b.textContent=s;
      b.addEventListener("click", ()=> {
        row.querySelectorAll(".opt").forEach(o=>o.classList.remove("active"));
        b.classList.add("active");
        row.setAttribute("data-value", s);
      });
      row.appendChild(b);
    });
    opts.appendChild(row);
  }

  document.getElementById("pmQty").value = 1;
  const pmAdd = document.getElementById('pmAddToCart');
  if(Number(p.stock||0) === 0){
    pmAdd.disabled = true;
    pmAdd.textContent = 'Out of stock';
  } else {
    pmAdd.disabled = false;
    pmAdd.textContent = 'Add to cart';
    pmAdd.onclick = ()=>{
      const qty = Number(document.getElementById("pmQty").value||1);
      addToCart(id, qty);
      closeProductModal();
    };
  }

  const modal = document.getElementById("productModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
}

function closeProductModal(){
  const modal = document.getElementById("productModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}

function addToCart(productId, qty){
  qty = Number(qty||1);
  const exist = cart.find(ci=>ci.productId===productId);
  if(exist){ exist.qty += qty; }
  else { cart.push({productId, qty}); }
  DB.set("cart", cart);
  updateCartBadge();
  openCart();
  renderCart();
  updateCartSummary();
}

function updateCartBadge(){
  const count = cart.reduce((a,c)=>a+c.qty,0);
  const badge = document.getElementById("cartCount");
  if(badge) badge.textContent = count;
}

function openCart(){ 
  const d = document.getElementById("cartDrawer");
  if(d) d.classList.add("open");
}
function closeCart(){ 
  const d = document.getElementById("cartDrawer");
  if(d) d.classList.remove("open");
}

function renderCart(){
  const wrap = document.getElementById("cartList");
  if(!wrap) return;
  if(!cart.length){
    wrap.innerHTML = `
      <div class="empty">
        <p>Your cart is currently empty.</p>
        <div style="text-align:center;margin-top:12px;">
          <button id="returnShop" class="btn">Return to shop</button>
        </div>
      </div>
    `;
    document.getElementById("returnShop")?.addEventListener("click", ()=>{
      closeCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    updateCartSummary();
    return;
  }

  wrap.innerHTML = cart.map(ci=>{
    const p = products.find(x=>x.id===ci.productId);
    if(!p) return "";
    const img = (p.images && p.images[0]) || "assets/placeholder.jpg";
    return `
      <div class="cart-item" data-id="${p.id}">
        <img src="${img}" alt="${p.name}">
        <div>
          <p class="ci-name">${p.name}</p>
          <p class="ci-meta">${₦(p.price)}</p>
        </div>
        <div class="ci-qty">
          <button class="qty-btn minus">−</button>
          <span class="qv">${ci.qty}</span>
          <button class="qty-btn plus">+</button>
        </div>
      </div>
    `;
  }).join("");

  wrap.querySelectorAll(".cart-item").forEach(row=>{
    const id = row.getAttribute("data-id");
    row.querySelector(".minus").addEventListener("click",()=>{
      const item = cart.find(c=>c.productId===id);
      if(!item) return;
      item.qty = Math.max(0, item.qty - 1);
      if(item.qty===0){ cart = cart.filter(c=>c.productId!==id); }
      DB.set("cart", cart);
      updateCartBadge(); renderGrid(); renderCart(); updateCartSummary();
    });
    row.querySelector(".plus").addEventListener("click",()=>{
      const item = cart.find(c=>c.productId===id);
      if(!item) return;
      item.qty += 1;
      DB.set("cart", cart);
      updateCartBadge(); renderGrid(); renderCart(); updateCartSummary();
    });
  });
}

function onDeliveryChange(){
  const method = document.getElementById("deliveryMethod").value;
  const zoneWrap = document.getElementById("lagosZoneWrap");
  const addrWrap = document.getElementById("addressWrap");
  zoneWrap.classList.toggle("hidden", method!=="lagos");
  addrWrap.classList.toggle("hidden", method==="pickup");
  updateCartSummary();
}

function calcSubtotal(){ 
  return cart.reduce((sum,ci)=>{
    const p = products.find(x=>x.id===ci.productId);
    if(!p) return sum;
    return sum + (Number(p.price||0) * ci.qty);
  },0);
}

function calcShipping(){
  const method = document.getElementById("deliveryMethod")?.value || "pickup";
  if(method==="pickup") return 0;
  if(method==="outside") return Number(settings.shipping.outsideLagosFee||0);
  if(method==="lagos"){
    const idx = Number(document.getElementById("lagosZone")?.value || 0);
    const z = settings.shipping.zones[idx];
    return Number(z?.fee||0);
  }
  return 0;
}

function updateCartSummary(){
  const sub = calcSubtotal();
  const ship = calcShipping();
  const total = sub + ship;
  const el = id => document.getElementById(id);
  el("cartSubtotal").textContent = ₦(sub);
  el("cartShipping").textContent = ₦(ship);
  el("cartTotal").textContent = ₦(total);
}

function updateBankNote(){
  const b = settings.bank;
  const note = document.getElementById("bankNote");
  if(!note) return;
  if(b.bankName && b.accountName && b.accountNumber){
    note.innerHTML = `<strong>Bank Transfer:</strong><br>${b.bankName}<br>${b.accountName}<br>${b.accountNumber}`;
  }else{
    note.textContent = "";
  }
}

// Place order (EmailJS to admin + customer)
async function placeOrder(){
  if(!cart.length){ alert("Your cart is empty."); return; }

  const name = document.getElementById("custName").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const method = document.getElementById("deliveryMethod").value;
  const address = (method==="pickup") ? (settings.shipping.pickupNote || "Pickup") : document.getElementById("deliveryAddress").value.trim();

  if(!name || !email || !phone){ alert("Please fill your name, email and phone."); return; }

  const subtotal = calcSubtotal();
  const shipping = calcShipping();
  const total = subtotal + shipping;

  const itemsDetail = cart.map(ci=>{
    const p = products.find(x=>x.id===ci.productId);
    return `${p?.name} x${ci.qty} — ${₦(p?.price)}`;
  }).join("\n");

  const gain = cart.reduce((g,ci)=>{
    const p = products.find(x=>x.id===ci.productId);
    const profitUnit = Number(p?.price||0) - Number(p?.cost||0);
    return g + (profitUnit * ci.qty);
  },0);

  const order = {
    id: "ord_" + Date.now(),
    date: new Date().toISOString(),
    customer: {name,email,phone,address,method},
    items: cart.map(ci=>{
      const p = products.find(x=>x.id===ci.productId); 
      return {productId:ci.productId, name:p?.name, price:Number(p?.price||0), qty:ci.qty};
    }),
    subtotal, shipping, total, gain,
    status: "pending"
  };
  orders.unshift(order);
  DB.set("orders", orders);

  try{
    if(settings.adminEmail){
      await emailjs.send("service_opcf6cl", "template_4zrsdni", {
        to_email: settings.adminEmail,
        subject: `New order — ${order.id}`,
        message: `Customer: ${name}\nPhone: ${phone}\nEmail: ${email}\nMethod: ${method}\nAddress: ${address}\n\nItems:\n${itemsDetail}\n\nSubtotal: ${₦(subtotal)}\nShipping: ${₦(shipping)}\nTotal: ${₦(total)}\nGain: ${₦(gain)}`
      });
    }
    await emailjs.send("service_opcf6cl", "template_zc87bdl", {
      to_email: email,
      subject: `Your order — ${order.id}`,
      message: `Thank you ${name}!\nWe received your order.\n\nItems:\n${itemsDetail}\n\nSubtotal: ${₦(subtotal)}\nShipping: ${₦(shipping)}\nTotal: ${₦(total)}\n\nWe will contact you shortly.`
    });
  }catch(e){
    console.warn("EmailJS error", e);
  }

  cart = [];
  DB.set("cart", cart);
  updateCartBadge(); renderGrid(); renderCart(); updateCartSummary();
  alert("Order placed! Check your email.");
}

/***********************
 * ADMIN PAGE
 ***********************/
function initAdmin(){
  applyThemeLive();

  document.getElementById("adminStoreName").textContent = settings.storeName;

  const panel = document.getElementById("settingsPanel");
  document.getElementById("openSettings")?.addEventListener("click", ()=>{
    panel.classList.add("open");
    document.getElementById("settingsOverlay").classList.remove("hidden");
  });
  document.getElementById("closeSettings")?.addEventListener("click", ()=>{
    panel.classList.remove("open");
    document.getElementById("settingsOverlay").classList.add("hidden");
  });
  document.getElementById("settingsOverlay")?.addEventListener("click", ()=>{
    panel.classList.remove("open");
    document.getElementById("settingsOverlay").classList.add("hidden");
  });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"){ panel.classList.remove("open"); document.getElementById("settingsOverlay").classList.add("hidden"); }});

  setVal("setStoreName", settings.storeName);
  setVal("setAnnouncement", settings.announcementText);
  setVal("setAnnBg", settings.announcementBg);
  setVal("setAnnText", settings.announcementTextColor);
  setVal("setBg", settings.theme.bg);
  setVal("setBtnBg", settings.theme.btn);
  setVal("setBtnText", settings.theme.btnText);
  setVal("setAdminEmail", settings.adminEmail);
  setVal("setStoreEmail", settings.storeEmail);
  setVal("setWhatsapp", settings.whatsapp);
  setVal("setBankName", settings.bank.bankName);
  setVal("setAccountName", settings.bank.accountName);
  setVal("setAccountNumber", settings.bank.accountNumber);
  setVal("setOutsideFee", settings.shipping.outsideLagosFee);
  setVal("setPickupNote", settings.shipping.pickupNote);

  renderZones();

  onInput("setStoreName", v=>{ settings.storeName=v; DB.set("settings",settings); document.getElementById("adminStoreName").textContent=v; });
  onInput("setAnnouncement", v=>{ settings.announcementText=v; DB.set("settings",settings); document.getElementById("announceBar").textContent=v; });
  onInput("setAnnBg", v=>{ settings.announcementBg=v; DB.set("settings",settings); applyThemeLive(); });
  onInput("setAnnText", v=>{ settings.announcementTextColor=v; DB.set("settings",settings); applyThemeLive(); });
  onInput("setBg", v=>{ settings.theme.bg=v; DB.set("settings",settings); applyThemeLive(); });
  onInput("setBtnBg", v=>{ settings.theme.btn=v; DB.set("settings",settings); applyThemeLive(); });
  onInput("setBtnText", v=>{ settings.theme.btnText=v; DB.set("settings",settings); applyThemeLive(); });
  onInput("setAdminEmail", v=>{ settings.adminEmail=v; DB.set("settings",settings); });
  onInput("setStoreEmail", v=>{ settings.storeEmail=v; DB.set("settings",settings); });
  onInput("setWhatsapp", v=>{ settings.whatsapp=v; DB.set("settings",settings); });

  onInput("setBankName", v=>{ settings.bank.bankName=v; DB.set("settings",settings); updateBankNote(); });
  onInput("setAccountName", v=>{ settings.bank.accountName=v; DB.set("settings",settings); updateBankNote(); });
  onInput("setAccountNumber", v=>{ settings.bank.accountNumber=v; DB.set("settings",settings); updateBankNote(); });

  onInput("setOutsideFee", v=>{ settings.shipping.outsideLagosFee=Number(v||0); DB.set("settings",settings); updateZonesEverywhere(); });
  onInput("setPickupNote", v=>{ settings.shipping.pickupNote=v; DB.set("settings",settings); });

  document.getElementById("addZone").addEventListener("click", ()=>{
    const name = document.getElementById("zoneName").value.trim();
    const fee  = Number(document.getElementById("zoneFee").value||0);
    if(!name){ alert("Enter zone name"); return; }
    settings.shipping.zones.push({name, fee});
    DB.set("settings", settings);
    document.getElementById("zoneName").value="";
    document.getElementById("zoneFee").value="";
    renderZones();
    updateZonesEverywhere();
  });

  renderStats();
  renderOrdersTable();
  renderCollectionsUI();

  document.getElementById("addCollection").addEventListener("click", ()=>{
    const name = document.getElementById("newCollectionName").value.trim();
    if(!name) return;
    const id = "col_" + Date.now();
    collections.push({id,name});
    DB.set("collections", collections);
    document.getElementById("newCollectionName").value="";
    renderCollectionsUI();
    refreshProductCollectionSelects();
  });

  document.getElementById("toggleAddProduct").addEventListener("click", ()=>{
    document.getElementById("productForm").classList.toggle("hidden");
    resetProductForm();
  });

  document.getElementById("addColor").addEventListener("click", ()=>{
    const v = document.getElementById("colorInput").value.trim();
    if(!v) return;
    appendChip("colorList", v);
    document.getElementById("colorInput").value="";
  });
  document.getElementById("addSize").addEventListener("click", ()=>{
    const v = document.getElementById("sizeInput").value.trim();
    if(!v) return;
    appendChip("sizeList", v);
    document.getElementById("sizeInput").value="";
  });

  document.getElementById("cancelProduct").addEventListener("click", ()=>{
    resetProductForm();
    document.getElementById("productForm").classList.add("hidden");
  });

  document.getElementById("productForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const id = document.getElementById("editId").value || ("p_" + Date.now());
    const name = document.getElementById("pName").value.trim();
    const price = Number(document.getElementById("pPrice").value||0);
    const cost  = Number(document.getElementById("pCost").value||0);
    const stock = Number(document.getElementById("pStock").value||0);
    const desc  = document.getElementById("pDesc").value;
    const coll  = document.getElementById("pCollection").value || "";
    const colors = readChips("colorList");
    const sizes  = readChips("sizeList");

    const imgs  = await dataURLFromFiles(document.getElementById("pImages").files);

    const existing = products.find(x=>x.id===id);
    if(existing){
      existing.name=name; existing.price=price; existing.cost=cost; existing.stock=stock;
      existing.description=desc; existing.collectionId=coll;
      existing.colors=colors; existing.sizes=sizes;
      if(imgs.length){ existing.images = imgs; }
    }else{
      products.unshift({
        id, name, price, cost, stock,
        description:desc,
        collectionId: coll || "",
        colors, sizes,
        images: imgs.length? imgs : []
      });
    }
    DB.set("products", products);
    document.getElementById("productForm").classList.add("hidden");
    renderProductsList();
    refreshAssignProducts();
    refreshProductCollectionSelects();
    renderStats();
  });

  renderProductsList();
  refreshAssignProducts();
  refreshProductCollectionSelects();
}

/*** small helpers ***/
function setVal(id, v){ const el=document.getElementById(id); if(el) el.value = v ?? ""; }
function onInput(id, fn){ const el=document.getElementById(id); if(!el) return; el.addEventListener("input", e=>fn(e.target.value)); }

function renderZones(){
  const zlist = document.getElementById("zoneList");
  zlist.innerHTML = settings.shipping.zones.map((z,i)=>`
    <span class="chip">${z.name} (${₦(z.fee)}) <span class="x" data-i="${i}">×</span></span>
  `).join("");
  zlist.querySelectorAll(".x").forEach(x=>{
    x.addEventListener("click", ()=>{
      const i = Number(x.getAttribute("data-i"));
      settings.shipping.zones.splice(i,1);
      DB.set("settings",settings);
      renderZones();
      updateZonesEverywhere();
    });
  });
}
function updateZonesEverywhere(){
  const zsel = document.getElementById("lagosZone");
  if(zsel){
    zsel.innerHTML = settings.shipping.zones.map((z,i)=>`<option value="${i}">${z.name} (${₦(z.fee)})</option>`).join("");
  }
}

/*** dashboard ***/
function renderStats(){
  const totalOrders = orders.length;
  const totalSales = orders.reduce((s,o)=>s + Number(o.total||0),0);
  const pending = orders.filter(o=>o.status==="pending").length;
  const prodCount = products.length;
  setText("statOrders", totalOrders);
  setText("statSales", ₦(totalSales));
  setText("statPending", pending);
  setText("statProducts", prodCount);
}
function setText(id, v){ const el=document.getElementById(id); if(el) el.textContent = v; }

function renderOrdersTable(){
  const tbody = document.getElementById("ordersTable");
  tbody.innerHTML = orders.slice(0,20).map(o=>`
    <tr data-id="${o.id}">
      <td>${new Date(o.date).toLocaleString()}</td>
      <td>${o.customer.name}</td>
      <td>${₦(o.total)}</td>
      <td>
        <select class="ordStatus">
          <option value="pending" ${o.status==="pending"?"selected":""}>Pending</option>
          <option value="paid" ${o.status==="paid"?"selected":""}>Successful</option>
          <option value="cancelled" ${o.status==="cancelled"?"selected":""}>Cancelled</option>
        </select>
      </td>
      <td>${₦(o.gain)}</td>
      <td><button class="btn small delOrd">Delete</button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll(".ordStatus").forEach(sel=>{
    sel.addEventListener("change", (e)=>{
      const tr = e.target.closest("tr");
      const id = tr.getAttribute("data-id");
      const ord = orders.find(x=>x.id===id);
      if(ord){ ord.status = e.target.value; DB.set("orders", orders); renderStats(); }
    });
  });
  tbody.querySelectorAll(".delOrd").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const tr = btn.closest("tr");
      const id = tr.getAttribute("data-id");
      orders = orders.filter(o=>o.id!==id);
      DB.set("orders", orders);
      renderOrdersTable();
      renderStats();
    });
  });
}

/*** products UI ***/
function resetProductForm(){
  ["pName","pPrice","pCost","pDesc","editId","pStock"].forEach(id=>setVal(id,""));
  document.getElementById("pImages").value="";
  document.getElementById("colorList").innerHTML="";
  document.getElementById("sizeList").innerHTML="";
  document.getElementById("pCollection").value="";
}
function appendChip(listId, text){
  const wrap = document.getElementById(listId);
  const span = document.createElement("span");
  span.className="chip";
  span.innerHTML = `${text} <span class="x">×</span>`;
  span.querySelector(".x").addEventListener("click", ()=> span.remove());
  wrap.appendChild(span);
}
function readChips(listId){
  return Array.from(document.querySelectorAll(`#${listId} .chip`)).map(ch=>{
    return ch.textContent.replace("×","").trim();
  });
}
function renderProductsList(){
  const list = document.getElementById("productsList");
  list.innerHTML = products.map(p=>{
    const img = (p.images && p.images[0]) || "assets/placeholder.jpg";
    const col = collections.find(c=>c.id===p.collectionId)?.name || "—";
    return `
      <div class="card-row" data-id="${p.id}">
        <img src="${img}" alt="${p.name}">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="ci-meta">${₦(p.price)} · Cost ${₦(p.cost||0)} · Stock: ${p.stock||0} · Collection: ${col}</div>
        </div>
        <div>
          <button class="btn small edit">Edit</button>
          <button class="btn small del">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".edit").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.closest(".card-row").getAttribute("data-id");
      const p = products.find(x=>x.id===id);
      if(!p) return;
      document.getElementById("productForm").classList.remove("hidden");
      setVal("editId", p.id);
      setVal("pName", p.name);
      setVal("pPrice", p.price);
      setVal("pCost", p.cost);
      setVal("pStock", p.stock);
      setVal("pDesc", p.description||"");
      setVal("pCollection", p.collectionId || "");
      document.getElementById("colorList").innerHTML="";
      (p.colors||[]).forEach(c=>appendChip("colorList", c));
      document.getElementById("sizeList").innerHTML="";
      (p.sizes||[]).forEach(s=>appendChip("sizeList", s));
      document.getElementById("pImages").value="";
    });
  });
  list.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.closest(".card-row").getAttribute("data-id");
      products = products.filter(p=>p.id!==id);
      DB.set("products", products);
      renderProductsList();
      refreshAssignProducts();
      renderStats();
    });
  });
}

function renderCollectionsUI(){
  const pills = document.getElementById("collectionsList");
  pills.innerHTML = collections.filter(c=>c.id!=="all").map(c=>
    `<span class="pill">${c.name}</span>`
  ).join("");

  const sel = document.getElementById("assignCollectionSelect");
  sel.innerHTML = collections.filter(c=>c.id!=="all").map(c=>`<option value="${c.id}">${c.name}</option>`).join("");

  refreshAssignProducts();
}

function refreshAssignProducts(){
  const box = document.getElementById("assignProducts");
  box.innerHTML = products.map(p=>{
    const img = (p.images && p.images[0]) || "assets/placeholder.jpg";
    return `
      <label class="assign-item">
        <input type="checkbox" class="assChk" value="${p.id}" />
        <img src="${img}" alt="${p.name}">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="ci-meta">${₦(p.price)}</div>
        </div>
      </label>
    `;
  }).join("");

  document.getElementById("applyAssignment").onclick = ()=>{
    const colId = document.getElementById("assignCollectionSelect").value;
    if(!colId){ alert("Create a collection first."); return; }
    const ids = Array.from(document.querySelectorAll(".assChk:checked")).map(i=>i.value);
    products.forEach(p=>{
      if(ids.includes(p.id)) p.collectionId = colId;
    });
    DB.set("products", products);
    renderProductsList();
  };
}

function refreshProductCollectionSelects(){
  const sel = document.getElementById("pCollection");
  sel.innerHTML = `<option value="">Select collection (optional)</option>` +
    collections.filter(c=>c.id!=="all").map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}

/***********************
 * CONTACT FORM (store)
 ***********************/
(function initContactHook(){
  document.getElementById("contactForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const n = document.getElementById("cuName").value.trim();
    const em= document.getElementById("cuEmail").value.trim();
    const m = document.getElementById("cuMsg").value.trim();
    if(!n || !em || !m) return;

    try{
      const to = settings.storeEmail || settings.adminEmail;
      if(to){
        await emailjs.send("service_opcf6cl", "template_4zrsdni", {
          to_email: to,
          subject: `Contact — ${n}`,
          message: `${m}\n\nFrom: ${n} (${em})`
        });
      }
      alert("Message sent!");
      e.target.reset();
    }catch(err){
      console.warn(err);
      alert("Could not send message right now.");
    }
  });
})();

/***********************
 * PAGE ROUTER
 ***********************/
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.documentElement.getAttribute("data-page");
  applyThemeLive();

  if(page==="store"){
    initStore();
  }
  if(page==="admin"){
    initAdmin();
  }
});
