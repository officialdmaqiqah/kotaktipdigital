document.addEventListener('DOMContentLoaded', () => {
    // --- Toast Notification Logic ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-content">${message}</div>`;

        container.appendChild(toast);

        // Auto remove after animation ends
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // --- Custom Confirm Logic ---
    function showConfirm(message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('btn-confirm-yes');
        const noBtn = document.getElementById('btn-confirm-no');

        if (!modal || !msgEl || !yesBtn || !noBtn) return;

        msgEl.innerText = message;
        modal.style.display = 'flex';

        const handleYes = () => {
            onConfirm();
            close();
        };

        const close = () => {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', close);
        };

        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', close);
    }

    // Tab Switching
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('back-home')) return;

            const tabId = item.getAttribute('data-tab');
            navItems.forEach(ni => ni.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    const PREDEFINED_BANKS = ['Mandiri', 'BCA', 'BNI', 'BRI', 'Bank Jago', 'DANA', 'OVO', 'GoPay', 'LinkAja', 'Lainnya'];

    // --- Load & Initialize Settings ---
    const defaultSettings = {
        waNumber: '6281234567890',
        enableUniqueCode: true,
        xsenderUrl: 'https://xsender.id/send-message',
        xsenderKey: '',
        xsenderSender: '',
        enableXsender: false,
        adminPassword: '13551',
        banks: []
    };

    let settings = JSON.parse(localStorage.getItem('dukungkami_settings')) || {};
    settings = { ...defaultSettings, ...settings };

    // --- Admin Security & Session ---
    const loginOverlay = document.getElementById('admin-login-overlay');
    const loginInput = document.getElementById('admin-password-input');
    const loginBtn = document.getElementById('btn-admin-login');

    if (loginOverlay) {
        if (settings.adminPassword && settings.adminPassword !== '') {
            loginOverlay.style.display = 'flex';
        } else {
            loginOverlay.style.display = 'none';
        }
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginInput.value === settings.adminPassword) {
                loginOverlay.style.display = 'none';
                showToast('Login Berhasil!', 'success');
            } else {
                showToast('Password Salah!', 'error');
                loginInput.value = '';
                loginInput.focus();
            }
        });

        loginInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    // Profile Image Logic (Declare here to avoid TDZ)
    let currentProfileImage = settings.profileImage || '';
    const photoPreview = document.getElementById('admin-photo-preview');
    const uploadInput = document.getElementById('upload-profile-img');
    const removeBtn = document.getElementById('remove-profile-img');

    function updateImagePreview(src) {
        if (!photoPreview) return;
        if (src) {
            photoPreview.innerHTML = `<img src="${src}" style="width: 100%; height: 100%; object-fit: contain;">`;
            if (removeBtn) removeBtn.style.display = 'block';
            
            const loginAvatar = document.getElementById('login-profile-img');
            if (loginAvatar) loginAvatar.src = src;
        } else {
            photoPreview.innerHTML = `<span style="color: #9ca3af; font-size: 11px;">Belum ada foto</span>`;
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    // --- Update Profile Images (Top Level) ---
    try {
        if (settings.profileImage) {
            updateImagePreview(settings.profileImage);
        }
    } catch (e) {
        console.error("Profile image load failed:", e);
    }


    // Data Migration (Old Object to New Array)
    try {
        if (settings.banks && !Array.isArray(settings.banks)) {
            const oldBanks = settings.banks;
            settings.banks = [];
            Object.keys(oldBanks).forEach(key => {
                if (oldBanks[key]) {
                    const bankName = key.charAt(0).toUpperCase() + key.slice(1);
                    settings.banks.push({
                        type: bankName === 'Jago' ? 'Bank Jago' : bankName,
                        number: oldBanks[key],
                        holder: 'A.N. Dukung Kami'
                    });
                }
            });
        }
    } catch (e) {
        console.error("Bank migration failed:", e);
    }


    // Populate Settings UI
    if (document.getElementById('setting-wa-number')) {
        document.getElementById('setting-wa-number').value = settings.waNumber || '';
        document.getElementById('enable-unique-code').checked = settings.enableUniqueCode !== false;
        document.getElementById('xsender-url').value = settings.xsenderUrl || '';
        document.getElementById('xsender-key').value = settings.xsenderKey || '';
        document.getElementById('xsender-sender').value = settings.xsenderSender || '';
        document.getElementById('enable-xsender').checked = settings.enableXsender || false;
        document.getElementById('setting-admin-password').value = settings.adminPassword || '';
    }

    
    if (uploadInput) {

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 1024 * 1024) {
                    showToast('Ukuran file terlalu besar. Maksimal 1MB.', 'error');
                    uploadInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentProfileImage = event.target.result;
                    updateImagePreview(currentProfileImage);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            currentProfileImage = '';
            updateImagePreview('');
            if (uploadInput) uploadInput.value = '';
        });
    }

    const bankListContainer = document.getElementById('bank-list-container');
    const noBanksMsg = document.getElementById('no-banks-msg');
    const addBankBtn = document.getElementById('add-bank-btn');

    function createBankRow(bank = { type: 'Mandiri', number: '', holder: '' }) {
        const row = document.createElement('div');
        row.className = 'bank-row';
        
        let bankOptions = PREDEFINED_BANKS.map(b => `<option value="${b}" ${bank.type === b ? 'selected' : ''}>${b}</option>`).join('');

        row.innerHTML = `
            <div class="form-group">
                <label>Jenis Bank/Wallet</label>
                <select class="form-control bank-type">${bankOptions}</select>
            </div>
            <div class="form-group">
                <label>Nomor Rekening/HP</label>
                <input type="text" class="form-control bank-number" value="${bank.number}" placeholder="0000...">
            </div>
            <div class="form-group">
                <label>Nama Pemilik (A.N.)</label>
                <input type="text" class="form-control bank-holder" value="${bank.holder}" placeholder="Nama Pemilik">
            </div>
            <button class="remove-bank-btn">Hapus</button>
        `;

        row.querySelector('.remove-bank-btn').addEventListener('click', () => {
            showConfirm('Apakah Anda yakin ingin menghapus rekening ini?', () => {
                row.remove();
                checkEmptyState();
                showToast('Rekening dihapus.', 'info');
            });
        });

        bankListContainer.appendChild(row);
        checkEmptyState();
    }

    function checkEmptyState() {
        if (noBanksMsg) {
            noBanksMsg.style.display = bankListContainer.children.length === 0 ? 'block' : 'none';
        }
    }

    function renderBankList() {
        if (!bankListContainer) return;
        bankListContainer.innerHTML = '';
        if (settings.banks && settings.banks.length > 0) {
            settings.banks.forEach(bank => createBankRow(bank));
        }
        checkEmptyState();
    }

    if (addBankBtn) {
        addBankBtn.addEventListener('click', () => createBankRow());
    }

    renderBankList();

    // Save Settings
    const saveBtn = document.getElementById('save-settings');
    const statusMsg = document.getElementById('save-status');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const bankRows = document.querySelectorAll('.bank-row');
            const updatedBanks = [];

            bankRows.forEach(row => {
                updatedBanks.push({
                    type: row.querySelector('.bank-type').value,
                    number: row.querySelector('.bank-number').value.trim(),
                    holder: row.querySelector('.bank-holder').value.trim()
                });
            });

            const newSettings = {
                waNumber: document.getElementById('setting-wa-number').value.trim(),
                enableUniqueCode: document.getElementById('enable-unique-code').checked,
                xsenderUrl: document.getElementById('xsender-url').value.trim(),
                xsenderKey: document.getElementById('xsender-key').value.trim(),
                xsenderSender: document.getElementById('xsender-sender').value.trim(),
                enableXsender: document.getElementById('enable-xsender').checked,
                adminPassword: document.getElementById('setting-admin-password').value.trim(),
                profileImage: currentProfileImage,
                banks: updatedBanks
            };

            localStorage.setItem('dukungkami_settings', JSON.stringify(newSettings));
            settings = newSettings; // Update local variable for immediate use
            
            statusMsg.textContent = 'Berhasil disimpan!';
            statusMsg.className = 'status-msg success';
            
            setTimeout(() => {
                statusMsg.textContent = '';
            }, 3000);
        });
    }

    // --- History Management ---
    const tbody = document.getElementById('history-tbody');
    const emptyState = document.getElementById('no-history');
    const editModal = document.getElementById('edit-modal');
    
    function renderHistory() {
        if (!tbody) return;
        const history = JSON.parse(localStorage.getItem('dukungkami_history')) || [];
        tbody.innerHTML = '';
        
        if (history.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            history.forEach((item, index) => {
                const tr = document.createElement('tr');
                if (item.status === 'confirmed') tr.classList.add('confirmed-row');

                const date = new Date(item.timestamp).toLocaleString('id-ID');
                const amount = new Intl.NumberFormat('id-ID', { 
                    style: 'currency', 
                    currency: 'IDR', 
                    minimumFractionDigits: 0 
                }).format(item.amount);

                const confirmBtn = item.status === 'confirmed' 
                    ? `<button class="btn-action btn-confirmed-status">Selesai</button>` 
                    : `<button class="btn-action btn-confirm" onclick="confirmPayment(${index})">Confirm</button>`;

                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${item.name}</td>
                    <td>62${item.userWa}</td>
                    <td>${amount}</td>
                    <td>${item.method}</td>
                    <td>${item.description}</td>
                    <td>
                        ${confirmBtn}
                        <button class="btn-action btn-edit" onclick="editTransaction(${index})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteTransaction(${index})">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Window-level functions for onclick handlers
    window.confirmPayment = async (index) => {
        const history = JSON.parse(localStorage.getItem('dukungkami_history')) || [];
        const item = history[index];
        if (!item) return;

        // Visual feedback to button
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = 'Mengirim...';
        btn.disabled = true;

        const message = `Assalamualaikum Bpk/Ibu *${item.name}*,\n\npembayaran Anda senilai *${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.amount)}* untuk *${item.description}* sudah kami terima.\n\nTerima kasih!`;

        if (settings.enableXsender && settings.xsenderUrl && settings.xsenderKey) {
            try {
                const params = new URLSearchParams();
                params.append('api_key', settings.xsenderKey);
                params.append('sender', settings.xsenderSender);
                params.append('number', `62${item.userWa}`);
                params.append('message', message);
                params.append('footer', 'Dukung Kami - Konfirmasi Otomatis');

                await fetch(settings.xsenderUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: params
                });
                
                // Since it's no-cors, we can't read the response but the browser will send it.
                // We show a positive message and offer manual fallback if not received.
                showToast('Konfirmasi sedang diproses otomatis oleh sistem!', 'success');
            } catch (err) {
                console.error('Xsender Fetch Error:', err);
                showToast('Membuka WhatsApp manual sebagai cadangan...', 'info');
                const waUrl = `https://wa.me/62${item.userWa}?text=${encodeURIComponent(message)}`;
                window.open(waUrl, '_blank');
            }
        } else {
            const waUrl = `https://wa.me/62${item.userWa}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        }

        btn.innerText = originalText;
        btn.disabled = false;

        // Mark as confirmed and save
        history[index].status = 'confirmed';
        localStorage.setItem('dukungkami_history', JSON.stringify(history));
        renderHistory();
    };

    window.deleteTransaction = (index) => {
        showConfirm('Apakah Anda yakin ingin menghapus riwayat ini? Tindakan ini tidak dapat dibatalkan.', () => {
            const history = JSON.parse(localStorage.getItem('dukungkami_history')) || [];
            history.splice(index, 1);
            localStorage.setItem('dukungkami_history', JSON.stringify(history));
            renderHistory();
            showToast('Riwayat berhasil dihapus', 'info');
        });
    };

    window.editTransaction = (index) => {
        const history = JSON.parse(localStorage.getItem('dukungkami_history')) || [];
        const item = history[index];
        if (!item) return;

        document.getElementById('edit-index').value = index;
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-wa').value = item.userWa;
        document.getElementById('edit-amount').value = item.amount;
        document.getElementById('edit-description').value = item.description;
        
        editModal.style.display = 'flex';
    };

    // Modal Handlers
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCloseEdit = document.getElementById('btn-close-edit');

    if (btnSaveEdit) {
        btnSaveEdit.addEventListener('click', () => {
            const index = document.getElementById('edit-index').value;
            const history = JSON.parse(localStorage.getItem('dukungkami_history')) || [];
            if (!history[index]) return;

            history[index].name = document.getElementById('edit-name').value.trim();
            history[index].userWa = document.getElementById('edit-wa').value.trim();
            history[index].amount = parseInt(document.getElementById('edit-amount').value);
            history[index].description = document.getElementById('edit-description').value.trim();

            localStorage.setItem('dukungkami_history', JSON.stringify(history));
            editModal.style.display = 'none';
            renderHistory();
        });
    }

    if (btnCloseEdit) {
        btnCloseEdit.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }

    renderHistory();
});
