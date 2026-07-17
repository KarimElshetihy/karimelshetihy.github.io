/**
 * Loads bundled site config and renders chrome + main content.
 * Run `npm run build:config` after editing config/ (or use `npm run dev`).
 * Injects main.js after render so template scripts bind to the final DOM.
 */

import { renderSiteChrome } from "./renderSiteChrome.js";
import { renderPage } from "./renderPage.js";
import {
  getExplorePage,
  getPage,
  getPortfolioPage,
  getSiteWithFooter
} from "./configStore.js";
import { getLatestWorksFromPortfolioPage } from "../portfolio/projectUtils.js";
import { enrichExploreTopics, getExploreSection } from "./exploreUtils.js";
import {
  buildExploreDetailsPageData,
  buildPortfolioDetailsPageData
} from "./buildDetailsPageData.js";
import { enrichPortfolioMarkdown } from "../portfolio/enrichPortfolioMarkdown.js";
import { enrichExploreMarkdown } from "../explore/enrichExploreMarkdown.js";
import { enrichContactPage } from "../contact/enrichContactForm.js";
import { initWeb3Form } from "../contact/initWeb3Form.js";
import { initSmoothHashNav, scrollToHashOnReady } from "./smoothHashNav.js";
import { initAosAfterRender } from "./initAosAfterRender.js";

const PAGE_TO_NAV = {
  index: "home",
  about: "about",
  resume: "resume",
  cv: "cv",
  services: "services",
  portfolio: "portfolio",
  portfolio_dynamic: "portfolio",
  explore: "explore",
  contact: "contact",
  portfolio_details: "portfolio",
  explore_details: "explore",
  starter_page: "home"
};

function mapPageToNav(pageKey) {
  return PAGE_TO_NAV[pageKey] ?? "home";
}

function applyPageMeta(meta, site) {
  if (meta?.title) {
    document.title = meta.title;
  } else if (site?.brand?.name) {
    document.title = site.brand.name;
  }

  const desc = document.querySelector('meta[name="description"]');
  if (desc && meta && Object.prototype.hasOwnProperty.call(meta, "description")) {
    desc.setAttribute("content", meta.description ?? "");
  }
}

function injectMainScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("../main.js", import.meta.url).href;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load main.js"));
    document.body.appendChild(script);
  });
}

function showFatal(message) {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.remove();
  }
  const root = document.getElementById("page-root");
  if (root) {
    root.innerHTML = `<p class="container text-center text-danger py-5">${message}</p>`;
  } else {
    console.error(message);
  }
}

function enrichLatestWorksFromPortfolio(pageData) {
  const sections = pageData?.sections;
  if (!Array.isArray(sections)) {
    return pageData;
  }

  const needsPortfolio = sections.some(
    (section) => section.type === "aboutData" && section.data?.latestWorksSource === "portfolio"
  );
  if (!needsPortfolio) {
    return pageData;
  }

  const latestWorks = getLatestWorksFromPortfolioPage(getPortfolioPage());

  sections.forEach((section) => {
    if (section.type === "aboutData" && section.data?.latestWorksSource === "portfolio") {
      section.data.latestWorks = latestWorks;
    }
  });

  return pageData;
}

function enrichExplorePage(pageData) {
  const exploreSection = getExploreSection(pageData);
  if (!exploreSection?.data) {
    return pageData;
  }

  exploreSection.data = enrichExploreTopics(exploreSection.data);
  return pageData;
}

function loadPageData(pageKey) {
  if (pageKey === "portfolio_details") {
    return buildPortfolioDetailsPageData(getPortfolioPage());
  }

  if (pageKey === "explore_details") {
    return buildExploreDetailsPageData(getExplorePage());
  }

  return getPage(pageKey);
}

async function bootstrap() {
  const pageKey = document.body.dataset.page || "index";

  let site;
  try {
    site = getSiteWithFooter();
  } catch (error) {
    showFatal(error.message || "Could not load site data.");
    return;
  }

  const activeNavId = mapPageToNav(pageKey);
  renderSiteChrome(site, activeNavId);
  initSmoothHashNav(document);

  let pageData;
  try {
    pageData = loadPageData(pageKey);
  } catch (error) {
    showFatal(error.message || "Could not load page data.");
    return;
  }

  try {
    pageData = enrichLatestWorksFromPortfolio(pageData);
    pageData = enrichExplorePage(pageData);
    pageData = await enrichContactPage(pageData);
    if (pageKey === "portfolio_details") {
      pageData = await enrichPortfolioMarkdown(pageData);
    }
    if (pageKey === "explore_details") {
      pageData = await enrichExploreMarkdown(pageData);
    }
  } catch (error) {
    showFatal(error.message || "Could not load page dependencies.");
    return;
  }

  applyPageMeta(pageData.meta, site);
  renderPage(pageData);
  initWeb3Form(document);

  try {
    await injectMainScript();
  } catch (error) {
    showFatal(error.message || "Could not load main.js.");
    return;
  }

  window.__contentBootstrapDone = true;
  document.dispatchEvent(new CustomEvent("site:ready", { bubbles: true }));
  scrollToHashOnReady();
  initAosAfterRender(document);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrap();
  });
} else {
  bootstrap();
}
