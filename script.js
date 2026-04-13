document.addEventListener('DOMContentLoaded', async () => {
    // --- Supabase Configuration ---
    const { createClient } = supabase;
    const supabaseUrl = 'https://dhmabsloemxyszurqsgt.supabase.co';
    const supabaseKey = 'sb_publishable_APhzRoU6KG3Obq_2LI2Dtg_t1Fwf1xD';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

    // --- Phone Number Normalization ---
    function formatPhoneNumber(num) {
        if (!num) return num;
        let clean = num.toString().replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) {
            clean = '62' + clean.slice(1);
        } else if (clean.startsWith('8')) {
            clean = '62' + clean;
        }
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
    let selectedAmount = '50000'; // Default
    let isCustomAmount = false;
    let settings = null;

    const BANK_LOGOS = {
        'Mandiri': './assets/logos/mandiri.png',
        'BCA': './assets/logos/bca.png',
        'BNI': './assets/logos/bni.png',
        'BRI': './assets/logos/bri.png',
        'Bank Jago': './assets/logos/jago.png',
        'DANA': './assets/logos/dana.png',
        'OVO': './assets/logos/ovo.png',
        'GoPay': './assets/logos/gopay.png',
        'LinkAja': './assets/logos/linkaja.png'
    };

    // --- Initialize App & Load Settings from Supabase ---
    async function initApp() {
        try {
            const { data, error } = await supabaseClient
                .from('dukung_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) throw error;

            // Map Snake Case from DB to Camel Case for existing JS logic
            settings = {
                waNumber: data.wa_number,
                enableUniqueCode: data.enable_unique_code,
                xsenderUrl: data.xsender_url,
                xsenderKey: data.xsender_key,
                xsenderSender: data.xsender_sender,
                enableXsender: data.enable_xsender,
                profileImage: data.profile_image,
                banks: data.banks || []
            };

            setupProfileImage();
            renderPaymentMethods();
        } catch (err) {
            console.error('Gagal memuat pengaturan dari Cloud:', err);
            // Fallback default
            settings = {
                waNumber: '6281234567890',
                enableUniqueCode: true,
                banks: []
            };
            renderPaymentMethods();
        }
    }

    function setupProfileImage() {
        const headerProfileImg = document.getElementById('header-profile-img');
        if (headerProfileImg && settings.profileImage) {
            headerProfileImg.src = settings.profileImage;
        }
    }

    // Dynamic Rendering of Payment Methods
    const paymentButtonsContainer = document.getElementById('payment-buttons-container');
    const noPaymentMsg = document.getElementById('no-payment-msg');

    function renderPaymentMethods() {
        if (!paymentButtonsContainer) return;
        paymentButtonsContainer.innerHTML = '';
        
        if (!settings.banks || settings.banks.length === 0) {
            if (noPaymentMsg) noPaymentMsg.style.display = 'block';
            return;
        }

        if (noPaymentMsg) noPaymentMsg.style.display = 'none';
        settings.banks.forEach((bank) => {
            const btn = document.createElement('button');
            const typeClass = bank.type.toLowerCase().replace('bank ', '').replace(' ', '');
            btn.className = `pay-btn ${typeClass}`;
            
            const logoUrl = BANK_LOGOS[bank.type];
            if (logoUrl) {
                btn.innerHTML = `
                    <div class="pay-logo">
                        <img src="${logoUrl}" alt="${bank.type}" 
                             onerror="this.style.display='none'; this.parentElement.innerHTML='${bank.type}';"
                             style="max-height: 25px; max-width: 100px;">
                    </div>
                    <span class="pay-sub">KONFIRMASI KE WA</span>
                `;
            } else {
                btn.innerHTML = `
                    <div class="pay-logo">${bank.type}</div>
                    <span class="pay-sub">KONFIRMASI KE WA</span>
                `;
            }
            
            btn.addEventListener('click', () => {
                handleConfirmation(bank);
            });
            paymentButtonsContainer.appendChild(btn);
        });
    }

    // Handle Amount Selection
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

    if (customAmountInput) {
        customAmountInput.addEventListener('input', (e) => {
            if (isCustomAmount) {
                selectedAmount = e.target.value;
            }
        });
    }

    // Handle Copy Buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const element = document.getElementById(targetId);
            let textToCopy = element.innerText;
            
            if (targetId === 'modal-total-amount') {
                textToCopy = textToCopy.replace(/[^0-9]/g, '');
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = btn.innerText;
                btn.innerText = 'Tersalin!';
                btn.style.background = '#10b981';
                btn.style.color = '#ffffff';
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = '#ffffff';
                    btn.style.color = '#10b981';
                }, 2000);
            });
        });
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.style.display = 'none';
        }
    });

    // Handle Final Confirmation
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', async () => {
            if (!currentTransaction) return;

            const { name, userWa, description, formattedAmount, method, amount } = currentTransaction;
            
            // 1. Save to Supabase History FIRST
            await saveToCloudHistory({
                name,
                user_wa: userWa,
                description,
                amount,
                method,
                status: 'pending'
            });

            const message = `Assalamualaikum,\nSaya Bpk/Ibu *${name}*\n\nSaya sudah melakukan transfer senilai *${formattedAmount}* melalui *${method}*\n\n*Keterangan/Produk :*\n${description}\n\nMohon dicek ya. Terima kasih!`;
            const waUrl = `https://wa.me/${formatPhoneNumber(settings.waNumber)}?text=${encodeURIComponent(message)}`;

            // Automated Notification to Admin via Xsender
            if (settings.enableXsender && settings.xsenderUrl && settings.xsenderKey) {
                const adminMessage = `*NOTIFIKASI TRANSFER BARU*\n\nBpk/Ibu *${name}* baru saja melakukan konfirmasi transfer senilai *${formattedAmount}* melalui *${method}*.\n\n*Keterangan:* ${description}\n\nSilakan cek rekening dan konfirmasi di panel Admin.`;
                
                const adminParams = new URLSearchParams();
                adminParams.append('api_key', settings.xsenderKey);
                adminParams.append('sender', settings.xsenderSender);
                adminParams.append('number', settings.waNumber);
                adminParams.append('message', adminMessage);

                fetch(settings.xsenderUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: adminParams
                }).catch(err => console.error('Admin Notification Error:', err));
            }

            window.open(waUrl, '_blank');
            paymentModal.style.display = 'none';
        });
    }

    async function saveToCloudHistory(data) {
        try {
            const { error } = await supabaseClient
                .from('dukung_history')
                .insert([data]);
            if (error) throw error;
            console.log('Riwayat berhasil disimpan ke Cloud.');
        } catch (err) {
            console.error('Gagal simpan riwayat ke Cloud:', err);
        }
    }

    async function sendXsenderNotification(userData, transactionData, bankData) {
        if (!settings.enableXsender || !settings.xsenderUrl || !settings.xsenderKey) return;

        const message = `Assalamualaikum Bpk/Ibu *${userData.name}*,\n\nTerima kasih telah memilih dukungan melalui *${bankData.type}*.\n\nSilakan transfer senilai *${transactionData.formattedAmount}*\nKe Rek: *${bankData.number}*\nA.N: *${bankData.holder}*\n\nMohon lampirkan bukti transfer di chat ini jika sudah selesai. Terima kasih!`;

        const params = new URLSearchParams();
        params.append('api_key', settings.xsenderKey);
        params.append('sender', settings.xsenderSender);
        params.append('number', userData.phone);
        params.append('message', message);
        params.append('footer', 'PengenBayar - Konfirmasi Otomatis');

        try {
            await fetch(settings.xsenderUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: params
            });
        } catch (err) {
            console.error('Xsender API Error:', err);
        }
    }

    function handleConfirmation(bankObj) {
        const name = nameInput.value.trim();
        const userWa = waNumberInput.value.trim();
        const description = descriptionInput.value.trim();
        const finalAmount = isCustomAmount ? customAmountInput.value : selectedAmount;

        if (!name) { showToast('Silakan masukkan nama lengkap Anda.', 'error'); nameInput.focus(); return; }
        if (!userWa) { showToast('Silakan masukkan nomor WhatsApp Anda.', 'error'); waNumberInput.focus(); return; }
        if (!description) { showToast('Silakan masukkan keterangan produk/jasa.', 'error'); descriptionInput.focus(); return; }
        if (!finalAmount || finalAmount <= 0) { showToast('Silakan pilih atau masukkan nominal dukungan.', 'error'); if (isCustomAmount) customAmountInput.focus(); return; }

        let uniqueCode = 0;
        const uniqueCodeNotice = document.querySelector('.unique-code-notice');
        
        if (settings.enableUniqueCode !== false) {
            uniqueCode = Math.floor(Math.random() * 50) + 1;
            if (uniqueCodeNotice) uniqueCodeNotice.style.display = 'block';
        } else {
            if (uniqueCodeNotice) uniqueCodeNotice.style.display = 'none';
        }

        const totalToPay = parseInt(finalAmount) + uniqueCode;
        const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(totalToPay);

        currentTransaction = {
            name,
            userWa,
            description,
            amount: totalToPay,
            formattedAmount,
            method: bankObj.type
        };

        modalBankName.textContent = bankObj.type;
        modalAccountNumber.textContent = bankObj.number;
        modalTotalAmount.textContent = formattedAmount;
        const holderEl = document.getElementById('modal-account-holder');
        if (holderEl) holderEl.textContent = `A.N. ${bankObj.holder}`;

        paymentModal.style.display = 'flex';
        sendXsenderNotification({ name, phone: userWa }, currentTransaction, bankObj);
    }

    // Number only validation for WA input
    if (waNumberInput) {
        waNumberInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // Start Everything
    await initApp();
});
