// --- LocalStorage Keys ---
let products = JSON.parse(localStorage.getItem("products")) || [];
let collections = JSON.parse(localStorage.getItem("collections")) || {};
let settings = JSON.parse(localStorage.getItem("settings")) || {};

// --- Elements ---
const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const nameInput = document.getElementById("product-name");
const priceInput = document.getElementById("product-price");
const costInput = document.getElementById("product-cost");
const imageInput = document.getElementById("product-image");
const colorsInput = document.getElementById("product-colors");
const sizesInput = document.getElementById("product-sizes");
const adminProducts = document.getElementById("admin-products");
const collectionProducts = document.getElementById("collection-products");
const storeNameInput = document.getElementById("store-name");
const whatsappInput = document.getElementById("whatsapp-number");
const bankNameInput = document.getElementById("bank-account-name");
const bankNumberInput = document.getElementById("bank-account-number");
const saveAllBtn = document.getElementById("save-all");

// --- Render Admin Products ---
function renderProducts() {
  adminProducts.innerHTML = "";
  products.forEach((prod, index) => {
    const div = document.createElement("div");
    div.classList.add("product-card");
    div.innerHTML = `
      <strong>${prod.name}</strong><br>
      Price: ${prod.price} | Cost: ${prod.cost}<br>
      Colors: ${prod.colors.join(", ")}<br>
      Sizes: ${prod.sizes.join(", ")}<br>
      <button onclick="editProduct(${index})">Edit</button>
      <button onclick="deleteProduct(${index})">Delete</button>
    `;
    adminProducts.appendChild(div);
  });
}

// --- Edit Product ---
function editProduct(index) {
  const prod = products[index];
  productIdInput.value = index;
  nameInput.value = prod.name;
  priceInput.value = prod.price;
  costInput.value = prod.cost;
  colorsInput.value = prod.colors.join("\n");
  sizesInput.value = prod.sizes.join("\n");
}

// --- Delete Product ---
function deleteProduct(index) {
  products.splice(index, 1);
  saveProducts();
  renderProducts();
  renderCollectionProducts();
}

// --- Save Products ---
function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
}

// --- Handle Product Form Submit ---
productForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = productIdInput.value;
  const newProd = {
    name: nameInput.value,
    price: priceInput.value,
    cost: costInput.value,
    colors: colorsInput.value.split("\n").map(c => c.trim()).filter(c=>c),
    sizes: sizesInput.value.split("\n").map(s => s.trim()).filter(s=>s)
  };

  if (imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function() {
      newProd.image = reader.result;
      if (id === "") {
        products.push(newProd);
      } else {
        products[id] = newProd;
      }
      saveProducts();
      renderProducts();
      renderCollectionProducts();
      productForm.reset();
      productIdInput.value = "";
    }
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    if (id === "") {
      products.push(newProd);
    } else {
      products[id] = newProd;
    }
    saveProducts();
    renderProducts();
    renderCollectionProducts();
    productForm.reset();
    productIdInput.value = "";
  }
});

// --- Render Collection Products ---
function renderCollectionProducts() {
  collectionProducts.innerHTML = "";
  products.forEach((prod, index) => {
    const div = document.createElement("div");
    div.classList.add("product-card");
    const checkedCollections = Object.keys(collections).filter(col => collections[col].includes(index));
    div.innerHTML = `
      <strong>${prod.name}</strong><br>
      Assign to Collection: <input type="text" id="col-${index}" value="${checkedCollections.join(', ')}">
      <button onclick="assignCollections(${index})">Save</button>
    `;
    collectionProducts.appendChild(div);
  });
}

// --- Assign Collections ---
function assignCollections(index) {
  const input = document.getElementById(`col-${index}`);
  const colNames = input.value.split(",").map(c=>c.trim()).filter(c=>c);
  Object.keys(collections).forEach(col=>{
    collections[col] = collections[col].filter(i=>i!==index);
  });
  colNames.forEach(c=>{
    if (!collections[c]) collections[c] = [];
    collections[c].push(index);
  });
  localStorage.setItem("collections", JSON.stringify(collections));
  renderCollectionProducts();
}

// --- Save All Settings ---
saveAllBtn.addEventListener("click", ()=>{
  settings.storeName = storeNameInput.value;
  settings.whatsappNumber = whatsappInput.value;
  settings.bankAccountName = bankNameInput.value;
  settings.bankAccountNumber = bankNumberInput.value;
  localStorage.setItem("settings", JSON.stringify(settings));
  alert("All settings saved!");
});

// --- Initial Render ---
renderProducts();
renderCollectionProducts();
storeNameInput.value = settings.storeName || "";
whatsappInput.value = settings.whatsappNumber || "";
bankNameInput.value = settings.bankAccountName || "";
bankNumberInput.value = settings.bankAccountNumber || "";
