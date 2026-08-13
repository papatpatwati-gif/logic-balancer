// 1. KONFIGURASI FIREBASE
const firebaseConfig = {
        apiKey: "AIzaSyB7aWSghbfFDj8k7bXuvNZLSlADunEjs78",
        authDomain: "logic-balancer-premium.firebaseapp.com",
        projectId: "logic-balancer-premium",
        storageBucket: "logic-balancer-premium.firebasestorage.app",
        messagingSenderId: "1048897053276",
        appId: "1:1048897053276:web:eccf5562cd539acd0b3c99",
        measurementId: "G-497LL8JFRV"
    };

    // 2. INISIALISASI DASAR
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const DB_KEY = "LOGIC_BALANCER_V1_DB";
    
    let myChart = null;
    let journalDB = JSON.parse(localStorage.getItem(DB_KEY) || "{}");

   // Inisialisasi dengan status default (tanpa autentikasi)
    const defaultStatus = "Umum";
    document.getElementById('displayUserStatus').innerText = "✨ " + defaultStatus.toUpperCase();
    document.getElementById('userStatus').value = defaultStatus;
    
    // Muat foto profil dari localStorage jika ada
    const savedImg = localStorage.getItem('userImg');
    if (savedImg) {
        const imgEl = document.getElementById('profileImg');
        imgEl.src = savedImg;
        imgEl.style.display = "block";
        document.getElementById('placeholderIcon').style.display = "none";
    }
    // 4. LOGIKA UTAMA (PROSES AUDIT & AI)
  async function prosesAudit() {
    const msgBox = document.getElementById('cooldownMessage');
    const COOLDOWN_TIME = 6 * 60 * 60 * 1000; // 6 Jam
    const lastInput = localStorage.getItem('last_audit_time');
    const now = Date.now();

    // Reset pesan setiap kali diklik
    if(msgBox) msgBox.style.display = "none";

    // 1. CEK COOLDOWN
    if (lastInput) {
        const timePassed = now - parseInt(lastInput);
        if (timePassed < COOLDOWN_TIME) {
            const timeLeft = COOLDOWN_TIME - timePassed;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            if(msgBox) {
                msgBox.style.display = "block";
                msgBox.innerHTML = `⚠️ Harap tunggu <strong>${hours} jam ${minutes} menit</strong> lagi untuk input data baru agar audit tetap akurat.`;
            }
            return; // Hentikan proses
        }
    }

    const saldo = cleanRupiah(document.getElementById('saldoAwal').value);
    if(saldo <= 0) return alert("Masukkan pendapatan bulanan dulu!");

    // Ambil data input lainnya
    const status = document.getElementById('userStatus').value;
    const refleksi = document.getElementById('refleksiHarian').value;
    const kuota = cleanRupiah(document.getElementById('biayaKuota').value);
    const rutin = cleanRupiah(document.getElementById('totalRutin').value);
    const nama = document.getElementById('namaBarang').value;
    const harga = cleanRupiah(document.getElementById('hargaBarang').value);

    // Hitung Kalkulasi
    const nomTab = saldo * 0.10;
    const sisaWajib = kuota + rutin;
    const nomCadangan = (saldo - sisaWajib) * 0.15;
    const sisaSek = Math.max(0, saldo - nomTab - nomCadangan - sisaWajib);
    const calc = { tabungan: nomTab, cadangan: nomCadangan, sisaHarian: sisaSek, pengeluaranWajib: sisaWajib };

    const box = document.getElementById('aiResponse');
    box.innerHTML = "<em>AI sedang merenungkan nasehat...</em>";

    try {
        const prompt = `Saya adalah seorang ${status}. Pendapatan saya Rp ${saldo.toLocaleString('id-ID')}, tabungan Rp ${nomTab.toLocaleString('id-ID')}, sisa belanja Rp ${sisaSek.toLocaleString('id-ID')}. Mau beli ${nama} seharga Rp ${harga.toLocaleString('id-ID')}. Kamu adalah 'Kafah Financial Advisor', pakar manajemen keuangan syariah yang bijaksana. Tugasmu:
1. Menganalisis data keuangan user (Status, Pengeluaran, Saldo).
2. Memberikan nasehat berdasarkan prinsip Maqashid Syariah (Dharuriyat/Kebutuhan vs Tahsiniyyat/Keinginan).
3. Jawab dengan bahasa santun, diawali dengan salam Islami.
4. WAJIB sertakan minimal satu potongan ayat Al-Qur'an atau Hadist (Teks Arab dan Terjemahan) yang relevan.
5. Jika user boros, berikan pengingat tentang sifat 'Tabzir' (mubazir).
6. Jika user bertanya di luar keuangan, tolak dengan sopan dan arahkan kembali ke topik harta yang berkah.
7. Jaga jawaban agar ringkas, padat, dan solutif.`;
        
        const response = await fetch(`/api/audit`, {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const resultText = data.candidates[0].content.parts[0].text;
            box.innerHTML = `<strong>🌸 NASEHAT UNTUK ${status.toUpperCase()}:</strong><br>${resultText}`;

            // SIMPAN TIMESTAMP HANYA JIKA BERHASIL API
            localStorage.setItem('last_audit_time', Date.now().toString());

            // Tampilkan Hadist Statis & Simpan Jurnal
            const hadistArea = document.getElementById('hadistArea');
            if (hadistArea) {
                hadistArea.style.display = "block";
                hadistArea.innerHTML = `<span class="arabic-text" style="display: block; direction: rtl; font-size: 1rem; margin-bottom: 8px; color: var(--text); line-height: 1.6;">لِيُنْفِقْ ذُو سَعَةٍ مِنْ سَعَتِهِ</span><p style="font-style: italic; margin: 0; font-size: 0.7rem;">“Hendaklah orang yang mempunyai keluasan memberi nafkah menurut kemampuannya.” (QS. At-Thalaq: 7)</p>`;
            }

            const today = new Date().toISOString().split('T')[0];
            journalDB[today] = {
                inputs: { saldo: document.getElementById('saldoAwal').value, refleksi, kuota: document.getElementById('biayaKuota').value, rutin: document.getElementById('totalRutin').value, namaB: nama, hargaB: document.getElementById('hargaBarang').value },
                calc: { tabungan: nomTab, cadangan: nomCadangan, sisa: sisaSek, wajib: sisaWajib },
                aiResponse: box.innerHTML 
            };
            localStorage.setItem(DB_KEY, JSON.stringify(journalDB));
            
            renderCalendar();
            displayResults(calc, box.innerHTML);
        }

    } catch (e) { 
        console.error(e);
        box.innerHTML = "Gunakan rezeki dengan bijak. Utamakan kebutuhan sebelum keinginan."; 
        displayResults(calc, box.innerHTML);
    }
}

    // 5. FUNGSI PENDUKUNG (TIDAK ADA YANG TERTINGGAL)
    function cleanRupiah(str) {
        if(!str) return 0;
        return parseFloat(str.replace(/[^0-9]/g, "")) || 0;
    }

    function formatInputRupiah(input) {
        let value = input.value.replace(/\D/g, "");
        input.value = value !== "" ? "Rp " + parseInt(value).toLocaleString("id-ID") : "";
    }

    function cariBarang() {
        const barang = document.getElementById('namaBarang').value;
        if (barang) {
            window.open(`https://www.google.com/search?q=harga+${encodeURIComponent(barang)}`, '_blank');
        } else {
            alert("Tuliskan nama barangnya dulu ya!");
        }
    }

    function previewImage(event) {
        const reader = new FileReader();
        reader.onload = () => {
            document.getElementById('profileImg').src = reader.result;
            document.getElementById('profileImg').style.display = "block";
            document.getElementById('placeholderIcon').style.display = "none";
            localStorage.setItem('userImg', reader.result);
        };
        reader.readAsDataURL(event.target.files[0]);
    }

    function renderCalendar() {
        const calBody = document.getElementById('calendarBody');
        if(!calBody) return;
        calBody.innerHTML = '';
        ['S','S','R','K','J','S','M'].forEach(d => {
            const el = document.createElement('div');
            el.className = 'cal-day-label'; el.innerText = d;
            calBody.appendChild(el);
        });
        const now = new Date();
        const year = now.getFullYear(); const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let shift = firstDay === 0 ? 6 : firstDay - 1;
        for(let i = 0; i < shift; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-cell'; empty.style.visibility = 'hidden';
            calBody.appendChild(empty);
        }
        for(let d = 1; d <= daysInMonth; d++) {
            const cell = document.createElement('div');
            cell.className = 'cal-cell'; cell.innerText = d;
            const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if(journalDB[dateKey]) cell.classList.add('filled');
            if(d === now.getDate()) cell.classList.add('today');
            cell.onclick = () => loadHistory(dateKey);
            calBody.appendChild(cell);
        }
    }

    function displayResults(calc, aiText) {
        document.getElementById('inputArea').style.display = "none";
        document.getElementById('resultArea').style.display = "block";
        document.getElementById('resTab').innerText = "Rp " + calc.tabungan.toLocaleString('id-ID');
        document.getElementById('resCad').innerText = "Rp " + calc.cadangan.toLocaleString('id-ID');
        document.getElementById('resSek').innerText = "Rp " + calc.sisaHarian.toLocaleString('id-ID');
        document.getElementById('aiResponse').innerHTML = aiText;
        const aiBox = document.getElementById('aiResponse');
    aiBox.innerHTML = aiText + `
        <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
            <button onclick="salinNasehat()" style="background: #25d366; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                📋 Salin & Share ke WA
            </button>
        </div>
    `;
        const hargaB = cleanRupiah(document.getElementById('hargaBarang').value);
        const namaB = document.getElementById('namaBarang').value || "Barang Impian";
        if (hargaB > 0) {
            let persen = Math.min((calc.sisaHarian / hargaB) * 100, 100);
            document.getElementById('progBar').style.width = persen + "%";
            document.getElementById('progPercent').innerText = Math.floor(persen) + "%";
            document.getElementById('progLabel').innerText = "PROGRESS: " + namaB.toUpperCase();
        }
        updateChart(calc.tabungan, calc.pengeluaranWajib, calc.cadangan, calc.sisaHarian);
    }

    function updateChart(t, w, c, s) {
        const ctx = document.getElementById('financialChart').getContext('2d');
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tabungan', 'Wajib', 'Cadangan', 'Sisa'],
                datasets: [{ data: [t, w, c, s], backgroundColor: ['#ffb703', '#4a4a4a', '#9d4edd', '#ff85a2'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }
        });
    }

    function loadHistory(key) {
        if(!journalDB[key]) return alert("Data tidak ditemukan.");
        const data = journalDB[key];
        document.getElementById('saldoAwal').value = data.inputs.saldo;
        document.getElementById('refleksiHarian').value = data.inputs.refleksi;
        document.getElementById('biayaKuota').value = data.inputs.kuota;
        document.getElementById('totalRutin').value = data.inputs.rutin;
        document.getElementById('namaBarang').value = data.inputs.namaB;
        document.getElementById('hargaBarang').value = data.inputs.hargaB;
        const compatibleCalc = { tabungan: data.calc.tabungan, cadangan: data.calc.cadangan, sisaHarian: data.calc.sisa, pengeluaranWajib: data.calc.wajib };
        displayResults(compatibleCalc, data.aiResponse);
        document.getElementById('calendarLabel').innerText = "📂 DATA TANGGAL: " + key;
    }

    function backToInput() {
        document.getElementById('inputArea').style.display = "block";
        document.getElementById('resultArea').style.display = "none";
        document.getElementById('calendarLabel').innerText = "🗓️ JEJAK KEUANGAN BULAN INI";
    }

    function checkSavedThemeAndProfile() {
        if(localStorage.getItem('theme')) setTheme(localStorage.getItem('theme'));
        if(localStorage.getItem('userImg')) {
            document.getElementById('profileImg').src = localStorage.getItem('userImg');
            document.getElementById('profileImg').style.display = "block";
            document.getElementById('placeholderIcon').style.display = "none";
        }
    }

    function setTheme(mode) {
        document.body.classList.toggle('dark-theme', mode === 'dark');
        localStorage.setItem('theme', mode);
    }

    function logout() {
        // Clear local data dan refresh halaman
        if (confirm("Apakah Anda yakin ingin keluar? Data lokal akan dihapus.")) {
            localStorage.clear();
            location.reload();
        }
    }
    function toggleGuide() {
    const modal = document.getElementById('guideModal');
    if (modal.style.display === "none") {
        modal.style.display = "block";
    } else {
        modal.style.display = "none";
    }
}
// Fungsi untuk mengecek status tombol saat halaman baru dibuka
function checkCooldownStatus() {
    const btn = document.getElementById('btnProses'); // Pastikan ID tombol Anda benar
    const msgBox = document.getElementById('cooldownMessage');
    const lastInput = localStorage.getItem('last_audit_time');
    const COOLDOWN_TIME = 6 * 60 * 60 * 1000;
    const now = Date.now();

    if (lastInput && (now - parseInt(lastInput) < COOLDOWN_TIME)) {
        const timeLeft = COOLDOWN_TIME - (now - parseInt(lastInput));
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        if(btn) {
            btn.style.background = "#ccc"; // Ubah jadi abu-abu
            btn.style.cursor = "not-allowed";
            btn.innerText = "Mode Istirahat ⏳";
        }
        if(msgBox) {
            msgBox.style.display = "block";
            msgBox.innerHTML = `⚠️ Mode hemat energi aktif. Anda bisa input lagi dalam <strong>${hours} jam ${minutes} menit</strong>.`;
        }
    }
}

// Jalankan pengecekan otomatis saat aplikasi dibuka

function salinNasehat() {
    // Ambil teks dari box AI (tanpa tag HTML)
    const teksRaw = document.getElementById('aiResponse').innerText;
    
    // Tambahkan branding kafahmedia
    const teksCopy = `${teksRaw}\n\n---\n💡 *Nasehat ini diambil dari Aplikasi Jurnal Keuangan kafahmedia*`;

    // Proses Copy ke Clipboard
    navigator.clipboard.writeText(teksCopy).then(() => {
        alert("Nasehat telah disalin! Silakan share ke WhatsApp atau catatan Anda.");
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
    });
}
const daftarQuotes = [
    { q: "Kekayaan bukanlah dengan banyaknya harta benda, namun kekayaan adalah hati yang selalu merasa cukup.", a: "HR. Bukhari & Muslim" },
    { q: "Tangan yang di atas lebih baik daripada tangan yang di bawah.", a: "HR. Muslim" },
    { q: "Barangsiapa yang bersyukur, niscaya Aku akan menambah nikmat-Ku kepadamu.", a: "QS. Ibrahim: 7" },
    { q: "Cukupkanlah dirimu dengan yang halal agar terhindar dari yang haram.", a: "Ali bin Abi Thalib" },
    { q: "Sedekah itu tidak akan mengurangi harta.", a: "HR. Muslim" },
    { q: "Dunia ini adalah perhiasan, dan sebaik-baik perhiasan dunia adalah istri yang shalihah.", a: "HR. Muslim" },
    { q: "Harta yang paling berharga adalah kesabaran. Rekan yang paling setia adalah amal bakti.", a: "Ali bin Abi Thalib" }
];

function tampilkanQuoteAcak() {
    const randomIndex = Math.floor(Math.random() * daftarQuotes.length);
    const quote = daftarQuotes[randomIndex];
    
    document.getElementById('islamicQuote').innerText = `"${quote.q}"`;
    document.getElementById('quoteAuthor').innerText = `— ${quote.a}`;
}

// Panggil fungsi ini di dalam window.onload agar muncul saat aplikasi dibuka
// GABUNGAN SEMUA FUNGSI STARTUP
window.onload = function() {
    checkSavedThemeAndProfile(); // Memuat tema & foto profil
    checkCooldownStatus();       // Mengecek apakah tombol sedang cooldown
    renderCalendar();            // Menampilkan kalender
    tampilkanQuoteAcak();        // Menampilkan kutipan islami
};