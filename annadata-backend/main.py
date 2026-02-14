from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
import asyncio

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Config 
API_KEY = "C5t4v6LQb7xQU1FsWioW3NHTSUPMHOM8peV9wQDAERKWmSHx"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}
RECIPE_URL = "http://cosylab.iiitd.edu.in:6969/recipe2-api/recipes-calories/calories"

recipes_cache = {}

async def fetch_data(client, page):
    params = {"minCalories": 0, "maxCalories": 2000, "limit": 10, "page": page}
    try:
        res = await client.get(RECIPE_URL, headers=HEADERS, params=params, timeout=10.0)
        return res.json().get("data", []) if res.status_code == 200 else []
    except Exception as e:
        print(f"Fetch Error: {e}")
        return []

# --- ROUTES START ---

@app.get("/get-menu")
async def get_menu():
    global recipes_cache
    async with httpx.AsyncClient() as client:
        tasks = [fetch_data(client, p) for p in range(1, 4)]
        results = await asyncio.gather(*tasks)
        all_data = [item for sublist in results for item in sublist]
        recipes_cache = {r["Recipe_title"]: r for r in all_data if "Recipe_title" in r}
        return list(recipes_cache.keys())

@app.post("/analyze")
async def analyze(data: dict):
    dish = data.get("dish_name")
    price = float(data.get("vendor_price", 0))
    recipe = recipes_cache.get(dish)

    if not recipe:
        return {"error": "Dish not found in cache"}

    cals = float(recipe.get("Calories") or 400)
    time = float(recipe.get("cook_time") or 15) + float(recipe.get("prep_time") or 10)
    
    raw_cost = round(cals * 0.22, 2)
    labor = round(time * 0.85, 2)
    honest_cost = round((raw_cost + labor + 35) * 1.35, 2)
    
    status = "SAFE" if price >= (honest_cost * 0.85) else "DANGER"

    # Nutrition Metrics logic
    nutrition_metrics = [
        {"label": "Vitamins", "value": "Optimal", "color": "#10b981"},
        {"label": "Protein", "value": "Natural", "color": "#10b981"},
        {"label": "Trans Fat", "value": "0%", "color": "#10b981"}
    ]
    
    if status == "DANGER":
        nutrition_metrics = [
            {"label": "Vitamins", "value": "-85% Loss", "color": "#ef4444"},
            {"label": "Protein", "value": "Diluted", "color": "#ef4444"},
            {"label": "Trans Fat", "value": "+240% High", "color": "#ef4444"}
        ]

    return {
        "status": status,
        "honest_cost": honest_cost,
        "nutrition_impact": nutrition_metrics,
        "suggestions": [
            {"original": "Butter/Ghee", "substitute": "Hydrogenated Fat", "science": "Molecular similarity matches industrial fillers."}
        ] if status == "DANGER" else [],
        "breakdown": [
            {"item": "Raw Material", "cost": raw_cost},
            {"item": "Labor/Time", "cost": labor},
            {"item": "Fixed Overheads", "cost": 35.0}
        ]
    }


@app.get("/get-heatmap-data")
async def get_heatmap_data():
    print("Heatmap Data Requested") 
    return [
        {"lat": 26.8467, "lng": 80.9462, "city": "Lucknow", "risk": 0.9, "inflation": "+18%"},
        {"lat": 28.6139, "lng": 77.2090, "city": "Delhi NCR", "risk": 0.7, "inflation": "+12%"},
        {"lat": 26.4499, "lng": 80.3319, "city": "Kanpur", "risk": 0.4, "inflation": "+5%"},
        {"lat": 27.1767, "lng": 78.0081, "city": "Agra", "risk": 0.85, "inflation": "+15%"},
        {"lat": 25.3176, "lng": 82.9739, "city": "Varanasi", "risk": 0.3, "inflation": "+2%"}
    ]

# --- ROUTES END ---

if __name__ == "__main__":
    print("Annadata Engine Running on http://127.0.0.1:8080")
    uvicorn.run(app, host="127.0.0.1", port=8080)