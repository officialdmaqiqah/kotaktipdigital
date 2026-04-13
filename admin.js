document.addEventListener('DOMContentLoaded', async () => {
    // --- Supabase Configuration ---
    const { createClient } = supabase;
    const supabaseUrl = 'https://dhmabsloemxyszurqsgt.supabase.co';
    const supabaseKey = 'sb_publishable_APhzRoU6KG3Obq_2LI2Dtg_t1Fwf1xD';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // --- State ---
    let settings = null;
    let historyData = [];
    let currentProfileImage = '';

    // --- Toast Notification Logic ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-content">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    // --- Phone Number Normalization ---
    function formatPhoneNumber(num) {
        if (!num) return "";
        let clean = num.toString().replace(/[^0-9]/g, '');
        
        // Anti-61 Fix: If number starts with 618 (common mistake), convert to 628
        if (clean.startsWith('618')) {
            clean = '62' + clean.slice(2);
        }

        if (clean.startsWith('0')) {
            clean = '62' + clean.slice(1);
        } else if (clean.startsWith('8')) {
            clean = '62' + clean;
        }
        return clean;
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
        const handleYes = () => { onConfirm(); close(); };
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

    // --- Initialize Admin & Load from Supabase ---
    async function initAdmin() {
        try {
            const { data, error } = await supabaseClient
                .from('dukung_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) throw error;

            settings = {
                waNumber: data.wa_number,
                enableUniqueCode: data.enable_unique_code,
                xsenderUrl: data.xsender_url,
                xsenderKey: data.xsender_key,
                xsenderSender: data.xsender_sender,
                enableXsender: data.enable_xsender,
                adminPassword: data.admin_password,
                profileImage: data.profile_image,
                banks: data.banks || []
            };

            // Check security immediately after loading password
            checkSecurity();
            
            // Populate UI
            populateUI();
            
            // Load History
            await renderHistory();

        } catch (err) {
            console.error('Gagal memuat pengaturan Cloud:', err);
            showToast('Koneksi Cloud Gagal. Gunakan data lokal sementara.', 'error');
            // Mock fallback if needed
        }
    }

    function checkSecurity() {
        const loginOverlay = document.getElementById('admin-login-overlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'flex';
        }
    }

    // Handle Login
    const loginInput = document.getElementById('admin-password-input');
    const loginBtn = document.getElementById('btn-admin-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginInput.value === (settings?.adminPassword || '13551')) {
                document.getElementById('admin-login-overlay').style.display = 'none';
                showToast('Login Berhasil!', 'success');
            } else {
                showToast('Password Salah!', 'error');
                loginInput.value = '';
                loginInput.focus();
            }
        });
        loginInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });
        
        // Auto-login on typing correct password
        loginInput.addEventListener('input', () => {
            if (loginInput.value === (settings?.adminPassword || '13551')) {
                loginBtn.click();
            }
        });
    }

    function populateUI() {
        document.getElementById('setting-wa-number').value = settings.waNumber || '';
        document.getElementById('enable-unique-code').checked = settings.enableUniqueCode !== false;
        document.getElementById('xsender-url').value = settings.xsenderUrl || '';
        document.getElementById('xsender-key').value = settings.xsenderKey || '';
        document.getElementById('xsender-sender').value = settings.xsenderSender || '';
        document.getElementById('enable-xsender').checked = settings.enableXsender || false;
        document.getElementById('setting-admin-password').value = settings.adminPassword || '13551';
        
        currentProfileImage = settings.profileImage || '';
        updateImagePreview(currentProfileImage);
        renderBankList();
    }

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

    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 800 * 1024) { // Small limit for localStorage/Base64 comfort
                    showToast('Ukuran file terlalu besar (Maks 800KB untuk Cloud).', 'error');
                    uploadInput.value = ''; return;
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
            <div class="form-group"><label>Bank/Wallet</label><select class="form-control bank-type">${bankOptions}</select></div>
            <div class="form-group"><label>Nomor Rekening</label><input type="text" class="form-control bank-number" value="${bank.number}"></div>
            <div class="form-group"><label>Nama Pemilik</label><input type="text" class="form-control bank-holder" value="${bank.holder}"></div>
            <button class="remove-bank-btn">Hapus</button>
        `;
        row.querySelector('.remove-bank-btn').addEventListener('click', () => {
            showConfirm('Hapus rekening ini?', () => { row.remove(); checkEmptyState(); });
        });
        bankListContainer.appendChild(row);
        checkEmptyState();
    }

    function checkEmptyState() { if (noBanksMsg) noBanksMsg.style.display = bankListContainer.children.length === 0 ? 'block' : 'none'; }
    function renderBankList() {
        if (!bankListContainer) return;
        bankListContainer.innerHTML = '';
        if (settings.banks?.length > 0) settings.banks.forEach(bank => createBankRow(bank));
        checkEmptyState();
    }
    if (addBankBtn) addBankBtn.addEventListener('click', () => createBankRow());

    // Save Settings to Cloud
    const saveBtn = document.getElementById('save-settings');
    const statusMsg = document.getElementById('save-status');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            statusMsg.textContent = 'Menyimpan ke Cloud...';

            const bankRows = document.querySelectorAll('.bank-row');
            const updatedBanks = Array.from(bankRows).map(row => ({
                type: row.querySelector('.bank-type').value,
                number: row.querySelector('.bank-number').value.trim(),
                holder: row.querySelector('.bank-holder').value.trim()
            }));

            const payload = {
                wa_number: formatPhoneNumber(document.getElementById('setting-wa-number').value.trim()),
                enable_unique_code: document.getElementById('enable-unique-code').checked,
                xsender_url: document.getElementById('xsender-url').value.trim(),
                xsender_key: document.getElementById('xsender-key').value.trim(),
                xsender_sender: document.getElementById('xsender-sender').value.trim(),
                enable_xsender: document.getElementById('enable-xsender').checked,
                admin_password: document.getElementById('setting-admin-password').value.trim(),
                profile_image: currentProfileImage,
                banks: updatedBanks,
                updated_at: new Date()
            };

            try {
                const { error } = await supabaseClient
                    .from('dukung_settings')
                    .update(payload)
                    .eq('id', 1);

                if (error) throw error;
                showToast('Pengaturan Berhasil Disimpan ke Cloud!', 'success');
                statusMsg.textContent = 'Tersimpan!';
                setTimeout(() => statusMsg.textContent = '', 3000);
            } catch (err) {
                console.error('Gagal simpan ke Cloud:', err);
                showToast('Gagal menyimpan ke Cloud.', 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // --- History Management ---
    const tbody = document.getElementById('history-tbody');
    const emptyState = document.getElementById('no-history');
    
    async function renderHistory() {
        if (!tbody) return;
        try {
            const { data, error } = await supabaseClient
                .from('dukung_history')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) throw error;
            historyData = data;
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
            } else {
                if (emptyState) emptyState.style.display = 'none';
                data.forEach((item) => {
                    const tr = document.createElement('tr');
                    if (item.status === 'confirmed') tr.classList.add('confirmed-row');
                    const date = new Date(item.timestamp).toLocaleString('id-ID');
                    const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.amount);
                    const confirmBtn = item.status === 'confirmed' 
                        ? `<button class="btn-action btn-confirmed-status">Selesai</button>` 
                        : `<button class="btn-action btn-confirm" onclick="confirmPaymentCloud('${item.id}')">Confirm</button>`;

                    tr.innerHTML = `
                        <td>${date}</td><td>${item.name}</td><td>${item.user_wa}</td><td>${amount}</td><td>${item.method}</td><td>${item.description}</td>
                        <td>
                            ${confirmBtn}
                            <button class="btn-action btn-edit" onclick="editTransactionCloud('${item.id}')">Edit</button>
                            <button class="btn-action btn-delete" onclick="deleteTransactionCloud('${item.id}')">Hapus</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        } catch (err) {
            console.error('Gagal muat riwayat:', err);
        }
    }

    window.confirmPaymentCloud = async (id) => {
        const item = historyData.find(h => h.id === id);
        if (!item) return;
        const btn = event.target;
        btn.innerText = 'Confirming...';
        
        const message = `Assalamualaikum Bpk/Ibu *${item.name}*,\n\npembayaran Anda senilai *${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.amount)}* untuk *${item.description}* sudah kami terima.\n\nTerima kasih!`;

        try {
            if (settings.enableXsender && settings.xsenderUrl && settings.xsenderKey) {
                const params = new URLSearchParams();
                params.append('api_key', settings.xsenderKey);
                params.append('sender', settings.xsenderSender);
                params.append('number', item.user_wa);
                params.append('message', message);
                await fetch(settings.xsenderUrl, { method: 'POST', mode: 'no-cors', body: params });
                showToast('Konfirmasi Terkirim Otomatis!', 'success');
            } else {
                window.open(`https://wa.me/${formatPhoneNumber(item.user_wa)}?text=${encodeURIComponent(message)}`, '_blank');
            }

            await supabaseClient.from('dukung_history').update({ status: 'confirmed' }).eq('id', id);
            await renderHistory();
        } catch (err) { console.error(err); }
    };

    window.deleteTransactionCloud = async (id) => {
        showConfirm('Hapus riwayat ini permanen dari Cloud?', async () => {
            await supabaseClient.from('dukung_history').delete().eq('id', id);
            await renderHistory();
            showToast('Riwayat dihapus.', 'info');
        });
    };

    window.editTransactionCloud = (id) => {
        const item = historyData.find(h => h.id === id);
        if (!item) return;
        document.getElementById('edit-index').value = id; // Reuse index for ID
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-wa').value = item.user_wa;
        document.getElementById('edit-amount').value = item.amount;
        document.getElementById('edit-description').value = item.description;
        document.getElementById('edit-modal').style.display = 'flex';
    };

    // Modal Edit Handler
    document.getElementById('btn-save-edit')?.addEventListener('click', async () => {
        const id = document.getElementById('edit-index').value;
        const payload = {
            name: document.getElementById('edit-name').value.trim(),
            user_wa: formatPhoneNumber(document.getElementById('edit-wa').value.trim()),
            amount: parseInt(document.getElementById('edit-amount').value),
            description: document.getElementById('edit-description').value.trim()
        };
        await supabaseClient.from('dukung_history').update(payload).eq('id', id);
        document.getElementById('edit-modal').style.display = 'none';
        await renderHistory();
    });

    document.getElementById('btn-close-edit')?.addEventListener('click', () => {
        document.getElementById('edit-modal').style.display = 'none';
    });

    // Start Everything
    initAdmin();
});
