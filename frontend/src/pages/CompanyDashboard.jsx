// // /**
// //  * CompanyDashboard.jsx
// //  *
// //  * Fixes applied:
// //  * 1. ScoreCard section is rendered inline here — import kept but used correctly.
// //  *    (Previously ScoreCard.jsx contained a copy of CompanyDashboard, causing an
// //  *    import cycle / infinite render loop. That file is now a proper component.)
// //  * 2. newsLoading never gets stuck: the useEffect has no missing dependencies
// //  *    and fetchLiveNews always resolves (returns [] on failure) — no infinite re-render.
// //  * 3. symbolUpper is derived outside state/effects to avoid stale-closure issues.
// //  */

// import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { fetchQualitativeAnalysis, fetchAllSectors, fetchLiveNews } from '../utils/dataFetcher';
// import TagBadge from '../components/TagBadge';
// import ScoreCard from '../components/ScoreCard';   // ← now the real ScoreCard component
// import MetricCard from '../components/MetricCard';
// import ChartCard from '../components/ChartCard';
// import { ArrowLeft, Users, ArrowUpRight, Newspaper } from 'lucide-react';
// import { getInvestmentTag } from '../utils/getInvestmentTag';
// import { generateContradiction } from '../utils/contradictionEngine';

// export default function CompanyDashboard() {
//   const { symbol } = useParams();

//   // Derive once — avoids re-creating on every render
//   const symbolUpper = symbol?.toUpperCase() ?? '';

//   const [data, setData]                   = useState(null);
//   const [industryRankings, setIndustryRankings] = useState(null);
//   const [liveNews, setLiveNews]           = useState([]);
//   const [newsLoading, setNewsLoading]     = useState(true);
//   const [error, setError]                 = useState(null);
//   const [loading, setLoading]             = useState(true);
//   const [activeNewsIdx, setActiveNewsIdx] = useState(null);

//   // ── Fetch company data + sector rankings ──────────────────────────────────
//   useEffect(() => {
//     if (!symbolUpper) return;

//     let cancelled = false; // guard against setting state on unmounted component
//     setLoading(true);
//     setError(null);

//     Promise.all([
//       fetchQualitativeAnalysis(symbolUpper),
//       fetchAllSectors(),
//     ])
//       .then(([companyRes, sectorsRes]) => {
//         if (cancelled) return;
//         setData(companyRes);

//         const targetIndustry = sectorsRes.find(ind =>
//           ind?.rankings?.fundamental_investor?.some(c => c.company === symbolUpper)
//         );
//         if (targetIndustry?.rankings) setIndustryRankings(targetIndustry.rankings);
//         setLoading(false);
//       })
//       .catch((err) => {
//         if (cancelled) return;
//         console.error('[CompanyDashboard] Data fetch error:', err);
//         setError(`Failed to load data for ${symbolUpper}.`);
//         setLoading(false);
//       });

//     return () => { cancelled = true; };
//   }, [symbolUpper]); // ← only re-run when the symbol changes

//   // ── Fetch live news independently ─────────────────────────────────────────
//   // fetchLiveNews always resolves (never rejects), so setNewsLoading(false)
//   // is guaranteed to be called — no stuck loading state.
//   useEffect(() => {
//     if (!symbolUpper) return;

//     let cancelled = false;
//     setNewsLoading(true);

//     fetchLiveNews(symbolUpper)
//       .then((news) => {
//         if (cancelled) return;
//         setLiveNews(Array.isArray(news) ? news : []);
//         setNewsLoading(false);
//       })
//       .catch(() => {
//         if (cancelled) return;
//         setLiveNews([]);
//         setNewsLoading(false);
//       });

//     return () => { cancelled = true; };
//   }, [symbolUpper]);

//   // ── Guard renders ─────────────────────────────────────────────────────────
//   if (loading) {
//     return <div className="p-10 text-center text-gray-400">Loading Dashboard…</div>;
//   }
//   if (error || !data) {
//     return <div className="p-10 text-center text-red-400">{error || 'Data not found.'}</div>;
//   }

//   // ── Destructure company data ──────────────────────────────────────────────
//   const {
//     business_overview,
//     business_quality_signals,
//     cyclicality_signals,
//     return_profile_signals,
//     governance_signals,
//     pros_and_cons,
//     quantitative_data,
//   } = data;

//   const Scores = {
//     BQ: { val: business_quality_signals?.BQ,  justification: business_quality_signals?.reasoning_points },
//     RP: { val: return_profile_signals?.RP,     justification: return_profile_signals?.reasoning_points },
//     CY: { val: cyclicality_signals?.CY,        justification: cyclicality_signals?.reasoning_points },
//     BG: { val: governance_signals?.BG,         justification: governance_signals?.reasoning_points },
//   };

