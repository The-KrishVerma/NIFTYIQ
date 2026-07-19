"""
Main Execution Pipeline for NIFTYIQ
Orchestrates scraping, AI extraction, data merging, peer evaluation, and database upload.
"""

import json
from pathlib import Path
import sys
import yfinance as yf

# Implemented pipeline modules
from symbols import get_nifty100_symbols
from pdf_scraper import run_scraper
from unzip import run_unzip_cleanup
from quantitative_fetcher import fetch_yfinance_metrics
from scraper.ai_extractor import run_ai_extraction
from scraper.merge_data import merge_folders
from scraper.peer_evaluator import run_global_standardized_peer_evaluation
from scraper.industry_evaluator import run_industry_evaluation
import db_uploader

BASE_DIR = Path(__file__).resolve().parent
PROGRESS_PATH = BASE_DIR / "data" / "progress.json"

# Keep common ticker renames here for demo-friendly symbol lookup.
SYMBOL_ALIASES = {
    "ZOMATO": "ETERNAL",
}


def load_progress():
    """Loads pipeline progress to allow resuming after interruptions."""
    default = {
        "scraper": False,
        "scraping_done": False,
        "unzip_done": False,
        "quantitative_analysis": False,
        "quantitative_done": False,
        "quantitative_completed": [],
        "quantitative_pending": [],
        "individual_completed": [],
        "peer_eval_completed": [],
        "individual_skipped": []
    }

    if PROGRESS_PATH.exists():
        try:
            with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            merged = {**default, **data}
            if "quantitative_completed" not in merged:
                merged["quantitative_completed"] = []
            if "quantitative_pending" not in merged:
                merged["quantitative_pending"] = []
            return merged
        except Exception:
            return default
    return default


def save_progress(progress):
    """Saves pipeline state to disk."""
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2)


def symbol_has_pending_zip(symbol):
    report_dir = BASE_DIR / "data" / "reports" / symbol
    if not report_dir.exists():
        return False
    return any(report_dir.glob("*.zip"))


