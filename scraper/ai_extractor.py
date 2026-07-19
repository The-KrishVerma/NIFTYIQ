import os
import re
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai


# ============================================================
# 1. ENVIRONMENT CONFIGURATION
# ============================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

genai.configure(api_key=API_KEY)


# ============================================================
# 2. DIRECTORY SETUP
# ============================================================

BASE_DIR = Path(__file__).parent.parent
SCRAPER_DIR = Path(__file__).parent  # scraper/ directory

REPORTS_DIR = BASE_DIR / "data" / "reports"
INSIGHTS_DIR = BASE_DIR / "data" / "qualitative_insights"
DATA_DIR = BASE_DIR / "data"

INSIGHTS_DIR = BASE_DIR / "data" / "qualitative_insights"
INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 3. LOAD SCHEMAS
# ============================================================

SCHEMA_INDIVIDUAL_PATH = SCRAPER_DIR / "schema_individual.json"
SCHEMA_PEER_EVAL_PATH = SCRAPER_DIR / "schema_peer_eval.json"

with open(SCHEMA_INDIVIDUAL_PATH, "r") as f:
    SCHEMA_INDIVIDUAL = json.dumps(json.load(f), indent=2)

if SCHEMA_PEER_EVAL_PATH.exists():
    with open(SCHEMA_PEER_EVAL_PATH, "r") as f:
        SCHEMA_PEER_EVAL = json.dumps(json.load(f), indent=2)
else:
    print("WARNING: schema_peer_eval.json not found, peer evaluation disabled.")
    SCHEMA_PEER_EVAL = "{}"


# ============================================================
# 4. LOAD PROMPTS
# ============================================================

def _extract_prompt_block(md_path, heading):
    """Extract the code block under a given ## heading from a prompt .md file."""
    text = md_path.read_text(encoding="utf-8")
    # Find the heading, then capture the code block under it
    pattern = rf"## {re.escape(heading)}\s*```\s*\n(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find '{heading}' code block in {md_path}")
    return match.group(1).strip()


PROMPT_INDIVIDUAL_PATH = SCRAPER_DIR / "prompt_individual.md"
PROMPT_PEER_EVAL_PATH = SCRAPER_DIR / "prompt_peer_eval.md"

INDIVIDUAL_SYSTEM_PROMPT = _extract_prompt_block(PROMPT_INDIVIDUAL_PATH, "SYSTEM_PROMPT")
INDIVIDUAL_USER_TEMPLATE = _extract_prompt_block(PROMPT_INDIVIDUAL_PATH, "USER_PROMPT_TEMPLATE")

if PROMPT_PEER_EVAL_PATH.exists():
    PEER_EVAL_SYSTEM_PROMPT = _extract_prompt_block(PROMPT_PEER_EVAL_PATH, "SYSTEM_PROMPT")
    PEER_EVAL_USER_TEMPLATE = _extract_prompt_block(PROMPT_PEER_EVAL_PATH, "USER_PROMPT_TEMPLATE")
else:
    print("WARNING: prompt_peer_eval.md not found, peer evaluation disabled.")
    PEER_EVAL_SYSTEM_PROMPT = "Peer evaluation not configured."
    PEER_EVAL_USER_TEMPLATE = ""


# ============================================================
# 5. INITIALIZE GEMINI MODELS
# ============================================================

individual_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=INDIVIDUAL_SYSTEM_PROMPT
)

peer_eval_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=PEER_EVAL_SYSTEM_PROMPT
)


# ============================================================
# 6. PROGRESS TRACKING
# ============================================================

PROGRESS_FILE = DATA_DIR / "progress.json"


def load_progress():
    """Load progress from file. Returns dict with completed lists."""
    defaults = {
        "scraping_done": False,
        "unzip_done": False,
        "quantitative_done": False,
        "individual_completed": [],
        "peer_eval_completed": []
    }
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, "r") as f:
            saved = json.load(f)
        # Merge saved values over defaults (handles old progress files)
        defaults.update(saved)
    return defaults


