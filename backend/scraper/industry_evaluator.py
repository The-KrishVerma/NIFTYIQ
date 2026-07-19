"""
Industry Evaluator — Pure Python Math Engine

Aggregates company-level individual JSONs by industry (via yfinance)
and produces industry-level evaluation dashboards. 
PER MENTOR REQUEST: Final industry Z-score rankings are calculated STRICTLY 
using the LLM-generated fundamental scores (BQ, CY, RP, BG).

Output: Per-industry JSON files + a master _industry_summary.json with cross-industry rankings.
"""

import json
import math
import statistics
from pathlib import Path
from collections import defaultdict

import yfinance as yf

# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
INSIGHTS_DIR = BASE_DIR / "data" / "qualitative_insights"
QUANT_DIR = BASE_DIR / "data" / "quantitative"
INDUSTRY_EVAL_DIR = BASE_DIR / "data" / "industry_evaluations"
INDUSTRY_EVAL_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# HELPERS
# ============================================================

def safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        return f if not math.isnan(f) else None
    except (ValueError, TypeError):
        return None


def mean_of(values):
    valid = [v for v in values if v is not None]
    return sum(valid) / len(valid) if valid else None


def sum_of(values):
    valid = [v for v in values if v is not None]
    return sum(valid) if valid else None


def zscore_across(industry_scores):
    """
    Standardize a dict {industry: score} across all industries using Z-scores.
    Caps scores at -3 and 3 to prevent extreme outliers from breaking averages.
    """
    valid_scores = [v for v in industry_scores.values() if v is not None]

    if len(valid_scores) < 2:
        return {k: (0.0 if v is not None else None) for k, v in industry_scores.items()}

    mean_val = statistics.mean(valid_scores)
    stdev_val = statistics.stdev(valid_scores)

    if stdev_val == 0:
        return {k: (0.0 if v is not None else None) for k, v in industry_scores.items()}

    result = {}
    for k, v in industry_scores.items():
        if v is None:
            result[k] = None
        else:
            z = (v - mean_val) / stdev_val
            z = max(-3.0, min(3.0, z))
            result[k] = z

    return result


# ============================================================
# DATA EXTRACTION PER COMPANY
# ============================================================

def extract_company_metrics(data):
    """Extract all metrics needed. Quant data is kept for UI dashboards."""
    recent = data.get("quantitative_data", {}).get("Recent", {})

    # Qualitative AI scores (The engine for our ranking)
    bq = safe_float(data.get("business_quality_signals", {}).get("BQ"))
    cy = safe_float(data.get("cyclicality_signals", {}).get("CY"))
    rp = safe_float(data.get("return_profile_signals", {}).get("RP"))
    bg = safe_float(data.get("governance_signals", {}).get("BG"))

    # Quant data (Passed through for UI context, not used in ranking)
    revenue = safe_float(recent.get("Sales"))
    opm = safe_float(recent.get("OPM"))
    roe = safe_float(recent.get("Return on equity"))
    roce = safe_float(recent.get("Return on capital employed"))
    yoy_sales_growth = safe_float(recent.get("YOY Quarterly sales growth"))
    yoy_profit_growth = safe_float(recent.get("YOY Quarterly profit growth"))
    promoter_holding = safe_float(recent.get("Promoter holding"))
    promoter_change = safe_float(recent.get("Change in promoter holding"))
    dividend_yield = safe_float(recent.get("Dividend yield"))
    total_shareholders = safe_float(
        data.get("stockholder_details", {}).get("total_shareholders_count"))
    debt_to_equity = safe_float(recent.get("Debt to equity"))
    current_ratio = safe_float(recent.get("Current ratio"))
    interest_coverage = safe_float(recent.get("Interest Coverage Ratio"))

    gov_flags = data.get("governance_signals", {}).get(
        "governance_red_flags", {})
    red_flag_count = sum(1 for v in gov_flags.values() if v is True)

    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for risk_category in ["operational_risks", "financial_risks", "industry_risks", "regulatory_risks"]:
        for risk in data.get("risk_analysis", {}).get(risk_category, []):
            severity = (risk.get("severity") or "").lower()
            if severity in risk_counts:
                risk_counts[severity] += 1

    return {
        "bq": bq, "cy": cy, "rp": rp, "bg": bg,
        "revenue": revenue, "opm": opm, "roe": roe, "roce": roce,
        "yoy_sales_growth": yoy_sales_growth, "yoy_profit_growth": yoy_profit_growth,
        "promoter_holding": promoter_holding, "promoter_change": promoter_change,
        "dividend_yield": dividend_yield, "total_shareholders": total_shareholders,
        "debt_to_equity": debt_to_equity, "current_ratio": current_ratio,
        "interest_coverage": interest_coverage,
        "red_flag_count": red_flag_count,
        "risk_high": risk_counts["high"],
        "risk_medium": risk_counts["medium"],
        "risk_low": risk_counts["low"],
    }


