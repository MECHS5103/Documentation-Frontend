const CACHE_KEY = 'app_data_cache';

const loadInitialCache = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load cache from localStorage:', e);
  }
  return { toc: {}, pages: {} };
};

export const dataCache = loadInitialCache();

export const saveCache = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dataCache));
  } catch (e) {
    console.warn('Failed to save cache to localStorage:', e);
  }
};

export default dataCache;