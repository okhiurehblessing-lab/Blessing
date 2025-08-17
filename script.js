// ========== Firebase (your config) ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// YOUR latest config (as you sent)
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

// ========== EmailJS (your keys) ==========
window.emailjs?.init("RN5H1CcY7Fqkakg5w"); // public key
const EMAILJS = {
  service: "service_opcf6cl",
  adminTemplate: "template_4zrsdni",
  customerTemplate: "template_zc87bdl",
};

// ========== Cloudinary (your details) ==========
const CLOUD = { name: "desbqctik", preset: "myshop_preset" };

// ========== Helpers ==========
const N = (s)=>document.querySelector(s);
const A = (s)=>document.querySelectorAll(s);
const money = (n)=>"₦"+(Number(n||0)).toLocaleString();
const uid = ()=>Math.random().toString(36).slice(2);
const ls = {
  get:(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def}catch{return def}},
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
};

// ========== Shared state ==========
const state = {
  settings: null,
  products: [],
  collections: [],
  cart: ls.get("cart", []),
  zones: [],
};

// ========== Live theme apply ==========
function applyTheme(theme){
  if(!theme) return;
  document.documentElement.style.setProperty('--bg', theme.bg || '#ffffff');
  document.documentElement.style.setProperty('--text', theme.text || '#111111');
  document.documentElement.style.setProperty('--btn', theme.button || '#111111');
  document.documentElement.style.setProperty('--btn-text', theme.buttonText || '#ffffff');
}

// ========== Firestore: Settings doc ==========
const settingsRef = doc(db, "settings", "store");

// Bootstrap default settings if missing
async function ensureSettings(){
  const snap = await getDoc(settingsRef);
  if(!snap.exists()){
    const def = {
      storeName: "Essysessentials",
      tagline: "Quality essentials for everyday",
      announcement: "Welcome to Essysessentials 💛",
      contactEmail: "",
      contactPhone: "",
      whatsapp: "",
      logoUrl: "assets/logo.jpg",
      theme: { bg:"#ffffff", text:"#111111", button:"#111111", buttonText:"#ffffff" },
      bank: { accountName:"", accountNumber:"", bankName:"" },
      shippingZones: [{name:"Lagos Mainland", fee:1500}, {name:"Lagos Island", fee:2000}, {name:"Outside Lagos", fee:3500}],
      shippingNotes: {
        standard:"Delivered in 2–5 days within Lagos.",
        express:"Delivered in 24–48 hours (extra fees may apply).",
        pickup:"We’ll share pickup point after order.",
        address_not_listed:"Provide details in notes; we’ll contact you.",
        stockpile:"We’ll keep your items until you’re ready. Pay later."
      },
      updatedAt: serverTimestamp()
    };
    await setDoc(settingsRef, def);
    return def;
  }
  return snap.data();
}

// ========== Products ==========
const productsCol = collection(db, "products");
const ordersCol   = collection(db, "orders");

