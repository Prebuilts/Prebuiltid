// store.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, getDoc, doc, setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* FIREBASE CONFIG (use the one you specified) */
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
const productContainer = document.getElementById('shopgrid');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

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

const myOrdersBtn = document.getElementById("my-orders-btn");
const myOrdersModal = document.getElementById("my-orders-modal");
const myOrdersList = document.getElementById("my-orders-list");
const closeMyOrdersBtn = document.getElementById("close-my-orders");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settings-modal");
const settingsEmail = document.getElementById("settings-email");
const settingsAddress = document.getElementById("settings-address");
const settingsDpd = document.getElementById("settings-dpd");
const saveSettingsBtn = document.getElementById("save-settings");
const closeSettingsBtn = document.getElementById("close-settings");

const logoutEl = document.getElementById("logoutBtn");
const accountLink = document.getElementById("accountLink");

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("cart_v1") || "[]");

function saveCart() { localStorage.setItem("cart_v1", JSON.stringify(cart)); }
function updateCartCount() { cartCountEl && (cartCountEl.innerText = cart.length); }
function cartTotal() { return cart.reduce((s,i)=> s + (Number(i.price||0)), 0); }

/* render cart items in basket */
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

    const img = document.createElement('img'); img.src = item.image || '';
    const info = document.createElement('div'); info.className='info';
    info.innerHTML = `<h4>${escapeHtml(item.name)}</h4><div class="price">${Number(item.price).toFixed(2)}€</div>`;

    const actions = document.createElement('div'); actions.className='actions';
    const removeBtn = document.createElement('button'); removeBtn.innerText='Eemalda';
    removeBtn.onclick = ()=> {
      cart = cart.filter(c=> c.id !== item.id);
      saveCart(); renderCart();
      updateCartCount();
    };
    actions.appendChild(removeBtn);

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(actions);

    // Payment embed: if paymentButton present, add inside a box
    if (item.paymentButton) {
      const payBox = document.createElement('div');
      payBox.className = 'payment-embed';
      // Insert raw admin-provided HTML (trusted admin content)
      try {
        payBox.innerHTML = item.paymentButton;
      } catch(e){
        // fallback: if not HTML, show as link
        const a = document.createElement('a');
        a.href = String(item.paymentButton);
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        a.innerText = 'Maksa (NowPayments)';
        payBox.appendChild(a);
      }
      row.appendChild(payBox);
    }

    basketItemsEl.appendChild(row);
  });

  basketTotalEl && (basketTotalEl.innerText = cartTotal().toFixed(2) + "€");
  updateCartCount();
}

/* add to cart (enforce 1 per product id) */
window.addToCart = function(product){
  // product must contain id,name,price,image,paymentButton
  if (cart.find(c=> c.id === product.id)) {
    alert("Seda toodet on juba ostukorvis. Iga toote kohta üks eksemplar.");
    return;
  }
  // only add one unit per product
  cart.push({ id: product.id, name: product.name, price: Number(product.price||0), image: product.image||'', paymentButton: product.paymentButton || '' });
  saveCart(); renderCart(); updateCartCount();
};

/* UI for opening/closing basket */
cartIcon && cartIcon.addEventListener('click', ()=> { basketPanel.classList.add('open'); basketPanel.setAttribute('aria-hidden','false'); renderCart(); });
closeBasket && closeBasket.addEventListener('click', ()=> { basketPanel.classList.remove('open'); basketPanel.setAttribute('aria-hidden','true'); });

clearCartBtn && clearCartBtn.addEventListener('click', ()=> {
  if (confirm("Tühjendada ostukorv?")) {
    cart = []; saveCart(); renderCart(); updateCartCount();
  }
});

/* buy all: simply show confirmation modal here (admin buttons inside cart handle crypto) */
buyAllBtn && buyAllBtn.addEventListener('click', ()=> {
  if (!cart.length) { alert("Ostukorv on tühi."); return; }
  // show simple confirmation
  checkoutModal.classList.add('show');
});

/* confirm/ cancel checkout */
cancelCheckoutBtn && cancelCheckoutBtn.addEventListener('click', ()=> checkoutModal.classList.remove('show'));
confirmCheckoutBtn && confirmCheckoutBtn.addEventListener('click', ()=> {
  // For now we keep offline flow: create an order? (left minimal)
  alert("Tellimus registreeritud. Me võtame teiega ühendust.");
  cart = []; saveCart(); renderCart(); updateCartCount();
  checkoutModal.classList.remove('show');
  basketPanel.classList.remove('open');
});

