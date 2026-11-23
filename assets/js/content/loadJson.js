/**
 * Loads JSON over HTTP with simple in-memory caching.
 * Requires serving the site over http(s); file:// may block fetch.
 */

const cache = new Map();

export async function loadJson(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }

  const data = await response.json();
  cache.set(url, data);
  return data;
}

export function clearJsonCache() {
  cache.clear();
}
