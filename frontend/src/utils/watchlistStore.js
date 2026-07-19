const API_BASE_URL = 'http://localhost:8000';

export const getWatchlist = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist`);
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const addToWatchlist = async (symbol) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist/${symbol}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add to watchlist');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const removeFromWatchlist = async (symbol) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist/${symbol}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove from watchlist');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const isWatchlisted = async (symbol) => {
  const current = await getWatchlist();
  return current.includes(symbol);
};
