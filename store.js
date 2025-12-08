/* store.js - requires module environment */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* === Your required single Firebase config (prebuiltid project) === */
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

/* DOM */
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
const myOrdersBtn = document.getElementById("my-orders-btn");

const checkoutModal = document.getElementById("checkout-modal");
const cancelCheckoutBtn = document.getElementById("cancel-checkout");
const confirmCheckoutBtn = document.getElementById("confirm-checkout");
const checkoutMessage = document.getElementById("checkout-message");

const myOrdersModal = document.getElementById("my-orders-modal");
const myOrdersList = document.getElementById("my-orders-list");
const closeMyOrdersBtn = document.getElementById("close-my-orders");

const accountLink = document.getElementById("accountLink");
const logoutBtn = document.getElementById("logoutBtn");

/* Local cart */
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); }
function cartTotal(){ return cart.reduce((s,i)=> s + Number(i.price||0)*(i.qty||1), 0); }
function updateCartCount(){ cartCountEl.innerText = cart.reduce((s,i)=> s + (i.qty||0),0); }

/* Render cart */
function renderCart(){
  basketItemsEl.innerHTML = "";
  if (cart.length === 0){ basketItemsEl.innerHTML = "<p>Korb on tühi.</p>"; basketTotalEl.innerText = "0€"; updateCartCount(); return; }
  cart.forEach(item=>{
    const row = document.createElement("div");
    row.className = "basket-item";
    const name = document.createElement("div");
    name.innerText = `${item.name} — ${Number(item.price).toFixed(2)}€`;
    const qtyWrap = document.createElement("div");
    qtyWrap.className = "basket-qty";
    const minus = document.createElement("button"); minus.className="qty-btn"; minus.innerText="-";
    minus.onclick = ()=> changeQty(item.id,-1);
    const qty = document.createElement("span"); qty.innerText = item.qty;
    const plus = document.createElement("button"); plus.className="qty-btn"; plus.innerText="+";
    plus.onclick = ()=> changeQty(item.id,1);
    qtyWrap.append(minus, qty, plus);
    const rm = document.createElement("button"); rm.innerText = "Eemalda"; rm.onclick = ()=> removeItem(item.id);
    row.append(name, qtyWrap, rm);
    basketItemsEl.appendChild(row);
  });
  basketTotalEl.innerText = cartTotal().toFixed(2) + "€";
  updateCartCount();
}

/* Cart ops */
function addToCart(product){
  const ex = cart.find(p=>p.id===product.id);
  if (ex) ex.qty++;
  else cart.push({ id:product.id, name:product.name, price:Number(product.price||0), qty:1 });
  saveCart(); renderCart();
}
window.addToCart = addToCart;

function removeItem(id){ cart = cart.filter(i=>i.id!==id); saveCart(); renderCart(); }
function changeQty(id,delta){ const it = cart.find(i=>i.id===id); if(!it) return; it.qty += delta; if(it.qty<=0) removeItem(id); saveCart(); renderCart(); }
function clearCart(){ if(!confirm("Tühjendada ostukorv?")) return; cart=[]; saveCart(); renderCart(); }

/* UI open/close */
cartIcon.addEventListener("click", ()=> { basketPanel.classList.add("open"); basketPanel.setAttribute("aria-hidden","false"); });
closeBasket.addEventListener("click", ()=> { basketPanel.classList.remove("open"); basketPanel.setAttribute("aria-hidden","true"); });

clearCartBtn.addEventListener("click", clearCart);

/* Auth handling - require login for store (logged-in only) */
let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (!user) {
    // not logged in -> redirect to login
    window.location.href = "login.html";
    return;
  }
  // show logout, hide login link
  accountLink.style.display = "none";
  logoutBtn.style.display = "inline-block";
  logoutBtn.onclick = () => signOut(auth);
  // prefill any UI if needed
  renderCart();
});

/* Checkout flow: logged-in only, check 3 active orders max */
buyAllBtn.addEventListener("click", async () => {
  if (!currentUser) { alert("Palun logi sisse, et teha tellimus."); return; }
  if (cart.length === 0) { alert("Ostukorv on tühi."); return; }

  // check active orders count for this user
  try {
    const ordersRef = collection(db, "orders");
    // active statuses = pending or processing
    const q = query(ordersRef, where("uid", "==", currentUser.uid), where("status", "in", ["pending", "processing"]));
    const snaps = await getDocs(q);
    if (snaps.size >= 3) {
      alert("Sul on juba 3 aktiivset tellimust. Palun oota kuni üks neist on lõpetatud või tühistatud.");
      return;
    }
  } catch (err) {
    console.error("Order count check error:", err);
    alert("Tellimuse kontrollimisel tekkis viga. Palun proovi hiljem.");
    return;
  }

  // show confirmation modal (text already localized)
  checkoutModal.classList.add("show");
  checkoutModal.setAttribute("aria-hidden", "false");
});

/* cancel checkout */
cancelCheckoutBtn.addEventListener("click", ()=> {
  checkoutModal.classList.remove("show");
  checkoutModal.setAttribute("aria-hidden", "true");
});