//   const Pros          = pros_and_cons?.pros || [];
//   const Cons          = pros_and_cons?.cons || [];
//   const recentMetrics = quantitative_data?.Recent   || {};
//   const historical    = quantitative_data?.Historical || {};

//   const fundamentalFinalScore = data.fundamental_score
//     ? parseFloat(data.fundamental_score).toFixed(2)
//     : (
//         ((Scores.BQ.val || 0) + (Scores.RP.val || 0) +
//          (Scores.CY.val || 0) + (Scores.BG.val || 0)) / 4
//       ).toFixed(2);

//   const zScore = data.z_score ? parseFloat(data.z_score).toFixed(4) : null;

//   const chartData = [
//     { date: '5Y', value: historical['Return over 5years'] ? historical['Return over 5years'] * 100 : 0 },
//     { date: '3Y', value: historical['Return over 3years'] ? historical['Return over 3years'] * 100 : 0 },
//     { date: '1Y', value: historical['Return over 1year']  ? historical['Return over 1year']  * 100 : 0 },
//   ];

//   const contradiction = generateContradiction(data);
//   const contradictionStyles = {
//     contradiction: { wrapper: 'bg-red-950/30 border-red-900/50',    glow: 'bg-red-500/10',    title: 'text-red-400',    icon: '⚠️' },
//     optimism:      { wrapper: 'bg-amber-950/30 border-amber-900/50', glow: 'bg-amber-500/10',  title: 'text-amber-400',  icon: '📈' },
//     divergence:    { wrapper: 'bg-orange-950/30 border-orange-900/50', glow: 'bg-orange-500/10', title: 'text-orange-400', icon: '↕️' },
//   };
//   const cStyle = contradiction ? contradictionStyles[contradiction.type] : null;

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in">

//       {/* ── Navigation ── */}
//       <div className="flex items-center justify-between mb-2">
//         <Link
//           to="/"
//           className="text-gray-500 hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium"
//         >
//           <ArrowLeft size={16} /> Back to Home
//         </Link>
//         <Link
//           to={`/company/${symbol}/peers`}
//           className="text-insight-blue hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-insight-blue/10 px-4 py-2 rounded-full border border-insight-blue/30 shadow"
//         >
//           <Users size={16} /> Compare Peers
//         </Link>
//       </div>

//       {/* ── Header ── */}
//       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-insight-card p-6 rounded-2xl border border-gray-800 shadow relative overflow-hidden">
//         <div className="relative z-10 text-left">
//           <h1 className="text-3xl md:text-4xl font-bold text-gray-100">{symbolUpper}</h1>
//           <p className="text-gray-400 mt-1">{business_overview?.industry_position || 'Industry Leader'}</p>
//         </div>
//         <div className="flex items-center gap-3 relative z-10">
//           <TagBadge label={getInvestmentTag(symbolUpper, industryRankings)} className="text-lg px-4 py-1" />
//         </div>
//         {/* Subtle ambient glow — not a gradient on the scores */}
//         <div className="absolute top-0 right-0 w-64 h-64 bg-insight-blue/5 rounded-full blur-[80px] pointer-events-none" />
//       </header>

//       {/* ── Core AI Evaluation (ScoreCard) ── */}
//       {/*
//         ScoreCard receives the Scores object and renders BQ / RP / CY / BG cards.
//         Each card shows: acronym, full label, numeric score, a thin accent bar, and
//         collapsible reasoning points. No gradients — solid dark card backgrounds.
//       */}
//       <section>
//         <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">
//           Core AI Evaluation
//         </h2>
//         <ScoreCard scores={Scores} />
//       </section>

//       {/* ── Final Score + Contradiction ── */}
//       <section className="flex flex-col md:flex-row gap-6">
//         <div className="bg-insight-card border border-gray-800 p-6 rounded-2xl flex-1 flex flex-col items-center justify-center text-center shadow">
//           <h3 className="text-insight-blue text-xs tracking-widest uppercase font-bold mb-2">
//             Fundamental Final Score
//           </h3>
//           <p className="text-5xl font-extrabold text-white">{fundamentalFinalScore}</p>
//           {zScore && (
//             <p className="text-sm text-gray-400 font-medium mt-3 bg-gray-900/50 px-3 py-1 rounded-full">
//               Global Z-Score: <span className="text-gray-200">{zScore}</span>
//             </p>
//           )}
//         </div>

//         {contradiction && cStyle && (
//           <div className={`border p-6 rounded-2xl flex-1 flex flex-col justify-center relative overflow-hidden ${cStyle.wrapper}`}>
//             <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] ${cStyle.glow} pointer-events-none`} />
//             <h3 className={`font-bold flex items-center gap-2 mb-3 text-lg relative z-10 ${cStyle.title}`}>
//               <span className="text-2xl">{cStyle.icon}</span> {contradiction.title}
//             </h3>
//             <p className="text-sm text-gray-300 leading-relaxed relative z-10">{contradiction.message}</p>
//           </div>
//         )}
//       </section>