def save_progress(progress):
    """Save progress to file."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


# ============================================================
# 7. MOST-RECENT REPORT SELECTION
# ============================================================

def find_sorted_pdfs(symbol):
    """
    Find all annual report PDFs for a symbol, sorted by most recent first.

    Parses PDF filenames to extract year ranges (YYYY_YYYY)
    and returns a list of tuples: (pdf_path, from_yr, to_yr).
    """
    company_folder = REPORTS_DIR / symbol

    if not company_folder.exists():
        print(f"  No reports folder for {symbol}")
        return []

    pdf_files = list(company_folder.glob("*.pdf"))

    if not pdf_files:
        print(f"  No PDF files found for {symbol}")
        return []

    # Extract year ranges from filenames
    candidates = []
    for pdf in pdf_files:
        # Match patterns like _2023_2024_ or _2024_2025_
        year_match = re.search(r"(\d{4})_(\d{4})", pdf.stem)
        if year_match:
            from_yr = int(year_match.group(1))
            to_yr = int(year_match.group(2))
            candidates.append((to_yr, from_yr, pdf))

    if not candidates:
        # Fallback: return the files without sorting
        print(f"  Warning: no year pattern found in filenames for {symbol}")
        return [(0, 0, pdf) for pdf in pdf_files]

    # Sort by to_yr descending, then from_yr descending
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)

    # Return list of (pdf, from_yr, to_yr)
    return [(c[2], c[1], c[0]) for c in candidates]


# ============================================================
# 8. GEMINI FILE PROCESSING
# ============================================================

def upload_and_wait(file_path, mime_type="application/pdf"):
    """Upload file to Gemini and wait until processing completes."""

    print(f"  Uploading {file_path.name}...")

    uploaded_file = genai.upload_file(
        path=file_path,
        mime_type=mime_type
    )

    print("  Waiting for Gemini to process", end="")

    while True:
        file_info = genai.get_file(uploaded_file.name)

        if file_info.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(5)
        elif file_info.state.name == "ACTIVE":
            print("\n  Document ready.")
            break
        elif file_info.state.name == "FAILED":
            raise RuntimeError("Gemini failed to process the file.")

    return uploaded_file


def save_json_report(text_content, save_path):
    """Parse AI output as JSON and save to file."""

    cleaned = text_content.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        # Remove opening fence (e.g. ```json or ```)
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  WARNING: JSON parse failed — {e}")
        print(f"  Output may be truncated. Saving as raw_output.")
        parsed = {"raw_output": cleaned, "parse_error": str(e)}

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)


# ============================================================
# 9. PHASE 1 — INDIVIDUAL COMPANY EXTRACTION
# ============================================================

def process_individual_company(pdf_path, symbol):
    """Process a single company's annual report with the individual prompt."""

    uploaded_file = None

    try:
        uploaded_file = upload_and_wait(pdf_path)

        print(f"  Generating qualitative analysis for {symbol}...")

        # Build user prompt with explicit analysis/tagging instruction
        analysis_tagging_instruction = (
            "Perform evidence-based qualitative analysis and tag your output clearly. "
            "Return exactly one JSON object following the schema."
        )
        user_prompt = (
            f"{analysis_tagging_instruction}\n\n"
            + INDIVIDUAL_USER_TEMPLATE.replace("{schema}", SCHEMA_INDIVIDUAL)
        )

        # Load the quantitative data if available
        quant_file = DATA_DIR / "quantitative" / f"{symbol}_quant.json"
        if quant_file.exists():
            print(f"  Found quantitative data for {symbol}, inserting into prompt.")
            with open(quant_file, "r") as f:
                quant_data = f.read()
            user_prompt += f"\n\nHere is the externally sourced quantitative data for this company:\n```json\n{quant_data}\n```\nUse this data to fill in the financial, valuation, and metadata fields exactly as provided."

        response = individual_model.generate_content(
            [uploaded_file, user_prompt],
            request_options={"timeout": 600},
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
                max_output_tokens=65536
            )
        )

        # 2. Parse the LLM's Qualitative JSON output
        cleaned = response.text.strip()
        if cleaned.startswith("```"):
            first_newline = cleaned.index("\n")
            cleaned = cleaned[first_newline + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

        try:
            final_data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"  WARNING: JSON parse failed — {e}")
            final_data = {"raw_output": cleaned, "parse_error": str(e)}

        # 3. MERGE Quantitative Data via Python (100% accurate, no hallucination risk)
        quant_file = DATA_DIR / "quantitative" / f"{symbol}_quant.json"
        if quant_file.exists():
            with open(quant_file, "r") as f:
                quant_data = json.load(f)
            
            # Attach the Recent and Historical data cleanly to the final payload
            final_data["quantitative_data"] = quant_data

        # 4. Save combined output
        company_dir = INSIGHTS_DIR / symbol
        company_dir.mkdir(exist_ok=True)

        save_path = company_dir / f"{symbol}_individual.json"
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)

        print(f"  Saved combined report → {save_path.name}")
        return True

    except Exception as e:
        print(f"  ERROR analyzing {symbol}: {e}")
        raise  # Re-raise so the caller can handle it

    finally:
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except:
                pass