/* My orders button - keep minimal (depends on your orders collection) */
myOrdersBtn && myOrdersBtn.addEventListener('click', ()=> {
  alert("Minu tellimused - funktsioon sõltub orders kogust (pole siin implementeeritud).");
});

/* PRODUCTS: realtime */
const productsRef = collection(db,"products");
onSnapshot(productsRef, snap => {
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts(allProducts);
});

/* render products in 3x3 grid */
function renderProducts(products){
  if (!productContainer) return;
  productContainer.innerHTML = '';
  products.forEach(product => {
    const qty = Number(product.quantity || 0);
    const div = document.createElement('div');
    div.className = 'productbox';
    div.innerHTML = `
      <img src="${escapeAttr(product.image||'')}" alt="${escapeHtml(product.name||'')}">
      <h3>${escapeHtml(product.name||'')}</h3>
      <div style="font-weight:700">${Number(product.price||0).toFixed(2)}€</div>
      <p>${escapeHtml(product.description||'')}</p>
      <div class="stock">Laos: ${qty}</div>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn view" ${product.link ? '' : 'disabled'}>Vaata lisaks</button>
        <button class="btn add" ${qty <= 0 ? 'disabled' : ''}>Lisa korvi</button>
      </div>
    `;

    // view link
    div.querySelector('.view').addEventListener('click', ()=> {
      if (product.link) window.open(product.link, '_blank');
    });

    // add to cart handler (enforce 1 per product)
    div.querySelector('.add').addEventListener('click', ()=> {
      window.addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        paymentButton: product.paymentButton || ''
      });
    });

    productContainer.appendChild(div);
  });
}

/* FILTER / SORT / SEARCH */
if (categorySelect) categorySelect.addEventListener('change', ()=> {
  const cat = categorySelect.value;
  if (cat === 'all') renderProducts(allProducts);
  else renderProducts(allProducts.filter(p => p.category === cat));
});
if (sortSelect) sortSelect.addEventListener('change', ()=> {
  const s = sortSelect.value;
  let copy = allProducts.slice();
  if (s === 'price-asc') copy.sort((a,b)=> Number(a.price||0)-Number(b.price||0));
  else if (s === 'price-desc') copy.sort((a,b)=> Number(b.price||0)-Number(a.price||0));
  else if (s === 'name-asc') copy.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
  else if (s === 'name-desc') copy.sort((a,b)=> String(b.name||'').localeCompare(String(a.name||'')));
  renderProducts(copy);
});
if (searchInput) searchInput.addEventListener('input', ()=> {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderProducts(allProducts);
  renderProducts(allProducts.filter(p => (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)));
});

/* SETTINGS: open modal, show email, load user's settings from users/{uid}, allow save */
settingsBtn && settingsBtn.addEventListener('click', ()=> {
  settingsModal.classList.add('show');
  settingsModal.setAttribute('aria-hidden','false');

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      settingsEmail.innerText = "Pole sisse logitud";
      settingsAddress.value = "";
      settingsDpd.value = "";
      return;
    }
    settingsEmail.innerText = user.email || user.uid;
    // load user doc
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        settingsAddress.value = data.address || "";
        settingsDpd.value = data.dpd || "";
      } else {
        settingsAddress.value = "";
        settingsDpd.value = "";
      }
    } catch (err) {
      console.error("Load user settings error", err);
    }
  });
});

closeSettingsBtn && closeSettingsBtn.addEventListener('click', ()=> {
  settingsModal.classList.remove('show');
  settingsModal.setAttribute('aria-hidden','true');
});

saveSettingsBtn && saveSettingsBtn.addEventListener('click', async ()=> {
  const user = auth.currentUser;
  if (!user) { alert("Palun logige sisse, et salvestada"); return; }
  try {
    await setDoc(doc(db,"users",user.uid), { address: settingsAddress.value, dpd: settingsDpd.value }, { merge: true });
    alert("Seaded salvestatud");
    settingsModal.classList.remove('show');
  } catch (err) {
    console.error("Save settings error", err);
    alert("Salvestamisel viga");
  }
});

/* AUTH UI: show/hide login/logout */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    accountLink && (accountLink.style.display='inline-block');
    logoutEl && (logoutEl.style.display='none');
  } else {
    accountLink && (accountLink.style.display='none');
    logoutEl && (logoutEl.style.display='inline-block');
    logoutEl.onclick = ()=> signOut(auth);
  }
});

/* helpers */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s=''){ return String(s).replace(/"/g,'&quot;'); }

/* init */
updateCartCount();
renderCart();