//       {/* ── Historical Trends ── */}
//       <section className="relative">
//         <div className="flex items-center justify-between mb-4 px-1">
//           <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold">Historical Trends (%)</h2>
//         </div>
//         <ChartCard data={chartData} />
//       </section>

//       {/* ── Pros & Cons ── */}
//       {(Pros.length > 0 || Cons.length > 0) && (
//         <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="bg-green-950/20 border border-green-900/50 p-6 rounded-2xl">
//             <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
//               <span className="w-2 h-2 rounded-full bg-green-500" /> Pros
//             </h3>
//             <ul className="space-y-3">
//               {Pros.map((pro, idx) => (
//                 <li key={idx} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
//                   <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
//                   {pro}
//                 </li>
//               ))}
//             </ul>
//           </div>
//           <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl">
//             <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
//               <span className="w-2 h-2 rounded-full bg-red-500" /> Cons
//             </h3>
//             <ul className="space-y-3">
//               {Cons.map((con, idx) => (
//                 <li key={idx} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
//                   <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
//                   {con}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </section>
//       )}

//       {/* ── Market Snapshot ── */}
//       <section>
//         <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">Market Snapshot</h2>
//         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
//           {recentMetrics['Price to Earning']          != null && <MetricCard label="PE Ratio"       value={recentMetrics['Price to Earning']} />}
//           {recentMetrics['Return on equity']          != null && <MetricCard label="ROE"            value={(recentMetrics['Return on equity']          * 100).toFixed(2) + '%'} />}
//           {recentMetrics['Return on capital employed']!= null && <MetricCard label="ROCE"           value={(recentMetrics['Return on capital employed'] * 100).toFixed(2) + '%'} />}
//           {recentMetrics['Debt to equity']            != null && <MetricCard label="Debt/Equity"    value={recentMetrics['Debt to equity']} />}
//           {recentMetrics['Dividend yield']            != null && <MetricCard label="Dividend Yield" value={recentMetrics['Dividend yield']} />}
//           {recentMetrics['EPS']                       != null && <MetricCard label="EPS"            value={recentMetrics['EPS']} />}
//           {recentMetrics['Sales growth']              != null && <MetricCard label="Sales Growth"   value={(recentMetrics['Sales growth']   * 100).toFixed(2) + '%'} />}
//           {recentMetrics['Profit growth']             != null && <MetricCard label="Profit Growth"  value={(recentMetrics['Profit growth']  * 100).toFixed(2) + '%'} />}
//         </div>
//       </section>

//       {/* ── Latest News ────────────────────────────────────────────────────────
//           - Skeleton pulsed while newsLoading = true
//           - Hides entirely if no articles returned
//           - fetchLiveNews never throws — always resolves with [] on failure
//       ── */}
//       {newsLoading ? (
//         <section>
//           <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1 flex items-center gap-2">
//             <Newspaper size={14} /> Latest News
//           </h2>
//           <div className="space-y-3">
//             {[0, 1, 2].map((i) => (
//               <div key={i} className="bg-insight-card p-4 rounded-xl border border-gray-800 animate-pulse">
//                 <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
//                 <div className="h-3 bg-gray-800 rounded w-full mb-3" />
//                 <div className="h-3 bg-gray-800 rounded w-1/4" />
//               </div>
//             ))}
//           </div>
//         </section>
//       ) : liveNews.length > 0 ? (
//         <section>
//           <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1 flex items-center gap-2">
//             <Newspaper size={14} /> Latest News
//           </h2>
//           <div className="space-y-3">
//             {liveNews.map((item, idx) => (
//               <a
//                 key={idx}
//                 href={item.link}
//                 target="_blank"
//                 rel="noreferrer noopener"
//                 onMouseEnter={() => setActiveNewsIdx(idx)}
//                 onMouseLeave={() => setActiveNewsIdx(null)}
//                 className={`relative block overflow-hidden bg-insight-card p-4 rounded-xl border transition-all duration-200 no-underline ${
//                   activeNewsIdx === idx
//                     ? 'border-insight-blue/40 shadow-md -translate-y-0.5'
//                     : 'border-gray-800'
//                 }`}
//               >
//                 {/* Headline */}
//                 <p className={`text-sm md:text-base font-semibold leading-snug transition-colors duration-200 ${
//                   activeNewsIdx === idx ? 'text-insight-blue' : 'text-gray-100'
//                 }`}>
//                   {item.title}
//                 </p>

//                 {/* Summary — only if present */}
//                 {item.summary && (
//                   <p className="text-xs text-gray-400 leading-relaxed mt-1.5 line-clamp-2">
//                     {item.summary}
//                   </p>
//                 )}

