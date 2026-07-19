/**
 * contradictionEngine.js — NIFTYIQ
 *
 * Automated Market Contradiction Detector
 *
 * Instead of naively picking Cons[0], this engine uses a PRIORITY SYSTEM
 * to select the most contextually relevant reason for each company's
 * AI-score vs. market-performance divergence.
 *
 * Priority order for "Strong AI but falling stock":
 *   1. Governance red flags (most serious, most specific)
 *   2. HIGH severity financial risk (closest to price action)
 *   3. HIGH severity industry risk (sector headwinds)
 *   4. HIGH severity operational risk
 *   5. Quantitative signals (PE, D/E, profit growth, margins)
 *   6. Weakest AI score dimension (BQ/CY/RP/BG tells you WHERE the drag is)
 *   7. MEDIUM severity risks as fallback
 *   8. Generic macro fallback
 *
 * Priority order for "Weak AI but rising stock":
 *   1. Structural growth drivers from RP signals
 *   2. New business optionalities
 *   3. Export opportunities
 *   4. Pros list
 *   5. Generic growth expectation fallback
 */

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

/**
 * Finds the AI score dimension with the lowest value.
 * The weakest dimension reveals WHERE the market's concern lies.
 */
function getWeakestDimension(bq, cy, rp, bg) {
  const dims = [
    {
      name: 'BG',
      val: bg,
      reason:
        'governance and balance sheet concerns are undermining institutional confidence despite strong operations',
    },
    {
      name: 'CY',
      val: cy,
      reason:
        'cyclical demand volatility is creating earnings uncertainty that the AI score alone cannot capture',
    },
    {
      name: 'RP',
      val: rp,
      reason:
        'limited long-term growth runway is tempering investor appetite even as near-term fundamentals hold',
    },
    {
      name: 'BQ',
      val: bq,
      reason:
        'weakening competitive positioning is raising doubts about the durability of the business moat',
    },
  ];

  const valid = dims.filter((d) => d.val !== null && d.val !== undefined && !isNaN(d.val));
  if (!valid.length) return null;

  // Return the dimension with the lowest score
  return valid.sort((a, b) => a.val - b.val)[0];
}

/**
 * Scans quantitative metrics for signals that logically explain a price drop.
 * Returns the single most impactful quantitative reason, or null.
 */
function getQuantReason(recentMetrics) {
  const pe = parseFloat(recentMetrics?.['Price to Earning']);
  const dte = parseFloat(recentMetrics?.['Debt to equity']);
  const profitGrowth = parseFloat(recentMetrics?.['Profit growth']);
  const salesGrowth = parseFloat(recentMetrics?.['Sales growth']);
  const opm = parseFloat(recentMetrics?.['OPM']); // Operating Profit Margin

  // Score each signal by severity to pick the strongest one
  const signals = [];

  if (!isNaN(pe) && pe > 70) {
    signals.push({
      weight: 3,
      text: `extremely high valuation (PE: ${pe.toFixed(1)}x) leaves almost no room for execution misses`,
    });
  } else if (!isNaN(pe) && pe > 50) {
    signals.push({
      weight: 2,
      text: `elevated valuation (PE: ${pe.toFixed(1)}x) is compressing as earnings growth disappoints`,
    });
  }

  if (!isNaN(dte) && dte > 2.0) {
    signals.push({
      weight: 3,
      text: `high financial leverage (Debt/Equity: ${dte.toFixed(2)}) is raising refinancing risk in a tightening credit environment`,
    });
  } else if (!isNaN(dte) && dte > 1.0) {
    signals.push({
      weight: 2,
      text: `above-average leverage (Debt/Equity: ${dte.toFixed(2)}) is reducing the company's financial flexibility`,
    });
  }

  if (!isNaN(profitGrowth) && profitGrowth < 0) {
    signals.push({
      weight: 3,
      text: `declining profits (${(profitGrowth * 100).toFixed(1)}% YoY) signal that margin compression is hitting the bottom line`,
    });
  }

  if (!isNaN(salesGrowth) && salesGrowth < 0.03 && salesGrowth >= 0) {
    signals.push({
      weight: 2,
      text: `near-stagnant revenue growth (${(salesGrowth * 100).toFixed(1)}% YoY) hints at demand saturation in core markets`,
    });
  } else if (!isNaN(salesGrowth) && salesGrowth < 0) {
    signals.push({
      weight: 3,
      text: `shrinking revenues (${(salesGrowth * 100).toFixed(1)}% YoY) are raising fundamental concerns about demand erosion`,
    });
  }

  if (!isNaN(opm) && opm < 0.08) {
    signals.push({
      weight: 2,
      text: `thin operating margins (OPM: ${(opm * 100).toFixed(1)}%) provide little cushion against cost headwinds`,
    });
  }

  if (!signals.length) return null;

  // Return the highest-weight signal
  signals.sort((a, b) => b.weight - a.weight);
  return signals[0].text;
}