/* confirm checkout */
confirmCheckoutBtn.addEventListener("click", async () => {
  if (!currentUser) { alert("Palun logi sisse uuesti."); return; }

  confirmCheckoutBtn.disabled = true;
  confirmCheckoutBtn.innerText = "Salvestamine...";

  const orderPayload = {
    uid: currentUser.uid,
    email: currentUser.email || null,
    products: cart.map(p=>({ id:p.id, name:p.name, price: Number(p.price||0), qty: p.qty })),
    status: "pending",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "orders"), orderPayload);
    clearCart();
    checkoutModal.classList.remove("show");
    checkoutModal.setAttribute("aria-hidden", "true");
    alert("Tellimus on saadetud! Me kontakteerume teiega 1-5 tööpäeva jooksul ning saadame info kuhu järgi tulla. Makse toimub kohapeal.");
  } catch (err) {
    console.error("Order save error:", err);
    alert("Tellimuse salvestamisel tekkis viga. Palun proovi hiljem.");
  } finally {
    confirmCheckoutBtn.disabled = false;
    confirmCheckoutBtn.innerText = "Kinnita ostu";
  }
});

/* My orders modal */
myOrdersBtn.addEventListener("click", ()=> {
  if (!currentUser) { alert("Palun logi sisse."); return; }
  loadMyOrders();
  myOrdersModal.classList.add("show");
  myOrdersModal.setAttribute("aria-hidden","false");
});
closeMyOrdersBtn.addEventListener("click", ()=> {
  myOrdersModal.classList.remove("show");
  myOrdersModal.setAttribute("aria-hidden","true");
});

/* load user's orders and allow cancelling their own orders */
async function loadMyOrders(){
  myOrdersList.innerHTML = "<p>Laadin...</p>";
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("uid", "==", currentUser.uid), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if (snap.empty) { myOrdersList.innerHTML = "<p>Tellimusi ei ole.</p>"; return; }
    myOrdersList.innerHTML = "";
    snap.forEach(docSnap=>{
      const od = docSnap.data();
      const id = docSnap.id;
      const div = document.createElement("div");
      div.style.borderBottom = "1px solid #eee";
      div.style.padding = "8px 0";
      const when = od.createdAt && od.createdAt.toDate ? od.createdAt.toDate().toLocaleString() : "—";
      div.innerHTML = `<p><strong>${when}</strong> — ${od.status || '—'}</p>`;
      const ul = document.createElement("div");
      od.products.forEach(p => {
        const pEl = document.createElement("div");
        pEl.innerText = `${p.name} — ${Number(p.price).toFixed(2)}€ x ${p.qty}`;
        ul.appendChild(pEl);
      });
      div.appendChild(ul);

      // cancel button only when pending or processing
      if (od.status === "pending" || od.status === "processing") {
        const cancelBtn = document.createElement("button");
        cancelBtn.innerText = "Tühista tellimus";
        cancelBtn.onclick = async ()=>{
          if (!confirm("Kas oled kindel, et soovid tühistada selle tellimuse?")) return;
          try {
            // attempt deletion (must be allowed by Firestore rules)
            await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
              .then(m => m.deleteDoc(m.doc(db, "orders", id)));
            alert("Tellimus tühistatud.");
            loadMyOrders();
          } catch (err) {
            console.error("Cancel order error (client):", err);
            alert("Tellimuse tühistamisel tekkis viga. Palun pöördu admini poole.");
          }
        };
        div.appendChild(cancelBtn);
      } else {
        const note = document.createElement("div");
        note.style.color = "#666";
        note.style.fontSize = "13px";
        note.innerText = "Seda tellimust ei saa enam tühistada.";
        div.appendChild(note);
      }
      myOrdersList.appendChild(div);
    });
  } catch (err) {
    console.error("Load my orders error:", err);
    myOrdersList.innerHTML = "<p>Tellimuste laadimisel tekkis viga.</p>";
  }
}

/* PRODUCTS: load from 'products' collection (same logic as before) */
let allProducts = [];
async function loadProducts(){
  try {
    const snaps = await getDocs(collection(db, "products"));
    allProducts = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
    displayProducts(allProducts);
  } catch (err) {
    console.error("Load products error:", err);
    productContainer.innerHTML = "<p>Toodete laadimisel tekkis viga.</p>";
  }
}
loadProducts();

function displayProducts(products){
  productContainer.innerHTML = "";
  if (!products.length) { productContainer.innerHTML = "<p>Tooteid ei leitud.</p>"; return; }
  products.forEach(product => {
    const productForCart = { id: product.id, name: product.name, price: Number(product.price || 0) };
    productContainer.innerHTML += `
      <div class="product-box">
        <img src="${product.image || ''}" alt="${product.name}">
        <h3>${product.name}</h3>
        <h3>${product.price}€</h3>
        <p>${product.description || ''}</p>
        <button onclick="openProductLink('${product.link || '#'}')">Vaata lisaks</button>
        <button onclick='addToCart(${JSON.stringify(productForCart)})'>Lisa korvi</button>
      </div>
    `;
  });
}
window.openProductLink = (url) => window.open(url, "_blank");

/* CATEGORY FILTER */
categorySelect.addEventListener("change", ()=> {
  const category = categorySelect.value;
  if (category === "all") displayProducts(allProducts);
  else displayProducts(allProducts.filter(p => p.category === category));
});

/* initial UI render */
renderCart();
updateCartCount();
