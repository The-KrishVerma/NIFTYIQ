# # import yfinance as yf
# # import json
# # from pathlib import Path

# # # Setup directories
# # DATA_DIR = Path("data")
# # QUANT_DIR = DATA_DIR / "quantitative"
# # QUANT_DIR.mkdir(parents=True, exist_ok=True)

# # def fetch_yfinance_metrics(symbols):
# #     """
# #     Fetches hard quantitative data to bypass the LLM.
# #     """
# #     for symbol in symbols:
# #         print(f"Fetching quantitative data for {symbol}...")

# #         # yfinance uses .NS for NSE stocks
# #         ticker = yf.Ticker(f"{symbol}.NS")

# #         try:
# #             info = ticker.info

# #             # Extract only what we need for the relative scoring engine
# #             metrics = {
# #                 "symbol": symbol,
# #                 "pe_ratio": info.get("trailingPE"),
# #                 "forward_pe": info.get("forwardPE"),
# #                 "pb_ratio": info.get("priceToBook"),
# #                 "ev_ebitda": info.get("enterpriseToEbitda"),
# #                 "roe": info.get("returnOnEquity"),
# #                 "revenue_growth": info.get("revenueGrowth")
# #             }

# #             # Save to JSON
# #             save_path = QUANT_DIR / f"{symbol}_quant.json"
# #             with open(save_path, "w") as f:
# #                 json.dump(metrics, f, indent=4)

# #             print(f"Saved metrics to {save_path}")
#     #         completed_symbols.append(symbol)

#     #     except Exception as e:
#     #         print(f"Failed to fetch data for {symbol}: {e}")
#     #         failed_symbols.append(symbol)

#     #     if progress_callback:
#     #         progress_callback(symbol, success=(symbol in completed_symbols))

#     # return completed_symbols, failed_symbols

# # if __name__ == "__main__":
# #     # Test with a few symbols
# #     fetch_yfinance_metrics(["RELIANCE", "TCS"])

# import yfinance as yf
# import json
# from pathlib import Path

# # Setup directories
# DATA_DIR = Path("data")
# QUANT_DIR = DATA_DIR / "quantitative"
# QUANT_DIR.mkdir(parents=True, exist_ok=True)

# def fetch_yfinance_metrics(symbols, progress_callback=None):
#     """
#     Fetches hard quantitative data to bypass the LLM.
#     Returns a tuple (completed_symbols, failed_symbols).
#     """
#     completed_symbols = []
#     failed_symbols = []

#     for symbol in symbols:
#         print(f"Fetching quantitative data for {symbol}...")

#         # yfinance uses .NS for NSE stocks
#         ticker = yf.Ticker(f"{symbol}.NS")

#         try:
#             info = ticker.info

#             # Prepare comprehensive metrics for schema_individual.json
#             metrics = {
#                 "company_metadata": {
#                     "company_name": info.get("longName") or info.get("shortName"),
#                     "ticker": symbol,
#                     "sector": info.get("sector"),
#                     "industry": info.get("industry"),
#                     "market_cap": info.get("marketCap"),
#                     "headquarters": f"{info.get('city', '')}, {info.get('country', '')}".strip(', '),
#                     "currency": info.get("currency") or info.get("financialCurrency", "INR")
#                 },
#                 "financial_metrics": {
#                     "revenue": info.get("totalRevenue"),
#                     "net_income": info.get("netIncomeToCommon"),
#                     "operating_margin": info.get("operatingMargins"),
#                     "roe": info.get("returnOnEquity"),
#                     "debt_to_equity": info.get("debtToEquity"),
#                 },
#                 "valuation_metrics": {
#                     "pe_ratio": info.get("trailingPE"),
#                     "pb_ratio": info.get("priceToBook"),
#                     "ev_ebitda": info.get("enterpriseToEbitda"),
#                     "peg_ratio": info.get("pegRatio") or info.get("trailingPegRatio")
#                 }
#             }

#             # Additional logic to calculate missing financial metrics
#             try:
#                 financials = ticker.financials
#                 cashflow = ticker.cashflow
#                 balance_sheet = ticker.balance_sheet

#                 # Free Cash Flow = Operating Cash Flow - Capital Expenditure
#                 if not cashflow.empty:
#                     fcf = cashflow.loc['Free Cash Flow'].iloc[0] if 'Free Cash Flow' in cashflow.index else None
#                     if fcf is None and 'Operating Cash Flow' in cashflow.index and 'Capital Expenditure' in cashflow.index:
#                          fcf = cashflow.loc['Operating Cash Flow'].iloc[0] + cashflow.loc['Capital Expenditure'].iloc[0] # CapEx is usually negative
#                     metrics["financial_metrics"]["free_cash_flow"] = fcf

