# import requests
# import os
# import json
# import time
# from pathlib import Path

# # -----------------------------
# # CONFIGURATION
# # -----------------------------

# SYMBOLS = [
#     "RELIANCE",
#     "TCS",
#     "INFY",
#     "HDFCBANK",
#     "ICICIBANK",
#     "ITC",
#     "SBIN",
#     "LT",
#     "HINDUNILVR",
#     "KOTAKBANK"
# ]

# BASE_URL = "https://www.nseindia.com"
# API_URL = "https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi"

# HEADERS = {
#     "User-Agent": "Mozilla/5.0",
#     "Accept-Language": "en-US,en;q=0.9",
#     "Referer": "https://www.nseindia.com/"
# }

# DATA_DIR = Path("data")
# JSON_DIR = DATA_DIR / "raw_json"
# REPORTS_DIR = DATA_DIR / "reports"

# JSON_DIR.mkdir(parents=True, exist_ok=True)
# REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# # -----------------------------
# # CREATE NSE SESSION
# # -----------------------------

# session = requests.Session()
# session.headers.update(HEADERS)

# # Hit homepage first to generate cookies
# session.get(BASE_URL)


# # -----------------------------
# # FUNCTION TO FETCH REPORT JSON
# # -----------------------------

# def fetch_annual_reports(symbol):
#     params = {
#         "functionName": "getCorpAnnualReport",
#         "symbol": symbol,
#         "marketApiType": "equities",
#         "noOfRecords": 6
#     }

#     response = session.get(API_URL, params=params)

#     if response.status_code == 200:
#         return response.json()
#     else:
#         print(f"[ERROR] {symbol} → Status Code: {response.status_code}")
#         return None


# # -----------------------------
# # FUNCTION TO DOWNLOAD PDF
# # -----------------------------

# def download_file(url, save_path):
#     try:
#         response = session.get(url)
#         if response.status_code == 200:
#             with open(save_path, "wb") as f:
#                 f.write(response.content)
#             print(f"Downloaded → {save_path.name}")
#         else:
#             print(f"Failed to download: {url}")
#     except Exception as e:
#         print(f"Download error: {e}")


# # -----------------------------
# # MAIN EXECUTION
# # -----------------------------

# for symbol in SYMBOLS:
#     print(f"\nProcessing {symbol}...")

#     json_data = fetch_annual_reports(symbol)

#     if not json_data:
#         continue

#     # Save raw JSON
#     json_path = JSON_DIR / f"{symbol}.json"
#     with open(json_path, "w") as f:
#         json.dump(json_data, f, indent=4)

#     print(f"Saved JSON for {symbol}")

#     # Create company folder
#     company_folder = REPORTS_DIR / symbol
#     company_folder.mkdir(exist_ok=True)

#     # Extract and download files
#     # json_data is already a list
#     reports = json_data

#     if isinstance(reports, list) and len(reports) > 0:
#         for report in reports:
#             file_url = report.get("fileName")

#             if file_url and file_url.startswith("http"):
#                 filename = file_url.split("/")[-1]
#                 save_path = company_folder / filename

#                 if not save_path.exists():
#                     download_file(file_url, save_path)
#                 else:
#                     print(f"Already exists → {filename}")
#     else:
#         print(f"No reports found for {symbol}")


#     # Rate limiting
#     time.sleep(2)

# print("\nDone.")

# scraper.py

import requests
import json
import time
from pathlib import Path

BASE_URL = "https://www.nseindia.com"
API_URL = "https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Referer": "https://www.nseindia.com/"
}

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
JSON_DIR = DATA_DIR / "raw_json"
REPORTS_DIR = DATA_DIR / "reports"

JSON_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# CREATE SESSION
# -----------------------------

session = requests.Session()
session.headers.update(HEADERS)
session.get(BASE_URL)


# -----------------------------
# FETCH REPORT JSON
# -----------------------------

def fetch_annual_reports(symbol):
    params = {
        "functionName": "getCorpAnnualReport",
        "symbol": symbol,
        "marketApiType": "equities",
        "noOfRecords": 2
    }

    response = session.get(API_URL, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"[ERROR] {symbol} → {response.status_code}")
        return None


# -----------------------------
# DOWNLOAD FILE
# -----------------------------

def download_file(url, save_path):
    try:
        response = session.get(url)
        if response.status_code == 200:
            with open(save_path, "wb") as f:
                f.write(response.content)
            print(f"Downloaded → {save_path.name}")
        else:
            print(f"Failed to download: {url}")
    except Exception as e:
        print(f"Download error: {e}")


# -----------------------------
# MAIN SCRAPER FUNCTION
# -----------------------------

def run_scraper(symbols):
    for symbol in symbols:
        print(f"\nProcessing {symbol}...")

        json_data = fetch_annual_reports(symbol)

        if not json_data:
            continue

        json_path = JSON_DIR / f"{symbol}.json"
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=4)

        print(f"Saved JSON for {symbol}")

        company_folder = REPORTS_DIR / symbol
        company_folder.mkdir(exist_ok=True)

        reports = json_data

        if isinstance(reports, list):
            for report in reports:
                file_url = report.get("fileName")

                if file_url and file_url.startswith("http"):
                    filename = file_url.split("/")[-1]
                    save_path = company_folder / filename

                    if not save_path.exists():
                        download_file(file_url, save_path)
                    else:
                        print(f"Already exists → {filename}")

        time.sleep(2)


if __name__ == "__main__":
    from symbols import get_nifty100_symbols
    run_scraper(get_nifty100_symbols())
