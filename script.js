// script.js - unified store + admin
// Expects: index.html (data-page=store) or admin.html (data-page=admin)
// Uses Firebase v9 modular, Cloudinary unsigned preset, EmailJS

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ---------- CONFIG (use your Firebase config here) ----------
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
const auth = getAuth(app);

// EmailJS
if(window.emailjs) window.emailjs.init("RN5H1CcY7Fqkakg5w");
const EMAIL = { service: "service_opcf6cl", tplCustomer: "template_zc87bdl", tplAdmin: "template_4zrsdni" };

// Cloudinary
const CLOUD = { name: "desbqctik", preset: "myshop_preset" };

// Helpers
const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const money = n=>"₦"+(Number(n||0)).toLocaleString();
const ls = { get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };
const uidNum = ()=>Math.floor(Date.now() + Math.random()*1000); // numeric order id

// Firestore refs
const settingsRef = doc(db,"settings","store");
const productsCol = collection(db,"products");
const ordersCol   = collection(db,"orders");
const collectionsCol = collection(db,"collections");
const couponsCol = collection(db,"coupons");
const subscribersCol = collection(db,"subscribers");

// Global state
const state = { settings:null, products:[], cart: ls.get("cart", []), shippingBlocks:[], collections:[], coupons:[] };

// Apply theme
function applyTheme(theme){
  if(!theme) return;
  document.documentElement.style.setProperty('--bg', theme.bg || '#ffffff');
  document.documentElement.style.setProperty('--text', theme.text || '#0b1220');
  document.documentElement.style.setProperty('--btn', theme.button || '#0b1220');
  document.documentElement.style.setProperty('--btn-text', theme.buttonText || '#fff');
  if(theme.font) document.documentElement.style.setProperty('--font-family', theme.font);
}

// Toast
function showToast(msg, t=2000){
  const el = $("#toast"); if(!el) return;
  el.textContent = msg; el.style.display = "block"; el.style.opacity = 1;
  setTimeout(()=>{ el.style.transition="opacity .25s"; el.style.opacity = 0; setTimeout(()=>el.style.display="none",300); }, t);
}

