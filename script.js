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
    const username = document.getElementById('username-login').value;
    const password = document.getElementById('password-login').value;
    loginError.textContent = '';
    showSpinner();

    try {
        if (username === 'admin') {
            // NUEVO: Validar credenciales del admin desde Firestore
           const adminSnapshot = await db.collection('admin').where('username', '==', username).get();
            
            if (adminSnapshot.empty) {
                loginError.textContent = 'El usuario administrador no existe en la base de datos.';
                hideSpinner();
                return;
            }

            const adminData = adminSnapshot.docs[0].data();

            if (adminData.password === password) {
                // 2. Intentamos loguear en Auth (Esto es lo que pedías)
                try {
                    await auth.signInWithEmailAndPassword('admin@edificio.com', password);
                    showPage(adminPanel);
                    loadResidents();
                } catch (authErr) {
                    console.error("Error en Auth:", authErr);
                    // Si el usuario en Auth no existe, entramos de todos modos pero avisamos
                    console.warn("Aviso: Sesión iniciada ");
                    showPage(adminPanel);
                    loadResidents();
                }
            } else {
                loginError.textContent = 'Contraseña incorrecta';
            }
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
async function sendEmailToResident(residentId) {
    showSpinner();
    try {
        const residentDoc = await db.collection('residents').doc(residentId).get();

        if (residentDoc.exists) {
            const resident = residentDoc.data();
            const emailSubject = 'Recordatorio de Recibo';
            const emailBody =  `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <p>Estimado copropietario(a) <strong>${resident.name}</strong>,</p>
                    <p>Te recordamos que hay un nuevo recibo de administración disponible en tu perfil de la página de facturación del edificio Bahia A correspondiente al mes actual.</p>
                    <p>Si usted ya canceló, haga caso omiso a este mensaje.</p>
                    <p>Por favor, ingrese al siguiente enlace para ver su factura:</p>
                    <p><a href="https://edificiobahiaa.com/" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir a la Página de Facturación</a></p>
                    <br>
                    <p>Atentamente,</p>
                    <p>Administración Edificio Bahía Etapa A</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="https://edificiobahiaa.com/">
                            <img src="data:image/png;base64,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Kfvuu68za2tr49577y1xV8HWiYpg3YZQfvzZlqCU+qdOIP2rUVNT86Hr7m8JCxcuZKedduI73/lOSZndc889rF27tsRtBVsfKoL1PxiLFi0q+d51112pra0tMavgn4PHHnuMgw8+mClTprD33ns783nz5vHEE0+UuK1g60NFsP6HorW1lblz57rvAQMGcNZZZ5W42RIKhQJ/+ctfOOmkkxg6dKg7z3LkyJF86UtfYu7cue97rWwQBMyaNYuTTjqJpqYmlLnFc9ddd+X2229313JsDl1dXVx99dWMHz+e1157rdy6F5YvX85PfvITdt99d2pra1FKUVtby+TJk/ntb39LV1dXuZd/CGvXrmXp0qXssMMO9OvXj1NOOaXE/rbbbnvXPFbw4UZFsP6H4uGHH2b27NlghOo999zDxIkTy531gtaae+65h7322ov77ruPww8/nJ/+9KeceeaZ1NfXs2zZMm666SYmTpzIN77xDQqFQnkQm4XWmscff5ypU6dy9dVXU19fz3777UcymSQMQ15//XU++9nPst9++7FixYpy7yxfvpxzzjmH+vp6zj//fJYtW7bFybg1a9bw6U9/ms9//vMAfPe73+V73/se++67L11dXbzwwguceuqpjB8/nldffbXc+/vGX//6V/bZZx+qqqoA+OQnP8l2223n7J944okPNL4K/g0oX39VwdaL2bNn6+rq6i2uYy0Wi/rmm2/WyWTy717j2dnZqc8//3x911136WKxWG6tOzs79SmnnFKyRvaGG24od9bnOtY33nhDX3jhhfqhhx7qFfbGjRv1gQceWBLul770JV0oFJyb+fPnl6wLBXR1dbWePXt2SVgWjz/+uD7rrLP08uXLy6201lo/8sgjuqGhwYU1ceJEvXbt2nJnfze6u7v1eeedp9esWePMwjDU55xzTknazznnnH/ZuuIKPnhUBOs2hHLBOmrUKH3GGWfoM844Q59++ul6t91208lkUiul9PHHH6/vvfde/c477+h8Pl8eVC+0tbXpiy66SM+fP7/cqgQbNmzQe+21l0vDuHHjSoSI7kOwJhIJff75529RwM+fP18PGTLE+WlqatJz584tcbN48WI9evTodxWsM2bM0Ndff30vAV6OO+64o0TY/eIXvyh38ndj1qxZ+oorrig31rNmzdKpVMrFNWDAAP3GG2+UO6tgK0FFsG5DKBesfWmsHR0desaMGSW7kzzP06eddpqeN29euXOHJUuW6NWrV5cb94kbb7zRha2U0o888kiJfblgfS87r/rS6u67775ebk4++WRn35dgLRQK+uWXX35P2uD69ev1hAkTXHiHHXaYzmaz5c7+Lvz0pz/Vr7/+ermx7u7u1p/61KdK8nfxxReXO6tgK0FljPU/DLW1tUyfPp0ZM2bw4osvMnz4cLc5YNy4cVx22WV9jouOHDmS5ubmcuM+MXHiRBKJBCDjph/E8iGlFLvsskuJ2fz580u+lVIu3s0hkUiwxx57vKdlaQ0NDYwfP959r1u37h+aVFq7di2dnZ0lGzMsMpkM55xzTmXp1TaCimD9D8Zee+3FvffeS0NDgzO76KKL+O///u/3NaOvtWbVqlU888wzJTcC9DXR9H4wdOjQcqN/GnK5HC+++CJLly51ZuvWrfuHNlA8/fTTTJkyZbPCv7L0attBRbD+h2PvvffmBz/4QYnZVVddxaOPPlpitjnkcjlmzZrFt771Lb7+9a8zZ84cpk2b9p53gH1YYBuF2267jbPOOosbb7yRoUOHlmis/wiy2SxPP/00u+++e7mVQ2Xp1baDimCtoNdynzAMufPOOzertRYKBf74xz9y7LHHcvHFFzN06FAuv/xyrrzySqZPn+6WEW0NWL58ORdddBFHHHEEL730EieddBI33XQT559/PqNGjXpPQwbvBa+++iqrV6/m6aef5t57793sEwRBSaNUWXq1daIiWCtg+PDhvU7GWrx4ca+F8dlslp/+9Kc0NjYyY8YMbr31Vq644opeAmjVqlV0d3eX+P2wYe7cuUyZMoVp06Zx4IEH8tBDD3HkkUeWNAqdnZ0lQwHvF1prZsyYwbnnnsvUqVO3+Jxwwgl85jOfcX7z+Ty/+93vNtvIVfDhREWwVkAikeg1frl+/fqS8cS33nqLPfbYgwsvvJDvfe97XHfddZvdm//888+XG31oUCgUuOyyy5g4cSIbN27kySef5KCDDupTM123bh1vv/12ufHfjXXr1uF5HlOmTGHIkCHv+px++umkUinn/4EHHmDJkiUlYVbw4UZFsFYAUDIUADBw4ECnva1YsYJjjjmGefPmMW7cOD772c/2KYgwp/e/9tprm52g+Xfjmmuu4aKLLgLgvPPOY+TIkeVOHObMmfOB3DrwbpNW5dh999058MAD3ffKlSt5+OGHS9xU8OFGRbBWAMCmTZtKvuMHsvz6179254TuvffeDB48uMRtHC+++CI77bRTicb1YcHixYv5+c9/DkB1dTVTpkwpd+KQzWZ55ZVX2Geffcqt/i5ks1lmz55dMtv/bshkMnzuc58rMfvtb39bubplK0JFsFZAsVgs6fJ6nscxxxwDZtb/pZdeKnG7ufG+zs5O7rrrrn9YGP2zsHDhQlatWgVm3DMMw3InDo888ghVVVUMHDiw3OrvwquvvkpTUxONjY3lVlvEgQceWLLe9cUXX+S5554rcVPBhxcVwboNIZvNvq+u6/Lly0vGRU877TSmTp0KRpDGJ7GefPLJPsf7tNZcf/31DB8+nNGjR5dbfyiQzWZdo5DNZjfbvV66dCnXXHMNJ5xwQrnV3wU7aXXYYYeVW70rBg8ezIknnui+deXqlq0KFcG6DaG1tfXvrnhaa2655RZWrlwJwLRp0/jRj35EMpkEs1Nr1113de5XrlzJGWecUbLov6uri+9///vcfvvtnHHGGb3GX+ObBfpCa2sr69atKzf+h1Gule6www40NTW578svv5xbbrnFpU9rzauvvsqhhx7KoYceyg477ODcYvLxbnmJY+HChbS1tfW50+q94LjjjivZvPHQQw+9p2MQK/j3oyJYtyGUb0VduXJlryVTcVgtyF4sePzxx/PAAw/02rp6+OGH43kRqzz22GMMHz6coUOHMmzYMOrr67nqqqu45ZZbGDZsWIlfgDfffLNk+EBrXSKgisXie9K0y7ewln+Xa9fZbJY1a9a471GjRvHRj37UfRcKBb7whS/Qr18/RowYQf/+/Zk0aRL77rsv5513nnNn0dLSwurVq8uN+4TWmmuvvZbtttvuPU9alWPcuHEcfPDB7ru7u5trr722VzlX8CFE+eEBFWyd6OuQkr5OlrJu33zzTX3EEUdopZTea6+99JNPPrnZg0nCMNRXXHFFSdjxZ8CAAXrWrFnO/dy5c3VTU5Ozb2ho0C+88IKzLz8shvdwclQ+n9fHH398iZ9JkybpDRs2ODflJ2DRx/F7S5Ys0TvuuGOvPNjnrLPO0t3d3c79ueeeW2J/xhlnvOtpYGEY6rvvvlt7nqd/+MMfllv/Xfjxj39cEr9SSl911VWbLasKPhyoCNZtBJdeemkvIQHoMWPG6NNPP90dH3jIIYfoPffcU5988sn6jjvu6FPw9oUwDPWTTz6pp06dqj3P04AeNGhQn+e5hmGo77//fhfnGWecob/5zW/q1tZWPXv2bN3c3NwrnclkUt91110l4Vhks1n9xS9+sZcfQB9wwAG6tbVVL168WE+aNKmXPaAvu+yykvDa29v1hRdeqAcNGqQxp3tNnTq1z8Zl9erV+tvf/nZJXv70pz+VuIkjm83qCy644D3l692wYMECPWbMmF756StPFXy4oPTmpngrqKCCCip4X6iMsVZQQQUVfMCoCNYKKqiggg8YFcFaQQUVVPABoyJYK6igggo+YFQEawUVVFDBB4yKYK2gggoq+IBREawVVFBBBR8wKoK1ggoqqOADxv8DZkjsazQg/CIAAAAASUVORK5CYII=" alt="Logo de Edificio Bahía A" style="width: 150px; height: auto;">
                        </a>
                    </div>
                </div>
            `;
            const response = await fetch('http://localhost:3000/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    correo: resident.email,
                    asunto: emailSubject,
                    cuerpo: emailBody
                })
            });

            if (!response.ok) {
                throw new Error('La respuesta del servidor no fue exitosa.');
            }

            const data = await response.json();
            console.log('Correo enviado:', data.message);

            // Actualizar el contador de avisos para el residente
            const newNotifications = (resident.cantidadAvisos || 0) + 1;
            await db.collection('residents').doc(residentId).update({ cantidadAvisos: newNotifications });
            console.log(`Contador de avisos actualizado a ${newNotifications} para el residente con ID: ${residentId}`);
            
            alert('Correo de recordatorio enviado exitosamente.');
            return true;
        } else {
            alert('No se encontró al residente para enviar la notificación.');
            return false;
        }

    } catch (error) {
        console.error('Error al enviar el email:', error);
        alert(`Error al enviar el email: ${error.message}`);
        return false;
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
    const fines = parseCurrency(billForm['bill-fines'].value) || 0;
    const finesConcept = billForm['bill-fines-concept'].value || '';
    const extraFees = parseCurrency(billForm['bill-extra-fees'].value) || 0;
    const extraFeesConcept = billForm['bill-extra-fees-concept'].value || '';
    const concept = billForm['bill-concept'].value;
    const status = billForm['bill-status'].value;
    const paymentDate = billForm['bill-payment-date'].value;
    const paidAmount = parseCurrency(billForm['bill-paid-amount'].value) || 0;
        const accountNumber = billForm['bill-account-number'].value;

    showSpinner();
    try {
        const localDueDate = new Date(dueDate);
        const localPaymentDate = paymentDate ? new Date(paymentDate) : null;

        await db.collection('bills').add({
            residentId,
            dueDate: firebase.firestore.Timestamp.fromDate(localDueDate),
            amount,
            fines,
            finesConcept,
            extraFees,
            extraFeesConcept,
            concept,
            accountNumber,
            status,
            paymentDate: localPaymentDate ? firebase.firestore.Timestamp.fromDate(localPaymentDate) : null,
            paidAmount: paidAmount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Factura agregada exitosamente.');
        billForm.reset();
        loadResidents();

        // // --- CÓDIGO AÑADIDO PARA ENVIAR CORREO ---
        // const residentDoc = await db.collection('residents').doc(residentId).get();
        // if (residentDoc.exists) {
        //     const resident = residentDoc.data();
        //     const emailSubject = `Nueva Factura: ${concept}`;
        //     const emailBody = `Hola ${resident.name},\n\nSe ha generado una nueva factura en tu perfil por el concepto de ${concept} con un valor de ${formatCurrency(amount)}.\n\nPor favor, ingresa a tu perfil para verificar los detalles.\n\nSaludos cordiales,\nEdificio Bahía Etapa A`;
        //     await sendEmailToResident(residentId);
        // } else {
        //     console.error("No se encontró al residente para enviar la notificación.");
        // }
        // // --- FIN DEL CÓDIGO AÑADIDO ---

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
            const totalDueThisMonth = bill.amount + multa + (bill.fines || 0) + (bill.extraFees || 0);
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
                                <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${bill.accountNumber || 'N/A'}</span><br>
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
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">MULTAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                        </tr>
                        ${bill.finesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.finesConcept}
                            </td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">CUOTAS EXTRAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                        </tr>
                        ${bill.extraFeesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.extraFeesConcept}
                            </td>
                        </tr>` : ''}
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
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A<br>
                                <strong>Sugerimos cambiar su contraseña predefinida copropietario</strong>
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
            const totalDueThisMonth = bill.amount + multa + (bill.fines || 0) + (bill.extraFees || 0);
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
                              <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${bill.accountNumber || 'N/A'}</span><br>
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
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">MULTAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                        </tr>
                        ${bill.finesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.finesConcept}
                            </td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">CUOTAS EXTRAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                        </tr>
                        ${bill.extraFeesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.extraFeesConcept}
                            </td>
                        </tr>` : ''}
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
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A<br>
                                <strong>Sugerimos cambiar su contraseña predefinida copropietario</strong>
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
        
        document.getElementById('edit-bill-id').value = billId;

        // Corrección de la fecha de vencimiento
        const dueDate = bill.dueDate ? new Date(bill.dueDate.seconds * 1000) : null;
        if (dueDate) {
            const localDueDate = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000);
            document.getElementById('edit-bill-due-date').value = localDueDate.toISOString().slice(0, 10);
        } else {
            document.getElementById('edit-bill-due-date').value = '';
        }

        document.getElementById('edit-bill-amount').value = bill.amount;
         document.getElementById('edit-bill-account-number').value = bill.accountNumber|| '';
        document.getElementById('edit-bill-concept').value = bill.concept;
        document.getElementById('edit-bill-status').value = bill.status;
        document.getElementById('edit-bill-fines').value = bill.fines || 0;
        document.getElementById('edit-bill-fines-concept').value = bill.finesConcept || '';
        document.getElementById('edit-bill-extra-fees').value = bill.extraFees || 0;
        document.getElementById('edit-bill-extra-fees-concept').value = bill.extraFeesConcept || '';
        document.getElementById('edit-bill-paid-amount').value = bill.paidAmount || '';

        // Corrección de la fecha de pago
        const paymentDate = bill.paymentDate ? new Date(bill.paymentDate.seconds * 1000) : null;
        if (paymentDate) {
            const localPaymentDate = new Date(paymentDate.getTime() - paymentDate.getTimezoneOffset() * 60000);
            document.getElementById('edit-bill-payment-date').value = localPaymentDate.toISOString().slice(0, 10);
        } else {
            document.getElementById('edit-bill-payment-date').value = '';
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
    const fines = parseCurrency(editBillForm['edit-bill-fines'].value);
    const finesConcept = editBillForm['edit-bill-fines-concept'].value;
    const extraFees = parseCurrency(editBillForm['edit-bill-extra-fees'].value);
    const extraFeesConcept = editBillForm['edit-bill-extra-fees-concept'].value;
    const concept = editBillForm['edit-bill-concept'].value;
    const status = editBillForm['edit-bill-status'].value;
    const paymentDate = editBillForm['edit-bill-payment-date'].value;
    const paidAmount = parseCurrency(editBillForm['edit-bill-paid-amount'].value) || 0;
        const accountNumber = editBillForm['edit-bill-account-number'].value;

    showSpinner();
    try {
        const localDueDate = new Date(dueDate);
        const localPaymentDate = paymentDate ? new Date(paymentDate) : null;

        await db.collection('bills').doc(billId).update({
            dueDate: firebase.firestore.Timestamp.fromDate(localDueDate),
            amount,
            fines,
            finesConcept,
            extraFees,
            extraFeesConcept,
            concept,
            accountNumber,
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
            const totalDueThisMonth = bill.amount + multa + (bill.fines || 0) + (bill.extraFees || 0);
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
                                <strong>CUENTA DE COBRO No:</strong> <span style="font-size: 14px; font-weight: bold;">${bill.accountNumber || 'N/A'}</span><br>
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
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">MULTAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.fines || 0)}</td>
                        </tr>
                        ${bill.finesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.finesConcept}
                            </td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000;">CUOTAS EXTRAS</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">-</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                            <td style="padding: 8px; border: 1px solid #000; text-align: right;">${formatCurrency(bill.extraFees || 0)}</td>
                        </tr>
                        ${bill.extraFeesConcept ? `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #000; font-size: 12px; font-style: italic;" colspan="4">
                                Concepto: ${bill.extraFeesConcept}
                            </td>
                        </tr>` : ''}
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
                                A NOMBRE DE EDIFICIO BAHÍA ETAPA A<br>
                                <strong>Sugerimos cambiar su contraseña predefinida copropietario</strong>
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
