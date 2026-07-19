import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWatchlist } from '../utils/watchlistStore';
import { fetchIndexScores } from '../utils/dataFetcher';

export default function Watchlist() {
  const [watchlisted, setWatchlisted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchlist()
      .then(symbols => {
        if (symbols.length === 0) {
          setLoading(false);
          return;
        }

        fetchIndexScores()
          .then(data => {
            const filtered = data.filter(c => symbols.includes(c.symbol));
            setWatchlisted(filtered);
            setLoading(false);
          })
          .catch(err => {
            console.error(err);
            setLoading(false);
          });
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-insight-black text-insight-text">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-insight-muted hover:text-insight-text transition">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-insight-text">
            My Watchlist
          </h1>
        </div>

        {loading ? (
          <div className="text-insight-muted animate-pulse">Loading watchlist...</div>
        ) : watchlisted.length === 0 ? (
          <div className="bg-insight-card border border-insight-border rounded-xl p-8 text-center text-insight-muted">
            You haven't starred any companies yet!
            <div className="mt-4">
              <Link to="/" className="text-insight-blue-soft hover:underline">
                Go back to search
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {watchlisted.map((company, idx) => (
              <Link
                key={idx}
                to={`/company/${company.symbol}`}
                className="bg-insight-card border border-insight-border rounded-xl p-6 min-h-[120px] flex flex-col justify-center text-center hover:border-insight-blue/50 transition duration-300 shadow-sm hover:shadow-md"
              >
                <div className="font-mono font-semibold text-base text-insight-text mb-2">
                  {company.symbol}
                </div>
                <div className="text-xs text-insight-muted line-clamp-2">
                  {company.industry ? company.industry.replace(/_/g, ' ') : 'N/A'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
