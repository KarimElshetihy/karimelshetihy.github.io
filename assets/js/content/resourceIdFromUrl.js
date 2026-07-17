export function getResourceIdFromUrl(paramName) {
  const key = String(paramName ?? "").trim();
  if (!key) return "";

  const fromSearch = new URLSearchParams(window.location.search).get(key);
  if (fromSearch?.trim()) {
    return fromSearch.trim();
  }

  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) {
    return "";
  }

  if (hash.includes("=")) {
    const fromHash = new URLSearchParams(hash).get(key);
    if (fromHash?.trim()) {
      return fromHash.trim();
    }
  }

  return hash;
}

export function buildDetailsUrl(page, paramName, resourceId) {
  const id = String(resourceId ?? "").trim();
  const pagePath = String(page ?? "").trim() || "details.html";
  const key = String(paramName ?? "").trim() || "id";

  if (!id) {
    return pagePath;
  }

  return `${pagePath}#${key}=${encodeURIComponent(id)}`;
}

export function findResourceById(items, resourceId) {
  const normalizedId = String(resourceId ?? "").trim();
  if (!normalizedId || !Array.isArray(items)) {
    return null;
  }

  return items.find((item) => String(item?.id ?? "").trim() === normalizedId) ?? null;
}

export function collectResourceIds(items) {
  if (!Array.isArray(items)) {
    return new Set();
  }

  return new Set(
    items
      .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
      .filter(Boolean)
  );
}
