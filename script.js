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
const showAddResidentBtn = document.getElementById('show-add-resident-btn');
const addResidentFormSection = document.getElementById('add-resident-form');
const showUploadBillsBtn = document.getElementById('show-upload-bills-btn');
const uploadBillsSection = document.getElementById('upload-bills-section');
const showAddBillBtn = document.getElementById('show-add-bill-btn');
const addBillFormSection = document.getElementById('add-bill-form');
const excelFile = document.getElementById('excel-file');
const residentSearch = document.getElementById('resident-search');
const billHistoryModal = document.getElementById('bill-history-modal');
const billHistoryTableBody = document.querySelector('#bill-history-table tbody');
const modalCloseBtns = document.querySelectorAll('.modal .close-btn');
const showAdminPaymentsBtn = document.getElementById('show-admin-payments-btn');
const adminPaymentsSection = document.getElementById('admin-payments-section');
const adminPaymentsTableBody = document.getElementById('admin-payments-table-body');
const generateMonthlyInvoicesBtn = document.getElementById('generate-monthly-invoices-btn');
const editBillModal = document.getElementById('edit-bill-modal');
const editBillForm = document.getElementById('edit-bill-form');
const showChangePasswordFormBtn = document.getElementById('show-change-password-form');
const changeCredentialsForm = document.getElementById('change-credentials-form');
const changeCredentialsFormInner = document.getElementById('change-credentials-form-inner');
const loadingSpinner = document.getElementById('loading-spinner');

// Utility Functions
const showPage = (page) => {
    loginPage.classList.remove('active');
    adminPanel.classList.remove('active');
    residentPanel.classList.remove('active');
    page.classList.add('active');
};

const showSpinner = () => {
    loadingSpinner.style.display = 'flex';
};

const hideSpinner = () => {
    loadingSpinner.style.display = 'none';
};

const showMessage = (element, message, type) => {
    element.textContent = message;
    element.className = `message ${type}`;
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(amount);
};

const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

// Authentication
auth.onAuthStateChanged(async (user) => {
    if (user) {
        showSpinner();
        try {
            const doc = await db.collection('admins').doc(user.uid).get();
            if (doc.exists) {
                adminWelcome.textContent = `Bienvenido, Admin`;
                showPage(adminPanel);
                fetchResidents();
            } else {
                const residentDoc = await db.collection('residents').doc(user.uid).get();
                if (residentDoc.exists) {
                    const residentData = residentDoc.data();
                    residentWelcome.textContent = `Bienvenido, ${residentData.name}`;
                    showPage(residentPanel);
                    fetchResidentBills(user.uid);
                } else {
                    await auth.signOut();
                    showPage(loginPage);
                    alert('Usuario no encontrado en la base de datos.');
                }
            }
        } catch (error) {
            console.error("Error al verificar el usuario:", error);
            await auth.signOut();
            showPage(loginPage);
        } finally {
            hideSpinner();
        }
    } else {
        showPage(loginPage);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username-login').value;
    const password = document.getElementById('password-login').value;
    loginError.textContent = '';
    showSpinner();
    try {
        const userCredential = await auth.signInWithEmailAndPassword(username, password);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        let errorMessage = 'Error al iniciar sesión. Por favor, revisa tus credenciales.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Usuario o contraseña incorrectos.';
        }
        showMessage(loginError, errorMessage, 'error');
    } finally {
        hideSpinner();
    }
});

logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
});

residentLogoutBtn.addEventListener('click', async () => {
    await auth.signOut();
});

// Admin Panel - Resident Management
showAddResidentBtn.addEventListener('click', () => {
    addResidentFormSection.classList.toggle('hidden');
});

residentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const residentId = document.getElementById('resident-id').value;
    const name = document.getElementById('resident-name').value;
    const depto = document.getElementById('resident-depto').value;
    const email = document.getElementById('resident-email').value;
    const username = document.getElementById('resident-username').value;
    const password = document.getElementById('resident-password').value;

    if (!validateEmail(email)) {
        alert('Por favor, ingresa un correo electrónico válido.');
        return;
    }

    showSpinner();
    try {
        const doc = await db.collection('residents').doc(residentId).get();
        if (doc.exists) {
            alert('El ID de residente ya existe. Por favor, usa un ID diferente.');
            return;
        }

        await db.collection('residents').doc(residentId).set({
            name,
            depto,
            email,
            username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Residente agregado exitosamente.');
        residentForm.reset();
        addResidentFormSection.classList.add('hidden');
        fetchResidents();
    } catch (error) {
        console.error("Error al agregar residente:", error);
        alert('Error al agregar residente.');
    } finally {
        hideSpinner();
    }
});

const fetchResidents = async () => {
    showSpinner();
    residentsTableBody.innerHTML = '';
    try {
        const snapshot = await db.collection('residents').orderBy('depto').get();
        snapshot.forEach(doc => {
            const resident = doc.data();
            const residentId = doc.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${residentId}</td>
                <td>${resident.name}</td>
                <td>${resident.depto}</td>
                <td>${resident.username}</td>
                <td>
                    <button class="btn primary-btn view-bills-btn" data-id="${residentId}">
                        <i class="fas fa-eye"></i> Ver Facturas
                    </button>
                    <button class="btn logout-btn delete-resident-btn" data-id="${residentId}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                    <button class="btn secondary-btn send-email-btn" data-id="${residentId}">
                        <i class="fas fa-envelope"></i> Enviar Correo
                    </button>
                </td>
                <td>Descarga los recibos en "Ver facturas"</td>
            `;
            residentsTableBody.appendChild(tr);
        });
        attachResidentTableEvents();
    } catch (error) {
        console.error("Error al obtener residentes:", error);
    } finally {
        hideSpinner();
    }
};

const attachResidentTableEvents = () => {
    document.querySelectorAll('.view-bills-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const residentId = e.target.dataset.id;
            fetchResidentBillsForAdmin(residentId);
        });
    });

    document.querySelectorAll('.delete-resident-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const residentId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este residente y todas sus facturas?')) {
                showSpinner();
                try {
                    const residentDoc = db.collection('residents').doc(residentId);
                    const billsSnapshot = await residentDoc.collection('bills').get();
                    const batch = db.batch();
                    billsSnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    batch.delete(residentDoc);
                    await batch.commit();
                    alert('Residente y sus facturas eliminados correctamente.');
                    fetchResidents();
                } catch (error) {
                    console.error("Error al eliminar residente:", error);
                    alert('Error al eliminar residente.');
                } finally {
                    hideSpinner();
                }
            }
        });
    });

    document.querySelectorAll('.send-email-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const residentId = e.target.dataset.id;
            sendEmail(residentId);
        });
    });
};

residentSearch.addEventListener('keyup', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = residentsTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const textContent = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
        if (textContent.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// Admin Panel - Bill Management
showUploadBillsBtn.addEventListener('click', () => {
    uploadBillsSection.classList.toggle('hidden');
});

showAddBillBtn.addEventListener('click', () => {
    addBillFormSection.classList.toggle('hidden');
});

excelFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {
            type: 'array'
        });
        const firstSheet = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        showSpinner();
        const batch = db.batch();
        try {
            for (const row of jsonData) {
                const residentId = row.id_residente;
                const residentDoc = await db.collection('residents').doc(residentId).get();
                if (residentDoc.exists) {
                    const billData = {
                        dueDate: row.fecha_vencimiento ? firebase.firestore.Timestamp.fromDate(new Date(row.fecha_vencimiento)) : null,
                        amount: row.monto,
                        status: row.estado || 'Pendiente',
                        concept: row.concepto || 'Factura',
                        paidDate: row.fecha_pago ? firebase.firestore.Timestamp.fromDate(new Date(row.fecha_pago)) : null,
                        paidAmount: row.monto_pagado || 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    const newBillRef = db.collection('residents').doc(residentId).collection('bills').doc();
                    batch.set(newBillRef, billData);
                } else {
                    console.warn(`Residente con ID ${residentId} no encontrado. Se omite la factura.`);
                }
            }
            await batch.commit();
            alert('Facturas cargadas exitosamente.');
            excelFile.value = '';
        } catch (error) {
            console.error("Error al cargar facturas desde Excel:", error);
            alert('Error al cargar facturas. Revisa el formato del archivo.');
        } finally {
            hideSpinner();
        }
    };
    reader.readAsArrayBuffer(file);
});


billForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const residentId = document.getElementById('bill-resident-id').value;
    const dueDate = document.getElementById('bill-due-date').value;
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const concept = document.getElementById('bill-concept').value;
    const status = document.getElementById('bill-status').value;
    const paymentDate = document.getElementById('bill-payment-date').value;
    const paidAmount = parseFloat(document.getElementById('bill-paid-amount').value) || 0;

    showSpinner();
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();
        if (!residentDoc.exists) {
            alert('El ID de residente no existe.');
            return;
        }

        const billData = {
            dueDate: firebase.firestore.Timestamp.fromDate(new Date(dueDate)),
            amount: amount,
            concept: concept,
            status: status,
            paidDate: paymentDate ? firebase.firestore.Timestamp.fromDate(new Date(paymentDate)) : null,
            paidAmount: paidAmount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('residents').doc(residentId).collection('bills').add(billData);
        alert('Factura agregada exitosamente.');
        billForm.reset();
        addBillFormSection.classList.add('hidden');
    } catch (error) {
        console.error("Error al agregar factura:", error);
        alert('Error al agregar factura.');
    } finally {
        hideSpinner();
    }
});

generateMonthlyInvoicesBtn.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de que quieres generar facturas mensuales para todos los residentes?')) {
        return;
    }

    const dueDate = prompt('Ingresa la fecha de vencimiento para las facturas (YYYY-MM-DD):');
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        alert('Fecha de vencimiento no válida. Por favor, usa el formato YYYY-MM-DD.');
        return;
    }

    const amount = parseFloat(prompt('Ingresa el monto para las facturas:'));
    if (isNaN(amount) || amount <= 0) {
        alert('Monto no válido. Debe ser un número positivo.');
        return;
    }

    const concept = prompt('Ingresa el concepto de la factura (ej. "Cuota de administración"):');
    if (!concept) {
        alert('El concepto de la factura no puede estar vacío.');
        return;
    }

    showSpinner();
    try {
        const residentsSnapshot = await db.collection('residents').get();
        const batch = db.batch();
        residentsSnapshot.forEach(doc => {
            const residentId = doc.id;
            const newBillRef = db.collection('residents').doc(residentId).collection('bills').doc();
            const billData = {
                dueDate: firebase.firestore.Timestamp.fromDate(new Date(dueDate)),
                amount: amount,
                concept: concept,
                status: 'Pendiente',
                paidAmount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            batch.set(newBillRef, billData);
        });

        await batch.commit();
        alert('Facturas mensuales generadas exitosamente para todos los residentes.');
        fetchResidents();
    } catch (error) {
        console.error("Error al generar facturas:", error);
        alert('Error al generar las facturas. Por favor, inténtalo de nuevo.');
    } finally {
        hideSpinner();
    }
});


// Admin Panel - Payment History
showAdminPaymentsBtn.addEventListener('click', () => {
    adminPaymentsSection.classList.toggle('hidden');
    if (!adminPaymentsSection.classList.contains('hidden')) {
        fetchAdminPaymentHistory();
    }
});

const fetchAdminPaymentHistory = async () => {
    showSpinner();
    adminPaymentsTableBody.innerHTML = '';
    try {
        const payments = [];
        const residentsSnapshot = await db.collection('residents').get();
        for (const residentDoc of residentsSnapshot.docs) {
            const residentData = residentDoc.data();
            const billsSnapshot = await db.collection('residents').doc(residentDoc.id).collection('bills').where('status', '==', 'Pagada').get();
            billsSnapshot.forEach(billDoc => {
                const billData = billDoc.data();
                payments.push({
                    residentName: residentData.name,
                    paymentDate: billData.paidDate ? billData.paidDate.toDate() : null,
                    amount: billData.paidAmount,
                    concept: billData.concept,
                    dueDate: billData.dueDate ? billData.dueDate.toDate() : null,
                    status: billData.status,
                    residentId: residentDoc.id
                });
            });
        }
        renderAdminPayments(payments);
    } catch (error) {
        console.error("Error al obtener historial de pagos:", error);
    } finally {
        hideSpinner();
    }
};

const renderAdminPayments = (payments) => {
    adminPaymentsTableBody.innerHTML = '';
    if (payments.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" style="text-align: center;">No hay pagos registrados.</td>`;
        adminPaymentsTableBody.appendChild(tr);
        return;
    }
    payments.forEach(payment => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${payment.residentName}</td>
            <td>${payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${payment.concept}</td>
            <td>${payment.dueDate ? formatDate(payment.dueDate) : 'N/A'}</td>
            <td>${payment.status}</td>
            <td>
                <button class="btn primary-btn download-receipt-btn" data-resident-id="${payment.residentId}" data-bill-concept="${payment.concept}" data-bill-amount="${payment.amount}" data-bill-date="${payment.dueDate ? payment.dueDate.toISOString() : ''}" data-bill-paid-date="${payment.paymentDate ? payment.paymentDate.toISOString() : ''}">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        `;
        adminPaymentsTableBody.appendChild(tr);
    });
};


// Admin & Resident Panel - Bill History & Modals
let currentResidentId = null;

const fetchResidentBillsForAdmin = async (residentId) => {
    showSpinner();
    currentResidentId = residentId;
    billHistoryTableBody.innerHTML = '';
    const modalTitle = document.getElementById('modal-title');
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();
        if (!residentDoc.exists) {
            alert('Residente no encontrado.');
            return;
        }
        const resident = residentDoc.data();
        modalTitle.textContent = `Historial de Facturas de ${resident.name}`;
        const billsSnapshot = await db.collection('residents').doc(residentId).collection('bills').orderBy('createdAt', 'desc').get();
        billsSnapshot.forEach(doc => {
            const bill = {
                id: doc.id,
                ...doc.data()
            };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${bill.dueDate ? formatDate(bill.dueDate.toDate()) : 'N/A'}</td>
                <td>${formatCurrency(bill.amount)}</td>
                <td>${formatCurrency(bill.paidAmount)}</td>
                <td>${bill.concept}</td>
                <td>${bill.status}</td>
                <td>${bill.paidDate ? formatDate(bill.paidDate.toDate()) : 'N/A'}</td>
                <td>
                    <button class="btn secondary-btn edit-bill-btn" data-id="${bill.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn logout-btn delete-bill-btn" data-id="${bill.id}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </td>
                <td>
                    <button class="btn primary-btn download-receipt-btn" data-resident-id="${residentId}" data-bill-id="${bill.id}">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            billHistoryTableBody.appendChild(tr);
        });
        attachBillHistoryEvents();
        billHistoryModal.style.display = 'block';
    } catch (error) {
        console.error("Error al obtener facturas del residente:", error);
    } finally {
        hideSpinner();
    }
};

const attachBillHistoryEvents = () => {
    document.querySelectorAll('.edit-bill-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const billId = e.target.dataset.id;
            await showEditBillModal(currentResidentId, billId);
        });
    });
    document.querySelectorAll('.delete-bill-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const billId = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
                await deleteBill(currentResidentId, billId);
            }
        });
    });
    document.querySelectorAll('.download-receipt-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const residentId = e.target.dataset.residentId;
            const billId = e.target.dataset.billId;
            await generatePdfReceipt(residentId, billId);
        });
    });
};

const showEditBillModal = async (residentId, billId) => {
    showSpinner();
    try {
        const billDoc = await db.collection('residents').doc(residentId).collection('bills').doc(billId).get();
        if (!billDoc.exists) {
            alert('Factura no encontrada.');
            return;
        }
        const billData = billDoc.data();
        document.getElementById('edit-bill-id').value = billId;
        document.getElementById('edit-bill-due-date').value = billData.dueDate ? billData.dueDate.toDate().toISOString().split('T')[0] : '';
        document.getElementById('edit-bill-amount').value = billData.amount;
        document.getElementById('edit-bill-concept').value = billData.concept;
        document.getElementById('edit-bill-status').value = billData.status;
        document.getElementById('edit-bill-payment-date').value = billData.paidDate ? billData.paidDate.toDate().toISOString().split('T')[0] : '';
        document.getElementById('edit-bill-paid-amount').value = billData.paidAmount || 0;
        editBillModal.style.display = 'block';
    } catch (error) {
        console.error("Error al cargar datos de la factura:", error);
    } finally {
        hideSpinner();
    }
};

editBillForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const billId = document.getElementById('edit-bill-id').value;
    const dueDate = document.getElementById('edit-bill-due-date').value;
    const amount = parseFloat(document.getElementById('edit-bill-amount').value);
    const concept = document.getElementById('edit-bill-concept').value;
    const status = document.getElementById('edit-bill-status').value;
    const paymentDate = document.getElementById('edit-bill-payment-date').value;
    const paidAmount = parseFloat(document.getElementById('edit-bill-paid-amount').value) || 0;

    showSpinner();
    try {
        const billRef = db.collection('residents').doc(currentResidentId).collection('bills').doc(billId);
        await billRef.update({
            dueDate: firebase.firestore.Timestamp.fromDate(new Date(dueDate)),
            amount: amount,
            concept: concept,
            status: status,
            paidDate: paymentDate ? firebase.firestore.Timestamp.fromDate(new Date(paymentDate)) : null,
            paidAmount: paidAmount
        });
        alert('Factura actualizada exitosamente.');
        editBillModal.style.display = 'none';
        fetchResidentBillsForAdmin(currentResidentId);
    } catch (error) {
        console.error("Error al actualizar la factura:", error);
        alert('Error al actualizar la factura.');
    } finally {
        hideSpinner();
    }
});

const deleteBill = async (residentId, billId) => {
    showSpinner();
    try {
        await db.collection('residents').doc(residentId).collection('bills').doc(billId).delete();
        alert('Factura eliminada correctamente.');
        fetchResidentBillsForAdmin(residentId);
    } catch (error) {
        console.error("Error al eliminar la factura:", error);
        alert('Error al eliminar la factura.');
    } finally {
        hideSpinner();
    }
};

// Resident Panel - Bill History & Credential Management
const fetchResidentBills = async (userId) => {
    showSpinner();
    residentBillsTableBody.innerHTML = '';
    try {
        const residentDoc = await db.collection('residents').doc(userId).get();
        if (!residentDoc.exists) {
            alert('Tus datos no se encontraron en la base de datos.');
            return;
        }
        const billsSnapshot = await db.collection('residents').doc(userId).collection('bills').orderBy('createdAt', 'desc').get();
        billsSnapshot.forEach(doc => {
            const bill = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${bill.concept}</td>
                <td>${formatCurrency(bill.amount)}</td>
                <td>${formatCurrency(bill.paidAmount)}</td>
                <td>${bill.dueDate ? formatDate(bill.dueDate.toDate()) : 'N/A'}</td>
                <td>${bill.paidDate ? formatDate(bill.paidDate.toDate()) : 'N/A'}</td>
                <td>${bill.status}</td>
                <td>
                    <button class="btn secondary-btn mark-paid-btn" data-id="${doc.id}">
                        <i class="fas fa-check-circle"></i> Marcar como Pagada
                    </button>
                </td>
            `;
            residentBillsTableBody.appendChild(tr);
        });
        attachResidentBillEvents(userId);
    } catch (error) {
        console.error("Error al obtener facturas del residente:", error);
    } finally {
        hideSpinner();
    }
};

const attachResidentBillEvents = (userId) => {
    document.querySelectorAll('.mark-paid-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const billId = e.target.dataset.id;
            const paidAmount = parseFloat(prompt('¿Cuánto pagaste?'));
            if (isNaN(paidAmount) || paidAmount <= 0) {
                alert('Monto de pago no válido.');
                return;
            }
            if (confirm('¿Estás seguro de que quieres marcar esta factura como pagada?')) {
                showSpinner();
                try {
                    const billRef = db.collection('residents').doc(userId).collection('bills').doc(billId);
                    await billRef.update({
                        status: 'Pagada',
                        paidDate: firebase.firestore.FieldValue.serverTimestamp(),
                        paidAmount: paidAmount
                    });
                    alert('Factura marcada como pagada.');
                    fetchResidentBills(userId);
                } catch (error) {
                    console.error("Error al marcar factura como pagada:", error);
                    alert('Error al marcar la factura como pagada.');
                } finally {
                    hideSpinner();
                }
            }
        });
    });
};


