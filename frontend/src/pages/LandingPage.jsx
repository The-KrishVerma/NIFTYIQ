import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { fetchIndustrySummary, fetchTopPerformers } from '../utils/dataFetcher';
import { Globe, LayoutGrid, Building2, Swords } from 'lucide-react';

export default function LandingPage() {
  const [topIndustries, setTopIndustries] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);

  useEffect(() => {
    // Fetch Top Industries
    fetchIndustrySummary()
      .then(res => {
        const arr = res.rankings || [];
        arr.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        setTopIndustries(arr.slice(0, 5));
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
          industry: (c.industry || c.business_overview?.industry_position || 'N/A').replace(/_/g, ' ')
        }));
        setTopCompanies(formatted);
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
  <div className="min-h-screen flex flex-col items-center pt-24 pb-16 px-4 md:px-8 bg-insight-black text-insight-text">

    {/* 1. Hero Section */}
    <div className="text-center max-w-3xl w-full mb-20 mt-10">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
  <span className="bg-gradient-to-r from-insight-blue via-insight-blue-soft to-insight-blue-lighter text-transparent bg-clip-text">
    NIFTYIQ
  </span>
</h1>

      <p className="text-insight-text text-lg md:text-xl mb-10 font-medium mt-6">
        Relative Stock Intelligence Platform
      </p>

      <div className="flex justify-center w-full px-4">
  <SearchBar className="w-full max-w-3xl h-14 text-base rounded-lg focus:ring-1 focus:ring-insight-blue-soft" />
</div>
    </div>

    {/* 2. Explore Section */}
    <section className="max-w-6xl w-full mb-20">
  <h2 className="text-sm uppercase tracking-widest text-insight-muted font-semibold mb-8 text-center">
    Explore Analysis
  </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Index */}
        <div className="bg-insight-card border border-insight-border rounded-xl p-6 flex flex-col justify-between hover:border-insight-blue-soft/40 transition duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-insight-blue" />
              <h3 className="text-lg font-semibold text-insight-text">Index Leaderboard</h3>
            </div>
            <p className="text-insight-text text-sm mb-6">
              Compare companies globally using standardized Z-Scores.
            </p>
          </div>
          <Link
            to="/index"
            className="text-sm font-medium text-insight-blue-soft hover:underline self-start"
          >
            View Index →
          </Link>
        </div>

        {/* Industry */}
        <div className="bg-insight-card border border-insight-border rounded-xl p-6 flex flex-col justify-between hover:border-insight-blue-soft/40 transition duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid size={16} className="text-insight-blue" />
              <h3 className="text-lg font-semibold text-insight-text">Industries</h3>
            </div>
            <p className="text-insight-text text-sm mb-6">
              Explore sector-level insights and rankings.
            </p>
          </div>
          <Link
            to="/industries"
            className="text-sm font-medium text-insight-blue-soft hover:underline self-start"
          >
            View Industries →
          </Link>
        </div>

        {/* Watchlist */}
        <div className="bg-insight-card border border-insight-border rounded-xl p-6 flex flex-col justify-between hover:border-insight-blue-soft/40 transition duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-insight-blue">⭐</span>
              <h3 className="text-lg font-semibold text-insight-text">Watchlist</h3>
            </div>
            <p className="text-insight-text text-sm mb-6">
              Track your starred companies and quick-access their reports.
            </p>
          </div>
          <Link
            to="/watchlist"
            className="text-sm font-medium text-insight-blue-soft hover:underline self-start"
          >
            View Watchlist →
          </Link>
        </div>

        {/* Compare */}
        <div className="bg-insight-card border border-insight-border rounded-xl p-6 flex flex-col justify-between hover:border-insight-blue-soft/40 transition duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Swords size={16} className="text-insight-blue" />
              <h3 className="text-lg font-semibold text-insight-text">Compare</h3>
            </div>
            <p className="text-insight-text text-sm mb-6">
              Head-to-head AI verdict between two competitors.
            </p>
          </div>
          <Link
            to="/compare"
            className="text-sm font-medium text-insight-blue-soft hover:underline self-start"
          >
            Start Battle →
          </Link>
        </div>

      </div>
    </section>

    {/* 3. Quick Access */}
    <section className="max-w-6xl w-full"> {/* Changed from max-w-5xl to 6xl */}
  <h2 className="text-sm uppercase tracking-widest text-insight-muted font-semibold mb-8 text-center">
    Quick Access
  </h2>

      {/* Top Companies */}
      <div className="mb-12">
        <h3 className="text-base font-semibold mb-4 text-insight-text">Top Companies</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {topCompanies.map((company, idx) => (
           <Link
  key={idx}
  to={`/company/${company.ticker}`}
  className="bg-insight-card border border-insight-border rounded-xl p-6 min-h-[120px] flex flex-col justify-center text-center hover:border-insight-blue/50 transition duration-300 shadow-sm hover:shadow-md"
>
  <div className="font-mono font-semibold text-base text-insight-text mb-2">
    {company.ticker}
  </div>
  <div className="text-xs text-insight-muted line-clamp-2">
    {company.industry}
  </div>
</Link>
          ))}
        </div>
      </div>

      {/* Top Industries */}
      {topIndustries.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-4 text-insight-muted">
            Top Ranked Industries
          </h3>

         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {topIndustries.map((ind, idx) => (
              <Link
                key={idx}
                to={`/industry/${encodeURIComponent(ind.industry)}`}
                // Reduced padding to p-4 and min-height to 90px
                className="bg-insight-card border border-insight-border rounded-xl p-4 min-h-[90px] flex flex-col justify-between hover:border-insight-blue/50 transition duration-300 shadow-sm hover:shadow-md"
              >
                <div className="text-sm font-semibold mb-2 line-clamp-2 text-insight-text">
                  {ind.industry.replace(/_/g, ' ')}
                </div>

                <div className="flex justify-between items-end text-xs text-insight-muted mt-auto">
                  <span>
                    Z-Score: <span className="text-insight-blue-soft font-mono font-medium ml-1">
                      {ind.final_industry_zscore !== undefined ? ind.final_industry_zscore.toFixed(4) : 'N/A'}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </section>
  </div>
);
}