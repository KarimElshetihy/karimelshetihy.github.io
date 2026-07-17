import { loadText } from "./loadText.js";
import { parseMarkdownArticle } from "../markdown/parseMarkdown.js";
import { resolveArticleNavConfig } from "../portfolio/articleNav.js";

export async function enrichDetailsMarkdown(pageData, config) {
  const {
    sectionType,
    itemsKey,
    getRequestedId,
    findById,
    logLabel = "enrichDetailsMarkdown"
  } = config;

  const section = (pageData?.sections ?? []).find((item) => item.type === sectionType);
  const items = section?.data?.[itemsKey];
  if (!Array.isArray(items) || !items.length) {
    return pageData;
  }

  const requestedId = getRequestedId();
  const item = findById(items, requestedId) ?? items[0];
  const contentFile = String(item?.contentFile ?? "").trim();
  if (!contentFile) {
    return pageData;
  }

  try {
    const markdown = await loadText(contentFile);
    const articleNavConfig = resolveArticleNavConfig(item, section.data);
    const parsed = parseMarkdownArticle(markdown, { levels: articleNavConfig.levels });

    item._markdown = {
      html: parsed.html,
      anchors: articleNavConfig.enabled ? parsed.anchors : []
    };
  } catch (error) {
    console.warn(`[${logLabel}] Could not load markdown content:`, error);
    item._markdown = {
      html: '<p class="portfolio-article-paragraph">Could not load content.</p>',
      anchors: []
    };
  }

  return pageData;
}