// ========== Cloudinary Upload ==========
async function uploadToCloudinary(file){
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUD.preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.name}/image/upload`, { method:"POST", body:form });
  const data = await res.json();
  if(!data.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}

// ========== CART ==========
function saveCart(){ ls.set("cart", state.cart); updateCartBadge(); }
function updateCartBadge(){ const el=N("#cartCount"); if(el) el.textContent = state.cart.reduce((a,c)=>a+c.qty,0); }
function addToCart(prod, opts){
  if(prod.stock<=0){ alert("Out of stock"); return; }
  const key = `${prod.id}|${opts.color||""}|${opts.size||""}`;
  const idx = state.cart.findIndex(i=>i.key===key);
  if(idx>-1){ state.cart[idx].qty += opts.qty||1; }
  else{
    state.cart.push({
      key, id: prod.id, name: prod.name, price: prod.price,
      color: opts.color||null, size: opts.size||null,
      image: (prod.images?.[0]) || "", qty: opts.qty||1
    });
  }
  saveCart();
}

// ========== STORE PAGE ==========
async function initStore(){
  // Load settings live
  onSnapshot(settingsRef, (snap)=>{
    state.settings = snap.data();
    // Apply
    applyTheme(state.settings?.theme);
    N("#storeName").textContent = state.settings?.storeName || "Essysessentials";
    N("#footerStoreName").textContent = state.settings?.storeName || "Essysessentials";
    N("#storeTag").textContent = state.settings?.tagline || "";
    N("#announcementBar").textContent = state.settings?.announcement || "";
    N("#storeLogo").src = state.settings?.logoUrl || "assets/logo.jpg";
    const w = state.settings?.whatsapp?.trim();
    if(w){ N("#waFloat").href = `https://wa.me/${w}`; } else { N("#waFloat").style.display="none"; }
    const email = state.settings?.contactEmail||""; const phone = state.settings?.contactPhone||"";
    if(email){ N("#contactEmail").textContent=email; N("#contactEmail").href="mailto:"+email; }
    if(phone){ N("#contactPhone").textContent=phone; N("#contactPhone").href="tel:"+phone; }

    // Shipping zones & notes
    state.zones = state.settings?.shippingZones||[];
    const zoneSel = N("#shippingZone");
    if(zoneSel){
      zoneSel.innerHTML = "";
      state.zones.forEach(z=>{
        const op = document.createElement("option"); op.value=z.name; op.textContent=`${z.name} – ${money(z.fee)}`;
        zoneSel.appendChild(op);
      });
    }
    // notes
    ["standard","express","pickup","address_not_listed","stockpile"].forEach(k=>{
      const el = N(`#note-${k}`); if(el && state.settings?.shippingNotes?.[k]) el.textContent = state.settings.shippingNotes[k];
    });
  });

  // Load products (live)
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), (snap)=>{
    state.products = [];
    const collections = new Set();
    snap.forEach(d=>{
      const p = { id:d.id, ...d.data() };
      state.products.push(p);
      if(p.collection) collections.add(p.collection);
    });
    state.collections = Array.from(collections);
    renderFilters();
    renderProducts(state.products);
  });

  // Search / filter
  N("#searchInput").addEventListener("input", ()=>filterRender());
  N("#collectionFilter").addEventListener("change", ()=>filterRender());

  // Cart interactions
  updateCartBadge();
  N("#cartBtn").addEventListener("click", openCartModal);
  N("#returnToShop").addEventListener("click", (e)=>{ e.preventDefault(); N("#cartModal").close(); });
  N("#proceedToCheckout").addEventListener("click", openCheckout);

  // Year
  const year = new Date().getFullYear(); if(N("#year")) N("#year").textContent = year;
}

function renderFilters(){
  const sel = N("#collectionFilter"); if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">All collections</option>`;
  state.collections.forEach(c=>{
    const o = document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o);
  });
  sel.value = cur || "";
}

