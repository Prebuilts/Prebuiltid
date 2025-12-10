// store.js (FULL) - includes crypto modal with QR, CoinGecko price +3%
// Uses firebase v12.2.1 as before. Uses product field: `quantity`.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* ---------------- FIREBASE CONFIG ---------------- */
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

/* ---------------- DOM REFS ---------------- */
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

const accountLink = document.getElementById("accountLink");
const logoutEl = document.getElementById("logoutBtn");

/* ---------------- CRYPTO DOM ---------------- */
const cryptoModal = document.getElementById("crypto-modal");
const cryptoSelect = document.getElementById("crypto-select");
const cryptoAmountEl = document.getElementById("crypto-amount");
const cryptoEurAmountEl = document.getElementById("crypto-eur-amount");
const cryptoAddressEl = document.getElementById("crypto-address");
const cryptoQrImg = document.getElementById("crypto-qr");
const confirmPaidBtn = document.getElementById("confirm-paid-btn");
const closeCryptoBtn = document.getElementById("close-crypto-btn");
const openCryptoBtn = document.getElementById("pay-crypto-open-btn");

/* ---------------- STATE ---------------- */
let allProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); }
function updateCartCount(){ cartCountEl && (cartCountEl.innerText = cart.reduce((s,i)=> s + (i.qty||0),0)); }
function cartTotal(){ return cart.reduce((s,i)=> s + (Number(i.price||0) * (i.qty||0)),0); }

/* ---------------- PLACEHOLDER WALLETS (REPLACE WITH YOURS) ---------------- */
const WALLET = {
  xmr: "YOUR_XMR_ADDRESS_HERE",
  usdc: "YOUR_USDC_ERC20_ADDRESS_HERE"
};

/* ---------------- RENDER CART ---------------- */
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
    const img = document.createElement('img'); img.src = safeUrl(item.image) || '';
    img.alt = item.name || '';
    const info = document.createElement('div');
    info.innerHTML = `<div style="font-weight:700">${escapeHtml(item.name)}</div><div style="font-size:13px;color:#666">${Number(item.price).toFixed(2)}€</div>`;
    left.append(img, info);

    const qtyWrap = document.createElement('div');
    const minus = document.createElement('button'); minus.className='qty-btn'; minus.innerText='-';
    minus.onclick = () => changeQty(item.id, -1);
    const qtySpan = document.createElement('span'); qtySpan.innerText = item.qty; qtySpan.style.margin = '0 8px';
    const plus = document.createElement('button'); plus.className='qty-btn'; plus.innerText='+';
    plus.onclick = () => changeQty(item.id, +1);
    qtyWrap.append(minus, qtySpan, plus);

    const remove = document.createElement('button'); remove.innerText = 'Eemalda';
    remove.onclick = () => removeItem(item.id);

    row.append(left, qtyWrap, remove);
    basketItemsEl.appendChild(row);
  });

  basketTotalEl && (basketTotalEl.innerText = cartTotal().toFixed(2) + "€");
  updateCartCount();
}

/* ---------------- CART OPS ---------------- */
function changeQty(id, delta){
  const it = cart.find(c=>c.id===id); if(!it) return;
  const product = allProducts.find(p=>p.id===id);
  const stock = product ? Number(product.quantity || 0) : Infinity;
  const newQty = it.qty + delta;
  if (newQty <= 0) {
    cart = cart.filter(c=>c.id!==id);
  } else if (newQty > stock) {
    alert(`Laos ainult ${stock} ühikut.`);
    return;
  } else {
    it.qty = newQty;
  }
  saveCart(); renderCart();
}

function removeItem(id){ cart = cart.filter(c=>c.id!==id); saveCart(); renderCart(); }

/* Expose addToCart */
window.addToCart = function(product){
  const stock = Number(product.quantity || 0);
  const existing = cart.find(c=>c.id===product.id);
  const currentQty = existing ? existing.qty : 0;
  if (stock > 0 && currentQty + 1 > stock) { alert(`Laos ainult ${stock} ühikut.`); return; }
  if (existing) existing.qty += 1;
  else cart.push({ id: product.id, name: product.name, price: Number(product.price||0), qty:1, image: product.image||'' });
  saveCart(); renderCart();
};

/* ---------------- UI: basket open/close, clear ---------------- */
clearCartBtn && clearCartBtn.addEventListener('click', ()=> {
  if (!confirm("Tühjendada ostukorv?")) return;
  cart = []; saveCart(); renderCart();
});

cartIcon && cartIcon.addEventListener('click', ()=> {
  if (!basketPanel) return;
  basketPanel.classList.add('open');
  basketPanel.setAttribute('aria-hidden','false');
});

