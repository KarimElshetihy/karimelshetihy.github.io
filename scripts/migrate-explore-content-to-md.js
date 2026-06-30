/**
 * One-time migration: explore.json inline content → markdown files.
 * Usage: node scripts/migrate-explore-content-to-md.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "assets/data/pages/explore.json");
const SECTION_TYPE = "exploreData";
const ITEMS_KEY = "topics";
const MD_DIR = path.join(ROOT, "assets/content/explore");

function encodeImagePath(src) {
  return String(src ?? "")
    .trim()
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) {
    return "";
  }

  const lines = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }

    switch (block.type) {
      case "heading": {
        const level = block.level === 3 ? 3 : 2;
        const text = String(block.text ?? "").trim();
        if (text) {
          lines.push(`${"#".repeat(level)} ${text}`, "");
        }
        break;
      }
      case "paragraph": {
        const text = String(block.text ?? "").trim();
        if (text) {
          lines.push(text, "");
        }
        break;
      }
      case "divider":
        lines.push("---", "");
        break;
      case "list": {
        const items = Array.isArray(block.items)
          ? block.items.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        if (items.length) {
          if (block.style === "ordered") {
            items.forEach((item, index) => {
              lines.push(`${index + 1}. ${item}`);
            });
          } else {
            items.forEach((item) => {
              lines.push(`- ${item}`);
            });
          }
          lines.push("");
        }
        break;
      }
      case "quote": {
        const text = String(block.text ?? "").trim();
        const cite = String(block.cite ?? "").trim();
        if (text) {
          lines.push(`> ${text}`, "");
          if (cite) {
            lines.push(`> — ${cite}`, "");
          }
        }
        break;
      }
      case "image": {
        const src = String(block.src ?? "").trim();
        if (src) {
          const alt = String(block.alt ?? "").replace(/"/g, '\\"');
          const caption = String(block.caption ?? "").trim();
          const encodedSrc = encodeImagePath(src);
          if (caption) {
            const safeCaption = caption.replace(/"/g, '\\"');
            lines.push(`![${alt}](${encodedSrc} "${safeCaption}")`, "");
          } else {
            lines.push(`![${alt}](${encodedSrc})`, "");
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function migrate() {
  const pageData = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const section = (pageData.sections ?? []).find((item) => item.type === SECTION_TYPE);
  const topics = section?.data?.[ITEMS_KEY];

  if (!Array.isArray(topics)) {
    throw new Error("No explore topics found.");
  }

  fs.mkdirSync(MD_DIR, { recursive: true });

  let migrated = 0;

  for (const topic of topics) {
    const id = String(topic.id ?? "").trim();
    if (!id || topic.contentFile || !Array.isArray(topic.content) || !topic.content.length) {
      continue;
    }

    const relativePath = `assets/content/explore/${id}.md`;
    fs.writeFileSync(path.join(MD_DIR, `${id}.md`), blocksToMarkdown(topic.content), "utf8");
    topic.contentFile = relativePath;
    delete topic.content;
    migrated += 1;
    console.log(`Migrated: ${id}`);
  }

  fs.writeFileSync(JSON_PATH, `${JSON.stringify(pageData, null, 2)}\n`, "utf8");
  console.log(`Done. Migrated ${migrated} explore topics.`);
}

migrate();
