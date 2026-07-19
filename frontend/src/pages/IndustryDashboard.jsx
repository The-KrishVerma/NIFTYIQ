import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, ArrowRight, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { getInvestmentTag } from '../utils/getInvestmentTag';
import TagBadge from '../components/TagBadge';

export default function IndustryDashboard() {
  const { industry } = useParams();

  const [data, setData] = useState(null); 
  const [companies, setCompanies] = useState([]); 
  const [sectorEval, setSectorEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAllIndustryData = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const encodedIndustry = encodeURIComponent(industry);

        const [industryRes, sectorRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/industry/${encodedIndustry}`),
          fetch(`${API_BASE_URL}/api/sector/${encodedIndustry}`)
        ]);

        if (!industryRes.ok && !sectorRes.ok) throw new Error('Industry data not found');

        const industryJson = industryRes.ok ? await industryRes.json() : {};
        const sectorJson = sectorRes.ok ? await sectorRes.json() : null;

        // =========================================================================
        // 100% BULLETPROOF SYNC: Extract companies directly from the Peer Evaluator output
        // =========================================================================
        let mappedCompanies = [];
        if (sectorJson && sectorJson.rankings && sectorJson.rankings.fundamental_investor) {
          // This array comes directly from peer_evaluator.py line 105
          mappedCompanies = sectorJson.rankings.fundamental_investor.map(c => ({
            symbol: c.company,
            fundamental_score: c.score,
            z_score: c.z_score,
            rank: c.rank
          }));
        }

        // Sort mathematically descending by Z-Score just to be absolutely certain
        mappedCompanies.sort((a, b) => {
          const scoreA = Number(a.z_score ?? a.fundamental_score ?? -999);
          const scoreB = Number(b.z_score ?? b.fundamental_score ?? -999);
          return scoreB - scoreA;
        });

        setData(industryJson);
        setCompanies(mappedCompanies); 
        setSectorEval(sectorJson);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    fetchAllIndustryData();
  }, [industry]);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Industry Dashboard...</div>;
  if (error || !data) return <div className="p-10 text-center text-red-400">Industry data not found.</div>;

  // --- Formatting Helpers ---
const formatZ = (val) => {
    if (val === null || val === undefined) return 'N/A';
    const num = Number(val);
    return num > 0 ? `+${num.toFixed(4)}` : num.toFixed(4);
  };

  const getMetricColor = (val) => {
    if (val === null || val === undefined) return 'text-gray-400';
    return Number(val) > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getScore = (val) => (val !== null && val !== undefined ? val : null);

  // --- New AI Logic ---
  const llmZScores = data.llm_z_scores || {};
  const bqZ = getScore(llmZScores.bq_zscore);
  const cyZ = getScore(llmZScores.cy_zscore);
  const rpZ = getScore(llmZScores.rp_zscore);
  const bgZ = getScore(llmZScores.bg_zscore);
  
  const comp = getScore(data.final_industry_zscore);

  const chartData = [
    { name: 'Bus. Quality', value: bqZ !== null ? Number(bqZ) : 0 },
    { name: 'Cyclicality', value: cyZ !== null ? Number(cyZ) : 0 },
    { name: 'Return Profile', value: rpZ !== null ? Number(rpZ) : 0 },
    { name: 'Governance', value: bgZ !== null ? Number(bgZ) : 0 }
  ];

  // Guaranteed Top Company based on the exact same rankings array used in Peer Comparison
  const topCompany = companies.length > 0 ? companies[0] : null;
  
  let dynamicReason = "Top ranked company in sector based on global Z-score evaluation.";
  if (topCompany && sectorEval?.best_performing_company === topCompany.symbol) {
    dynamicReason = sectorEval.best_company_justification || dynamicReason;
  } else if (topCompany && topCompany.z_score !== undefined) {
    dynamicReason = `Mathematically ranked #1 in this sector driven by a Global Z-Score of ${formatZ(topCompany.z_score)}.`;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/" className="text-gray-500 hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="h-4 w-px bg-gray-700"></div>
        <Link to="/industries" className="text-gray-500 hover:text-insight-purple transition-colors flex items-center text-sm font-medium">
          Back to Industries
        </Link>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800 pb-6 relative">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 tracking-tight">{(data.industry || industry).replace(/_/g, ' ')}</h1>
          <div className="flex items-center gap-4 mt-3">
            <span className="bg-insight-blue/10 text-insight-purple px-3 py-1 rounded-md text-sm font-bold border border-insight-blue/20">
              Rank #{data.industry_rank || data.rank || 'N/A'}
            </span>
            <span className="text-sm text-gray-400">
              Industry Z-Score: <span className={`font-mono font-bold ml-1 ${getMetricColor(comp)}`}>{formatZ(comp)}</span>
            </span>
          </div>
        </div>
      </header>

     <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Business Quality Z-Score', val: bqZ },
          { label: 'Cyclicality Z-Score', val: cyZ },
          { label: 'Return Profile Z-Score', val: rpZ }
        ].map((metric, idx) => (
          <div key={idx} className="bg-insight-card border border-gray-800/60 p-5 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-xs tracking-widest uppercase font-bold mb-1">{metric.label}</h3>
              <p className={`text-2xl font-mono font-bold ${getMetricColor(metric.val)}`}>
                {metric.val !== null && metric.val !== undefined ? Number(metric.val) > 0 ? `+${Number(metric.val).toFixed(2)}` : Number(metric.val).toFixed(2) : 'N/A'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${Number(metric.val) > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {Number(metric.val) > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-insight-card p-6 rounded-xl border border-gray-800/60 shadow-sm relative">
          <div className="mb-6">
            <h2 className="text-sm uppercase tracking-widest text-gray-300 font-bold">Dimension Breakdown</h2>
            <p className="text-xs text-gray-500 mt-1">Z-Score standard deviations from market mean</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[-3, 3]} stroke="#666" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} />
               <Tooltip
  // This is the "grey color" cursor that highlights the bar you are over
  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
  contentStyle={{ 
    backgroundColor: '#1f1f2e', // Lighter than pure black for visibility
    borderColor: '#444', 
    borderRadius: '8px', 
    color: '#fff', 
    fontSize: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
  }}
  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
  formatter={(value) => [Number(value) > 0 ? `+${Number(value).toFixed(2)}` : Number(value).toFixed(2), 'Z-Score']}
/>
                <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#93C5FD' : '#ef4444'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

{/* TOP PERFORMING COMPANY SPOTLIGHT (Insight-Purple Theme & Centered) */}
        {topCompany && (
          <section className="bg-insight-dark border border-insight-purple/20 rounded-xl p-6 flex flex-col justify-between shadow-md hover:border-insight-purple/40 transition-colors">
            
            {/* Center-aligned Header Section */}
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="flex items-center justify-center gap-1.5 text-insight-purple text-[10px] uppercase tracking-widest font-bold mb-3">
                <Trophy size={14} /> Sector Leader
              </span>
              
              {/* break-all ensures long names like TATACONSUM don't overflow */}
             <Link 
                to={`/company/${topCompany.symbol}`} 
                className="text-4xl font-black text-gray-100 hover:text-insight-purple transition-colors tracking-tight px-2"
              >
                {topCompany.symbol}
              </Link>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Global Z-Score</span>
                <span className="font-mono text-sm text-insight-purple font-bold px-2 py-0.5 bg-insight-purple/10 rounded border border-insight-purple/30">
                  {formatZ(topCompany.z_score)}
                </span>
              </div>
            </div>

            <div className="mb-6">
              {/* Left-aligned Rationale Box for easy reading */}
              <div className="bg-insight-deep rounded-lg p-4 border border-insight-purple/10">
                 <p className="text-sm text-gray-300 leading-relaxed text-left">
                   <span className="text-insight-purple/80 font-black uppercase text-[10px] tracking-[0.2em] block mb-1.5">Rationale</span>
                   {dynamicReason}
                 </p>
              </div>
            </div>

            <div>
              {/* Hollow Pill Button using insight-purple */}
              <Link 
                to={`/company/${topCompany.symbol}/peers`}
                className="group w-full flex items-center justify-between px-6 py-3.5 bg-transparent hover:bg-insight-purple/10 border border-insight-purple/30 hover:border-insight-purple/60 rounded-full transition-all"
              >
                <span className="text-xs font-bold text-insight-purple uppercase tracking-widest transition-colors">View Sector Leaderboard</span>
                <ArrowRight size={16} className="text-insight-purple group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* <section className="bg-insight-card p-6 rounded-xl border border-gray-800/60 shadow-sm">
        <h2 className="text-sm uppercase tracking-widest text-gray-300 font-bold mb-5 flex items-center gap-2">
          <Info size={16} className="text-insight-purple" />
          Understanding the Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50">
            <h4 className="text-gray-200 font-bold text-sm mb-2">Revenue Health (20%)</h4>
            <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
              <li>• <strong className="text-gray-300">OPM (30%)</strong>: Profit per dollar of sales</li>
              <li>• <strong className="text-gray-300">ROE (35%)</strong>: Profit relative to equity</li>
              <li>• <strong className="text-gray-300">ROCE (35%)</strong>: Capital return efficiency</li>
            </ul>
          </div>
          <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50">
            <h4 className="text-gray-200 font-bold text-sm mb-2">Growth (20%)</h4>
            <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
              <li>• <strong className="text-gray-300">YoY Sales</strong>: Revenue expansion</li>
              <li>• <strong className="text-gray-300">YoY Profit</strong>: Bottom-line expansion</li>
              <li className="pt-1 italic text-gray-500">Averaged & normalized.</li>
            </ul>
          </div>
          <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50">
            <h4 className="text-gray-200 font-bold text-sm mb-2">Investment Safety (20%)</h4>
            <ul className="text-gray-400 text-xs space-y-1.5 leading-relaxed">
              <li>• <strong className="text-gray-300">Debt/Equity (30%)</strong>: Leverage risk</li>
              <li>• <strong className="text-gray-300">Current Ratio (25%)</strong>: Liquidity</li>
              <li>• <strong className="text-gray-300">Interest Cov. (25%)</strong>: Debt service</li>
              <li>• <strong className="text-gray-300">Gov. Flags (20%)</strong>: Risk indicators</li>
            </ul>
          </div>
          <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50">
            <h4 className="text-gray-200 font-bold text-sm mb-2">AI Composite (25%)</h4>
            <p className="text-gray-400 text-xs leading-relaxed mb-2">Average of 4 proprietary AI signals:</p>
            <ul className="text-gray-400 text-xs space-y-1 leading-relaxed">
              <li>• Business Quality (BQ)</li>
              <li>• Cyclicality (CY)</li>
              <li>• Return Profile (RP) & Governance (BG)</li>
            </ul>
          </div>
        </div>
        <div className="bg-insight-blue/5 p-4 rounded-xl border border-insight-blue/10 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <h4 className="text-insight-purple font-bold text-sm mb-1">Final Industry Score</h4>
            <p className="text-gray-300 text-xs leading-relaxed">
              All 5 dimensions are Z-score normalized separately, then weighted averaged, and re-normalized to a final -3 to +3 range. This ensures each industry gets a comparable score reflecting its overall health.
            </p>
          </div>
        </div>
      </section> */}
    </div>
  );
}