// Cloudinary upload
async function uploadToCloudinary(file){
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUD.preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.name}/image/upload`, { method:"POST", body: form });
  const data = await res.json();
  if(!data.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}

// Ensure default settings in Firestore
async function ensureSettings(){
  const snap = await getDoc(settingsRef);
  if(!snap.exists()){
    const def = {
      storeName: "Essysessentials",
      tagline: "Quality essentials for everyday",
      announcement: "Welcome to Essysessentials!",
      announcementPopup: { on: true, title: "Hello", body: "Shipping days are Monday & Friday" },
      contactEmail: "",
      contactPhone: "",
      whatsapp: "",
      logoUrl: "assets/logo.jpg",
      bannerUrl: null,
      theme: { bg:"#ffffff", text:"#0b1220", button:"#0b1220", buttonText:"#ffffff", font: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial" },
      shippingBlocks: [
        { id:"sb_lagos_main", title:"Lagos Mainland", fee:2000, desc:"Delivery fee ₦2,000; 1-2 days." },
        { id:"sb_lagos_island", title:"Lagos Island", fee:2500, desc:"Delivery fee ₦2,500; 1-2 days." },
        { id:"sb_outside", title:"Outside Lagos", fee:4000, desc:"Delivery fees vary; admin will confirm." },
        { id:"sb_pickup", title:"Pickup", fee:0, desc:"Free pickup at store." },
        { id:"sb_address_not_listed", title:"Address not listed", fee:0, desc:"Admin will contact you to confirm fee." },
        { id:"sb_stockpile", title:"Stockpile", fee:0, desc:"Reserve items to pay later." }
      ],
      bank: { accountName:"", accountNumber:"", bankName:"" },
      updatedAt: serverTimestamp()
    };
    await setDoc(settingsRef, def);
    return def;
  }
  return snap.data();
}

// Cart functions
function saveCart(){ ls.set("cart", state.cart); updateCartBadge(); }
function updateCartBadge(){ const el=$("#cartCount"); if(el) el.textContent = state.cart.reduce((a,c)=>a+c.qty,0); }
function addToCart(prod, opts={}){ if(prod.stock<=0){ alert("Out of stock"); return; } const key = `${prod.id}|${opts.color||""}|${opts.size||""}`; const idx = state.cart.findIndex(i=>i.key===key); if(idx>-1) state.cart[idx].qty += opts.qty||1; else state.cart.push({ key, id:prod.id, name:prod.name, price:prod.price, color:opts.color||null, size:opts.size||null, image:(prod.images?.[0]||"assets/placeholder.jpg"), qty:opts.qty||1 }); saveCart(); showToast("Added to cart ✅"); }

// ROUTER init
const page = document.body.getAttribute("data-page");
if(page==="store") initStore();
if(page==="admin") initAdmin();

// ------------- STORE -------------
function initStore(){
  // Ensure settings and live updates
  ensureSettings().then(()=>{});
  onSnapshot(settingsRef, snap=>{ state.settings = snap.data(); applyTheme(state.settings.theme); // fill UI
    $("#storeName").textContent = state.settings.storeName || "Essysessentials";
    $("#storeTag").textContent = state.settings.tagline || "";
    $("#announcementBanner").textContent = state.settings.announcement || "";
    $("#announcementBlock").innerHTML = `<div style="font-weight:700;padding:10px">${state.settings.announcement||""}</div>`;
    $("#storeLogo").src = state.settings.logoUrl || "assets/logo.jpg";
    if(state.settings.bannerUrl) { /* optionally show banner */ }
    if(state.settings.whatsapp) $("#waFloat").href = `https://wa.me/${state.settings.whatsapp}`;
    $("#contactEmail").textContent = state.settings.contactEmail||"";
    $("#contactEmail").href = `mailto:${state.settings.contactEmail||""}`;
    $("#contactPhone").textContent = state.settings.contactPhone||"";
    $("#contactPhone").href = `tel:${state.settings.contactPhone||""}`;
    state.shippingBlocks = state.settings.shippingBlocks || [];
    renderShippingBlocks();
    // popup config
    popupConfig = state.settings.announcementPopup || { on: false };
    if(popupConfig.on && !sessionStorage.getItem("popupSeen")) showPopupOnce();
  });

  // Products live
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), snap=>{
    state.products = [];
    const cats = new Set();
    snap.forEach(d=>{ const p = { id:d.id, ...d.data() }; state.products.push(p); if(p.collection) cats.add(p.collection); });
    renderFilters(Array.from(cats));
    renderCollections(Array.from(cats));
    renderProducts(state.products);
  });

  // Collections live
  onSnapshot(query(collectionsCol, orderBy("name")), snap=>{
    state.collections = []; snap.forEach(d=>state.collections.push({ id:d.id, ...d.data() })); renderCollectionsUI();
  });

  // Coupons live
  onSnapshot(query(couponsCol, orderBy("code")), snap=>{ state.coupons = []; snap.forEach(d=>state.coupons.push({ id:d.id, ...d.data() })); });

  // UI events
  $("#searchInput")?.addEventListener("input", ()=>filterRender());
  $("#collectionFilter")?.addEventListener("change", ()=>filterRender());
  $("#cartBtn")?.addEventListener("click", openCartModal);
  $("#returnToShop")?.addEventListener("click", ()=>$("#cartModal").close());
  $("#continueShopping")?.addEventListener("click", ()=>$("#cartModal").close());
  $("#proceedToCheckout")?.addEventListener("click", ()=>{ $("#cartModal").close(); openCheckout(); });
  $("#clearCartBtn")?.addEventListener("click", ()=>{ if(confirm("Clear cart?")){ state.cart=[]; saveCart(); openCartModal(); } });

  updateCartBadge();
  $("#year") && ($("#year").textContent = (new Date()).getFullYear());
}