closeBasket && closeBasket.addEventListener('click', ()=> {
  basketPanel && basketPanel.classList.remove('open');
  basketPanel && basketPanel.setAttribute('aria-hidden','true');
});

/* ---------------- CHECKOUT FLOW ---------------- */
buyAllBtn && buyAllBtn.addEventListener('click', ()=> {
  if (!auth.currentUser) { alert("Palun logi sisse, et teha tellimus."); window.location.href = 'login.html'; return; }
  if (!cart.length) { alert("Ostukorv on tühi."); return; }
  checkoutModal && checkoutModal.classList.add('show');
});

cancelCheckoutBtn && cancelCheckoutBtn.addEventListener('click', ()=> {
  checkoutModal && checkoutModal.classList.remove('show');
});

/* Confirm checkout (regular non-crypto) */
confirmCheckoutBtn && confirmCheckoutBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) { alert("Palun logi sisse."); return; }
  if (!cart.length) { alert("Ostukorv on tühi."); return; }

  try {
    // check active orders (pending or processing)
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("uid", "==", user.uid), where("status", "in", ["pending","processing"]));
    const snaps = await getDocs(q);
    if (snaps.size >= 3) { alert("Sul on juba 3 aktiivset tellimust. Palun oota nende täitmist."); return; }
  } catch (err) {
    console.error("Active order check failed:", err);
  }

  const payload = {
    uid: user.uid,
    email: user.email || null,
    products: cart.map(c=>({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    status: 'pending',
    paymentMethod: 'offline',
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "orders"), payload);
    cart = []; saveCart(); renderCart();
    checkoutModal && checkoutModal.classList.remove('show');
    basketPanel && basketPanel.classList.remove('open');
    alert("Tellimus saadetud! Me võtame teiega ühendust 1-5 tööpäeva jooksul.");
  } catch (err) {
    console.error("Order save error:", err);
    alert("Tellimuse salvestamisel tekkis viga. Palun proovi hiljem.");
  }
});

/* ---------------- MY ORDERS ---------------- */
myOrdersBtn && myOrdersBtn.addEventListener('click', ()=> {
  if (!auth.currentUser) { alert("Palun logi sisse."); window.location.href = 'login.html'; return; }
  loadMyOrders();
  myOrdersModal && myOrdersModal.classList.add('show');
});
closeMyOrdersBtn && closeMyOrdersBtn.addEventListener('click', ()=> {
  myOrdersModal && myOrdersModal.classList.remove('show');
});

