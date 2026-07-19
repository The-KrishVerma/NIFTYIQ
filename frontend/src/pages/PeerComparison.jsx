import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchAllSectors, fetchQualitativeAnalysis } from '../utils/dataFetcher';

export default function PeerComparison() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [peerData, setPeerData] = useState([]);
  const [industryName, setIndustryName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const symbolUpper = symbol.toUpperCase();

    fetchAllSectors().then(async (sectors) => {
      const foundIndustry = sectors.find(ind => 
        ind?.rankings?.fundamental_investor?.some(c => c.company === symbolUpper)
      );

      if (!foundIndustry || !foundIndustry.rankings?.fundamental_investor) {
        setLoading(false);
        return;
      }

      setIndustryName(foundIndustry.name || foundIndustry.industry);
      const rawPeers = foundIndustry.rankings.fundamental_investor;

      const detailedPeers = await Promise.all(
        rawPeers.map(async (peer) => {
          try {
            const companyData = await fetchQualitativeAnalysis(peer.company);
            return {
              symbol: peer.company,
              fundamental_score: companyData.fundamental_score || peer.score || 0,
              z_score: companyData.z_score || 0,
            };
          } catch (err) {
            return null;
          }
        })
      );

      setPeerData(detailedPeers.filter(Boolean));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [symbol]);

  const displayData = useMemo(() => {
    if (!peerData.length) return [];
    const sorted = [...peerData].sort((a, b) => b.fundamental_score - a.fundamental_score);
    
    const total = sorted.length;
    const topCount = Math.max(2, Math.ceil(total * 0.20)); 
    const midCount = Math.ceil(total * 0.50);

    return sorted.map((item, index) => {
      let status = 'Avoid';
      let colorClass = 'text-red-400 border-red-500/20 bg-red-500/5';
      
      if (index < topCount) {
        status = 'Dash Pick';
        colorClass = 'text-green-400 border-green-500/20 bg-green-500/5';
      } else if (index < topCount + midCount) {
        status = 'Watchlist';
        colorClass = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      }
      
      return { ...item, status, colorClass, rank: index + 1 };
    });
  }, [peerData]);

  if (loading) return <div className="p-20 text-center text-gray-500">Loading Peer Data...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 fade-in">
      
      {/* Clean Navigation Links with proper Encoding */}
      <nav className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-2 tracking-wider">
  <Link to="/" className="flex items-center gap-1 hover:text-insight-blue transition-colors">
    <ArrowLeft size={14} /> Back to Home
  </Link>
  
  {/* The rest of your commented out code remains the same */}
  {/* {industryName && ( */}
    <>
    {/* //   <span>/</span>
    //   {/* FIX: Use encodeURIComponent so names like "Iron & Steel" don't break the URL */}
    {/* //   <Link to={`/industry/${encodeURIComponent(industryName)}`} className="hover:text-insight-blue transition-colors">
        {industryName} Sector
      </Link> */} 
    </>
  {/* )} */}
  
  {/* <span>/</span> */}
  {/* <Link to={`/company/${symbol}`} className="text-insight-blue font-bold">
    {symbol} Analysis
  </Link> */}
</nav>

      {/* Simplified Header */}
      <div className="pb-2">
        <h1 className="text-3xl font-bold text-gray-100">Peer Leaderboard</h1>
      </div>

      {/* Clean Table Container */}
      <section className="bg-insight-card rounded-xl border border-gray-800 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/40 border-b border-gray-700 font-mono">
                <th className="px-6 py-4 text-[15px] font-bold uppercase text-gray-400 tracking-widest w-20 text-center border-r border-gray-700">Rank</th>
                <th className="px-6 py-4 text-[15px] font-bold uppercase text-gray-400 tracking-widest">Company</th>
                <th className="px-6 py-4 text-[15px] font-bold uppercase text-gray-400 tracking-widest">Status</th>
                <th className="px-6 py-4 text-[15px] font-bold uppercase text-gray-400 tracking-widest text-right">Fund. Score</th>
                <th className="px-6 py-4 text-[15px] font-bold uppercase text-gray-400 tracking-widest text-right">Z-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {displayData.map((comp) => (
                <tr 
                  key={comp.symbol} 
                  onClick={() => navigate(`/company/${comp.symbol}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-800/50"
                >
                  <td className="px-6 py-4 text-center font-mono text-gray-400 border-r border-gray-800 text-xs">
                    {comp.rank}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-100">{comp.symbol}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase border ${comp.colorClass}`}>
                      {comp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-insight-purple font-semibold">
                    {comp.fundamental_score?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-gray-400 text-xs">
                    {comp.z_score.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}