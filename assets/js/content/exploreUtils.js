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

function getExploreDetailsSection(pageData) {
  return (pageData?.sections ?? []).find((section) => section.type === "exploreDetailsData");
}

export function mergeExploreTopicOrder(detailsPage, explorePage) {
  const detailsSection = getExploreDetailsSection(detailsPage);
  if (!detailsSection?.data?.topics) {
    return detailsPage;
  }

  const exploreTopics = getExploreSection(explorePage)?.data?.topics ?? [];
  const orderById = new Map(
    exploreTopics.map((topic) => [String(topic.id ?? "").trim(), topic.order])
  );

  detailsSection.data.topics = sortByOrder(
    detailsSection.data.topics.map((topic) => {
      const id = String(topic.id ?? "").trim();
      const order = topic.order ?? orderById.get(id);
      return order === undefined ? topic : { ...topic, order };
    })
  );

  return detailsPage;
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

export function enrichExploreTopics(exploreData, detailsPage) {
  if (!exploreData || typeof exploreData !== "object") {
    return exploreData;
  }

  const detailTopicIds = collectTopicIds(getExploreTopicsFromDetailsPage(detailsPage));
  const categories = sortByOrder(exploreData.categories ?? []);
  const topics = sortExploreTopicsByCategory(
    (exploreData.topics ?? []).map((topic) => {
      const isSoon = topic.soon === true || Number(topic.soon) === 1;
      const hasDetails = detailTopicIds.has(String(topic.id ?? "").trim());
      const isAvailable = !isSoon && hasDetails;

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
