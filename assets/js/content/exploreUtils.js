import { buildExploreDetailsUrl } from "../explore/exploreTopicUrl.js";
import { isLinkableTopic } from "./contentAvailability.js";
import { sortByOrder } from "./sortByOrder.js";

export function getExploreSection(pageData) {
  return (pageData?.sections ?? []).find((section) => section.type === "exploreData");
}

export function sortExploreTopicsByCategory(topics, categories) {
  const topicsByCategory = (topics ?? []).reduce((groups, topic) => {
    const categoryId = String(topic.categoryId ?? "").trim();
    if (!categoryId) return groups;
    if (!groups[categoryId]) groups[categoryId] = [];
    groups[categoryId].push(topic);
    return groups;
  }, {});

  Object.keys(topicsByCategory).forEach((categoryId) => {
    topicsByCategory[categoryId] = sortByOrder(topicsByCategory[categoryId]);
  });

  return sortByOrder(categories ?? []).flatMap(
    (category) => topicsByCategory[category.id] ?? []
  );
}

export function enrichExploreTopics(exploreData) {
  if (!exploreData || typeof exploreData !== "object") {
    return exploreData;
  }

  const categories = sortByOrder(exploreData.categories ?? []);
  const topics = sortExploreTopicsByCategory(
    (exploreData.topics ?? []).map((topic) => {
      const isAvailable = isLinkableTopic(topic);

      return {
        ...topic,
        href: isAvailable ? buildExploreDetailsUrl(topic.id) : "",
        unavailable: !isAvailable
      };
    }),
    categories
  );

  return {
    ...exploreData,
    categories,
    topics
  };
}
