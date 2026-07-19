import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { fetchIndustrySummary, fetchTopPerformers } from '../utils/dataFetcher';
import { Globe, LayoutGrid, Building2, Swords } from 'lucide-react';
import companyNames from '../utils/companyNames.json';

export default function LandingPage() {
  const [topIndustries, setTopIndustries] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);

  useEffect(() => {
    // Fetch Top Industries
    fetchIndustrySummary()
      .then(res => {
        const arr = res.rankings || [];
        arr.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        setTopIndustries(arr.slice(0, 4));
      })
      .catch(console.error);

    // Fetch Top Companies dynamically
    fetchTopPerformers()
      .then(data => {
        if (!data || !Array.isArray(data)) {
          console.warn("Top performers API returned invalid data:", data);
          return;
        }
        const formatted = data.map(c => ({
          ticker: c.symbol,
          industry: (c.industry || c.business_overview?.industry_position || 'N/A').replace(/_/g, ' '),
          zScore: c.z_score
        }));
        setTopCompanies(formatted.slice(0, 4));
      })
      .catch(err => console.error("Failed to fetch top performers:", err));
  }, []); // useEffect ends here correctly

  // Move this function outside of useEffect so the button can see it
  const handleFocusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const input = document.getElementById('search'); // Ensure SearchBar component has id="search"
    if (input) input.focus();
  };

  // The component return must be out here
  return (
    <div className="min-h-screen flex flex-col items-center pt-24 pb-4 px-4 md:px-8 relative overflow-hidden">
      
      {/* Animated Background Orbs */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-insight-blue/20 rounded-full blur-[100px] pointer-events-none animate-float" />
      <div className="absolute top-60 -right-20 w-96 h-96 bg-insight-purple/20 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

      {/* 1. Hero Section */}
      <div className="text-center max-w-3xl w-full mb-10 mt-10 relative z-10">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">
          <span className="bg-gradient-to-r from-insight-blue via-insight-purple to-pink-500 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            NIFTYIQ
          </span>
        </h1>

        <p className="text-gray-300 text-lg md:text-xl mb-10 font-light mt-6">
          Relative Stock Intelligence Platform
        </p>

        <div className="flex justify-center w-full px-4">
          <SearchBar className="w-full max-w-3xl h-14 text-base rounded-xl border-white/10 bg-white/5 focus:ring-2 focus:ring-insight-purple backdrop-blur-lg" />
        </div>
      </div>

      {/* NEW: Trending Companies as Center of Attraction */}
      <section className="max-w-6xl w-full mb-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Trending Market Leaders</h2>
            <p className="text-gray-400 text-sm max-w-2xl">
              These companies have achieved the highest composite Z-Scores based on qualitative AI evaluations and quantitative financial metrics.
            </p>
          </div>
          <Link to="/index" className="text-sm font-bold text-insight-blue hover:text-insight-blue-lighter flex items-center gap-1 transition-colors whitespace-nowrap">
            View All Companies <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {topCompanies.map((company, idx) => (
            <Link
              key={idx}
              to={`/company/${company.ticker}`}
              className="glass-card p-6 flex flex-col justify-between hover:border-insight-blue/50 group relative overflow-hidden h-[160px]"
            >
              {/* Subtle accent line on top */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${idx % 2 === 0 ? 'from-insight-blue to-insight-blue-soft' : 'from-insight-purple to-pink-500'}`} />
              
              <div className="flex flex-col gap-1 items-start mb-2">
                <div className="font-bold text-lg text-white group-hover:text-insight-blue transition-colors line-clamp-1 pr-2" title={companyNames[company.ticker] || company.ticker}>
                  {companyNames[company.ticker] || company.ticker}
                </div>
                {company.zScore !== undefined && company.zScore !== null && (
                  <div className="inline-block bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-insight-blue backdrop-blur-md whitespace-nowrap">
                    Z-Score: {company.zScore > 0 ? '+' : ''}{company.zScore.toFixed(2)}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-400 line-clamp-2 mt-auto pr-2 leading-relaxed">
                {company.industry}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* NEW: Top Ranked Industries */}
      {topIndustries.length > 0 && (
        <section className="max-w-6xl w-full mb-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Top Ranked Industries</h2>
              <p className="text-gray-400 text-sm max-w-2xl">
                The strongest performing sectors evaluated across the entire market index.
              </p>
            </div>
            <Link to="/industries" className="text-sm font-bold text-insight-purple hover:text-pink-400 flex items-center gap-1 transition-colors whitespace-nowrap">
              View All Industries <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {topIndustries.map((ind, idx) => (
              <Link
                key={idx}
                to={`/industry/${encodeURIComponent(ind.industry)}`}
                className="glass-card p-6 flex flex-col justify-between hover:border-insight-purple/50 group relative overflow-hidden h-[160px]"
              >
                {/* Subtle accent line on top */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${idx % 2 === 0 ? 'from-insight-purple to-pink-500' : 'from-indigo-500 to-insight-purple'}`} />
                
                <div className="flex flex-col gap-1 items-start mb-2">
                  <div className="font-bold text-lg text-white group-hover:text-insight-purple transition-colors line-clamp-1 pr-2">
                    {ind.industry.replace(/_/g, ' ')}
                  </div>
                  {ind.final_industry_zscore !== undefined && ind.final_industry_zscore !== null && (
                    <div className="inline-block bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-insight-purple backdrop-blur-md whitespace-nowrap">
                      Z-Score: {ind.final_industry_zscore > 0 ? '+' : ''}{ind.final_industry_zscore.toFixed(2)}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-400 line-clamp-2 mt-auto pr-2 leading-relaxed">
                  Leading: {ind.companies?.map(c => companyNames[c] || c).join(', ')}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 2. Explore Section */}
      <section className="max-w-6xl w-full relative z-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Explore Analysis</h2>
          <p className="text-gray-400 text-sm max-w-2xl">
            Dive deeper into the index, compare competitors head-to-head, or access your watchlist.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[220px]">

          {/* Compare - Tall Feature (Spans 2 rows) */}
          <div className="glass-card p-8 flex flex-col justify-between group md:col-span-1 md:row-span-2 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-pink-500/20 transition-colors duration-500" />
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20 transition-colors shadow-inner">
                  <Swords size={28} />
                </div>
                <h3 className="text-xl font-bold text-white">Compare Arena</h3>
              </div>
              <p className="text-gray-400 text-base mb-6 leading-relaxed max-w-sm">
                Step into the arena and generate a head-to-head AI verdict between any two competitors. Discover who holds the ultimate competitive moat.
              </p>
            </div>
            <Link
              to="/compare"
              className="text-base font-bold text-pink-500 hover:text-pink-400 self-start flex items-center gap-2 transition-colors mt-auto"
            >
              Start Battle <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {/* Index - Wide Feature (Spans 2 cols) */}
          <div className="glass-card p-8 flex flex-col justify-between group md:col-span-2 md:row-span-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-insight-blue/5 blur-3xl pointer-events-none group-hover:bg-insight-blue/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-insight-blue/10 text-insight-blue group-hover:bg-insight-blue/20 transition-colors">
                  <Globe size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Global Index Leaderboard</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-lg">
                View the definitive ranking of all evaluated NIFTY companies. Our engine normalizes qualitative AI evaluations and quantitative fundamentals into a single comparative Z-Score.
              </p>
            </div>
            <Link
              to="/index"
              className="relative z-10 text-sm font-bold text-insight-blue hover:text-insight-blue-lighter self-start flex items-center gap-1 transition-colors mt-auto"
            >
              View Index Rankings <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {/* Industry - Standard */}
          <div className="glass-card p-8 flex flex-col justify-between group md:col-span-1 md:row-span-1">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-insight-purple/10 text-insight-purple group-hover:bg-insight-purple/20 transition-colors">
                  <LayoutGrid size={22} />
                </div>
                <h3 className="text-lg font-bold text-white">Industries</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Explore aggregated sector-level insights and identify the strongest sectors in the market.
              </p>
            </div>
            <Link
              to="/industries"
              className="text-sm font-bold text-insight-purple hover:text-pink-400 self-start flex items-center gap-1 transition-colors mt-auto"
            >
              View Industries <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {/* Watchlist - Standard */}
          <div className="glass-card p-8 flex flex-col justify-between group md:col-span-1 md:row-span-1">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20 transition-colors">
                  <span className="text-xl leading-none">⭐</span>
                </div>
                <h3 className="text-lg font-bold text-white">Watchlist</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Track your starred companies and quick-access their intelligence dashboards.
              </p>
            </div>
            <Link
              to="/watchlist"
              className="text-sm font-bold text-yellow-500 hover:text-yellow-400 self-start flex items-center gap-1 transition-colors mt-auto"
            >
              View Watchlist <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}