# ============================================================
# INDUSTRY AGGREGATION
# ============================================================

def aggregate_industry(symbols, all_companies):
    """Compute industry-level aggregate metrics."""
    company_metrics = []
    for sym in symbols:
        if sym in all_companies:
            company_metrics.append(extract_company_metrics(all_companies[sym]))

    if not company_metrics:
        return None

    # --- 1. LLM Composite Scores ---
    avg_bq = mean_of([m["bq"] for m in company_metrics])
    avg_cy = mean_of([m["cy"] for m in company_metrics])
    avg_rp = mean_of([m["rp"] for m in company_metrics])
    avg_bg = mean_of([m["bg"] for m in company_metrics])

    composite_parts = [v for v in [
        avg_bq, avg_cy, avg_rp, avg_bg] if v is not None]
    industry_composite = sum(composite_parts) / \
        len(composite_parts) if composite_parts else None

    # --- Pass-through Quant Data for UI ---
    return {
        "companies": symbols,
        "company_count": len(symbols),
        "llm_scores": {
            "avg_bq": round(avg_bq, 2) if avg_bq is not None else None,
            "avg_cy": round(avg_cy, 2) if avg_cy is not None else None,
            "avg_rp": round(avg_rp, 2) if avg_rp is not None else None,
            "avg_bg": round(avg_bg, 2) if avg_bg is not None else None,
            "industry_fundamental_score": round(industry_composite, 2) if industry_composite is not None else None,
        },
        "revenue_health": {
            "total_revenue": sum_of([m["revenue"] for m in company_metrics]),
            "avg_opm": round(mean_of([m["opm"] for m in company_metrics]) or 0, 4),
            "avg_roe": round(mean_of([m["roe"] for m in company_metrics]) or 0, 4),
            "avg_roce": round(mean_of([m["roce"] for m in company_metrics]) or 0, 4),
        },
        "quarterly_growth": {
            "avg_yoy_sales_growth": round(mean_of([m["yoy_sales_growth"] for m in company_metrics]) or 0, 4),
            "avg_yoy_profit_growth": round(mean_of([m["yoy_profit_growth"] for m in company_metrics]) or 0, 4),
        },
        "stockholder_activity": {
            "avg_promoter_holding": round(mean_of([m["promoter_holding"] for m in company_metrics]) or 0, 2),
            "avg_promoter_holding_change": round(mean_of([m["promoter_change"] for m in company_metrics]) or 0, 2),
            "avg_dividend_yield": round(mean_of([m["dividend_yield"] for m in company_metrics]) or 0, 4),
        },
        "investment_safety": {
            "avg_debt_to_equity": round(mean_of([m["debt_to_equity"] for m in company_metrics]) or 0, 4),
            "avg_current_ratio": round(mean_of([m["current_ratio"] for m in company_metrics]) or 0, 4),
            "governance_red_flag_count": sum(m["red_flag_count"] for m in company_metrics),
        },
    }


# ============================================================
# CROSS-INDUSTRY NORMALIZATION & RANKING (PURE LLM)
# ============================================================

def compute_dimension_scores(industry_data_map):
    """
    Computes Z-SCORES across all industries using ONLY LLM scores (BQ, CY, RP, BG).
    AFTER computing the final Z-score, we apply a confidence multiplier based on
    the number of companies in that industry (per mentor discussion).
    """
    industries = list(industry_data_map.keys())

    # 1. Extract Raw LLM Scores
    raw_bq = {ind: d["llm_scores"]["avg_bq"]
              for ind, d in industry_data_map.items()}
    raw_cy = {ind: d["llm_scores"]["avg_cy"]
              for ind, d in industry_data_map.items()}
    raw_rp = {ind: d["llm_scores"]["avg_rp"]
              for ind, d in industry_data_map.items()}
    raw_bg = {ind: d["llm_scores"]["avg_bg"]
              for ind, d in industry_data_map.items()}

    # 2. Z-Score Normalization per dimension
    norm_bq = zscore_across(raw_bq)
    norm_cy = zscore_across(raw_cy)
    norm_rp = zscore_across(raw_rp)
    norm_bg = zscore_across(raw_bg)

    # 3. Squashed Composite (25% each)
    squashed_z_scores = {}
    for ind in industries:
        parts = [norm_bq.get(ind), norm_cy.get(
            ind), norm_rp.get(ind), norm_bg.get(ind)]
        valid_parts = [p for p in parts if p is not None]
        squashed_z_scores[ind] = sum(
            valid_parts) / len(valid_parts) if valid_parts else 0.0

    # 4. Final Z-Score (second normalization pass)
    overall_zscore = zscore_across(squashed_z_scores)

    # 5. === NEW: Apply Confidence Multiplier based on company_count ===
    final_scores = {}
    rankings = {}

    for ind in industries:
        n = industry_data_map[ind].get("company_count", 1)
        # n=1 → 0.1, n=3 → 0.3, n=10 → 1.0
        confidence = min(1.0, n / 10.0)

        raw_z = overall_zscore.get(ind, 0.0)
        final_z = raw_z * confidence             # ← This is the discount

        final_scores[ind] = round(final_z, 4)

    # 6. Ranking (using the confidence-adjusted final Z-score)
    sorted_industries = sorted(
        final_scores.items(), key=lambda x: x[1], reverse=True)

    prev_score = None
    prev_rank = 0
    for i, (ind, score) in enumerate(sorted_industries):
        if prev_score is not None and math.isclose(score, prev_score, rel_tol=1e-5):
            rankings[ind] = prev_rank
        else:
            rankings[ind] = i + 1
        prev_score = score
        prev_rank = rankings[ind]

    return {
        "llm_z_scores": {
            ind: {
                "bq_zscore": round(norm_bq.get(ind) or 0, 4),
                "cy_zscore": round(norm_cy.get(ind) or 0, 4),
                "rp_zscore": round(norm_rp.get(ind) or 0, 4),
                "bg_zscore": round(norm_bg.get(ind) or 0, 4),
            }
            for ind in industries
        },
        "overall_industry_zscore": final_scores,      # ← Now confidence-adjusted
        "rankings": rankings,
        "confidence": {ind: round(min(1.0, industry_data_map[ind]["company_count"] / 10.0), 2)
                       for ind in industries}
    }


