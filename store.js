// store.js - old working base + nowpayments embed rendering
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot } 
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// use your fixed firebase config
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

/* DOM refs */
const productContainer = document.getElementById('shopgrid');
const categorySelect = document.getElementById('categorySelect');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

let allProducts = [];

/* Load products realtime so admin edits show immediately */
const productsRef = collection(db, 'products');
onSnapshot(productsRef, snapshot => {
  allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  displayProducts(allProducts);
});

/* Display products in the grid */
function displayProducts(products) {
  if (!productContainer) return;
  productContainer.innerHTML = '';

  if (!products || products.length === 0) {
    productContainer.innerHTML = "<p>Tooteid ei leitud.</p>";
    return;
  }

  products.forEach(product => {
    const wrapper = document.createElement('div');
    wrapper.className = 'productbox';

    const imgHtml = product.image ? `<img src="${escapeAttr(product.image)}" alt="${escapeHtml(product.name||'')}">` : '';
    const nameHtml = `<h3>${escapeHtml(product.name||'')}</h3>`;
    const priceHtml = `<div style="font-weight:700">${Number(product.price||0).toFixed(2)}€</div>`;
    const descHtml = `<p>${escapeHtml(product.description||'')}</p>`;
    const stockHtml = `<div class="stock">Laos: ${Number(product.quantity||0)}</div>`;

    wrapper.innerHTML = `
      ${imgHtml}
      ${nameHtml}
      ${priceHtml}
      ${descHtml}
      ${stockHtml}
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn view-btn">Vaata lisaks</button>
        <button class="btn add-btn">Lisa korvi</button>
      </div>
    `;

    // view button
    wrapper.querySelector('.view-btn').addEventListener('click', () => {
      if (product.link) window.open(product.link, '_blank');
      else alert('Link puudub');
    });

    // add to cart (simple localStorage cart)
    wrapper.querySelector('.add-btn').addEventListener('click', () => {
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const exist = cart.find(i => i.id === product.id);
      if (exist) exist.qty += 1;
      else cart.push({ id: product.id, name: product.name, price: Number(product.price||0), qty: 1, image: product.image || '' });
      localStorage.setItem('cart', JSON.stringify(cart));
      const countEl = document.getElementById('cart-count');
      if (countEl) {
        const total = cart.reduce((s,i)=> s + (i.qty||0),0);
        countEl.innerText = total;
      }
      alert('Lisatud ostukorvi');
    });

    // If admin provided a paymentButton, render it raw (embed HTML) here
    if (product.paymentButton) {
      const payWrap = document.createElement('div');
      payWrap.className = 'payment-button-wrap';
      // Expect admin pasted full embed HTML — insert as-is:
      try {
        payWrap.innerHTML = product.paymentButton;
      } catch (e) {
        // fallback: if invalid HTML string, show as text or convert if it's a URL
        const val = String(product.paymentButton || '').trim();
        if (val.startsWith('http')) {
          payWrap.innerHTML = `<a href="${escapeAttr(val)}" target="_blank" rel="noreferrer noopener"><img src="https://nowpayments.io/images/embeds/payment-button-white.svg" alt="Pay with NOWPayments" style="max-width:180px;"></a>`;
        } else {
          payWrap.textContent = val;
        }
      }
      // margin to separate from buttons
      payWrap.style.marginTop = '10px';
      wrapper.appendChild(payWrap);
    }

    productContainer.appendChild(wrapper);
  });
}

/* Basic filtering + sorting + search */
if (categorySelect) categorySelect.addEventListener('change', () => {
  const cat = categorySelect.value;
  if (cat === 'all') displayProducts(allProducts);
  else displayProducts(allProducts.filter(p => p.category === cat));
});

if (sortSelect) sortSelect.addEventListener('change', () => {
  const s = sortSelect.value;
  let copy = allProducts.slice();
  if (s === 'price-asc') copy.sort((a,b)=> Number(a.price||0) - Number(b.price||0));
  else if (s === 'price-desc') copy.sort((a,b)=> Number(b.price||0) - Number(a.price||0));
  else if (s === 'name-asc') copy.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||'')));
  else if (s === 'name-desc') copy.sort((a,b)=> String(b.name||'').localeCompare(String(a.name||'')));
  displayProducts(copy);
});

if (searchInput) searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return displayProducts(allProducts);
  displayProducts(allProducts.filter(p => (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q)));
});

/* helper escaping */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s=''){ return String(s).replace(/"/g,'&quot;'); }