// render functions - store
function renderFilters(cats){
  const sel = $("#collectionFilter"); if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">All collections</option>`;
  cats.forEach(c=>{ const o=document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o); });
  sel.value = cur || "";
}
function renderCollections(cats){
  const host = $("#collectionsList"); if(!host) return;
  host.innerHTML = cats.map(c=>`<button class="collection-btn" data-c="${c}">${c}</button>`).join("");
  $$(".collection-btn").forEach(b=>b.onclick = ()=>{ $("#collectionFilter").value = b.dataset.c; filterRender(); });
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
function productCard(p){
  return `<article class="card product" data-id="${p.id}">
    <div class="imgwrap">${p.stock<=0?'<div class="muted">Out of stock</div>':''}<img src="${(p.images?.[0])||'assets/placeholder.jpg'}" alt="${p.name}"/></div>
    <h4 style="user-select:text">${p.name}</h4>
    <div class="row"><span class="price">${money(p.price)}</span><button class="btn add-btn" data-id="${p.id}" ${p.stock<=0?"disabled":""}>Add</button></div>
  </article>`;
}
function renderProducts(list){
  const grid = $("#productsGrid"); grid.innerHTML = list.map(productCard).join("");
  $$(".product").forEach(el=>{
    const id = el.dataset.id;
    const p = state.products.find(x=>x.id===id);
    el.querySelector("img").addEventListener("click", ()=>openProductModal(p));
    el.querySelector("h4").addEventListener("click", ()=>openProductModal(p));
    const add = el.querySelector(".add-btn");
    add && add.addEventListener("click", e=>{ e.stopPropagation(); addToCart(p,{qty:1}); });
  });
}

// Product modal (carousel)
let pmIndex = 0, pmImages = [], pmProduct=null;
function openProductModal(p){
  pmProduct = p;
  pmImages = p.images || [];
  pmIndex = 0;
  $("#pmName").textContent = p.name;
  $("#pmPrice").textContent = money(p.price);
  $("#pmDesc").textContent = p.description || "";
  $("#pmImage").src = pmImages[0] || "assets/placeholder.jpg";
  $("#pmThumbs").innerHTML = (pmImages||[]).map((u,i)=>`<img src="${u}" data-i="${i}"/>`).join("");
  $("#pmStockWrap").innerHTML = `<small class="muted">${p.stock>0?`In stock: ${p.stock}`:"Out of stock"}</small>`;

  const cw = $("#pmColors"); cw.innerHTML=""; (p.colors||[]).forEach(c=>{ const b=document.createElement("button"); b.type="button"; b.className="opt"; b.textContent=c; b.addEventListener("click", ()=>{ cw.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); }); cw.appendChild(b); });
  const sw = $("#pmSizes"); sw.innerHTML=""; (p.sizes||[]).forEach(s=>{ const b=document.createElement("button"); b.type="button"; b.className="opt"; b.textContent=s; b.addEventListener("click", ()=>{ sw.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); }); sw.appendChild(b); });

  $("#pmPrev").onclick = ()=>{ if(pmImages.length===0) return; pmIndex = (pmIndex - 1 + pmImages.length) % pmImages.length; $("#pmImage").src = pmImages[pmIndex]; };
  $("#pmNext").onclick = ()=>{ if(pmImages.length===0) return; pmIndex = (pmIndex + 1) % pmImages.length; $("#pmImage").src = pmImages[pmIndex]; };
  $$("#pmThumbs img").forEach(t=>t.addEventListener("click", ()=>{ pmIndex=Number(t.dataset.i); $("#pmImage").src = pmImages[pmIndex]; }));

  $("#pmQty").value = 1;
  $$(".qty-btn").forEach(b=>b.onclick = ()=>{ const a = b.dataset.action; let v = Number($("#pmQty").value||1); if(a==="inc") v++; if(a==="dec") v = Math.max(1, v-1); $("#pmQty").value = v; });

  $("#pmAddToCart").onclick = ()=>{ const color = $("#pmColors").querySelector(".opt.active")?.textContent || null; const size = $("#pmSizes").querySelector(".opt.active")?.textContent || null; const q = Number($("#pmQty").value||1); addToCart(p,{color,size,qty:q}); $("#productModal").close(); };
  $("#pmBuyNow").onclick = ()=>{ const color = $("#pmColors").querySelector(".opt.active")?.textContent || null; const size = $("#pmSizes").querySelector(".opt.active")?.textContent || null; const q = Number($("#pmQty").value||1); addToCart(p,{color,size,qty:q}); $("#productModal").close(); openCartModal(); };

  $("#productModal").showModal();
}

// Cart modal
function openCartModal(){
  const dlg = $("#cartModal");
  const wrap = $("#cartItems");
  wrap.innerHTML = "";
  if(state.cart.length===0){ $("#cartEmpty").style.display="block"; } else {
    $("#cartEmpty").style.display="none";
    state.cart.forEach((it, idx)=>{
      const el = document.createElement("div"); el.className="item";
      el.innerHTML = `<img src="${it.image}" alt=""><div style="flex:1"><strong style="user-select:text">${it.name}</strong><div class="muted">${[it.color||"",it.size||""].filter(Boolean).join(" • ")}</div><div style="margin-top:8px" class="row"><div><button class="btn" data-a="dec">−</button><span style="padding:0 8px">${it.qty}</span><button class="btn" data-a="inc">+</button></div><strong>${money(it.price*it.qty)}</strong></div></div><div><button class="btn danger" data-a="del">Delete</button></div>`;
      el.querySelector('[data-a="dec"]').onclick = ()=>{ it.qty = Math.max(1, it.qty-1); saveCart(); openCartModal(); };
      el.querySelector('[data-a="inc"]').onclick = ()=>{ it.qty++; saveCart(); openCartModal(); };
      el.querySelector('[data-a="del"]').onclick = ()=>{ state.cart.splice(idx,1); saveCart(); openCartModal(); };
      wrap.appendChild(el);
    });
  }
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  $("#cartSubtotal").textContent = money(subtotal);
  dlg.showModal();
}

// Shipping blocks (store)
function renderShippingBlocks(){
  const host = $("#shippingBlocks"); if(!host) return;
  host.innerHTML = "";
  state.shippingBlocks.forEach((b, i)=>{
    const el = document.createElement("div"); el.className="shipping-block"; el.innerHTML = `<div class="title">${b.title}${b.fee?` · ${money(b.fee)}`:""}</div><div class="desc">${b.desc}</div>`;
    el.onclick = ()=>{
      $$(".shipping-block").forEach(x=>x.classList.remove("selected"));
      el.classList.add("selected");
      if(/not listed/i.test(b.title)) $("#customAddressWrap").style.display="block"; else $("#customAddressWrap").style.display="none";
      recalcSummary();
    };
    host.appendChild(el);
    if(i===0) el.classList.add("selected");
  });
}

