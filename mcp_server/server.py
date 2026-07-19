import sys
import os
import json
import re
import threading
from pathlib import Path
from datetime import datetime
from typing import Any, List, Optional, Dict
from pymongo import MongoClient
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# 1. Setup path to parent directory to allow imports from the main project
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# 2. Load Environment Variables
# MCP servers run in a special environment, so we must load the full path to .env
load_dotenv(dotenv_path=BASE_DIR / ".env")
MONGO_URI = os.getenv("MONGO_URI")

# 3. Initialize MCP Server (V2 Refresh)
mcp = FastMCP("NIFTYIQPlus")

# 4. Connect to MongoDB
try:
    client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
    # We use 'insightledger' as the primary database name consistent with api.py
    db = client['insightledger']
except Exception as e:
    # Fail-safe: db will be None and tools will return error messages
    db = None

# ============================
# HELPER FUNCTIONS
# ============================

def get_json_field(doc: Dict[str, Any], *keys: str) -> Any:
    """Safely traverses nested dictionaries."""
    temp = doc
    for key in keys:
        if isinstance(temp, dict) and key in temp:
            temp = temp[key]
        else:
            return None
    return temp

# ============================
# 📋 LISTING & DISCOVERY
# ============================

@mcp.tool()
def get_all_companies() -> str:
    """Returns a full list of all tracked tickers with their industry and current Z-Score."""
    if db is None: return "Error: MongoDB connection failed."
    companies = list(db.companies.find({}, {"_id": 0, "symbol": 1, "industry": 1, "z_score": 1}))
    return json.dumps(sorted(companies, key=lambda x: x['symbol']), indent=2)

@mcp.tool()
def get_total_stats() -> str:
    """Returns the total number of companies and sectors currently tracked in the NIFTYIQ index."""
    if db is None: return "Error: MongoDB connection failed."
    count = db.companies.count_documents({})
    industries = len(db.companies.distinct("industry"))
    return json.dumps({"total_companies": count, "total_industries": industries}, indent=2)

@mcp.tool()
def search_ticker(query: str) -> str:
    """
    Performs a fuzzy search for a company by its ticker symbol or partial name.
    If the ticker is not found among analyzed companies, PROMPT the user to run 'trigger_analysis'.
    """
    if db is None: return "Error: MongoDB connection failed."
    regex = re.compile(re.escape(query.strip()), re.IGNORECASE)
    matches = list(db.companies.find(
        {"$or": [{"symbol": regex}, {"industry": regex}]},
        {"_id": 0, "symbol": 1, "industry": 1}
    ).limit(5))
    
    if not matches:
        return f"No analyzed companies matching '{query}' were found. [ACTION]: Ask the user if they want to run 'trigger_analysis({query})' in the background."
    
    return json.dumps(matches, indent=2)

# ============================
# 🏢 COMPANY OVERVIEW
# ============================

@mcp.tool()
def get_company_overview(symbol: str) -> str:
    """
    Returns the business-model summary, geography, and revenue drivers for a ticker.
    If 'Ticker NOT found' is returned, you MUST ask the user: 
    'I don't have analysis for {symbol} yet. Should I trigger a background run? (Yes/No)'
    """
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "company_overview": 1, "business_overview": 1, "industry": 1})
    if not doc: 
        return f"Ticker {sym} NOT found in database. [INSTRUCTION]: Inform user and offer to run 'trigger_analysis'."
    return json.dumps(doc, indent=2)

