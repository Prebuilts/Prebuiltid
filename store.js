import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs } 
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyCXufE4ch7mmOdxxIZ641lTrzDgaDyfGgg",
    authDomain: "komisjonikaubamaja-website.firebaseapp.com",
    projectId: "komisjonikaubamaja-website",
    storageBucket: "komisjonikaubamaja-website.firebasestorage.app",
    messagingSenderId: "422777959258",
    appId: "1:422777959258:web:b3b4d1f1a858fd74caf963",
    measurementId: "G-L2BLBFLT9C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productContainer = document.getElementById('store-product-list');
const categorySelect = document.getElementById('categorySelect');

let allProducts = [];

/* === CART SYSTEM === */
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById("cart-count").innerText = count;
}

/* === OPEN/CLOSE CART PANEL === */
const cartIcon = document.getElementById("cart-icon");
const basketPanel = document.getElementById("basket-panel");
const closeBasket = document.getElementById("close-basket");

cartIcon.onclick = () => basketPanel.classList.add("open");
closeBasket.onclick = () => basketPanel.classList.remove("open");

/* === DISPLAY CART === */
function renderCart() {
    const basketItems = document.getElementById("basket-items");
    const basketTotal = document.getElementById("basket-total");

    basketItems.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.qty;

        basketItems.innerHTML += `
            <div class="basket-item">
                <span>${item.name}</span>

                <div class="basket-qty">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                </div>

                <button onclick="removeItem('${item.id}')">🗑️</button>
            </div>
        `;
    });

    basketTotal.innerText = total.toFixed(2) + "€";
    updateCartCount();
}

/* === ADD ITEM === */
window.addToCart = function(product) {
    const existing = cart.find(p => p.id === product.id);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart();
    renderCart();
};

/* === REMOVE ITEM === */
window.removeItem = function(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
};

/* === CHANGE QTY === */
window.changeQty = function(id, amount) {
    const item = cart.find(p => p.id === id);
    if (!item) return;

    item.qty += amount;

    if (item.qty <= 0) removeItem(id);

    saveCart();
    renderCart();
};

/* === LOAD PRODUCTS === */
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

/* === SHOW PRODUCTS === */
function displayProducts(products) {
    productContainer.innerHTML = "";

    if (products.length === 0) {
        productContainer.innerHTML = "<p>Tooteid ei leitud.</p>";
        return;
    }

    products.forEach(product => {
        const safeProduct = JSON.stringify({
            id: product.id,
            name: product.name,
            price: Number(product.price),
        });

        productContainer.innerHTML += `
            <div class="product-box">
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <h3>${product.price}€</h3>
                <p>${product.description}</p>

                <button onclick="openProductLink('${product.link}')">Vaata lisaks</button>
                <button onclick='addToCart(${safeProduct})'>Lisa korvi</button>
            </div>
        `;
    });
}

/* === CATEGORY FILTER === */
categorySelect.addEventListener("change", () => {
    const category = categorySelect.value;

    if (category === "all") {
        displayProducts(allProducts);
    } else {
        displayProducts(allProducts.filter(p => p.category === category));
    }
});

/* === OPEN EXTERNAL LINK === */
window.openProductLink = url => window.open(url, "_blank");

/* === INITIAL CART RENDER === */
renderCart();
updateCartCount();
