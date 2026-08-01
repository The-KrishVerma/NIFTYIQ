def get_nifty100_symbols():
    symbols = [
        "RELIANCE", "TCS", "HDFCBANK", "BHARTIARTL", "ICICIBANK",
        "SBIN", "HINDUNILVR", "ITC", "LT",
        "AXISBANK", "MARUTI", "SUNPHARMA", "TITAN",
        "BAJFINANCE", "ADANIENT", "ADANIPORTS", "ULTRACEMCO", "WIPRO",
        "NTPC", "POWERGRID", "HCLTECH", "ONGC", "COALINDIA",
        "NESTLEIND", "BAJAJFINSV", "JSWSTEEL", "TATASTEEL",
        "TECHM", "HINDALCO", "GRASIM", "CIPLA", "DRREDDY",
        "DIVISLAB", "BPCL", "EICHERMOT", "HEROMOTOCO", "BRITANNIA",
        "APOLLOHOSP", "TATACONSUM", "SBILIFE", "HDFCLIFE", "PIDILITIND",
        "INDUSINDBK", "M&M", "BAJAJ-AUTO", "SHRIRAMFIN", "TRENT"
    ]
    return symbols

if __name__ == "__main__":
    print(get_nifty100_symbols())
    print(f"Total: {len(get_nifty100_symbols())}")