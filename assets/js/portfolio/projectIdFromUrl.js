/**
 * Resolve portfolio project id from the URL.
 * Uses hash first (?project= is often dropped by clean-URL redirects).
 */

export function getRequestedProjectId() {
  const fromSearch = new URLSearchParams(window.location.search).get("project");
  if (fromSearch?.trim()) {
    return fromSearch.trim();
  }

  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) {
    return "";
  }

  if (hash.includes("=")) {
    const fromHash = new URLSearchParams(hash).get("project");
    if (fromHash?.trim()) {
      return fromHash.trim();
    }
  }

  return hash;
}

export function buildPortfolioDetailsUrl(projectId) {
  const id = String(projectId ?? "").trim();
  if (!id) {
    return "portfolio-details.html";
  }

  return `portfolio-details.html#project=${encodeURIComponent(id)}`;
}

export function findProjectById(projects, projectId) {
  const normalizedId = String(projectId ?? "").trim();
  if (!normalizedId || !Array.isArray(projects)) {
    return null;
  }

  return (
    projects.find((item) => String(item?.id ?? "").trim() === normalizedId) ?? null
  );
}