def run_ai_extraction(symbols):
    """
    Phase 1: Run individual analysis for all symbols.

    Processing cadence:
    - 1 company → 15 second rest → next company → ...
    - After every 10th company → 2 minute rest

    On rate-limit / quota errors: save progress and stop.
    On other errors (e.g. oversized PDF): skip the company and continue.
    """

    progress = load_progress()
    completed = set(progress["individual_completed"])
    skipped = progress.get("individual_skipped", [])

    # Auto-mark completed for companies with existing individual JSON output
    for symbol in symbols:
        individual_path = INSIGHTS_DIR / symbol / f"{symbol}_individual.json"
        if individual_path.exists() and symbol not in completed:
            print(f"  Found existing output for {symbol}, marking as completed.")
            completed.add(symbol)
            if symbol in skipped:
                skipped.remove(symbol)
            progress["individual_completed"].append(symbol)
            progress["individual_skipped"] = skipped
            save_progress(progress)

    # Filter out already-completed symbols
    remaining = [s for s in symbols if s not in completed]

    if not remaining:
        print("\nPhase 1: All individual analyses already complete.")
        return True

    print(f"\nPhase 1: Individual Analysis")
    print(f"  {len(completed)} already done, {len(remaining)} remaining\n")

    count_in_batch = 0  # Tracks position within current batch of 10

    for i, symbol in enumerate(remaining):
        print(f"[{len(completed) + 1}/{len(symbols)}] Processing {symbol}...")

        # Find all PDFs sorted by recentness
        sorted_pdfs = find_sorted_pdfs(symbol)

        if not sorted_pdfs:
            print(f"  Skipping {symbol} — no PDF found\n")
            continue

        success = False
        rate_limit_hit = False

        for pdf_path, from_yr, to_yr in sorted_pdfs:
            if from_yr and to_yr:
                print(f"  Selected: {pdf_path.name} (FY {from_yr}-{to_yr})")
            else:
                print(f"  Selected: {pdf_path.name}")

            # Check file size — skip if too large
            file_size_mb = pdf_path.stat().st_size / (1024 * 1024)
            if file_size_mb > 100:
                print(f"  WARNING: PDF is {file_size_mb:.0f} MB — skipping this file and trying next available PDF.")
                continue

            try:
                success = process_individual_company(pdf_path, symbol)

                if success:
                    if symbol not in progress.get("individual_completed", []):
                        progress["individual_completed"].append(symbol)
                    if symbol in progress.get("individual_skipped", []):
                        progress["individual_skipped"].remove(symbol)
                    completed.add(symbol)
                    save_progress(progress)
                    break # Success! Break out of the PDF fallback loop

            except Exception as e:
                error_str = str(e)

                # Rate-limit / quota errors → halt pipeline (retry later)
                if "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower():
                    print(f"\n*** Rate limit / quota error. Saving progress and stopping. ***")
                    print(f"*** Error: {e} ***")
                    print(f"*** Completed {len(completed)}/{len(symbols)} companies ***")
                    save_progress(progress)
                    rate_limit_hit = True
                    break

                # Transient errors (504 timeout, 503, DeadlineExceeded) → retry once
                is_transient = ("504" in error_str or "503" in error_str
                                or "timed out" in error_str.lower()
                                or "DeadlineExceeded" in error_str)

                if is_transient:
                    print(f"  ⏳ Transient error for {symbol}, retrying in 30s...")
                    time.sleep(30)
                    try:
                        success = process_individual_company(pdf_path, symbol)
                        if success:
                            progress["individual_completed"].append(symbol)
                            completed.add(symbol)
                            save_progress(progress)
                            break
                    except Exception as retry_e:
                        print(f"  ⚠ Retry also failed for {symbol} on {pdf_path.name} — {retry_e}")

                # If we get here, this specific PDF failed. Move on to the next one.
                print(f"  ⚠ Skipping document {pdf_path.name} for {symbol} — {e}\n")

        if rate_limit_hit:
            return False
            
        if not success:
            print(f"  ⚠ All documents failed for {symbol}. Skipping company entirely.\n")
            if symbol not in skipped:
                skipped.append(symbol)
            progress["individual_skipped"] = skipped
            save_progress(progress)
            continue

        count_in_batch += 1

        # Check if this is the last symbol (no rest needed)
        if i < len(remaining) - 1:
            if count_in_batch % 10 == 0:
                print(f"\n  Batch of 10 complete. Resting for 2 minutes...\n")
                time.sleep(120)
            else:
                print(f"  Resting for 15 seconds...\n")
                time.sleep(15)

    if skipped:
        print(f"\n  ⚠ Skipped {len(skipped)} companies due to errors: {', '.join(skipped)}")

    print(f"\nPhase 1 complete. {len(completed)}/{len(symbols)} companies processed.")
    return True


