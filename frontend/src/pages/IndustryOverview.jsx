import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchIndustrySummary } from '../utils/dataFetcher';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', 
  '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9'
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-insight-dark border border-insight-border p-3 rounded-lg shadow-2xl">
        <p className="text-gray-100 font-bold mb-1">{(label || '').replace(/_/g, ' ')}</p>
        <p className="text-insight-purple font-semibold text-sm">
          Z-Score: <span className="text-white ml-1">{payload[0].value.toFixed(2)}</span>
        </p>
        <p className="text-gray-400 text-xs mt-1">Range: -3 (weak) to +3 (strong)</p>
      </div>
    );
  }
  return null;
};

export default function IndustryOverview() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIndustrySummary()
      .then(res => {
        const arr = res.rankings || [];
        arr.sort((a, b) => (a.rank || 0) - (b.rank || 0));
        setData(arr);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Industries...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 fade-in">
      <div className="flex items-center mb-2">
        <Link to="/" className="text-gray-500 hover:text-insight-blue transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">Industry Overview</h1>
        <p className="text-gray-400">Ranking and performance summary of all industries (Z-Score: -3 weak to +3 strong)</p>
      </header>

      {data.length > 0 && (
        <section className="bg-insight-card p-6 rounded-2xl border border-insight-border mb-8 shadow-lg">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-6">Industry Scores</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
  <BarChart 
    data={data} 
    margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
  >

    {/* Softer grid */}
    <CartesianGrid 
      strokeDasharray="2 4" 
      stroke="#1f2937" 
      vertical={false} 
    />

    {/* Clean X axis */}
    <XAxis 
      dataKey="industry"
      tick={false}
      axisLine={{ stroke: '#374151' }}
      tickLine={false}
    />

    {/* Clean Y axis */}
    <YAxis 
      stroke="#9ca3af"
      tick={{ fill: '#9ca3af', fontSize: 11 }}
      tickLine={false}
      axisLine={false}
    />

    {/* Better tooltip */}
    <Tooltip
      cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
      content={<CustomTooltip />}
    />

    {/* Gradient definition (subtle, premium) */}
    <defs>
      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.9}/>
        <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.7}/>
      </linearGradient>
    </defs>

    <Bar
      dataKey="final_industry_zscore"
      radius={[8, 8, 4, 4]}   // smoother top rounding
      barSize={28}            // consistent width
      onClick={(entry) => {
        if (entry && entry.industry) {
          navigate(`/industry/${encodeURIComponent(entry.industry)}`);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {data.map((entry, index) => (
        <Cell 
          key={`cell-${index}`} 
          fill="url(#barGradient)" 
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((ind, idx) => (
          <Link 
            key={idx} 
            to={`/industry/${encodeURIComponent(ind.industry)}`}
            className="group block p-6 bg-gradient-to-br from-insight-card to-insight-dark border border-insight-border rounded-2xl hover:border-insight-blue transition-all">
          
           <div className="flex justify-between items-start mb-4 gap-4">
          <h3 className="text-xl font-bold text-gray-100 group-hover:text-insight-blue transition-colors">
            {ind.industry.replace(/_/g, ' ')}
          </h3>
          
          {/* Added shrink-0 and whitespace-nowrap to prevent the badge from squishing */}
          <span className="shrink-0 whitespace-nowrap bg-insight-blue/20 text-insight-blue text-xs font-bold px-3 py-1 rounded-full border border-insight-blue/30">
            Rank #{ind.rank || idx + 1}
          </span>
        </div>
           <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Z-Score:</span>
              <span className="text-gray-100 font-bold text-lg">
                {ind.final_industry_zscore !== undefined ? ind.final_industry_zscore.toFixed(4) : 'N/A'}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
