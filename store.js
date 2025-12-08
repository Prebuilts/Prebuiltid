/* eslint-disable no-undef */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* ================= FIREBASE (same as you had in the working site) ================= */
const firebaseConfig = { 
      apiKey: "AIzaSyBkbXzURYKixz4R28OYMUOueA9ysG3Q1Lo",
      authDomain: "prebuiltid-website.firebaseapp.com",
      projectId: "prebuiltid-website",
      storageBucket: "prebuiltid-website.firebasestorage.app",
      messagingSenderId: "854871585546",
      appId: "1:854871585546:web:568400979292a0c31740f3",
      measurementId: "G-YS1Q1904H6"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= DOM ELEMENTS ================= */
const productContainer = document.getElementById('store-product-list');
const categorySelect = document.getElementById('categorySelect');

const cartIcon = document.getElementById("cart-icon");
const basketPanel = document.getElementById("basket-panel");
const closeBasket = document.getElementById("close-basket");
const basketItemsEl = document.getElementById("basket-items");
const basketTotalEl = document.getElementById("basket-total");
const cartCountEl = document.getElementById("cart-count");

const clearCartBtn = document.getElementById("clear-cart-btn");
const buyAllBtn = document.getElementById("buy-all-btn");

/* Checkout modal */
const checkoutModal = document.getElementById("checkout-modal");
const checkoutEmailInput = document.getElementById("checkout-email");
const cancelCheckoutBtn = document.getElementById("cancel-checkout");
const confirmCheckoutBtn = document.getElementById("confirm-checkout");
const checkoutMessage = document.getElementById("checkout-message");

/* ================= CART (localStorage) ================= */
let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* Helper: persist cart */
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* Helper: compute totals */
function cartTotal() {
  return cart.reduce((acc, it) => acc + Number(it.price || 0) * (it.qty || 1), 0);
}

/* Update cart count badge */
function updateCartCount() {
  const count = cart.reduce((sum, it) => sum + (it.qty || 0), 0);
  cartCountEl.innerText = count;
}

/* Render cart inside the panel */
function renderCart() {
  basketItemsEl.innerHTML = "";
  if (cart.length === 0) {
    basketItemsEl.innerHTML = "<p>Korb on tühi.</p>";
    basketTotalEl.innerText = "0€";
    updateCartCount();
    return;
  }

  cart.forEach(item => {
    const itemRow = document.createElement("div");
    itemRow.className = "basket-item";

    // product name & price
    const nameSpan = document.createElement("span");
    nameSpan.innerText = `${item.name} — ${Number(item.price).toFixed(2)}€`;

    // quantity controls
    const qtyWrap = document.createElement("div");
    qtyWrap.className = "basket-qty";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.innerText = "-";
    minusBtn.onclick = () => changeQty(item.id, -1);

    const qtySpan = document.createElement("span");
    qtySpan.innerText = item.qty;

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.innerText = "+";
    plusBtn.onclick = () => changeQty(item.id, 1);

    qtyWrap.appendChild(minusBtn);
    qtyWrap.appendChild(qtySpan);
    qtyWrap.appendChild(plusBtn);

    // remove button
    const removeBtn = document.createElement("button");
    removeBtn.innerText = "Eemalda";
    removeBtn.onclick = () => removeItem(item.id);

    itemRow.appendChild(nameSpan);
    itemRow.appendChild(qtyWrap);
    itemRow.appendChild(removeBtn);

    basketItemsEl.appendChild(itemRow);
  });

  basketTotalEl.innerText = cartTotal().toFixed(2) + "€";
  updateCartCount();
}

/* Cart operations */
function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price || 0), qty: 1 });

  saveCart();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

function changeQty(id, delta) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) removeItem(id);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

/* Expose addToCart globally so product markup can call it */
window.addToCart = addToCart;

/* ================= OPEN/CLOSE CART UI ================= */
cartIcon.addEventListener("click", () => {
  basketPanel.classList.add("open");
  basketPanel.setAttribute("aria-hidden", "false");
});