def rerun_skipped_individuals():
    """Re-run individual analysis for companies listed in progress.individual_skipped."""
    progress = load_progress()
    skipped = progress.get("individual_skipped", [])
    if not skipped:
        print("No skipped companies to re-run.")
        return True

    print(f"Re-running individual extraction for {len(skipped)} skipped companies.")
    result = run_ai_extraction(skipped)

    # After run, remove any companies now in completed from skipped
    progress = load_progress()
    completed = set(progress.get("individual_completed", []))
    progress["individual_skipped"] = [s for s in progress.get("individual_skipped", []) if s not in completed]
    save_progress(progress)

    return result


# ============================================================
# 10. PHASE 2 — PEER GROUP EVALUATION
# ============================================================


# ============================================================
# 10. PHASE 2 — PEER GROUP EVALUATION (DYNAMIC SECTOR ROUTING)
# ============================================================

import yfinance as yf
from collections import defaultdict
import time

PEER_EVAL_DIR = DATA_DIR / "peer_evaluations"
PEER_EVAL_DIR.mkdir(parents=True, exist_ok=True)

def get_dynamic_sector_map(symbols):
    """
    Dynamically hits Yahoo Finance to group companies by their market sector.
    Prevents the need for hardcoded lists and scales infinitely.
    """
    print(f"\nDynamically mapping {len(symbols)} companies to their sectors via yfinance...")
    sector_map = defaultdict(list)
    
    for sym in symbols:
        try:
            # Add .NS for Indian National Stock Exchange tickers
            ticker = yf.Ticker(f"{sym}.NS")
            sector = ticker.info.get("sector", "Unclassified")
            
            # Clean string for safe file naming
            safe_sector_name = sector.replace(" ", "_").replace("/", "_")
            sector_map[safe_sector_name].append(sym)
            
        except Exception as e:
            print(f"  ⚠ Could not fetch sector for {sym}. Defaulting to Unclassified.")
            sector_map["Unclassified"].append(sym)
            
    return dict(sector_map)

