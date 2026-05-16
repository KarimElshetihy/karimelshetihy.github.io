/**
 * Injects shared header/footer from assets/data/site.json
 */

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
}

function isIconUrl(icon) {
  const value = String(icon ?? "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")) return true;
  return /\.(svg|png|gif|webp)(\?|#|$)/i.test(value);
}

function socialIconMarkup(icon, imgClass) {
  if (isIconUrl(icon)) {
    return `<img src="${escapeAttr(icon)}" alt="" width="18" height="18" class="${escapeAttr(imgClass)}" loading="lazy">`;
  }
  return `<i class="bi ${escapeAttr(icon ?? "")}" aria-hidden="true"></i>`;
}

function socialIconDualMarkup(defaultIcon, hoverIcon, imgClass) {
  if (!isIconUrl(defaultIcon) || !isIconUrl(hoverIcon)) {
    return socialIconMarkup(defaultIcon, imgClass);
  }
  const cls = escapeAttr(imgClass);
  return `<span class="rl-social-dual" aria-hidden="true">
    <img src="${escapeAttr(defaultIcon)}" alt="" width="18" height="18" class="${cls} rl-social-default" loading="lazy">
    <img src="${escapeAttr(hoverIcon)}" alt="" width="18" height="18" class="${cls} rl-social-hover" loading="lazy">
  </span>`;
}

function navCtaHtml(navCta, activeNavId) {
  const cta = navCta ?? {};
  const href = String(cta.href ?? "contact.html").trim() || "contact.html";
  const label = cta.label ?? "Request";
  const icon = String(cta.icon ?? "bi-send").trim() || "bi-send";
  const ctaId = cta.id ?? "contact";
  const active = ctaId && activeNavId === ctaId ? " active" : "";

  return `<li class="nav-cta-item"><a href="${escapeAttr(href)}" class="nav-cta-btn${active}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}"><i class="bi ${escapeAttr(icon)}" aria-hidden="true"></i></a></li>`;
}

function navItemsHtml(items, activeNavId) {
  return (items ?? [])
    .map((item) => {
      if (item.children?.length) {
        const nested = item.children
          .map((child) => {
            if (child.children?.length) {
              const deep = child.children
                .map(
                  (d) =>
                    `<li><a href="${escapeAttr(d.href ?? "#")}">${escapeHtml(d.label)}</a></li>`
                )
                .join("");
              return `<li class="dropdown"><a href="#"><span>${escapeHtml(
                child.label
              )}</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>
              <ul>${deep}</ul></li>`;
            }
            return `<li><a href="${escapeAttr(child.href ?? "#")}">${escapeHtml(child.label)}</a></li>`;
          })
          .join("");
        return `<li class="dropdown"><a href="#"><span>${escapeHtml(
          item.label
        )}</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a>
        <ul>${nested}</ul></li>`;
      }

      const active =
        item.id && activeNavId && item.id === activeNavId ? ' class="active"' : "";
      return `<li><a href="${escapeAttr(item.href ?? "#")}"${active}>${escapeHtml(item.label)}</a></li>`;
    })
    .join("");
}

function headerSocialHtml(links, options = {}) {
  const { showPrintResume } = options;
  const printBtn = showPrintResume
    ? `<button type="button" class="btn btn-sm rl-resume-print d-none align-items-center gap-1 flex-shrink-0" onclick="window.print()" title="Print resume">
          <i class="bi bi-printer" aria-hidden="true"></i><span class="d-none d-md-inline">Print resume</span>
        </button>`
    : "";

  const linksHtml = (links ?? [])
    .map((l) => {
      const aria = l.label ? ` aria-label="${escapeAttr(l.label)}"` : "";
      const headerIcon = l.iconHeader ?? l.icon;
      const headerIconHover = l.iconHeaderHover ?? l.iconHover;
      const inner =
        headerIconHover && isIconUrl(headerIcon)
          ? socialIconDualMarkup(headerIcon, headerIconHover, "rl-social-header-img")
          : socialIconMarkup(headerIcon, "rl-social-header-img");
      return `<a href="${escapeAttr(l.href ?? "#")}" class="${escapeAttr(l.class ?? "")}"${aria} target="_blank" rel="noopener">${inner}</a>`;
    })
    .join("");

  return `<div class="header-social-links d-flex align-items-center flex-wrap justify-content-end gap-2">${printBtn}${linksHtml}</div>`;
}

function footerSocialHtml(links) {
  return (links ?? [])
    .map((l) => {
      const href = l.href ?? "";
      if (!href) return "";
      const aria = l.label ? ` aria-label="${escapeAttr(l.label)}"` : "";
      const footerIcon = l.iconFooter ?? l.icon;
      const footerIconHover = l.iconFooterHover ?? l.iconHover;
      const inner =
        footerIconHover && isIconUrl(footerIcon)
          ? socialIconDualMarkup(footerIcon, footerIconHover, "rl-social-footer-img")
          : socialIconMarkup(footerIcon, "rl-social-footer-img");
      return `<a href="${escapeAttr(href)}"${aria} target="_blank" rel="noopener">${inner}</a>`;
    })
    .join("");
}

export function renderSiteChrome(site, activeNavId) {
  const headerInner = document.getElementById("header-inner");
  const footerInner = document.getElementById("footer-inner");

  const brand = site?.brand ?? {};
  const logoHtml = brand.logoSrc
    ? `<img src="${escapeAttr(brand.logoSrc)}" alt="${escapeAttr(brand.logoAlt ?? "")}">`
    : "";

  const showPrintResume = activeNavId === "resume" || activeNavId === "cv";

  if (headerInner) {
    headerInner.innerHTML = `
      <a href="${escapeAttr(brand.homeHref ?? "index.html")}" class="logo d-flex align-items-center me-auto me-xl-0">
        ${logoHtml}
        <h1 class="sitename">${escapeHtml(brand.name ?? "")}</h1>
      </a>
      <nav id="navmenu" class="navmenu">
        <ul>
          ${navItemsHtml(site?.nav, activeNavId)}
          ${site?.navCta ? navCtaHtml(site.navCta, activeNavId) : ""}
        </ul>
        <i class="mobile-nav-toggle d-xl-none bi bi-list"></i>
      </nav>
      ${headerSocialHtml(site?.headerSocial, { showPrintResume })}
    `;
  }

  const footer = site?.footer ?? {};
  const copyright = footer.copyright ?? {};
  const copyrightPrefix = copyright.prefix ?? "©";
  const copyrightLabel = copyright.label ?? "Copyright";
  const copyrightBrand =
    copyright.brand ?? footer.copyrightBrand ?? brand.name ?? "";
  const copyrightSuffix = copyright.suffix ?? "All Rights Reserved";
  const footerBrandIcon = copyright.icon ?? footer.copyrightIcon ?? "";
  const footerBrandIconHtml = footerBrandIcon
    ? `<span class="footer-brand-icon" aria-hidden="true">${socialIconMarkup(
        footerBrandIcon,
        "footer-brand-icon-img"
      )}</span>`
    : "";

  if (footerInner) {
    footerInner.innerHTML = `
      <div class="copyright text-center ">
        <p>${escapeHtml(copyrightPrefix)} <span>${escapeHtml(copyrightLabel)}</span> <strong class="px-1 sitename">${footerBrandIconHtml}${escapeHtml(
          copyrightBrand
        )}</strong> <span>${escapeHtml(copyrightSuffix)}<br></span></p>
      </div>
      <div class="social-links d-flex justify-content-center">
        ${footerSocialHtml(footer.social)}
      </div>
      <div class="credits">${footer.creditsHtml ?? ""}</div>
    `;
  }
}