//                 {/* Footer */}
//                 <div className="mt-3 flex items-center justify-between gap-3">
//                   <div className="flex items-center gap-2 flex-wrap">
//                     {item.publisher && (
//                       <span className={`text-xs font-medium transition-colors duration-200 ${
//                         activeNewsIdx === idx ? 'text-gray-200' : 'text-gray-500'
//                       }`}>
//                         {item.publisher}
//                       </span>
//                     )}
//                     {item.published_at && (
//                       <span className="text-[10px] text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700/50">
//                         {item.published_at}
//                       </span>
//                     )}
//                   </div>
//                   <ArrowUpRight
//                     size={14}
//                     className={`shrink-0 transition-all duration-200 ${
//                       activeNewsIdx === idx
//                         ? 'text-insight-blue translate-x-0.5 -translate-y-0.5'
//                         : 'text-gray-600'
//                     }`}
//                   />
//                 </div>
//               </a>
//             ))}
//           </div>
//         </section>
//       ) : null}

//     </div>
//   );
// }





// //   const Scores = {
// //     BQ: { val: business_quality_signals?.BQ,  justification: business_quality_signals?.reasoning_points },
// //     RP: { val: return_profile_signals?.RP,     justification: return_profile_signals?.reasoning_points },
// //     CY: { val: cyclicality_signals?.CY,        justification: cyclicality_signals?.reasoning_points },
// //     BG: { val: governance_signals?.BG,         justification: governance_signals?.reasoning_points },
// //   };

// //   // ── Core AI Evaluation cards (inline with requested updates) ───────────────
// //   const coreEvaluationCards = [
// //     {
// //       acronym: 'BQ',
// //       label: 'Business Quality',
// //       shortDesc: 'Moat, pricing power, scalability',
// //       val: Scores.BQ.val,
// //       justification: Scores.BQ.justification || [],
// //     },
// //     {
// //       acronym: 'RP',
// //       label: 'Return Profile',
// //       shortDesc: 'ROE, ROCE, capital efficiency',
// //       val: Scores.RP.val,
// //       justification: Scores.RP.justification || [],
// //     },
// //     {
// //       acronym: 'CY',
// //       label: 'Cyclicality',
// //       shortDesc: 'Revenue stability, demand sensitivity',
// //       val: Scores.CY.val,
// //       justification: Scores.CY.justification || [],
// //     },
// //     {
// //       acronym: 'BG',
// //       label: 'Governance',
// //       shortDesc: 'Management quality, transparency',
// //       val: Scores.BG.val,
// //       justification: Scores.BG.justification || [],
// //     },
// //   ];

// //   const Pros          = pros_and_cons?.pros || [];
// //   const Cons          = pros_and_cons?.cons || [];
// //   const recentMetrics = quantitative_data?.Recent   || {};
// //   const historical    = quantitative_data?.Historical || {};

// //   const fundamentalFinalScore = data.fundamental_score
// //     ? parseFloat(data.fundamental_score).toFixed(2)
// //     : (
// //         ((Scores.BQ.val || 0) + (Scores.RP.val || 0) +
// //          (Scores.CY.val || 0) + (Scores.BG.val || 0)) / 4
// //       ).toFixed(2);

// //   const zScore = data.z_score ? parseFloat(data.z_score).toFixed(4) : null;

// //   const chartData = [
// //     { date: '5Y', value: historical['Return over 5years'] ? historical['Return over 5years'] * 100 : 0 },
// //     { date: '3Y', value: historical['Return over 3years'] ? historical['Return over 3years'] * 100 : 0 },
// //     { date: '1Y', value: historical['Return over 1year']  ? historical['Return over 1year']  * 100 : 0 },
// //   ];

// //   const contradiction = generateContradiction(data);
// //   const contradictionStyles = {
// //     contradiction: { wrapper: 'bg-red-950/30 border-red-900/50',    glow: 'bg-red-500/10',    title: 'text-red-400',    icon: '⚠️' },
// //     optimism:      { wrapper: 'bg-amber-950/30 border-amber-900/50', glow: 'bg-amber-500/10',  title: 'text-amber-400',  icon: '📈' },
// //     divergence:    { wrapper: 'bg-orange-950/30 border-orange-900/50', glow: 'bg-orange-500/10', title: 'text-orange-400', icon: '↕️' },
// //   };
// //   const cStyle = contradiction ? contradictionStyles[contradiction.type] : null;

// //   // ── Render ────────────────────────────────────────────────────────────────
// //   return (
// //     <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in">

// //       {/* ── Navigation ── */}
// //       <div className="flex items-center justify-between mb-2">
// //         <Link
// //           to="/"
// //           className="text-gray-500 hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium"
// //         >
// //           <ArrowLeft size={16} /> Back to Home
// //         </Link>
// //         <Link
// //           to={`/company/${symbol}/peers`}
// //           className="text-insight-blue hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-insight-blue/10 px-4 py-2 rounded-full border border-insight-blue/30 shadow"
// //         >
// //           <Users size={16} /> Compare Peers
// //         </Link>
// //       </div>