@mcp.tool()
def get_shareholding_pattern(symbol: str) -> str:
    """Returns the latest shareholding breakdown (Promoter vs Public) and top shareholders."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "stockholder_details": 1})
    if not doc: return f"Ticker {sym} not found."
    return json.dumps(doc.get("stockholder_details", {}), indent=2)

# ============================
# 📊 FINANCIALS & FUNDAMENTALS
# ============================

@mcp.tool()
def get_financial_ratios(symbol: str) -> str:
    """Returns core valuation and efficiency ratios: P/E, P/B, ROE, ROCE, and Debt-to-Equity."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "quantitative_data.Recent": 1, "fundamental_score": 1})
    if not doc: return f"Ticker {sym} not found."
    
    recent = get_json_field(doc, "quantitative_data", "Recent") or {}
    ratios = {
        "P/E Ratio": recent.get("Price to Earning"),
        "P/B Ratio": recent.get("Price to book value"),
        "ROE (%)": f"{recent.get('Return on equity', 0) * 100:.2f}%" if recent.get('Return on equity') else None,
        "ROCE (%)": f"{recent.get('Return on capital employed', 0) * 100:.2f}%" if recent.get('Return on capital employed') else None,
        "Debt-to-Equity": recent.get("Debt to equity"),
        "Dividend Yield": f"{recent.get('Dividend yield', 0)}%",
        "Fundamental Score": f"{doc.get('fundamental_score')}%"
    }
    return json.dumps(ratios, indent=2)

@mcp.tool()
def get_income_statement_summary(symbol: str) -> str:
    """Returns a summary of Sales, Profit After Tax (PAT), and OPM."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "quantitative_data.Recent": 1})
    if not doc: return f"Ticker {sym} not found."
    
    recent = get_json_field(doc, "quantitative_data", "Recent") or {}
    statement = {
        "Annual Sales": recent.get("Sales"),
        "Annual Profit (PAT)": recent.get("Profit after tax"),
        "OPM (%)": f"{recent.get('OPM', 0) * 100:.2f}%" if recent.get('OPM') else None,
        "Quarterly Sales Latest": recent.get("Sales latest quarter"),
        "Quarterly Profit Latest": recent.get("Profit after tax latest quarter")
    }
    return json.dumps(statement, indent=2)

@mcp.tool()
def get_growth_metrics(symbol: str) -> str:
    """Returns 3-year and 5-year historical growth trajectories for sales and profit."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "quantitative_data.Historical": 1})
    if not doc: return f"Ticker {sym} not found."
    
    hist = get_json_field(doc, "quantitative_data", "Historical") or {}
    return json.dumps(hist, indent=2)

@mcp.tool()
def get_valuation_metrics(symbol: str) -> str:
    """Returns core total-value metrics like EV (Enterprise Value) and Market Capitalization."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "quantitative_data.Recent": 1})
    if not doc: return f"Ticker {sym} not found."
    
    recent = get_json_field(doc, "quantitative_data", "Recent") or {}
    valuation = {
        "Market Cap": recent.get("Market Capitalization"),
        "Enterprise Value (EV)": recent.get("EV") or recent.get("Enterprise Value"),
        "EBITDA": recent.get("EBITDA"),
        "Debt": recent.get("Debt")
    }
    return json.dumps(valuation, indent=2)

# ============================
# 🤖 AI & SENTIMENT
# ============================

@mcp.tool()
def get_sentiment_signals(symbol: str) -> str:
    """Returns AI-extracted qualitative signals: Business Quality (BQ), Cyclicality (CY), and Governance (BG)."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    keys = ["business_quality_signals", "cyclicality_signals", "return_profile_signals", "governance_signals"]
    doc = db.companies.find_one({"symbol": sym}, {k: 1 for k in keys})
    if not doc: return f"Ticker {sym} not found."
    
    signals = {
        "Business Quality (BQ)": doc.get("business_quality_signals", {}).get("BQ"),
        "Cyclicality (CY)": doc.get("cyclicality_signals", {}).get("CY"),
        "Return Profile (RP)": doc.get("return_profile_signals", {}).get("RP"),
        "Governance (BG)": doc.get("governance_signals", {}).get("BG")
    }
    return json.dumps(signals, indent=2)

@mcp.tool()
def get_red_flags(symbol: str) -> str:
    """Returns AI-detected risks and red flags (Operational, Financial, Regulatory)."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "risk_analysis": 1})
    if not doc: return f"Ticker {sym} not found."
    return json.dumps(doc.get("risk_analysis", {}), indent=2)

@mcp.tool()
def get_pros_and_cons(symbol: str) -> str:
    """Returns the dedicated 'Pros' and 'Cons' for a company extracted from annual reports."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "pros_and_cons": 1})
    if not doc: return f"Ticker {sym} not found."
    return json.dumps(doc.get("pros_and_cons", {}), indent=2)

