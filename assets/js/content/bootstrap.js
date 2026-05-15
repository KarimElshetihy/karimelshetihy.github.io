/**
 * Loads site.json + pages/<data-page>.json and renders chrome + main content.
 * Injects main.js after render so template scripts bind to the final DOM.
 * Serve over HTTP (Live Server, npx serve); fetch may fail with file://.
 */

import { loadJson } from "./loadJson.js";
import { renderSiteChrome } from "./renderSiteChrome.js";
import { renderPage } from "./renderPage.js";

const PAGE_TO_NAV = {
  index: "home",
  about: "about",
  resume: "resume",
  cv: "cv",
  services: "services",
  portfolio: "portfolio",
  portfolio_dynamic: "portfolio",
  contact: "contact",
  portfolio_details: "portfolio",
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

async function bootstrap() {
  const pageKey = document.body.dataset.page || "index";

  let site;
  try {
    site = await loadJson("assets/data/site.json");
  } catch (error) {
    showFatal(error.message || "Could not load site data.");
    return;
  }

  try {
    const footerData = await loadJson("assets/data/footer.json");
    site.footer = footerData?.footer ?? footerData;
  } catch (_error) {
    /* optional; site.footer may still exist on older site.json bundles */
  }

  const activeNavId = mapPageToNav(pageKey);
  renderSiteChrome(site, activeNavId);

  let pageData;
  try {
    pageData = await loadJson(`assets/data/pages/${pageKey}.json`);
  } catch (error) {
    showFatal(error.message || "Could not load page data.");
    return;
  }

  applyPageMeta(pageData.meta, site);
  renderPage(pageData);
  if (typeof window.initPhpEmailForms === "function") {
    window.initPhpEmailForms(document);
  }

  try {
    await injectMainScript();
  } catch (error) {
    showFatal(error.message || "Could not load main.js.");
    return;
  }

  window.__contentBootstrapDone = true;
  document.dispatchEvent(new CustomEvent("site:ready", { bubbles: true }));

  if (typeof window.AOS !== "undefined") {
    window.AOS.refresh();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrap();
  });
} else {
  bootstrap();
}
