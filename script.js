// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://smart-stock-1c2a9-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const DB_REF = db.ref('stock_data');

// Global State
let products = [];
let authData = { user: "admin", pass: "123456" };

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Load Auth Data & Products from Firebase
DB_REF.child('auth').on('value', (snapshot) => {
    if (snapshot.exists()) {
        authData = snapshot.val();
    } else {
        DB_REF.child('auth').set(authData);
    }
});

DB_REF.child('products').on('value', (snapshot) => {
    products = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (let key in data) {
            products.push({ id: key, ...data[key] });
        }
    }
    renderProducts();
    updateDashboard();
    populateMovementDropdown();
});

// Login Process
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === authData.user && p === authData.pass) {
        loginContainer.classList.add('d-none');
        appContainer.classList.remove('d-none');
    } else {
        loginError.classList.remove('d-none');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    appContainer.classList.add('d-none');
    loginContainer.classList.remove('d-none');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
});

// Navigation
document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
        
        link.classList.add('active');
        const targetSection = link.getAttribute('data-section');
        document.getElementById(`sec-${targetSection}`).classList.remove('d-none');
    });
});

// Render Products Table
function renderProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        const isLow = p.qty < 5;
        tr.innerHTML = `
            <td><strong>${p.ref}</strong></td>
            <td>${p.name}</td>
            <td>${parseFloat(p.price).toFixed(2)} DH</td>
            <td><span class="badge ${isLow ? 'bg-danger' : 'bg-primary'}">${p.qty}</span></td>
            <td><span class="badge ${isLow ? 'bg-warning text-dark' : 'bg-success'}">${isLow ? 'Alerte Stock' : 'Disponible'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update Dashboard
function updateDashboard() {
    const totalProd = products.length;
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.qty), 0);
    const lowStock = products.filter(p => p.qty < 5).length;

    if (document.getElementById('dash-total-products')) document.getElementById('dash-total-products').innerText = totalProd;
    if (document.getElementById('dash-total-value')) document.getElementById('dash-total-value').innerText = totalValue.toFixed(2) + ' DH';
    if (document.getElementById('dash-low-stock')) document.getElementById('dash-low-stock').innerText = lowStock;
}

// Add / Edit Product
document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const ref = document.getElementById('prod-ref').value;
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const qty = parseInt(document.getElementById('prod-qty').value);

    const productData = { ref, name, price, qty };

    if (id) {
        DB_REF.child('products').child(id).update(productData);
    } else {
        DB_REF.child('products').push(productData);
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
    modal.hide();
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
});

window.editProduct = function(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-ref').value = p.ref;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-qty').value = p.qty;

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
};

window.deleteProduct = function(id) {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
        DB_REF.child('products').child(id).remove();
    }
};

// Movements
function populateMovementDropdown() {
    const select = document.getElementById('mov-product-id');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un produit...</option>';
    products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (Stock: ${p.qty})</option>`;
    });
}

document.getElementById('movement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('mov-product-id').value;
    const type = document.getElementById('mov-type').value;
    const qty = parseInt(document.getElementById('mov-qty').value);

    const product = products.find(p => p.id === id);
    if (!product) return;

    let newQty = type === 'IN' ? product.qty + qty : product.qty - qty;
    if (newQty < 0) {
        alert('Stock insuffisant !');
        return;
    }

    DB_REF.child('products').child(id).update({ qty: newQty });
    document.getElementById('movement-form').reset();
    alert('Mouvement effectué avec succès !');
});

// Settings Update
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newUser = document.getElementById('set-username').value;
    const newPass = document.getElementById('set-password').value;

    const newAuth = { user: newUser, pass: newPass };
    DB_REF.child('auth').set(newAuth);
    alert('Paramètres mis à jour ! Veuillez vous reconnecter.');
    location.reload();
});

// Export Excel & PDF
document.getElementById('export-excel')?.addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    XLSX.writeFile(wb, "Stock_Smart_Stock.xlsx");
});

document.getElementById('export-pdf')?.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Rapport du Stock - Smart Stock", 14, 15);
    
    const tableColumn = ["Référence", "Nom", "Prix (DH)", "Quantité"];
    const tableRows = products.map(p => [p.ref, p.name, p.price, p.qty]);

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Stock_Smart_Stock.pdf");
});
