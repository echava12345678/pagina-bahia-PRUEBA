// Hola!! si estas chismoseando el codigo :)
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQQbZeHB9thJ0iy3c3c30k3ERCYvRoDQMM",
    authDomain: "bahiaa.firebaseapp.com",
    projectId: "bahiaa",
    storageBucket: "bahiaa.firebasestorage.app",
    messagingSenderId: "212926382954",
    appId: "1:212926382954:web:526bfab6d7c29ee20c1b13",
    measurementId: "G-C3DWGGH4KY"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const loginPage = document.getElementById('login-page');
const adminPanel = document.getElementById('admin-panel');
const residentPanel = document.getElementById('resident-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const residentLogoutBtn = document.getElementById('resident-logout-btn');
const residentForm = document.getElementById('resident-form');
const billForm = document.getElementById('bill-form');
const residentsTableBody = document.querySelector('#residents-table tbody');
const residentBillsTableBody = document.querySelector('#resident-bills-table tbody');
const residentWelcome = document.getElementById('resident-welcome');
const adminWelcome = document.getElementById('admin-welcome');
const billHistoryModal = document.getElementById('bill-history-modal');
const billHistoryTableBody = document.querySelector('#bill-history-table tbody');
const modalTitle = document.getElementById('modal-title');
const editBillModal = document.getElementById('edit-bill-modal');
const editBillForm = document.getElementById('edit-bill-form');
const residentSearch = document.getElementById('resident-search');
const excelFile = document.getElementById('excel-file');
const showAddResidentBtn = document.getElementById('show-add-resident-btn');
const showAddBillBtn = document.getElementById('show-add-bill-btn');
const showUploadBillsBtn = document.getElementById('show-upload-bills-btn');
const addResidentFormSection = document.getElementById('add-resident-form');
const addBillFormSection = document.getElementById('add-bill-form');
const uploadBillsSection = document.getElementById('upload-bills-section');
const changeCredentialsForm = document.getElementById('change-credentials-form');
const changeCredentialsFormInner = document.getElementById('change-credentials-form-inner');
const showChangePasswordBtn = document.getElementById('show-change-password-form');
const credentialsError = document.getElementById('credentials-error');
const credentialsSuccess = document.getElementById('credentials-success');
const loadingSpinner = document.getElementById('loading-spinner');

// Nuevo DOM del Historial de Pagos
const showAdminPaymentsBtn = document.getElementById('show-admin-payments-btn');
const adminPaymentsSection = document.getElementById('admin-payments-section');
const adminPaymentsTableBody = document.querySelector('#admin-payments-table tbody');
const billListSection = document.getElementById('bill-list-section');

// Nuevo DOM para la función de facturas mensuales
const generateMonthlyInvoicesBtn = document.getElementById('generate-monthly-invoices-btn');


// Global variables
let currentResidentId = null;

// --- Utility Functions ---

function showPage(page) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    page.classList.add('active');
}

function showSpinner() {
    loadingSpinner.style.display = 'flex';
}

function hideSpinner() {
    loadingSpinner.style.display = 'none';
}

// Función para mostrar/ocultar secciones de formularios y tablas
function toggleSection(sectionIdToShow) {
    const sections = [
        addResidentFormSection, addBillFormSection, uploadBillsSection,
        changeCredentialsForm, adminPaymentsSection,
        billListSection
    ];
    sections.forEach(section => {
        if (section && section.id === sectionIdToShow) {
            section.classList.toggle('hidden');
        } else if (section) {
            section.classList.add('hidden');
        }
    });
}


function formatDate(timestamp) {
    if (!timestamp || !timestamp.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    // Para que muestre la fecha local correcta
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return localDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function parseCurrency(value) {
    if (typeof value !== 'string') return value;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue);
}

function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '$0';
    return value.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// --- Login & Authentication ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm['username-login'].value;
    const password = loginForm['password-login'].value;
    loginError.textContent = '';
    showSpinner();

    try {
        if (username === 'admin' && password === 'admin123') { // Simple admin check
            showPage(adminPanel);
            loadResidents();
            auth.signInWithEmailAndPassword('admin@edificio.com', password) // Use a static email for Firebase auth
                .catch(err => console.error("Admin Auth Error:", err));
        } else {
            const residentSnapshot = await db.collection('residents').where('username', '==', username).limit(1).get();
            if (!residentSnapshot.empty) {
                const resident = residentSnapshot.docs[0].data();
                const residentId = residentSnapshot.docs[0].id;

                if (resident.password === password) {
                    showPage(residentPanel);
                    residentWelcome.textContent = `Bienvenido, ${resident.name}`;
                    currentResidentId = residentId;
                    loadResidentBills(currentResidentId);
                } else {
                    loginError.textContent = 'Contraseña incorrecta.';
                }
            } else {
                loginError.textContent = 'Usuario no encontrado.';
            }
        }
    } catch (err) {
        console.error("Login Error:", err);
        loginError.textContent = 'Error al iniciar sesión. Intenta de nuevo.';
    } finally {
        hideSpinner();
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
    showPage(loginPage);
});

residentLogoutBtn.addEventListener('click', () => {
    auth.signOut();
    showPage(loginPage);
});

// --- Admin Panel Functions ---

// Event listeners para mostrar formularios
showAddResidentBtn.addEventListener('click', () => { toggleSection('add-resident-form'); billListSection.classList.remove('hidden'); });
showAddBillBtn.addEventListener('click', () => { toggleSection('add-bill-form'); billListSection.classList.remove('hidden'); });
showUploadBillsBtn.addEventListener('click', () => { toggleSection('upload-bills-section'); billListSection.classList.remove('hidden'); });
showChangePasswordBtn.addEventListener('click', () => { toggleSection('change-credentials-form'); billListSection.classList.remove('hidden'); });
showAdminPaymentsBtn.addEventListener('click', () => { toggleSection('admin-payments-section'); loadAdminPayments(); });
// Listener para el nuevo botón de facturas mensuales
if(generateMonthlyInvoicesBtn) {
    generateMonthlyInvoicesBtn.addEventListener('click', generateMonthlyInvoices);
}


