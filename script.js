// ---------- STORE + ADMIN DATA ----------
let products = JSON.parse(localStorage.getItem("products")) || [];
let collections = JSON.parse(localStorage.getItem("collections")) || [];
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let storeSettings = JSON.parse(localStorage.getItem("storeSettings")) || {
  name: "My Store",
  color: "#ff6600",
  logo: "logo.png",
  announcement: "Welcome to my store!"
};
let bankDetails = JSON.parse(localStorage.getItem("bankDetails")) || {
  bankName: "",
  accountName: "",
  accountNumber: ""
};
let deliveryZones = JSON.parse(localStorage.getItem("deliveryZones")) || [];

// ---------- UTIL ----------
function saveAll(){
    localStorage.setItem("products", JSON.stringify(products));
    localStorage.setItem("collections", JSON.stringify(collections));
    localStorage.setItem("orders", JSON.stringify(orders));
    localStorage.setItem("storeSettings", JSON.stringify(storeSettings));
    localStorage.setItem("bankDetails", JSON.stringify(bankDetails));
    localStorage.setItem("deliveryZones", JSON.stringify(deliveryZones));
    renderStore();
    renderAdminProducts();
    renderCollections();
    renderDeliveryZones();
    renderStoreSettings();
    renderBankDetails();
    renderOrders();
}