def run_pipeline(manual_symbol=None):
    # 1. Determine Symbols & Mode
    if manual_symbol:
        original_symbol = manual_symbol.upper()
        symbol = SYMBOL_ALIASES.get(original_symbol, original_symbol)
        print(f"\n🚀 DEMO MODE: Processing {symbol}...")
        if symbol != original_symbol:
            print(f"ℹ Alias detected: {original_symbol} -> {symbol}")

        is_valid = False

        # 1. Check against Nifty 100 (Internal list is most reliable)
        try:
            nifty100 = get_nifty100_symbols()
            if symbol in nifty100:
                is_valid = True
                print(f"✅ Symbol '{symbol}' found in Nifty 100 index.")
        except Exception:
            pass

        # 2. If not in Nifty 100, try a "Price Ping" (NSE then BSE fallback)
        if not is_valid:
            for suffix in [".NS", ".BO", ""]:  # Tries NSE, then BSE, then raw symbol
                try:
                    test_symbol = f"{symbol}{suffix}"
                    ticker = yf.Ticker(test_symbol)
                    info = ticker.info or {}
                    if info.get("longName") or info.get("shortName"):
                        is_valid = True
                        print(
                            f"✅ Symbol '{symbol}' validated as '{test_symbol}' via Yahoo Finance.")
                        break  # Stop looking once we find a valid ticker
                    hist = ticker.history(period="1d")
                    if not hist.empty:
                        is_valid = True
                        print(
                            f"✅ Symbol '{symbol}' validated as '{test_symbol}' via Yahoo Finance.")
                        break  # Stop looking once we find a valid ticker
                except Exception:
                    continue

        # 3. Final Fallback: Proceed with Warning
        if not is_valid:
            print(f"⚠️ Warning: Could not verify '{symbol}' automatically.")
            print(
                f"   Proceeding anyway... (Scraper will verify NSE report availability)")

        symbols = [symbol]
        is_demo = True

        # --- NEW: PDF Pre-check Warning ---
        report_dir = BASE_DIR / "data" / "reports" / symbol
        if not report_dir.exists() or not any(report_dir.iterdir()):
            print(f"\n🛑 CRITICAL WARNING: No files found in {report_dir}")
            print("🛑 The AI Extractor will SKIP this company unless you drop a PDF in that folder before Phase 1 runs!\n")
    else:
        print("Fetching NIFTY 100 symbols...")
        symbols = get_nifty100_symbols()
        symbols = symbols[:100]
        if "LICI" in symbols:
            symbols.remove("LICI")
        print(f"Found {len(symbols)} companies for standard processing.")
        is_demo = False

    # 2. Progress Handling
    if is_demo:
        # In demo mode, we ignore progress.json to force a fresh run for the symbol
        progress = {
            "scraper": False,
            "scraping_done": False,
            "unzip_done": False,
            "quantitative_analysis": False,
            "quantitative_done": False,
            "quantitative_completed": [],
            "quantitative_pending": [symbols[0]],
            "individual_completed": [],
            "peer_eval_completed": [],
            "individual_skipped": []
        }
    else:
        progress = load_progress()

    # ========================================
    # PRE-PROCESSING: Scraper & Cleanup
    # ========================================
    if not is_demo and progress.get("scraper"):
        print("\n[STEP] Scraper: already done according to progress.json")
    else:
        print(f"\n[STEP] Running scraper for {len(symbols)} companies...")
        run_scraper(symbols)
        if not is_demo:
            progress["scraper"] = True
            progress["scraping_done"] = True
            save_progress(progress)
            print("[DONE] Scraper completed.")

    if not is_demo and progress.get("unzip_done"):
        print("\n[STEP] Unzip cleanup: already done according to progress.json")
    else:
        if any(symbol_has_pending_zip(sym) for sym in symbols):
            print("\n[STEP] Running unzip cleanup...")
            run_unzip_cleanup()
        else:
            print(
                "\n[STEP] Unzip cleanup skipped: no ZIP files pending for selected symbol(s).")
        if not is_demo:
            progress["unzip_done"] = True
            save_progress(progress)
            print("[DONE] Unzip cleanup completed.")

    # ========================================
    # QUANTITATIVE: Yahoo Finance Data
    # ========================================
    if not is_demo and progress.get("quantitative_done"):
        print(
            "\n[STEP] Quantitative metrics: already done according to progress.json")
    else:
        print("\n[STEP] Fetching deterministic quantitative metrics (yfinance)...")
        if not is_demo and not progress.get("quantitative_pending"):
            progress["quantitative_pending"] = symbols.copy()

        def _progress_callback(symbol, success):
            if not is_demo:
                if success and symbol not in progress["quantitative_completed"]:
                    progress["quantitative_completed"].append(symbol)
                if symbol in progress["quantitative_pending"]:
                    progress["quantitative_pending"].remove(symbol)
                progress["quantitative_analysis"] = len(
                    progress["quantitative_completed"]) > 0
                progress["quantitative_done"] = len(
                    progress["quantitative_pending"]) == 0
                save_progress(progress)

        result = fetch_yfinance_metrics(
            symbols, progress_callback=_progress_callback)
        if result is None:
            completed, failed = [], symbols.copy()
        else:
            try:
                completed, failed = result
            except Exception:
                completed, failed = [], symbols.copy()

        if not is_demo:
            progress["quantitative_completed"] = completed
            progress["quantitative_pending"] = [
                s for s in symbols if s not in completed]
            progress["quantitative_analysis"] = True
            progress["quantitative_done"] = len(
                progress["quantitative_pending"]) == 0
            save_progress(progress)
            print("[DONE] Quantitative metrics completed.")

    # ========================================
    # PHASE 1: Individual AI Company Analysis
    # ========================================
    print("\n" + "=" * 60)
    print("PHASE 1: Individual Company Analysis (Gemini Extract)")
    print("=" * 60)

    phase1_ok = run_ai_extraction(symbols)

    if not phase1_ok:
        print("\nPhase 1 interrupted (Likely API Rate Limit). Re-run pipeline to resume.")
        return

    # ========================================
    # DATA STITCHING: Merge Quant & Qual
    # ========================================
    print("\n" + "=" * 60)
    print("DATA INTEGRATION: Merging Quantitative and Qualitative Data")
    print("=" * 60)
    
    # 🚀 CRITICAL ADDITION: This must run before Phase 2!
    merge_folders()

    # ========================================
    # DATA STITCHING 2.0: Daily Real-time Pricing
    # ========================================
    print("\n" + "=" * 60)
    print("DATA INTEGRATION: Injecting Real-Time Daily Market Prices")
    print("=" * 60)
    from update_daily_prices import run_price_update
    run_price_update(symbols)

    # ========================================
    # PHASE 2: Sector Peer Evaluation (Math Engine)
    # ========================================
    print("\n" + "=" * 60)
    print("PHASE 2: Sector Peer Evaluation (Python Math Engine)")
    print("=" * 60)

    phase2_ok = run_global_standardized_peer_evaluation()

    if not phase2_ok:
        print("\nPhase 2 failed. Check your individual JSON files for formatting errors.")
        return

    # ========================================
    # PHASE 2.5: Industry-Level Evaluation
    # ========================================
    print("\n" + "=" * 60)
    print("PHASE 2.5: Industry-Level Aggregation & Ranking")
    print("=" * 60)

    industry_ok = run_industry_evaluation()

    if not industry_ok:
        print("\nIndustry evaluation did not complete. Continuing to DB upload...")

    # ========================================
    # PHASE 3: Database Upload
    # ========================================
    print("\n" + "=" * 60)
    print("PHASE 3: Pushing Data to Local MongoDB")
    print("=" * 60)
    
    db_uploader.upload_individual_companies()
    db_uploader.upload_peer_evaluations()
    db_uploader.upload_industry_evaluations()

    print("\n" + "=" * 60)
    print(f"🏁 {'Demo' if is_demo else 'Batch'} run complete for {symbols}!")
    print("🏁 Pipeline run complete! All data is staged and in the database.")
    print("=" * 60)

if __name__ == "__main__":
    # Check for command-line arguments
    if len(sys.argv) > 1:
        # Supports both: python pipeline.py ZOMATO and python pipeline.py --symbol ZOMATO
        manual_symbol = None
        if sys.argv[1] in ("--symbol", "-s"):
            if len(sys.argv) < 3:
                print(
                    "❌ Missing symbol value. Usage: python pipeline.py --symbol ZOMATO")
                sys.exit(1)
            manual_symbol = sys.argv[2]
        else:
            manual_symbol = sys.argv[1]

        run_pipeline(manual_symbol=manual_symbol)
    else:
        # Run Standard Batch Mode
        run_pipeline()
