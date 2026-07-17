import { Marked } from "../../vendor/marked/marked.esm.js";
import { slugifyHeading } from "../portfolio/articleNav.js";

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

function tokensToPlainText(tokens) {
  if (!Array.isArray(tokens)) {
    return "";
  }

  return tokens
    .map((token) => {
      if (token.type === "text") {
        return token.text ?? "";
      }
      if (Array.isArray(token.tokens)) {
        return tokensToPlainText(token.tokens);
      }
      return token.raw ?? "";
    })
    .join("");
}

function nextHeadingId(text, usedIds) {
  let id = slugifyHeading(text);
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${slugifyHeading(text)}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function createPortfolioMarked(levels, usedIds, anchors) {
  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const level = depth === 1 ? 1 : depth === 3 ? 3 : 2;
        const tag = `h${level}`;
        const className = level === 1
          ? "portfolio-article-heading portfolio-article-heading--h1"
          : level === 3
            ? "portfolio-article-heading portfolio-article-heading--h3"
            : "portfolio-article-heading portfolio-article-heading--h2";
        const text = tokensToPlainText(tokens).trim();
        const inner = this.parser.parseInline(tokens);
        let idAttr = "";

        if (levels.has(level) && text) {
          const id = nextHeadingId(text, usedIds);
          idAttr = ` id="${escapeAttr(id)}"`;
          anchors.push({ id, text, level });
        }

        return `<${tag} class="${className}"${idAttr}>${inner}</${tag}>\n`;
      },
      paragraph({ tokens }) {
        return `<p class="portfolio-article-paragraph">${this.parser.parseInline(tokens)}</p>\n`;
      },
      hr() {
        return '<hr class="portfolio-article-divider">\n';
      },
      list(token) {
        const ordered = token.ordered;
        const start = token.start;
        let body = "";

        for (let index = 0; index < token.items.length; index += 1) {
          body += this.listitem(token.items[index]);
        }

        const tag = ordered ? "ol" : "ul";
        const startAttr = ordered && start !== 1 ? ` start="${start}"` : "";
        return `<${tag}${startAttr} class="portfolio-article-list">\n${body}</${tag}>\n`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens).trim();
        const citeMatch = body.match(/<p>\s*(?:&mdash;|—|-)\s*(.+?)<\/p>\s*$/i);

        if (citeMatch) {
          const quoteBody = body.replace(citeMatch[0], "").trim();
          return `<blockquote class="portfolio-article-quote">${quoteBody}<cite class="portfolio-article-quote-cite">${citeMatch[1]}</cite></blockquote>\n`;
        }

        return `<blockquote class="portfolio-article-quote">${body}</blockquote>\n`;
      },
      image({ href, title, text }) {
        const src = String(href ?? "").trim();
        if (!src) {
          return "";
        }

        const alt = escapeAttr(text ?? "");
        const caption = String(title ?? "").trim();
        const captionHtml = caption
          ? `<figcaption class="portfolio-article-caption">${escapeHtml(caption)}</figcaption>`
          : "";

        return `<figure class="portfolio-article-figure">
  <img src="${escapeAttr(src)}" alt="${alt}" class="portfolio-article-image" loading="lazy">
  ${captionHtml}
</figure>\n`;
      },
      table(token) {
        let header = "";
        let cell = "";

        for (let index = 0; index < token.header.length; index += 1) {
          cell += this.tablecell(token.header[index]);
        }
        header += this.tablerow({ text: cell });

        let body = "";
        for (let rowIndex = 0; rowIndex < token.rows.length; rowIndex += 1) {
          const row = token.rows[rowIndex];
          cell = "";
          for (let cellIndex = 0; cellIndex < row.length; cellIndex += 1) {
            cell += this.tablecell(row[cellIndex]);
          }
          body += this.tablerow({ text: cell });
        }

        if (body) {
          body = `<tbody>${body}</tbody>`;
        }

        return `<div class="portfolio-article-table-wrap">
<table class="portfolio-article-table">
<thead>${header}</thead>
${body}
</table>
</div>\n`;
      },
      code({ text, lang, escaped }) {
        const language = String(lang ?? "").trim().split(/\s+/)[0] ?? "";
        const code = String(text ?? "").replace(/\n$/, "");

        if (language === "mermaid") {
          const safeCode = code.replace(/<\/(pre|script)/gi, "<\\/$1");
          return `<div class="portfolio-article-mermaid-wrap"><pre class="mermaid">${safeCode}</pre></div>\n`;
        }

        const safeCode = escaped ? code : escapeHtml(code);
        const langClass = language ? ` portfolio-article-code--${escapeAttr(language)}` : "";
        const langLabel = language
          ? `<span class="portfolio-article-code-lang">${escapeHtml(language)}</span>`
          : "";

        return `<div class="portfolio-article-code-wrap">${langLabel}<pre class="portfolio-article-code-block"><code class="portfolio-article-code${langClass}">${safeCode}</code></pre></div>\n`;
      },
      codespan({ text }) {
        return `<code class="portfolio-article-inline-code">${escapeHtml(text ?? "")}</code>`;
      }
    }
  });

  return marked;
}

export function parseMarkdownArticle(markdown, options = {}) {
  const levels = new Set(
    Array.isArray(options.levels) && options.levels.length
      ? options.levels.map((level) => (level === 3 ? 3 : 2))
      : [2]
  );
  const usedIds = new Set();
  const anchors = [];
  const marked = createPortfolioMarked(levels, usedIds, anchors);
  const html = marked.parse(String(markdown ?? ""));

  return {
    html: html.trim(),
    anchors
  };
}
