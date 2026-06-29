import {
  buildExploreDetailsUrl,
  collectTopicIds
} from "../explore/exploreTopicUrl.js";
import { sortByOrder } from "./sortByOrder.js";

export function getExploreSection(pageData) {
  return (pageData?.sections ?? []).find((section) => section.type === "exploreData");
}

export function getExploreTopicsFromDetailsPage(pageData) {
  const detailsSection = (pageData?.sections ?? []).find(
    (section) => section.type === "exploreDetailsData"
  );
  return detailsSection?.data?.topics ?? [];
}

export function enrichExploreTopics(exploreData, detailsPage) {
  if (!exploreData || typeof exploreData !== "object") {
    return exploreData;
  }

  const detailTopicIds = collectTopicIds(getExploreTopicsFromDetailsPage(detailsPage));
  const categories = sortByOrder(exploreData.categories ?? []);
  const topics = sortByOrder(exploreData.topics ?? []).map((topic) => {
    const isSoon = topic.soon === true || Number(topic.soon) === 1;
    const hasDetails = detailTopicIds.has(String(topic.id ?? "").trim());
    const isAvailable = !isSoon && hasDetails;

    return {
      ...topic,
      href: isAvailable ? buildExploreDetailsUrl(topic.id) : "",
      unavailable: !isAvailable
    };
  });

  return {
    ...exploreData,
    categories,
    topics
  };
}