/**
 * Finds the most relevant HIGH or MEDIUM severity risk across all risk categories.
 * Priority: financial > industry > operational > regulatory
 */
function getBestRisk(riskAnalysis, severity = 'high') {
  const priorityOrder = ['financial_risks', 'industry_risks', 'operational_risks', 'regulatory_risks'];

  for (const category of priorityOrder) {
    const risks = riskAnalysis?.[category] || [];
    const match = risks.find((r) => r.severity === severity);
    if (match) return match.risk;
  }
  return null;
}

// ─────────────────────────────────────────────
// MAIN EXPORTED FUNCTION
// ─────────────────────────────────────────────

/**
 * generateContradiction(companyData)
 *
 * Analyzes the full company JSON and returns a contradiction object or null.
 *
 * Returns:
 *   null  — No meaningful contradiction detected
 *   {
 *     type:    'contradiction' | 'optimism' | 'divergence'
 *     title:   string   — display title
 *     message: string   — full human-readable explanation with specific reason
 *     severity: 'high' | 'medium'  — for UI styling
 *   }
 */
export function generateContradiction(companyData) {
  if (!companyData) return null;

  const {
    business_quality_signals,
    cyclicality_signals,
    return_profile_signals,
    governance_signals,
    risk_analysis,
    pros_and_cons,
    quantitative_data,
  } = companyData;

  // ── Extract all scores ──
  const bq = parseFloat(business_quality_signals?.BQ);
  const cy = parseFloat(cyclicality_signals?.CY);
  const rp = parseFloat(return_profile_signals?.RP);
  const bg = parseFloat(governance_signals?.BG);

  // Use backend-computed fundamental_score if available, otherwise average the 4 AI scores
  const validScores = [bq, cy, rp, bg].filter((v) => !isNaN(v));
  const avgAiScore =
    validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

  const aiScore = !isNaN(parseFloat(companyData.fundamental_score))
    ? parseFloat(companyData.fundamental_score)
    : avgAiScore;

  // ── Extract market performance ──
  const historical = quantitative_data?.Historical || {};
  const recentMetrics = quantitative_data?.Recent || {};

  const oneYearReturn = parseFloat(historical['Return over 1year'] || 0);
  const threeYearReturn = parseFloat(historical['Return over 3years'] || 0);

  // Use percentage strings for display
  const oneYearPct = (oneYearReturn * 100).toFixed(2);
  const threeYearPct = (threeYearReturn * 100).toFixed(2);

  // ─────────────────────────────────────────
  // CASE 1: Strong AI score but stock is weak
  // ─────────────────────────────────────────
  const isStrongScore = aiScore >= 70;
  const isWeakStock = oneYearReturn < -0.05; // worse than -5% in 1 year
  const isVeryWeakStock = oneYearReturn < -0.15; // worse than -15%

  if (isStrongScore && isWeakStock) {
    let reason = null;

    // ── Priority 1: Governance red flags (most company-specific) ──
    const govFlags = governance_signals?.governance_red_flags || {};
    if (govFlags.audit_qualifications) {
      reason =
        'audit qualifications on the financial statements have eroded institutional trust, triggering a valuation re-rating';
    } else if (govFlags.management_integrity_issues) {
      reason =
        'management integrity concerns are causing the market to apply a steep discount despite strong operating metrics';
    } else if (govFlags.related_party_concerns) {
      reason =
        'material related-party transactions are flagging corporate governance risk for institutional investors';
    } else if (govFlags.poor_disclosure_quality) {
      reason =
        'below-par financial disclosure quality is limiting institutional confidence in the reported figures';
    }

    // ── Priority 2: HIGH severity financial risk ──
    if (!reason) {
      reason = getBestRisk(risk_analysis, 'high');
      // Refine: only use this if it came from financial_risks (most price-relevant)
      const financialHighRisk = risk_analysis?.financial_risks?.find((r) => r.severity === 'high');
      if (financialHighRisk) reason = financialHighRisk.risk;
    }

    // ── Priority 3: HIGH severity industry risk ──
    if (!reason) {
      const industryHighRisk = risk_analysis?.industry_risks?.find((r) => r.severity === 'high');
      if (industryHighRisk) reason = industryHighRisk.risk;
    }

    // ── Priority 4: HIGH severity operational risk ──
    if (!reason) {
      const opHighRisk = risk_analysis?.operational_risks?.find((r) => r.severity === 'high');
      if (opHighRisk) reason = opHighRisk.risk;
    }

    // ── Priority 5: Quantitative signals ──
    if (!reason) {
      reason = getQuantReason(recentMetrics);
    }

    // ── Priority 6: Weakest AI dimension ──
    if (!reason) {
      const weakest = getWeakestDimension(bq, cy, rp, bg);
      if (weakest) reason = weakest.reason;
    }

    // ── Priority 7: MEDIUM severity risks as fallback ──
    if (!reason) {
      reason =
        getBestRisk(risk_analysis, 'medium') ||
        'broader macro uncertainty and sector rotation pressures are dominating short-term price action';
    }

    const severity = isVeryWeakStock ? 'high' : 'medium';

    return {
      type: 'contradiction',
      title: 'Market Contradiction',
      severity,
      message: `AI fundamentals are strong (${aiScore.toFixed(2)}), but the stock has dropped ${oneYearPct}% over 1 year. The market is currently discounting the stock due to: "${reason}".`,
    };
  }

  // ─────────────────────────────────────────
  // CASE 2: Weak AI score but stock is rising
  // ─────────────────────────────────────────
  const isWeakScore = aiScore < 55;
  const isRisingStock = oneYearReturn > 0.15; // more than +15% in 1 year

  if (isWeakScore && isRisingStock) {
    let catalyst = null;

    // ── Priority 1: Structural growth drivers (most forward-looking) ──
    const growthDrivers = return_profile_signals?.structural_growth_drivers || [];
    if (growthDrivers.length > 0) catalyst = growthDrivers[0];

    // ── Priority 2: New business optionalities ──
    if (!catalyst) {
      const optionalities = return_profile_signals?.new_business_optionalities || [];
      if (optionalities.length > 0) catalyst = optionalities[0];
    }

    // ── Priority 3: Export opportunities ──
    if (!catalyst) {
      const exports = return_profile_signals?.export_opportunities || [];
      if (exports.length > 0) catalyst = exports[0];
    }

    // ── Priority 4: Innovation signals ──
    if (!catalyst) {
      const innovation = return_profile_signals?.innovation_signals || [];
      if (innovation.length > 0) catalyst = innovation[0];
    }

    // ── Priority 5: Top pro ──
    if (!catalyst && pros_and_cons?.pros?.length > 0) {
      catalyst = pros_and_cons.pros[0];
    }

    // ── Fallback ──
    if (!catalyst) {
      catalyst =
        'anticipated future growth and sector tailwinds not yet visible in the annual report fundamentals';
    }

    return {
      type: 'optimism',
      title: 'Market Optimism',
      severity: 'medium',
      message: `AI baseline scores are moderate (${aiScore.toFixed(2)}), yet the stock has rallied ${oneYearPct}% over 1 year. Investors appear to be pricing in: "${catalyst}".`,
    };
  }

  // ─────────────────────────────────────────
  // CASE 3: Score-Price Divergence (softer edge case)
  // Catches companies where the gap is large but doesn't fit cases 1 or 2 cleanly
  // ─────────────────────────────────────────
  const normalizedStockPerf = oneYearReturn * 100 + 50; // center around 50 like the AI score
  const divergenceGap = Math.abs(aiScore - normalizedStockPerf);

  if (divergenceGap > 50) {
    const anyHighRisk =
      risk_analysis?.financial_risks?.find((r) => r.severity === 'high') ||
      risk_analysis?.industry_risks?.find((r) => r.severity === 'high');

    const contextClue = anyHighRisk
      ? `Pay close attention to: "${anyHighRisk.risk}"`
      : 'Review the Risk Analysis section for emerging concerns not captured in the annual report';

    return {
      type: 'divergence',
      title: 'Score-Price Divergence',
      severity: 'medium',
      message: `The AI fundamental score (${aiScore.toFixed(2)}) and recent 1-year market performance (${oneYearPct}%) are significantly misaligned. ${contextClue}.`,
    };
  }

  // No meaningful contradiction
  return null;
}