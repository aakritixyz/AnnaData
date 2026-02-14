const API_URL = "http://127.0.0.1:8000";

// 1. App Startup: Fetch Menu
window.onload = async () => {
    try {
        const res = await fetch(`${API_URL}/get-menu`);
        const menu = await res.json();
        const select = document.getElementById('dishSelect');
        select.innerHTML = menu.map(d => `<option value="${d}">${d}</option>`).join('');
        document.getElementById('market-status').innerText = "LIVE";
        updateHint();
    } catch (e) {
        document.getElementById('market-status').innerText = "SYNC ERR";
        document.getElementById('dishSelect').innerHTML = `<option>Backend Offline</option>`;
    }
};

// 2. Tab Management
function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    
    // UI Active States
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${tabId}`)?.classList.add('active');
    document.getElementById(`m-btn-${tabId}`)?.classList.add('active');
    
    document.getElementById('current-page').innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    
    if(tabId === 'flavordb') loadFlavorDB();
    lucide.createIcons();
}

// 3. Update Visual Hint
function updateHint() {
    const dish = document.getElementById('dishSelect').value;
    const priceMap = { "Dal Rice": 45, "Chole Bhature": 65, "Paneer Tikka": 180, "Chicken Biryani": 220 };
    document.getElementById('hintCost').innerText = `₹${priceMap[dish] || '--'}`;
}

// 4. Run Analysis
async function analyze() {
    const dish = document.getElementById('dishSelect').value;
    const price = document.getElementById('priceInput').value;
    if(!price) return;

    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('analysisContent').classList.add('hidden');
    document.getElementById('scanLoader').classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dish_name: dish, vendor_price: parseFloat(price) })
        });
        const data = await response.json();
        renderResults(data);
    } catch (e) {
        alert("Check if FastAPI server is running!");
        document.getElementById('scanLoader').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }
}

function renderResults(data) {
    document.getElementById('scanLoader').classList.add('hidden');
    document.getElementById('analysisContent').classList.remove('hidden');

    const banner = document.getElementById('verdictBanner');
    const vTitle = document.getElementById('vTitle');
    const vDesc = document.getElementById('vDesc');
    const vIcon = document.getElementById('vIcon');

    if(data.status === "SAFE") {
        banner.className = "verdict-banner safe";
        vTitle.innerText = "Fair Price Integrity";
        vDesc.innerText = "Standard ingredient costs detected. Low risk of adulteration.";
        vIcon.innerText = "✔";
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } else {
        banner.className = "verdict-banner danger";
        vTitle.innerText = "Economic Violation";
        vDesc.innerText = "Price too low for pure ingredients. High risk of synthetics.";
        vIcon.innerText = "⚠";
    }

    document.getElementById('breakdownUl').innerHTML = data.breakdown.map(i => `
        <li><span class="text-slate-500 font-medium">${i.item}</span><strong class="text-slate-900">₹${i.cost}</strong></li>
    `).join('');
    
    document.getElementById('totalCostDisplay').innerText = `₹${data.honest_cost}`;
}

// 5. FlavorDB Logic
async function loadFlavorDB() {
    const grid = document.getElementById('flavorGrid');
    try {
        const res = await fetch(`${API_URL}/flavors`);
        const data = await res.json();
        grid.innerHTML = data.map(f => `
            <div class="card p-6 border border-slate-100 hover:shadow-md transition-shadow">
                <small class="text-red-500 font-bold uppercase text-[9px]">Replace: ${f.toxic_chemical}</small>
                <h3 class="text-emerald-700 font-extrabold text-lg mt-1">Use: ${f.safe_alternative}</h3>
                <p class="text-slate-400 text-xs mt-2 leading-relaxed">${f.benefit}</p>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = `<p class="p-8 text-center text-slate-400">Loading dynamic alternatives...</p>`;
    }
}