// //       {/* ── Header ── */}
// //       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-insight-card p-6 rounded-2xl border border-gray-800 shadow relative overflow-hidden">
// //         <div className="relative z-10 text-left">
// //           <h1 className="text-3xl md:text-4xl font-bold text-gray-100">{symbolUpper}</h1>
// //           <p className="text-gray-400 mt-1">{business_overview?.industry_position || 'Industry Leader'}</p>
// //         </div>
// //         <div className="flex items-center gap-3 relative z-10">
// //           <TagBadge label={getInvestmentTag(symbolUpper, industryRankings)} className="text-lg px-4 py-1" />
// //         </div>
// //         {/* Subtle ambient glow — not a gradient on the scores */}
// //         <div className="absolute top-0 right-0 w-64 h-64 bg-insight-blue/5 rounded-full blur-[80px] pointer-events-none" />
// //       </header>

// //       {/* ── Core AI Evaluation (updated inline cards) ───────────────────────────
// //            • Coloured accent bars REMOVED
// //            • All 4 cards now use uniform text-insight-blue colouring
// //            • Reasoning is an overlapping dropdown (no card expansion / layout shift)
// //       ── */}
// //       <section>
// //         <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">
// //           Core AI Evaluation
// //         </h2>
// //         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// //           {coreEvaluationCards.map((card) => {
// //             const isExpanded = expandedCards[card.acronym] ?? false;

// //             const toggleExpanded = () => {
// //               setExpandedCards((prev) => ({
// //                 ...prev,
// //                 [card.acronym]: !isExpanded,
// //               }));
// //             };

// //             return (
// //               <div
// //                 key={card.acronym}
// //                 className="bg-insight-card border border-gray-800 p-6 rounded-2xl relative overflow-visible shadow"
// //               >
// //                 {/* Main card content – fixed height, no expansion */}
// //                 <div className="flex justify-between items-start mb-6">
// //                   <div className="flex items-center gap-3 flex-1">
// //                     <span className="text-3xl font-bold text-insight-blue tracking-tighter">
// //                       {card.acronym}
// //                     </span>
// //                     <div>
// //                       <h3 className="font-semibold text-white text-xl leading-none">
// //                         {card.label}
// //                       </h3>
// //                       <p className="text-gray-400 text-sm mt-1">
// //                         {card.shortDesc}
// //                       </p>
// //                     </div>
// //                   </div>

// //                   <div className="text-right">
// //                     <p className="text-6xl font-extrabold text-insight-blue leading-none">
// //                       {card.val ?? '—'}
// //                     </p>
// //                     <p className="text-xs font-medium text-insight-blue mt-1 tracking-widest">
// //                       Excellent
// //                     </p>
// //                   </div>
// //                 </div>

// //                 {/* Coloured bar REMOVED */}

// //                 {/* Dropdown trigger */}
// //                 <button
// //                   onClick={toggleExpanded}
// //                   className="flex w-full items-center justify-between text-insight-blue hover:text-white font-medium text-sm border-t border-gray-700 pt-4 transition-colors"
// //                 >
// //                   <span>View reasoning</span>
// //                   <span
// //                     className={`inline-block text-lg transition-transform duration-200 ${
// //                       isExpanded ? 'rotate-180' : ''
// //                     }`}
// //                   >
// //                     ▼
// //                   </span>
// //                 </button>

// //                 {/* Overlapping dropdown on lower box – does NOT expand the card */}
// //                 {isExpanded && (
// //                   <div className="absolute left-0 right-0 top-full mt-3 z-30 bg-insight-card border border-gray-800 rounded-2xl p-6 shadow-2xl">
// //                     <ul className="space-y-3 text-sm text-gray-300">
// //                       {card.justification.length > 0 ? (
// //                         card.justification.map((point, idx) => (
// //                           <li key={idx} className="flex items-start gap-3">
// //                             <span className="text-insight-blue text-base mt-px">•</span>
// //                             <span>{point}</span>
// //                           </li>
// //                         ))
// //                       ) : (
// //                         <li className="text-gray-400">No reasoning points available.</li>
// //                       )}
// //                     </ul>
// //                   </div>
// //                 )}
// //               </div>
// //             );
// //           })}
// //         </div>
// //       </section>