showChangePasswordFormBtn.addEventListener('click', () => {
    changeCredentialsForm.classList.toggle('hidden');
});

changeCredentialsFormInner.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldUsername = document.getElementById('old-username').value;
    const oldPassword = document.getElementById('old-password').value;
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;
    const credentialsError = document.getElementById('credentials-error');
    const credentialsSuccess = document.getElementById('credentials-success');
    credentialsError.textContent = '';
    credentialsSuccess.textContent = '';

    showSpinner();
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No hay usuario autenticado.');
        }

        const credential = firebase.auth.EmailAuthProvider.credential(oldUsername, oldPassword);
        await user.reauthenticateWithCredential(credential);

        if (newUsername !== oldUsername) {
            await user.updateEmail(newUsername);
        }
        await user.updatePassword(newPassword);

        const residentDocRef = db.collection('residents').doc(user.uid);
        await residentDocRef.update({
            username: newUsername
        });

        showMessage(credentialsSuccess, 'Credenciales actualizadas exitosamente.', 'success');
        changeCredentialsFormInner.reset();
        changeCredentialsForm.classList.add('hidden');
    } catch (error) {
        console.error("Error al cambiar credenciales:", error);
        let errorMessage = 'Error al actualizar credenciales.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'La contraseña actual es incorrecta.';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'El nuevo usuario (correo) ya está en uso.';
        }
        showMessage(credentialsError, errorMessage, 'error');
    } finally {
        hideSpinner();
    }
});


