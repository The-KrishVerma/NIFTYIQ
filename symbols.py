def get_nifty100_symbols():
    symbols = [
        "RELIANCE", "TCS", "HDFCBANK", "BHARTIARTL", "ICICIBANK",
        "INFOSYS", "SBIN", "HINDUNILVR", "ITC", "LT",
        "KOTAKBANK", "AXISBANK", "MARUTI", "SUNPHARMA", "TITAN",
        "BAJFINANCE", "ADANIENT", "ADANIPORTS", "ULTRACEMCO", "WIPRO",
        "NTPC", "POWERGRID", "HCLTECH", "ONGC", "COALINDIA",
        "NESTLEIND", "TATAMOTORS", "BAJAJFINSV", "JSWSTEEL", "TATASTEEL",
        "TECHM", "HINDALCO", "GRASIM", "CIPLA", "DRREDDY",
        "DIVISLAB", "BPCL", "EICHERMOT", "HEROMOTOCO", "BRITANNIA",
        "APOLLOHOSP", "TATACONSUM", "SBILIFE", "HDFCLIFE", "PIDILITIND",
        "INDUSINDBK", "M&M", "BAJAJ-AUTO", "SHRIRAMFIN", "TRENT",
        "HAVELLS", "DABUR", "GODREJCP", "MARICO", "MUTHOOTFIN",
        "ADANIGREEN", "ADANITRANS", "SIEMENS", "BOSCHLTD", "ABB",
        "AMBUJACEM", "ACC", "GAIL", "VEDL", "JINDALSTEL",
        "BANKBARODA", "CANBK", "PNB", "UNIONBANK", "IDFCFIRSTB",
        "FEDERALBNK", "BANDHANBNK", "CHOLAFIN", "BAJAJHLDNG", "SBICARD",
        "ZOMATO", "NYKAA", "PAYTM", "DMART", "TATAPOWER",
        "IOC", "HPCL", "SAIL", "NMDC", "RECLTD",
        "PFC", "IRCTC", "CONCOR", "HAL", "BEL",
        "BHEL", "RVNL", "IRFC", "NHPC", "SJVN",
        "OBEROIRLTY", "DLF", "GODREJPROP", "PRESTIGE", "PHOENIXLTD"
    ]
    return symbols

if __name__ == "__main__":
    print(get_nifty100_symbols())
    print(f"Total: {len(get_nifty100_symbols())}")