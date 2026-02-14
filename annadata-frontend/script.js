const API_URL = "http://127.0.0.1:8080";
let map;

// 1. Initial Menu Loading with Error Handling
async function loadMenu() {
    const dishSelect = document.getElementById('dishSelect');
    try {
        const res = await fetch(`${API_URL}/get-menu`);
        if (!res.ok) throw new Error("Server error");
        const dishes = await res.json();
        
        if (dishes.length > 0) {
            dishSelect.innerHTML = dishes.map(d => `<option value="${d}">${d}</option>`).join('');
        } else {
            dishSelect.innerHTML = `<option>No recipes found</option>`;
        }
    } catch (e) {
        console.error("Menu fetch failed:", e);
        dishSelect.innerHTML = `<option>Server Offline</option>`;
    }
}

// 2. Analysis Logic
async function analyze() {
    const dish = document.getElementById('dishSelect').value;
    const priceInput = document.getElementById('priceInput');
    const vendorPrice = parseFloat(priceInput.value);

    if (!vendorPrice || vendorPrice <= 0) {
        alert("Please enter a valid price.");
        return;
    }

    // UI States
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('scanLoader').classList.remove('hidden');
    document.getElementById('analysisContent').classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dish_name: dish, vendor_price: vendorPrice })
        });
        const data = await res.json();

        // Calculate Score
        const ratio = vendorPrice / data.honest_cost;
        let score = ratio >= 0.9 ? (88 + Math.random() * 8) : (ratio >= 0.6 ? 55 + ratio * 30 : 25 + ratio * 20);
        score = score.toFixed(1);
        const color = score > 80 ? '#10b981' : (score > 55 ? '#f59e0b' : '#ef4444');

        
        document.getElementById('integrityVal').innerText = score + "%";
        document.getElementById('integrityVal').style.color = color;
        document.getElementById('riskVal').innerText = score > 80 ? "LOW" : (score > 55 ? "MEDIUM" : "HIGH");
        document.getElementById('riskVal').style.color = color;
        document.getElementById('honestPrice').innerText = "₹" + data.honest_cost;
        document.getElementById('statusBar').style.backgroundColor = color;

        // Nutrition Update
        document.getElementById('nutritionGrid').innerHTML = data.nutrition_impact.map(m => `
            <div class="p-3 rounded-xl text-center">
                <p class="text-[8px] font-bold text-slate-400 uppercase">${m.label}</p>
                <p class="text-xs font-black" style="color:${m.color}">${m.value}</p>
            </div>
        `).join('');

        // Breakdown Update
        document.getElementById('breakdownUl').innerHTML = data.breakdown.map(b => `
            <div class="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-bold">
                <span class="text-slate-500 uppercase">${b.item}</span>
                <span>₹${b.cost}</span>
            </div>
        `).join('');

      
        document.getElementById('alternativesList').innerHTML = data.suggestions.length > 0 ? data.suggestions.map(s => `
            <div class="p-4 bg-white border border-slate-200 rounded-xl">
                <p class="text-[9px] font-bold text-slate-300 line-through uppercase">${s.original}</p>
                <p class="text-sm font-black text-slate-800">${s.substitute}</p>
                <p class="text-[10px] text-slate-500 mt-1 italic">${s.science}</p>
            </div>
        `).join('') : "<p class='text-center py-10 text-slate-400 text-xs font-bold'>INTEGRITY VERIFIED: NO ANOMALIES</p>";

        document.getElementById('scanLoader').classList.add('hidden');
        document.getElementById('analysisContent').classList.remove('hidden');
        if (score > 80) confetti();

    } catch (e) {
        alert("Backend Offline! Ensure main.py is running.");
        document.getElementById('scanLoader').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    }
}

// 3. View & Tab Switching
function switchView(view) {
    document.getElementById('scannerView').classList.toggle('hidden', view !== 'scanner');
    document.getElementById('mapView').classList.toggle('hidden', view !== 'map');
    document.getElementById('navScanner').classList.toggle('active', view === 'scanner');
    document.getElementById('navMap').classList.toggle('active', view === 'map');
    if (view === 'map') setTimeout(() => { if (!map) initMap(); else map.invalidateSize(); }, 300);
}

function switchTab(tab) {
    document.getElementById('reportView').classList.toggle('hidden', tab !== 'report');
    document.getElementById('flavorView').classList.toggle('hidden', tab !== 'flavor');
    document.getElementById('tabBtnReport').classList.toggle('active', tab === 'report');
    document.getElementById('tabBtnFlavor').classList.toggle('active', tab === 'flavor');
}

// 4. Map Init
async function initMap() {
    map = L.map('map').setView([26.8467, 80.9462], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    try {
        const res = await fetch(`${API_URL}/get-heatmap-data`);
        const data = await res.json();
        data.forEach(p => {
            const color = p.risk > 0.7 ? '#ef4444' : (p.risk > 0.4 ? '#f59e0b' : '#10b981');
            L.circle([p.lat, p.lng], { color, fillColor: color, fillOpacity: 0.5, radius: 40000 }).addTo(map)
             .bindPopup(`<b>${p.city}</b><br>Inflation: ${p.inflation}<br>Risk: ${Math.round(p.risk*100)}%`);
        });
    } catch (e) { console.error("Map Error"); }
}

window.onload = () => {
    loadMenu();
    lucide.createIcons();
};