async function loadMyOrders(){
  if (!myOrdersList) return;
  myOrdersList.innerHTML = "<p>Laadin...</p>";
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("uid", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) { myOrdersList.innerHTML = "<p>Tellimusi ei ole.</p>"; return; }
    myOrdersList.innerHTML = "";
    snap.forEach(docSnap => {
      const od = docSnap.data();
      const id = docSnap.id;
      const div = document.createElement('div');
      div.style.borderBottom = "1px solid #eee"; div.style.padding = "8px 0";
      const when = od.createdAt && od.createdAt.toDate ? od.createdAt.toDate().toLocaleString() : "—";
      div.innerHTML = `<p><strong>${escapeHtml(when)}</strong> — ${escapeHtml(od.status || '—')}</p>`;
      const ul = document.createElement('div');
      (od.products || []).forEach(p => {
        const pEl = document.createElement('div');
        pEl.innerText = `${p.name} — ${Number(p.price).toFixed(2)}€ x ${p.qty}`;
        ul.appendChild(pEl);
      });
      div.appendChild(ul);

      if (od.paymentMethod === 'crypto' && od.paymentDetails) {
        const pd = od.paymentDetails;
        const pdEl = document.createElement('div');
        pdEl.innerHTML = `<small>Paid: ${escapeHtml(pd.currency||'')} &nbsp; Amount: ${escapeHtml(pd.amountCrypto||'')} &nbsp; Address: ${escapeHtml(pd.address||'')}</small>`;
        div.appendChild(pdEl);
      }

      if (od.status === "pending" || od.status === "processing") {
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = "Tühista tellimus";
        cancelBtn.onclick = async () => {
          if (!confirm("Kas oled kindel?")) return;
          try {
            await deleteDoc(doc(db, "orders", id));
            alert("Tellimus tühistatud.");
            loadMyOrders();
          } catch (err) {
            console.error("Cancel order error:", err);
            alert("Tühistamisel tekkis viga.");
          }
        };
        div.appendChild(cancelBtn);
      } else {
        const note = document.createElement('div');
        note.className = 'muted';
        note.innerText = 'Seda tellimust ei saa enam tühistada.';
        div.appendChild(note);
      }

      myOrdersList.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    myOrdersList.innerHTML = "<p>Tellimuste laadimisel tekkis viga.</p>";
  }
}

/* ---------------- PRODUCTS: real-time load ---------------- */
const productsRef = collection(db, "products");
onSnapshot(productsRef, snap => {
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  applyFiltersAndRender();
});

/* ---------------- FILTER / SORT / SEARCH ---------------- */
function applyFiltersAndRender(){
  const cat = categorySelect ? categorySelect.value : 'all';
  let list = allProducts.slice();

  // filter by category
  if (cat && cat !== 'all') list = list.filter(p => p.category === cat);

  // search
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (q) list = list.filter(p => (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));

  // sorting
  const s = sortSelect ? sortSelect.value : 'none';
  if (s === 'price-asc') list.sort((a,b)=> (Number(a.price||0) - Number(b.price||0)));
  else if (s === 'price-desc') list.sort((a,b)=> (Number(b.price||0) - Number(a.price||0)));
  else if (s === 'name-asc') list.sort((a,b)=> (String(a.name||'').localeCompare(String(b.name||''))));
  else if (s === 'name-desc') list.sort((a,b)=> (String(b.name||'').localeCompare(String(a.name||''))));
  else if (s === 'newest') list.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  else if (s === 'stock-desc') list.sort((a,b)=> (Number(b.quantity||0) - Number(a.quantity||0)));
  else if (s === 'stock-asc') list.sort((a,b)=> (Number(a.quantity||0) - Number(b.quantity||0)));

  filteredProducts = list;
  renderProducts(list);
}

/* ---------------- RENDER PRODUCTS ---------------- */
function renderProducts(products){
  if (!productContainer) return;
  productContainer.innerHTML = '';
  products.forEach(product => {
    const qty = Number(product.quantity || 0);
    const disabled = qty <= 0;

    const card = document.createElement('div');
    card.className = 'productbox';

    const content = document.createElement('div');
    content.innerHTML = `
      <img src="${escapeHtmlAttr(product.image || '')}" alt="${escapeHtml(product.name || '')}">
      <h3>${escapeHtml(product.name || '')}</h3>
      <div style="font-weight:700">${Number(product.price || 0).toFixed(2)}€</div>
      <p>${escapeHtml(product.description || '')}</p>
      <div class="stock">Laos: ${qty}</div>
    `;

    const actions = document.createElement('div');
    actions.style.marginTop = '10px';
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const viewBtn = document.createElement('button'); viewBtn.className='btn'; viewBtn.innerText = 'Vaata lisaks';
    viewBtn.onclick = () => openProductLink(product.link || '#');

    const addBtn = document.createElement('button'); addBtn.className='btn'; addBtn.innerText = qty <= 0 ? 'Lõppenud' : 'Lisa korvi';
    addBtn.disabled = disabled;
    addBtn.onclick = () => {
      const p = allProducts.find(x => x.id === product.id) || product;
      window.addToCart({ id: p.id, name: p.name, price: p.price, image: p.image || '', quantity: p.quantity });
    };

    actions.append(viewBtn, addBtn);

    card.appendChild(content);
    card.appendChild(actions);
    productContainer.appendChild(card);
  });
}

/* ---------------- OPEN PRODUCT LINK ---------------- */
window.openProductLink = (url) => {
  window.open(url, "_blank");
};

/* ---------------- UI EVENTS ---------------- */
if (categorySelect) categorySelect.addEventListener('change', applyFiltersAndRender);
if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);
if (searchInput) searchInput.addEventListener('input', debounce(()=> applyFiltersAndRender(), 180));