// Checkout
function getSelectedShippingBlock(){
  const idx = Array.from($("#shippingBlocks").children).findIndex(c=>c.classList.contains("selected"));
  return state.shippingBlocks[idx] || null;
}
function recalcSummary(){
  const subtotal = state.cart.reduce((a,c)=>a+c.price*c.qty,0);
  const block = getSelectedShippingBlock();
  const fee = block && Number(block.fee || 0) || 0;
  $("#summarySubtotal").textContent = money(subtotal);
  $("#summaryShipping").textContent = money(fee);
  $("#summaryTotal").textContent = money(subtotal + fee);
}
function openCheckout(){
  if(state.cart.length===0){ alert("Cart is empty"); return; }
  const dlg = $("#checkoutModal");
  recalcSummary();
  const bank = state.settings?.bank || {};
  $("#bankAccountNumber").value = bank.accountNumber || "";
  $("#bankDetails").innerHTML = `<div><strong>Account name:</strong> ${bank.accountName||"—"}</div><div><strong>Bank:</strong> ${bank.bankName||"—"}</div>`;
  $("#checkoutForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get("name"); const email = fd.get("email"); const phone = fd.get("phone"); const address = fd.get("address");
    const customAddress = fd.get("customAddress") || "";
    const block = getSelectedShippingBlock();
    const isAddressNotListed = block && /not listed/i.test(block.title);
    const isStockpile = block && /stockpile/i.test(block.title);
    // payment proof required only if not address-not-listed and not stockpile
    let paymentProofUrl = "";
    if(!(isAddressNotListed || isStockpile)){
      const file = $("#paymentProofInput").files?.[0];
      if(!file){ alert("Please upload payment proof (or choose a shipping block that permits deferred payment)."); return; }
      paymentProofUrl = await uploadToCloudinary(file);
    }
    // build order
    const items = state.cart.map(c=>({ productId:c.id, name:c.name, price:c.price, qty:c.qty, color:c.color, size:c.size, image:c.image }));
    const subtotal = state.cart.reduce((a,c)=>a + c.price*c.qty,0);
    const fee = Number(block?.fee || 0);
    const total = subtotal + fee;
    const orderId = uidNum(); // numeric
    const order = {
      orderId, items, subtotal, shippingBlock: block || null, customAddress, paymentProofUrl,
      total, customer: { name, email, phone, address }, status: (isAddressNotListed||isStockpile) ? "Pending Delivery Fee" : "Awaiting Confirmation",
      stockpile: !!isStockpile, addressNotListed: !!isAddressNotListed, createdAt: serverTimestamp()
    };
    // save to firestore
    await addDoc(ordersCol, order);
    // deduct stock if not stockpile
    if(!order.stockpile){
      for(const it of state.cart){
        const pRef = doc(db,"products",it.id);
        const pSnap = await getDoc(pRef);
        if(pSnap.exists()){
          const cur = pSnap.data().stock || 0;
          await updateDoc(pRef, { stock: Math.max(0, cur - it.qty) });
        }
      }
    }
    // send single emails (customer & admin) — send once each
    try{
      // build items HTML
      const itemsHtml = order.items.map(i=>`<div style="display:flex;gap:8px;align-items:center"><img src="${i.image||'assets/placeholder.jpg'}" style="width:64px;height:64px;object-fit:cover;border-radius:8px"/><div><strong>${i.name}</strong><div>${i.qty} × ${money(i.price)}</div></div></div>`).join("");
      const payload = {
        customer_name: order.customer.name,
        order_id: String(order.orderId),
        delivery_address: order.customAddress || order.customer.address,
        shipping_method: order.shippingBlock?.title || "—",
        shipping_fee: money(fee),
        order_items: itemsHtml,
        total_amount: money(order.total)
      };
      if(window.emailjs){
        // send once each
        await window.emailjs.send(EMAIL.service, EMAIL.tplCustomer, payload);
        await window.emailjs.send(EMAIL.service, EMAIL.tplAdmin, payload);
      }
    }catch(err){ console.warn("Email send error:", err); }
    // clear cart
    state.cart = []; saveCart();
    showToast("Order placed — admin will contact if needed");
    $("#checkoutModal").close(); $("#cartModal").close();
  };
  $("#backToCart").onclick = ()=>{ $("#checkoutModal").close(); $("#cartModal").showModal(); };
  dlg.showModal();
}

