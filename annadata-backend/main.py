import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Strictly adding CORS to prevent "Backend Offline" errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FOODOSCOPE MASTER CONFIG ---
HEADERS = {
    "Authorization": "Bearer GaQ3_Zc8_7PcUDumIl2_cUcMqyUzRtf-3BNeX_1vyA5uzE3O",
    "Content-Type": "application/json"
}
BASE_URL = "https://api.foodoscope.com/recipe2-api"

@app.get("/get-menu")
async def get_menu():
    # Fetching more recipes to show off the database
    url = f"{BASE_URL}/recipe/recipesinfo?page=1&limit=100"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10).json()
        # Filter out duplicates and empty titles
        titles = list(set([res['Recipe_title'] for res in r['payload']['data'] if res.get('Recipe_title')]))
        return titles
    except Exception as e:
        print(f"Menu Error: {e}")
        return ["Southwestern Beef Brisket", "Sweet Honey French Bread", "Heirloom Apple Pie"]

@app.post("/analyze")
async def analyze(request: dict):
    dish_name = request.get("dish_name")
    vendor_price = request.get("vendor_price", 0)

    try:
        # STEP 1: Fetch Deep Metadata using the 'By Title' endpoint
        meta_url = f"{BASE_URL}/recipe-bytitle/recipeByTitle?title={dish_name}"
        meta_res = requests.get(meta_url, headers=HEADERS, timeout=10).json()
        recipe = meta_res['payload']['data'][0]
        
        # Molecular Stats
        calories = float(recipe.get('Calories', 300))
        total_time = float(recipe.get('total_time', 45))
        region = recipe.get('Region', 'Standard')
        
        # New Feature: Protein-Based Price Weighting
        # Logic: High protein recipes (from Foodoscope data) must have higher honest costs
        protein_content = float(recipe.get('Protein', 10)) 
        protein_premium = round(protein_content * 4.5, 2) # Rs 4.5 per gram of protein

        # STEP 2: Ingredient Complexity (using flavor and utensils logic)
        # Slow cooking or complex regional dishes cost more in labor/fuel
        method_multiplier = 1.5 if total_time > 60 else 1.0
        labor_fuel = round((total_time / 10) * 10 * method_multiplier, 2)

        # STEP 3: The "Honest Price" Formula (Scientific Inflation Index)
        raw_material = round((calories / 100) * 22, 2) # Rs 22 per 100kcal (Standard Material Cost)
        
        # Honest Total = Raw + Protein Premium + Labor/Fuel + Compliance Buffer
        honest_total = round(raw_material + protein_premium + labor_fuel + 25, 2)

        # STEP 4: Adulteration Risk Logic (Strict 85% threshold)
        # If vendor price is significantly lower than honest cost, flag for adulteration
        status = "SAFE" if vendor_price >= (honest_total * 0.85) else "RED"

        return {
            "status": status,
            "honest_cost": honest_total,
            "breakdown": [
                {"item": "Energy-Based Raw Materials", "cost": raw_material},
                {"item": "Protein Content Integrity (Premium)", "cost": protein_premium},
                {"item": "Thermal Energy & Prep Labor", "cost": labor_fuel},
                {"item": "Safety & Quality Compliance", "cost": 25.0}
            ],
            "molecular_insights": {
                "energy": f"{calories} kcal",
                "protein_grade": f"{protein_content}g (High)" if protein_content > 20 else f"{protein_content}g (Standard)",
                "method": "Artisanal / Slow-Cooked" if total_time > 60 else "Standard Prep",
                "region": region
            }
        }
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {
            "status": "RED", 
            "honest_cost": 100.0, 
            "breakdown": [{"item": "Data Unavailable (Standard Index)", "cost": 100.0}],
            "molecular_insights": {"energy": "N/A", "protein_grade": "N/A", "method": "Standard", "region": "Unknown"}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)