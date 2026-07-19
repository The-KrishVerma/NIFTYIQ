import json
import numpy as np
from pathlib import Path
from collections import defaultdict
import yfinance as yf

# ==========================================
# CONFIGURATION & PATHS
# ==========================================
BASE_DIR = Path(__file__).resolve().parent.parent
INSIGHTS_DIR = BASE_DIR / "data" / "qualitative_insights"
PEER_EVAL_DIR = BASE_DIR / "data" / "peer_evaluations"

PEER_EVAL_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def safe_float(val):
    """Safely converts any string/number to a float, returning None if it fails."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

# ==========================================
# MAIN EVALUATION ENGINE
# ==========================================
def run_global_standardized_peer_evaluation():
    print("\n" + "=" * 60)
    print("PHASE 2: Standardized Global Z-Score Peer Evaluation")
    print("=" * 60)
    
    all_companies = {}
    global_scores = []
    
    # 1. Load all JSONs, extract AI scores, and calculate RAW fundamental score
    for company_folder in INSIGHTS_DIR.iterdir():
        if company_folder.is_dir():
            sym = company_folder.name
            json_path = company_folder / f"{sym}_individual.json"
            if json_path.exists():
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Extract Qualitative Scores
                    bq = safe_float(data.get("business_quality_signals", {}).get("BQ")) or 0
                    bg = safe_float(data.get("governance_signals", {}).get("BG")) or 0
                    rp = safe_float(data.get("return_profile_signals", {}).get("RP")) or 0
                    cy = safe_float(data.get("cyclicality_signals", {}).get("CY")) or 0
                    
                    # Mentor Request: Avg score across LLM scores
                    avg_score = (bq + bg + rp + cy) / 4.0
                    data["fundamental_score"] = avg_score
                    
                    global_scores.append(avg_score)
                    
                    # Store both the data and the path so we can overwrite it later
                    all_companies[sym] = {"data": data, "path": json_path}
                    
                except Exception as e:
                    print(f" ❌ Failed to load {sym}: {e}")

    if not all_companies:
        print(" ⚠ No companies found to evaluate. Exiting Phase 2.")
        return False

    # 2. Calculate Global Mean and Standard Deviation (Whole Index Math)
    index_mean = np.mean(global_scores)
    index_std = np.std(global_scores)
    
    if index_std == 0:
        index_std = 1.0  # Prevent division by zero if all scores are magically identical

    print(f" 🌍 Global Index Calculated: Mean={index_mean:.2f}, StdDev={index_std:.2f}")

    # 3. Apply Z-Scores, Save back to Individual JSONs, and Group by Sector
    print(f" 📊 Applying Z-Scores and Grouping {len(all_companies)} companies by industry...")
    sector_map = defaultdict(list)
    
    for sym, info in all_companies.items():
        data = info["data"]
        json_path = info["path"]
        
        # Calculate Z-Score: (Company Score - Average Index Score) / Standard Deviation
        z_score = (data["fundamental_score"] - index_mean) / index_std
        data["z_score"] = float(z_score)
        
        # VERY IMPORTANT: Save the math back to the individual JSON file! 
        # This guarantees your db_uploader.py will push it to MongoDB for the Whole Index page.
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Group by industry via yfinance
        try:
            ticker = yf.Ticker(f"{sym}.NS")
            sector = ticker.info.get("industry", "Unclassified").replace(" ", "_").replace("/", "_")
            sector_map[sector].append(sym)
        except:
            sector_map["Unclassified"].append(sym)

    # 4. Generate the Sector-Specific JSON files (Leaderboards)
    for industry, symbols in sector_map.items():
        # Sort companies in this sector globally by their Z-Score (highest to lowest)
        symbols.sort(key=lambda s: all_companies[s]["data"]["z_score"], reverse=True)
        
        rankings = []
        for i, sym in enumerate(symbols):
            company_data = all_companies[sym]["data"]
            rankings.append({
                "company": sym,
                "score": round(company_data["fundamental_score"], 2),
                "z_score": round(company_data["z_score"], 4),
                "rank": i + 1
            })

        # Generate simplified payload strictly for Fundamental Investors as requested
        output_payload = {
            "industry": industry,
            "companies_count": len(symbols),
            "best_performing_company": symbols[0] if symbols else None,
            "best_company_justification": "Top ranked company in sector based on global Z-score evaluation.",
            "rankings": {
                "fundamental_investor": rankings
            }
        }

        output_file = PEER_EVAL_DIR / f"{industry}_evaluation.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_payload, f, indent=2)
            
        print(f"   ✓ Saved standardized leaderboard → {output_file.name}")
        
    return True

if __name__ == "__main__":
    run_global_standardized_peer_evaluation()