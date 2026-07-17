import { enrichDetailsMarkdown } from "../content/enrichDetailsMarkdown.js";
import { findProjectById, getRequestedProjectId } from "./projectIdFromUrl.js";

export async function enrichPortfolioMarkdown(pageData) {
  return enrichDetailsMarkdown(pageData, {
    sectionType: "portfolioDetailsData",
    itemsKey: "projects",
    getRequestedId: getRequestedProjectId,
    findById: findProjectById,
    logLabel: "enrichPortfolioMarkdown"
  });
}
