const API_BASE_URL = 'http://localhost:8000';

const getUserIdParam = () => {
  const userId = localStorage.getItem('niftyiq_user');
  return userId ? `?user_id=${encodeURIComponent(userId)}` : '';
};

export const getWatchlist = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist${getUserIdParam()}`);
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const addToWatchlist = async (symbol) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist/${symbol}${getUserIdParam()}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add to watchlist');
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const removeFromWatchlist = async (symbol) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/watchlist/${symbol}${getUserIdParam()}`, { method: 'DELETE' });
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
