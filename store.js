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

/* ==========================
   LOAD PRODUCTS FROM FIRESTORE
   ========================== */
async function loadProductsFromFirestore() {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        allProducts = snapshot.docs.map(doc => doc.data());
        displayProducts(allProducts);
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// Call the loader
loadProductsFromFirestore();

/* ==========================
   DISPLAY PRODUCTS
   ========================== */
function displayProducts(products) {
    productContainer.innerHTML = '';

    products.forEach(product => {
        const productHTML = `
            <div class="product-box">
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <h3>${product.price}</h3>
                <p>${product.description}</p>
                <button onclick="openProductLink('${product.link}')">Vaata lisaks</button>
            </div>
        `;
        productContainer.innerHTML += productHTML;
    });
}

/* ==========================
   CATEGORY FILTER
   ========================== */
categorySelect.addEventListener('change', () => {
    const selectedCategory = categorySelect.value;

    if (selectedCategory === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === selectedCategory);
        displayProducts(filtered);
    }
});

/* ==========================
   OPEN PRODUCT LINK
   ========================== */
window.openProductLink = function (url) {
    window.open(url, "_blank");
}