@mcp.tool()
def get_growth_catalysts(symbol: str) -> str:
    """Returns AI-detected catalysts, structural growth drivers, and 'Pros' for a company."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    doc = db.companies.find_one({"symbol": sym}, {"_id": 0, "pros_and_cons.pros": 1, "return_profile_signals.structural_growth_drivers": 1})
    if not doc: return f"Ticker {sym} not found."
    return json.dumps({
        "Catalysts": doc.get("pros_and_cons", {}).get("pros", []),
        "Growth_Drivers": doc.get("return_profile_signals", {}).get("structural_growth_drivers", [])
    }, indent=2)

# ============================
# 🔍 PEER & INDUSTRY
# ============================

@mcp.tool()
def get_industry_leaderboard(sector: str) -> str:
    """Returns the full ranked list of companies in an industry sorted by Z-Score."""
    if db is None: return "Error: MongoDB connection failed."
    regex = re.compile(f"^{re.escape(sector.strip())}$", re.IGNORECASE)
    companies = list(db.companies.find({"industry": regex}, {"_id": 0, "symbol": 1, "z_score": 1, "fundamental_score": 1}).sort("z_score", -1))
    return json.dumps(companies, indent=2)

@mcp.tool()
def get_peer_comparison(symbol: str) -> str:
    """Returns a side-by-side leaderboard of a company and its direct industry rivals."""
    if db is None: return "Error: MongoDB connection failed."
    sym = symbol.upper().strip()
    subject = db.companies.find_one({"symbol": sym}, {"industry": 1})
    if not subject or not subject.get("industry"): return f"Ticker {sym} has no industry data."
    
    industry = subject["industry"]
    # Truncated to top 6 to keep context focused
    peers = list(db.companies.find({"industry": industry}, {"_id": 0, "symbol": 1, "z_score": 1, "fundamental_score": 1}).sort("z_score", -1).limit(6))
    return json.dumps({"industry": industry, "peers": peers}, indent=2)

# ============================
# ⚙️ SYSTEM & STATUS
# ============================

@mcp.tool()
def get_analysis_status() -> str:
    """Returns real-time background analysis progress from progress.json."""
    progress_file = BASE_DIR / "data" / "progress.json"
    if not progress_file.exists(): return "No active pipeline progress found."
    try:
        mtime = datetime.fromtimestamp(os.path.getmtime(progress_file)).strftime('%Y-%m-%d %H:%M:%S')
        with open(progress_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return json.dumps({"last_sync": mtime, "progress": data}, indent=2)
    except Exception as e:
        return f"Error reading progress: {str(e)}"

@mcp.tool()
def trigger_analysis(ticker: str) -> str:
    """
    Triggers the 9-layer analysis pipeline (~3-5 mins) in the BACKGROUND.
    This tool returns immediately. Monitor status using 'get_analysis_status'.
    """
    from pipeline import run_pipeline
    sym = ticker.upper().strip()
    
    def _background_run(symbol: str):
        try:
            print(f"🚀 BACKGROUND: Starting pipeline for {symbol}")
            run_pipeline(manual_symbol=symbol)
            print(f"✅ BACKGROUND: Pipeline completed for {symbol}")
        except Exception as e:
            print(f"❌ BACKGROUND: Failed for {symbol}: {str(e)}")

    # Launch as a daemon thread to prevent MCP UI timeout
    thread = threading.Thread(target=_background_run, args=(sym,), daemon=True)
    thread.start()
    
    return (f"🚀 Pipeline for {sym} has been triggered in the BACKGROUND. "
            f"It will take 3-5 minutes. Please use 'get_analysis_status' "
            f"to monitor progress. Once finished, its scores will be available.")

@mcp.tool()
def get_mcp_status() -> str:
    """Diagnostics tool to verify server version and database connection status."""
    return json.dumps({
        "version": "v5.3-ProsCons",
        "database": "Connected" if db is not None else "Disconnected",
        "server_name": "NIFTYIQPlus"
    }, indent=2)

if __name__ == "__main__":
    mcp.run()
