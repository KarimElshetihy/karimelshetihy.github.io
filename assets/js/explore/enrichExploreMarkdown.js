import { enrichDetailsMarkdown } from "../content/enrichDetailsMarkdown.js";
import { findTopicById, getRequestedTopicId } from "../explore/exploreTopicUrl.js";

export async function enrichExploreMarkdown(pageData) {
  return enrichDetailsMarkdown(pageData, {
    sectionType: "exploreDetailsData",
    itemsKey: "topics",
    getRequestedId: getRequestedTopicId,
    findById: findTopicById,
    logLabel: "enrichExploreMarkdown"
  });
}
