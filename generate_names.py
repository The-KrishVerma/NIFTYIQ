import yfinance as yf
import json
from symbols import get_nifty100_symbols

symbols = get_nifty100_symbols()
mapping = {}
for s in symbols:
    try:
        t = yf.Ticker(s + ".NS")
        name = t.info.get("shortName")
        if name:
            mapping[s] = name
        else:
            mapping[s] = s
    except Exception as e:
        mapping[s] = s
    print(f"{s}: {mapping[s]}")

with open("frontend/src/utils/companyNames.json", "w") as f:
    json.dump(mapping, f, indent=4)