#                 # Interest Coverage = EBIT / Interest Expense
#                 if not financials.empty:
#                     ebit = financials.loc['EBIT'].iloc[0] if 'EBIT' in financials.index else None
#                     interest = financials.loc['Interest Expense'].iloc[0] if 'Interest Expense' in financials.index else None
#                     if ebit is not None and interest is not None and interest != 0:
#                         metrics["financial_metrics"]["interest_coverage"] = abs(ebit / interest)

#                 # ROIC = NOPAT / Invested Capital
#                 if not financials.empty and not balance_sheet.empty:
#                     net_income = financials.loc['Net Income'].iloc[0] if 'Net Income' in financials.index else 0
#                     tax_provision = financials.loc['Tax Provision'].iloc[0] if 'Tax Provision' in financials.index else 0
#                     pretax_income = financials.loc['Pretax Income'].iloc[0] if 'Pretax Income' in financials.index else 1 # Avoid div zero

#                     effective_tax_rate = tax_provision / pretax_income if pretax_income != 0 else 0
#                     ebit = financials.loc['EBIT'].iloc[0] if 'EBIT' in financials.index else 0
#                     nopat = ebit * (1 - effective_tax_rate)

#                     total_debt = balance_sheet.loc['Total Debt'].iloc[0] if 'Total Debt' in balance_sheet.index else 0
#                     total_equity = balance_sheet.loc['Stockholders Equity'].iloc[0] if 'Stockholders Equity' in balance_sheet.index else 0
#                     cash = balance_sheet.loc['Cash And Cash Equivalents'].iloc[0] if 'Cash And Cash Equivalents' in balance_sheet.index else 0

#                     invested_capital = (total_debt + total_equity) - cash
#                     if invested_capital > 0:
#                         metrics["financial_metrics"]["roic"] = nopat / invested_capital

#             except Exception as calc_err:
#                 print(f"    Warning: Could not calculate advanced financial metrics for {symbol}: {calc_err}")

#             # Save to JSON
#             save_path = QUANT_DIR / f"{symbol}_quant.json"
#             with open(save_path, "w") as f:
#                 json.dump(metrics, f, indent=4)

#             print(f"Saved metrics to {save_path}")

#         except Exception as e:
#             print(f"Failed to fetch data for {symbol}: {e}")

# if __name__ == "__main__":
#     # Test with a few symbols
#     fetch_yfinance_metrics(["RELIANCE", "TCS"])

# import yfinance as yf
# import json
# from pathlib import Path

# # Setup directories
# DATA_DIR = Path("data")
# QUANT_DIR = DATA_DIR / "quantitative"
# QUANT_DIR.mkdir(parents=True, exist_ok=True)

# def fetch_yfinance_metrics(symbols):
#     """
#     Fetches hard quantitative data to bypass the LLM.
#     """
#     for symbol in symbols:
#         print(f"Fetching quantitative data for {symbol}...")

#         # yfinance uses .NS for NSE stocks
#         ticker = yf.Ticker(f"{symbol}.NS")

#         try:
#             info = ticker.info

#             # Extract only what we need for the relative scoring engine
#             metrics = {
#                 "symbol": symbol,
#                 "pe_ratio": info.get("trailingPE"),
#                 "forward_pe": info.get("forwardPE"),
#                 "pb_ratio": info.get("priceToBook"),
#                 "ev_ebitda": info.get("enterpriseToEbitda"),
#                 "roe": info.get("returnOnEquity"),
#                 "revenue_growth": info.get("revenueGrowth")
#             }

#             # Save to JSON
#             save_path = QUANT_DIR / f"{symbol}_quant.json"
#             with open(save_path, "w") as f:
#                 json.dump(metrics, f, indent=4)

#             print(f"Saved metrics to {save_path}")
#         completed_symbols.append(symbol)

#     except Exception as e:
#         print(f"Failed to fetch data for {symbol}: {e}")
#         failed_symbols.append(symbol)

#     if progress_callback:
#         progress_callback(symbol, success=(symbol in completed_symbols))

# return completed_symbols, failed_symbols

# if __name__ == "__main__":
#     # Test with a few symbols
#     fetch_yfinance_metrics(["RELIANCE", "TCS"])

import yfinance as yf
import json
import pandas as pd
import requests
import os
import math
from bs4 import BeautifulSoup
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables (for Screener cookie)
load_dotenv()

