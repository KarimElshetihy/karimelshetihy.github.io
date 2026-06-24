import { buildPortfolioDetailsUrl } from "./projectIdFromUrl.js";

export function buildProjectId(project) {
  if (typeof project.id === "string" && project.id.trim()) {
    return project.id.trim();
  }

  const fallbackTitle = typeof project.title === "string" ? project.title : "project";
  return (
    fallbackTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function getFeaturedFlag(project) {
  return Number(project?.is_featured) === 1 ? 1 : 0;
}

export function isProjectVisible(project) {
  if (project?.is_visible === false) {
    return false;
  }

  return Number(project?.is_visible) !== 0;
}

export function sortProjectsForDisplay(projects) {
  return [...projects].sort(
    (firstProject, secondProject) =>
      getFeaturedFlag(secondProject) - getFeaturedFlag(firstProject)
  );
}

export function mapProjectToLatestWork(project) {
  const projectId = buildProjectId(project);
  const description = String(project.description ?? "").trim();
  let client = "";
  let subtitle = "";

  if (description.toLowerCase().startsWith("client:")) {
    client = description.replace(/^client:\s*/i, "").trim();
  } else if (description) {
    subtitle = description;
  } else if (Array.isArray(project.tools) && project.tools.length) {
    subtitle = project.tools.slice(0, 4).join(" · ");
  }

  return {
    title: project.title ?? "",
    client,
    subtitle,
    image: project.image ?? "",
    alt: project.title ?? "",
    href: buildPortfolioDetailsUrl(projectId)
  };
}

export function getPortfolioProjectsFromPage(pageData) {
  const portfolioSection = (pageData?.sections ?? []).find(
    (section) => section.type === "portfolioDynamic"
  );
  return portfolioSection?.data?.projects ?? [];
}

export function getLatestWorksFromPortfolioPage(pageData) {
  return sortProjectsForDisplay(getPortfolioProjectsFromPage(pageData).filter(isProjectVisible)).map(
    mapProjectToLatestWork
  );
}
