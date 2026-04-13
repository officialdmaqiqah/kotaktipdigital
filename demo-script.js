document.addEventListener('DOMContentLoaded', async () => {
    // --- DEMO MODE: No Supabase ---
    // Using localStorage for isolated, private testing

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
        if (clean.startsWith('618')) clean = '62' + clean.slice(2);
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        else if (clean.startsWith('8')) clean = '62' + clean;
        if (!clean.startsWith('62') && clean.length >= 9 && clean.length <= 14) clean = '62' + clean;
        return clean;
    }

    const amountButtons = document.querySelectorAll('.amount-btn');
    const customAmountContainer = document.getElementById('other-amount-container');
    const customAmountInput = document.getElementById('custom-amount');
    const nameInput = document.getElementById('full-name');
    const waNumberInput = document.getElementById('wa-number');
    const descriptionInput = document.getElementById('description');
    const paymentButtons = document.querySelectorAll('.pay-btn');

    // Modal Elements
    const paymentModal = document.getElementById('payment-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBankName = document.getElementById('modal-bank-name');
    const modalAccountNumber = document.getElementById('modal-account-number');
    const modalTotalAmount = document.getElementById('modal-total-amount');
    const btnConfirmPayment = document.getElementById('btn-confirm-payment');

    let currentTransaction = null;
    let selectedAmount = '50000';
    let isCustomAmount = false;
    let settings = null;

    const BANK_LOGOS = {
        'Mandiri': './assets/logos/mandiri.png', 'BCA': './assets/logos/bca.png', 'BNI': './assets/logos/bni.png',
        'BRI': './assets/logos/bri.png', 'Bank Jago': './assets/logos/jago.png', 'DANA': './assets/logos/dana.png',
        'OVO': './assets/logos/ovo.png', 'GoPay': './assets/logos/gopay.png', 'LinkAja': './assets/logos/linkaja.png'
    };

    // --- Initialize DEMO App ---
    function initDemoApp() {
        const storedSettings = localStorage.getItem('demo_settings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
        } else {
            // Default Demo Settings
            settings = {
                waNumber: '6281234567890',
                enableUniqueCode: true,
                profileImage: '',
                banks: [
                    { name: 'Detti (Demo)', number: '12345678', type: 'Mandiri' },
                    { name: 'Detti (Demo)', number: '081234567', type: 'DANA' }
                ]
            };
            localStorage.setItem('demo_settings', JSON.stringify(settings));
        }
        setupProfileImage();
        renderPaymentMethods();
    }

    function setupProfileImage() {
        const img = document.getElementById('header-profile-img');
        if (img && settings.profileImage) img.src = settings.profileImage;
    }

    function renderPaymentMethods() {
        const container = document.getElementById('payment-buttons-container');
        if (!container) return;
        container.innerHTML = '';
        (settings.banks || []).forEach(bank => {
            const btn = document.createElement('button');
            btn.className = 'pay-btn';
            const logo = BANK_LOGOS[bank.type] || '';
            const logoHtml = logo ? `<img src="${logo}" alt="${bank.type}" onerror="this.parentElement.innerHTML='${bank.type}'">` : bank.type;
            
            btn.innerHTML = `
                <div class="pay-logo">${logoHtml}</div>
                <span class="pay-sub">KONFIRMASI KE WA</span>
            `;
            btn.addEventListener('click', () => handleConfirmation(bank));
            container.appendChild(btn);
        });
    }

    // Amount Logic
    amountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            amountButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const value = btn.getAttribute('data-value');
            if (value === 'other') {
                customAmountContainer.style.display = 'block';
                isCustomAmount = true;
                customAmountInput.value = '';
                selectedAmount = '';
                customAmountInput.focus();
            } else {
                customAmountContainer.style.display = 'none';
                isCustomAmount = false;
                selectedAmount = value;
            }
        });
    });

    customAmountInput?.addEventListener('input', (e) => {
        let rawValue = e.target.value.replace(/[^0-9]/g, '');
        selectedAmount = rawValue;
        e.target.value = rawValue ? new Intl.NumberFormat('id-ID').format(rawValue) : '';
    });

    function handleConfirmation(bankObj) {
        const name = nameInput.value.trim();
        const userWa = formatPhoneNumber(waNumberInput.value.trim());
        const description = descriptionInput.value.trim();
        const rawAmount = isCustomAmount ? customAmountInput.value.replace(/[^0-9]/g, '') : selectedAmount.toString();
        const finalAmount = parseInt(rawAmount) || 0;

        if (!name || !userWa || !description || finalAmount <= 0) {
            showToast('Lengkapi semua data pembeli.', 'error');
            return;
        }

        let uniqueCode = settings.enableUniqueCode ? Math.floor(Math.random() * 50) + 1 : 0;
        const totalToPay = finalAmount + uniqueCode;
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalToPay);

        currentTransaction = { name, description, amount: totalToPay, formattedAmount, method: bankObj.type, userWa };

        modalBankName.innerText = bankObj.type;
        modalAccountNumber.innerText = bankObj.number;
        modalTotalAmount.innerText = formattedAmount;
        paymentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    btnConfirmPayment?.addEventListener('click', () => {
        const { name, description, formattedAmount, method, userWa } = currentTransaction;
        const message = `Assalamualaikum,\nSaya *${name}*\n\nSudah transfer senilai *${formattedAmount}* via *${method}*\n\n*Keterangan:*\n${description}`;
        
        // Save to demo history
        const demoHistory = JSON.parse(localStorage.getItem('demo_history') || '[]');
        demoHistory.unshift({ id: Date.now(), timestamp: new Date().toISOString(), name, user_wa: userWa, amount: currentTransaction.amount, method, description, status: 'pending' });
        localStorage.setItem('demo_history', JSON.stringify(demoHistory));

        window.open(`https://wa.me/${settings.waNumber}?text=${encodeURIComponent(message)}`, '_blank');
        showToast('Demo: Transaksi Disimpan ke Riwayat Lokal!', 'success');
        paymentModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    closeModalBtn?.addEventListener('click', () => {
        paymentModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    initDemoApp();
});