# Setup directories
DATA_DIR = Path("data")
QUANT_DIR = DATA_DIR / "quantitative"
QUANT_DIR.mkdir(parents=True, exist_ok=True)


def safe_get(df, row_name, col_index, default=None):
    """Safely get a value from a DataFrame."""
    try:
        if row_name in df.index and len(df.columns) > col_index:
            val = df.loc[row_name].iloc[col_index]
            return val if not pd.isna(val) else default
    except Exception:
        pass
    return default


def calculate_cagr(start_val, end_val, years):
    """Calculates Compound Annual Growth Rate."""
    if start_val and end_val and start_val > 0 and end_val > 0 and years > 0:
        return (end_val / start_val) ** (1 / years) - 1
    return None


def calculate_return(hist_df, days_ago):
    """Calculates stock return over a specific number of trading days."""
    try:
        if len(hist_df) > days_ago:
            current_price = hist_df['Close'].iloc[-1]
            past_price = hist_df['Close'].iloc[-(days_ago + 1)]
            if past_price > 0:
                return (current_price - past_price) / past_price
    except Exception:
        pass
    return None


def fetch_screener_peers_data(symbol):
    """
    Scrapes the customized 'Peers' table from Screener.in using a session cookie.
    """
    session_id = os.getenv("SCREENER_SESSION_ID")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    cookies = {"sessionid": session_id} if session_id else {}
    if not session_id:
        print(
            "  [WARNING] No SCREENER_SESSION_ID found in .env. Only default columns will be fetched.")

    url = f"https://www.screener.in/company/{symbol}/consolidated/"
    peer_data = {}

    try:
        response = requests.get(url, headers=headers,
                                cookies=cookies, timeout=10)
        if response.status_code == 404:
            url = f"https://www.screener.in/company/{symbol}/"
            response = requests.get(
                url, headers=headers, cookies=cookies, timeout=10)

        if response.status_code != 200:
            return peer_data

        soup = BeautifulSoup(response.text, 'html.parser')

        peers_section = soup.find('section', id='peers')
        if not peers_section:
            return peer_data

        table = peers_section.find('table', class_='data-table')
        if not table:
            return peer_data

        thead = table.find('thead')
        headers_row = thead.find_all('th')
        col_names = [th.text.strip().lower() for th in headers_row]

        tbody = table.find('tbody')
        rows = tbody.find_all('tr')

        target_row = None
        for row in rows:
            name_col = row.find('td', class_='text')
            if name_col and name_col.find('a') and symbol.lower() in name_col.find('a')['href'].lower():
                target_row = row
                break

        if target_row:
            cols = target_row.find_all('td')
            for i, col in enumerate(cols):
                if i < len(col_names):
                    header = col_names[i]
                    val_str = col.text.strip().replace(',', '').replace('%', '')
                    try:
                        peer_data[header] = float(val_str)
                    except ValueError:
                        peer_data[header] = val_str

    except Exception as e:
        print(f"  [WARNING] Screener peers fetch error for {symbol}: {e}")

    return peer_data


def get_val(yf_val, s_data, screener_keys):
    """
    Prioritizes Yahoo Finance (yf_val). If it is missing, None, or NaN,
    it falls back to fuzzy matching the Screener data.
    """
    # 1. Try Yahoo Finance First
    if yf_val is not None:
        if isinstance(yf_val, float) and math.isnan(yf_val):
            pass  # It's NaN, fall through to Screener
        else:
            return yf_val

    # 2. Fallback to Screener
    for key in screener_keys:
        for p_key, p_val in s_data.items():
            if key.lower() in p_key:
                return p_val

    return None


