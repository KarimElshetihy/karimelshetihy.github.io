/**
 * Builds in-page navigation for portfolio article headings.
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

export function slugifyHeading(text) {
  const slug = String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function collectHeadingAnchors(content, options = {}) {
  const levels = Array.isArray(options.levels) && options.levels.length
    ? new Set(options.levels)
    : new Set([2]);

  if (!Array.isArray(content)) {
    return [];
  }

  const usedIds = new Set();
  const anchors = [];

  for (const block of content) {
    if (block?.type !== "heading") {
      continue;
    }

    const level = block.level === 3 ? 3 : 2;
    if (!levels.has(level)) {
      continue;
    }

    const text = typeof block.text === "string" ? block.text.trim() : "";
    if (!text) {
      continue;
    }

    let id = slugifyHeading(text);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${slugifyHeading(text)}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    anchors.push({ id, text, level });
  }

  return anchors;
}

export function resolveArticleNavConfig(project, defaults = {}) {
  const config = project?.articleNav ?? defaults?.articleNav ?? {};
  const enabled = config.enabled !== false;
  const title = typeof config.title === "string" && config.title.trim()
    ? config.title.trim()
    : "Sections";
  const levels = Array.isArray(config.levels) && config.levels.length
    ? config.levels.map((level) => (level === 3 ? 3 : 2))
    : [2];
  const minItems = Number.isFinite(config.minItems) ? Math.max(1, config.minItems) : 2;
  const defaultExpanded = config.defaultExpanded === true;

  return { enabled, title, levels, minItems, defaultExpanded };
}

export function renderArticleNav(anchors, options = {}) {
  if (!Array.isArray(anchors) || anchors.length === 0) {
    return "";
  }

  const minItems = Number.isFinite(options.minItems) ? Math.max(1, options.minItems) : 2;
  if (anchors.length < minItems) {
    return "";
  }

  const title = typeof options.title === "string" && options.title.trim()
    ? options.title.trim()
    : "Sections";
  const ariaLabel = typeof options.ariaLabel === "string" && options.ariaLabel.trim()
    ? options.ariaLabel.trim()
    : title;

  const items = anchors
    .map((anchor) => {
      const levelClass = anchor.level === 3 ? " portfolio-article-nav-link--h3" : "";
      return `<li class="portfolio-article-nav-item portfolio-article-nav-item--h${anchor.level}">
        <a href="#${escapeAttr(anchor.id)}" class="portfolio-article-nav-link${levelClass}">${escapeHtml(anchor.text)}</a>
      </li>`;
    })
    .join("");

  const placementClass = options.placement === "embedded"
    ? " portfolio-article-nav--embedded"
    : options.placement === "sidebar"
      ? " portfolio-article-nav--sidebar"
      : "";
  const collapsible = options.placement === "embedded";
  const panelId = typeof options.panelId === "string" && options.panelId.trim()
    ? options.panelId.trim()
    : "article-nav-panel";
  const defaultExpanded = options.defaultExpanded === true;

  if (collapsible) {
    return `<nav class="portfolio-article-nav${placementClass}" data-article-nav data-default-expanded="${defaultExpanded ? "true" : "false"}" aria-label="${escapeAttr(ariaLabel)}">
      <button type="button" class="portfolio-article-nav-toggle" data-article-nav-toggle aria-expanded="${defaultExpanded ? "true" : "false"}" aria-controls="${escapeAttr(panelId)}">
        <strong class="portfolio-info-label">${escapeHtml(title)}</strong>
        <i class="bi bi-chevron-down portfolio-article-nav-chevron" aria-hidden="true"></i>
      </button>
      <div id="${escapeAttr(panelId)}" class="portfolio-article-nav-panel" data-article-nav-panel${defaultExpanded ? "" : " hidden"}>
        <ul class="portfolio-article-nav-list">${items}</ul>
      </div>
    </nav>`;
  }

  return `<nav class="portfolio-article-nav${placementClass}" aria-label="${escapeAttr(ariaLabel)}">
    <p class="portfolio-article-nav-title">${escapeHtml(title)}</p>
    <ul class="portfolio-article-nav-list">${items}</ul>
  </nav>`;
}

function setArticleNavExpanded(nav, toggle, panel, expanded) {
  toggle.setAttribute("aria-expanded", String(expanded));
  nav.dataset.expanded = String(expanded);
  panel.hidden = !expanded;
}

export function initArticleNav(root = document) {
  const navBlocks = Array.from(root.querySelectorAll("[data-article-nav]"));

  navBlocks.forEach((nav) => {
    if (nav.dataset.bound === "true") {
      return;
    }

    nav.dataset.bound = "true";

    const toggle = nav.querySelector("[data-article-nav-toggle]");
    const panel = nav.querySelector("[data-article-nav-panel]");
    if (!toggle || !panel) {
      return;
    }

    const defaultExpanded = nav.dataset.defaultExpanded === "true";
    setArticleNavExpanded(nav, toggle, panel, defaultExpanded);

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      setArticleNavExpanded(nav, toggle, panel, !isExpanded);
    });
  });
}
