import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Scale } from 'lucide-react';
import { fetchAllSectors, fetchQualitativeAnalysis, compareCompanies, fetchAllCompanies } from '../utils/dataFetcher';
import companyNames from '../utils/companyNames.json';

export default function PeerComparison() {
  const { symbol } = useParams();
  
  // State
  const [baseCompany, setBaseCompany] = useState(null);
  const [peerList, setPeerList] = useState([]);
  const [industryName, setIndustryName] = useState('');
  
  const [selectedPeerSymbol, setSelectedPeerSymbol] = useState('');
  const [peerCompany, setPeerCompany] = useState(null);
  
  const [aiVerdict, setAiVerdict] = useState('');
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [comparingLoading, setComparingLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load: Fetch anchor company & peer list
  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        const sym = symbol.toUpperCase();
        
        // Fetch base company
        const baseData = await fetchQualitativeAnalysis(sym);
        setBaseCompany(baseData);
        
        // Fetch all sectors to find peers
        const sectors = await fetchAllSectors();
        const foundIndustry = sectors.find(ind => 
          ind?.rankings?.fundamental_investor?.some(c => c.company === sym)
        );
        
        if (foundIndustry && foundIndustry.rankings?.fundamental_investor) {
          setIndustryName(foundIndustry.name || foundIndustry.industry);
          // Fetch valid companies list to filter peers
          const validCompanies = await fetchAllCompanies();
          
          // Filter out the base company AND only keep those in validCompanies
          const peers = foundIndustry.rankings.fundamental_investor
            .map(p => p.company)
            .filter(c => c !== sym && validCompanies.includes(c));
          setPeerList(peers);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load company or industry data.");
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [symbol]);

  // 2. When a peer is selected, fetch the peer's data AND the AI verdict
  useEffect(() => {
    if (!selectedPeerSymbol) return;
    
    const fetchComparison = async () => {
      try {
        setComparingLoading(true);
        setAiVerdict('');
        
        // Fetch peer data
        const peerData = await fetchQualitativeAnalysis(selectedPeerSymbol);
        setPeerCompany(peerData);
        
        // Fetch AI verdict
        try {
          const verdictResponse = await compareCompanies(symbol, selectedPeerSymbol);
          setAiVerdict(verdictResponse.verdict || "No verdict returned.");
        } catch (vErr) {
          console.error(vErr);
          setAiVerdict("Could not generate AI verdict at this time.");
        }
        
      } catch (err) {
        console.error(err);
        setPeerCompany(null);
      } finally {
        setComparingLoading(false);
      }
    };
    
    fetchComparison();
  }, [selectedPeerSymbol, symbol]);

  // Helpers
  const formatZ = (val) => {
    if (val === null || val === undefined) return 'N/A';
    const num = Number(val);
    return num > 0 ? `+${num.toFixed(4)}` : num.toFixed(4);
  };
  
  // Renders a side-by-side metric row
  const renderMetricRow = (label, getBaseVal, getPeerVal, formatType = 'number') => {
    if (!baseCompany || !peerCompany) return null;
    
    const baseValRaw = getBaseVal(baseCompany);
    const peerValRaw = getPeerVal(peerCompany);
    
    let baseDisplay = baseValRaw !== null && baseValRaw !== undefined ? baseValRaw : '—';
    let peerDisplay = peerValRaw !== null && peerValRaw !== undefined ? peerValRaw : '—';
    
    if (formatType === 'percent' && baseValRaw != null) baseDisplay = (baseValRaw * 100).toFixed(2) + '%';
    if (formatType === 'percent' && peerValRaw != null) peerDisplay = (peerValRaw * 100).toFixed(2) + '%';
    
    if (formatType === 'zscore' && baseValRaw != null) baseDisplay = formatZ(baseValRaw);
    if (formatType === 'zscore' && peerValRaw != null) peerDisplay = formatZ(peerValRaw);
    
    // Determine which is better (assuming higher is better for these metrics)
    // Note: For Debt to Equity, lower is better.
    let baseIsBetter = baseValRaw > peerValRaw;
    let peerIsBetter = peerValRaw > baseValRaw;
    
    if (label === 'Debt to Equity') {
      baseIsBetter = baseValRaw < peerValRaw;
      peerIsBetter = peerValRaw < baseValRaw;
    }
    
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0 hover:bg-white/[0.02] transition-colors px-2 rounded-lg">
        <div className={`w-1/3 text-left font-mono font-bold text-lg ${baseIsBetter ? 'text-insight-blue' : 'text-gray-400'}`}>
          {baseDisplay}
        </div>
        <div className="w-1/3 text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
          {label}
        </div>
        <div className={`w-1/3 text-right font-mono font-bold text-lg ${peerIsBetter ? 'text-insight-purple' : 'text-gray-400'}`}>
          {peerDisplay}
        </div>
      </div>
    );
  };

  if (initialLoading) return <div className="p-20 text-center text-gray-500">Loading initial data...</div>;
  if (error) return <div className="p-20 text-center text-red-500">{error}</div>;
  if (!baseCompany) return <div className="p-20 text-center text-gray-500">Company not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 fade-in">
      {/* Navigation */}
      <nav className="flex items-center justify-between text-xs font-medium text-gray-500 mb-6 tracking-wider">
        <Link to={`/company/${symbol}`} className="flex items-center gap-1 hover:text-insight-blue transition-colors">
          <ArrowLeft size={14} /> Back to {symbol}
        </Link>
        {industryName && (
          <span className="bg-insight-deep px-3 py-1 rounded-full border border-gray-800">
            Sector: <span className="text-gray-300">{industryName.replace(/_/g, ' ')}</span>
          </span>
        )}
      </nav>

      {/* Header & Competitor Selection */}
      <header className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-b-0">
        <div className="w-full md:w-5/12 text-center md:text-left">
          <span className="text-insight-blue text-xs font-bold uppercase tracking-widest mb-1 block">Anchor</span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{companyNames[symbol.toUpperCase()] || symbol.toUpperCase()}</h1>
        </div>
        
        <div className="w-full md:w-2/12 flex justify-center">
           <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-insight-blue/20 to-insight-purple/20 border border-white/10 flex items-center justify-center text-gray-400 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
             <span className="font-black italic text-xl text-white">VS</span>
           </div>
        </div>
        
        <div className="w-full md:w-5/12 text-center md:text-right">
          <span className="text-insight-purple text-xs font-bold uppercase tracking-widest mb-1 block">Competitor</span>
          <div className="relative inline-block text-left w-full max-w-[200px] md:ml-auto">
            <select
              value={selectedPeerSymbol}
              onChange={(e) => setSelectedPeerSymbol(e.target.value)}
              className="block w-full appearance-none bg-insight-deep border border-insight-purple/40 hover:border-insight-purple text-white py-3 px-4 pr-10 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-insight-purple font-bold tracking-widest text-center transition-all cursor-pointer"
            >
              <option value="" disabled>Select Peer</option>
              {peerList.map(peer => (
                <option key={peer} value={peer}>{peer}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-insight-purple">
              <ChevronDown size={16} strokeWidth={3} />
            </div>
          </div>
        </div>
      </header>

      {/* Comparison Area */}
      {!selectedPeerSymbol ? (
        <div className="text-center py-20 bg-insight-card/50 rounded-2xl border border-gray-800 border-dashed">
          <Scale size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">Select a competitor from the dropdown above to begin the head-to-head analysis.</p>
        </div>
      ) : comparingLoading ? (
        <div className="p-20 text-center">
          <div className="animate-spin-slow inline-block mb-4">
             <Scale size={48} className="text-insight-blue/50" />
          </div>
          <div className="text-gray-400 font-medium tracking-widest uppercase text-sm animate-pulse">Running AI Comparison...</div>
        </div>
      ) : peerCompany && (
        <div className="space-y-6 fade-in">
          
          {/* Main Grid: Quantitative & Qualitative */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Core AI Evaluation */}
            <section className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 text-center">Core AI Scores</h2>
              
              <div className="space-y-1">
                {renderMetricRow('Fundamental Score', 
                  c => c.fundamental_score ? Number(c.fundamental_score).toFixed(2) : ((
                    (c.business_quality_signals?.BQ || 0) + (c.return_profile_signals?.RP || 0) +
                    (c.cyclicality_signals?.CY || 0) + (c.governance_signals?.BG || 0)
                  )/4).toFixed(2), 
                  c => c.fundamental_score ? Number(c.fundamental_score).toFixed(2) : ((
                    (c.business_quality_signals?.BQ || 0) + (c.return_profile_signals?.RP || 0) +
                    (c.cyclicality_signals?.CY || 0) + (c.governance_signals?.BG || 0)
                  )/4).toFixed(2)
                )}
                
                {renderMetricRow('Z-Score', c => c.z_score, c => c.z_score, 'zscore')}
                {renderMetricRow('Business Quality', c => c.business_quality_signals?.BQ, c => c.business_quality_signals?.BQ)}
                {renderMetricRow('Return Profile', c => c.return_profile_signals?.RP, c => c.return_profile_signals?.RP)}
                {renderMetricRow('Cyclicality', c => c.cyclicality_signals?.CY, c => c.cyclicality_signals?.CY)}
                {renderMetricRow('Governance', c => c.governance_signals?.BG, c => c.governance_signals?.BG)}
              </div>
            </section>
            
            {/* Market Snapshot */}
            <section className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 text-center">Market Snapshot</h2>
              
              <div className="space-y-1">
                {renderMetricRow('PE Ratio', c => c.quantitative_data?.Recent?.['Price to Earning'], c => c.quantitative_data?.Recent?.['Price to Earning'])}
                {renderMetricRow('ROE', c => c.quantitative_data?.Recent?.['Return on equity'], c => c.quantitative_data?.Recent?.['Return on equity'], 'percent')}
                {renderMetricRow('ROCE', c => c.quantitative_data?.Recent?.['Return on capital employed'], c => c.quantitative_data?.Recent?.['Return on capital employed'], 'percent')}
                {renderMetricRow('Debt to Equity', c => c.quantitative_data?.Recent?.['Debt to equity'], c => c.quantitative_data?.Recent?.['Debt to equity'])}
                {renderMetricRow('EPS', c => c.quantitative_data?.Recent?.['EPS'], c => c.quantitative_data?.Recent?.['EPS'])}
                {renderMetricRow('Sales Growth', c => c.quantitative_data?.Recent?.['Sales growth'], c => c.quantitative_data?.Recent?.['Sales growth'], 'percent')}
                {renderMetricRow('Profit Growth', c => c.quantitative_data?.Recent?.['Profit growth'], c => c.quantitative_data?.Recent?.['Profit growth'], 'percent')}
                {renderMetricRow('Div. Yield', c => c.quantitative_data?.Recent?.['Dividend yield'], c => c.quantitative_data?.Recent?.['Dividend yield'])}
              </div>
            </section>
          </div>
          
          {/* AI Verdict */}
          {aiVerdict && (
             <section className="bg-gradient-to-r from-insight-blue/10 to-insight-purple/10 border border-insight-blue/20 p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-insight-blue/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-insight-purple/20 blur-[100px] rounded-full pointer-events-none"></div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-insight-blue mb-4 flex items-center gap-2">
                  <Scale size={16} /> AI Verdict
                </h3>
                <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-gray-200" dangerouslySetInnerHTML={{ __html: aiVerdict.replace(/\n/g, '<br/>') }} />
             </section>
          )}
          
        </div>
      )}
    </div>
  );
}