// ---------- STORE RENDER ----------
function renderStore(){
    // store name & color & logo
    document.getElementById("store-name-display").innerText = storeSettings.name;
    document.querySelector("header").style.backgroundColor = storeSettings.color;
    document.querySelector(".logo").src = storeSettings.logo;
    document.getElementById("store-announcement").innerText = storeSettings.announcement;

    // collections filter
    const collectionFilter = document.getElementById("collection-filter");
    collectionFilter.innerHTML = '<option value="">All</option>';
    collections.forEach(c=>{
        let option = document.createElement("option");
        option.value = c.name;
        option.innerText = c.name;
        collectionFilter.appendChild(option);
    });

    // products section
    const section = document.getElementById("products-section");
    section.innerHTML = "";
    let selectedCollection = collectionFilter.value;
    products.filter(p => !selectedCollection || p.collection === selectedCollection).forEach((p,index)=>{
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h4>${p.name}</h4>
            <p>₦${p.price}</p>
            <div>
              <label>Color:</label>
              <select id="color-${index}">${p.colors.map(c=>`<option>${c}</option>`).join("")}</select>
            </div>
            <div>
              <label>Size:</label>
              <select id="size-${index}">${p.sizes.map(s=>`<option>${s}</option>`).join("")}</select>
            </div>
            <div>
              <button onclick="addToCart(${index},1)">Add +</button>
              <button onclick="addToCart(${index},-1)">Remove -</button>
            </div>
        `;
        section.appendChild(card);
    });
}

// ---------- CART ----------
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function addToCart(index,qty){
    let product = products[index];
    let cartItem = cart.find(c=>c.id===product.id && c.color===product.colors[0] && c.size===product.sizes[0]);
    if(cartItem){
        cartItem.qty += qty;
        if(cartItem.qty<0) cartItem.qty=0;
    }else if(qty>0){
        cart.push({...product, qty: qty, color: product.colors[0], size: product.sizes[0]});
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartIcon();
}

function updateCartIcon(){
    document.getElementById("cart-count").innerText = cart.reduce((a,c)=>a+c.qty,0);
}

// ---------- ADMIN RENDER ----------
function renderAdminProducts(){
    const adminDiv = document.getElementById("admin-products");
    adminDiv.innerHTML = "";
    products.forEach((p,i)=>{
        const div = document.createElement("div");
        div.innerHTML = `
          <strong>${p.name}</strong> | ₦${p.price} | Original: ₦${p.original} | Gain: ₦${p.price - p.original}
          <button onclick="editProduct(${i})">Edit</button>
          <button onclick="deleteProduct(${i})">Delete</button>
        `;
        adminDiv.appendChild(div);
    });
}

function addProductPrompt(){
    let name = prompt("Product Name:");
    let price = parseFloat(prompt("Selling Price (₦):"));
    let original = parseFloat(prompt("Original Cost (₦):"));
    let colors = prompt("Colors (comma separated):").split(",");
    let sizes = prompt("Sizes (comma separated):").split(",");
    let image = prompt("Image filename (e.g., product1.png):");
    products.push({id: Date.now(),name,price,original,colors,sizes,image,collection:""});
    saveAll();
}

function editProduct(index){
    let p = products[index];
    p.name = prompt("Product Name:",p.name);
    p.price = parseFloat(prompt("Selling Price (₦):",p.price));
    p.original = parseFloat(prompt("Original Cost (₦):",p.original));
    p.colors = prompt("Colors (comma separated):",p.colors.join(",")).split(",");
    p.sizes = prompt("Sizes (comma separated):",p.sizes.join(",")).split(",");
    p.image = prompt("Image filename:",p.image);
    saveAll();
}

function deleteProduct(index){
    if(confirm("Delete this product?")){
        products.splice(index,1);
        saveAll();
    }
}

// ---------- COLLECTIONS ----------
function renderCollections(){
    const div = document.getElementById("collection-products");
    div.innerHTML="";
    collections.forEach((c,i)=>{
        const section = document.createElement("div");
        section.innerHTML = `
          <strong>${c.name}</strong>
          <button onclick="editCollection(${i})">Edit</button>
          <button onclick="deleteCollection(${i})">Delete</button>
          <button onclick="assignToCollection(${i})">Assign Products</button>
        `;
        div.appendChild(section);
    });
}

function addCollectionPrompt(){
    let name = prompt("Collection Name:");
    collections.push({id: Date.now(),name});
    saveAll();
}

function editCollection(i){
    collections[i].name = prompt("Collection Name:",collections[i].name);
    saveAll();
}

function deleteCollection(i){
    if(confirm("Delete this collection?")){
        collections.splice(i,1);
        saveAll();
    }
}

function assignToCollection(i){
    let col = collections[i];
    let choices = products.map((p,index)=>`${index}: ${p.name} (Current: ${p.collection || "None"})`).join("\n");
    let selection = prompt(`Assign products to collection ${col.name}:\n${choices}\nEnter comma separated product numbers`);
    if(selection){
        selection.split(",").map(s=>products[parseInt(s)]).forEach(p=>p.collection=col.name);
        saveAll();
    }
}

// ---------- STORE SETTINGS ----------
function renderStoreSettings(){
    document.getElementById("store-name").value = storeSettings.name;
    document.getElementById("store-color").value = storeSettings.color;
    document.getElementById("store-logo").value = storeSettings.logo;
    document.getElementById("store-announcement-input").value = storeSettings.announcement;
}

function saveStoreSettings(){
    storeSettings.name = document.getElementById("store-name").value;
    storeSettings.color = document.getElementById("store-color").value;
    storeSettings.logo = document.getElementById("store-logo").value;
    storeSettings.announcement = document.getElementById("store-announcement-input").value;
    saveAll();
}

// ---------- BANK DETAILS ----------
function renderBankDetails(){
    document.getElementById("bank-name").value = bankDetails.bankName;
    document.getElementById("account-name").value = bankDetails.accountName;
    document.getElementById("account-number").value = bankDetails.accountNumber;
}

function saveBankDetails(){
    bankDetails.bankName = document.getElementById("bank-name").value;
    bankDetails.accountName = document.getElementById("account-name").value;
    bankDetails.accountNumber = document.getElementById("account-number").value;
    saveAll();
}

// ---------- DELIVERY ZONES ----------
function renderDeliveryZones(){
    const div = document.getElementById("delivery-zones-list");
    div.innerHTML="";
    deliveryZones.forEach((d,i)=>{
        const section = document.createElement("div");
        section.innerHTML = `
          <strong>${d.zone}</strong> | Fee: ₦${d.fee}
          <button onclick="editDelivery(${i})">Edit</button>
          <button onclick="deleteDelivery(${i})">Delete</button>
        `;
        div.appendChild(section);
    });
}

function addDeliveryZonePrompt(){
    let zone = prompt("Zone Name:");
    let fee = parseFloat(prompt("Fee (₦):"));
    deliveryZones.push({zone,fee});
    saveAll();
}

function editDelivery(i){
    deliveryZones[i].zone = prompt("Zone Name:",deliveryZones[i].zone);
    deliveryZones[i].fee = parseFloat(prompt("Fee (₦):",deliveryZones[i].fee));
    saveAll();
}

function deleteDelivery(i){
    if(confirm("Delete this delivery zone?")){
        deliveryZones.splice(i,1);
        saveAll();
    }
}

// ---------- ORDERS ----------
function renderOrders(){
    const div = document.getElementById("admin-orders");
    div.innerHTML="";
    orders.forEach((o,i)=>{
        const section = document.createElement("div");
        section.innerHTML = `
          <strong>Order #${o.id}</strong> | Status: ${o.status} | Customer: ${o.name} | ₦${o.total}
          <button onclick="updateOrderStatus(${i})">Change Status</button>
        `;
        div.appendChild(section);
    });
}

function updateOrderStatus(i){
    let status = prompt("Order Status (Pending, Successful, Cancelled):",orders[i].status);
    if(status){
        orders[i].status = status;
        sendEmailNotification(orders[i]);
        saveAll();
    }
}

// ---------- EMAILJS ----------
function sendEmailNotification(order){
    // Admin email
    emailjs.send('service_opcf6cl','template_4zrsdni',{
        to_email: "admin@example.com",
        customer_name: order.name,
        customer_email: order.email,
        order_id: order.id,
        status: order.status,
        total: order.total
    });

    // Customer email
    emailjs.send('service_opcf6cl','template_zc87bdl',{
        to_email: order.email,
        customer_name: order.name,
        order_id: order.id,
        status: order.status,
        total: order.total
    });
}

// ---------- CART CHECKOUT ----------
document.getElementById("checkout-btn").addEventListener("click",()=>{
    const name = document.getElementById("customer-name").value;
    const email = document.getElementById("customer-email").value;
    const phone = document.getElementById("customer-phone").value;
    const address = document.getElementById("customer-address").value;
    const delivery = document.getElementById("delivery-zone").value;
    if(!name || !email || !phone || !address){
        alert("Please fill all details");
        return;
    }
    let total = cart.reduce((a,c)=>a + c.price*c.qty,0);
    let order = {
        id: Date.now(),
        items: [...cart],
        name,email,phone,address,delivery,
        status:"Pending",
        total
    };
    orders.push(order);
    cart = [];
    localStorage.setItem("cart",JSON.stringify(cart));
    updateCartIcon();
    saveAll();
    sendEmailNotification(order);
    alert("Order placed!");
    document.getElementById("cart-modal").style.display="none";
});

// ---------- INIT ----------
saveAll();
updateCartIcon();
