const productContainer = document.getElementById('store-product-list');
const categorySelect = document.getElementById('categorySelect');
let allProducts = [];

// Load products from JSON
fetch('store-products.json')
    .then(res => res.json())
    .then(data => {
        allProducts = data;
        displayProducts(allProducts);
    })
    .catch(err => console.error('Error loading products:', err));

function displayProducts(products) {
    productContainer.innerHTML = '';
    products.forEach(product => {
        const productHTML = `
            <div class="product-box">
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <h3>${product.price}</h3>
                <p>${product.description}</p>
                <button onclick="alert('Buying ${product.name}')">Buy Now</button>
            </div>
        `;
        productContainer.innerHTML += productHTML;
    });
}

// Filter products by category
categorySelect.addEventListener('change', () => {
    const selectedCategory = categorySelect.value;
    if (selectedCategory === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === selectedCategory);
        displayProducts(filtered);
    }
});