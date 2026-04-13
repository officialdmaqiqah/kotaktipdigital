document.addEventListener('DOMContentLoaded', async () => {
    // --- DEMO MODE: No Supabase ---
    let settings = null;
    let historyData = [];

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-content">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    function formatPhoneNumber(num) {
        if (!num) return "";
        let clean = num.toString().replace(/[^0-9]/g, '');
        if (clean.startsWith('618')) clean = '62' + clean.slice(2);
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        else if (clean.startsWith('8')) clean = '62' + clean;
        return clean;
    }

    function showConfirm(message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('btn-confirm-yes');
        const noBtn = document.getElementById('btn-confirm-no');
        msgEl.innerText = message;
        modal.style.display = 'flex';
        const handleYes = () => { onConfirm(); close(); };
        const close = () => { modal.style.display = 'none'; yesBtn.removeEventListener('click', handleYes); noBtn.removeEventListener('click', close); };
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', close);
    }

    // Tab Switching
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            navItems.forEach(ni => ni.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- Initialize Admin DEMO ---
    function initAdminDemo() {
        const stored = localStorage.getItem('demo_settings');
        if (stored) {
            settings = JSON.parse(stored);
        } else {
            settings = { waNumber: '6281234567890', enableUniqueCode: true, profileImage: '', banks: [{ name: 'Detti (Demo)', number: '12345678', type: 'Mandiri' }] };
            localStorage.setItem('demo_settings', JSON.stringify(settings));
        }

        // Pre-populate dummy history if empty
        if (!localStorage.getItem('demo_history')) {
            const dummy = [
                { id: 1, timestamp: new Date().toISOString(), name: 'Budi Santoso', user_wa: '628111111111', amount: 50043, method: 'Mandiri', description: 'Donasi Kopi', status: 'pending' },
                { id: 2, timestamp: new Date().toISOString(), name: 'Siti Aminah', user_wa: '628222222222', amount: 100000, method: 'DANA', description: 'Tip Layanan', status: 'confirmed' }
            ];
            localStorage.setItem('demo_history', JSON.stringify(dummy));
        }

        populateUI();
        renderHistory();
        checkSecurity();
    }

    function checkSecurity() {
        const overlay = document.getElementById('admin-login-overlay');
        overlay.style.display = 'flex';
    }

    const loginInput = document.getElementById('admin-password-input');
    const loginBtn = document.getElementById('btn-admin-login');
    loginBtn?.addEventListener('click', () => {
        if (loginInput.value === '12345') {
            document.getElementById('admin-login-overlay').style.display = 'none';
            showToast('Demo Login Berhasil!', 'success');
        } else {
            showToast('Password Demo salah (Gunakan 12345)', 'error');
        }
    });
    loginInput?.addEventListener('input', () => { if (loginInput.value === '12345') loginBtn.click(); });

    function populateUI() {
        document.getElementById('setting-wa-number').value = settings.waNumber || '';
        document.getElementById('enable-unique-code').checked = settings.enableUniqueCode !== false;
        renderBankList();
    }

    function renderBankList() {
        const container = document.getElementById('bank-list-container');
        container.innerHTML = '';
        (settings.banks || []).forEach((bank, idx) => {
            const div = document.createElement('div');
            div.className = 'bank-row';
            div.innerHTML = `<div class="bank-info"><strong>${bank.type}</strong> - ${bank.number} (${bank.name})</div>
                             <button class="remove-bank-btn" onclick="removeBank(${idx})">Hapus</button>`;
            container.appendChild(div);
        });
    }

    window.removeBank = (idx) => {
        settings.banks.splice(idx, 1);
        renderBankList();
    };

    document.getElementById('add-bank-btn')?.addEventListener('click', () => {
        const type = prompt('Jenis Bank/E-Wallet (Misal: BCA, DANA):');
        const number = prompt('Nomor Rekening:');
        const name = prompt('Atas Nama:');
        if (type && number && name) {
            settings.banks.push({ type, number, name });
            renderBankList();
        }
    });

    document.getElementById('save-settings')?.addEventListener('click', () => {
        settings.waNumber = formatPhoneNumber(document.getElementById('setting-wa-number').value);
        settings.enableUniqueCode = document.getElementById('enable-unique-code').checked;
        localStorage.setItem('demo_settings', JSON.stringify(settings));
        showToast('Demo: Pengaturan Disimpan di Lokal!', 'success');
    });

    function renderHistory() {
        const data = JSON.parse(localStorage.getItem('demo_history') || '[]');
        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            if (item.status === 'confirmed') tr.classList.add('confirmed-row');
            const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.amount);
            tr.innerHTML = `<td>${new Date(item.timestamp).toLocaleString('id-ID')}</td><td>${item.name}</td><td>${item.user_wa}</td><td>${amount}</td><td>${item.method}</td><td>${item.description}</td>
                            <td><button class="btn-action btn-delete" onclick="deleteHistory(${item.id})">Hapus</button></td>`;
            tbody.appendChild(tr);
        });
    }

    window.deleteHistory = (id) => {
        showConfirm('Demo: Hapus item ini?', () => {
            let data = JSON.parse(localStorage.getItem('demo_history') || '[]');
            data = data.filter(h => h.id !== id);
            localStorage.setItem('demo_history', JSON.stringify(data));
            renderHistory();
        });
    };

    document.getElementById('btn-delete-all-history')?.addEventListener('click', () => {
        showConfirm('Demo: Bersihkan semua riwayat?', () => {
            localStorage.setItem('demo_history', '[]');
            renderHistory();
        });
    });

    initAdminDemo();
});