// Resident CRUD operations
residentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const residentId = residentForm['resident-id'].value;
    const name = residentForm['resident-name'].value;
    const depto = residentForm['resident-depto'].value;
    const username = residentForm['resident-username'].value;
    const password = residentForm['resident-password'].value;
    const email = residentForm['resident-email'].value;


    showSpinner();
    try {
        await db.collection('residents').doc(residentId).set({
            name,
            depto,
            username,
            password,
            initialPassword: password,
            credentialsChanged: false,
            email
        });
        alert('Residente agregado exitosamente.');
        residentForm.reset();
        loadResidents();
    } catch (err) {
        console.error("Error adding resident: ", err);
        alert('Error al agregar residente.');
    } finally {
        hideSpinner();
        toggleSection(null); // Ocultar todos los formularios
    }
});

// Load and display residents
async function loadResidents() {
    showSpinner();
    residentsTableBody.innerHTML = '';
    try {
        const snapshot = await db.collection('residents').get();
        snapshot.forEach(doc => {
            const resident = doc.data();
            const row = residentsTableBody.insertRow();
            row.dataset.id = doc.id;
            row.innerHTML = `
                <td>${doc.id}</td>
                <td>${resident.name}</td>
                <td>${resident.depto}</td>
                <td>${resident.username}</td>
                <td>
                    <button class="btn primary-btn view-bills-btn" data-id="${doc.id}">
                        <i class="fas fa-eye"></i> Ver Facturas
                    </button>
                    <button class="btn logout-btn delete-resident-btn" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                    <button class="btn secondary-btn send-email-btn" data-id="${doc.id}">
                        <i class="fas fa-envelope"></i> Enviar Correo
                    </button>
                </td>
                <td>Descarga los recibos en "Ver facturas"</td>
            `;
        });
    } catch (err) {
        console.error("Error loading residents:", err);
        alert('Error al cargar residentes.');
    } finally {
        hideSpinner();
    }
}

// Handle resident actions (view bills, delete resident)
residentsTableBody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-bills-btn');
    const deleteBtn = e.target.closest('.delete-resident-btn');
    const sendEmailBtn = e.target.closest('.send-email-btn');

    if (viewBtn) {
        const residentId = viewBtn.dataset.id;
        currentResidentId = residentId; // Store the current resident's ID
        showBillHistory(residentId);
    } else if (deleteBtn) {
        const residentId = deleteBtn.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar a este residente y todas sus facturas?')) {
            deleteResident(residentId);
        }
    } else if (sendEmailBtn) {
        const residentId = sendEmailBtn.dataset.id;
        sendEmailToResident(residentId);
    }
});

// New function to delete a resident and their bills
async function deleteResident(residentId) {
    showSpinner();
    try {
        // 1. Eliminar todas las facturas del residente
        const billsSnapshot = await db.collection('bills').where('residentId', '==', residentId).get();
        const batch = db.batch();
        billsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // 2. Eliminar el documento del residente
        await db.collection('residents').doc(residentId).delete();

        alert('Residente y sus facturas eliminados exitosamente.');
        loadResidents(); // Recargar la tabla
    } catch (err) {
        console.error("Error deleting resident:", err);
        alert('Error al eliminar residente.');
    } finally {
        hideSpinner();
    }
}

// Search functionality
residentSearch.addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    const rows = residentsTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const id = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const depto = row.cells[2].textContent.toLowerCase();
        if (id.includes(filter) || name.includes(filter) || depto.includes(filter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// --- FUNCIÓN AÑADIDA PARA ENVIAR CORREO ---
async function sendEmail(recipientEmail, subject, body) {
    try {
        const response = await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo: recipientEmail,
                asunto: subject,
                cuerpo: body
            })
        });

        if (!response.ok) {
            throw new Error('La respuesta del servidor no fue exitosa.');
        }

        const data = await response.json();
        console.log('Correo enviado:', data.message);
        return true;

    } catch (error) {
        console.error('Error al enviar el email:', error);
        alert(`Error al enviar el email: ${error.message}`);
        return false;
    }
}

async function sendEmailToResident(residentId) {
    showSpinner();
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();
        if (residentDoc.exists) {
            const resident = residentDoc.data();
            const emailSubject = `Recordatorio de Recibo`;
            const emailBody = `Hola ${resident.name},\n\nTe recordamos que hay un nuevo recibo disponible en tu perfil. Por favor, ingresa a la aplicación para revisarlo.\n\nSaludos cordiales,\nEdificio Bahía Etapa A`;
            const emailSent = await sendEmail(resident.email, emailSubject, emailBody);
            if (emailSent) {
                alert('Correo de recordatorio enviado exitosamente.');
            }
        } else {
            alert('No se encontró al residente para enviar la notificación.');
        }
    } catch (err) {
        console.error("Error sending email:", err);
        alert('Error al enviar el correo.');
    } finally {
        hideSpinner();
    }
}
// --- FIN DE LA FUNCIÓN AÑADIDA ---

