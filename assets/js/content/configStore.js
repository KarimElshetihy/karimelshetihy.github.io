/**
 * Runtime access to site config (bundled at build time from config/).
 */

import { site, footer, contactForm, pages } from "../generated/config.bundle.js";

export function getSite() {
  return site;
}

export function getFooter() {
  return footer;
}

export function getSiteWithFooter() {
  return {
    ...site,
    footer: footer?.footer ?? footer
  };
}

export function getContactForm() {
  return contactForm;
}

export function getPage(pageKey) {
  const page = pages[pageKey];
  if (!page) {
    throw new Error(`Could not load config/pages/${pageKey}.json`);
  }
  return page;
}

export function getPortfolioPage() {
  return getPage("portfolio");
}

export function getExplorePage() {
  return getPage("explore");
}
