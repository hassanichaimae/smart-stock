// 1. Firebase Configuration (Realtime Database Online)
const firebaseConfig = {
    databaseURL: "https://smart-stock-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. Auth Configuration
const AUTH_USER = "admin";
const AUTH_PASS = "123456";

const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginError = document.getElementById('login-error');

window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showApp();
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userInput = document.getElementById('username').value;
    const passInput = document.getElementById('password').value;

    if (userInput === AUTH_USER && passInput === AUTH_PASS) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showApp();
    } else {
        loginError.innerText = "Nom d'utilisateur ou mot de passe incorrect !";
    }
});

function showApp() {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    listenToCloudData();
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

// Global Variables
let products = [];
let history = [];

const productForm = document.getElementById('add-product-form');
const movementForm = document.getElementById('movement-form');
const productsList = document.getElementById('products-list');
const historyList = document.getElementById('history-list');
const selectProduct = document.getElementById('select-product');

// 3. Sync avec le Cloud en temps réel
function listenToCloudData() {
    db.ref('stock_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            products = data.products || [];
            history = data.history || [];
        } else {
            products = [];
            history = [];
        }
        updateUI();
    });
}

function saveToCloud() {
    db.ref('stock_data').set({
        products: products,
        history: history
    });
}

function updateUI() {
    renderProducts();
    renderHistory();
    updateDashboard();
    updateSelect();
}

function renderProducts() {
    productsList.innerHTML = '';
    const searchValue = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : '';
    const filterStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'ALL';

    const filteredProducts = products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchValue) || p.location.toLowerCase().includes(searchValue) || p.category.toLowerCase().includes(searchValue);
        let statusType = 'OK';
        if (p.qty <= 0) statusType = 'EPUISER';
        else if (p.qty <= p.seuil) statusType = 'FAIBLE';
        return matchesSearch && (filterStatus === 'ALL' || filterStatus === statusType);
    });

    filteredProducts.forEach((p) => {
        const originalIndex = products.indexOf(p);
        let statusBadge = '✅ OK';
        let statusStyle = 'color:green; font-weight:bold;';
        
        if (p.qty <= 0) {
            statusBadge = '❌ Épuisé';
            statusStyle = 'color:red; font-weight:bold;';
        } else if (p.qty <= p.seuil) {
            statusBadge = '⚠️ Stock Faible';
            statusStyle = 'color:orange; font-weight:bold;';
        }

        productsList.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>${p.qty} ${p.unit}</td>
                <td>${p.seuil} ${p.unit}</td>
                <td>${p.location}</td>
                <td><span style="${statusStyle}">${statusBadge}</span></td>
                <td>
                    <button class="btn-delete-item" onclick="deleteSingleProduct(${originalIndex})">🗑️ Supprimer</button>
                </td>
            </tr>
        `;
    });
}

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    products.push({
        name: document.getElementById('p-name').value,
        category: document.getElementById('p-cat').value,
        qty: parseInt(document.getElementById('p-qty').value),
        seuil: parseInt(document.getElementById('p-seuil').value),
        unit: document.getElementById('p-unit').value,
        location: document.getElementById('p-loc').value
    });
    saveToCloud();
    productForm.reset();
});

function deleteSingleProduct(index) {
    if (confirm(`Voulez-vous supprimer "${products[index].name}" ?`)) {
        products.splice(index, 1);
        saveToCloud();
    }
}

function clearAllData() {
    if (confirm("⚠️ ATTENTION : Voulez-vous vraiment effacer TOUT le stock et l'historique ?")) {
        products = [];
        history = [];
        saveToCloud();
    }
}

movementForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pIndex = selectProduct.value;
    const type = document.getElementById('movement-type').value;
    const qty = parseInt(document.getElementById('mov-qty').value);
    const target = document.getElementById('mov-target').value;

    if (pIndex === "") return;
    if (type === 'Sortie' && products[pIndex].qty < qty) return alert("⚠️ Stock insuffisant !");

    if (type === 'Entrée') products[pIndex].qty += qty;
    else products[pIndex].qty -= qty;

    history.push({
        date: new Date().toLocaleString('fr-FR'),
        productName: products[pIndex].name,
        type: type, qty: qty, target: target
    });

    saveToCloud();
    movementForm.reset();
});

function renderHistory() {
    historyList.innerHTML = '';
    history.slice().reverse().forEach(h => {
        const typeColor = h.type === 'Entrée' ? 'color:green;' : 'color:red;';
        historyList.innerHTML += `
            <tr>
                <td>${h.date}</td>
                <td><strong>${h.productName}</strong></td>
                <td style="${typeColor} font-weight:bold;">${h.type}</td>
                <td>${h.qty}</td>
                <td>${h.target}</td>
            </tr>
        `;
    });
}

function updateSelect() {
    selectProduct.innerHTML = '<option value="">-- Choisir le matériel --</option>';
    products.forEach((p, index) => {
        selectProduct.innerHTML += `<option value="${index}">${p.name} (Stock: ${p.qty})</option>`;
    });
}

function updateDashboard() {
    document.getElementById('total-produits').innerText = products.length;
    document.getElementById('stock-faible').innerText = products.filter(p => p.qty > 0 && p.qty <= p.seuil).length;
    document.getElementById('stock-epuise').innerText = products.filter(p => p.qty <= 0).length;
}

function importFromExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        let count = 0;
        jsonData.forEach(row => {
            const name = row['Nom'] || row['Nom du Produit'] || row['name'];
            if (name) {
                products.push({
                    name: String(name),
                    category: String(row['Catégorie'] || row['category'] || 'Général'),
                    qty: parseInt(row['Quantité'] || row['qty'] || 0),
                    seuil: parseInt(row['Seuil Min'] || row['seuil'] || 5),
                    unit: String(row['Unité'] || row['unit'] || 'unité'),
                    location: String(row['Emplacement'] || row['location'] || 'Magasin')
                });
                count++;
            }
        });

        saveToCloud();
        alert(`✅ Succès : ${count} produits importés depuis Excel !`);
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    if (products.length === 0) return alert("Le stock est vide !");
    const dataToExport = products.map(p => ({
        "Nom": p.name, "Catégorie": p.category, "Quantité": p.qty, "Unité": p.unit,
        "Seuil Min": p.seuil, "Emplacement": p.location,
        "Statut": p.qty <= 0 ? "Épuisé" : (p.qty <= p.seuil ? "Stock Faible" : "OK")
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Actuel");
    XLSX.writeFile(workbook, `Rapport_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportToPDF() {
    if (products.length === 0) return alert("Le stock est vide !");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport du Stock - Smart Stock Manager", 14, 22);
    doc.setFontSize(11);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 30);

    const tableRows = products.map(p => [
        p.name, p.category, `${p.qty} ${p.unit}`, `${p.seuil} ${p.unit}`, p.location,
        p.qty <= 0 ? "Épuisé" : (p.qty <= p.seuil ? "Faible" : "OK")
    ]);

    doc.autoTable({
        head: [['Nom', 'Catégorie', 'Quantité', 'Seuil Min', 'Emplacement', 'Statut']],
        body: tableRows, startY: 36, theme: 'striped', headStyles: { fillColor: [14, 165, 233] }
    });
    doc.save(`Rapport_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}