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

export function mapProjectToLatestWork(project, detailProjectIds = new Set()) {
  const projectId = buildProjectId(project);
  const description = String(project.description ?? "").trim();
  const hasCustomDetailsUrl = typeof project.details === "string" && project.details.trim();
  const hasMatchingDetails = detailProjectIds.has(projectId);
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
    href: hasCustomDetailsUrl || hasMatchingDetails
      ? hasCustomDetailsUrl
        ? project.details.trim()
        : buildPortfolioDetailsUrl(projectId)
      : ""
  };
}

export function getPortfolioProjectsFromPage(pageData) {
  const portfolioSection = (pageData?.sections ?? []).find(
    (section) => section.type === "portfolioDynamic"
  );
  return portfolioSection?.data?.projects ?? [];
}

export function getDetailProjectsFromPage(pageData) {
  const detailsSection = (pageData?.sections ?? []).find(
    (section) => section.type === "portfolioDetailsData"
  );
  return detailsSection?.data?.projects ?? [];
}

export function buildDetailProjectIds(detailProjects) {
  if (!Array.isArray(detailProjects)) {
    return new Set();
  }

  return new Set(
    detailProjects
      .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
      .filter(Boolean)
  );
}

export function getLatestWorksFromPortfolioPage(portfolioPage, detailsPage) {
  const detailProjectIds = buildDetailProjectIds(getDetailProjectsFromPage(detailsPage));

  return sortProjectsForDisplay(getPortfolioProjectsFromPage(portfolioPage).filter(isProjectVisible)).map(
    (project) => mapProjectToLatestWork(project, detailProjectIds)
  );
}
