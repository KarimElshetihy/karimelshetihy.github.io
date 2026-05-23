/**
 * Renders portfolio details sidebar projectInfo rows.
 * Category and Stack values render as tags.
 */

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
}

function isTagLabel(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  return (
    normalized === "category" ||
    normalized === "categories" ||
    normalized === "stack" ||
    normalized === "tech stack" ||
    normalized === "technologies"
  );
}

function getProjectInfoTags(item) {
  if (Array.isArray(item.tags)) {
    return item.tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (!isTagLabel(item.label)) {
    return null;
  }

  const value = typeof item.value === "string" ? item.value : "";
  return value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getTagModifier(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  return normalized === "stack" ||
    normalized === "tech stack" ||
    normalized === "technologies"
    ? "portfolio-info-tag--stack"
    : "portfolio-info-tag--category";
}

const DEFAULT_CONFIDENTIAL_NOTE =
  "Real data and dashboards cannot be shared publicly due to confidentiality.";

export function renderConfidentialNote(project) {
  if (project?.isConfidential !== true) {
    return "";
  }

  const text =
    typeof project.confidentialNote === "string" && project.confidentialNote.trim()
      ? project.confidentialNote.trim()
      : DEFAULT_CONFIDENTIAL_NOTE;

  return `<div class="portfolio-info-note" role="note">
    <span class="portfolio-info-note-label">Confidential</span>
    <p class="portfolio-info-note-text">${escapeHtml(text)}</p>
  </div>`;
}

export function renderProjectInfoItem(item) {
  const label = escapeHtml(item.label ?? "");
  const tags = getProjectInfoTags(item);

  if (tags && tags.length > 0) {
    const modifier = getTagModifier(item.label);
    const tagsHtml = tags
      .map((tag) => `<span class="portfolio-info-tag ${modifier}">${escapeHtml(tag)}</span>`)
      .join("");

    return `<li class="portfolio-info-item portfolio-info-item--tags">
      <strong class="portfolio-info-label">${label}</strong>
      <div class="portfolio-info-tags">${tagsHtml}</div>
    </li>`;
  }

  if (item.href) {
    return `<li class="portfolio-info-item">
      <strong>${label}</strong>:
      <a href="${escapeAttr(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.value ?? item.href)}</a>
    </li>`;
  }

  return `<li class="portfolio-info-item">
    <strong>${label}</strong>: ${escapeHtml(item.value ?? "")}
  </li>`;
}