// Bill CRUD operations
billForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const residentId = billForm['bill-resident-id'].value;
    const dueDate = billForm['bill-due-date'].value;
    const amount = parseCurrency(billForm['bill-amount'].value);
    const concept = billForm['bill-concept'].value;
    const status = billForm['bill-status'].value;
    const paymentDate = billForm['bill-payment-date'].value;
    const paidAmount = parseCurrency(billForm['bill-paid-amount'].value) || 0;

    showSpinner();
    try {
        const localDueDate = new Date(dueDate);
        const localPaymentDate = paymentDate ? new Date(paymentDate) : null;

        await db.collection('bills').add({
            residentId,
            dueDate: firebase.firestore.Timestamp.fromDate(localDueDate),
            amount,
            concept,
            status,
            paymentDate: localPaymentDate ? firebase.firestore.Timestamp.fromDate(localPaymentDate) : null,
            paidAmount: paidAmount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Factura agregada exitosamente.');
        billForm.reset();
        loadResidents();

        // --- CÓDIGO AÑADIDO PARA ENVIAR CORREO ---
        const residentDoc = await db.collection('residents').doc(residentId).get();
        if (residentDoc.exists) {
            const resident = residentDoc.data();
            const emailSubject = `Nueva Factura: ${concept}`;
            const emailBody = `Hola ${resident.name},\n\nSe ha generado una nueva factura en tu perfil por el concepto de ${concept} con un valor de ${formatCurrency(amount)}.\n\nPor favor, ingresa a tu perfil para verificar los detalles.\n\nSaludos cordiales,\nEdificio Bahía Etapa A`;
            await sendEmail(resident.email, emailSubject, emailBody);
        } else {
            console.error("No se encontró al residente para enviar la notificación.");
        }
        // --- FIN DEL CÓDIGO AÑADIDO ---

    } catch (err) {
        console.error("Error adding bill: ", err);
        alert('Error al agregar factura.');
    } finally {
        hideSpinner();
        toggleSection(null); // Ocultar todos los formularios
    }
});

