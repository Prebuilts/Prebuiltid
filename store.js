/* store.js - drop-in replacement (module) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* === Use this exact firebase config (prebuiltid project) === */
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

/* DOM refs */
const productContainer = document.getElementById('store-product-list') || document.querySelector('#shopgrid') || document.getElementById('shopgrid');
const categorySelect = document.getElementById('categorySelect');

const cartIcon = document.getElementById("cart-icon");
const basketPanel = document.getElementById("basket-panel");
const closeBasket = document.getElementById("close-basket");
const basketItemsEl = document.getElementById("basket-items");
const basketTotalEl = document.getElementById("basket-total");
const cartCountEl = document.getElementById("cart-count");

const clearCartBtn = document.getElementById("clear-cart-btn");
const buyAllBtn = document.getElementById("buy-all-btn");
const checkoutModal = document.getElementById("checkout-modal");
const cancelCheckoutBtn = document.getElementById("cancel-checkout");
const confirmCheckoutBtn = document.getElementById("confirm-checkout");

let allProducts = [];

/* cart in localStorage */
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); }
function updateCartCount(){ cartCountEl && (cartCountEl.innerText = cart.reduce((s,i)=> s + (i.qty||0), 0)); }
function cartTotal(){ return cart.reduce((s,i)=> s + (Number(i.price||0) * (i.qty||0)), 0); }

/* Render cart panel */
function renderCart(){
  if (!basketItemsEl) return;
  basketItemsEl.innerHTML = "";
  if (!cart.length) {
    basketItemsEl.innerHTML = "<p>Korb on tühi.</p>";
    basketTotalEl && (basketTotalEl.innerText = "0€");
    updateCartCount();
    return;
  }

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'basket-item';

    const left = document.createElement('div'); left.className = 'left';
    const img = document.createElement('img'); img.src = item.image || '';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:700">${item.name}</div><div style="font-size:13px;color:#666">${(Number(item.price)||0).toFixed(2)}€</div>`;
    left.appendChild(img); left.appendChild(info);

    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'qty-wrap';
    const minus = document.createElement('button'); minus.className='qty-btn'; minus.innerText='-';
    minus.onclick = () => changeQty(item.id, -1);
    const span = document.createElement('span'); span.innerText = item.qty; span.style.margin='0 8px';
    const plus = document.createElement('button'); plus.className='qty-btn'; plus.innerText='+';
    plus.onclick = () => changeQty(item.id, +1);
    qtyWrap.append(minus, span, plus);

    const remove = document.createElement('button'); remove.innerText='Eemalda'; remove.onclick = ()=> removeItem(item.id);

    row.append(left, qtyWrap, remove);
    basketItemsEl.appendChild(row);
  });

  basketTotalEl && (basketTotalEl.innerText = cartTotal().toFixed(2) + "€");
  updateCartCount();
}

/* change qty ensuring not over stock */
function changeQty(id, delta){
  const it = cart.find(c=>c.id===id); if(!it) return;
  const product = allProducts.find(p=>p.id===id);
  const stock = product ? Number(product.quantity || 0) : Infinity;
  const newQty = it.qty + delta;
  if (newQty <= 0) {
    // remove
    cart = cart.filter(c=>c.id!==id);
  } else if (newQty > stock) {
    alert(`Sa ei saa lisada rohkem kui ${stock} ühikut; laos ainult ${stock} alles.`);
    return;
  } else {
    it.qty = newQty;
  }
  saveCart(); renderCart();
}

/* remove */
function removeItem(id){ cart = cart.filter(c=>c.id!==id); saveCart(); renderCart(); }

/* add to cart - respects stock */
window.addToCart = function(product){
  // product must include id,name,price,image,quantity (quantity optional)
  const stock = Number(product.quantity || 0);
  const existing = cart.find(c=>c.id===product.id);
  const currentQty = existing ? existing.qty : 0;
  if (stock > 0 && currentQty + 1 > stock) {
    alert(`Laos ainult ${stock} ühikut. Sa ei saa lisada rohkem.`);
    return;
  }

  if (existing) existing.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price||0), qty:1, image: product.image || '' });

  saveCart(); renderCart();
};

/* clear cart */
clearCartBtn && clearCartBtn.addEventListener('click', ()=> {
  if (!confirm("Tühjendada ostukorv?")) return;
  cart = []; saveCart(); renderCart();
});

