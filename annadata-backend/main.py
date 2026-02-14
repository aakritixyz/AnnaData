from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
import os

# 1. PEHLE APP DEFINE KARO (Crucial fix for NameError)
app = FastAPI(title="Annadata Forensic Engine")

# 2. CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. CONFIG & API KEYS
API_KEY = "-VLoVkZcvaCR9xhQcuJRxf_o44CEjKTub7hSQUnSItP3NxBr"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
BASE_URL = "https://api.foodoscope.com/recipe2-api"

# 4. MARKET INTELLIGENCE (Fixed CSV Loader)
def get_market_intelligence():
    try:
        csv_path = 'Weekly Avg. Report Data Commoditywise.csv'
        if not os.path.exists(csv_path):
            print("⚠️ CSV file missing! Using default prices.")
            return {"rice": {"price": 45, "trend": 0}}
            
        # skiprows=4 se hum headers ko skip karte hain jahan text hota hai
        df = pd.read_csv(csv_path, skiprows=4, header=None)
        
        market = {}
        for _, row in df.iterrows():
            try:
                # Row 0: Name, Row 2: Curr Price, Row 3: Prev Price
                name = str(row[0]).strip().lower()
                curr = float(row[2]) # Yahan float conversion safe rahega ab
                prev = float(row[3]) if len(row) > 3 and pd.notnull(row[3]) else curr
                
                # Unit conversion: Agar '100 Kg' likha hai toh 1Kg ka price nikalo
                unit_price = curr/100 if "100" in str(row[1]) else curr
                inflation = ((curr - prev) / prev * 100) if prev > 0 else 0
                
                market[name] = {"price": unit_price, "trend": inflation}
            except:
                continue # Agar koi row corrupted hai toh skip karo
        return market
    except Exception as e:
        print(f"❌ Critical CSV Load Error: {e}")
        return {"rice": {"price": 45, "trend": 0}}

MARKET_DATA = get_market_intelligence()

# 5. ROUTES
@app.get("/get-menu")
async def get_menu():
    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}/recipe/recipesinfo?page=1&limit=100"
        try:
            r = await client.get(url, headers=HEADERS, timeout=10.0)
            data = r.json()
            items = data.get("payload", {}).get("data", [])
            return [{"id": str(d.get("recipe_id")), "title": d.get("Recipe_title")} for d in items if d.get("recipe_id")]
        except Exception as e:
            print(f"Menu Fetch Error: {e}")
            return [{"id": "92757", "title": "Costa Rican Stuffed Tortilla"}]

@app.post("/analyze")
async def analyze(request: dict):
    recipe_id = request.get("recipe_id")
    vendor_price = float(request.get("vendor_price"))

    async with httpx.AsyncClient() as client:
        detail_url = f"{BASE_URL}/search-recipe/{recipe_id}"
        try:
            res = await client.get(detail_url, headers=HEADERS)
            data = res.json()
            ingredients = data.get("ingredients", [])
            
            total_honest_cost = 0
            breakdown = []
            inf_tracker = []

            for ing in ingredients:
                name = ing.get("ingredient", "").lower()
                # Quantity extraction (handle empty strings)
                try:
                    qty_str = ing.get("quantity", "1")
                    qty = float(qty_str) if qty_str else 1.0
                except:
                    qty = 1.0
                
                # Mapping logic
                m_info = {"price": 40, "trend": 0}
                if "oil" in name: m_info = MARKET_DATA.get("mustard oil (packed)", {"price": 175, "trend": 4.0})
                elif any(x in name for x in ["meat", "beef", "chicken"]): m_info = MARKET_DATA.get("meat", {"price": 450, "trend": 2.0})
                elif any(x in name for x in ["corn", "tortilla", "maize"]): m_info = MARKET_DATA.get("maize", {"price": 30, "trend": 1.0})
                elif "tomato" in name or "cabbage" in name: m_info = MARKET_DATA.get("vegetables", {"price": 40, "trend": 5.0})

                # Basic calculation: qty * price (serving adjustments can be added here)
                # Hum assume kar rahe hain quantities small units mein hain
                cost = (qty * m_info["price"]) / 10 if qty > 5 else (qty * m_info["price"])
                total_honest_cost += cost
                inf_tracker.append(m_info["trend"])
                
                if cost > 0.1:
                    breakdown.append({"item": ing.get("ingredient"), "cost": round(cost, 2)})

            # Formula: Raw Cost + 45% (Fuel, Labor, Profit)
            honest_cost = total_honest_cost * 1.45
            avg_inflation = sum(inf_tracker)/len(inf_tracker) if inf_tracker else 0
            
            status = "SAFE"
            verdict = "Market standards met."
            if vendor_price < (honest_cost * 0.75):
                status = "DANGER"
                verdict = "Extreme Risk! Price is too low for authentic ingredients."
            elif vendor_price < honest_cost:
                status = "SUSPICIOUS"
                verdict = "Low margins. Check for ingredient quality."

            return {
                "status": status,
                "honest_cost": round(honest_cost, 2),
                "breakdown": breakdown,
                "inflation": f"{round(avg_inflation, 1)}%",
                "verdict": verdict
            }
        except Exception as e:
            print(f"Analysis Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)