/* ---------------- HELPERS ---------------- */
function debounce(fn, ms = 200){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), ms); }; }
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtmlAttr(s=''){ return String(s).replace(/"/g, '&quot;'); }
function safeUrl(u){ try { return u ? String(u) : ''; } catch { return ''; } }

/* ---------------- INIT ---------------- */
renderCart(); updateCartCount();

/* ---------------- AUTH UI ---------------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    if (accountLink) accountLink.style.display = 'inline-block';
    if (logoutEl) logoutEl.style.display = 'none';
  } else {
    if (accountLink) accountLink.style.display = 'none';
    if (logoutEl) {
      logoutEl.style.display = 'inline-block';
      logoutEl.onclick = () => signOut(auth);
    }
  }
});

/* ===================== CRYPTO FLOW ===================== */

/*
  Flow:
  - user clicks "Osta kõik" -> checkout modal
  - user clicks "Crypto" -> open crypto modal
  - crypto modal: selects XMR or USDC
  - we fetch EUR price from CoinGecko, compute amount = (cartTotal EUR) * 1.03 / price_per_coin
  - show address & QR
  - user clicks "I've Paid" -> create order in Firestore with paymentMethod:'crypto' and paymentDetails
*/

openCryptoBtn && openCryptoBtn.addEventListener('click', async () => {
  checkoutModal && checkoutModal.classList.remove('show');
  await openCryptoModal();
});

closeCryptoBtn && closeCryptoBtn.addEventListener('click', ()=> {
  cryptoModal && cryptoModal.classList.remove('show');
});

cryptoSelect && cryptoSelect.addEventListener('change', ()=> updateCryptoInfo());

confirmPaidBtn && confirmPaidBtn.addEventListener('click', async () => {
  // When user clicks "I've Paid": we create the order in Firestore with paymentMethod=crypto
  const user = auth.currentUser;
  if (!user) { alert("Palun logi sisse."); return; }
  if (!cart.length) { alert("Ostukorv on tühi."); return; }

  const currency = cryptoSelect.value;
  const eurTotal = cartTotal();
  const prices = await fetchCoinPrices(); // may fail but we try
  const coinPrice = currency === 'xmr' ? (prices.monero?.eur || null) : (prices['usd-coin']?.eur || null);
  if (!coinPrice) { alert("Viga hindade laadimisel."); return; }
  const amountCrypto = ((eurTotal * 1.03) / coinPrice).toFixed(8);

  const paymentDetails = {
    currency: currency,
    address: WALLET[currency],
    amountCrypto: String(amountCrypto),
    amountEur: Number((eurTotal * 1.03).toFixed(2)),
    feeMarkup: 0.03
  };

  // enforce 3 active orders max:
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("uid","==",user.uid), where("status","in",["pending","processing"]));
    const snaps = await getDocs(q);
    if (snaps.size >= 3) { alert("Sul on juba 3 aktiivset tellimust."); return; }
  } catch(err){ console.error(err); }

  const payload = {
    uid: user.uid,
    email: user.email || null,
    products: cart.map(c=>({ id:c.id, name:c.name, price:c.price, qty:c.qty })),
    status: "pending",
    paymentMethod: "crypto",
    paymentDetails,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db,"orders"), payload);
    cart = []; saveCart(); renderCart();
    cryptoModal && cryptoModal.classList.remove('show');
    alert("Tellimus salvestatud. Me kontrollime makset ja võtame teiega ühendust.");
  } catch(err){
    console.error("Order save error:", err);
    alert("Tellimuse salvestamisel tekkis viga. Palun proovi hiljem.");
  }
});

/* fetch coin prices (CoinGecko) */
async function fetchCoinPrices(){
  // coin ids: monero, usd-coin
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=monero,usd-coin&vs_currencies=eur');
    if (!res.ok) throw new Error('price fetch failed');
    return await res.json();
  } catch(e){
    console.error('CoinGecko error', e);
    return {};
  }
}

async function openCryptoModal(){
  if (!cryptoModal) return;
  // show modal
  cryptoModal.classList.add('show');

  // initial update
  await updateCryptoInfo();
}

async function updateCryptoInfo(){
  const currency = cryptoSelect.value;
  const eurTotal = cartTotal();
  cryptoEurAmountEl.innerText = eurTotal.toFixed(2) + " €";

  const prices = await fetchCoinPrices();
  const coinPrice = currency === 'xmr' ? (prices.monero?.eur || null) : (prices['usd-coin']?.eur || null);

  if (!coinPrice) {
    cryptoAmountEl.innerText = "Hind puudub";
    cryptoAddressEl.innerText = WALLET[currency] || "ADDRESS_NOT_SET";
    cryptoQrImg.src = '';
    return;
  }

  const amountCrypto = ( (eurTotal * 1.03) / coinPrice );
  // format
  const decimals = currency === 'xmr' ? 12 : 8;
  cryptoAmountEl.innerText = amountCrypto.toFixed(decimals) + ` ${currency.toUpperCase()}`;
  cryptoAddressEl.innerText = WALLET[currency] || "ADDRESS_NOT_SET";

  // Build QR: for ERC20/USDC use ethereum URI scheme; for XMR just encode the address
  let qrData = "";
  if (currency === 'usdc') {
    // ethereum:0xADDRESS?value=AMOUNT (some wallets accept this)
    qrData = `ethereum:${WALLET[currency]}?value=${amountCrypto.toFixed(8)}`;
  } else {
    // XMR: no universal URI standard used here — just place address and amount as plain text
    qrData = `${WALLET[currency]}?amount=${amountCrypto.toFixed(decimals)}`;
  }
  const encoded = encodeURIComponent(qrData);
  // Google Charts QR generator
  cryptoQrImg.src = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encoded}&choe=UTF-8`;
}

/* =================== End Crypto Flow =================== */
