export function hasContentFile(item) {
  return Boolean(String(item?.contentFile ?? "").trim());
}

export function hasLegacyContent(item) {
  return Array.isArray(item?.content) && item.content.length > 0;
}

export function hasCustomDetailsUrl(item) {
  return typeof item?.details === "string" && item.details.trim().length > 0;
}

export function isSoonTopic(topic) {
  return topic?.soon === true || Number(topic?.soon) === 1;
}

export function isLinkableProject(project) {
  return hasCustomDetailsUrl(project) || hasContentFile(project) || hasLegacyContent(project);
}

export function isLinkableTopic(topic) {
  if (isSoonTopic(topic)) {
    return false;
  }

  return hasContentFile(topic) || hasLegacyContent(topic);
}
