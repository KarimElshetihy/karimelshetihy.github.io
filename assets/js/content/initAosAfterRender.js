/**
 * Keeps AOS reliable after dynamic page render.
 * - Reconfigures trigger offset so short / late sections still animate
 * - Refreshes after layout and images settle
 * - Forces animate fallback if an element enters view but stays stuck
 */

const AOS_OPTIONS = {
  duration: 600,
  easing: "ease-in-out",
  once: true,
  mirror: false,
  offset: 40,
  anchorPlacement: "top-bottom"
};

function getAos() {
  return typeof window.AOS !== "undefined" ? window.AOS : null;
}

function refreshAosInstance() {
  const aos = getAos();
  if (!aos) {
    return;
  }

  if (typeof aos.init === "function") {
    aos.init(AOS_OPTIONS);
  }

  if (typeof aos.refreshHard === "function") {
    aos.refreshHard();
  } else if (typeof aos.refresh === "function") {
    aos.refresh();
  }
}

function forceVisibleAosElements(root = document) {
  const elements = root.querySelectorAll("[data-aos]:not(.aos-animate)");
  if (!elements.length || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("aos-animate");
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.05
    }
  );

  elements.forEach((element) => observer.observe(element));

  return () => observer.disconnect();
}

/**
 * Call after page content is in the DOM (site:ready).
 */
export function initAosAfterRender(root = document) {
  const aos = getAos();
  if (!aos) {
    return;
  }

  refreshAosInstance();

  requestAnimationFrame(() => {
    refreshAosInstance();
  });

  window.setTimeout(() => {
    refreshAosInstance();
  }, 250);

  if (typeof imagesLoaded === "function") {
    imagesLoaded(root, () => {
      refreshAosInstance();
    });
  }

  window.addEventListener(
    "load",
    () => {
      refreshAosInstance();
    },
    { once: true }
  );

  forceVisibleAosElements(root);
}