function filterRender(){
  const q = N("#searchInput").value.toLowerCase().trim();
  const c = N("#collectionFilter").value;
  const list = state.products.filter(p=>{
    const matchQ = !q || (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    const matchC = !c || p.collection===c;
    return matchQ && matchC;
  });
  renderProducts(list);
}

function productCard(p){
  const disabled = p.stock<=0;
  return `
    <article class="card product" data-id="${p.id}">
      <div class="imgwrap">
        ${disabled?`<span class="out">Out of stock</span>`:""}
        <img src="${(p.images?.[0])||'assets/placeholder.jpg'}" alt="${p.name}" />
      </div>
      <h4>${p.name}</h4>
      <div class="row">
        <span class="price">${money(p.price)}</span>
        <button class="btn add-btn" data-id="${p.id}" ${disabled?"disabled":""}>Add to cart</button>
      </div>
    </article>
  `;
}

function renderProducts(list){
  const grid = N("#productsGrid");
  grid.innerHTML = list.map(productCard).join("");

  // Card click opens detail; "Add to cart" on card works too
  grid.querySelectorAll(".product").forEach(card=>{
    const id = card.dataset.id;
    const p = state.products.find(x=>x.id===id);
    // open details when image/name clicked
    card.querySelector("img").addEventListener("click", ()=>openProductModal(p));
    card.querySelector("h4").addEventListener("click", ()=>openProductModal(p));
    // add to cart directly
    const btn = card.querySelector(".add-btn");
    if(btn){
      btn.addEventListener("click",(e)=>{
        e.stopPropagation();
        addToCart(p,{qty:1});
        alert("Added to cart");
      });
    }
  });
}

function openProductModal(p){
  const dlg = N("#productModal");
  N("#pmName").textContent = p.name;
  N("#pmPrice").textContent = money(p.price);
  N("#pmDesc").textContent = p.description||"";
  N("#pmImage").src = (p.images?.[0])||'assets/placeholder.jpg';
  const thumbs = N("#pmThumbs");
  thumbs.innerHTML = (p.images||[]).map(u=>`<img src="${u}"/>`).join("");
  thumbs.querySelectorAll("img").forEach(img=>{
    img.addEventListener("click",()=>{ N("#pmImage").src = img.src; });
  });
  const sw = N("#pmStockWrap");
  sw.innerHTML = `<small class="muted">${p.stock>0?`In stock: ${p.stock}`:`Out of stock`}</small>`;

  // Colors & Sizes
  const colWrap = N("#pmColors"); colWrap.innerHTML="";
  (p.colors||[]).forEach(c=>{
    const b = document.createElement("button");
    b.type="button"; b.className="opt"; b.textContent=c;
    b.addEventListener("click",()=>{ colWrap.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
    colWrap.appendChild(b);
  });
  const sizeWrap = N("#pmSizes"); sizeWrap.innerHTML="";
  (p.sizes||[]).forEach(s=>{
    const b = document.createElement("button");
    b.type="button"; b.className="opt"; b.textContent=s;
    b.addEventListener("click",()=>{ sizeWrap.querySelectorAll(".opt").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
    sizeWrap.appendChild(b);
  });

  // Qty
  const qtyEl = N("#pmQty"); qtyEl.value = 1;
  A(".qty-btn").forEach(b=>{
    b.onclick = ()=>{
      const a = b.dataset.action;
      let v = parseInt(qtyEl.value||"1",10);
      if(a==="inc") v++;
      if(a==="dec") v = Math.max(1, v-1);
      qtyEl.value = v;
    };
  });

  // Add to cart
  const addBtn = N("#pmAddToCart");
  addBtn.disabled = p.stock<=0;
  addBtn.onclick = ()=>{
    const color = colWrap.querySelector(".opt.active")?.textContent || null;
    const size  = sizeWrap.querySelector(".opt.active")?.textContent || null;
    const qty   = Math.max(1, parseInt(qtyEl.value||"1",10));
    addToCart(p,{color,size,qty});
    dlg.close();
    openCartModal();
  };

  dlg.showModal();
}

function openCartModal(){
  const dlg = N("#cartModal");
  const wrap = N("#cartItems");
  const empty = N("#cartEmpty");
  wrap.innerHTML = "";
  if(state.cart.length===0){
    empty.style.display="block";
  }else{
    empty.style.display="none";
    state.cart.forEach((it,idx)=>{
      const row = document.createElement("div");
      row.className="item";
      row.innerHTML = `
        <img src="${it.image||'assets/placeholder.jpg'}" alt="">
        <div>
          <div><strong>${it.name}</strong></div>
          <small class="muted">${[it.color||"",it.size||""].filter(Boolean).join(" • ")}</small>
          <div class="row" style="margin-top:6px">
            <div>
              <button class="icon-btn" data-a="dec">−</button>
              <span style="padding:0 8px">${it.qty}</span>
              <button class="icon-btn" data-a="inc">+</button>
            </div>
            <strong>${money(it.price*it.qty)}</strong>
          </div>
        </div>
        <button class="btn danger" data-a="del">Delete</button>
      `;
      row.querySelector('[data-a="dec"]').onclick=()=>{ it.qty=Math.max(1,it.qty-1); saveCart(); openCartModal(); };
      row.querySelector('[data-a="inc"]').onclick=()=>{ it.qty++; saveCart(); openCartModal(); };
      row.querySelector('[data-a="del"]').onclick=()=>{ state.cart.splice(idx,1); saveCart(); openCartModal(); };
      wrap.appendChild(row);
    });
  }
  // totals
  const sub = state.cart.reduce((a,c)=>a+(c.price*c.qty),0);
  N("#cartSubtotal").textContent = money(sub);
  dlg.showModal();
}

function openCheckout(){
  const dlg = N("#checkoutModal");
  // calc subtotal
  const subtotal = state.cart.reduce((a,c)=>a+(c.price*c.qty),0);
  N("#summarySubtotal").textContent = money(subtotal);
  // fee
  const zoneSel = N("#shippingZone");
  const fee = getZoneFee(zoneSel?.value);
  N("#shippingFeeDisplay").textContent = money(fee);
  N("#summaryShipping").textContent = money(fee);
  N("#summaryTotal").textContent = money(subtotal + fee);

  // Show bank details
  const b = state.settings?.bank||{};
  N("#bankDetails").innerHTML = `
    <div><strong>Account name:</strong> ${b.accountName||"—"}</div>
    <div><strong>Account number:</strong> ${b.accountNumber||"—"}</div>
    <div><strong>Bank:</strong> ${b.bankName||"—"}</div>
  `;

  // Payment proof required unless address_not_listed or stockpile
  const paymentGroup = N("#paymentProofGroup");
  const methodRadios = A('input[name="shippingMethod"]');
  function togglePayment(){
    const v = [...methodRadios].find(r=>r.checked)?.value;
    paymentGroup.style.display = (v==="address_not_listed" || v==="stockpile") ? "none" : "block";
  }
  methodRadios.forEach(r=>r.addEventListener("change", ()=>{
    togglePayment();
    // recalc fee if needed (zone stays same)
    const fee2 = getZoneFee(zoneSel?.value);
    N("#summaryShipping").textContent = money(fee2);
    N("#summaryTotal").textContent = money(subtotal + fee2);
  }));
  zoneSel?.addEventListener("change", ()=>{
    const fee3 = getZoneFee(zoneSel.value);
    N("#shippingFeeDisplay").textContent = money(fee3);
    N("#summaryShipping").textContent = money(fee3);
    N("#summaryTotal").textContent = money(subtotal + fee3);
  });
  togglePayment();

  // Place order
  N("#checkoutForm").onsubmit = async (e)=>{
    e.preventDefault();
    if(state.cart.length===0){ alert("Cart is empty."); return; }

    const fd = new FormData(e.target);
    const name = fd.get("name"); const email=fd.get("email");
    const phone=fd.get("phone"); const address=fd.get("address");
    const shippingMethod = fd.get("shippingMethod");
    const shippingZone   = N("#shippingZone")?.value || "";
    const shippingFee    = getZoneFee(shippingZone);
    const subtotalNow    = state.cart.reduce((a,c)=>a+(c.price*c.qty),0);
    const total          = subtotalNow + shippingFee;

    // Payment proof if required
    let paymentProofUrl = "";
    if(!(shippingMethod==="address_not_listed" || shippingMethod==="stockpile")){
      const file = N("#paymentProofInput").files?.[0];
      if(!file){ alert("Please upload payment proof."); return; }
      paymentProofUrl = await uploadToCloudinary(file);
    }

    // Build order
    const items = state.cart.map(c=>({
      productId:c.id, name:c.name, price:c.price, qty:c.qty, color:c.color||null, size:c.size||null, image:c.image||""
    }));
    const order = {
      items, subtotal: subtotalNow, shippingZone, shippingFee, total,
      customer:{ name,email,phone,address },
      shippingMethod,
      paymentProofUrl,
      status: (shippingMethod==="stockpile"||shippingMethod==="address_not_listed") ? "Pending" : "Awaiting Confirmation",
      stockpile: shippingMethod==="stockpile",
      addressNotListed: shippingMethod==="address_not_listed",
      createdAt: serverTimestamp()
    };

    // Save to Firestore
    const ref = await addDoc(ordersCol, order);

    // Decrease stock for non-stockpile? (Bumpa often reserves; we’ll reduce now)
    for(const it of state.cart){
      const pRef = doc(db,"products",it.id);
      const pSnap = await getDoc(pRef);
      if(pSnap.exists()){
        const cur = pSnap.data().stock||0;
        await updateDoc(pRef,{ stock: Math.max(0, cur - it.qty) });
      }
    }

    // Email notifications
    try{
      const orderId = ref.id;
      const order_items = items.map(i=>`${i.name} x${i.qty}${i.color?` (${i.color}`:""}${i.size?` ${i.size}`:""}${i.color||i.size?")":""} – ${money(i.price*i.qty)}`).join("\n");
      const payload = {
        customer_name:name,
        order_id:orderId,
        delivery_address:address,
        shipping_method:shippingMethod,
        shipping_fee: money(shippingFee),
        order_items,
        total_amount: money(total),
      };
      await window.emailjs.send(EMAILJS.service, EMAILJS.customerTemplate, payload);
      await window.emailjs.send(EMAILJS.service, EMAILJS.adminTemplate, payload);
    }catch(err){ console.warn("EmailJS error:", err); }

    // Clear cart + close
    state.cart = []; saveCart();
    alert("Order placed! We’ll contact you shortly.");
    N("#checkoutModal").close();
    N("#cartModal").close();
  };

  dlg.showModal();
}

function getZoneFee(name){
  const z = (state.zones||[]).find(x=>x.name===name);
  return z? Number(z.fee||0) : 0;
}

// ========== ADMIN ==========
function switchTab(tab){
  A(".tab").forEach(s=>s.classList.remove("active"));
  N(`#tab-${tab}`).classList.add("active");
  A(".tab-btn").forEach(b=>b.setAttribute("aria-selected", b.dataset.tab===tab ? "true":"false"));
}

async function initAdmin(){
  // tabs
  A(".tab-btn").forEach(b=>b.addEventListener("click", ()=>switchTab(b.dataset.tab)));

  // Live settings
  onSnapshot(settingsRef, (snap)=>{
    state.settings = snap.data();
    applyTheme(state.settings?.theme);
    N("#announcementInput").value = state.settings?.announcement||"";
    // Theme defaults
    const t = state.settings?.theme||{};
    const tf = N("#themeForm");
    if(tf){ tf.bg.value=t.bg||"#ffffff"; tf.text.value=t.text||"#111111"; tf.button.value=t.button||"#111111"; tf.buttonText.value=t.buttonText||"#ffffff"; }
    // Store profile
    const sp = N("#storeProfileForm");
    if(sp){
      sp.storeName.value = state.settings?.storeName||"";
      sp.tagline.value   = state.settings?.tagline||"";
      sp.contactEmail.value = state.settings?.contactEmail||"";
      sp.contactPhone.value = state.settings?.contactPhone||"";
      sp.whatsapp.value  = state.settings?.whatsapp||"";
      N("#adminLogo").src = state.settings?.logoUrl || "assets/logo.jpg";
    }
    // Zones
    renderZones();
    // Stats profit estimate
    calcStats();
  });

  // Products live
  onSnapshot(query(productsCol, orderBy("createdAt","desc")), (snap)=>{
    state.products = [];
    snap.forEach(d=> state.products.push({id:d.id, ...d.data()}));
    renderProductsList();
    calcStats();
  });

  // Orders live
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), (snap)=>{
    const orders = [];
    snap.forEach(d=> orders.push({id:d.id, ...d.data()}));
    renderOrdersList(orders);
    calcStats(orders);
  });

  // Announcement
  N("#saveAnnouncement").onclick = async ()=>{
    await updateDoc(settingsRef,{ announcement: N("#announcementInput").value, updatedAt: serverTimestamp() });
    alert("Announcement saved");
  };

  // Theme
  N("#themeForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const theme = { bg:fd.get("bg"), text:fd.get("text"), button:fd.get("button"), buttonText:fd.get("buttonText") };
    await updateDoc(settingsRef,{ theme, updatedAt: serverTimestamp() });
    applyTheme(theme);
    alert("Theme saved");
  };

  // Store profile + logo upload
  N("#storeProfileForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    let logoUrl = state.settings?.logoUrl||"";
    const file = N("#logoUpload").files?.[0];
    if(file){ logoUrl = await uploadToCloudinary(file); }
    const payload = {
      storeName: fd.get("storeName")||"",
      tagline: fd.get("tagline")||"",
      contactEmail: fd.get("contactEmail")||"",
      contactPhone: fd.get("contactPhone")||"",
      whatsapp: fd.get("whatsapp")||"",
      logoUrl
    };
    await updateDoc(settingsRef, {...payload, updatedAt: serverTimestamp() });
    alert("Profile saved");
  };

  // Zones
  N("#addZone").onclick = async ()=>{
    const name = N("#zoneName").value.trim();
    const fee  = Number(N("#zoneFee").value||0);
    if(!name) return;
    const zones = [...(state.settings?.shippingZones||[])];
    zones.push({name, fee});
    await updateDoc(settingsRef,{ shippingZones: zones, updatedAt: serverTimestamp() });
    N("#zoneName").value=""; N("#zoneFee").value="";
  };

  // Shipping notes
  N("#shippingNotesForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const notes = {
      standard: fd.get("standard")||"",
      express: fd.get("express")||"",
      pickup: fd.get("pickup")||"",
      address_not_listed: fd.get("address_not_listed")||"",
      stockpile: fd.get("stockpile")||""
    };
    await updateDoc(settingsRef,{ shippingNotes: notes, updatedAt: serverTimestamp() });
    alert("Shipping notes saved");
  };

  // Bank
  N("#bankForm").onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const bank = {
      accountName: fd.get("accountName")||"",
      accountNumber: fd.get("accountNumber")||"",
      bankName: fd.get("bankName")||""
    };
    await updateDoc(settingsRef,{ bank, updatedAt: serverTimestamp() });
    alert("Bank details saved");
  };

  // Product form (colors/sizes as tags + Cloudinary multi-upload)
  const colors=[]; const sizes=[]; let editingId=null; let uploadUrls=[];
  function renderTags(arr, host){
    host.innerHTML = arr.map((t,i)=>`<span class="tag">${t}<span class="x" data-i="${i}">×</span></span>`).join("");
    host.querySelectorAll(".x").forEach(x=>{
      x.onclick=()=>{ arr.splice(Number(x.dataset.i),1); renderTags(arr, host); };
    });
  }
  N("#addColor").onclick = ()=>{ const v=N("#colorInput").value.trim(); if(v){ colors.push(v); N("#colorInput").value=""; renderTags(colors,N("#colorTags")); } };
  N("#addSize").onclick  = ()=>{ const v=N("#sizeInput").value.trim(); if(v){ sizes.push(v);  N("#sizeInput").value="";  renderTags(sizes, N("#sizeTags")); } };

  // Upload preview + collect URLs
  N("#productImages").addEventListener("change", async (e)=>{
    uploadUrls = [];
    N("#uploadPreview").innerHTML = "Uploading...";
    const files = [...e.target.files];
    const out = [];
    for(const f of files){
      const url = await uploadToCloudinary(f);
      uploadUrls.push(url);
      out.push(`<img src="${url}" />`);
    }
    N("#uploadPreview").innerHTML = out.join("");
  });

  // Save product
  N("#productForm").onsubmit = async (e)=>{
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
    if(editingId){
      const ref = doc(db,"products",editingId);
      delete payload.createdAt;
      await updateDoc(ref, payload);
      alert("Product updated");
    }else{
      await addDoc(productsCol, payload);
      alert("Product added");
    }
    // reset
    e.target.reset(); colors.length=0; sizes.length=0; uploadUrls=[];
    N("#colorTags").innerHTML=""; N("#sizeTags").innerHTML=""; N("#uploadPreview").innerHTML="";
    editingId=null;
  };

  // Reset form
  N("#resetProductForm").onclick = ()=>{ N("#productForm").reset(); colors.length=0; sizes.length=0; uploadUrls=[]; N("#colorTags").innerHTML=""; N("#sizeTags").innerHTML=""; N("#uploadPreview").innerHTML=""; editingId=null; };
}

function renderProductsList(){
  const host = N("#productsList");
  host.innerHTML = state.products.map(p=>`
    <div class="item">
      <img src="${(p.images?.[0])||'assets/placeholder.jpg'}" alt="">
      <div>
        <div><strong>${p.name}</strong> · <small>${p.collection||"—"}</small></div>
        <div class="muted">${money(p.price)} · Stock: ${p.stock} · Colors: ${(p.colors||[]).join(", ")} · Sizes: ${(p.sizes||[]).join(", ")}</div>
      </div>
      <div class="row" style="gap:6px">
        <button class="btn" data-edit="${p.id}">Edit</button>
        <button class="btn danger" data-del="${p.id}">Delete</button>
      </div>
    </div>
  `).join("");

  // Wire buttons
  host.querySelectorAll("[data-edit]").forEach(b=>{
    b.onclick = ()=>{
      const p = state.products.find(x=>x.id===b.dataset.edit);
      if(!p) return;
      const f = N("#productForm");
      f.id.value = p.id;
      f.name.value = p.name||"";
      f.price.value = p.price||0;
      f.originalCost.value = p.originalCost||0;
      f.description.value = p.description||"";
      f.stock.value = p.stock||0;
      f.collection.value = p.collection||"";
      // tags
      const colors = N("#colorTags"); colors.innerHTML=""; (p.colors||[]).forEach(()=>{});
      // quick re-render helper
      const cList = []; (p.colors||[]).forEach(x=>cList.push(x));
      const sList = []; (p.sizes||[]).forEach(x=>sList.push(x));
      // store into closures used earlier
      // (hacky but short)
      window._colRef = cList; window._sizeRef = sList;
      // patch add/remove functions to use these arrays:
      // We already bound events earlier, so re-render:
      const render = (arr, host)=>{ host.innerHTML = arr.map((t,i)=>`<span class="tag">${t}<span class="x" data-i="${i}">×</span></span>`).join(""); host.querySelectorAll(".x").forEach(x=>{ x.onclick=()=>{ arr.splice(Number(x.dataset.i),1); render(arr, host); };});};
      render(window._colRef, N("#colorTags"));
      render(window._sizeRef, N("#sizeTags"));
      // monkey-patch add buttons to push into these refs
      N("#addColor").onclick = ()=>{ const v=N("#colorInput").value.trim(); if(v){ window._colRef.push(v); N("#colorInput").value=""; render(window._colRef, N("#colorTags")); } };
      N("#addSize").onclick  = ()=>{ const v=N("#sizeInput").value.trim(); if(v){ window._sizeRef.push(v); N("#sizeInput").value=""; render(window._sizeRef, N("#sizeTags")); } };
      // images preview only (leave uploads if you want to change)
      N("#uploadPreview").innerHTML = (p.images||[]).map(u=>`<img src="${u}"/>`).join("");
      // set editing flag
      window._editingId = p.id;
      N("#productForm").onsubmit = async (e)=>{
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          name: fd.get("name")||"",
          price: Number(fd.get("price")||0),
          originalCost: Number(fd.get("originalCost")||0),
          description: fd.get("description")||"",
          stock: Number(fd.get("stock")||0),
          collection: fd.get("collection")||"",
          colors: [...window._colRef],
          sizes:  [...window._sizeRef],
        };
        // append images if new uploads were chosen
        const files = [...(N("#productImages").files||[])];
        if(files.length){
          const urls=[];
          for(const f of files){ urls.push(await uploadToCloudinary(f)); }
          payload.images = urls;
        }
        await updateDoc(doc(db,"products",window._editingId), payload);
        alert("Product updated");
        e.target.reset(); N("#colorTags").innerHTML=""; N("#sizeTags").innerHTML=""; N("#uploadPreview").innerHTML="";
        window._editingId=null;
      };
      // scroll to form
      window.scrollTo({top:0,behavior:"smooth"});
      N('[data-tab="products"]').click();
    };
  });
  host.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm("Delete this product?")) return;
      await deleteDoc(doc(db,"products",b.dataset.del));
    };
  });
}

