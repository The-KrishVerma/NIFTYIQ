// src/utils/getInvestmentTag.js
export const getInvestmentTag = (symbol, peerRankings) => {
  if (!peerRankings?.fundamental_investor) return 'Watchlist';

  const list = [...peerRankings.fundamental_investor];
  
  // Sort by score (higher = better)
  list.sort((a, b) => (b.score || 0) - (a.score || 0));

  const total = list.length;
  if (total === 0) return 'Watchlist';

  // The Math: Top 20% (min 2) are Dash Picks. Next 50% are Watchlist. Bottom 30% are Avoid.
  const top20Count = Math.max(2, Math.ceil(total * 0.20)); 
  const mid50Count = Math.ceil(total * 0.50);

  const companyIndex = list.findIndex(item => item.company === symbol.toUpperCase());

  if (companyIndex === -1) return 'Watchlist';

  if (companyIndex < top20Count) return 'Dash Pick';
  if (companyIndex < top20Count + mid50Count) return 'Watchlist';
  return 'Avoid';
};