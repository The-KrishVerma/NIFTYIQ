import os
import json
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

# ============================================================
# 1. SETUP & CONFIGURATION
# ============================================================
load_dotenv()   # ← Force reload

# Debug: Show exactly which URI is being used
MONGO_URI = os.getenv("MONGO_URI")
print(f"🔍 DEBUG: Using MONGO_URI = {MONGO_URI}")

if not MONGO_URI:
    print("❌ MONGO_URI not found in .env file!")
    print("   Make sure .env is in the project root and contains:")
    print("   MONGO_URI=your_full_atlas_connection_string")
    exit(1)

# Connect to MongoDB Atlas
client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
db = client['insightledger']

# Define the collections
companies_col = db['companies']
sectors_col = db['sector_evaluations']
industries_col = db['industry_evaluations']

# Define paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INSIGHTS_DIR = DATA_DIR / "qualitative_insights"
PEER_EVAL_DIR = DATA_DIR / "peer_evaluations"
INDUSTRY_EVAL_DIR = DATA_DIR / "industry_evaluations"

# ============================================================
# 2. UPLOAD INDIVIDUAL COMPANIES (PHASE 1)
# ============================================================


def upload_individual_companies():
    print("\n" + "=" * 50)
    print("🚀 UPLOADING INDIVIDUAL COMPANIES TO LOCAL MONGODB")
    print("=" * 50)

    if not INSIGHTS_DIR.exists():
        print("⚠ qualitative_insights directory not found. Skipping.")
        return

    operations = []
    processed_count = 0

    # Iterate through every company folder in the insights directory
    for company_folder in INSIGHTS_DIR.iterdir():
        if company_folder.is_dir():
            symbol = company_folder.name
            json_path = company_folder / f"{symbol}_individual.json"

            if json_path.exists():
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        company_data = json.load(f)

                        # Ensure the symbol is explicitly stored at the top level
                        company_data["symbol"] = symbol

                        # Upsert operation (Update if exists, Insert if new)
                        op = UpdateOne(
                            {"symbol": symbol},
                            {"$set": company_data},
                            upsert=True
                        )
                        operations.append(op)
                        processed_count += 1
                except Exception as e:
                    print(f"❌ Error reading {symbol}: {e}")

    if operations:
        result = companies_col.bulk_write(operations)
        print(f"✅ Successfully processed {processed_count} company files.")
        print(
            f"📊 Inserted: {result.upserted_count} | Updated: {result.modified_count}")
    else:
        print("⏭ No individual company JSONs found to upload.")

# ============================================================
# 3. UPLOAD SECTOR PEER EVALUATIONS (PHASE 2)
# ============================================================


def upload_peer_evaluations():
    print("\n" + "=" * 50)
    print("🚀 UPLOADING SECTOR LEADERBOARDS TO LOCAL MONGODB")
    print("=" * 50)

    if not PEER_EVAL_DIR.exists():
        print("⚠ peer_evaluations directory not found. Skipping.")
        return

    operations = []
    processed_count = 0

    for eval_file in PEER_EVAL_DIR.glob("*_evaluation.json"):
        try:
            with open(eval_file, 'r', encoding='utf-8') as f:
                sector_data = json.load(f)

                # UPDATED: Now perfectly matches the new schema_peer_eval.json
                sector_name = sector_data.get("industry")

                # Fallback just in case the key is missing but the file exists
                if not sector_name:
                    sector_name = eval_file.stem.replace("_evaluation", "")

                # UPDATED: Upsert logic now checks the "industry" key directly
                op = UpdateOne(
                    {"industry": sector_name},
                    {"$set": sector_data},
                    upsert=True
                )
                operations.append(op)
                processed_count += 1
        except Exception as e:
            print(f"❌ Error reading {eval_file.name}: {e}")

    if operations:
        result = sectors_col.bulk_write(operations)
        print(
            f"✅ Successfully processed {processed_count} sector evaluations.")
        print(
            f"📊 Inserted: {result.upserted_count} | Updated: {result.modified_count}")
    else:
        print("⏭ No peer evaluation JSONs found to upload.")

# ============================================================
# 4. UPLOAD INDUSTRY EVALUATIONS
# ============================================================


def upload_industry_evaluations():
    print("\n" + "=" * 50)
    print("🚀 UPLOADING INDUSTRY EVALUATIONS TO LOCAL MONGODB")
    print("=" * 50)

    if not INDUSTRY_EVAL_DIR.exists():
        print("⚠ industry_evaluations directory not found. Skipping.")
        return

    operations = []
    processed_count = 0

    for eval_file in INDUSTRY_EVAL_DIR.glob("*_industry.json"):
        try:
            with open(eval_file, 'r', encoding='utf-8') as f:
                industry_data = json.load(f)

                industry_name = industry_data.get("industry")
                if not industry_name:
                    industry_name = eval_file.stem.replace("_industry", "")

                op = UpdateOne(
                    {"industry": industry_name},
                    {"$set": industry_data},
                    upsert=True
                )
                operations.append(op)
                processed_count += 1
        except Exception as e:
            print(f"❌ Error reading {eval_file.name}: {e}")

    # Also upload the summary file
    summary_file = INDUSTRY_EVAL_DIR / "_industry_summary.json"
    if summary_file.exists():
        try:
            with open(summary_file, 'r', encoding='utf-8') as f:
                summary_data = json.load(f)
            op = UpdateOne(
                {"_type": "industry_summary"},
                {"$set": {**summary_data, "_type": "industry_summary"}},
                upsert=True
            )
            operations.append(op)
        except Exception as e:
            print(f"❌ Error reading summary: {e}")

    if operations:
        result = industries_col.bulk_write(operations)
        print(
            f"✅ Successfully processed {processed_count} industry evaluations.")
        print(
            f"📊 Inserted: {result.upserted_count} | Updated: {result.modified_count}")
    else:
        print("⏭ No industry evaluation JSONs found to upload.")


# ============================================================
# 5. EXECUTE
# ============================================================
if __name__ == "__main__":
    try:
        # Verify connection before starting
        client.admin.command('ping')
        print(f"🟢 Successfully connected to MongoDB Atlas!")

        upload_individual_companies()
        upload_peer_evaluations()
        upload_industry_evaluations()

        print("\n🎉 Database migration complete!")
    except Exception as e:
        print(f"\n🔴 Failed to connect to MongoDB.\nError: {e}")