closeBasket.addEventListener("click", () => {
  basketPanel.classList.remove("open");
  basketPanel.setAttribute("aria-hidden", "true");
});

/* clear cart */
clearCartBtn.addEventListener("click", () => {
  if (!confirm("Tühjendada ostukorv?")) return;
  clearCart();
});

/* ================= CHECKOUT FLOW ================= */

/* Pre-fill email input when user logged in (if any) */
onAuthStateChanged(auth, user => {
  if (user && user.email) {
    checkoutEmailInput.value = user.email;
  }
});

/* Buy all button -> open modal */
buyAllBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Ostukorv on tühi.");
    return;
  }

  // Set message (Estonian)
  checkoutMessage.innerText = "Me kontakteerume teiega 1-5 tööpäeva jooksul ning saadame info kuhu järgi tulla. Makse toimub kohapeal.";
  // Prefill email if available (auth listener will handle update too)
  checkoutModal.classList.add("show");
  checkoutModal.setAttribute("aria-hidden", "false");
});

/* Cancel checkout */
cancelCheckoutBtn.addEventListener("click", () => {
  checkoutModal.classList.remove("show");
  checkoutModal.setAttribute("aria-hidden", "true");
});

/* Confirm checkout - create an 'orders' document in Firestore */
confirmCheckoutBtn.addEventListener("click", async () => {
  const email = checkoutEmailInput.value?.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    alert("Palun sisesta kehtiv e-posti aadress.");
    return;
  }

  // Build order payload
  const orderPayload = {
    email,
    products: cart.map(p => ({ id: p.id, name: p.name, price: Number(p.price), qty: p.qty })),
    status: "pending",
    createdAt: serverTimestamp()
  };

  try {
    // Save to Firestore (orders collection in the same project your products live in)
    await addDoc(collection(db, "orders"), orderPayload);

    // Clear cart after successful save
    clearCart();

    // Close modal
    checkoutModal.classList.remove("show");
    checkoutModal.setAttribute("aria-hidden", "true");

    // Show confirmation text to user (in Estonian)
    alert("Me kontakteerume teiega 1-5 tööpäeva jooksul ning saadame info kuhu järgi tulla. Makse toimub kohapeal.");

  } catch (err) {
    console.error("Checkout save error:", err);
    alert("Tellimuse salvestamisel tekkis viga. Palun proovi hiljem.");
  }
});

/* ================= LOAD PRODUCTS (your existing Firestore logic) ================= */
let allProducts = [];

async function loadProducts() {
  try {
    const snapshot = await getDocs(collection(db, "products"));

    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    displayProducts(allProducts);
  } catch (error) {
    console.error("Firestore load error:", error);
  }
}

loadProducts();

/* ================= DISPLAY PRODUCTS (with Add to Cart) ================= */
function displayProducts(products) {
  productContainer.innerHTML = "";

  if (products.length === 0) {
    productContainer.innerHTML = "<p>Tooteid ei leitud.</p>";
    return;
  }

  products.forEach(product => {
    // Keep only the fields needed for cart to avoid accidental injection
    const productForCart = {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0)
    };

    const html = `
      <div class="product-box">
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <h3>${product.price}€</h3>
          <p>${product.description || ''}</p>

          <button onclick="openProductLink('${product.link || '#'}')">Vaata lisaks</button>
          <button onclick='addToCart(${JSON.stringify(productForCart)})'>Lisa korvi</button>
      </div>
    `;
    productContainer.innerHTML += html;
  });
}

/* ================= CATEGORY FILTER ================= */
categorySelect.addEventListener("change", () => {
  const category = categorySelect.value;

  if (category === "all") {
    displayProducts(allProducts);
  } else {
    const filtered = allProducts.filter(p => p.category === category);
    displayProducts(filtered);
  }
});

/* ================= OPEN LINK ================= */
window.openProductLink = (url) => {
  window.open(url, "_blank");
};

/* ================= INITIAL RENDER ================= */
renderCart();
updateCartCount();