function renderOrdersList(orders){
  const host = N("#ordersList");
  if(!orders?.length){ host.innerHTML = `<div class="empty">No orders yet.</div>`; return; }
  host.innerHTML = orders.map(o=>{
    const items = o.items?.map(i=>`${i.name} x${i.qty}${i.color?` (${i.color}`:""}${i.size?` ${i.size}`:""}${i.color||i.size?")":""}`).join(", ") || "";
    return `
      <div class="item">
        <img src="${(o.items?.[0]?.image)||'assets/placeholder.jpg'}" alt="">
        <div>
          <div><strong>${o.customer?.name||"—"}</strong> · <small class="muted">${o.customer?.phone||""}</small></div>
          <div class="muted">${items}</div>
          <div class="muted">Method: ${o.shippingMethod} · Zone: ${o.shippingZone||"—"} · Total: ${money(o.total||0)}</div>
          <div class="muted">Status: <strong>${o.status||"Pending"}</strong></div>
        </div>
        <div class="row" style="gap:6px">
          <select data-status="${o.id}">
            ${["Pending","Awaiting Confirmation","Processing","Completed","Cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
          <button class="btn" data-save="${o.id}">Save</button>
          <button class="btn danger" data-del="${o.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  host.querySelectorAll("[data-save]").forEach(b=>{
    b.onclick = async ()=>{
      const st = host.querySelector(`[data-status="${b.dataset.save}"]`).value;
      await updateDoc(doc(db,"orders",b.dataset.save),{ status:st });
      alert("Order updated");
    };
  });
  host.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm("Delete this order?")) return;
      await deleteDoc(doc(db,"orders",b.dataset.del));
    };
  });
}

function renderZones(){
  const zones = state.settings?.shippingZones||[];
  const host = N("#zonesList");
  host.innerHTML = zones.map((z,i)=>`<span class="tag">${z.name} · ${money(z.fee)}<span class="x" data-i="${i}">×</span></span>`).join("");
  host.querySelectorAll(".x").forEach(x=>{
    x.onclick = async ()=>{
      zones.splice(Number(x.dataset.i),1);
      await updateDoc(settingsRef,{ shippingZones: zones, updatedAt: serverTimestamp() });
    };
  });
}

function calcStats(ordersSnap){
  const productsCount = state.products.length;
  N("#statProducts") && (N("#statProducts").textContent=productsCount);
  if(!ordersSnap) return;
  const orders = ordersSnap||[];
  N("#statOrders") && (N("#statOrders").textContent=orders.length);
  const pending = orders.filter(o=>o.status==="Pending"||o.status==="Awaiting Confirmation").length;
  N("#statPending") && (N("#statPending").textContent=pending);

  // Estimated profit: sum of (price - originalCost) * qty
  let profit = 0;
  for(const o of orders){
    for(const it of (o.items||[])){
      const p = state.products.find(x=>x.id===it.productId);
      const oc = p?.originalCost||0;
      profit += (Number(it.price)-Number(oc)) * Number(it.qty||0);
    }
  }
  N("#statProfit") && (N("#statProfit").textContent = money(profit));
}

// ========== Router ==========
const page = document.body.getAttribute("data-page");
if(page==="store") initStore();
if(page==="admin") initAdmin();

// ========== END ==========
