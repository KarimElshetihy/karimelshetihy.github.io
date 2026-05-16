import {
  collectCategoryFilters,
  getFilterClassNames,
  getProjectCategories
} from "./portfolio/categories.js";

document.addEventListener(
  "site:ready",
  () => {
    startPortfolio();
  },
  { once: false }
);

function startPortfolio() {
  const projectsContainer = document.getElementById("portfolio-container");
  const filtersContainer = document.getElementById("portfolio-filters");

  if (!projectsContainer || !filtersContainer) return;

  Promise.all([
    loadJsonFile("assets/data/pages/portfolio.json", "portfolio.json"),
    loadJsonFile("assets/data/pages/portfolio_details.json", "portfolio_details.json")
  ])
    .then(([pageData, detailsPageData]) => {
      const portfolioSection = (pageData.sections || []).find(
        (section) => section.type === "portfolioDynamic"
      );
      const projects = portfolioSection?.data?.projects || [];
      const detailsSection = (detailsPageData.sections || []).find(
        (section) => section.type === "portfolioDetailsData"
      );
      const detailProjects = detailsSection?.data?.projects || [];
      const detailProjectIds = buildDetailProjectIds(detailProjects);

      if (!Array.isArray(projects) || projects.length === 0) {
        throw new Error("No projects found in portfolio page data.");
      }

      const sortedProjects = [...projects].sort(
        (firstProject, secondProject) =>
          getFeaturedFlag(secondProject) - getFeaturedFlag(firstProject)
      );

      renderFilterButtons(filtersContainer, collectCategoryFilters(sortedProjects));
      projectsContainer.innerHTML = sortedProjects
        .map((project) => renderProjectCard(project, detailProjectIds))
        .join("");

      refreshPortfolioPlugins(projectsContainer);
    })
    .catch((error) => {
      projectsContainer.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    });
}

function renderFilterButtons(filtersContainer, categories) {
  categories.forEach((label, categoryId) => {
    const filter = document.createElement("li");
    filter.setAttribute("data-filter", `.filter-${categoryId}`);
    filter.textContent = label;
    filtersContainer.appendChild(filter);
  });
}

function renderProjectCard(project, detailProjectIds) {
  const projectId = buildProjectId(project);
  const categories = getProjectCategories(project);
  const filterClasses = getFilterClassNames(categories);
  const isFeatured = getFeaturedFlag(project) === 1;
  const featuredTag = isFeatured
    ? '<span class="portfolio-featured-tag"><i class="bi bi-star-fill" aria-hidden="true"></i> Featured</span>'
    : "";
  const tools = Array.isArray(project.tools)
    ? project.tools.map((tool) => `<span class="portfolio-tool-tag">${tool}</span>`).join("")
    : "";
  const githubLink = project.github
    ? `<a href="${project.github}" title="GitHub Repository" class="portfolio-action-link" target="_blank" rel="noopener"><i class="bi bi-github"></i></a>`
    : "";
  const demoLink = project.demo
    ? `<a href="${project.demo}" title="Live Demo" class="portfolio-action-link" target="_blank" rel="noopener"><i class="bi bi-link-45deg"></i></a>`
    : "";
  const hasCustomDetailsUrl = typeof project.details === "string" && project.details.trim();
  const hasMatchingDetails = detailProjectIds.has(projectId);
  const detailsUrl = hasCustomDetailsUrl
    ? project.details.trim()
    : `portfolio-details.html?project=${encodeURIComponent(projectId)}`;
  const detailsLink =
    hasCustomDetailsUrl || hasMatchingDetails
      ? `<a href="${detailsUrl}" title="See project details" class="portfolio-action-link"><i class="bi bi-arrow-up-right-circle-fill"></i></a>`
      : "";

  return `
    <div class="col-lg-4 col-md-6 portfolio-item isotope-item ${filterClasses}${isFeatured ? " is-featured" : ""}">
      <img src="${project.image}" class="img-fluid" alt="${project.title}">
      ${featuredTag}
      <div class="portfolio-info">
        <h4>${project.title}</h4>
        <p>${project.description}</p>
        <div class="portfolio-tools">${tools}</div>
        <div class="portfolio-actions">
          ${detailsLink}
          ${githubLink}
          ${demoLink}
        </div>
      </div>
    </div>`;
}

function buildDetailProjectIds(detailProjects) {
  if (!Array.isArray(detailProjects)) {
    return new Set();
  }

  return new Set(
    detailProjects
      .map((item) => (typeof item.id === "string" ? item.id.trim() : ""))
      .filter(Boolean)
  );
}

function loadJsonFile(url, label) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${label}`);
    }
    return response.json();
  });
}

function buildProjectId(project) {
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

function getFeaturedFlag(project) {
  return Number(project?.is_featured) === 1 ? 1 : 0;
}

function refreshPortfolioPlugins(projectsContainer) {
  if (typeof GLightbox === "function") {
    GLightbox({ selector: ".glightbox" });
  }

  if (typeof imagesLoaded === "function" && typeof Isotope === "function") {
    imagesLoaded(projectsContainer, () => {
      const isotopeInstance = new Isotope(projectsContainer, {
        itemSelector: ".portfolio-item",
        layoutMode: "masonry"
      });

      document.querySelectorAll("#portfolio-filters li").forEach((filterButton) => {
        filterButton.addEventListener("click", function () {
          document
            .querySelector("#portfolio-filters .filter-active")
            ?.classList.remove("filter-active");
          this.classList.add("filter-active");
          isotopeInstance.arrange({ filter: this.getAttribute("data-filter") });
        });
      });
    });
  }
}
