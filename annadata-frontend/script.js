const API_URL = "http://127.0.0.1:8000";

// Start-up
window.onload = async () => {
    try {
        const res = await fetch(`${API_URL}/get-menu`);
        const dishes = await res.json();
        const select = document.getElementById('dishSelect');
        select.innerHTML = dishes.map(d => `<option value="${d}">${d}</option>`).join('');
        updateHint();
    } catch (e) {
        console.error("Backend offline");
    }
};

function updateHint() {
    const prices = { "Dal Rice": 45, "Chole Bhature": 60, "Paneer Tikka": 180, "Chicken Biryani": 220 };
    const val = document.getElementById('dishSelect').value;
    document.getElementById('hintCost').innerText = `₹${prices[val] || '--'}`;
}

async function analyze() {
    const dish = document.getElementById('dishSelect').value;
    const price = document.getElementById('priceInput').value;

    if(!price) return;

    // UI Feedback
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('analysisContent').classList.add('hidden');
    document.getElementById('scanLoader').classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dish_name: dish, vendor_price: parseFloat(price) })
        });
        const data = await res.json();
        showResults(data);
    } catch (e) {
        alert("Integrity Engine connection failed!");
        resetUI();
    }
}

function showResults(data) {
    document.getElementById('scanLoader').classList.add('hidden');
    document.getElementById('analysisContent').classList.remove('hidden');

    const banner = document.getElementById('verdictBanner');
    const title = document.getElementById('vTitle');
    const icon = document.getElementById('vIcon');

    if(data.status === "SAFE") {
        banner.className = "p-6 rounded-3xl flex gap-4 items-center bg-emerald-50 text-emerald-700 border border-emerald-100";
        title.innerText = "SAFE INTEGRITY";
        icon.innerHTML = "✓";
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#059669', '#10b981'] });
    } else {
        banner.className = "p-6 rounded-3xl flex gap-4 items-center bg-red-50 text-red-700 border border-red-100";
        title.innerText = "ADULTERATION RISK";
        icon.innerHTML = "!";
    }

    const list = document.getElementById('breakdownUl');
    list.innerHTML = data.breakdown.map(item => `
        <div class="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span class="font-bold text-slate-600 text-sm">${item.item}</span>
            <span class="font-extrabold text-slate-900">₹${item.cost}</span>
        </div>
    `).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${tabId}`).classList.add('active');
    document.getElementById('current-page').innerText = tabId.toUpperCase();
    lucide.createIcons();
}