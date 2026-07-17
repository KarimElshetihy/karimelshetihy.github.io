import {
  buildDetailsUrl,
  findResourceById,
  getResourceIdFromUrl
} from "../content/resourceIdFromUrl.js";

export function getRequestedProjectId() {
  return getResourceIdFromUrl("project");
}

export function buildPortfolioDetailsUrl(projectId) {
  return buildDetailsUrl("portfolio-details.html", "project", projectId);
}

export function findProjectById(projects, projectId) {
  return findResourceById(projects, projectId);
}