// Modal events
modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        billHistoryModal.style.display = 'none';
        editBillModal.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target === billHistoryModal) {
        billHistoryModal.style.display = 'none';
    }
    if (event.target === editBillModal) {
        editBillModal.style.display = 'none';
    }
});

// PDF Generation
const generatePdfReceipt = async (residentId, billId) => {
    showSpinner();
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();
        if (!residentDoc.exists) {
            throw new Error('Residente no encontrado.');
        }
        const resident = residentDoc.data();

        const billDoc = await db.collection('residents').doc(residentId).collection('bills').doc(billId).get();
        if (!billDoc.exists) {
            throw new Error('Factura no encontrada.');
        }
        const bill = billDoc.data();
        const finalAmount = bill.paidAmount !== undefined ? bill.paidAmount : bill.amount;

        const receiptContent = `
                <div style="font-family: 'Poppins', sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #000; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="logo bahia a.png" alt="Logo" style="height: 80px;">
                        <h1 style="color: #333; margin: 10px 0;">Edificio Bahía A</h1>
                        <p style="color: #666; font-size: 14px;">RECIBO DE PAGO</p>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <p style="font-size: 14px;"><strong>Fecha de Emisión:</strong> ${formatDate(new Date())}</p>
                        <p style="font-size: 14px;"><strong>No. Recibo:</strong> ${billId}</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Residente:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${resident.name}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Departamento:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${resident.depto}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Concepto:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${bill.concept}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Fecha de Vencimiento:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${bill.dueDate ? formatDate(bill.dueDate.toDate()) : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Estado:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${bill.status}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; background-color: #f2f2f2;"><strong>Fecha de Pago:</strong></td>
                            <td style="border: 1px solid #000; padding: 10px;">${bill.paidDate ? formatDate(bill.paidDate.toDate()) : 'N/A'}</td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; text-align: left; background-color: #f2f2f2;">
                                <strong>Monto de la Factura</strong>
                            </td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">
                                ${formatCurrency(bill.amount)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; text-align: left; background-color: #f2f2f2;">
                                <strong>Monto Recibido</strong>
                            </td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">
                                ${formatCurrency(finalAmount)}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right; background-color: #f2f2f2;\">
                                <strong>TOTAL A PAGAR</strong>
                                <br><span style=\"font-size: 14px; font-weight: bold;\">${formatCurrency(finalAmount)}</span>
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
