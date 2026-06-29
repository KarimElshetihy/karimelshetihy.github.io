/**
 * Loads plain text over HTTP with simple in-memory caching.
 */

const cache = new Map();

export async function loadText(url) {
  const key = String(url ?? "").trim();
  if (!key) {
    throw new Error("Could not load text: URL is empty.");
  }

  if (cache.has(key)) {
    return cache.get(key);
  }

  const response = await fetch(key, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Could not load ${key} (${response.status})`);
  }

  const text = await response.text();
  cache.set(key, text);
  return text;
}

export function clearTextCache() {
  cache.clear();
}