// Handle Excel file upload
excelFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showSpinner();

    const reader = new FileReader();
    reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {
            type: 'array'
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
            header: 1
        });

        const header = json[0];
        const rows = json.slice(1);

        const idIndex = header.indexOf('id_residente');
        const dueDateIndex = header.indexOf('fecha_vencimiento');
        const amountIndex = header.indexOf('monto');
        const statusIndex = header.indexOf('estado');
        const conceptIndex = header.indexOf('concepto');
        const paymentDateIndex = header.indexOf('fecha_pago');
        const paidAmountIndex = header.indexOf('monto_pagado');

        if (idIndex === -1 || dueDateIndex === -1 || amountIndex === -1) {
            alert('El archivo Excel debe contener las columnas: id_residente, fecha_vencimiento, monto.');
            hideSpinner();
            return;
        }

        try {
            const batch = db.batch();
            for (const row of rows) {
                if (row[idIndex]) {
                    const billRef = db.collection('bills').doc();
                    const dueDate = new Date((row[dueDateIndex] - (25567 + 1)) * 86400 * 1000); // Excel date to JS Date
                    const paymentDate = row[paymentDateIndex] ? new Date((row[paymentDateIndex] - (25567 + 1)) * 86400 * 1000) : null;
                    const paidAmount = row[paidAmountIndex] || 0;

                    batch.set(billRef, {
                        residentId: row[idIndex].toString(),
                        dueDate: firebase.firestore.Timestamp.fromDate(dueDate),
                        amount: parseFloat(row[amountIndex]),
                        concept: row[conceptIndex] || 'Sin concepto',
                        status: row[statusIndex] || 'Pendiente',
                        paymentDate: paymentDate ? firebase.firestore.Timestamp.fromDate(paymentDate) : null,
                        paidAmount: paidAmount,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            await batch.commit();
            alert('Facturas cargadas exitosamente desde Excel.');
            loadResidents();
        } catch (error) {
            console.error('Error al procesar el archivo Excel:', error);
            alert('Error al cargar las facturas. Verifica el formato del archivo.');
        } finally {
            hideSpinner();
            toggleSection(null);
        }
    };
    reader.readAsArrayBuffer(file);
});

// Función para generar facturas mensuales para todos los residentes activos
async function generateMonthlyInvoices() {
    const concept = prompt("Por favor, introduce el concepto de la factura (ej. Administración Enero).");
    if (!concept) {
        alert("Concepto no válido. La generación de facturas ha sido cancelada.");
        return;
    }
    const amount = prompt("Por favor, introduce el monto total de la factura.");
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        alert("Monto no válido. La generación de facturas ha sido cancelada.");
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres generar facturas de ${formatCurrency(Number(amount))} con el concepto "${concept}" para todos los residentes?`)) {
        return;
    }

    showSpinner();
    try {
        const residentsSnapshot = await db.collection('residents').get();
        const batch = db.batch();
        const today = new Date();
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Último día del mes actual

        for (const doc of residentsSnapshot.docs) {
            const resident = doc.data();
            const residentId = doc.id;
            const newBillRef = db.collection('bills').doc();
            const newBill = {
                residentId: residentId,
                dueDate: firebase.firestore.Timestamp.fromDate(dueDate),
                amount: Number(amount),
                concept: concept,
                status: 'Pendiente',
                paidAmount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            batch.set(newBillRef, newBill);
        }
        await batch.commit();
        alert('¡Facturas generadas y enviadas con éxito!');
        loadResidents();
    } catch (err) {
        console.error("Error generating monthly invoices:", err);
        alert('Error al generar las facturas mensuales.');
    } finally {
        hideSpinner();
    }
}

// Load bill history for a specific resident
async function showBillHistory(residentId) {
    showSpinner();
    billHistoryTableBody.innerHTML = '';
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();
        const resident = residentDoc.data();
        modalTitle.textContent = `Facturas de ${resident.name} (Depto: ${resident.depto})`;

        const billsSnapshot = await db.collection('bills').where('residentId', '==', residentId).get();

        const bills = billsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.seconds : 0;
            const dateB = b.createdAt ? b.createdAt.seconds : 0;
            return dateA - dateB;
        });

        if (bills.length === 0) {
            billHistoryTableBody.innerHTML = `<tr><td colspan="8">No se encontraron facturas para este residente.</td></tr>`;
        } else {
            bills.forEach(bill => {
                const row = billHistoryTableBody.insertRow();
                row.innerHTML = `
                    <td>${formatDate(bill.dueDate)}</td>
                    <td>${formatCurrency(bill.amount)}</td>
                    <td>${formatCurrency(bill.paidAmount || 0)}</td>
                    <td>${bill.concept}</td>
                    <td class="status-${bill.status.toLowerCase().replace(' ', '-')}">${bill.status}</td>
                    <td>${formatDate(bill.paymentDate)}</td>
                    <td>
                        <button class="btn secondary-btn edit-bill-btn" data-id="${bill.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn logout-btn delete-bill-btn" data-id="${bill.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                    <td>
                        <button class="btn primary-btn download-receipt-btn" data-id="${bill.id}">
                            <i class="fas fa-file-download"></i>
                        </button>
                    </td>
                `;
            });
        }
        billHistoryModal.classList.add('active');
    } catch (err) {
        console.error("Error loading bills:", err);
        alert('Error al cargar el historial de facturas.');
    } finally {
        hideSpinner();
    }
}

// CÓDIGO AÑADIDO: Filtro de búsqueda para facturas en el modal de admin
const billSearchInput = document.createElement('input');
billSearchInput.type = 'text';
billSearchInput.id = 'bill-history-search';
billSearchInput.placeholder = 'Buscar por concepto o estado...';
billSearchInput.classList.add('search-input');
const filterControlsDiv = document.querySelector('#bill-history-modal .filter-controls');
if (filterControlsDiv) {
    filterControlsDiv.insertBefore(billSearchInput, filterControlsDiv.firstChild);
}

billSearchInput.addEventListener('input', (e) => {
    const filterText = e.target.value.toLowerCase();
    const rows = billHistoryTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const concept = row.cells[3].textContent.toLowerCase();
        const status = row.cells[4].textContent.toLowerCase();
        if (concept.includes(filterText) || status.includes(filterText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});
// --- FIN DEL CÓDIGO AÑADIDO ---

// Load and display ALL paid bills for admin panel
async function loadAdminPayments() {
    showSpinner();
    adminPaymentsTableBody.innerHTML = '';
    try {
        const billsSnapshot = await db.collection('bills').get();
        const paidBills = billsSnapshot.docs.filter(doc => doc.data().status === 'Pagada');

        if (paidBills.length === 0) {
            adminPaymentsTableBody.innerHTML = `<tr><td colspan="7">No se encontraron pagos registrados.</td></tr>`;
        } else {
            for (const doc of paidBills) {
                const bill = doc.data();
                const residentDoc = await db.collection('residents').doc(bill.residentId).get();
                const resident = residentDoc.data();

                const row = adminPaymentsTableBody.insertRow();
                row.innerHTML = `
                    <td>${resident.depto} - ${resident.name}</td>
                    <td>${formatDate(bill.paymentDate)}</td>
                    <td>${formatCurrency(bill.paidAmount || 0)}</td>
                    <td>${bill.concept}</td>
                    <td>${formatDate(bill.dueDate)}</td>
                    <td>${bill.status}</td>
                    <td>
                         <button class="btn primary-btn download-receipt-btn" data-id="${doc.id}">
                             <i class="fas fa-file-download"></i>
                         </button>
                     </td>
                `;
            }
        }
    } catch (err) {
        console.error("Error loading admin payments:", err);
        alert('Error al cargar el historial de pagos del administrador.');
    } finally {
        hideSpinner();
    }
}

// NEW: Add event listener for download button on admin payments table
adminPaymentsTableBody.addEventListener('click', async (e) => {
    const downloadBtn = e.target.closest('.download-receipt-btn');
    if (downloadBtn) {
        const billId = downloadBtn.dataset.id;
        showSpinner();
        try {
            const billDoc = await db.collection('bills').doc(billId).get();
            const bill = billDoc.data();
            const residentDoc = await db.collection('residents').doc(bill.residentId).get();
            const resident = residentDoc.data();

            let previousBalance = 0;
            let accumulatedCredit = 0;

            const allBillsSnapshot = await db.collection('bills')
                .where('residentId', '==', bill.residentId)
                .get();

            const allBills = allBillsSnapshot.docs.map(doc => ({
                ...doc.data(),
                createdAt: doc.data().createdAt?.seconds || 0,
                id: doc.id
            }));
            allBills.sort((a, b) => a.createdAt - b.createdAt);

            const previousBills = allBills.filter(prevBill => prevBill.createdAt < bill.createdAt.seconds);

            previousBills.forEach(prevBill => {
                const dueDate = prevBill.dueDate ? new Date(prevBill.dueDate.seconds * 1000) : null;
                const isLate = (prevBill.status === 'Pendiente' && new Date() > dueDate) ||
                    (prevBill.status === 'Pagada' && prevBill.paymentDate && new Date(prevBill.paymentDate.seconds * 1000) > dueDate);
                const multa = isLate ? prevBill.amount * 0.015 : 0;

                const unpaidAmount = (prevBill.amount + multa) - (prevBill.paidAmount || 0);

                if (unpaidAmount > 0) {
                    previousBalance += unpaidAmount;
                } else if (unpaidAmount < 0) {
                    accumulatedCredit += Math.abs(unpaidAmount);
                }
            });

            // --- Lógica Corregida para cálculo de Saldo Anterior y Saldo a Favor ---
            const finalPreviousBalance = previousBalance - accumulatedCredit;
            const saldoAFavorFinal = Math.max(0, -finalPreviousBalance);
            const saldoAnteriorAjustado = Math.max(0, finalPreviousBalance);
            // --- Fin Lógica Corregida ---


            const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
            if (dueDate) {
                dueDate.setHours(0, 0, 0, 0);
            }

            const isLate = (bill.status === 'Pendiente' && new Date() > dueDate) ||
                (bill.status === 'Pagada' && bill.paymentDate && new Date(bill.paymentDate.seconds * 1000) > dueDate);

            const multa = isLate ? bill.amount * 0.015 : 0;
            const totalDueThisMonth = bill.amount + multa;
            const paidThisMonth = bill.paidAmount || 0;

            // --- Lógica Corregida para calcular el Total a Pagar y el Saldo a Favor final ---
            const totalOwed = saldoAnteriorAjustado + totalDueThisMonth;
            const totalPaid = paidThisMonth + saldoAFavorFinal;
            const finalAmount = Math.max(0, totalOwed - totalPaid);
            const finalCredit = Math.max(0, totalPaid - totalOwed);
            // --- Fin Lógica Corregida ---

            const receiptContent = `
                <div style="font-family: 'Poppins', sans-serif; padding: 20px; color: #333; max-width: 700px; margin: auto; font-size: 12px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                <div style="text-align: center;">
                                    <strong>EDIFICIO BAHÍA ETAPA A</strong><br>
                                    Nit 901048187-4<br>
                                    Carrera 65 no. 42-101 Teléfono 3104086837 - Medellín
                                </div>
                            </td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">
                                <img src="logo bahia a.png" alt="Logo" style="max-height: 50px;">
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${billDoc.id.substring(0, 8)}</span><br>
                                <strong>REFERENCIA DE PAGO:</strong> <span style="font-size: 14px; font-weight: bold;">${resident.depto}</span>
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PERIODO DE FACTURACIÓN:</strong><br>
                                ${new Date().toLocaleDateString('es-CO', {
                                    month: 'long',
                                    year: 'numeric'
                                }).toUpperCase()}<br>
                                <strong>FECHA VENCIMIENTO:</strong> ${formatDate(bill.dueDate)}
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                APTO: <span style="font-weight: bold;">${resident.depto}</span><br>
                                COPROPIETARIO: <span style="font-weight: bold;">${resident.name.toUpperCase()}</span>
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #000; width: 40%;">CONCEPTO</th>
                            <th style="padding: 8px; text-align: right; border: 1px solid #000; width: 20%;">SALDO ANT</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">ESTE MES</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">A PAGAR</th>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">${bill.concept}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.amount)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado + bill.amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">INTERESES</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">SALDO A FAVOR</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAFavorFinal)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(finalCredit)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PAGADO ESTE MES</strong>
                                <br>${formatCurrency(paidThisMonth)}
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px; text-align: right; background-color: #f2f2f2;">
                                <strong>TOTAL A PAGAR</strong>
                                <br><span style="font-size: 14px; font-weight: bold;">${formatCurrency(finalAmount)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center;">
                                CONSIGNAR A LA CUENTA DE AHORRO BANCOLOMBIA No 100-426029-73<br>
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A
                            </td>
                        </tr>
                    </table>
                </div>
            `;
            const options = {
                margin: 10,
                filename: `Recibo_${resident.depto}_${bill.concept}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                }
            };
            html2pdf().from(receiptContent).set(options).save();
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert('Error al generar el recibo.');
        } finally {
            hideSpinner();
        }
    }
});