# ============================================================
# MAIN ENTRY POINT
# ============================================================

def run_industry_evaluation():
    print("\n" + "=" * 60)
    print("INDUSTRY EVALUATION: Pure LLM Z-Score Ranking")
    print("=" * 60)

    all_companies = {}

    for company_folder in INSIGHTS_DIR.iterdir():
        if company_folder.is_dir():
            sym = company_folder.name
            json_path = company_folder / f"{sym}_individual.json"
            if json_path.exists():
                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        all_companies[sym] = json.load(f)
                except Exception as e:
                    print(f"  ❌ Failed to load {sym}: {e}")

    if not all_companies:
        print("  ⚠ No companies found. Exiting industry evaluation.")
        return False

    print(f"  📦 Loaded {len(all_companies)} company JSONs.")

    industry_map = defaultdict(list)
    for sym in all_companies.keys():
        try:
            ticker = yf.Ticker(f"{sym}.NS")
            industry = ticker.info.get("industry", "Unclassified")
            safe_industry = industry.replace(" ", "_").replace("/", "_")
            industry_map[safe_industry].append(sym)
        except Exception:
            industry_map["Unclassified"].append(sym)

    print(f"  📊 Found {len(industry_map)} industries:")

    industry_data = {}
    for industry, symbols in industry_map.items():
        result = aggregate_industry(symbols, all_companies)
        if result:
            result["industry"] = industry
            industry_data[industry] = result

    if not industry_data:
        print("  ⚠ No industries with valid data. Exiting.")
        return False

    # Calculate LLM-only Z-scores and rankings
    scoring = compute_dimension_scores(industry_data)

    for ind in industry_data:
        industry_data[ind]["llm_z_scores"] = scoring["llm_z_scores"][ind]
        industry_data[ind]["final_industry_zscore"] = scoring["overall_industry_zscore"][ind]
        industry_data[ind]["industry_rank"] = scoring["rankings"][ind]

        output_path = INDUSTRY_EVAL_DIR / f"{ind}_industry.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(industry_data[ind], f, indent=2, ensure_ascii=False)

    summary_entries = []
    for ind in sorted(industry_data.keys(), key=lambda k: scoring["rankings"][k]):
        entry = {
            "industry": ind,
            "company_count": industry_data[ind]["company_count"],
            "companies": industry_data[ind]["companies"],
            "fundamental_score": industry_data[ind]["llm_scores"]["industry_fundamental_score"],
            # confidence-adjusted
            "final_industry_zscore": scoring["overall_industry_zscore"][ind],
            # ← NEW
            "confidence": scoring["confidence"][ind],
            "rank": scoring["rankings"][ind]
        }
        summary_entries.append(entry)

    summary = {
        "total_industries": len(summary_entries),
        "total_companies": sum(e["company_count"] for e in summary_entries),
        "rankings": summary_entries,
    }

    summary_path = INDUSTRY_EVAL_DIR / "_industry_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n  🏆 Pure LLM Industry Rankings:")
    for entry in summary_entries:
        print(f"     #{entry['rank']:>2}  {entry['industry'].replace('_', ' '):<40}  "
              f"Z-Score: {entry['final_industry_zscore']:>7.4f}  (Score: {entry['fundamental_score']})")

    print(
        f"\n  ✅ Saved {len(industry_data)} industry evaluations + master summary.")
    return True


if __name__ == "__main__":
    run_industry_evaluation()