// ---------- POPUP (subscribers)
let popupConfig = { on:false };
async function showPopupOnce(){
  const p = $("#popupModal"); if(!p) return;
  $("#popupTitle").textContent = popupConfig.title || "Announcement";
  $("#popupBody").textContent = popupConfig.body || "";
  p.showModal();
  sessionStorage.setItem("popupSeen","1");
  $("#popupSubmit").onclick = async ()=>{
    const name = $("#popupName").value || "";
    const email = $("#popupEmail").value || "";
    const phone = $("#popupPhone").value || "";
    if(!email || !name){ alert("Please provide name and email"); return; }
    await addDoc(subscribersCol, { name, email, phone, createdAt: serverTimestamp() });
    // send notification email about new subscriber
    try{ if(window.emailjs) await window.emailjs.send(EMAIL.service, EMAIL.tplAdmin, { customer_name:name, order_id:"Subscriber", delivery_address: email, shipping_method:"Subscriber", shipping_fee:"-", order_items:"Subscriber", total_amount:"-" }); }catch(e){}
    p.close();
    showToast("Thanks for signing up");
  };
  $("#popupSkip").onclick = ()=>{ p.close(); };
  p.querySelector(".close").onclick = ()=> p.close();
}

// ------------- ADMIN -------------
async function initAdmin(){
  await ensureSettings();

  // Sidebar nav
  $$(".side-btn").forEach(b=>b.onclick = ()=>{
    $$(".side-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    $$(".admin-tab").forEach(t=>t.classList.remove("active"));
    document.getElementById(b.dataset.page).classList.add("active");
  });

  // Auth (simple admin flow): show admin user if logged
  onAuthStateChanged(auth, user=>{
    if(user){ $("#adminUserWrap").textContent = user.email; $("#logoutBtn").style.display="inline-block"; } else { $("#adminUserWrap").textContent = "Not signed in"; $("#logoutBtn").style.display="none"; }
  });
  $("#logoutBtn").onclick = ()=> signOut(auth).then(()=>showToast("Signed out"));

  // Load live settings
  onSnapshot(settingsRef, snap=>{
    state.settings = snap.data();
    applyTheme(state.settings.theme);
    $("#announcementInput") && ($("#announcementInput").value = state.settings.announcement || "");
    $("#popupToggle") && ($("#popupToggle").value = state.settings.announcementPopup?.on ? "on":"off");
    $("#popupTitleInput") && ($("#popupTitleInput").value = state.settings.announcementPopup?.title || "");
    $("#popupBodyInput") && ($("#popupBodyInput").value = state.settings.announcementPopup?.body || "");
    renderShippingBlocksAdmin();
    // fill store profile form fields if present
    const sp = $("#storeProfileForm");
    if(sp){
      sp.storeName.value = state.settings.storeName || "";
      sp.tagline.value = state.settings.tagline || "";
      sp.contactEmail.value = state.settings.contactEmail || "";
      sp.contactPhone.value = state.settings.contactPhone || "";
      sp.whatsapp.value = state.settings.whatsapp || "";
    }
  });

  // Products live
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); renderAdminProductsList(arr); $("#statProducts").textContent = arr.length; state.products = arr;
  });

  // Collections live
  onSnapshot(query(collectionsCol, orderBy("name")), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); $("#collectionsList").innerHTML = arr.map(c=>`<div class="item"><div style="flex:1"><strong>${c.name}</strong></div><div><button class="btn" data-edit="${c.id}">Edit</button> <button class="btn danger" data-del="${c.id}">Delete</button></div></div>`).join(""); $("#assignCollectionSelect").innerHTML = `<option value="">Select collection</option>` + arr.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
    $$("#collectionsList [data-edit]").forEach(b=>b.onclick=()=>{ const c = arr.find(x=>x.id===b.dataset.edit); $("#collectionId").value=c.id; $("#collectionName").value=c.name; showToast("Loaded collection for edit"); });
    $$("#collectionsList [data-del]").forEach(b=>b.onclick=async ()=>{ if(!confirm("Delete collection?")) return; await deleteDoc(doc(db,"collections",b.dataset.del)); });
  });

  // Orders live
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); renderOrdersAdmin(arr); $("#statOrders").textContent = arr.length; $("#statPending").textContent = arr.filter(o=>/pending/i.test(o.status)).length;
  });

  // Customers list from orders
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), snap=>{
    const m={}; snap.forEach(d=>{ const o=d.data(); if(o.customer?.email) m[o.customer.email]=o.customer; }); const customers=Object.values(m); $("#customersList").innerHTML = customers.map(c=>`<div class="item"><div style="flex:1"><strong>${c.name}</strong><div class="muted">${c.phone||""}</div></div><div><a href="mailto:${c.email}">${c.email}</a></div></div>`).join("");
  });

  // Subscribers list
  onSnapshot(query(subscribersCol, orderBy("createdAt","desc")), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); $("#subscribersList").innerHTML = arr.map(s=>`<div class="item"><div style="flex:1"><strong>${s.name}</strong><div class="muted">${s.email} · ${s.phone||""}</div></div></div>`).join("");
  });

  // Coupons live
  onSnapshot(query(couponsCol, orderBy("code")), snap=>{
    const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); $("#couponsList").innerHTML = arr.map(c=>`<div class="item"><div style="flex:1"><strong>${c.code}</strong><div class="muted">${c.type==='percent'?c.value+'%':'₦'+c.value}</div></div><div><button class="btn" data-del="${c.id}">Delete</button></div></div>`).join("");
    $$("#couponsList [data-del]").forEach(b=>b.onclick=async ()=>{ if(!confirm("Delete coupon?")) return; await deleteDoc(doc(db,"coupons",b.dataset.del)); });
  });

  // Announcement / popup save
  $("#savePopup")?.addEventListener("click", async ()=>{
    const title = $("#popupTitleInput").value||""; const body = $("#popupBodyInput").value||"";
    await updateDoc(settingsRef, { announcementPopup: { on: $("#popupToggle").value==="on", title, body }, updatedAt: serverTimestamp() });
    showToast("Popup saved");
  });
  $("#savePopupToggle")?.addEventListener("click", async ()=>{ const on = $("#popupToggle").value==="on"; await updateDoc(settingsRef, { announcementPopup: {...(state.settings.announcementPopup||{}), on}, updatedAt: serverTimestamp() }); showToast("Popup toggled"); });

  // Theme save
  $("#themeForm")?.addEventListener("submit", async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const theme = { bg:fd.get("bg"), text:fd.get("text"), button:fd.get("button"), buttonText:fd.get("buttonText"), font:fd.get("font") }; await updateDoc(settingsRef, { theme, updatedAt: serverTimestamp() }); applyTheme(theme); showToast("Theme saved"); });

  // Store profile save
  $("#storeProfileForm")?.addEventListener("submit", async (e)=>{ e.preventDefault(); const fd=new FormData(e.target); let logoUrl = state.settings.logoUrl || "assets/logo.jpg"; let bannerUrl = state.settings.bannerUrl || null; const logoFile = $("#logoUpload").files?.[0]; const bannerFile = $("#bannerUpload").files?.[0]; if(logoFile) logoUrl = await uploadToCloudinary(logoFile); if(bannerFile) bannerUrl = await uploadToCloudinary(bannerFile); const payload = { storeName: fd.get("storeName")||"", tagline: fd.get("tagline")||"", contactEmail: fd.get("contactEmail")||"", contactPhone: fd.get("contactPhone")||"", whatsapp: fd.get("whatsapp")||"", logoUrl, bannerUrl }; await updateDoc(settingsRef, {...payload, updatedAt: serverTimestamp()}); showToast("Profile saved"); });

  // Bank save
  $("#bankForm")?.addEventListener("submit", async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const bank = { accountName: fd.get("accountName")||"", accountNumber: fd.get("accountNumber")||"", bankName: fd.get("bankName")||"" }; await updateDoc(settingsRef, { bank, updatedAt: serverTimestamp() }); showToast("Bank saved"); });

  // Shipping blocks admin
  $("#addShipBlock")?.addEventListener("click", async (e)=>{ e.preventDefault(); const id = $("#shipId").value || ("sb_"+Math.random().toString(36).slice(2,9)); const title = $("#shipTitle").value.trim(); const fee = Number($("#shipFee").value||0); const desc = $("#shipDesc").value.trim(); if(!title || !desc){ alert("Fill title and description"); return; } const blocks = [...(state.settings.shippingBlocks||[])]; const idx = blocks.findIndex(b=>b.id===id); if(idx>-1) blocks[idx] = { id, title, fee, desc }; else blocks.push({ id, title, fee, desc }); await updateDoc(settingsRef, { shippingBlocks: blocks, updatedAt: serverTimestamp() }); $("#shipId").value=""; $("#shipTitle").value=""; $("#shipFee").value=""; $("#shipDesc").value=""; showToast("Shipping block saved"); });

  // Shipping blocks list render
  function renderShippingBlocksAdmin(){ const host = $("#shippingBlocksList"); if(!host) return; host.innerHTML = (state.settings.shippingBlocks || []).map(b=>`<div class="tag"><strong>${b.title}</strong><div class="muted">${b.fee?money(b.fee):"No numeric fee set"}</div><div class="muted" style="max-width:240px">${b.desc}</div><div style="margin-top:6px"><button class="btn" data-edit="${b.id}">Edit</button> <button class="btn danger" data-del="${b.id}">Delete</button></div></div>`).join(""); host.querySelectorAll("[data-del]").forEach(btn=>btn.onclick = async ()=>{ const id=btn.dataset.del; const blocks=(state.settings.shippingBlocks||[]).filter(x=>x.id!==id); await updateDoc(settingsRef,{ shippingBlocks:blocks, updatedAt: serverTimestamp() }); showToast("Deleted"); }); host.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick = ()=>{ const b = (state.settings.shippingBlocks||[]).find(x=>x.id===btn.dataset.edit); if(!b) return; $("#shipId").value = b.id; $("#shipTitle").value = b.title; $("#shipFee").value = b.fee||0; $("#shipDesc").value = b.desc; showToast("Loaded for edit"); }); }

  // Product form handling (images upload, tags, save & update)
  let colors = [], sizes = [], uploadUrls = [], editingProductId = null;
  $("#addColor")?.addEventListener("click", ()=>{ const v=$("#colorInput").value.trim(); if(!v) return; colors.push(v); $("#colorInput").value=""; renderTags(); });
  $("#addSize")?.addEventListener("click", ()=>{ const v=$("#sizeInput").value.trim(); if(!v) return; sizes.push(v); $("#sizeInput").value=""; renderTags(); });
  function renderTags(){ $("#colorTags").innerHTML = colors.map((c,i)=>`<span class="tag">${c} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); $("#sizeTags").innerHTML = sizes.map((s,i)=>`<span class="tag">${s} <button data-i="${i}" class="btn subtle">x</button></span>`).join(""); $$("#colorTags button").forEach(b=>b.onclick = ()=>{ colors.splice(Number(b.dataset.i),1); renderTags(); }); $$("#sizeTags button").forEach(b=>b.onclick = ()=>{ sizes.splice(Number(b.dataset.i),1); renderTags(); }); }

  $("#productImages")?.addEventListener("change", async (e)=>{ uploadUrls = []; $("#uploadPreview").innerHTML = "Uploading..."; const files = [...e.target.files]; const out=[]; for(const f of files){ const url = await uploadToCloudinary(f); uploadUrls.push(url); out.push(`<img src="${url}"/>`); } $("#uploadPreview").innerHTML = out.join(""); });

  $("#productForm")?.addEventListener("submit", async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const payload = { name: fd.get("name")||"", price: Number(fd.get("price")||0), originalCost: Number(fd.get("originalCost")||0), description: fd.get("description")||"", stock: Number(fd.get("stock")||0), collection: fd.get("collection")||"", colors: [...colors], sizes: [...sizes], images: [...uploadUrls], updatedAt: serverTimestamp() }; if(editingProductId){ await updateDoc(doc(db,"products",editingProductId), payload); showToast("Product updated"); editingProductId = null; } else { payload.createdAt = serverTimestamp(); await addDoc(productsCol, payload); showToast("Product added"); } e.target.reset(); colors=[]; sizes=[]; uploadUrls=[]; renderTags(); $("#uploadPreview").innerHTML=""; });

  $("#resetProductForm")?.addEventListener("click", ()=>{ $("#productForm").reset(); colors=[]; sizes=[]; uploadUrls=[]; editingProductId=null; renderTags(); $("#uploadPreview").innerHTML=""; });

  // Admin product list render + edit/delete actions
  function renderAdminProductsList(arr){
    const host = $("#productsList");
    host.innerHTML = arr.map(p=>`<div class="item"><img src="${(p.images?.[0])||'assets/placeholder.jpg'}"/><div style="flex:1"><strong>${p.name}</strong><div class="muted">${money(p.price)} · Stock: ${p.stock}</div></div><div><button class="btn" data-edit="${p.id}">Edit</button> <button class="btn danger" data-del="${p.id}">Delete</button></div></div>`).join("");
    host.querySelectorAll("[data-del]").forEach(b=>b.onclick = async ()=>{ if(!confirm("Delete product?")) return; await deleteDoc(doc(db,"products",b.dataset.del)); });
    host.querySelectorAll("[data-edit]").forEach(b=>b.onclick = async ()=>{
      const snap = await getDoc(doc(db,"products",b.dataset.edit)); if(!snap.exists()) return; const p = snap.data();
      editingProductId = b.dataset.edit;
      $("#productForm").name.value = p.name||""; $("#productForm").price.value = p.price||0; $("#productForm").originalCost.value = p.originalCost||0; $("#productForm").description.value = p.description||""; $("#productForm").stock.value = p.stock||0; $("#productForm").collection.value = p.collection||"";
      colors = [...(p.colors||[])]; sizes = [...(p.sizes||[])]; uploadUrls = [...(p.images||[])]; renderTags(); $("#uploadPreview").innerHTML = uploadUrls.map(u=>`<img src="${u}"/>`).join("");
      document.querySelector('[data-page="products"]').click();
      showToast("Loaded product for editing — press Save to update");
    });
  }

  // Collections add/update/delete & assign products
  $("#addCollection")?.addEventListener("click", async (e)=>{ e.preventDefault(); const id = $("#collectionId").value || null; const name = $("#collectionName").value.trim(); if(!name) return alert("Enter name"); if(id){ await updateDoc(doc(db,"collections",id), { name }); } else { await addDoc(collectionsCol, { name }); } $("#collectionId").value=""; $("#collectionName").value=""; showToast("Saved collection"); });

  $("#assignCollectionSelect")?.addEventListener("change", async ()=>{ const colId = $("#assignCollectionSelect").value; // render product checklist
    const snap = await getDocs(query(productsCol, orderBy("createdAt","desc"))); const arr=[]; snap.forEach(d=>arr.push({ id:d.id, ...d.data() })); $("#assignProductsList").innerHTML = arr.map(p=>`<div><input type="checkbox" data-id="${p.id}" ${p.collection=== (state.collections.find(c=>c.id===colId)?.name||"") ? "checked":""}/> ${p.name}</div>`).join("");
  });

  $("#assignSave")?.addEventListener("click", async ()=>{ const colId = $("#assignCollectionSelect").value; if(!colId) return alert("Pick a collection"); const colSnap = await getDoc(doc(db,"collections",colId)); if(!colSnap.exists()) return; const colName = colSnap.data().name; const checks = Array.from($("#assignProductsList").querySelectorAll("input[type=checkbox]")); for(const c of checks){ const pId = c.dataset.id; if(c.checked) await updateDoc(doc(db,"products",pId), { collection: colName }); else { const pSnap = await getDoc(doc(db,"products",pId)); if(pSnap.exists() && pSnap.data().collection===colName) await updateDoc(doc(db,"products",pId), { collection: "" }); } } showToast("Assignments saved"); });

  // Orders admin render & update
  function renderOrdersAdmin(orders){
    const host = $("#ordersList");
    if(!orders.length){ host.innerHTML = `<div class="empty">No orders yet</div>`; return; }
    host.innerHTML = orders.map(o=>{
      const itemsHtml = (o.items||[]).map(i=>`<div style="display:flex;gap:8px;align-items:center"><img src="${i.image||'assets/placeholder.jpg'}" style="width:64px;height:64px;object-fit:cover;border-radius:8px"/><div><strong>${i.name}</strong><div>${i.qty} × ${money(i.price)}</div></div></div>`).join("");
      const note = o.adminNote || "";
      return `<div class="item"><div style="flex:1"><div><strong>Order #${o.orderId||"—"}</strong> · <small class="muted">${new Date(o.createdAt?.seconds ? o.createdAt.seconds*1000 : Date.now()).toLocaleString()}</small></div><div class="muted">${itemsHtml}</div><div style="margin-top:8px">Shipping: <strong>${o.shippingBlock?.title||"—"}</strong><div class="muted">${o.shippingBlock?.desc||""}</div></div><div style="margin-top:8px"><textarea data-note="${o.id}" placeholder="Write admin note...">${note}</textarea><div class="row" style="margin-top:6px"><select data-status="${o.id}">${["Pending Delivery Fee","Awaiting Confirmation","Processing","Completed","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select><button class="btn" data-save="${o.id}">Save</button></div></div></div><div><button class="btn danger" data-del="${o.id}">Delete</button></div></div>`;
    }).join("");
    host.querySelectorAll("[data-save]").forEach(b=>b.onclick = async ()=>{
      const id = b.dataset.save; const st = host.querySelector(`[data-status="${id}"]`).value; const note = host.querySelector(`[data-note="${id}"]`).value; await updateDoc(doc(db,"orders",id), { status:st, adminNote:note }); showToast("Order updated"); });
    host.querySelectorAll("[data-del]").forEach(b=>b.onclick = async ()=>{ if(!confirm("Delete order?")) return; await deleteDoc(doc(db,"orders",b.dataset.del)); });
  }

  // Coupons save
  $("#saveCoupon")?.addEventListener("click", async (e)=>{ e.preventDefault(); const code=$("#couponCode").value.trim(); const type=$("#couponType").value; const val=Number($("#couponValue").value||0); if(!code) return alert("Code"); await addDoc(couponsCol, { code, type, value: val }); $("#couponCode").value=""; $("#couponValue").value=""; showToast("Saved coupon"); });

  // Render shipping blocks admin (helper used earlier)
  function renderShippingBlocksAdmin(){ const host = $("#shippingBlocksList"); if(!host) return; host.innerHTML = (state.settings.shippingBlocks || []).map(b=>`<div class="tag"><strong>${b.title}</strong><div class="muted">${b.fee?money(b.fee):"No numeric fee set"}</div><div class="muted" style="max-width:240px">${b.desc}</div><div style="margin-top:6px"><button class="btn" data-edit="${b.id}">Edit</button> <button class="btn danger" data-del="${b.id}">Delete</button></div></div>`).join(""); host.querySelectorAll("[data-del]").forEach(btn=>btn.onclick = async ()=>{ const id=btn.dataset.del; const blocks=(state.settings.shippingBlocks||[]).filter(x=>x.id!==id); await updateDoc(settingsRef,{ shippingBlocks:blocks, updatedAt: serverTimestamp() }); showToast("Deleted"); }); host.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick = ()=>{ const b = (state.settings.shippingBlocks||[]).find(x=>x.id===btn.dataset.edit); if(!b) return; $("#shipId").value = b.id; $("#shipTitle").value = b.title; $("#shipFee").value = b.fee||0; $("#shipDesc").value = b.desc; showToast("Loaded for edit"); }); }

} // end initAdmin