/* basket UI open/close */
cartIcon && cartIcon.addEventListener('click', ()=> { basketPanel.classList.add('open'); basketPanel.setAttribute('aria-hidden','false'); });
closeBasket && closeBasket.addEventListener('click', ()=> { basketPanel.classList.remove('open'); basketPanel.setAttribute('aria-hidden','true'); });

/* checkout - logged-in only & check 3 active orders limit client-side */
confirmCheckoutBtn && confirmCheckoutBtn.addEventListener('click', async ()=> {
  const user = auth.currentUser;
  if (!user) { alert("Palun logi sisse, et teha tellimus."); window.location.href='login.html'; return; }
  if (!cart.length) { alert("Ostukorv on tühi."); return; }

  // check active orders count client-side
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("uid", "==", user.uid), where("status", "in", ["pending", "processing"]));
    const snaps = await getDocs(q);
    if (snaps.size >= 3) { alert("Sul on juba 3 aktiivset tellimust. Palun oota."); return; }
  } catch(err) {
    console.error("Active order check failed:", err);
  }

  // Build payload
  const payload = {
    uid: user.uid,
    email: user.email || null,
    products: cart.map(c=>({ id:c.id, name:c.name, price:c.price, qty:c.qty })),
    status: 'pending',
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "orders"), payload);
    cart = []; saveCart(); renderCart();
    // close modal & panel
    checkoutModal && checkoutModal.classList.remove('show');
    basketPanel && basketPanel.classList.remove('open');
    alert("Tellimus saadetud! Me võtame teiega ühendust 1-5 tööpäeva jooksul.");
  } catch (err) {
    console.error("Order save error:", err);
    alert("Tellimuse salvestamisel tekkis viga. Palun proovi hiljem.");
  }
});

/* prepare checkout modal open */
buyAllBtn && buyAllBtn.addEventListener('click', ()=> {
  if (!auth.currentUser) { alert("Palun logi sisse, et teha tellimus."); window.location.href='login.html'; return; }
  if (!cart.length) { alert("Ostukorv on tühi."); return; }
  // show modal (checkout-modal id)
  checkoutModal && checkoutModal.classList.add('show');
});

/* cancel checkout */
cancelCheckoutBtn && cancelCheckoutBtn.addEventListener('click', ()=> { checkoutModal && checkoutModal.classList.remove('show'); });

/* Load products from Firestore (products collection) */
async function loadProducts() {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayProducts(allProducts);
    renderCart();
  } catch (err) {
    console.error("Firestore load error:", err);
    if (productContainer) productContainer.innerHTML = "<p>Toodete laadimisel tekkis viga.</p>";
  }
}

/* Display products: ensures product.quantity shown and add button disabled when out of stock */
function displayProducts(products) {
  if (!productContainer) return;
  productContainer.innerHTML = "";

  if (!products.length) {
    productContainer.innerHTML = "<p>Tooteid ei leitud.</p>";
    return;
  }

  products.forEach(product => {
    const qty = Number(product.quantity || 0);
    const disabled = qty <= 0 ? 'disabled' : '';

    // include image for basket display
    const html = `
      <div class="productbox">
        <div>
          <img src="${product.image || ''}" alt="${escapeHtml(product.name || '')}">
          <h3>${escapeHtml(product.name || '')}</h3>
          <div style="font-weight:700">${Number(product.price || 0).toFixed(2)}€</div>
          <p>${escapeHtml(product.description || '')}</p>
          <div class="stock">Laos: ${qty}</div>
        </div>
        <div style="margin-top:10px;">
          <button onclick="openProductLink('${product.link || '#'}')" class="btn">Vaata lisaks</button>
          <button ${disabled} onclick='addToCart(${JSON.stringify({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: product.quantity })})' class="btn" style="margin-left:8px;">
            ${qty <= 0 ? 'Loe välja' : 'Lisa korvi'}
          </button>
        </div>
      </div>
    `;
    productContainer.innerHTML += html;
  });
}

window.openProductLink = url => window.open(url, "_blank");

/* helper: escape html (small) */
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* CATEGORY FILTER */
if (categorySelect) categorySelect.addEventListener('change', ()=> {
  const category = categorySelect.value;
  if (category === 'all') displayProducts(allProducts);
  else displayProducts(allProducts.filter(p => p.category === category));
});

/* init */
loadProducts();
updateCartCount();
renderCart();

/* sign out button if exists */
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', ()=> signOut(auth));
