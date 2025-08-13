let cart = [];
let totalAmount = 0;

// Customer functions
function addToCart(name, price) {
  cart.push({ name, price });
  totalAmount += price;
  alert(`${name} added to cart!`);
}

function proceedCheckout(event) {
  event.preventDefault();
  if (cart.length === 0) {
    alert("Please add products to cart first!");
    return;
  }

  // Show bank details
  document.getElementById("bank-details").classList.remove("hidden");
  document.getElementById("total-amount").innerText = totalAmount;
}

// Admin functions
function updateStoreName() {
  const name = document.getElementById("admin-store-name").value;
  if (name) {
    document.getElementById("store-name").innerText = name;
    alert("Store name updated!");
  }
}

function updateAnnouncement() {
  const msg = document.getElementById("admin-announcement").value;
  if (msg) {
    document.getElementById("announcements").innerHTML = `<p>${msg}</p>`;
    alert("Announcement updated!");
  }
}

function updateWhatsApp() {
  const number = document.getElementById("admin-whatsapp").value;
  if (number) {
    document.getElementById("whatsapp-icon").href = `https://wa.me/${number.replace(/\D/g, '')}`;
    alert("WhatsApp number updated!");
  }
}

// Add new product from admin
function addProduct() {
  const name = document.getElementById("product-name").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const image = document.getElementById("product-image").value;

  if (!name || !price || !image) {
    alert("Please fill all fields!");
    return;
  }

  // Create new product card
  const productSection = document.getElementById("products");
  const card = document.createElement("div");
  card.className = "product-card";
  card.innerHTML = `
    <img src="${image}" alt="${name}">
    <h3>${name}</h3>
    <p>₦${price}</p>
    <button onclick="addToCart('${name}', ${price})">Buy</button>
  `;
  productSection.appendChild(card);

  alert("Product added successfully!");
  
  // Clear inputs
  document.getElementById("product-name").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-image").value = "";
}
