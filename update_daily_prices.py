import json
import yfinance as yf
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INSIGHTS_DIR = BASE_DIR / "data" / "qualitative_insights" / "qualitative_insights"

def run_price_update(symbols):
    print("Fetching real-time daily prices and % changes...")
    
    updated_count = 0
    for symbol in symbols:
        try:
            qual_file = INSIGHTS_DIR / symbol / f"{symbol}_individual.json"
            if not qual_file.exists():
                qual_file = BASE_DIR / "data" / "qualitative_insights" / symbol / f"{symbol}_individual.json" # fallback
            
            if not qual_file.exists():
                continue
                
            ticker = yf.Ticker(f"{symbol}.NS")
            hist = ticker.history(period="2d")
            
            if len(hist) >= 1:
                current_price = hist['Close'].iloc[-1]
                
                pct_change = 0.0
                if len(hist) >= 2:
                    prev_close = hist['Close'].iloc[-2]
                    if prev_close > 0:
                        pct_change = ((current_price - prev_close) / prev_close) * 100
                
                # Update JSON
                with open(qual_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                data["daily_market_data"] = {
                    "current_price": round(float(current_price), 2),
                    "percentage_change_today": round(float(pct_change), 2)
                }
                
                with open(qual_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                    
                updated_count += 1
                
        except Exception as e:
            print(f"  [!] Failed to fetch daily price for {symbol}: {e}")
            
    print(f"[+] Successfully updated daily market data for {updated_count} companies.")

if __name__ == "__main__":
    from symbols import get_nifty100_symbols
    run_price_update(get_nifty100_symbols())