/**
 * CompanyDashboard.jsx
 *
 * FINAL VERSION
 * • Uses the original dashboard structure you provided in the last prompt.
 * • ScoreCard is imported and used (no inline cards).
 * • ScoreCard now contains the exact design + overlapping dropdown you requested.
 * • All other sections (header, final score, trends, pros/cons, news, etc.) are unchanged.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQualitativeAnalysis, fetchAllSectors, fetchLiveNews, triggerPipeline } from '../utils/dataFetcher';
import TagBadge from '../components/TagBadge';
import ScoreCard from '../components/ScoreCard';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import { ArrowLeft, Users, ArrowUpRight, Newspaper } from 'lucide-react';
import { getInvestmentTag } from '../utils/getInvestmentTag';
import { generateContradiction } from '../utils/contradictionEngine';
import AiChatbot from '../components/AiChatbot';
import { addToWatchlist, removeFromWatchlist, isWatchlisted } from '../utils/watchlistStore';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function CompanyDashboard() {
  const { symbol } = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Initializing AI Analysis...');

  // Derive once — avoids re-creating on every render
  const symbolUpper = symbol?.toUpperCase() ?? '';

  const [data, setData]                   = useState(null);
  const [industryRankings, setIndustryRankings] = useState(null);
  const [liveNews, setLiveNews]           = useState([]);
  const [newsLoading, setNewsLoading]     = useState(true);
  const [error, setError]                 = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeNewsIdx, setActiveNewsIdx] = useState(null);

  const [isStarred, setIsStarred] = useState(false);
  const [isStarLoading, setIsStarLoading] = useState(false);
  const dashboardRef = React.useRef(null);

  useEffect(() => {
    if (symbolUpper) {
      isWatchlisted(symbolUpper).then(setIsStarred).catch(console.error);
    }
  }, [symbolUpper]);

  const toggleStar = async () => {
    if (isStarLoading) return;
    setIsStarLoading(true);
    try {
      if (isStarred) {
        await removeFromWatchlist(symbolUpper);
        setIsStarred(false);
      } else {
        await addToWatchlist(symbolUpper);
        setIsStarred(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, { backgroundColor: '#09090b', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${symbolUpper}_NIFTYIQ.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    }
  };

  // ── Fetch company data + sector rankings ──────────────────────────────────
  useEffect(() => {
    if (!symbolUpper) return;

    let cancelled = false;
    let pollTimer = null;

    const loadData = async (isPolling = false) => {
      if (!isPolling) {
        setLoading(true);
        setError(null);
      }

      try {
        const [companyRes, sectorsRes] = await Promise.all([
          fetchQualitativeAnalysis(symbolUpper),
          fetchAllSectors(),
        ]);

        if (cancelled) return;

        if (companyRes.status === 'success') {
          setData(companyRes.data);
          setIsProcessing(false);
          
          const targetIndustry = sectorsRes.find(ind =>
            ind?.rankings?.fundamental_investor?.some(c => c.company === symbolUpper)
          );
          if (targetIndustry?.rankings) setIndustryRankings(targetIndustry.rankings);
          setLoading(false);
        } 
        else if (companyRes.status === 'processing') {
          setIsProcessing(true);
          setLoading(false);
          setProcessingMessage('AI is currently analyzing reports and fetching market data...');
          // Poll again in 5 seconds
          pollTimer = setTimeout(() => loadData(true), 5000);
        }
        else if (companyRes.status === 'not_found' && !isPolling) {
          // Trigger pipeline automatically
          setProcessingMessage('Company not found in database. Starting fresh AI Analysis...');
          setIsProcessing(true);
          setLoading(false);
          
          try {
            await triggerPipeline(symbolUpper);
            // After triggering, start polling
            pollTimer = setTimeout(() => loadData(true), 3000);
          } catch (err) {
            console.error('Failed to trigger pipeline:', err);
            setError('Failed to start analysis for ' + symbolUpper);
            setIsProcessing(false);
          }
        }
        else if (isPolling) {
          // If we're polling and still not found/processing, keep polling
          pollTimer = setTimeout(() => loadData(true), 5000);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[CompanyDashboard] Data fetch error:', err);
        setError(`Failed to load data for ${symbolUpper}.`);
        setLoading(false);
      }
    };

    loadData();

    return () => { 
      cancelled = true; 
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [symbolUpper]);

  // ── Fetch live news independently ─────────────────────────────────────────
  useEffect(() => {
    if (!symbolUpper) return;

    let cancelled = false;
    setNewsLoading(true);

    fetchLiveNews(symbolUpper)
      .then((news) => {
        if (cancelled) return;
        setLiveNews(Array.isArray(news) ? news : []);
        setNewsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveNews([]);
        setNewsLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbolUpper]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center gap-6 bg-insight-dark">
        <div className="w-16 h-16 border-4 border-insight-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center gap-8 bg-insight-dark relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-insight-blue/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-insight-blue/5 rounded-full blur-[120px] animate-pulse delay-700" />
        
        <div className="relative z-10 flex flex-col items-center max-w-md">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-b-4 border-l-4 border-insight-blue rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-t-4 border-r-4 border-insight-blue-soft rounded-full animate-spin-slow" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Processing {symbolUpper}</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{processingMessage}</p>
          
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-2">
            <div className="bg-gradient-to-r from-insight-blue to-insight-blue-soft h-full w-2/3 animate-progress-shimmer" />
          </div>
          
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            Insight Engine Active • Phase 1/3
          </p>
        </div>

        <div className="mt-12 text-gray-600 text-xs text-left max-w-xs space-y-2">
          <p className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-insight-blue" /> Fetching annual reports from NSE/BSE...
          </p>
          <p className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-insight-blue" /> Running Gemini AI qualitative extraction...
          </p>
          <p className="flex items-center gap-2 opacity-50">
            <span className="w-1 h-1 rounded-full bg-gray-600" /> Calculating peer group rankings...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center gap-6 bg-insight-dark">
        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
          <div className="text-red-500 text-4xl">⚠️</div>
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-gray-100 mb-2">An error occurred</h2>
          <p className="text-red-400 text-sm">{error || 'Data could not be found for ' + (symbolUpper || 'this company') + '.'}</p>
        </div>
        <Link 
          to="/" 
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors border border-gray-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // ── Destructure company data ──────────────────────────────────────────────
  const {
    business_overview,
    business_quality_signals,
    cyclicality_signals,
    return_profile_signals,
    governance_signals,
    pros_and_cons,
    quantitative_data,
  } = data;

  const Scores = {
    BQ: { val: business_quality_signals?.BQ,  justification: business_quality_signals?.reasoning_points },
    RP: { val: return_profile_signals?.RP,     justification: return_profile_signals?.reasoning_points },
    CY: { val: cyclicality_signals?.CY,        justification: cyclicality_signals?.reasoning_points },
    BG: { val: governance_signals?.BG,         justification: governance_signals?.reasoning_points },
  };

  const Pros          = pros_and_cons?.pros || [];
  const Cons          = pros_and_cons?.cons || [];
  const recentMetrics = quantitative_data?.Recent   || {};
  const historical    = quantitative_data?.Historical || {};

  const fundamentalFinalScore = data.fundamental_score
    ? parseFloat(data.fundamental_score).toFixed(2)
    : (
        ((Scores.BQ.val || 0) + (Scores.RP.val || 0) +
         (Scores.CY.val || 0) + (Scores.BG.val || 0)) / 4
      ).toFixed(2);

  const zScore = data.z_score ? parseFloat(data.z_score).toFixed(4) : null;

  const chartData = [
    { date: '5Y', value: historical['Return over 5years'] ? historical['Return over 5years'] * 100 : 0 },
    { date: '3Y', value: historical['Return over 3years'] ? historical['Return over 3years'] * 100 : 0 },
    { date: '1Y', value: historical['Return over 1year']  ? historical['Return over 1year']  * 100 : 0 },
  ];

  const contradiction = generateContradiction(data);
  const contradictionStyles = {
    contradiction: { wrapper: 'bg-red-950/30 border-red-900/50',    glow: 'bg-red-500/10',    title: 'text-red-400',    icon: '⚠️' },
    optimism:      { wrapper: 'bg-amber-950/30 border-amber-900/50', glow: 'bg-amber-500/10',  title: 'text-amber-400',  icon: '📈' },
    divergence:    { wrapper: 'bg-orange-950/30 border-orange-900/50', glow: 'bg-orange-500/10', title: 'text-orange-400', icon: '↕️' },
  };
  const cStyle = contradiction ? contradictionStyles[contradiction.type] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in" ref={dashboardRef}>
      <AiChatbot symbol={symbolUpper} />

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mb-2">
        <Link
          to="/"
          className="text-gray-500 hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <Link
          to={`/company/${symbol}/peers`}
          className="text-insight-blue hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-insight-blue/10 px-4 py-2 rounded-full border border-insight-blue/30 shadow"
        >
          <Users size={16} /> Compare Peers
        </Link>
      </div>

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-insight-card p-6 rounded-2xl border border-gray-800 shadow relative overflow-hidden">
        <div className="relative z-10 text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100">{symbolUpper}</h1>
          <p className="text-gray-400 mt-1">{business_overview?.industry_position || 'Industry Leader'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <TagBadge label={getInvestmentTag(symbolUpper, industryRankings)} className="text-lg px-4 py-1" />
          <button onClick={toggleStar} disabled={isStarLoading} className={`p-2 rounded-full border transition ${isStarred ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-yellow-500'} ${isStarLoading ? 'opacity-50 cursor-not-allowed' : ''}`} title="Add to Watchlist">
            ⭐
          </button>
          <button onClick={exportPDF} className="px-3 py-1.5 text-xs font-medium bg-gray-800/50 border border-gray-700 hover:bg-gray-800 rounded-lg transition flex items-center gap-2 text-gray-300">
            📄 Export PDF
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-insight-blue/5 rounded-full blur-[80px] pointer-events-none" />
      </header>

      {/* ── Core AI Evaluation ── */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">
          Core AI Evaluation
        </h2>
        <ScoreCard scores={Scores} />
      </section>

      {/* ── Final Score + Contradiction ── */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="bg-insight-card border border-gray-800 p-6 rounded-2xl flex-1 flex flex-col items-center justify-center text-center shadow">
          <h3 className="text-insight-blue text-xs tracking-widest uppercase font-bold mb-2">
            Fundamental Final Score
          </h3>
          <p className="text-5xl font-extrabold text-white">{fundamentalFinalScore}</p>
          {zScore && (
            <p className="text-sm text-gray-400 font-medium mt-3 bg-gray-900/50 px-3 py-1 rounded-full">
              Global Z-Score: <span className="text-gray-200">{zScore}</span>
            </p>
          )}
        </div>

        {contradiction && cStyle && (
          <div className={`border p-6 rounded-2xl flex-1 flex flex-col justify-center relative overflow-hidden ${cStyle.wrapper}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] ${cStyle.glow} pointer-events-none`} />
            <h3 className={`font-bold flex items-center gap-2 mb-3 text-lg relative z-10 ${cStyle.title}`}>
              <span className="text-2xl">{cStyle.icon}</span> {contradiction.title}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed relative z-10">{contradiction.message}</p>
          </div>
        )}
      </section>

      {/* ── Historical Trends ── */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold">Historical Trends (%)</h2>
        </div>
        <ChartCard data={chartData} />
      </section>

      {/* ── Pros & Cons ── */}
      {(Pros.length > 0 || Cons.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-950/20 border border-green-900/50 p-6 rounded-2xl">
            <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Pros
            </h3>
            <ul className="space-y-3">
              {Pros.map((pro, idx) => (
                <li key={idx} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-2xl">
            <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Cons
            </h3>
            <ul className="space-y-3">
              {Cons.map((con, idx) => (
                <li key={idx} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Market Snapshot ── */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1">Market Snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recentMetrics['Price to Earning']          != null && <MetricCard label="PE Ratio"       value={recentMetrics['Price to Earning']} />}
          {recentMetrics['Return on equity']          != null && <MetricCard label="ROE"            value={(recentMetrics['Return on equity']          * 100).toFixed(2) + '%'} />}
          {recentMetrics['Return on capital employed']!= null && <MetricCard label="ROCE"           value={(recentMetrics['Return on capital employed'] * 100).toFixed(2) + '%'} />}
          {recentMetrics['Debt to equity']            != null && <MetricCard label="Debt/Equity"    value={recentMetrics['Debt to equity']} />}
          {recentMetrics['Dividend yield']            != null && <MetricCard label="Dividend Yield" value={recentMetrics['Dividend yield']} />}
          {recentMetrics['EPS']                       != null && <MetricCard label="EPS"            value={recentMetrics['EPS']} />}
          {recentMetrics['Sales growth']              != null && <MetricCard label="Sales Growth"   value={(recentMetrics['Sales growth']   * 100).toFixed(2) + '%'} />}
          {recentMetrics['Profit growth']             != null && <MetricCard label="Profit Growth"  value={(recentMetrics['Profit growth']  * 100).toFixed(2) + '%'} />}
        </div>
      </section>

      {/* ── Latest News ── */}
      {newsLoading ? (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1 flex items-center gap-2">
            <Newspaper size={14} /> Latest News
          </h2>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-insight-card p-4 rounded-xl border border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-800 rounded w-full mb-3" />
                <div className="h-3 bg-gray-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        </section>
      ) : liveNews.length > 0 ? (
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 ml-1 flex items-center gap-2">
            <Newspaper size={14} /> Latest News
          </h2>
          <div className="space-y-3">
            {liveNews.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noreferrer noopener"
                onMouseEnter={() => setActiveNewsIdx(idx)}
                onMouseLeave={() => setActiveNewsIdx(null)}
                className={`relative block overflow-hidden bg-insight-card p-4 rounded-xl border transition-all duration-200 no-underline ${
                  activeNewsIdx === idx
                    ? 'border-insight-blue/40 shadow-md -translate-y-0.5'
                    : 'border-gray-800'
                }`}
              >
                <p className={`text-sm md:text-base font-semibold leading-snug transition-colors duration-200 ${
                  activeNewsIdx === idx ? 'text-insight-blue' : 'text-gray-100'
                }`}>
                  {item.title}
                </p>
                {item.summary && (
                  <p className="text-xs text-gray-400 leading-relaxed mt-1.5 line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.publisher && (
                      <span className={`text-xs font-medium transition-colors duration-200 ${
                        activeNewsIdx === idx ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {item.publisher}
                      </span>
                    )}
                    {item.published_at && (
                      <span className="text-[10px] text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded-full border border-gray-700/50">
                        {item.published_at}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight
                    size={14}
                    className={`shrink-0 transition-all duration-200 ${
                      activeNewsIdx === idx
                        ? 'text-insight-blue translate-x-0.5 -translate-y-0.5'
                        : 'text-gray-600'
                    }`}
                  />
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  );
}