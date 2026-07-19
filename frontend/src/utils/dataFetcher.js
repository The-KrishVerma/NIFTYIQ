const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

export async function fetchIndustrySummary() {
  const res = await fetch(`${API_BASE_URL}/api/industry-summary`);
  if (!res.ok) throw new Error('Failed to fetch industry summary');
  return res.json();
}

export async function fetchQualitativeAnalysis(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const res = await fetch(`${API_BASE_URL}/api/company/${symbolUpper}`);
  if (!res.ok) throw new Error(`Failed to fetch qualitative analysis for ${symbolUpper}`);
  return res.json();
}

export async function fetchAllSectors() {
  const res = await fetch(`${API_BASE_URL}/api/sectors`);
  if (!res.ok) throw new Error('Failed to fetch sectors');
  return res.json();
}

export async function fetchAllCompanies() {
  const res = await fetch(`${API_BASE_URL}/api/companies`);
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
}

export async function fetchIndexScores() {
  const res = await fetch(`${API_BASE_URL}/api/index-scores`);
  if (!res.ok) throw new Error('Failed to fetch index scores');
  return res.json();
}

export async function fetchTopPerformers() {
  const res = await fetch(`${API_BASE_URL}/api/top-performers`);
  if (!res.ok) throw new Error('Failed to fetch top performers');
  return res.json();
}

/**
 * Fetches top 3 live news articles for a given symbol from Yahoo Finance via the backend.
 * Returns an array of { title, link, publisher, published_at } objects.
 * Returns [] on any failure — caller should handle empty gracefully.
 */
export async function fetchLiveNews(symbol) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/news/${symbol.toUpperCase()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.news || [];
  } catch {
    return [];
  }
}

export async function triggerPipeline(symbol) {
  const res = await fetch(`${API_BASE_URL}/api/pipeline/${symbol.toUpperCase()}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to trigger pipeline');
  return res.json();
}