// Edit and Delete bills from modal
billHistoryModal.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-bill-btn');
    const deleteBtn = e.target.closest('.delete-bill-btn');
    const downloadBtn = e.target.closest('.download-receipt-btn');

    if (editBtn) {
        const billId = editBtn.dataset.id;
        showEditBillModal(billId);
    } else if (deleteBtn) {
        const billId = deleteBtn.dataset.id;
        if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
            showSpinner();
            try {
                await db.collection('bills').doc(billId).delete();
                alert('Factura eliminada.');
                if (currentResidentId) {
                    showBillHistory(currentResidentId);
                }
            } catch (err) {
                console.error("Error deleting bill:", err);
                alert('Error al eliminar factura.');
            } finally {
                hideSpinner();
            }
        }
    } else if (downloadBtn) {
        const billId = downloadBtn.dataset.id;
        showSpinner();
        try {
            const billDoc = await db.collection('bills').doc(billId).get();
            const bill = billDoc.data();
            const residentDoc = await db.collection('residents').doc(bill.residentId).get();
            const resident = residentDoc.data();

            let previousBalance = 0;
            let accumulatedCredit = 0;

            const allBillsSnapshot = await db.collection('bills')
                .where('residentId', '==', bill.residentId)
                .get();

            const allBills = allBillsSnapshot.docs.map(doc => ({
                ...doc.data(),
                createdAt: doc.data().createdAt?.seconds || 0,
                id: doc.id
            }));
            allBills.sort((a, b) => a.createdAt - b.createdAt);

            const previousBills = allBills.filter(prevBill => prevBill.createdAt < bill.createdAt.seconds);

            previousBills.forEach(prevBill => {
                const dueDate = prevBill.dueDate ? new Date(prevBill.dueDate.seconds * 1000) : null;
                const isLate = (prevBill.status === 'Pendiente' && new Date() > dueDate) ||
                    (prevBill.status === 'Pagada' && prevBill.paymentDate && new Date(prevBill.paymentDate.seconds * 1000) > dueDate);
                const multa = isLate ? prevBill.amount * 0.015 : 0;

                const unpaidAmount = (prevBill.amount + multa) - (prevBill.paidAmount || 0);

                if (unpaidAmount > 0) {
                    previousBalance += unpaidAmount;
                } else if (unpaidAmount < 0) {
                    accumulatedCredit += Math.abs(unpaidAmount);
                }
            });

            // --- Lógica Corregida para cálculo de Saldo Anterior y Saldo a Favor ---
            const finalPreviousBalance = previousBalance - accumulatedCredit;
            const saldoAFavorFinal = Math.max(0, -finalPreviousBalance);
            const saldoAnteriorAjustado = Math.max(0, finalPreviousBalance);
            // --- Fin Lógica Corregida ---

            const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
            if (dueDate) {
                dueDate.setHours(0, 0, 0, 0);
            }

            const isLate = (bill.status === 'Pendiente' && new Date() > dueDate) ||
                (bill.status === 'Pagada' && bill.paymentDate && new Date(bill.paymentDate.seconds * 1000) > dueDate);

            const multa = isLate ? bill.amount * 0.015 : 0;
            const totalDueThisMonth = bill.amount + multa;
            const paidThisMonth = bill.paidAmount || 0;

            const totalOwed = saldoAnteriorAjustado + totalDueThisMonth;
            const totalPaid = paidThisMonth + saldoAFavorFinal;
            const finalAmount = Math.max(0, totalOwed - totalPaid);
            const finalCredit = Math.max(0, totalPaid - totalOwed);

            const receiptContent = `
                <div style="font-family: 'Poppins', sans-serif; padding: 20px; color: #333; max-width: 700px; margin: auto; font-size: 12px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                <div style="text-align: center;">
                                    <strong>EDIFICIO BAHÍA ETAPA A</strong><br>
                                    Nit 901048187-4<br>
                                    Carrera 65 no. 42-101 Teléfono 3104086837 - Medellín
                                </div>
                            </td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">
                                <img src="logo bahia a.png" alt="Logo" style="max-height: 50px;">
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${billDoc.id.substring(0, 8)}</span><br>
                                <strong>REFERENCIA DE PAGO:</strong> <span style="font-size: 14px; font-weight: bold;">${resident.depto}</span>
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PERIODO DE FACTURACIÓN:</strong><br>
                                ${new Date().toLocaleDateString('es-CO', {
                                    month: 'long',
                                    year: 'numeric'
                                }).toUpperCase()}<br>
                                <strong>FECHA VENCIMIENTO:</strong> ${formatDate(bill.dueDate)}
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                APTO: <span style="font-weight: bold;">${resident.depto}</span><br>
                                COPROPIETARIO: <span style="font-weight: bold;">${resident.name.toUpperCase()}</span>
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #000; width: 40%;">CONCEPTO</th>
                            <th style="padding: 8px; text-align: right; border: 1px solid #000; width: 20%;">SALDO ANT</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">ESTE MES</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">A PAGAR</th>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">${bill.concept}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.amount)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado + bill.amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">INTERESES</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">SALDO A FAVOR</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAFavorFinal)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(finalCredit)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PAGADO ESTE MES</strong>
                                <br>${formatCurrency(paidThisMonth)}
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px; text-align: right; background-color: #f2f2f2;">
                                <strong>TOTAL A PAGAR</strong>
                                <br><span style="font-size: 14px; font-weight: bold;">${formatCurrency(finalAmount)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center;">
                                CONSIGNAR A LA CUENTA DE AHORRO BANCOLOMBIA No 100-426029-73<br>
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A
                            </td>
                        </tr>
                    </table>
                </div>
            `;
            const options = {
                margin: 10,
                filename: `Recibo_${resident.depto}_${bill.concept}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                }
            };
            html2pdf().from(receiptContent).set(options).save();
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert('Error al generar el recibo.');
        } finally {
            hideSpinner();
        }
    }
});


async function showEditBillModal(billId) {
    showSpinner();
    try {
        const billDoc = await db.collection('bills').doc(billId).get();
        const bill = billDoc.data();
        editBillForm['edit-bill-id'].value = billId;

        // Corrección de la fecha:
        const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
        if (dueDate) {
            const localDueDate = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000);
            editBillForm['edit-bill-due-date'].value = localDueDate.toISOString().slice(0, 10);
        } else {
            editBillForm['edit-bill-due-date'].value = '';
        }

        editBillForm['edit-bill-amount'].value = bill.amount;
        editBillForm['edit-bill-concept'].value = bill.concept;
        editBillForm['edit-bill-status'].value = bill.status;

        editBillForm['edit-bill-paid-amount'].value = bill.paidAmount || '';

        const paymentDate = bill.paymentDate ? new Date(bill.paymentDate.seconds * 1000) : null;
        if (paymentDate) {
            const localPaymentDate = new Date(paymentDate.getTime() - paymentDate.getTimezoneOffset() * 60000);
            editBillForm['edit-bill-payment-date'].value = localPaymentDate.toISOString().slice(0, 10);
        } else {
            editBillForm['edit-bill-payment-date'].value = '';
        }

        billHistoryModal.classList.remove('active');
        editBillModal.classList.add('active');
    } catch (err) {
        console.error("Error loading bill for edit:", err);
        alert('Error al cargar los datos de la factura.');
    } finally {
        hideSpinner();
    }
}

editBillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const billId = editBillForm['edit-bill-id'].value;
    const dueDate = editBillForm['edit-bill-due-date'].value;
    const amount = parseFloat(editBillForm['edit-bill-amount'].value);
    const concept = editBillForm['edit-bill-concept'].value;
    const status = editBillForm['edit-bill-status'].value;
    const paymentDate = editBillForm['edit-bill-payment-date'].value;
    const paidAmount = parseCurrency(editBillForm['edit-bill-paid-amount'].value) || 0;

    showSpinner();
    try {
        const localDueDate = new Date(dueDate);
        const localPaymentDate = paymentDate ? new Date(paymentDate) : null;

        await db.collection('bills').doc(billId).update({
            dueDate: firebase.firestore.Timestamp.fromDate(localDueDate),
            amount,
            concept,
            status,
            paymentDate: localPaymentDate ? firebase.firestore.Timestamp.fromDate(localPaymentDate) : null,
            paidAmount: paidAmount
        });
        alert('Factura actualizada exitosamente.');
        editBillModal.classList.remove('active');
    } catch (err) {
        console.error("Error updating bill:", err);
        alert('Error al actualizar factura.');
    } finally {
        hideSpinner();
    }
});


// --- Solución del Cierre de Modales: Delegación de Eventos ---
// Un solo listener que maneja todos los cierres y cancelaciones.
document.body.addEventListener('click', (e) => {
    // Cierra cualquier modal si el clic fue en un botón con la clase .close-btn
    const closeBtn = e.target.closest('.close-btn');
    if (closeBtn) {
        const modal = closeBtn.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
            // Si el modal de edición se cierra, muestra el de historial nuevamente
            if (modal.id === 'edit-bill-modal' && currentResidentId) {
                showBillHistory(currentResidentId);
            }
        }
    }
});

// FIX: Event listener para el formulario de cambio de credenciales
changeCredentialsFormInner.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldUsername = changeCredentialsFormInner['old-username'].value;
    const oldPassword = changeCredentialsFormInner['old-password'].value;
    const newUsername = changeCredentialsFormInner['new-username'].value;
    const newPassword = changeCredentialsFormInner['new-password'].value;

    credentialsError.textContent = '';
    credentialsSuccess.textContent = '';

    if (!oldUsername || !oldPassword || !newUsername || !newPassword) {
        credentialsError.textContent = 'Por favor, completa todos los campos.';
        return;
    }

    if (newPassword === oldPassword) {
        credentialsError.textContent = 'La nueva contraseña debe ser diferente a la actual.';
        return;
    }

    showSpinner();
    try {
        const residentDoc = await db.collection('residents').doc(currentResidentId).get();
        if (!residentDoc.exists) {
            credentialsError.textContent = 'Error: Residente no encontrado.';
            hideSpinner();
            return;
        }

        const resident = residentDoc.data();
        if (resident.username === oldUsername && resident.password === oldPassword) {
            await db.collection('residents').doc(currentResidentId).update({
                username: newUsername,
                password: newPassword,
                credentialsChanged: true
            });
            credentialsSuccess.textContent = 'Credenciales actualizadas exitosamente.';
            changeCredentialsFormInner.reset();
        } else {
            credentialsError.textContent = 'Usuario o contraseña actuales incorrectos.';
        }
    } catch (err) {
        console.error("Error updating credentials:", err);
        credentialsError.textContent = 'Error al actualizar credenciales. Intenta de nuevo.';
    } finally {
        hideSpinner();
    }
});

// --- Resident Panel Functions ---

async function loadResidentBills(residentId) {
    showSpinner();
    residentBillsTableBody.innerHTML = '';
    try {
        const billsSnapshot = await db.collection('bills').where('residentId', '==', residentId).get();
        if (billsSnapshot.empty) {
            residentBillsTableBody.innerHTML = `<tr><td colspan="5">No se encontraron facturas pendientes.</td></tr>`;
        } else {
            billsSnapshot.forEach(doc => {
                const bill = doc.data();
                const today = new Date();
                // Normaliza la fecha de vencimiento a solo día, mes y año
                const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
                if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);
                }
                const isLate = dueDate && bill.status === 'Pendiente' && today > dueDate;

                const row = residentBillsTableBody.insertRow();
                row.dataset.id = doc.id;
                // FIX: Agregadas las columnas de monto y fecha de pago para igualar la vista de admin
                row.innerHTML = `
                    <td>${bill.concept}</td>
                    <td>${formatCurrency(bill.amount)}</td>
                    <td>${formatCurrency(bill.paidAmount || 0)}</td>
                    <td>${formatDate(bill.dueDate)}</td>
                    <td>${formatDate(bill.paymentDate)}</td>
                    <td class="status-${bill.status.toLowerCase()} ${isLate ? 'status-multa' : ''}">${bill.status} ${isLate ? '(Multa)' : ''}</td>
                    <td>
                        <button class="btn primary-btn download-receipt-btn" data-id="${doc.id}">
                            <i class="fas fa-file-download"></i> Descargar Recibo
                        </button>
                    </td>
                `;
            });
        }
    } catch (err) {
        console.error("Error loading resident bills:", err);
        alert('Error al cargar sus facturas.');
    } finally {
        hideSpinner();
    }
}
// CÓDIGO AÑADIDO: Filtro de búsqueda para el panel de residente
const residentBillsSearch = document.createElement('input');
residentBillsSearch.type = 'text';
residentBillsSearch.id = 'resident-bills-search';
residentBillsSearch.placeholder = 'Buscar por concepto o estado...';
residentBillsSearch.classList.add('search-input');
const residentFilterControls = document.querySelector('#resident-panel .table-container .filter-controls');
if (residentFilterControls) {
    residentFilterControls.appendChild(residentBillsSearch);
}
residentBillsSearch.addEventListener('input', (e) => {
    const filterText = e.target.value.toLowerCase();
    const rows = residentBillsTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const concept = row.cells[0].textContent.toLowerCase();
        const status = row.cells[5].textContent.toLowerCase();
        if (concept.includes(filterText) || status.includes(filterText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});
// --- FIN DEL CÓDIGO AÑADIDO ---

// Download receipt as PDF
residentBillsTableBody.addEventListener('click', async (e) => {
    const downloadBtn = e.target.closest('.download-receipt-btn');
    if (downloadBtn) {
        const billId = downloadBtn.dataset.id;
        showSpinner();
        try {
            const billDoc = await db.collection('bills').doc(billId).get();
            const bill = billDoc.data();
            const residentDoc = await db.collection('residents').doc(bill.residentId).get();
            const resident = residentDoc.data();

            let previousBalance = 0;
            let accumulatedCredit = 0;

            const allBillsSnapshot = await db.collection('bills')
                .where('residentId', '==', bill.residentId)
                .get();

            const allBills = allBillsSnapshot.docs.map(doc => ({
                ...doc.data(),
                createdAt: doc.data().createdAt?.seconds || 0
            }));
            allBills.sort((a, b) => a.createdAt - b.createdAt);

            const previousBills = allBills.filter(prevBill => prevBill.createdAt < bill.createdAt.seconds);

            previousBills.forEach(prevBill => {
                const dueDate = prevBill.dueDate ? new Date(prevBill.dueDate.seconds * 1000) : null;
                // FIX: Corregido el nombre de la variable de 'prev' a 'prevBill'
                const isLate = (prevBill.status === 'Pendiente' && new Date() > dueDate) ||
                    (prevBill.status === 'Pagada' && prevBill.paymentDate && new Date(prevBill.paymentDate.seconds * 1000) > dueDate);
                const multa = isLate ? prevBill.amount * 0.015 : 0;

                const unpaidAmount = (prevBill.amount + multa) - (prevBill.paidAmount || 0);

                if (unpaidAmount > 0) {
                    previousBalance += unpaidAmount;
                } else if (unpaidAmount < 0) {
                    accumulatedCredit += Math.abs(unpaidAmount);
                }
            });

            // FIX: Lógica de cálculo corregida para el PDF (restaurada la lógica anterior)
            const finalPreviousBalance = previousBalance - accumulatedCredit;
            const saldoAFavorFinal = Math.max(0, -finalPreviousBalance);
            const saldoAnteriorAjustado = Math.max(0, finalPreviousBalance);

            const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
            if (dueDate) {
                dueDate.setHours(0, 0, 0, 0);
            }

            const isLate = (bill.status === 'Pendiente' && new Date() > dueDate) ||
                (bill.status === 'Pagada' && bill.paymentDate && new Date(bill.paymentDate.seconds * 1000) > dueDate);

            const multa = isLate ? bill.amount * 0.015 : 0;
            const totalDueThisMonth = bill.amount + multa;
            const paidThisMonth = bill.paidAmount || 0;

            const totalOwed = saldoAnteriorAjustado + totalDueThisMonth;
            const totalPaid = paidThisMonth + saldoAFavorFinal;
            const finalAmount = Math.max(0, totalOwed - totalPaid);
            const finalCredit = Math.max(0, totalPaid - totalOwed);

            const receiptContent = `
                <div style="font-family: 'Poppins', sans-serif; padding: 20px; color: #333; max-width: 700px; margin: auto; font-size: 12px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                <div style="text-align: center;">
                                    <strong>EDIFICIO BAHÍA ETAPA A</strong><br>
                                    Nit 901048187-4<br>
                                    Carrera 65 no. 42-101 Teléfono 3104086837 - Medellín
                                </div>
                            </td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">
                                <img src="logo.png" alt="Logo" style="max-height: 50px;">
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${billDoc.id.substring(0, 8)}</span><br>
                                <strong>REFERENCIA DE PAGO:</strong> <span style="font-size: 14px; font-weight: bold;">${resident.depto}</span>
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PERIODO DE FACTURACIÓN:</strong><br>
                                ${new Date().toLocaleDateString('es-CO', {
                                    month: 'long',
                                    year: 'numeric'
                                }).toUpperCase()}<br>
                                <strong>FECHA VENCIMIENTO:</strong> ${formatDate(bill.dueDate)}
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px;">
                                APTO: <span style="font-weight: bold;">${resident.depto}</span><br>
                                COPROPIETARIO: <span style="font-weight: bold;">${resident.name.toUpperCase()}</span>
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #000; width: 40%;">CONCEPTO</th>
                            <th style="padding: 8px; text-align: right; border: 1px solid #000; width: 20%;">SALDO ANT</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">ESTE MES</th>
                            <th style="padding: 8px; border: 1px solid #000; text-align: right; width: 20%;">A PAGAR</th>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">${bill.concept}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.amount)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAnteriorAjustado + bill.amount)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">INTERESES</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(multa)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">SALDO A FAVOR</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(saldoAFavorFinal)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(finalCredit)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px;">
                                <strong>PAGADO ESTE MES</strong>
                                <br>${formatCurrency(paidThisMonth)}
                            </td>
                            <td style="width: 50%; border: 1px solid #000; padding: 10px; text-align: right; background-color: #f2f2f2;">
                                <strong>TOTAL A PAGAR</strong>
                                <br><span style="font-size: 14px; font-weight: bold;">${formatCurrency(finalAmount)}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: center;">
                                CONSIGNAR A LA CUENTA DE AHORRO BANCOLOMBIA No 100-426029-73<br>
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A
                            </td>
                        </tr>
                    </table>
                </div>
            `;
            const options = {
                margin: 10,
                filename: `Recibo_${resident.depto}_${bill.concept}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                }
            };
            html2pdf().from(receiptContent).set(options).save();
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert('Error al generar el recibo.');
        } finally {
            hideSpinner();
        }
    }
});
