const CACHE_PREFIX = 'pagr-page:';
const CACHE_MAX = 20;

function cacheGet(slug) {
  try {
    return JSON.parse(localStorage.getItem(CACHE_PREFIX + slug));
  } catch (err) {
    return null;
  }
}

function cacheSet(slug, page) {
  try {
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ ...page, at: Date.now() }));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length > CACHE_MAX) {
      keys
        .map(k => [k, JSON.parse(localStorage.getItem(k)).at])
        .sort((a, b) => a[1] - b[1]) 
        .slice(0, keys.length - CACHE_MAX)
        .forEach(([k]) => localStorage.removeItem(k));
    }
  } catch (err) {}
}
function cacheDrop(slug) {
  try {
    localStorage.removeItem(CACHE_PREFIX + slug);
  } catch (err) {}
}