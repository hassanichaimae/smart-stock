// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://smart-stock-3a643-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const DB_REF = db.ref('stock_data');

let products = [];
let history = [];
let authData = { user: "admin", pass: "123456" };

const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Fetch Auth Data
DB_REF.child('auth').on('value', (snapshot) => {
    if (snapshot.exists()) {
        authData = snapshot.val();
    } else {
        DB_REF.child('auth').set(authData);
    }
});

// Fetch Products Realtime
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

// Fetch History Realtime
DB_REF.child('history').on('value', (snapshot) => {
    history = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (let key in data) {
            history.push({ id: key, ...data[key] });
        }
    }
    renderHistory();
});

// Login Handlers
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

logoutBtn.addEventListener('click', () => {
    appContainer.classList.add('d-none');
    loginContainer.classList.remove('d-none');
});

// Render Products with Search & Filter
function renderProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchValue = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : '';
    const filterStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'ALL';

    const filtered = products.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchValue) ||
                              (p.cat || '').toLowerCase().includes(searchValue) ||
                              (p.emplacement || '').toLowerCase().includes(searchValue);
        let statusType = 'OK';
        if (p.qty <= 0) statusType = 'EPUISER';
        else if (p.qty <= p.seuil) statusType = 'FAIBLE';

        return matchesSearch && (filterStatus === 'ALL' || filterStatus === statusType);
    });

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.cat || '-'}</td>
            <td><span class="badge ${p.qty <= 0 ? 'bg-danger' : (p.qty <= p.seuil ? 'bg-warning text-dark' : 'bg-primary')}">${p.qty}</span></td>
            <td>${p.seuil}</td>
            <td>${p.unit || '-'}</td>
            <td>${p.emplacement || '-'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render History
function renderHistory() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    history.slice().reverse().forEach(h => {
        const tr = document.createElement('tr');
        const badge = h.type === 'IN' ? '<span class="badge bg-success">Entrée (+)</span>' : '<span class="badge bg-danger">Sortie (-)</span>';
        tr.innerHTML = `
            <td><small class="text-muted">${h.date}</small></td>
            <td><strong>${h.productName}</strong></td>
            <td>${badge}</td>
            <td>${h.qty}</td>
            <td>${h.reason}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDashboard() {
    const total = products.length;
    const low = products.filter(p => p.qty > 0 && p.qty <= p.seuil).length;
    const out = products.filter(p => p.qty <= 0).length;

    if(document.getElementById('dash-total')) document.getElementById('dash-total').innerText = total;
    if(document.getElementById('dash-low')) document.getElementById('dash-low').innerText = low;
    if(document.getElementById('dash-out')) document.getElementById('dash-out').innerText = out;
}

// Add/Update Product
document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const cat = document.getElementById('prod-cat').value;
    const qty = parseInt(document.getElementById('prod-qty').value);
    const seuil = parseInt(document.getElementById('prod-seuil').value);
    const unit = document.getElementById('prod-unit').value;
    const emplacement = document.getElementById('prod-emplacement').value;

    const data = { name, cat, qty, seuil, unit, emplacement };

    if (id) {
        DB_REF.child('products').child(id).update(data);
    } else {
        DB_REF.child('products').push(data);
    }

    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
});

window.editProduct = function(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-cat').value = p.cat || '';
    document.getElementById('prod-qty').value = p.qty;
    document.getElementById('prod-seuil').value = p.seuil;
    document.getElementById('prod-unit').value = p.unit || '';
    document.getElementById('prod-emplacement').value = p.emplacement || '';
    window.location.hash = '#matériel';
};

window.deleteProduct = function(id) {
    if (confirm('Voulez-vous supprimer ce matériel ?')) {
        DB_REF.child('products').child(id).remove();
    }
};

function populateMovementDropdown() {
    const select = document.getElementById('mov-product');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choisir le matériel --</option>';
    products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (Stock: ${p.qty})</option>`;
    });
}

// Save Stock Movements
document.getElementById('movement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('mov-product').value;
    const type = document.getElementById('mov-type').value;
    const qty = parseInt(document.getElementById('mov-qty').value);
    const reason = document.getElementById('mov-reason').value;

    const product = products.find(p => p.id === id);
    if (!product) return;

    let newQty = type === 'IN' ? product.qty + qty : product.qty - qty;
    if (newQty < 0) {
        alert('⚠️ Stock insuffisant !');
        return;
    }

    DB_REF.child('products').child(id).update({ qty: newQty });

    // Save movement to history
    DB_REF.child('history').push({
        date: new Date().toLocaleString('fr-FR'),
        productName: product.name,
        type: type,
        qty: qty,
        reason: reason
    });

    document.getElementById('movement-form').reset();
    alert('✅ Mouvement enregistré avec succès !');
});

// Export Excel
function exportToExcel() {
    if (products.length === 0) return alert("Aucun matériel à exporter !");
    const dataToExport = products.map(p => ({
        "Nom": p.name,
        "Catégorie": p.cat || '-',
        "Quantité": p.qty,
        "Unité": p.unit || '-',
        "Seuil Min": p.seuil,
        "Emplacement": p.emplacement || '-',
        "Statut": p.qty <= 0 ? "Épuisé" : (p.qty <= p.seuil ? "Faible" : "Conforme")
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Actuel");
    XLSX.writeFile(workbook, `Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Export PDF
function exportToPDF() {
    if (products.length === 0) return alert("Aucun matériel à exporter !");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rapport du Stock - Smart Stock", 14, 20);

    const rows = products.map(p => [
        p.name, p.cat || '-', `${p.qty} ${p.unit || ''}`, p.seuil, p.emplacement || '-',
        p.qty <= 0 ? "Épuisé" : (p.qty <= p.seuil ? "Faible" : "Conforme")
    ]);

    doc.autoTable({
        head: [['Nom', 'Catégorie', 'Quantité', 'Seuil', 'Emplacement', 'Statut']],
        body: rows,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [13, 110, 253] }
    });
    doc.save(`Rapport_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Reset All Data
function resetAllData() {
    if (confirm("⚠️ Voulez-vous vraiment effacer tout le stock et l'historique de la base de données ?")) {
        DB_REF.child('products').remove();
        DB_REF.child('history').remove();
    }
}
