// script.js - store + admin unified logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --------- YOUR FIREBASE CONFIG (the one you provided) ----------
const firebaseConfig = {
  apiKey: "AIzaSyBkQ5oE3LaiFGa2ir98MKjZzJ_ZTWQ08Cc",
  authDomain: "myshop-store-bbb1b.firebaseapp.com",
  projectId: "myshop-store-bbb1b",
  storageBucket: "myshop-store-bbb1b.firebasestorage.app",
  messagingSenderId: "292866448884",
  appId: "1:292866448884:web:899267f534f8344b086da1"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// --------- EmailJS init (public key) ----------
window.emailjs?.init("RN5H1CcY7Fqkakg5w");
const EMAIL = { service: "service_opcf6cl", tplAdmin: "template_4zrsdni", tplCustomer: "template_zc87bdl" };

// --------- Cloudinary ----------
const CLOUD = { name: "desbqctik", preset: "myshop_preset" };

// ---------- helpers ----------
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const money = (n)=>"₦"+(Number(n||0)).toLocaleString();
const ls = { get:(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def}catch{return def}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };

// ---------- state ----------
const state = {
  settings: null,
  products: [],
  cart: ls.get("cart", []),
  shippingBlocks: [],
};

// ---------- apply theme ----------
function applyTheme(theme){
  if(!theme) return;
  document.documentElement.style.setProperty('--bg', theme.bg || '#ffffff');
  document.documentElement.style.setProperty('--text', theme.text || '#0b1220');
  document.documentElement.style.setProperty('--btn', theme.button || '#0b1220');
  document.documentElement.style.setProperty('--btn-text', theme.buttonText || '#fff');
}

// ---------- Firestore refs ----------
const settingsRef = doc(db, "settings", "store");
const productsCol = collection(db, "products");
const ordersCol = collection(db, "orders");
const usersCol = collection(db, "users");

// ---------- ensure default settings ----------
async function ensureSettings(){
  const snap = await getDoc(settingsRef);
  if(!snap.exists()){
    const defaults = {
      storeName: "Essysessentials",
      tagline: "Quality essentials for everyday",
      announcement: "Welcome to Essysessentials!",
      contactEmail: "",
      contactPhone: "",
      whatsapp: "",
      logoUrl: "assets/logo.jpg",
      theme: { bg:"#ffffff", text:"#0b1220", button:"#0b1220", buttonText:"#ffffff" },
      shippingBlocks: [
        {id: "sb1", title:"Lagos Mainland", desc:"Delivery fee ₦2,000. Delivered in 2 days."},
        {id: "sb2", title:"Outside Lagos", desc:"Fees depend on parcel size. We will confirm after you enter address."}
      ],
      bank: { accountName:"", accountNumber:"", bankName:"" },
      updatedAt: serverTimestamp()
    };
    await setDoc(settingsRef, defaults);
    return defaults;
  }
  return snap.data();
}

// ---------- Cloudinary upload ----------
async function uploadToCloudinary(file){
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUD.preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.name}/image/upload`, { method:"POST", body:form });
  const data = await res.json();
  if(!data.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}

// ---------- cart helpers ----------
function saveCart(){ ls.set("cart", state.cart); updateCartBadge(); }
function updateCartBadge(){ const el=$("#cartCount"); if(el) el.textContent = state.cart.reduce((a,c)=>a+c.qty,0); }
function addToCart(prod, opts = {}){
  if(prod.stock<=0){ alert("Out of stock"); return; }
  const key = `${prod.id}|${opts.color||""}|${opts.size||""}`;
  const idx = state.cart.findIndex(i=>i.key===key);
  if(idx>-1) state.cart[idx].qty += opts.qty||1;
  else state.cart.push({ key, id:prod.id, name:prod.name, price:prod.price, color:opts.color||null, size:opts.size||null, image:(prod.images?.[0]||"assets/placeholder.jpg"), qty:opts.qty||1 });
  saveCart();
}

// ---------- UI: store init ----------
async function initStore(){
  await ensureSettings();

  // live settings
  onSnapshot(settingsRef, snap=>{
    state.settings = snap.data();
    applyTheme(state.settings.theme);
    $("#storeName").textContent = state.settings.storeName || "Essysessentials";
    $("#storeTag").textContent = state.settings.tagline || "";
    $("#announcementBar").textContent = state.settings.announcement || "";
    $("#storeLogo").src = state.settings.logoUrl || "assets/logo.jpg";
    if(state.settings.whatsapp) $("#waFloat").href = `https://wa.me/${state.settings.whatsapp}`;
    $("#contactEmail").textContent = state.settings.contactEmail||"";
    $("#contactEmail").href = `mailto:${state.settings.contactEmail||""}`;
    $("#contactPhone").textContent = state.settings.contactPhone||"";
    $("#contactPhone").href = `tel:${state.settings.contactPhone||""}`;

    // shipping blocks
    state.shippingBlocks = state.settings.shippingBlocks || [];
    renderShippingBlocks();
  });

  // products (live)
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), snap=>{
    state.products = [];
    const cats = new Set();
    snap.forEach(d=>{
      const p = { id:d.id, ...d.data() };
      state.products.push(p);
      if(p.collection) cats.add(p.collection);
    });
    renderFilters(Array.from(cats));
    renderProducts(state.products);
  });

  // search/filter
  $("#searchInput").addEventListener("input", ()=>filterRender());
  $("#collectionFilter").addEventListener("change", ()=>filterRender());

  // cart UI
  updateCartBadge();
  $("#cartBtn").addEventListener("click", ()=>openCartModal());
  $("#continueShopping")?.addEventListener("click", ()=>$("#cartModal").close());
  $("#returnToShop")?.addEventListener("click", ()=>$("#cartModal").close());
  $("#proceedToCheckout")?.addEventListener("click", ()=>{ $("#cartModal").close(); openCheckout(); });

  // year
  const y = new Date().getFullYear();
  $("#year") && ($("#year").textContent = y);
}

