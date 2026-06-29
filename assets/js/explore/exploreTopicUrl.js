import {
  buildDetailsUrl,
  collectResourceIds,
  findResourceById,
  getResourceIdFromUrl
} from "../content/resourceIdFromUrl.js";

const TOPIC_PARAM = "topic";
const DETAILS_PAGE = "explore-details.html";

export function getRequestedTopicId() {
  return getResourceIdFromUrl(TOPIC_PARAM);
}

export function buildExploreDetailsUrl(topicId) {
  return buildDetailsUrl(DETAILS_PAGE, TOPIC_PARAM, topicId);
}

export function findTopicById(topics, topicId) {
  return findResourceById(topics, topicId);
}

export function collectTopicIds(topics) {
  return collectResourceIds(topics);
}
