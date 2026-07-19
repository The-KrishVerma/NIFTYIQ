import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
QUANT_DIR = BASE_DIR / "data" / "quantitative"
QUAL_DIR = BASE_DIR / "data" / "qualitative_insights"

def merge_folders():
    print("🚀 Starting local data merge...")
    merged_count = 0
    for company_folder in QUAL_DIR.iterdir():
        if company_folder.is_dir():
            symbol = company_folder.name
            qual_file = company_folder / f"{symbol}_individual.json"
            quant_file = QUANT_DIR / f"{symbol}_quant.json"
            if qual_file.exists() and quant_file.exists():
                with open(qual_file, 'r', encoding='utf-8') as f:
                    qual_data = json.load(f)
                with open(quant_file, 'r', encoding='utf-8') as f:
                    quant_data = json.load(f)
                qual_data["quantitative_data"] = quant_data
                with open(qual_file, 'w', encoding='utf-8') as f:
                    json.dump(qual_data, f, indent=2)
                merged_count += 1
    print(f"✅ Successfully merged {merged_count} Master JSONs.")

if __name__ == "__main__":
    merge_folders()