function renderFilters(cats){
  const sel = $("#collectionFilter");
  if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">All categories</option>`;
  cats.forEach(c=>{ const o = document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o); });
  sel.value = cur || "";
}

function filterRender(){
  const q = $("#searchInput").value.toLowerCase().trim();
  const c = $("#collectionFilter").value;
  const list = state.products.filter(p=>{
    const matchQ = !q || (p.name?.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
    const matchC = !c || p.collection===c;
    return matchQ && matchC;
  });
  renderProducts(list);
}

function renderProducts(list){
  const grid = $("#productsGrid");
  grid.innerHTML = list.map(p=>{
    const out = p.stock<=0 ? `<div class="out">Out of stock</div>` : "";
    return `<article class="card product" data-id="${p.id}">
      <div class="imgwrap">${out}<img src="${(p.images?.[0])||'assets/placeholder.jpg'}" alt="${p.name}"/></div>
      <h4>${p.name}</h4>
      <div class="row"><span class="price">${money(p.price)}</span><button class="btn add-btn" data-id="${p.id}" ${p.stock<=0?"disabled":""}>Add</button></div>
    </article>`;
  }).join("");
  // wire
  $$(".product").forEach(el=>{
    const id = el.dataset.id;
    const p = state.products.find(x=>x.id===id);
    el.querySelector("img").addEventListener("click", ()=>openProductModal(p));
    el.querySelector("h4").addEventListener("click", ()=>openProductModal(p));
    const add = el.querySelector(".add-btn");
    add && add.addEventListener("click", e=>{
      e.stopPropagation();
      addToCart(p,{qty:1});
      alert("Added to cart");
    });
  });
}

function openProductModal(p){
  const dlg = $("#productModal");
  $("#pmName").textContent = p.name;
  $("#pmPrice").textContent = money(p.price);
  $("#pmDesc").textContent = p.description||"";
  $("#pmImage").src = (p.images?.[0])||"assets/placeholder.jpg";
  $("#pmThumbs").innerHTML = (p.images||[]).map(u=>`<img src="${u}"/>`).join("");
  $("#pmStockWrap").innerHTML = `<small class="muted">${p.stock>0?`In stock: ${p.stock}`:"Out of stock"}</small>`;

  // colors & sizes
  const cw = $("#pmColors"); cw.innerHTML = ""; (p.colors||[]).forEach(c=>{
    const b = document.createElement("button"); b.type="button"; b.className="opt"; b.textContent = c;
    b.addEventListener("click", ()=>{ cw.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
    cw.appendChild(b);
  });
  const sw = $("#pmSizes"); sw.innerHTML = ""; (p.sizes||[]).forEach(s=>{
    const b = document.createElement("button"); b.type="button"; b.className="opt"; b.textContent = s;
    b.addEventListener("click", ()=>{ sw.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
    sw.appendChild(b);
  });

  // qty
  const qty = $("#pmQty"); qty.value = 1;
  $$(".qty-btn").forEach(b=>b.onclick = ()=>{
    const a = b.dataset.action; let v = Number(qty.value||1);
    if(a==="inc") v++; if(a==="dec") v = Math.max(1, v-1); qty.value = v;
  });

  $("#pmAddToCart").onclick = ()=>{
    const color = $("#pmColors").querySelector(".opt.active")?.textContent || null;
    const size = $("#pmSizes").querySelector(".opt.active")?.textContent || null;
    const q = Number($("#pmQty").value||1);
    addToCart(p, { color, size, qty: q });
    dlg.close();
    openCartModal();
  };
  dlg.showModal();
}

// ---------- Cart modal ----------
function openCartModal(){
  const dlg = $("#cartModal");
  const wrap = $("#cartItems");
  wrap.innerHTML = "";
  if(state.cart.length===0){
    $("#cartEmpty").style.display = "block";
  } else {
    $("#cartEmpty").style.display = "none";
    state.cart.forEach((it, idx)=>{
      const row = document.createElement("div"); row.className = "card";
      row.innerHTML = `<div class="item-row"><img src="${it.image}" style="width:70px;height:70px;object-fit:cover;border-radius:8px"/><div style="flex:1;margin-left:8px"><strong>${it.name}</strong><div class="muted">${[it.color||"",it.size||""].filter(Boolean).join(" • ")}</div><div class="row" style="margin-top:8px"><div><button class="btn" data-a="dec">−</button><span style="padding:0 8px">${it.qty}</span><button class="btn" data-a="inc">+</button></div><strong>${money(it.price*it.qty)}</strong></div></div><div><button class="btn danger" data-a="del">Delete</button></div></div>`;
      row.querySelector('[data-a="dec"]').onclick = ()=>{ it.qty = Math.max(1, it.qty-1); saveCart(); openCartModal(); };
      row.querySelector('[data-a="inc"]').onclick = ()=>{ it.qty++; saveCart(); openCartModal(); };
      row.querySelector('[data-a="del"]').onclick = ()=>{ state.cart.splice(idx,1); saveCart(); openCartModal(); };
      wrap.appendChild(row);
    });
  }
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartModal").showModal();
}

// ---------- Shipping blocks render ----------
function renderShippingBlocks(){
  const host = $("#shippingBlocks");
  if(!host) return;
  host.innerHTML = "";
  state.shippingBlocks.forEach((b, i)=>{
    const el = document.createElement("label");
    el.className = "shipping-block";
    el.innerHTML = `<input type="radio" name="shippingBlock" value="${b.id}" ${i===0?"checked":""} style="display:none"/><div class="title">${b.title}</div><div class="desc">${b.desc}</div>`;
    el.addEventListener("click", ()=>{ $$("label.shipping-block").forEach(lb=>lb.classList.remove("selected")); el.classList.add("selected"); });
    host.appendChild(el);
  });
}

// ---------- Checkout ----------
function openCheckout(){
  if(state.cart.length===0){ alert("Your cart is empty"); return; }
  const dlg = $("#checkoutModal");
  // fill summary
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  $("#summarySubtotal").textContent = money(subtotal);
  // shipping default 0; admin will set shipping blocks text (they include fees in desc)
  $("#summaryShipping").textContent = money(0);
  $("#summaryTotal").textContent = money(subtotal);

  // fill bank details
  const bank = state.settings?.bank || {};
  $("#bankDetails").innerHTML = `<div><strong>Account name:</strong> ${bank.accountName||"—"}</div><div><strong>Account number:</strong> ${bank.accountNumber||"—"}</div><div><strong>Bank:</strong> ${bank.bankName||"—"}</div>`;

  // shipping selection listener
  $("#shippingBlocks").onclick = ()=> {
    // leave calculation to manual admin text; by default we set shipping 0 and admin will update order with fee if needed
    const selected = $("#shippingBlocks input[name='shippingBlock']:checked");
    if(selected){
      const id = selected.value;
      const block = state.shippingBlocks.find(b=>b.id===id);
      if(block && block.desc){
        // if admin inserted a fee in text like "₦2000" we can't reliably parse; we leave total for admin to confirm later if "address not listed"
        $("#summaryShipping").textContent = money(0);
        $("#summaryTotal").textContent = money(subtotal);
      }
    }
  };

  // show/hide custom address & payment rules
  $("#checkoutForm").onsubmit = async (e)=>{
    e.preventDefault();
    try{
      const fd = new FormData(e.target);
      const name = fd.get("name"); const email = fd.get("email"); const phone = fd.get("phone"); const address = fd.get("address");
      const selected = $("#shippingBlocks input[name='shippingBlock']:checked")?.value || null;
      const shippingBlock = state.shippingBlocks.find(b=>b.id===selected) || null;
      // check if user indicated "address not listed" by picking a shipping block with title containing "not" or manually if admin created a block named accordingly; to be strict, admin should add a block titled exactly "Address not listed" to allow custom flow.
      const isAddressNotListed = shippingBlock && /not listed/i.test(shippingBlock.title);
      const isStockpile = shippingBlock && /stockpile/i.test(shippingBlock.title);

      // payment proof only required if not address-not-listed and not stockpile
      let paymentProofUrl = "";
      if(!(isAddressNotListed || isStockpile)){
        const file = $("#paymentProofInput").files?.[0];
        if(!file){ alert("Please upload payment proof or choose a shipping block that allows deferred payment."); return; }
        paymentProofUrl = await uploadToCloudinary(file);
      }

      const items = state.cart.map(c=>({ productId:c.id, name:c.name, price:c.price, qty:c.qty, color:c.color, size:c.size }));
      const subtotalNow = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
      const order = {
        items, subtotal: subtotalNow, customer:{name,email,phone,address},
        shippingBlock: shippingBlock ? { id:shippingBlock.id, title:shippingBlock.title, desc:shippingBlock.desc } : null,
        customAddress: fd.get("customAddress")||"",
        paymentProofUrl, status: (isAddressNotListed||isStockpile) ? "Pending Delivery Fee" : "Awaiting Confirmation",
        stockpile: !!isStockpile,
        addressNotListed: !!isAddressNotListed,
        createdAt: serverTimestamp()
      };

      // save order
      const ref = await addDoc(ordersCol, order);

      // deduct stock except stockpile
      if(!order.stockpile){
        for(const it of state.cart){
          const pRef = doc(db,"products", it.id);
          const pSnap = await getDoc(pRef);
          if(pSnap.exists()){
            const cur = pSnap.data().stock || 0;
            await updateDoc(pRef, { stock: Math.max(0, cur - it.qty) });
          }
        }
      }

      // send emails
      const order_items = order.items.map(x=>`${x.name} x${x.qty}`).join("\n");
      const payload = {
        customer_name: order.customer.name,
        order_id: ref.id,
        delivery_address: order.customAddress || order.customer.address,
        shipping_method: order.shippingBlock?.title || "—",
        shipping_fee: "See admin note",
        order_items,
        total_amount: money(order.subtotal)
      };
      try{ await window.emailjs.send(EMAIL.service, EMAIL.tplCustomer, payload); await window.emailjs.send(EMAIL.service, EMAIL.tplAdmin, payload); }catch(e){ console.warn("EmailJS send error", e); }

      // clear
      state.cart = []; saveCart();
      alert("Order placed. Admin will contact you for delivery fee if necessary.");
      $("#checkoutModal").close();
      $("#cartModal").close();
    }catch(err){
      console.error(err); alert("Error placing order: "+err.message);
    }
  };

  $("#backToCart").onclick = ()=>{ $("#checkoutModal").close(); $("#cartModal").showModal(); };
  dlg.showModal();
}

// ---------- ADMIN initialization ----------
async function initAdmin(){
  await ensureSettings();

  // wire sidebar
  $$(".side-btn").forEach(b=>b.onclick = ()=>{
    $$(".side-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    $$(".admin-tab").forEach(t=>t.classList.remove("active"));
    const id = b.dataset.page;
    document.getElementById(id).classList.add("active");
  });

  // live settings snapshot
  onSnapshot(settingsRef, snap=>{
    state.settings = snap.data();
    applyTheme(state.settings.theme);
    // populate admin forms
    $("#announcementInput").value = state.settings.announcement || "";
    const sp = $("#storeProfileForm");
    if(sp){
      sp.storeName.value = state.settings.storeName || "";
      sp.tagline.value = state.settings.tagline || "";
      sp.contactEmail.value = state.settings.contactEmail || "";
      sp.contactPhone.value = state.settings.contactPhone || "";
      sp.whatsapp.value = state.settings.whatsapp || "";
    }
    // shipping blocks list UI
    renderShippingBlocksList();
    // bank
    const bk = state.settings.bank || {};
    $("#bankForm").accountName.value = bk.accountName || "";
    $("#bankForm").accountNumber.value = bk.accountNumber || "";
    $("#bankForm").bankName.value = bk.bankName || "";
  });

  // products list live
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), snap=>{
    const arr = [];
    snap.forEach(d=>arr.push({ id:d.id, ...d.data() }));
    renderAdminProductsList(arr);
    $("#statProducts").textContent = arr.length;
    state.products = arr;
  });

  // orders live
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), snap=>{
    const arr = [];
    snap.forEach(d=>arr.push({ id:d.id, ...d.data() }));
    renderOrdersAdmin(arr);
    $("#statOrders").textContent = arr.length;
    $("#statPending").textContent = arr.filter(o=>o.status && /pending/i.test(o.status)).length;
  });

  // customers list (derive from orders)
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), snap=>{
    const m = {};
    snap.forEach(d=>{
      const o = d.data();
      if(o.customer && o.customer.email){
        m[o.customer.email] = o.customer;
      }
    });
    const customers = Object.values(m);
    const host = $("#customersList"); host.innerHTML = customers.map(c=>`<div class="item"><div><strong>${c.name}</strong><div class="muted">${c.phone||""}</div></div><div><a href="mailto:${c.email}">${c.email}</a></div></div>`).join("");
  });

  // ANNOUNCEMENT save
  $("#saveAnnouncement").onclick = async ()=>{ await updateDoc(settingsRef,{ announcement: $("#announcementInput").value, updatedAt: serverTimestamp() }); alert("Saved"); };

  // Theme save
  $("#themeForm").onsubmit = async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const theme = { bg: fd.get("bg"), text: fd.get("text"), button: fd.get("button"), buttonText: fd.get("buttonText") }; await updateDoc(settingsRef, { theme, updatedAt: serverTimestamp() }); applyTheme(theme); alert("Theme saved"); };

  // store profile save + logo upload
  $("#storeProfileForm").onsubmit = async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); let logoUrl = state.settings.logoUrl || "assets/logo.jpg"; const file = $("#logoUpload").files?.[0]; if(file) logoUrl = await uploadToCloudinary(file); const payload = { storeName: fd.get("storeName")||"", tagline: fd.get("tagline")||"", contactEmail: fd.get("contactEmail")||"", contactPhone: fd.get("contactPhone")||"", whatsapp: fd.get("whatsapp")||"", logoUrl }; await updateDoc(settingsRef, {...payload, updatedAt: serverTimestamp()}); alert("Profile saved"); };

  // Shipping blocks management
  $("#addShipBlock").onclick = async (e)=>{
    e.preventDefault();
    const id = "sb_"+Math.random().toString(36).slice(2,9);
    const title = $("#shipTitle").value.trim();
    const desc = $("#shipDesc").value.trim();
    if(!title || !desc){ alert("Fill both title and description"); return; }
    const blocks = [...(state.settings.shippingBlocks || [])];
    blocks.push({ id, title, desc });
    await updateDoc(settingsRef,{ shippingBlocks: blocks, updatedAt: serverTimestamp() });
    $("#shipTitle").value = ""; $("#shipDesc").value = "";
  };

  $("#shippingBlockForm").onsubmit = (e)=>e.preventDefault();

  // shipping blocks list render (admin)
  function renderShippingBlocksList(){
    const host = $("#shippingBlocksList");
    if(!host) return;
    host.innerHTML = (state.settings.shippingBlocks || []).map((b, i)=>`<div class="tag"><strong>${b.title}</strong><div class="muted" style="max-width:240px">${b.desc}</div><div style="margin-top:6px"><button class="btn" data-edit="${b.id}">Edit</button> <button class="btn danger" data-del="${b.id}">Delete</button></div></div>`).join("");
    host.querySelectorAll("[data-del]").forEach(btn=>btn.onclick = async ()=>{ if(!confirm("Delete this block?")) return; const blocks = (state.settings.shippingBlocks||[]).filter(x=>x.id!==btn.dataset.del); await updateDoc(settingsRef,{ shippingBlocks: blocks, updatedAt: serverTimestamp() }); });
    host.querySelectorAll("[data-edit]").forEach(btn=>{
      btn.onclick = ()=>{ const b = (state.settings.shippingBlocks||[]).find(x=>x.id===btn.dataset.edit); if(!b) return; $("#shipTitle").value = b.title; $("#shipDesc").value = b.desc; /* on save we'll just delete old & add new for simplicity */ };
    });
  }

  // bank form
  $("#bankForm").onsubmit = async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const bank = { accountName: fd.get("accountName")||"", accountNumber: fd.get("accountNumber")||"", bankName: fd.get("bankName")||"" }; await updateDoc(settingsRef,{ bank, updatedAt: serverTimestamp() }); alert("Bank saved"); };

  // PRODUCT form logic
  const colors = []; const sizes = []; let uploadUrls = [];
  $("#addColor").onclick = ()=>{ const v = $("#colorInput").value.trim(); if(!v) return; colors.push(v); $("#colorInput").value=""; $("#colorTags").innerHTML = colors.map((c,i)=>`<span class="tag">${c} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); $$("#colorTags button").forEach(btn=>btn.onclick = ()=>{ colors.splice(Number(btn.dataset.i),1); $("#colorTags").innerHTML = colors.map((c,i)=>`<span class="tag">${c} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); }); };
  $("#addSize").onclick = ()=>{ const v = $("#sizeInput").value.trim(); if(!v) return; sizes.push(v); $("#sizeInput").value=""; $("#sizeTags").innerHTML = sizes.map((c,i)=>`<span class="tag">${c} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); $$("#sizeTags button").forEach(btn=>btn.onclick = ()=>{ sizes.splice(Number(btn.dataset.i),1); $("#sizeTags").innerHTML = sizes.map((c,i)=>`<span class="tag">${c} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); }); };

  // upload preview
  $("#productImages").addEventListener("change", async (e)=>{
    uploadUrls = [];
    $("#uploadPreview").innerHTML = "Uploading...";
    const files = [...e.target.files];
    const out = [];
    for(const f of files){
      const url = await uploadToCloudinary(f);
      uploadUrls.push(url);
      out.push(`<img src="${url}"/>`);
    }
    $("#uploadPreview").innerHTML = out.join("");
  });

  // save product
  $("#productForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get("name")||"",
      price: Number(fd.get("price")||0),
      originalCost: Number(fd.get("originalCost")||0),
      description: fd.get("description")||"",
      stock: Number(fd.get("stock")||0),
      collection: fd.get("collection")||"",
      colors: [...colors],
      sizes: [...sizes],
      images: [...uploadUrls],
      createdAt: serverTimestamp()
    };
    await addDoc(productsCol, payload);
    alert("Product added");
    e.target.reset(); colors.length=0; sizes.length=0; uploadUrls=[];
    $("#colorTags").innerHTML=""; $("#sizeTags").innerHTML=""; $("#uploadPreview").innerHTML="";
  };

  $("#resetProductForm").onclick = ()=>{ $("#productForm").reset(); colors.length=0; sizes.length=0; uploadUrls=[]; $("#colorTags").innerHTML=""; $("#sizeTags").innerHTML=""; $("#uploadPreview").innerHTML=""; };

  // render product list
  function renderAdminProductsList(arr){
    const host = $("#productsList");
    host.innerHTML = arr.map(p=>`<div class="item"><img src="${(p.images?.[0])||'assets/placeholder.jpg'}" style="width:64px;height:64px;object-fit:cover;border-radius:8px"/><div style="flex:1;margin-left:8px"><strong>${p.name}</strong><div class="muted">${money(p.price)} · Stock: ${p.stock}</div></div><div><button class="btn" data-edit="${p.id}">Edit</button> <button class="btn danger" data-del="${p.id}">Delete</button></div></div>`).join("");
    host.querySelectorAll("[data-del]").forEach(b=>b.onclick= async ()=>{ if(!confirm("Delete product?")) return; await deleteDoc(doc(db,"products",b.dataset.del)); });
    host.querySelectorAll("[data-edit]").forEach(b=>b.onclick= async ()=>{
      const pSnap = await getDoc(doc(db,"products",b.dataset.edit));
      if(!pSnap.exists()) return;
      const p = pSnap.data(); // populate form for editing (simple approach: delete & re-add on save)
      $("#productForm").name.value = p.name||""; $("#productForm").price.value = p.price||0; $("#productForm").originalCost.value = p.originalCost||0; $("#productForm").description.value = p.description||""; $("#productForm").stock.value = p.stock||0; $("#productForm").collection.value = p.collection||"";
      // set tags
      colors.length=0; sizes.length=0; uploadUrls = p.images||[];
      (p.colors||[]).forEach(x=>colors.push(x)); (p.sizes||[]).forEach(x=>sizes.push(x));
      $("#colorTags").innerHTML = colors.map((c,i)=>`<span class="tag">${c}</span>`).join("");
      $("#sizeTags").innerHTML = sizes.map((c,i)=>`<span class="tag">${c}</span>`).join("");
      $("#uploadPreview").innerHTML = (uploadUrls||[]).map(u=>`<img src="${u}"/>`).join("");
      // simple edit flow: delete old and allow save to create new (or you can implement updateDoc)
      if(confirm("You are now editing this product. After changing fields press Save to create a new product and remove the old one.")){
        await deleteDoc(doc(db,"products",b.dataset.edit));
      }
    });
  }

  // orders admin render & note writing
  function renderOrdersAdmin(orders){
    const host = $("#ordersList");
    if(!orders.length){ host.innerHTML = `<div class="empty">No orders yet</div>`; return; }
    host.innerHTML = orders.map(o=>{
      const items = (o.items||[]).map(i=>`${i.name} x${i.qty}${i.color?` (${i.color}`:""}${i.size?` ${i.size}`:""}`).join(", ");
      const note = o.adminNote || "";
      return `<div class="item"><img src="${(o.items?.[0]?.image)||'assets/placeholder.jpg'}" style="width:64px;height:64px;object-fit:cover;border-radius:8px"/><div style="flex:1;margin-left:8px"><strong>${o.customer?.name||"—"}</strong><div class="muted">${items}</div><div class="muted">Status: <strong>${o.status||"—"}</strong></div><div style="margin-top:6px">Shipping: <strong>${o.shippingBlock?.title||"—"}</strong><div class="muted">${o.shippingBlock?.desc||""}</div></div><div style="margin-top:6px"><textarea data-note="${o.id}" placeholder="Write admin note...">${note}</textarea><div class="row" style="margin-top:6px"><select data-status="${o.id}">${["Pending Delivery Fee","Awaiting Confirmation","Processing","Completed","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select><button class="btn" data-save="${o.id}">Save</button></div></div></div><div><button class="btn danger" data-del="${o.id}">Delete</button></div></div>`;
    }).join("");
    host.querySelectorAll("[data-save]").forEach(b=>b.onclick = async ()=>{
      const id = b.dataset.save;
      const st = host.querySelector(`[data-status="${id}"]`).value;
      const note = host.querySelector(`[data-note="${id}"]`).value;
      await updateDoc(doc(db,"orders",id), { status: st, adminNote: note });
      alert("Updated");
    });
    host.querySelectorAll("[data-del]").forEach(b=>b.onclick = async ()=>{ if(!confirm("Delete order?")) return; await deleteDoc(doc(db,"orders",b.dataset.del)); });
  }
}

// ---------- Router: init correct page ----------
const page = document.body.getAttribute("data-page");
if(page==="store") initStore();
if(page==="admin") initAdmin();

// ---------- END ----------