def run_peer_evaluation(symbols):
    """
    Phase 2: Groups completed individual JSONs by sector and runs a comparative AI analysis.
    Bypasses the Gemini file-upload limits by feeding small, sector-specific JSON blocks directly.
    """
    progress = load_progress()
    completed_individual = set(progress.get("individual_completed", []))
    completed_peer = set(progress.get("peer_eval_completed", []))

    # Only evaluate companies that successfully passed Phase 1
    valid_symbols = [s for s in symbols if s in completed_individual]
    
    if not valid_symbols:
        print("\nPhase 2: Cannot start — No companies have completed Phase 1 individual analysis.")
        return False

    if not PEER_EVAL_SYSTEM_PROMPT or PEER_EVAL_SYSTEM_PROMPT == "Peer evaluation not configured.":
        print("\n⚠ Missing prompt/schema for Phase 2. Skipping Peer Evaluation.")
        return False

    print("\n" + "=" * 60)
    print("PHASE 2: Sector-Based Peer Evaluation")
    print("=" * 60)

    # 1. Dynamically group the valid companies
    sector_map = get_dynamic_sector_map(valid_symbols)

    # 2. Setup the Gemini Model
    generation_config = genai.types.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.1, # Keep temperature extremely low for strict analytical ranking
        max_output_tokens=8192
    )
    # Using the standard model, we don't need a custom peer_eval_model instance anymore
    model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)

    # 3. Process Sector by Sector
    for sector, sector_symbols in sector_map.items():
        print(f"\nAnalyzing Sector: {sector.replace('_', ' ')}")
        
        # Check if all symbols in this sector are already evaluated
        if all(sym in completed_peer for sym in sector_symbols):
            print(f"  ✓ All companies in {sector} already evaluated. Skipping.")
            continue
            
        # Gather all Phase 1 JSONs for this specific sector
        sector_data = []
        for sym in sector_symbols:
            json_path = INSIGHTS_DIR / sym / f"{sym}_individual.json"
            if json_path.exists():
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        company_data = json.load(f)
                        # Tag with symbol so the AI knows who is who
                        sector_data.append({sym: company_data})
                except Exception as e:
                    print(f"  ⚠ Could not load JSON for {sym}: {e}")
        
        # We need at least 2 companies to do a "Peer" evaluation
        if len(sector_data) < 2:
            print(f"  ⏭ Skipping {sector}: Need at least 2 companies for a peer evaluation.")
            # Mark them as complete so the loop doesn't get stuck on them next time
            for sym in sector_symbols:
                if sym not in progress["peer_eval_completed"]:
                    progress["peer_eval_completed"].append(sym)
            save_progress(progress)
            continue

        output_path = PEER_EVAL_DIR / f"{sector}_evaluation.json"

        # Format the payload and user prompt
        payload_str = json.dumps(sector_data, indent=2)
        user_prompt = PEER_EVAL_USER_TEMPLATE.replace("{schema}", SCHEMA_PEER_EVAL).replace("{peer_data}", payload_str)
        
        print(f"  Comparing {len(sector_data)} companies in {sector}...")
        
        # Robust Retry Logic for API Limits
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    contents=[{"role": "user", "parts": [PEER_EVAL_SYSTEM_PROMPT, user_prompt]}]
                )
                
                # Save the sector leaderboard
                with open(output_path, "w", encoding='utf-8') as f:
                    f.write(response.text)
                
                print(f"  ★ Successfully saved leaderboard → {sector}_evaluation.json")
                
                # Mark all companies in this sector as complete
                for sym in sector_symbols:
                    if sym not in progress["peer_eval_completed"]:
                        progress["peer_eval_completed"].append(sym)
                        completed_peer.add(sym)
                save_progress(progress)
                
                # Rest between successful heavy sector calls to respect quotas
                time.sleep(15)
                break 
                
            except Exception as e:
                error_str = str(e).lower()
                if "429" in error_str or "quota" in error_str or "exhausted" in error_str:
                    wait_time = 60 
                    print(f"  ⚠ Rate limit hit! Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                    time.sleep(wait_time)
                elif "500" in error_str or "503" in error_str or "timeout" in error_str:
                    print(f"  ⏳ Transient server error. Waiting 30s before retry {attempt + 1}/{max_retries}...")
                    time.sleep(30)
                else:
                    print(f"  ❌ Unrecoverable error evaluating {sector}: {e}")
                    break 

    print(f"\nPhase 2 complete. Sector peer evaluations generated.")
    return True


# ============================================================
# 11. LOCAL TEST
# ============================================================

if __name__ == "__main__":
    # Test with a small batch to verify dynamic routing
    test_symbols = ["TCS", "LTM", "DIVISLAB", "DRREDDY"]

    print("=== Phase 1: Individual Analysis ===")
    phase1_ok = run_ai_extraction(test_symbols)

    if phase1_ok:
        print("\n=== Phase 2: Peer Evaluation ===")
        run_peer_evaluation(test_symbols)

        

# CONCATENATED_FILE = DATA_DIR / "nifty50_all_individual.json"
# UPLOAD_META_FILE = DATA_DIR / "upload_meta.json"


# def concatenate_individual_jsons(symbols):
#     """
#     Concatenate all individual JSONs into a single file.
#     This is a ONE-TIME operation — the file is created once and persisted.
#     """

#     if CONCATENATED_FILE.exists():
#         print("  Concatenated file already exists. Skipping concatenation.")
#         return

#     print("  Concatenating all individual JSONs...")

#     companies = {}

#     for symbol in symbols:
#         individual_path = INSIGHTS_DIR / symbol / f"{symbol}_individual.json"

#         if individual_path.exists():
#             with open(individual_path, "r", encoding="utf-8") as f:
#                 companies[symbol] = json.load(f)
#         else:
#             print(f"    Warning: No individual JSON for {symbol}")

#     concatenated = {
#         "created_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
#         "companies": companies
#     }

#     with open(CONCATENATED_FILE, "w", encoding="utf-8") as f:
#         json.dump(concatenated, f, indent=2, ensure_ascii=False)

#     print(f"  Saved concatenated file with {len(companies)} companies.")


# def get_or_upload_concatenated_file():
#     """
#     Upload the concatenated JSON to Gemini's server if needed.

#     Logic:
#     - If upload_meta.json exists and created_at is within 36 hours → reuse
#     - Otherwise → re-upload (but do NOT re-concatenate)
#     """

#     need_upload = True

#     if UPLOAD_META_FILE.exists():
#         with open(UPLOAD_META_FILE, "r") as f:
#             meta = json.load(f)

#         created_at = datetime.fromisoformat(meta["created_at"])
#         now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
#         age_hours = (now - created_at).total_seconds() / 3600

#         if age_hours < 36:
#             print(f"  Reusing uploaded file (uploaded {age_hours:.1f} hours ago)")
#             # Verify the file still exists on Gemini's server
#             try:
#                 file_info = genai.get_file(meta["gemini_file_name"])
#                 if file_info.state.name == "ACTIVE":
#                     need_upload = False
#                     return meta["gemini_file_name"]
#                 else:
#                     print(f"  File no longer active on server. Re-uploading...")
#             except Exception:
#                 print(f"  Could not find file on server. Re-uploading...")

#     if need_upload:
#         print("  Uploading concatenated file to Gemini server...")

#         uploaded_file = upload_and_wait(
#             CONCATENATED_FILE,
#             mime_type="application/json"
#         )

#         # Save upload metadata
#         meta = {
#             "created_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(),
#             "gemini_file_name": uploaded_file.name
#         }

#         with open(UPLOAD_META_FILE, "w") as f:
#             json.dump(meta, f, indent=2)

#         return uploaded_file.name


# def process_peer_evaluation(symbol, gemini_file_name):
#     """Run peer evaluation for a single company."""

#     # Load target company info from individual JSON
#     individual_path = INSIGHTS_DIR / symbol / f"{symbol}_individual.json"

#     if not individual_path.exists():
#         print(f"  No individual JSON for {symbol}. Skipping.")
#         return False

#     with open(individual_path, "r", encoding="utf-8") as f:
#         individual_data = json.load(f)

#     company_name = individual_data.get("company_metadata", {}).get("company_name", symbol)
#     ticker = symbol

#     print(f"  Generating peer evaluation for {company_name} ({ticker})...")

#     # Get the uploaded file reference
#     uploaded_file = genai.get_file(gemini_file_name)

#     # Build user prompt
#     user_prompt = PEER_EVAL_USER_TEMPLATE.replace(
#         "{company_name}", company_name
#     ).replace(
#         "{ticker}", ticker
#     ).replace(
#         "{schema}", SCHEMA_PEER_EVAL
#     )

#     response = peer_eval_model.generate_content(
#         [uploaded_file, user_prompt],
#         request_options={"timeout": 600},
#         generation_config=genai.GenerationConfig(
#             temperature=0.1,
#             response_mime_type="application/json",
#             max_output_tokens=65536
#         )
#     )

#     # Save output
#     company_dir = INSIGHTS_DIR / symbol
#     company_dir.mkdir(exist_ok=True)

#     save_path = company_dir / f"{symbol}_peereval.json"
#     save_json_report(response.text, save_path)

#     print(f"  Saved → {save_path.name}")
#     return True


# def run_peer_evaluation(symbols):
#     """
#     Phase 2: Run peer evaluation for all symbols.

#     Prerequisites: All individual JSONs must exist.
#     Concatenates once, uploads to Gemini server with 36hr TTL caching.

#     Same processing cadence as Phase 1:
#     - 1 company → 15s → next → ... → after 10th → 2 min rest
#     """

#     progress = load_progress()
#     completed_individual = set(progress["individual_completed"])
#     completed_peer = set(progress["peer_eval_completed"])

#     # Check that all individual analyses exist
#     missing = [s for s in symbols if s not in completed_individual]
#     if missing:
#         print(f"\nPhase 2: Cannot start — {len(missing)} companies missing individual analysis:")
#         for s in missing[:10]:
#             print(f"  - {s}")
#         if len(missing) > 10:
#             print(f"  ... and {len(missing) - 10} more")
#         return False

#     remaining = [s for s in symbols if s not in completed_peer]

#     if not remaining:
#         print("\nPhase 2: All peer evaluations already complete.")
#         return True

#     print(f"\nPhase 2: Peer Evaluation")
#     print(f"  {len(completed_peer)} already done, {len(remaining)} remaining\n")

#     # Step 1: Concatenate (one-time)
#     concatenate_individual_jsons(symbols)

#     # Step 2: Upload or reuse
#     try:
#         gemini_file_name = get_or_upload_concatenated_file()
#     except Exception as e:
#         print(f"\n*** Error uploading concatenated file: {e} ***")
#         save_progress(progress)
#         return False

#     # Step 3: Process each company
#     count_in_batch = 0

#     for i, symbol in enumerate(remaining):
#         print(f"[{len(completed_peer) + 1}/{len(symbols)}] Peer eval for {symbol}...")

#         try:
#             success = process_peer_evaluation(symbol, gemini_file_name)

#             if success:
#                 progress["peer_eval_completed"].append(symbol)
#                 completed_peer.add(symbol)
#                 save_progress(progress)

#         except Exception as e:
#             error_str = str(e)
            
#             # Rate-limit / quota errors
#             if "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower():
#                 print(f"\n*** Rate limit / quota error. Saving progress and stopping. ***")
#                 print(f"*** Error: {e} ***")
#                 save_progress(progress)
#                 return False
                
#             # Transient errors (500 Internal Error, 503, 504)
#             is_transient = ("500" in error_str or "503" in error_str or "504" in error_str
#                             or "timed out" in error_str.lower()
#                             or "DeadlineExceeded" in error_str)
                            
#             if is_transient:
#                 print(f"  ⏳ Transient server error ({error_str[:3]}) for {symbol}, retrying in 60s...")
#                 time.sleep(60)
#                 try:
#                     success = process_peer_evaluation(symbol, gemini_file_name)
#                     if success:
#                         progress["peer_eval_completed"].append(symbol)
#                         completed_peer.add(symbol)
#                         save_progress(progress)
#                         count_in_batch += 1
#                         if i < len(remaining) - 1:
#                             if count_in_batch % 10 == 0:
#                                 print(f"\n  Batch of 10 complete. Resting for 2 minutes...\n")
#                                 time.sleep(120)
#                             else:
#                                 print(f"  Resting for 15 seconds...\n")
#                                 time.sleep(15)
#                         continue
#                 except Exception as retry_e:
#                     print(f"  ⚠ Retry also failed for {symbol} — {retry_e}")

#             # If not transient, or if retry failed, skip or stop
#             print(f"\n*** Unrecoverable Gemini API error for {symbol}. Stopping. ***")
#             print(f"*** Error: {e} ***")
#             save_progress(progress)
#             return False

#         count_in_batch += 1

#         # Check if this is the last symbol
#         if i < len(remaining) - 1:
#             if count_in_batch % 10 == 0:
#                 print(f"\n  Batch of 10 complete. Resting for 2 minutes...\n")
#                 time.sleep(120)
#             else:
#                 print(f"  Resting for 15 seconds...\n")
#                 time.sleep(15)

#     print(f"\nPhase 2 complete. {len(completed_peer)}/{len(symbols)} peer evaluations done.")
#     return True


# # ============================================================
# # 11. LOCAL TEST
# # ============================================================

# if __name__ == "__main__":

#     # Test with a single symbol
#     test_symbols = ["RELIANCE"]

#     print("=== Phase 1: Individual Analysis ===")
#     phase1_ok = run_ai_extraction(test_symbols)

#     if phase1_ok:
#         print("\n=== Phase 2: Peer Evaluation ===")
#         run_peer_evaluation(test_symbols)