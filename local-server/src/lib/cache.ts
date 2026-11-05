/**
 * High-performance instant local cache for WhizPOS.
 * Implements instant-render (0ms delay) with background refresh.
 * Data is immediately restored from memory / localStorage so users never see a blocking loading screen.
 */

const memoryCache = new Map<string, any>();

export function getCachedData<T>(key: string, fallback: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(`whiz_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(key, parsed);
        return parsed as T;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  return fallback;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryCache.set(key, data);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`whiz_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      // Storage quota or private browsing mode
    }
  }
}

export function clearCachedData(key?: string): void {
  if (key) {
    memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`whiz_cache_${key}`);
    }
  } else {
    memoryCache.clear();
  }
}
