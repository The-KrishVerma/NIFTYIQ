import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Swords, Loader2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import companyNames from '../utils/companyNames.json';

export default function CompareDashboard() {
  const [companies, setCompanies] = useState([]);
  const [sym1, setSym1] = useState('');
  const [sym2, setSym2] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [verdict, setVerdict] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/companies/basic')
      .then(res => res.json())
      .then(data => {
        setCompanies(data);
        if (data.length > 1) {
          setSym1(data[0].symbol);
          setSym2(data[1].symbol);
        }
      })
      .catch(err => console.error("Failed to load basic companies list", err));
  }, []);

  const handleCompare = async () => {
    if (!sym1 || !sym2) {
      setError("Please select two companies.");
      return;
    }
    if (sym1 === sym2) {
      setError("Please select two DIFFERENT companies to compare.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setVerdict(null);
    setData(null);
    
    try {
      const res = await fetch('http://localhost:8000/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [sym1, sym2] })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to compare companies");
      
      setVerdict(json.verdict);
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCompanyColumn = (companyData, symbol) => {
    if (!companyData) return null;
    
    const scores = {
      BQ: companyData.business_quality_signals?.BQ || 0,
      RP: companyData.return_profile_signals?.RP || 0,
      CY: companyData.cyclicality_signals?.CY || 0,
      BG: companyData.governance_signals?.BG || 0,
    };
    
    const recent = companyData.quantitative_data?.Recent || {};
    const finalScore = companyData.fundamental_score 
      ? parseFloat(companyData.fundamental_score).toFixed(2) 
      : ((scores.BQ + scores.RP + scores.CY + scores.BG) / 4).toFixed(2);
      
    const pros = companyData.pros_and_cons?.pros || [];
    const cons = companyData.pros_and_cons?.cons || [];

    return (
      <div className="flex-1 bg-insight-card border border-insight-border rounded-2xl p-6 shadow space-y-6">
        {/* Header */}
        <div className="text-center border-b border-insight-border pb-4">
          <h2 className="text-3xl font-bold text-white mb-1 leading-tight">{companyNames[symbol] || symbol}</h2>
          <p className="text-insight-muted text-sm mt-1">{companyData.business_overview?.industry_position || 'N/A'}</p>
        </div>
        
        {/* Final Score */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-insight-muted font-bold mb-1">Final AI Score</p>
          <p className="text-4xl font-extrabold text-insight-blue">{finalScore}</p>
        </div>
        
        {/* Sub Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-insight-black p-3 rounded-xl border border-insight-border text-center">
            <p className="text-xs text-insight-muted mb-1">Quality</p>
            <p className="font-bold text-white text-lg">{scores.BQ}</p>
          </div>
          <div className="bg-insight-black p-3 rounded-xl border border-insight-border text-center">
            <p className="text-xs text-insight-muted mb-1">Returns</p>
            <p className="font-bold text-white text-lg">{scores.RP}</p>
          </div>
          <div className="bg-insight-black p-3 rounded-xl border border-insight-border text-center">
            <p className="text-xs text-insight-muted mb-1">Stability (CY)</p>
            <p className="font-bold text-white text-lg">{scores.CY}</p>
          </div>
          <div className="bg-insight-black p-3 rounded-xl border border-insight-border text-center">
            <p className="text-xs text-insight-muted mb-1">Governance</p>
            <p className="font-bold text-white text-lg">{scores.BG}</p>
          </div>
        </div>
        
        {/* Hard Numbers */}
        <div>
          <p className="text-xs uppercase tracking-widest text-insight-muted font-bold mb-3 border-b border-insight-border pb-2">Quantitative Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            {recent['Price to Earning'] != null && <MetricCard label="PE Ratio" value={recent['Price to Earning']} />}
            {recent['Return on equity'] != null && <MetricCard label="ROE" value={(recent['Return on equity'] * 100).toFixed(2) + '%'} />}
            {recent['Debt to equity'] != null && <MetricCard label="Debt/Equity" value={recent['Debt to equity']} />}
            {recent['Sales growth'] != null && <MetricCard label="Sales Growth" value={(recent['Sales growth'] * 100).toFixed(2) + '%'} />}
          </div>
        </div>
        
        {/* Pros & Cons */}
        <div>
          <p className="text-xs uppercase tracking-widest text-insight-muted font-bold mb-3 border-b border-insight-border pb-2">Qualitative Traits</p>
          {pros.length > 0 && (
            <div className="mb-4">
              <p className="text-green-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Pros</p>
              <ul className="space-y-1.5 text-xs text-insight-text">
                {pros.slice(0, 3).map((p, i) => <li key={i} className="line-clamp-2 leading-relaxed">• {p}</li>)}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <p className="text-red-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Cons</p>
              <ul className="space-y-1.5 text-xs text-insight-text">
                {cons.slice(0, 3).map((c, i) => <li key={i} className="line-clamp-2 leading-relaxed">• {c}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 fade-in min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="text-insight-muted hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
      
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
          <Swords className="text-insight-blue" size={40} />
          Comparative Analysis
        </h1>
        <p className="text-insight-muted max-w-2xl mx-auto">
          Select two companies to evaluate their relative strengths. The AI model will provide a comparative analysis based on qualitative moats and quantitative metrics.
        </p>
      </div>
      
      {/* Selection Controls */}
      <div className="bg-insight-card border border-insight-border p-6 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-6 shadow">
        <select 
          value={sym1} 
          onChange={(e) => setSym1(e.target.value)}
          className="bg-insight-black border border-insight-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-insight-blue w-full md:w-64"
        >
          {companies.map(c => <option key={`1-${c.symbol}`} value={c.symbol}>{companyNames[c.symbol] || c.symbol}</option>)}
        </select>
        
        <span className="text-2xl font-black text-insight-blue-soft italic">VS</span>
        
        <select 
          value={sym2} 
          onChange={(e) => setSym2(e.target.value)}
          className="bg-insight-black border border-insight-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-insight-blue w-full md:w-64"
        >
          {companies.map(c => <option key={`2-${c.symbol}`} value={c.symbol}>{companyNames[c.symbol] || c.symbol}</option>)}
        </select>
        
        <button 
          onClick={handleCompare}
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-insight-blue hover:bg-insight-blue-soft text-white rounded-lg font-bold tracking-wide transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : "Compare"}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">
          {error}
        </div>
      )}
      
      {/* Verdict & Data */}
      {data && verdict && (
        <div className="space-y-8 animate-fade-in-up">
          {/* AI Verdict Hero */}
          <div className="relative bg-gradient-to-br from-insight-black to-insight-card border border-insight-blue/30 p-8 md:p-10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-insight-blue/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <h3 className="text-xl md:text-2xl font-bold text-insight-blue mb-6 flex items-center gap-2">
              Comparative Verdict
            </h3>
            
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:text-lg prose-p:text-gray-200">
              {/* Simple markdown render by splitting on newlines and mapping to paragraphs */}
              {verdict.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                <p key={idx}>{paragraph.replace(/\*\*(.*?)\*\*/g, '$1') /* strip basic bold formatting */}</p>
              ))}
            </div>
          </div>
          
          {/* Side by Side Data */}
          <div className="flex flex-col md:flex-row gap-6">
            {renderCompanyColumn(data[sym1], sym1)}
            {renderCompanyColumn(data[sym2], sym2)}
          </div>
        </div>
      )}
    </div>
  );
}
