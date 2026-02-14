const API_URL = "http://127.0.0.1:8080";

// 1. Tab Switching (Optimized)
function switchTab(tab) {
    console.log(`Switching to tab: ${tab}`);
    const reportView = document.getElementById('reportView');
    const flavorView = document.getElementById('flavorView');
    const btnReport = document.getElementById('tabBtnReport');
    const btnFlavor = document.getElementById('tabBtnFlavor');

    const isReport = tab === 'report';
    
    reportView.classList.toggle('hidden', !isReport);
    flavorView.classList.toggle('hidden', isReport);
    
    btnReport.classList.toggle('active', isReport);
    btnReport.classList.toggle('opacity-40', !isReport);
    
    btnFlavor.classList.toggle('active', !isReport);
    btnFlavor.classList.toggle('opacity-40', isReport);
}

// 2. Initial Menu Load (With Debugging)
async function loadMenu() {
    console.log("Attempting to fetch menu from:", `${API_URL}/get-menu`);
    const dishSelect = document.getElementById('dishSelect');
    
    try {
        const response = await fetch(`${API_URL}/get-menu`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const dishes = await response.json();
        console.log("Dishes received:", dishes);
        
        if (dishes.length === 0) {
            dishSelect.innerHTML = '<option value="">No dishes found in RecipeDB</option>';
        } else {
            dishSelect.innerHTML = dishes.map(d => `<option value="${d}">${d}</option>`).join('');
        }
    } catch (e) { 
        console.error("Critical Connection Error:", e.message);
        dishSelect.innerHTML = '<option value="">⚠️ Server Offline (Check Python Console)</option>'; 
    }
}

// 3. Main Analysis Engine (Refined Logic)
async function analyze() {
    const dish = document.getElementById('dishSelect').value;
    const price = document.getElementById('priceInput').value;
    
    if(!dish || dish.includes("Offline")) return alert("Pehle server start karo bhai!");
    if(!price || price <= 0) return alert("Menu wala asli price dalo!");

    console.log("Analyzing Dish:", dish, "at Price:", price);

    const loader = document.getElementById('scanLoader');
    const content = document.getElementById('analysisContent');
    const tabs = document.getElementById('resultTabs');
    const empty = document.getElementById('emptyState');

    // UI State: Loading
    empty.classList.add('hidden');
    loader.classList.remove('hidden');
    content.classList.add('hidden');
    tabs.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                dish_name: dish, 
                vendor_price: parseFloat(price) 
            })
        });

        if (!res.ok) throw new Error('Analysis Request Failed');
        const data = await res.json();
        console.log("Analysis Result Received:", data);

        // 1. Update Forensic Metrics
        let integrity = data.status === "SAFE" ? 92 : 38;
        const integrityEl = document.getElementById('integrityVal');
        const riskEl = document.getElementById('riskVal');
        
        integrityEl.innerText = `${integrity}%`;
        integrityEl.style.color = integrity > 70 ? '#10b981' : '#ef4444';
        
        riskEl.innerText = data.status === "SAFE" ? "LOW" : "HIGH";
        riskEl.style.color = data.status === "SAFE" ? '#10b981' : '#ef4444';
        
        document.getElementById('honestPrice').innerText = `₹${data.honest_cost}`;

        // 2. Verdict Banner (Real-time Feedback)
        const banner = document.getElementById('verdictBanner');
        const isSafe = data.status === 'SAFE';
        
        banner.className = `p-6 rounded-3xl border ${isSafe ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-red-100 bg-red-50 text-red-900'} flex flex-col gap-2`;
        document.getElementById('vTitle').innerText = isSafe ? "Integrity Verified" : "Forensic Warning";
        document.getElementById('vDesc').innerText = isSafe ? "Price aligns with RecipeDB molecular density." : "Suspiciously low price. Potential industrial fillers detected.";

        // 3. FlavorDB Molecular Matches
        const altList = document.getElementById('alternativesList');
        const flavorTabBtn = document.getElementById('tabBtnFlavor');

        if (data.suggestions && data.suggestions.length > 0) {
            flavorTabBtn.classList.remove('hidden');
            altList.innerHTML = data.suggestions.map(s => `
                <div class="p-4 bg-white border border-blue-100 rounded-2xl shadow-sm hover:translate-x-1 transition-all">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[9px] font-bold text-slate-300 line-through uppercase">${s.original}</span>
                        <span class="text-[9px] font-black text-blue-600 px-2 py-0.5 bg-blue-50 rounded">MOLECULAR MATCH</span>
                    </div>
                    <div class="text-xs font-black text-slate-800">${s.substitute}</div>
                    <div class="text-[9px] text-slate-500 italic mt-1 leading-tight">${s.science}</div>
                </div>
            `).join('');
        } else {
            flavorTabBtn.classList.add('hidden');
        }

        // 4. RecipeDB Cost Deconstruction
        document.getElementById('breakdownUl').innerHTML = data.breakdown.map(b => `
            <div class="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                <span class="text-[10px] font-bold text-slate-500">${b.item}</span>
                <span class="text-[10px] font-black text-slate-900">₹${b.cost}</span>
            </div>
        `).join('');

        // UI Reveal
        loader.classList.add('hidden');
        content.classList.remove('hidden');
        tabs.classList.remove('hidden');
        
        if(isSafe) confetti({ particleCount: 150, spread: 70, origin: { y: 0.8 } });

    } catch (e) { 
        console.error("Analysis Error:", e);
        loader.classList.add('hidden'); 
        empty.classList.remove('hidden');
        alert("Server Error: Python console check karo, shayad data fetch nahi hua."); 
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    if (window.lucide) lucide.createIcons();
});