/**
 * Renders block-based portfolio article content from JSON.
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

export function normalizeProjectContent(project) {
  if (Array.isArray(project?.content) && project.content.length > 0) {
    return project.content;
  }

  const description = project?.description;
  if (!description || typeof description !== "object") {
    return [];
  }

  const blocks = [];
  const title = typeof description.title === "string" ? description.title.trim() : "";
  const body = typeof description.body === "string" ? description.body.trim() : "";

  if (title) {
    blocks.push({ type: "heading", level: 2, text: title });
  }
  if (body) {
    blocks.push({ type: "paragraph", text: body });
  }

  return blocks;
}

export function renderPortfolioContent(content, options = {}) {
  if (!Array.isArray(content) || content.length === 0) {
    return "";
  }

  const anchors = Array.isArray(options.anchors) ? options.anchors : [];
  const anchorLevels = new Set(
    Array.isArray(options.anchorLevels) && options.anchorLevels.length
      ? options.anchorLevels.map((level) => (level === 3 ? 3 : 2))
      : [2]
  );
  const anchorIndexRef = { value: 0 };

  return content
    .map((block) => renderContentBlock(block, { anchors, anchorLevels, anchorIndexRef }))
    .filter(Boolean)
    .join("");
}

function renderContentBlock(block, context = {}) {
  if (!block || typeof block !== "object") {
    return "";
  }

  switch (block.type) {
    case "heading":
      return renderHeading(block, context);
    case "paragraph":
      return renderParagraph(block);
    case "list":
      return renderList(block);
    case "image":
      return renderImage(block);
    case "quote":
      return renderQuote(block);
    case "divider":
      return '<hr class="portfolio-article-divider">';
    default:
      return "";
  }
}

function renderHeading(block, context = {}) {
  const text = typeof block.text === "string" ? block.text.trim() : "";
  if (!text) {
    return "";
  }

  const level = block.level === 3 ? 3 : 2;
  const tag = level === 3 ? "h3" : "h2";
  const { anchors = [], anchorLevels = new Set([2]), anchorIndexRef } = context;
  let idAttr = "";

  if (anchorLevels.has(level) && anchors.length > 0 && anchorIndexRef) {
    const anchor = anchors[anchorIndexRef.value];
    anchorIndexRef.value += 1;
    if (anchor?.id) {
      idAttr = ` id="${escapeAttr(anchor.id)}"`;
    }
  }

  return `<${tag} class="portfolio-article-heading portfolio-article-heading--h${level}"${idAttr}>${escapeHtml(text)}</${tag}>`;
}

function renderParagraph(block) {
  const text = typeof block.text === "string" ? block.text.trim() : "";
  if (!text) {
    return "";
  }

  return `<p class="portfolio-article-paragraph">${escapeHtml(text)}</p>`;
}

function renderList(block) {
  const items = Array.isArray(block.items)
    ? block.items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  if (!items.length) {
    return "";
  }

  const tag = block.style === "ordered" ? "ol" : "ul";
  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag} class="portfolio-article-list">${listItems}</${tag}>`;
}

function renderImage(block) {
  const src = typeof block.src === "string" ? block.src.trim() : "";
  if (!src) {
    return "";
  }

  const alt = typeof block.alt === "string" ? block.alt.trim() : "";
  const caption = typeof block.caption === "string" ? block.caption.trim() : "";
  const captionHtml = caption
    ? `<figcaption class="portfolio-article-caption">${escapeHtml(caption)}</figcaption>`
    : "";

  return `<figure class="portfolio-article-figure">
    <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="portfolio-article-image" loading="lazy">
    ${captionHtml}
  </figure>`;
}

function renderQuote(block) {
  const text = typeof block.text === "string" ? block.text.trim() : "";
  if (!text) {
    return "";
  }

  const cite = typeof block.cite === "string" ? block.cite.trim() : "";
  const citeHtml = cite ? `<cite class="portfolio-article-quote-cite">${escapeHtml(cite)}</cite>` : "";

  return `<blockquote class="portfolio-article-quote">
    <p>${escapeHtml(text)}</p>
    ${citeHtml}
  </blockquote>`;
}
