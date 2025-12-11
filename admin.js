// admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

/* ---------- FIREBASE CONFIG (always use this) ---------- */
const firebaseConfig = { 
  apiKey: "AIzaSyBkbXzURYKixz4R28OYMUOueA9ysG3Q1Lo",
  authDomain: "prebuiltid-website.firebaseapp.com",
  projectId: "prebuiltid-website",
  storageBucket: "prebuiltid-website.firebasestorage.app",
  messagingSenderId: "854871585546",
  appId: "1:854871585546:web:568400979292a0c31740f3",
  measurementId: "G-YS1Q1904H6"
};

const ADMIN_EMAILS = [
  "prebuiltid@gmail.com",
  "info@komisjonikaubamaja.ee"
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* DOM refs */
const statusDiv = document.getElementById("status");
const productList = document.getElementById("productList");

const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const descInput = document.getElementById("description");
const imageInput = document.getElementById("image");
const categoryInput = document.getElementById("category");
const linkInput = document.getElementById("link");
const quantityInput = document.getElementById("quantity");
const paymentButtonInput = document.getElementById("paymentButton");
const addProductBtn = document.getElementById("addProduct");

/* Check admin auth */
onAuthStateChanged(auth, user => {
  if (!user) {
    statusDiv.innerText = "You must log in.";
    setTimeout(()=> window.location.href = "login.html", 800);
    return;
  }
  if (!ADMIN_EMAILS.includes(user.email)) {
    statusDiv.innerText = "Not an admin.";
    setTimeout(()=> window.location.href = "index.html", 800);
    return;
  }
  statusDiv.innerText = "Logged in as admin: " + user.email;
  loadProductsRealtime();
});

/* Add product handler */
addProductBtn.onclick = async () => {
  const newProduct = {
    name: nameInput.value.trim(),
    price: Number(priceInput.value) || 0,
    description: descInput.value.trim(),
    image: imageInput.value.trim(),
    category: categoryInput.value.trim(),
    link: linkInput.value.trim(),
    quantity: Number(quantityInput.value) || 0,
    paymentButton: paymentButtonInput.value.trim(),
    createdAt: new Date()
  };

  try {
    await addDoc(collection(db, "products"), newProduct);
    alert("Product added!");
    // reset inputs
    nameInput.value = "";
    priceInput.value = "";
    descInput.value = "";
    imageInput.value = "";
    categoryInput.value = "";
    linkInput.value = "";
    quantityInput.value = "";
    paymentButtonInput.value = "";
  } catch (err) {
    console.error("Add product error:", err);
    alert("Failed to add product.");
  }
};

/* Realtime product loader */
function loadProductsRealtime() {
  productList.innerHTML = "Loading...";
  const col = collection(db, "products");
  onSnapshot(col, snap => {
    productList.innerHTML = "";
    snap.forEach(item => {
      const p = item.data();
      const id = item.id;

      const div = document.createElement("div");
      div.className = "product-item";
      div.innerHTML = `
        <h3>${escapeHtml(p.name || '')}</h3>
        ${p.image ? `<img src="${escapeAttr(p.image)}" style="max-width:180px;">` : ''}
        <label>Price</label>
        <input class="edit-price" value="${escapeAttr(p.price || '')}">
        <label>Image</label>
        <input class="edit-image" value="${escapeAttr(p.image || '')}">
        <label>Description</label>
        <textarea class="edit-description">${escapeHtml(p.description || '')}</textarea>
        <label>Category</label>
        <input class="edit-category" value="${escapeAttr(p.category || '')}">
        <label>Link</label>
        <input class="edit-link" value="${escapeAttr(p.link || '')}">
        <label>Quantity</label>
        <input class="edit-quantity" type="number" value="${escapeAttr(p.quantity || 0)}">
        <label>NOWPayments button HTML or URL</label>
        <textarea class="edit-payment">${escapeHtml(p.paymentButton || '')}</textarea>
        <div style="margin-top:8px;">
          <button class="update-btn">Update</button>
          <button class="delete-btn" style="margin-left:8px;background:#c0392b;">Delete</button>
        </div>
        <div style="margin-top:8px;">Preview:</div>
        <div class="preview-area" style="margin-top:6px;">${p.paymentButton ? p.paymentButton : ''}</div>
      `;

      // update handler
      div.querySelector(".update-btn").onclick = async () => {
        const updated = {
          price: Number(div.querySelector(".edit-price").value) || 0,
          image: div.querySelector(".edit-image").value.trim(),
          description: div.querySelector(".edit-description").value.trim(),
          category: div.querySelector(".edit-category").value.trim(),
          link: div.querySelector(".edit-link").value.trim(),
          quantity: Number(div.querySelector(".edit-quantity").value) || 0,
          paymentButton: div.querySelector(".edit-payment").value.trim()
        };
        try {
          await updateDoc(doc(db, "products", id), updated);
          alert("Product updated!");
        } catch (err) {
          console.error("Update product error:", err);
          alert("Update failed.");
        }
      };

      // delete handler
      div.querySelector(".delete-btn").onclick = async () => {
        if (!confirm("Delete product?")) return;
        try {
          await deleteDoc(doc(db, "products", id));
        } catch (err) {
          console.error("Delete error:", err);
          alert("Delete failed.");
        }
      };

      productList.appendChild(div);
    });
  });
}

/* helpers */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s=''){ return String(s).replace(/"/g,'&quot;'); }
