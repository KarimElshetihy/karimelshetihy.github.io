export function getTopicLevel(topic) {
  if (typeof topic?.level === "string" && topic.level.trim()) {
    return topic.level.trim();
  }

  const projectInfo = topic?.projectInfo;
  if (!Array.isArray(projectInfo)) {
    return "";
  }

  const levelEntry = projectInfo.find(
    (item) => String(item?.label ?? "").trim().toLowerCase() === "level"
  );

  return String(levelEntry?.value ?? "").trim();
}

const LEVEL_SLUGS = {
  beginner: "beginner",
  foundation: "beginner",
  intro: "beginner",
  introductory: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
  expert: "advanced"
};

const LEVEL_ORDER = ["beginner", "intermediate", "advanced", "default"];

export function getTopicLevelSlug(level) {
  const normalized = String(level ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return LEVEL_SLUGS[normalized] ?? "default";
}

export function getTopicLevelTagClass(level) {
  const slug = getTopicLevelSlug(level);
  if (!slug) {
    return "rl-explore-topic-level-tag";
  }

  return `rl-explore-topic-level-tag rl-explore-topic-level-tag--${slug}`;
}

export function collectTopicLevelOptions(topics) {
  const bySlug = new Map();

  for (const topic of topics ?? []) {
    const label = getTopicLevel(topic);
    if (!label) {
      continue;
    }

    const slug = getTopicLevelSlug(label) || "default";
    if (!bySlug.has(slug)) {
      bySlug.set(slug, label);
    }
  }

  return [...bySlug.entries()]
    .sort(([slugA], [slugB]) => {
      const rankA = LEVEL_ORDER.indexOf(slugA);
      const rankB = LEVEL_ORDER.indexOf(slugB);
      const orderA = rankA === -1 ? LEVEL_ORDER.length : rankA;
      const orderB = rankB === -1 ? LEVEL_ORDER.length : rankB;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return slugA.localeCompare(slugB);
    })
    .map(([slug, label]) => ({ slug, label }));
}
