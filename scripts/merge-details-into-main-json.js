/**
 * Merge portfolio_details.json → portfolio.json and explore_details.json → explore.json.
 * Usage: node scripts/merge-details-into-main-json.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "assets/data/pages");

const PORTFOLIO_DETAIL_KEYS = [
  "subtitle",
  "isConfidential",
  "infoTitle",
  "sliderImages",
  "projectInfo",
  "contentFile",
  "articleNav"
];

const EXPLORE_DETAIL_KEYS = ["subtitle", "infoTitle", "projectInfo", "contentFile", "articleNav"];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function writeJson(relativePath, data) {
  fs.writeFileSync(path.join(ROOT, relativePath), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getSection(pageData, sectionType) {
  return (pageData?.sections ?? []).find((section) => section.type === sectionType);
}

function mergeItems(mainItems, detailItems, detailKeys, label) {
  const detailById = new Map(
    (detailItems ?? []).map((item) => [String(item.id ?? "").trim(), item])
  );
  const merged = [];
  const orphans = [];

  for (const item of mainItems ?? []) {
    const id = String(item.id ?? "").trim();
    const detail = detailById.get(id);

    if (!detail) {
      merged.push(item);
      continue;
    }

    detailById.delete(id);
    const patch = {};

    for (const key of detailKeys) {
      if (Object.prototype.hasOwnProperty.call(detail, key)) {
        patch[key] = detail[key];
      }
    }

    merged.push({ ...item, ...patch });
  }

  for (const [id, detail] of detailById.entries()) {
    orphans.push(id);
    console.warn(`[${label}] detail-only id (no listing match): ${id}`);
  }

  return merged;
}

function mergePortfolio() {
  const portfolioPage = readJson("assets/data/pages/portfolio.json");
  const detailsPage = readJson("assets/data/pages/portfolio_details.json");
  const portfolioSection = getSection(portfolioPage, "portfolioDynamic");
  const detailsSection = getSection(detailsPage, "portfolioDetailsData");

  if (!portfolioSection?.data?.projects) {
    throw new Error("portfolio.json: portfolioDynamic.projects not found");
  }

  portfolioSection.data.projects = mergeItems(
    portfolioSection.data.projects,
    detailsSection?.data?.projects,
    PORTFOLIO_DETAIL_KEYS,
    "portfolio"
  );

  writeJson("assets/data/pages/portfolio.json", portfolioPage);
  console.log(`Merged ${detailsSection?.data?.projects?.length ?? 0} portfolio detail entries.`);
}

function mergeExplore() {
  const explorePage = readJson("assets/data/pages/explore.json");
  const detailsPage = readJson("assets/data/pages/explore_details.json");
  const exploreSection = getSection(explorePage, "exploreData");
  const detailsSection = getSection(detailsPage, "exploreDetailsData");

  if (!exploreSection?.data?.topics) {
    throw new Error("explore.json: exploreData.topics not found");
  }

  exploreSection.data.topics = mergeItems(
    exploreSection.data.topics,
    detailsSection?.data?.topics,
    EXPLORE_DETAIL_KEYS,
    "explore"
  );

  writeJson("assets/data/pages/explore.json", explorePage);
  console.log(`Merged ${detailsSection?.data?.topics?.length ?? 0} explore detail entries.`);
}

mergePortfolio();
mergeExplore();
console.log("Done.");
