// STORAGE KEYS
const STORE_KEY="storeData", PRODUCTS_KEY="productsData", COLLECTIONS_KEY="collectionsData";
const ZONES_KEY="zonesData", CART_KEY="cartData", ORDERS_KEY="ordersData";

// EMAILJS
const EMAILJS_PUBLIC_KEY="RN5H1CcY7Fqkakg5w";
const EMAILJS_SERVICE_ID="service_opcf6cl";
const EMAILJS_ADMIN_TEMPLATE="template_4zrsdni";
const EMAILJS_CUSTOMER_TEMPLATE="template_zc87bdl";

// LOCAL STORAGE HELPERS
function load(key){return JSON.parse(localStorage.getItem(key)||"[]");}
function save(key,data){localStorage.setItem(key,JSON.stringify(data));}

// STORE SETTINGS
function applyStoreSettings(){
  const storeName=localStorage.getItem("storeName")||"My Store";
  document.getElementById("store-name-display")?.innerText=storeName;
  const announcement=localStorage.getItem("storeAnnouncement")||"Welcome to my store!";
  document.getElementById("store-announcement")?.innerText=announcement;
  const logo=localStorage.getItem("storeLogo");
  if(logo) document.querySelector(".logo").src=logo;
  document.documentElement.style.setProperty('--main-color',localStorage.getItem("storeMainColor")||"#ff0000");
  document.documentElement.style.setProperty('--button-color',localStorage.getItem("storeButtonColor")||"#0000ff");
  updateWhatsAppNumber();
}

// WHATSAPP
function updateWhatsAppNumber(){
  const number=localStorage.getItem("whatsappNumber")||"2348000000000";
  const link=`https://wa.me/${number.replace(/\D/g,"")}`;
  const waIcon=document.getElementById("whatsapp-icon");
  if(waIcon) waIcon.href=link;
}

// PRODUCTS
let products=load(PRODUCTS_KEY);
let cart=load(CART_KEY);
let currentProductIndex=0;
let currentQty=1;

// RENDER STORE PRODUCTS
function renderStore(){
  const container=document.getElementById("products-section");
  if(!container) return;
  container.innerHTML="";
  const selectedCollection=document.getElementById("collection-filter")?.value;
  products.forEach((p,i)=>{
    if(selectedCollection && p.collection!==selectedCollection) return;
    const div=document.createElement("div"); div.className="product-card";
    div.innerHTML=`<img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><p>₦${p.price}</p>`;
    div.addEventListener("click",()=>openProductModal(i));
    container.appendChild(div);
  });
}

// PRODUCT MODAL
function openProductModal(i){
  currentProductIndex=i;
  currentQty=1;
  const p=products[i];
  document.getElementById("modal-product-name").innerText=p.name;
  document.getElementById("modal-product-image").src=p.image;
  document.getElementById("modal-product-price").innerText=p.price;
  document.getElementById("modal-colors").innerHTML=p.colors.map(c=>`<button class="color-btn">${c}</button>`).join(" ");
  document.getElementById("modal-sizes").innerHTML=p.sizes.map(s=>`<button class="size-btn">${s}</button>`).join(" ");
  document.getElementById("qty-value").innerText=currentQty;
  document.getElementById("product-modal").style.display="block";
}

// CART FUNCTIONS
function renderCart(){
  const container=document.getElementById("cart-items");
  if(!container) return;
  container.innerHTML="";
  let total=0;
  cart.forEach((item,i)=>{
    total+=item.price*item.qty;
    const div=document.createElement("div");
    div.innerHTML=`${item.name} | ₦${item.price} x ${item.qty} 
      <button onclick="updateQty(${i},-1)">−</button>
      <button onclick="updateQty(${i},1)">+</button>
      <button onclick="removeCartItem(${i})">Delete</button>`;
    container.appendChild(div);
  });
  document.getElementById("cart-total").innerText=total;
  document.getElementById("cart-count").innerText=cart.length;
}

function updateQty(i,change){
  cart[i].qty+=change;
  if(cart[i].qty<1) cart[i].qty=1;
  save(CART_KEY,cart);
  renderCart();
}

function removeCartItem(i){
  cart.splice(i,1);
  save(CART_KEY,cart);
  renderCart();
}

// ADD TO CART
document.getElementById("add-to-cart-btn")?.addEventListener("click",()=>{
  const p=products[currentProductIndex];
  let cartItem=cart.find(c=>c.name===p.name);
  if(cartItem) cartItem.qty+=currentQty;
  else cart.push({...p, qty:currentQty});
  save(CART_KEY,cart);
  renderCart();
  document.getElementById("product-modal").style.display="none";
});

// CART MODAL
document.getElementById("cart-icon")?.addEventListener("click",()=>{ document.getElementById("cart-modal").style.display="block"; });
document.getElementById("close-cart")?.addEventListener("click",()=>{ document.getElementById("cart-modal").style.display="none"; });

// PRODUCT MODAL CLOSE
document.getElementById("close-product")?.addEventListener("click",()=>{ document.getElementById("product-modal").style.display="none"; });

// QUANTITY IN MODAL
document.getElementById("qty-plus")?.addEventListener("click",()=>{ currentQty++; document.getElementById("qty-value").innerText=currentQty; });
document.getElementById("qty-minus")?.addEventListener("click",()=>{ if(currentQty>1) currentQty--; document.getElementById("qty-value").innerText=currentQty; });

// FILTER COLLECTION
document.getElementById("collection-filter")?.addEventListener("change",renderStore);

// INIT
applyStoreSettings(); renderStore(); renderCart();
