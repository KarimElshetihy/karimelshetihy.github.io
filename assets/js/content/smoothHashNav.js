/**
 * Smooth in-page scrolling for hash links (e.g. index.html#experience).
 * Avoids full reload when the target is already on the current page.
 */

const HEADER_GAP = 5;

function normalizePageFile(pathname) {
  const file = String(pathname ?? "").split("/").pop() || "";
  if (!file || file === "index.html") {
    return "index.html";
  }
  return file;
}

function isSamePage(url) {
  return normalizePageFile(url.pathname) === normalizePageFile(window.location.pathname);
}

function resolveHashTarget(hash) {
  if (!hash || hash === "#") {
    return null;
  }

  try {
    return document.querySelector(decodeURIComponent(hash));
  } catch (_error) {
    return null;
  }
}

function getStickyHeaderOffset() {
  const header = document.querySelector("#header");
  if (!header) {
    return 0;
  }

  const styles = window.getComputedStyle(header);
  const position = styles.position;
  if (position !== "fixed" && position !== "sticky") {
    return 0;
  }

  return Math.ceil(header.getBoundingClientRect().height) + HEADER_GAP;
}

export function scrollToHash(hash, options = {}) {
  const { updateHistory = true } = options;
  const target = resolveHashTarget(hash);
  if (!target) {
    return false;
  }

  const top = Math.max(
    0,
    window.scrollY + target.getBoundingClientRect().top - getStickyHeaderOffset()
  );

  window.scrollTo({ top, behavior: "smooth" });

  if (updateHistory) {
    const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
    history.pushState(null, "", nextUrl);
  }

  return true;
}

function closeMobileNavIfOpen() {
  if (!document.body.classList.contains("mobile-nav-active")) {
    return;
  }

  const toggle = document.querySelector(".mobile-nav-toggle");
  if (toggle) {
    toggle.click();
  }
}

/**
 * Intercept same-page hash clicks and smooth-scroll instead of reloading.
 */
export function initSmoothHashNav(root = document) {
  root.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_error) {
      return;
    }

    if (url.origin !== window.location.origin || !url.hash) {
      return;
    }

    if (!isSamePage(url)) {
      return;
    }

    event.preventDefault();
    closeMobileNavIfOpen();
    scrollToHash(url.hash);
  });
}

/**
 * After dynamic content renders, scroll to the URL hash if present.
 */
export function scrollToHashOnReady() {
  const { hash } = window.location;
  if (!hash) {
    return;
  }

  requestAnimationFrame(() => {
    scrollToHash(hash, { updateHistory: false });
  });
}