def fetch_yfinance_metrics(symbols, progress_callback=None):
    completed_symbols = []
    failed_symbols = []

    for symbol in symbols:
        print(f"Fetching quantitative data for {symbol}...")

        s_data = fetch_screener_peers_data(symbol)

        ticker = yf.Ticker(f"{symbol}.NS")
        info = {}
        try:
            info = ticker.info
        except Exception:
            pass

        try:
            financials = ticker.financials
            q_financials = ticker.quarterly_financials
            balance_sheet = ticker.balance_sheet
            hist = ticker.history(period="6y")

            # Helper Calculations for YF
            sales_latest_qtr = safe_get(q_financials, 'Total Revenue', 0)
            pat_latest_qtr = safe_get(q_financials, 'Net Income', 0)

            fcf = info.get("freeCashflow")
            if not fcf and not ticker.cashflow.empty:
                op_cash = safe_get(ticker.cashflow, 'Operating Cash Flow', 0)
                cap_ex = safe_get(ticker.cashflow, 'Capital Expenditure', 0)
                if op_cash is not None and cap_ex is not None:
                    fcf = op_cash + cap_ex
            price_to_fcf = (info.get(
                "marketCap") / fcf) if fcf and fcf > 0 and info.get("marketCap") else None

            pe = info.get("trailingPE")
            earnings_yield = (1 / pe) if pe and pe > 0 else None

            ebit = safe_get(financials, 'EBIT', 0)
            total_assets = safe_get(balance_sheet, 'Total Assets', 0)
            current_liabilities = safe_get(
                balance_sheet, 'Current Liabilities', 0)
            roce = (ebit / (total_assets - current_liabilities)
                    ) if ebit and total_assets and current_liabilities and (total_assets - current_liabilities) > 0 else None

            interest_expense = safe_get(financials, 'Interest Expense', 0)
            interest_coverage = abs(
                ebit / interest_expense) if ebit and interest_expense and interest_expense != 0 else None

            sales_yr0, sales_yr3, sales_yr5 = safe_get(financials, 'Total Revenue', 0), safe_get(
                financials, 'Total Revenue', 2), safe_get(financials, 'Total Revenue', 4)
            pat_yr0, pat_yr3, pat_yr5 = safe_get(financials, 'Net Income', 0), safe_get(
                financials, 'Net Income', 2), safe_get(financials, 'Net Income', 4)

            sales_growth_3y = calculate_cagr(sales_yr3, sales_yr0, 3)
            sales_growth_5y = calculate_cagr(sales_yr5, sales_yr0, 5)
            pat_growth_3y = calculate_cagr(pat_yr3, pat_yr0, 3)
            pat_growth_5y = calculate_cagr(pat_yr5, pat_yr0, 5)

            # Format YF Insider holding to percentage
            yf_promoter = (info.get("heldPercentInsiders") *
                           100) if info.get("heldPercentInsiders") is not None else None

            try:
                info = ticker.info
            except Exception:
                pass

            # ==========================================
            # NEW: FETCH TOP 3 NEWS HEADLINES
            # ==========================================
            top_headlines = []
            try:
                raw_news = ticker.news
                if raw_news:
                    print(
                        f"    ✓ News available for {symbol}: {len(raw_news)} articles found")
                    # Grab only the first 3 articles
                    for article in raw_news[:3]:
                        content = article.get("content", article)

                        # 1. Extract Title
                        title = content.get("title", "No Title")

                        # 2. Extract Publisher safely
                        provider = content.get("provider", {})
                        if isinstance(provider, dict):
                            publisher = provider.get(
                                "displayName", content.get("publisher", "Unknown"))
                        else:
                            publisher = content.get("publisher", "Unknown")

                        # 3. Extract Link safely
                        canonical = content.get("canonicalUrl", {})
                        if isinstance(canonical, dict):
                            link = canonical.get("url", content.get(
                                "url", content.get("link", "#")))
                        else:
                            link = content.get("url", content.get("link", "#"))

                        top_headlines.append({
                            "title": title,
                            "publisher": publisher,
                            "link": link
                        })
                else:
                    print(
                        f"    ℹ No news data available for {symbol} (ticker.news returned empty/None)")
            except AttributeError as ae:
                print(
                    f"    ℹ News not supported for {symbol}: yfinance ticker does not have news for Indian stocks")
            except Exception as e:
                print(
                    f"    ⚠ Error fetching news for {symbol}: {type(e).__name__}: {e}")
            # ==========================================

            metrics = {
                "symbol": symbol,
                "Recent": {
                    "Sales": get_val(info.get("totalRevenue"), s_data, ["sales"]),
                    "OPM": get_val(info.get("operatingMargins"), s_data, ["opm"]),
                    "Profit after tax": get_val(info.get("netIncomeToCommon"), s_data, ["profit after tax", "net profit"]),
                    "Market Capitalization": get_val(info.get("marketCap"), s_data, ["mar cap", "market cap"]),
                    "Sales latest quarter": get_val(sales_latest_qtr, s_data, ["sales qtr", "sales latest quarter"]),
                    "Profit after tax latest quarter": get_val(pat_latest_qtr, s_data, ["np qtr", "profit after tax latest"]),
                    "YOY Quarterly sales growth": get_val(info.get("revenueGrowth"), s_data, ["qtr sales var", "yoy quarterly sales growth"]),
                    "YOY Quarterly profit growth": get_val(info.get("earningsGrowth"), s_data, ["qtr profit var", "yoy quarterly profit growth"]),
                    "Price to Earning": get_val(pe, s_data, ["p/e", "price to earning"]),
                    "Dividend yield": get_val(info.get("dividendYield"), s_data, ["div yld", "dividend yield"]),
                    "Price to book value": get_val(info.get("priceToBook"), s_data, ["price to book"]),
                    "Return on capital employed": get_val(roce, s_data, ["roce", "return on capital employed"]),
                    "Return on assets": get_val(info.get("returnOnAssets"), s_data, ["roa", "return on assets"]),
                    "Debt to equity": get_val(info.get("debtToEquity"), s_data, ["debt to equity"]),
                    "Return on equity": get_val(info.get("returnOnEquity"), s_data, ["roe", "return on equity"]),
                    "EPS": get_val(info.get("trailingEps"), s_data, ["eps"]),
                    "Debt": get_val(info.get("totalDebt"), s_data, ["debt"]),
                    "Promoter holding": get_val(yf_promoter, s_data, ["promoter holding"]),
                    # YF doesn't track this accurately
                    "Change in promoter holding": get_val(None, s_data, ["change in prom hold", "change in promoter"]),
                    "Earnings yield": get_val(earnings_yield, s_data, ["earnings yield"]),
                    # YF doesn't track this accurately
                    "Pledged percentage": get_val(None, s_data, ["pledged", "promoter pledge"]),
                    # YF doesn't track this accurately
                    "Industry PE": get_val(None, s_data, ["industry pe"]),
                    "Sales growth": get_val(info.get("revenueGrowth"), s_data, ["sales growth"]),
                    "Profit growth": get_val(info.get("earningsGrowth"), s_data, ["profit growth"]),
                    "Current price": get_val(info.get("currentPrice"), s_data, ["cmp", "current price"]),
                    "Price to Sales": get_val(info.get("priceToSalesTrailing12Months"), s_data, ["price to sales"]),
                    "Price to Free Cash Flow": get_val(price_to_fcf, s_data, ["price to free cash flow"]),
                    "EV": get_val(info.get("enterpriseValue"), s_data, ["ev", "enterprise value"]),
                    "EBITDA": get_val(info.get("ebitda"), s_data, ["ebitda"]),
                    "Enterprise Value": get_val(info.get("enterpriseValue"), s_data, ["enterprise value", "ev"]),
                    "Current ratio": get_val(info.get("currentRatio"), s_data, ["current ratio"]),
                    "Interest Coverage Ratio": get_val(interest_coverage, s_data, ["interest coverage"]),
                    "PEG Ratio": get_val(info.get("pegRatio"), s_data, ["peg ratio"]),
                    "Return over 3months": get_val(calculate_return(hist, 63), s_data, ["return over 3months", "return 3mos"]),
                    "Return over 6months": get_val(calculate_return(hist, 126), s_data, ["return over 6months", "return 6mos"])
                },
                "Historical": {
                    "Sales growth 3Years": get_val(sales_growth_3y, s_data, ["sales growth 3years", "sales growth 3"]),
                    "Sales growth 5Years": get_val(sales_growth_5y, s_data, ["sales growth 5years", "sales growth 5"]),
                    "Profit growth 3Years": get_val(pat_growth_3y, s_data, ["profit growth 3years", "profit growth 3"]),
                    "Profit growth 5Years": get_val(pat_growth_5y, s_data, ["profit growth 5years", "profit growth 5"]),
                    "Average return on equity 5Years": get_val(None, s_data, ["average return on equity 5", "roe 5"]),
                    "Average return on equity 3Years": get_val(None, s_data, ["average return on equity 3", "roe 3"]),
                    "Return over 1year": get_val(calculate_return(hist, 252), s_data, ["return over 1year", "return 1yr"]),
                    "Return over 3years": get_val(calculate_return(hist, 756), s_data, ["return over 3years", "return 3yr"]),
                    "Return over 5years": get_val(calculate_return(hist, 1260), s_data, ["return over 5years", "return 5yr"])
                },
                "Recent_News": top_headlines
            }

            save_path = QUANT_DIR / f"{symbol}_quant.json"
            with open(save_path, "w") as f:
                json.dump(metrics, f, indent=4)

            print(f"Saved metrics to {save_path}")
            completed_symbols.append(symbol)

        except Exception as e:
            print(f"Failed to fetch data for {symbol}: {e}")
            failed_symbols.append(symbol)

        if progress_callback:
            progress_callback(symbol, success=(symbol in completed_symbols))

    return completed_symbols, failed_symbols


if __name__ == "__main__":
    from symbols import get_nifty100_symbols
    fetch_yfinance_metrics(get_nifty100_symbols())
