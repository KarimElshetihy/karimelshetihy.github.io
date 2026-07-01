/**
 * Renders page sections declared in assets/data/pages/*.json
 */

import { initMermaid } from "../markdown/initMermaid.js";
import {
  normalizeProjectContent,
  renderPortfolioContent
} from "../portfolio/renderContent.js";
import {
  collectHeadingAnchors,
  initArticleNav,
  renderArticleNav,
  resolveArticleNavConfig,
  slugifyHeading
} from "../portfolio/articleNav.js";
import {
  renderConfidentialNote,
  renderProjectInfoItem
} from "../portfolio/renderProjectInfo.js";
import { findProjectById, getRequestedProjectId } from "../portfolio/projectIdFromUrl.js";
import { findTopicById, getRequestedTopicId } from "../explore/exploreTopicUrl.js";
import { collectTopicLevelOptions, getTopicLevel, getTopicLevelSlug, getTopicLevelTagClass, getTopicType, getTopicTypeTagClass } from "../explore/exploreTopicMeta.js";
import { filterVisibleItems } from "./itemVisibility.js";
import { sortByOrder } from "./sortByOrder.js";

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

function renderLatestWorkMeta(work) {
  const client = String(work?.client ?? "").trim();
  const subtitle = String(work?.subtitle ?? "").trim();
  if (client) {
    return `<p class="rl-work-client mb-0">Client: ${escapeHtml(client)}</p>`;
  }
  if (subtitle) {
    return `<p class="rl-work-client mb-0">${escapeHtml(subtitle)}</p>`;
  }
  return "";
}

function renderLatestWorkCard(work) {
  const href = String(work?.href ?? "").trim();
  const tag = href ? "a" : "div";
  const attrs = href
    ? ` href="${escapeAttr(href)}"`
    : ` aria-disabled="true" tabindex="-1"`;
  const cardClass = href ? "rl-work-card" : "rl-work-card rl-work-card--static";
  const arrowHtml = href
    ? `<span class="rl-work-arrow" aria-hidden="true"><i class="bi bi-arrow-right"></i></span>`
    : "";

  return `
    <${tag}${attrs} class="${cardClass}">
      <div class="rl-work-thumb">
        <img src="${escapeAttr(work.image ?? "")}" class="rl-work-img" width="800" height="600" alt="${escapeAttr(work.alt ?? work.title ?? "")}">
      </div>
      <div class="rl-work-head">
        <h4 class="rl-work-title">${escapeHtml(work.title ?? "")}</h4>
        ${arrowHtml}
      </div>
      ${renderLatestWorkMeta(work)}
    </${tag}>`;
}

function isResumeSocialIconAsset(icon) {
  const value = String(icon ?? "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")) return true;
  return /\.(svg|png|gif|webp)(\?|#|$)/i.test(value);
}

function resumeSocialIconInner(icon) {
  if (isResumeSocialIconAsset(icon)) {
    return `<img src="${escapeAttr(icon)}" alt="" class="rl-social-disc-img" width="18" height="18" loading="lazy">`;
  }
  return `<i class="bi ${escapeAttr(icon ?? "")}" aria-hidden="true"></i>`;
}

function toPrintKey(value, fallback = "item") {
  const normalized = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function renderPrintToggle(id, label, enabled, options = {}) {
  if (!enabled) return "";
  const showLabel = options.showLabel !== false;
  const safeAria = escapeAttr(label || "Toggle print inclusion");
  return `
    <label class="rl-print-toggle${showLabel ? "" : " rl-print-toggle--checkbox-only"}">
      <input type="checkbox" class="rl-print-toggle-input" data-target="${escapeAttr(id)}" checked aria-label="${safeAria}">
      ${showLabel ? `<span>${escapeHtml(label)}</span>` : ""}
    </label>`;
}

function normalizePreset(input, fallbackIndex = 1) {
  const name = String(input?.name ?? "").trim() || `Preset ${fallbackIndex}`;
  const id = toPrintKey(input?.id ?? name, `preset-${fallbackIndex}`);
  const selectedIds = Array.isArray(input?.selectedIds)
    ? input.selectedIds
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    : [];
  return { id, name, selectedIds };
}

function renderHero(data) {
  return `
    <section id="hero" class="hero section">
      <img src="${escapeAttr(data.backgroundImage)}" alt="" data-aos="fade-in">
      <div class="container text-center" data-aos="zoom-out" data-aos-delay="100">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h2>${escapeHtml(data.heading)}</h2>
            <p>${escapeHtml(data.subheading)}</p>
            <a href="${escapeAttr(data.ctaHref)}" class="btn-get-started">${escapeHtml(data.ctaLabel)}</a>
          </div>
        </div>
      </div>
    </section>`;
}

function levelDots(level, size = 5) {
  const bounded = Math.max(0, Math.min(size, Number(level) || 0));
  const dots = [];
  for (let i = 0; i < size; i += 1) {
    dots.push(
      `<span class="rl-skill-dot ${i < bounded ? "rl-skill-dot--on" : "rl-skill-dot--off"}" aria-hidden="true"></span>`
    );
  }
  return dots.join("");
}

function renderProfileHero(data) {
  const sectionId = String(data.sectionId ?? "about");
  const intro = data.intro ?? {};
  const contacts = data.contacts ?? {};
  const socialLinks = filterVisibleItems(data.socialLinks);
  const quickLinks = filterVisibleItems(data.quickLinks);
  const cvDownloads = data.cvDownloads ?? [];
  const statusBadge = intro.statusBadge ?? {};
  const showStatusBadge = statusBadge.visible !== false && String(statusBadge.label ?? "").trim();
  const headlinePrefix = String(intro.headlinePrefix ?? intro.role ?? "").trim();
  const headlineHighlight = String(intro.headlineHighlight ?? "").trim();
  const location = String(intro.location ?? "").trim();
  const primaryCta = contacts.primaryCta ?? contacts.contactButton ?? {};
  const primaryCtaHref = String(primaryCta.href ?? "").trim();
  const primaryCtaIcon = String(primaryCta.icon ?? "bi-calendar-check").trim();
  const iconLinks = [...socialLinks, ...quickLinks];

  const headlineHtml =
    headlinePrefix || headlineHighlight
      ? `<h1 class="rl-profile-hero-title">
          ${headlinePrefix ? `<span class="rl-profile-hero-title-prefix">${escapeHtml(headlinePrefix)}</span>` : ""}
          ${headlineHighlight ? `<span class="rl-text-gradient">${escapeHtml(headlineHighlight)}</span>` : ""}
        </h1>`
      : intro.name
        ? `<h1 class="rl-profile-hero-title">${escapeHtml(intro.name)}</h1>`
        : "";

  return `
    <section id="${escapeAttr(sectionId)}" class="resume resume-layout section rl-profile-hero-section">
      <div class="container">
        <div class="row align-items-center gy-4 gx-md-5 rl-profile-hero">
          <div class="col-12 col-md-auto text-center text-md-start" data-aos="fade-up">
            <div class="rl-profile-hero-photo-wrap">
              <img src="${escapeAttr(intro.photo ?? "")}" class="rl-profile-hero-photo" width="180" height="180" alt="${escapeAttr(intro.photoAlt ?? intro.name ?? "")}">
            </div>
          </div>
          <div class="col-12 col-md" data-aos="fade-up" data-aos-delay="100">
            <div class="rl-profile-hero-content">
              ${showStatusBadge ? `<span class="rl-status-badge"><span class="rl-status-badge-dot" aria-hidden="true"></span>${escapeHtml(statusBadge.label)}</span>` : ""}
              ${headlineHtml}
              ${intro.bio ? `<p class="rl-profile-hero-bio">${escapeHtml(intro.bio)}</p>` : ""}
              ${location ? `<p class="rl-profile-hero-location"><i class="bi bi-geo-alt" aria-hidden="true"></i><span>${escapeHtml(location)}</span></p>` : ""}
              <div class="rl-profile-hero-actions">
                ${primaryCtaHref ? `<a href="${escapeAttr(primaryCtaHref)}" class="rl-btn-primary">${primaryCtaIcon ? `<i class="bi ${escapeAttr(primaryCtaIcon)}" aria-hidden="true"></i>` : ""}<span>${escapeHtml(primaryCta.label ?? "Contact")}</span></a>` : ""}
                ${cvDownloads.map((item) => {
                  const href = String(item.href ?? "").trim();
                  if (!href) return "";
                  const icon = String(item.icon ?? "bi-download").trim();
                  return `<a href="${escapeAttr(href)}" class="rl-btn-outline"${item.download ? " download" : ""}>${icon ? `<i class="bi ${escapeAttr(icon)}" aria-hidden="true"></i>` : ""}<span>${escapeHtml(item.label ?? "CV")}</span></a>`;
                }).join("")}
              </div>
              ${iconLinks.length ? `<div class="rl-profile-hero-social" role="list">${iconLinks.map((item) => {
                  const label = String(item.label ?? "").trim();
                  return `<a href="${escapeAttr(item.href ?? "#")}" class="rl-profile-hero-social-link" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}" data-bs-toggle="tooltip" data-bs-placement="top"${/^https?:\/\//i.test(String(item.href ?? "")) ? ' target="_blank" rel="noopener"' : ""} role="listitem">${resumeSocialIconInner(item.icon)}</a>`;
                }).join("")}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderResumeData(data) {
  const heroOnly = data.heroOnly === true;
  const heroLayout = String(data.heroLayout ?? (heroOnly ? "profile" : "classic")).trim().toLowerCase();

  if (heroOnly && heroLayout === "profile") {
    return renderProfileHero(data);
  }

  const sectionId = String(data.sectionId ?? (heroOnly ? "about" : "resume"));
  const intro = data.intro ?? {};
  const contacts = data.contacts ?? {};
  const socialLinks = filterVisibleItems(data.socialLinks);
  const experiences = data.experience ?? [];
  const education = data.education ?? [];
  const skills = data.skills ?? [];
  const familiarWith = data.familiarWith ?? [];
  const latestWorks = data.latestWorks ?? [];

  const shouldShowPhone = contacts.showPhone !== false && contacts.phone;
  const shouldShowEmail = contacts.showEmail !== false && contacts.email;
  const contactButton = contacts.contactButton ?? {};
  const contactButtonHref = String(contactButton.href ?? "").trim();
  const useHeroContactButton = heroOnly && Boolean(contactButtonHref);
  const printSelectionEnabled = !heroOnly && data.printSelection?.enabled === true;
  const printTitle = data.printSelection?.title ?? "Customize Print";
  const printPresets = Array.isArray(data.printSelection?.presets)
    ? data.printSelection.presets.map((preset, index) => normalizePreset(preset, index + 1))
    : [];
  const contactLinks = [];

  if (shouldShowPhone) {
    contactLinks.push(
      `<a href="tel:${escapeAttr(contacts.phoneHref ?? contacts.phone)}" class="rl-contact-link"><span class="rl-contact-icon" aria-hidden="true"><i class="bi bi-telephone"></i></span><span>${escapeHtml(contacts.phone)}</span></a>`
    );
  }

  if (useHeroContactButton) {
    const btnLabel = contactButton.label ?? "Contact";
    const btnIcon = String(contactButton.icon ?? "bi-envelope").trim() || "bi-envelope";
    contactLinks.push(
      `<a href="${escapeAttr(contactButtonHref)}" class="rl-contact-link rl-contact-link--cta">${btnIcon ? `<span class="rl-contact-icon" aria-hidden="true"><i class="bi ${escapeAttr(btnIcon)}"></i></span>` : ""}<span>${escapeHtml(btnLabel)}</span></a>`
    );
  } else if (shouldShowEmail) {
    contactLinks.push(
      `<a href="mailto:${escapeAttr(contacts.email)}" class="rl-contact-link"><span class="rl-contact-icon" aria-hidden="true"><i class="bi bi-envelope"></i></span><span>${escapeHtml(contacts.email)}</span></a>`
    );
  }

  const heroPageTitle = String(data.sectionTitle ?? "").trim();
  const heroPageSubtitle = String(data.sectionSubtitle ?? "").trim();
  const heroHeadingHtml =
    heroOnly && heroPageTitle
      ? `<div class="container section-title" data-aos="fade-up">
          <h2>${escapeHtml(heroPageTitle)}</h2>
          ${heroPageSubtitle ? `<p>${escapeHtml(heroPageSubtitle)}</p>` : ""}
        </div>`
      : "";

  const resumeBodyHtml = heroOnly
    ? ""
    : `
        <div class="rl-section rl-section--experience" data-aos="fade-up">
          <div class="rl-section-head rl-section-head--plain">
            <div class="rl-section-heading">
              <h3 class="rl-section-title">Experience</h3>
              <span class="rl-section-index">( 01 )</span>
            </div>
            <div class="rl-section-rule"></div>
          </div>
          <div class="rl-exp-groups">
            ${experiences.map((company) => `
              <article class="rl-exp-group">
                <header class="rl-exp-group-head">
                  <h4 class="rl-exp-group-title mb-1">${escapeHtml(company.company ?? "")}</h4>
                  <p class="rl-exp-group-meta mb-0">${escapeHtml(company.meta ?? "")}</p>
                </header>
                <div class="rl-exp-group-body">
                  ${(company.roles ?? []).map((role, roleIndex) => {
                    const roleId = `role-${toPrintKey(company.company)}-${toPrintKey(role.title, String(roleIndex + 1))}`;
                    const roleHighlights = role.highlights ?? [];
                    return `
                    <section class="rl-exp-role rl-print-selectable" data-print-id="${roleId}" aria-label="${escapeAttr(role.ariaLabel ?? role.title ?? "Experience role")}">
                      ${renderPrintToggle(roleId, role.title ?? "Role", printSelectionEnabled)}
                      <div class="rl-exp-role-head">
                        <h5 class="rl-exp-role-title">${escapeHtml(role.title ?? "")}</h5>
                        ${role.dates ? `<p class="rl-exp-role-dates mb-0">${escapeHtml(role.dates)}</p>` : ""}
                      </div>
                      <ul class="rl-exp-desc mb-0 ps-3">
                        ${roleHighlights.map((line, index, arr) => {
                          const highlightId = `${roleId}-highlight-${index + 1}`;
                          return `
                            <li class="${index === arr.length - 1 ? "mb-0" : "mb-2"} rl-print-selectable" data-print-id="${highlightId}">
                              <div class="rl-exp-highlight-row">
                                ${renderPrintToggle(highlightId, `Include bullet ${index + 1} in print`, printSelectionEnabled, { showLabel: false })}
                                <span class="rl-exp-highlight-text">${escapeHtml(line)}</span>
                              </div>
                            </li>`;
                        }).join("")}
                      </ul>
                    </section>`;
                  }).join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </div>

        <div class="rl-section rl-section--education" data-aos="fade-up">
          <div class="rl-section-head rl-section-head--plain">
            <div class="rl-section-heading">
              <h3 class="rl-section-title">Education</h3>
              <span class="rl-section-index">( 02 )</span>
            </div>
            <div class="rl-section-rule rl-section-rule--bold"></div>
          </div>
          <div class="rl-edu-list">
            ${education.map((item, index) => `
              <article class="rl-edu-item rl-print-selectable" data-print-id="edu-${toPrintKey(item.school, String(index + 1))}">
                ${renderPrintToggle(`edu-${toPrintKey(item.school, String(index + 1))}`, item.school ?? "Education", printSelectionEnabled)}
                <h4 class="rl-edu-heading">${escapeHtml(item.school ?? "")} — ${escapeHtml(item.period ?? "")}</h4>
                <p class="rl-edu-text mb-0">${escapeHtml(item.degree ?? "")}</p>
              </article>
            `).join("")}
          </div>
        </div>

        <div class="rl-section rl-section--skills rl-section--skills-tools" data-aos="fade-up">
          <div class="rl-section-head rl-section-head--plain">
            <div class="rl-section-heading">
              <h3 class="rl-section-title">Skills &amp; Tools</h3>
              <span class="rl-section-index">( 03 )</span>
            </div>
            <div class="rl-section-rule"></div>
          </div>
          <div class="row row-cols-2 row-cols-md-4 row-cols-lg-5 g-3 rl-skills-grid rl-skills-grid--compact rl-skills-grid--merged">
            ${skills.map((skill, index) => `
              <div class="col rl-print-selectable" data-print-id="skill-${toPrintKey(skill.name, String(index + 1))}">
                ${renderPrintToggle(`skill-${toPrintKey(skill.name, String(index + 1))}`, skill.name ?? "Skill", printSelectionEnabled)}
                <div class="rl-skill-card">
                  ${skill.iconType === "bootstrap"
                    ? `<div class="rl-skill-icon rl-skill-icon--symbol" aria-hidden="true"><i class="bi ${escapeAttr(skill.icon ?? "")}"></i></div>`
                    : `<div class="rl-skill-icon"><img src="${escapeAttr(skill.icon ?? "")}" width="44" height="44" alt=""></div>`}
                  <p class="rl-skill-name">${escapeHtml(skill.name ?? "")}</p>
                  <div class="rl-skill-dots" role="img" aria-label="Proficiency ${escapeAttr(skill.level ?? 0)} out of 5">
                    ${levelDots(skill.level, 5)}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="rl-section rl-section--familiar" data-aos="fade-up">
          <div class="rl-section-head rl-section-head--plain">
            <div class="rl-section-heading">
              <h3 class="rl-section-title">Familiar with</h3>
              <span class="rl-section-index">( 04 )</span>
            </div>
            <div class="rl-section-rule"></div>
          </div>
          <div class="row row-cols-2 row-cols-md-4 row-cols-lg-5 g-3 rl-skills-grid rl-skills-grid--data rl-skills-grid--compact">
            ${familiarWith.map((skill, index) => `
              <div class="col rl-print-selectable" data-print-id="familiar-${toPrintKey(skill.name, String(index + 1))}">
                ${renderPrintToggle(`familiar-${toPrintKey(skill.name, String(index + 1))}`, skill.name ?? "Tool", printSelectionEnabled)}
                <div class="rl-skill-card">
                  ${skill.iconType === "bootstrap"
                    ? `<div class="rl-skill-icon rl-skill-icon--symbol" aria-hidden="true"><i class="bi ${escapeAttr(skill.icon ?? "")}"></i></div>`
                    : `<div class="rl-skill-icon"><img src="${escapeAttr(skill.icon ?? "")}" width="32" height="32" alt=""></div>`}
                  <p class="rl-skill-name">${escapeHtml(skill.name ?? "")}</p>
                  <div class="rl-skill-dots" role="img" aria-label="Proficiency ${escapeAttr(skill.level ?? 0)} out of 5">
                    ${levelDots(skill.level, 5)}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="rl-section rl-section--works" data-aos="fade-up">
          <div class="rl-section-head rl-section-head--plain">
            <div class="rl-section-heading">
              <h3 class="rl-section-title">Latest Works</h3>
              <span class="rl-section-index">( 05 )</span>
            </div>
            <div class="rl-section-rule"></div>
          </div>
          <div class="row g-4 rl-works-grid">
            ${latestWorks.map((work, index) => `
              <div class="col-12 col-md-6 rl-print-selectable" data-print-id="work-${toPrintKey(work.title, String(index + 1))}">
                ${renderPrintToggle(`work-${toPrintKey(work.title, String(index + 1))}`, work.title ?? "Work", printSelectionEnabled)}
                ${renderLatestWorkCard(work)}
              </div>
            `).join("")}
          </div>
        </div>
        `;

  return `
    <section id="${escapeAttr(sectionId)}" class="resume resume-layout section">
      ${heroHeadingHtml}
      <div class="container">
        ${printSelectionEnabled ? `
          <div class="rl-print-toolbar" data-print-storage-key="${escapeAttr(data.printSelection?.storageKey ?? "cv-print-selection")}">
            <h3 class="rl-print-toolbar-title">${escapeHtml(printTitle)}</h3>
            <div class="rl-print-toolbar-presets">
              <select class="rl-print-preset-select" data-print-preset-select>
                <option value="">Preset (optional)</option>
                ${printPresets.map((preset) => `<option value="${escapeAttr(preset.id)}">${escapeHtml(preset.name)}</option>`).join("")}
              </select>
              <button type="button" class="rl-print-btn" data-print-action="save-preset">Save as new preset</button>
              <button type="button" class="rl-print-btn" data-print-action="update-preset">Update preset</button>
              <button type="button" class="rl-print-btn rl-print-btn--danger" data-print-action="delete-preset">Delete preset</button>
            </div>
            <div class="rl-print-toolbar-actions">
              <button type="button" class="rl-print-btn" data-print-action="select-all">Select all</button>
              <button type="button" class="rl-print-btn" data-print-action="clear-all">Clear</button>
              <button type="button" class="rl-print-btn rl-print-btn--primary" data-print-action="print">Print selected</button>
            </div>
            <script type="application/json" class="rl-print-presets-config">${JSON.stringify(printPresets)}</script>
          </div>
        ` : ""}
        <div class="row align-items-center gy-4 rl-intro">
          <div class="col-lg-6" data-aos="fade-up">
            <h2 class="rl-intro-name">${escapeHtml(intro.name ?? "")}</h2>
            <p class="rl-intro-role">${escapeHtml(intro.role ?? "")}</p>
            <p class="rl-intro-bio mb-0">${escapeHtml(intro.bio ?? "")}</p>
          </div>
          <div class="col-lg-6 text-lg-end" data-aos="fade-up" data-aos-delay="100">
            <img src="${escapeAttr(intro.photo ?? "")}" class="img-fluid rl-intro-photo" width="520" height="520" alt="${escapeAttr(intro.photoAlt ?? intro.name ?? "")}">
          </div>
        </div>

        <div class="rl-contact-bar" data-aos="fade-up" data-aos-delay="150">
          <div class="rl-contact-list">
            ${contactLinks.join("")}
          </div>
          <div class="rl-contact-social" role="list">
            ${socialLinks.map((item) => `<a href="${escapeAttr(item.href ?? "#")}" class="rl-social-disc" aria-label="${escapeAttr(item.label ?? "")}" target="_blank" rel="noopener" role="listitem">${resumeSocialIconInner(item.icon)}</a>`).join("")}
          </div>
        </div>
        ${resumeBodyHtml}
      </div>
    </section>`;
}

function renderPortfolioDynamic(data) {
  const title = escapeHtml(data.title ?? "Portfolio");
  const subtitle = escapeHtml(data.subtitle ?? "");
  return `
    <section id="portfolio" class="portfolio section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="container">
        <div class="isotope-layout" data-default-filter="*" data-layout="masonry" data-sort="original-order" data-dynamic-portfolio="true">
          <ul id="portfolio-filters" class="portfolio-filters isotope-filters" data-aos="fade-up" data-aos-delay="100">
            <li data-filter="*" class="filter-active">All</li>
          </ul>
          <div id="portfolio-container" class="row gy-4 isotope-container" data-aos="fade-up" data-aos-delay="200"></div>
        </div>
      </div>
    </section>`;
}

function renderAboutSkillsSplitSection(data) {
  const aboutMe = data.aboutMe ?? {};
  const skillCategories = data.skillCategories ?? [];
  const expertiseTitle = String(data.expertiseTitle ?? "Technical Expertise").trim();
  const aboutTitle = String(aboutMe.title ?? "About Me").trim();
  const paragraphs = Array.isArray(aboutMe.paragraphs) ? aboutMe.paragraphs : [];
  const quote = String(aboutMe.quote ?? "").trim();
  const highlights = aboutMe.highlights ?? [];
  const languages = aboutMe.languages ?? [];
  const cta = aboutMe.cta ?? {};
  const ctaHref = String(cta.href ?? "contact.html").trim();
  const ctaIcon = String(cta.icon ?? "bi-calendar-check").trim();

  const highlightsHtml = highlights.length
    ? `<div class="row g-4 rl-about-highlights">${highlights.map((item) => `
        <div class="col-sm-6">
          <div class="rl-about-highlight">
            ${item.icon ? `<div class="rl-about-highlight-icon" aria-hidden="true"><i class="bi ${escapeAttr(item.icon)}"></i></div>` : ""}
            <div class="rl-about-highlight-body">
              <h4 class="rl-about-highlight-title">${escapeHtml(item.title ?? "")}</h4>
              <p class="rl-about-highlight-text mb-0">${escapeHtml(item.description ?? "")}</p>
            </div>
          </div>
        </div>`).join("")}
      </div>`
    : "";

  const languagesHtml = languages.length
    ? `<div class="rl-about-languages">
        <h4 class="rl-about-languages-title">Languages</h4>
        <ul class="rl-about-languages-list mb-0">
          ${languages.map((lang) => `
            <li class="rl-about-language">
              <span class="rl-about-language-dot ${escapeAttr(lang.dotClass ?? "rl-about-language-dot--primary")}" aria-hidden="true"></span>
              <span class="rl-about-language-name">${escapeHtml(lang.name ?? "")}</span>
              <span class="rl-about-language-level">${escapeHtml(lang.level ?? "")}</span>
            </li>`).join("")}
        </ul>
      </div>`
    : "";

  const categoriesHtml = skillCategories.map((category) => `
    <div class="rl-expertise-group">
      <h4 class="rl-expertise-group-title">${escapeHtml(category.name ?? "")}</h4>
      <div class="rl-expertise-tags">
        ${(category.skills ?? []).map((skill) => {
          const label = typeof skill === "string" ? skill : skill?.name ?? "";
          return label ? `<span class="rl-expertise-tag">${escapeHtml(label)}</span>` : "";
        }).join("")}
      </div>
    </div>`).join("");

  return `
    <section id="skills" class="about-skills-split section">
      <div class="container">
        <div class="row gy-5 gx-lg-5 align-items-start">
          <div class="col-lg-7" data-aos="fade-up">
            <div class="rl-about-me-panel">
              <h2 class="rl-about-me-title">${escapeHtml(aboutTitle)}</h2>
              ${paragraphs.map((paragraph) => `<p class="rl-about-me-text">${escapeHtml(paragraph)}</p>`).join("")}
              ${quote ? `<blockquote class="rl-about-me-quote">${escapeHtml(quote)}</blockquote>` : ""}
              ${highlightsHtml}
              ${languagesHtml}
              ${ctaHref && cta.label ? `<a href="${escapeAttr(ctaHref)}" class="rl-about-me-cta">${ctaIcon ? `<i class="bi ${escapeAttr(ctaIcon)}" aria-hidden="true"></i>` : ""}<span>${escapeHtml(cta.label)}</span></a>` : ""}
            </div>
          </div>
          <div class="col-lg-5" data-aos="fade-up" data-aos-delay="100">
            <aside class="rl-expertise-card">
              <h3 class="rl-expertise-card-title">${escapeHtml(expertiseTitle)}</h3>
              ${categoriesHtml}
            </aside>
          </div>
        </div>
      </div>
    </section>`;
}

function renderCareerSection(career) {
  if (!career || typeof career !== "object") return "";

  const experience = sortByOrder(career.experience);
  const education = career.education ?? [];
  const awards = career.awards ?? [];
  if (!experience.length && !education.length && !awards.length) return "";

  const experienceTitle = escapeHtml(career.experienceTitle ?? "Experience");
  const educationTitle = escapeHtml(career.educationTitle ?? "Education");
  const awardsTitle = escapeHtml(career.awardsTitle ?? "Awards & Recognition");
  const defaultExpandedIndex = Math.max(
    0,
    experience.findIndex((item) => item.expanded === true)
  );

  const experienceHtml = experience.length
    ? `
      <div class="rl-career-panel rl-career-panel--experience" data-aos="fade-up">
        <h3 class="rl-career-heading">${experienceTitle}</h3>
        <div class="rl-career-timeline" data-career-timeline>
          <div class="rl-career-timeline-line" aria-hidden="true"></div>
          ${experience.map((item, index) => {
            const isExpanded = index === defaultExpandedIndex;
            const highlights = item.highlights ?? [];
            return `
            <article class="rl-career-exp-item${isExpanded ? " is-expanded" : ""}" data-career-exp-item>
              <div class="rl-career-exp-rail" aria-hidden="true">
                <span class="rl-career-exp-dot"></span>
              </div>
              <div class="rl-career-exp-content">
                <button type="button" class="rl-career-exp-toggle" aria-expanded="${isExpanded ? "true" : "false"}">
                  <span class="rl-career-exp-head">
                    ${item.dates ? `<span class="rl-career-exp-dates">${escapeHtml(item.dates)}</span>` : ""}
                    <span class="rl-career-exp-title">${escapeHtml(item.title ?? "")}</span>
                    ${item.subtitle ? `<span class="rl-career-exp-subtitle">${escapeHtml(item.subtitle)}</span>` : ""}
                  </span>
                  <i class="bi bi-chevron-down rl-career-exp-chevron" aria-hidden="true"></i>
                </button>
                ${highlights.length ? `
                  <div class="rl-career-exp-body">
                    <div class="rl-career-exp-body-inner">
                      <ul class="rl-career-exp-list mb-0">
                        ${highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
                      </ul>
                    </div>
                  </div>` : ""}
              </div>
            </article>`;
          }).join("")}
        </div>
      </div>`
    : "";

  const educationHtml = education.length
    ? `
      <div class="rl-career-panel rl-career-panel--education" data-aos="fade-up" data-aos-delay="100">
        <h3 class="rl-career-heading">${educationTitle}</h3>
        <div class="rl-career-edu-list">
          ${education.map((item) => `
            <article class="rl-career-edu-card">
              <div class="rl-career-edu-card-head">
                <h4 class="rl-career-edu-degree mb-0">${escapeHtml(item.degree ?? "")}</h4>
                ${item.period ? `<span class="rl-career-edu-period">${escapeHtml(item.period)}</span>` : ""}
              </div>
              ${item.school ? `<p class="rl-career-edu-school mb-0">${escapeHtml(item.school)}</p>` : ""}
              ${item.description || item.note ? `<p class="rl-career-edu-description mb-0">${escapeHtml(item.description ?? item.note ?? "")}</p>` : ""}
            </article>
          `).join("")}
        </div>
      </div>`
    : "";

  const awardsHtml = awards.length
    ? `
      <div class="rl-career-panel rl-career-panel--awards" data-aos="fade-up" data-aos-delay="150">
        <h3 class="rl-career-heading">${awardsTitle}</h3>
        <div class="row g-3 rl-career-awards-grid">
          ${awards.map((item) => `
            <div class="col-sm-6">
              <article class="rl-career-award">
                ${item.icon ? `<span class="rl-career-award-icon" aria-hidden="true"><i class="bi ${escapeAttr(item.icon)}"></i></span>` : ""}
                <div class="rl-career-award-body">
                  <h4 class="rl-career-award-title mb-0">${escapeHtml(item.title ?? "")}</h4>
                  ${item.description ? `<p class="rl-career-award-text mb-0">${escapeHtml(item.description)}</p>` : ""}
                </div>
              </article>
            </div>
          `).join("")}
        </div>
      </div>`
    : "";

  return `
    <section id="career" class="career-section section">
      <div class="container">
        <div class="row g-4 g-lg-5 align-items-start">
          ${experienceHtml ? `<div class="col-lg-7">${experienceHtml}</div>` : ""}
          ${educationHtml || awardsHtml
            ? `<div class="col-lg-5">
                ${educationHtml}
                ${awardsHtml}
              </div>`
            : ""}
        </div>
      </div>
    </section>`;
}

function renderAboutData(data) {
  const about = data.about ?? {};
  const skills = data.skills ?? {};
  const isCvSkillsFormat = Array.isArray(skills);
  const skillsPreviewCount = Math.max(1, Number(data.skillsPreviewCount) || 10);
  const showAllSkillsLabel = String(data.showAllSkillsLabel ?? "Show all skills");
  const showLessSkillsLabel = String(data.showLessSkillsLabel ?? "Show less");
  const skillsTitle = isCvSkillsFormat
    ? escapeHtml(data.skillsTitle ?? "Skills & Tools")
    : escapeHtml(skills.title ?? "Skills");
  const skillsSubtitle = isCvSkillsFormat
    ? escapeHtml(data.skillsSubtitle ?? "")
    : escapeHtml(skills.subtitle ?? "");
  const stats = data.stats ?? {};
  const latestWorks = data.latestWorks ?? [];
  const latestWorksTitle = escapeHtml(data.latestWorksTitle ?? "Latest Works");
  const latestWorksSwiperConfig = {
    loop: false,
    speed: 600,
    spaceBetween: 16,
    slidesPerView: 1.1,
    pagination: { el: ".swiper-pagination", type: "bullets", clickable: true },
    breakpoints: {
      576: { slidesPerView: 1.35 },
      768: { slidesPerView: 2 },
      1200: { slidesPerView: 2.35 }
    }
  };
  const careerSectionHtml = renderCareerSection(data.career);
  const latestWorksSectionHtml = latestWorks.length
    ? `
    <section id="latest-works" class="resume resume-layout section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${latestWorksTitle}</h2>
      </div>
      <div class="container">
        <div class="rl-section rl-section--works latest-works-slider" data-aos="fade-up">
          <div class="swiper init-swiper">
            <script type="application/json" class="swiper-config">${JSON.stringify(latestWorksSwiperConfig)}</script>
            <div class="swiper-wrapper">
            ${latestWorks.map((work) => `
              <div class="swiper-slide">
                ${renderLatestWorkCard(work)}
              </div>
            `).join("")}
            </div>
            <div class="swiper-pagination"></div>
          </div>
        </div>
      </div>
    </section>`
    : "";
  const testimonials = data.testimonials ?? {};
  const hireMe = data.hireMe ?? {};
  const hireMeHeading = String(hireMe.heading ?? "I'm Available for freelancing").trim();
  const hireMeHighlight = String(hireMe.highlight ?? "Available").trim();
  const hireMeSubtitle = String(hireMe.subtitle ?? "").trim();
  const hireMeButtonLabel = String(hireMe.buttonLabel ?? "Hire Me").trim();
  const hireMeButtonHref = String(hireMe.buttonHref ?? "contact.html").trim();
  const hireMeBackgroundImage = String(hireMe.backgroundImage ?? "assets/img/hero-bg.jpg").trim();

  const normalizedHeading = hireMeHeading.toLowerCase();
  const normalizedHighlight = hireMeHighlight.toLowerCase();
  const highlightStartIndex = hireMeHighlight ? normalizedHeading.indexOf(normalizedHighlight) : -1;
  const hireMeHeadingHtml = highlightStartIndex >= 0
    ? `${escapeHtml(hireMeHeading.slice(0, highlightStartIndex))}<span>${escapeHtml(hireMeHeading.slice(highlightStartIndex, highlightStartIndex + hireMeHighlight.length))}</span>${escapeHtml(hireMeHeading.slice(highlightStartIndex + hireMeHighlight.length))}`
    : escapeHtml(hireMeHeading);
  const hireMeSectionHtml = hireMeButtonLabel || hireMeSubtitle || hireMeHeading
    ? `
    <section id="hire-me" class="about-hire section" style="background-image: url('${escapeAttr(hireMeBackgroundImage)}');">
      <div class="about-hire-overlay"></div>
      <div class="container text-center" data-aos="fade-up">
        <h2 class="about-hire-title">${hireMeHeadingHtml}</h2>
        ${hireMeSubtitle ? `<p class="about-hire-subtitle">${escapeHtml(hireMeSubtitle)}</p>` : ""}
        ${hireMeButtonLabel ? `<a href="${escapeAttr(hireMeButtonHref)}" class="about-hire-btn">${escapeHtml(hireMeButtonLabel)}</a>` : ""}
      </div>
    </section>`
    : "";
  const omitAboutSection = data.omitAboutSection === true;

  const testimonialItems = testimonials.items ?? [];
  const feedbackButton = testimonials.feedbackButton ?? {};
  const feedbackHref = String(feedbackButton.href ?? "contact.html").trim();
  const feedbackIcon = String(feedbackButton.icon ?? "bi-arrow-right").trim();
  const testimonialsSwiperConfig = {
    loop: testimonialItems.length > 3,
    speed: 600,
    spaceBetween: 20,
    slidesPerView: 1.08,
    pagination: { el: ".swiper-pagination", type: "bullets", clickable: true },
    breakpoints: {
      576: { slidesPerView: 1.2, spaceBetween: 20 },
      768: { slidesPerView: 2, spaceBetween: 22 },
      1200: { slidesPerView: 3, spaceBetween: 24 }
    }
  };

  const testimonialsSectionHtml = `
    <section id="testimonials" class="testimonials testimonials-cards section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(testimonials.title ?? "Testimonials")}</h2>
        ${testimonials.subtitle ? `<p>${escapeHtml(testimonials.subtitle)}</p>` : ""}
      </div>
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="swiper init-swiper testimonials-slider">
          <script type="application/json" class="swiper-config">${JSON.stringify(testimonialsSwiperConfig)}</script>
          <div class="swiper-wrapper">
            ${testimonialItems.map((item) => `
              <div class="swiper-slide">
                <article class="testimonial-card">
                  <blockquote class="testimonial-card-quote">&ldquo;${escapeHtml(item.quote ?? "")}&rdquo;</blockquote>
                  <footer class="testimonial-card-author">
                    <strong class="testimonial-card-name">${escapeHtml(item.name ?? "")}</strong>
                    ${item.role ? `<span class="testimonial-card-role">${escapeHtml(item.role)}</span>` : ""}
                  </footer>
                </article>
              </div>
            `).join("")}
          </div>
          <div class="swiper-pagination"></div>
        </div>
        ${feedbackHref && feedbackButton.label ? `
          <div class="testimonials-feedback-wrap text-center">
            <a href="${escapeAttr(feedbackHref)}" class="testimonials-feedback-btn">
              <span>${escapeHtml(feedbackButton.label)}</span>
              ${feedbackIcon ? `<i class="bi ${escapeAttr(feedbackIcon)}" aria-hidden="true"></i>` : ""}
            </a>
          </div>` : ""}
      </div>
    </section>`;

  const aboutSectionHtml = omitAboutSection
    ? ""
    : `
    <section id="about" class="about section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(about.title ?? "About")}</h2>
        <p>${escapeHtml(about.subtitle ?? "")}</p>
      </div>
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row gy-4 justify-content-center">
          <div class="col-lg-4">
            <img src="${escapeAttr(about.image ?? "")}" class="img-fluid" alt="${escapeAttr(about.imageAlt ?? "")}">
          </div>
          <div class="col-lg-8 content">
            <h2>${escapeHtml(about.headline ?? "")}</h2>
            <p class="fst-italic py-3">${escapeHtml(about.intro ?? "")}</p>
            <div class="row">
              <div class="col-lg-6">
                <ul>
                  ${(about.detailsLeft ?? []).map((item) => `<li><i class="bi bi-chevron-right"></i> <strong>${escapeHtml(item.label ?? "")}:</strong> <span>${escapeHtml(item.value ?? "")}</span></li>`).join("")}
                </ul>
              </div>
              <div class="col-lg-6">
                <ul>
                  ${(about.detailsRight ?? []).map((item) => `<li><i class="bi bi-chevron-right"></i> <strong>${escapeHtml(item.label ?? "")}:</strong> <span>${escapeHtml(item.value ?? "")}</span></li>`).join("")}
                </ul>
              </div>
            </div>
            <p class="py-3">${escapeHtml(about.summary ?? "")}</p>
          </div>
        </div>
      </div>
    </section>
`;

  return `${aboutSectionHtml}
    <section id="stats" class="stats section">
      <div class="container" data-aos="fade-up">
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 gy-4 about-stats-row">
          ${(stats.items ?? []).map((item) => `
            <div class="col">
              <div class="stats-item text-center w-100 h-100">
                <div class="stats-value">
                  <span data-purecounter-start="0" data-purecounter-end="${escapeAttr(item.value ?? 0)}" data-purecounter-duration="1" class="purecounter stats-number"></span>
                  ${item.suffix ? `<span class="stats-suffix">${escapeHtml(item.suffix)}</span>` : ""}
                </div>
                <p>${escapeHtml(item.label ?? "")}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>

    ${data.skillsLayout === "split"
      ? renderAboutSkillsSplitSection(data)
      : isCvSkillsFormat
      ? `<section id="skills" class="resume resume-layout section">
          <div class="container section-title" data-aos="fade-up">
            <h2>${skillsTitle}</h2>
            ${skillsSubtitle ? `<p>${skillsSubtitle}</p>` : ""}
          </div>
          <div class="container">
            <div class="rl-section rl-section--skills rl-section--skills-tools" data-aos="fade-up">
              <div class="rl-about-skills" data-about-skills>
                <div class="row row-cols-2 row-cols-md-4 row-cols-lg-5 g-3 rl-skills-grid rl-skills-grid--compact rl-skills-grid--merged">
                  ${skills.map((skill, index) => `
                  <div class="col${index >= skillsPreviewCount ? " rl-about-skill-hidden" : ""}" data-about-skill-item data-about-skill-hidden="${index >= skillsPreviewCount ? "true" : "false"}">
                    <div class="rl-skill-card">
                      ${skill.iconType === "bootstrap"
                        ? `<div class="rl-skill-icon rl-skill-icon--symbol" aria-hidden="true"><i class="bi ${escapeAttr(skill.icon ?? "")}"></i></div>`
                        : `<div class="rl-skill-icon"><img src="${escapeAttr(skill.icon ?? "")}" width="44" height="44" alt=""></div>`}
                      <p class="rl-skill-name">${escapeHtml(skill.name ?? "")}</p>
                      <div class="rl-skill-dots" role="img" aria-label="Proficiency ${escapeAttr(skill.level ?? 0)} out of 5">
                        ${levelDots(skill.level, 5)}
                      </div>
                    </div>
                  </div>
                  `).join("")}
                </div>
                ${skills.length > skillsPreviewCount
                  ? `<div class="rl-about-skills-toggle-wrap text-center mt-4">
                      <button
                        type="button"
                        class="rl-about-skills-toggle"
                        data-about-skills-toggle
                        data-collapsed-label="${escapeAttr(showAllSkillsLabel)}"
                        data-expanded-label="${escapeAttr(showLessSkillsLabel)}"
                        aria-expanded="false"
                      >${escapeHtml(showAllSkillsLabel)}</button>
                    </div>`
                  : ""}
              </div>
            </div>
          </div>
        </section>`
      : `<section id="skills" class="skills section">
          <div class="container section-title" data-aos="fade-up">
            <h2>${skillsTitle}</h2>
            ${skillsSubtitle ? `<p>${skillsSubtitle}</p>` : ""}
          </div>
          <div class="container" data-aos="fade-up" data-aos-delay="100">
            <div class="row skills-content skills-animation">
              <div class="col-lg-6">
                ${(skills.items ?? []).filter((_, index) => index % 2 === 0).map((item) => `
                  <div class="progress">
                    <span class="skill"><span>${escapeHtml(item.name ?? "")}</span> <i class="val">${escapeHtml(item.value ?? 0)}%</i></span>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar" role="progressbar" aria-valuenow="${escapeAttr(item.value ?? 0)}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                  </div>
                `).join("")}
              </div>
              <div class="col-lg-6">
                ${(skills.items ?? []).filter((_, index) => index % 2 === 1).map((item) => `
                  <div class="progress">
                    <span class="skill"><span>${escapeHtml(item.name ?? "")}</span> <i class="val">${escapeHtml(item.value ?? 0)}%</i></span>
                    <div class="progress-bar-wrap">
                      <div class="progress-bar" role="progressbar" aria-valuenow="${escapeAttr(item.value ?? 0)}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </section>`}

    ${latestWorksSectionHtml}

    ${careerSectionHtml}

    ${testimonialsSectionHtml}

    ${hireMeSectionHtml}`;
}

function renderServicesData(data) {
  return `
    <section id="services" class="services section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(data.title ?? "Services")}</h2>
        <p>${escapeHtml(data.subtitle ?? "")}</p>
      </div>
      <div class="container">
        <div class="row gy-4">
          ${(data.items ?? []).map((item, index) => `
            <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="${escapeAttr(item.delay ?? (index + 1) * 100)}">
              <div class="service-item ${escapeAttr(item.variantClass ?? "item-cyan")} position-relative">
                <div class="icon"><i class="bi ${escapeAttr(item.icon ?? "bi-gear")}"></i></div>
                <a href="#" class="stretched-link"><h3>${escapeHtml(item.title ?? "")}</h3></a>
                <p>${escapeHtml(item.description ?? "")}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>`;
}

function renderContactData(data) {
  const map = data.map ?? {};
  const googleForm = data.googleForm ?? {};
  const infoItems = data.infoItems ?? [];
  const formEmbedUrl = String(googleForm.embedUrl ?? "").trim();
  const formWidth = Number(googleForm.width) || 800;
  const formHeight = Number(googleForm.height) || 1200;
  const mapEmbedUrl = String(map.embedUrl ?? "").trim();
  const mapIframe = mapEmbedUrl
    ? `<iframe src="${escapeAttr(mapEmbedUrl)}" frameborder="0" style="border:0; width: 100%; height: 270px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
    : "";
  const hasSidebar = infoItems.length > 0 || mapIframe;
  const formColumnClass = hasSidebar ? "col-lg-7" : "col-12";

  const sidebarHtml = hasSidebar
    ? `
          <div class="col-lg-5">
            <div class="info-wrap">
              ${infoItems.map((item, index) => `
                <div class="info-item d-flex" data-aos="fade-up" data-aos-delay="${escapeAttr(200 + (index * 100))}">
                  <i class="bi ${escapeAttr(item.icon ?? "bi-info-circle")} flex-shrink-0"></i>
                  <div>
                    <h3>${escapeHtml(item.title ?? "")}</h3>
                    <p>${escapeHtml(item.value ?? "")}</p>
                  </div>
                </div>
              `).join("")}
              ${mapIframe}
            </div>
          </div>`
    : "";

  return `
    <section id="contact" class="contact section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(data.title ?? "Contact")}</h2>
        <p>${escapeHtml(data.subtitle ?? "")}</p>
      </div>
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row gy-4 justify-content-center">
          ${sidebarHtml}
          <div class="${formColumnClass}">
            <div class="contact-google-form-wrap" data-aos="fade-up" data-aos-delay="200">
              <iframe
                src="${escapeAttr(formEmbedUrl)}"
                title="${escapeAttr(googleForm.title ?? "Contact form")}"
                width="${formWidth}"
                height="${formHeight}"
                frameborder="0"
                marginheight="0"
                marginwidth="0"
                loading="lazy"
              >Loading…</iframe>
            </div>

          </div>
        </div>
      </div>
    </section>`;
}

function renderStarterData(data) {
  return `
    <section id="starter-section" class="starter-section section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(data.title ?? "Starter Section")}</h2>
        <p>${escapeHtml(data.subtitle ?? "")}</p>
      </div>
      <div class="container" data-aos="fade-up">
        <p>${escapeHtml(data.body ?? "")}</p>
      </div>
    </section>`;
}

function getExploreSoonLabel(item) {
  const label = String(item?.soonLabel ?? item?.soonTag ?? "").trim();
  return label || "Soon";
}

function isExploreItemSoon(item) {
  return item?.soon === true || Number(item?.soon) === 1 || item?.unavailable === true;
}

function renderExploreTopicCard(topic) {
  const href = String(topic?.href ?? "").trim();
  const isClickable = Boolean(href);
  const showSoon = isExploreItemSoon(topic) || !isClickable;
  const level = getTopicLevel(topic);
  const topicType = getTopicType(topic);
  const levelSlug = level ? getTopicLevelSlug(level) || "default" : "none";
  const levelTag = level
    ? `<span class="${escapeAttr(getTopicLevelTagClass(level))}">${escapeHtml(level)}</span>`
    : "";
  const typeTag = topicType
    ? `<span class="${escapeAttr(getTopicTypeTagClass(topicType))}">${escapeHtml(topicType)}</span>`
    : "";
  const metaTags = typeTag || levelTag
    ? `<div class="rl-explore-topic-card-tags">${typeTag}${levelTag}</div>`
    : "";
  const tag = isClickable ? "a" : "div";
  const attrs = isClickable
    ? ` href="${escapeAttr(href)}"`
    : ` aria-disabled="true" tabindex="-1"`;
  const cardClass = isClickable
    ? "rl-explore-topic-card"
    : "rl-explore-topic-card rl-explore-topic-card--static";

  return `
    <${tag}${attrs} class="${cardClass}" data-topic-level="${escapeAttr(levelSlug)}">
      <div class="rl-explore-topic-card-header">
        ${topic.icon ? `<span class="rl-explore-topic-icon" aria-hidden="true"><i class="bi ${escapeAttr(topic.icon)}"></i></span>` : ""}
        <div class="rl-explore-topic-card-main">
          <h4 class="rl-explore-topic-title">${escapeHtml(topic.title ?? "")}</h4>
          ${metaTags}
        </div>
        ${showSoon ? `<span class="rl-explore-soon-badge">${escapeHtml(getExploreSoonLabel(topic))}</span>` : ""}
      </div>
      ${topic.description ? `<p class="rl-explore-topic-desc mb-0">${escapeHtml(topic.description)}</p>` : ""}
    </${tag}>`;
}

function renderExploreData(data) {
  const title = escapeHtml(data.title ?? "Explore");
  const subtitle = escapeHtml(data.subtitle ?? "");
  const categories = sortByOrder(data.categories ?? []);
  const topics = data.topics ?? [];
  const defaultCategoryId =
    categories.find((item) => item.default === true || item.is_default === true)?.id
    ?? categories.find((item) => item.soon !== true && Number(item.soon) !== 1)?.id
    ?? categories[0]?.id
    ?? "";

  const topicsByCategory = topics.reduce((groups, topic) => {
    const categoryId = String(topic.categoryId ?? "").trim();
    if (!categoryId) return groups;
    if (!groups[categoryId]) groups[categoryId] = [];
    groups[categoryId].push(topic);
    return groups;
  }, {});

  Object.keys(topicsByCategory).forEach((categoryId) => {
    topicsByCategory[categoryId] = sortByOrder(topicsByCategory[categoryId]);
  });

  const categoriesHtml = categories.map((category) => {
    const isSoon = category.soon === true || Number(category.soon) === 1;
    const isDefault = category.id === defaultCategoryId;
    return `
      <button
        type="button"
        class="rl-explore-category-card${isDefault ? " is-active" : ""}${isSoon ? " is-soon" : ""}"
        data-explore-category="${escapeAttr(category.id ?? "")}"
        data-explore-title="${escapeAttr(category.title ?? "")}"
        data-explore-long-description="${escapeAttr(category.longDescription ?? category.description ?? "")}"
        ${isSoon ? "disabled aria-disabled=\"true\" tabindex=\"-1\"" : ""}
        aria-pressed="${isDefault ? "true" : "false"}">
        <span class="rl-explore-category-card-inner">
          ${category.icon ? `<span class="rl-explore-category-icon" aria-hidden="true"><i class="bi ${escapeAttr(category.icon)}"></i></span>` : ""}
          <span class="rl-explore-category-text">
            <span class="rl-explore-category-title">${escapeHtml(category.title ?? "")}</span>
            <span class="rl-explore-category-summary">${escapeHtml(category.description ?? "")}</span>
          </span>
        </span>
        ${isSoon ? `<span class="rl-explore-soon-badge">${escapeHtml(getExploreSoonLabel(category))}</span>` : ""}
      </button>`;
  }).join("");

  const topicPanelsHtml = categories.map((category) => {
    const categoryTopics = topicsByCategory[category.id] ?? [];
    const isDefault = category.id === defaultCategoryId;
    return `
      <div
        class="rl-explore-topics${isDefault ? " is-active" : ""}"
        data-explore-topics-panel
        data-category="${escapeAttr(category.id ?? "")}"
        ${isDefault ? "" : "hidden"}>
        ${categoryTopics.map((topic) => renderExploreTopicCard(topic)).join("")}
      </div>`;
  }).join("");

  const defaultCategory = categories.find((item) => item.id === defaultCategoryId);
  const defaultDescription = escapeHtml(
    defaultCategory?.longDescription ?? defaultCategory?.description ?? ""
  );
  const defaultTopicCount = (topicsByCategory[defaultCategoryId] ?? []).length;
  const levelOptions = collectTopicLevelOptions(topics);
  const levelFilterHtml = levelOptions.length
    ? `
            <div class="rl-explore-level-filter">
              <span class="rl-explore-level-filter-label">
                <i class="bi bi-sliders" aria-hidden="true"></i>
                Filter by level
              </span>
              <div
                class="rl-explore-level-filter-options"
                data-explore-level-filter
                role="group"
                aria-label="Filter topics by level">
                <button
                  type="button"
                  class="rl-explore-level-chip is-active"
                  data-level="all"
                  aria-pressed="true">All</button>
                ${levelOptions
                  .map(
                    (option) =>
                      `<button type="button" class="rl-explore-level-chip rl-explore-level-chip--${escapeAttr(option.slug)}" data-level="${escapeAttr(option.slug)}" aria-pressed="false">${escapeHtml(option.label)}</button>`
                  )
                  .join("")}
              </div>
            </div>`
    : "";

  return `
    <section id="explore" class="explore section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="rl-explore" data-explore-root data-default-category="${escapeAttr(defaultCategoryId)}">
          <div class="rl-explore-categories" role="tablist" aria-label="Explore categories">
            ${categoriesHtml}
          </div>
          <div class="rl-explore-topics-section">
            <div class="rl-explore-topics-head">
              <div class="rl-explore-topics-head-text">
                <h3 class="rl-explore-topics-title mb-0" data-explore-topics-title>${escapeHtml(defaultCategory?.title ?? "")}</h3>
                <p class="rl-explore-category-desc mb-0" data-explore-description-panel>${defaultDescription}</p>
              </div>
            </div>
            <div class="rl-explore-topics-toolbar${levelOptions.length ? "" : " rl-explore-topics-toolbar--count-only"}">
              ${levelFilterHtml}
              <span class="rl-explore-topics-count" data-explore-topics-count>${defaultTopicCount} topic${defaultTopicCount === 1 ? "" : "s"}</span>
            </div>
            <div class="rl-explore-topics-panels" data-explore-topics-panels>
              ${topicPanelsHtml}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderContentDetailsSection(data, config) {
  const {
    getRequestedId,
    findById,
    itemsKey,
    backHref,
    backLabel,
    sectionId,
    sectionClass,
    defaultInfoTitle
  } = config;

  const requestedId = getRequestedId();
  const variants = Array.isArray(data[itemsKey]) ? data[itemsKey] : [];
  const matchedItem = findById(variants, requestedId);
  const selectedItem = matchedItem ?? variants[0];
  const detailsData = selectedItem ?? data;

  const sliderImages = detailsData.sliderImages ?? data.sliderImages ?? [];
  const projectInfo = detailsData.projectInfo ?? data.projectInfo ?? [];
  const articleNavConfig = resolveArticleNavConfig(detailsData, data);
  let articleAnchors = [];
  let articleHtml = "";

  if (detailsData._markdown?.html) {
    articleHtml = detailsData._markdown.html;
    articleAnchors = articleNavConfig.enabled ? (detailsData._markdown.anchors ?? []) : [];
  } else {
    const articleContent = normalizeProjectContent(detailsData);
    articleAnchors = articleNavConfig.enabled
      ? collectHeadingAnchors(articleContent, { levels: articleNavConfig.levels })
      : [];
    articleHtml = renderPortfolioContent(articleContent, {
      anchors: articleAnchors,
      anchorLevels: articleNavConfig.levels
    });
  }
  const articleNavHtml = articleNavConfig.enabled
    ? renderArticleNav(articleAnchors, {
        title: articleNavConfig.title,
        minItems: articleNavConfig.minItems,
        placement: "embedded",
        defaultExpanded: articleNavConfig.defaultExpanded,
        panelId: `article-nav-${slugifyHeading(detailsData.id ?? requestedId ?? "item")}`
      })
    : "";

  const swiperConfig = {
    loop: true,
    speed: 600,
    autoplay: { delay: 5000 },
    slidesPerView: "auto",
    pagination: { el: ".swiper-pagination", type: "bullets", clickable: true }
  };

  return `
    <section id="${escapeAttr(sectionId)}" class="${escapeAttr(sectionClass)} section">
      <div class="container section-title" data-aos="fade-up">
        <h2>${escapeHtml(detailsData.title ?? data.title ?? "")}</h2>
        <p>${escapeHtml(detailsData.subtitle ?? data.subtitle ?? "")}</p>
      </div>

      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row gy-4 portfolio-details-layout">
          <div class="col-lg-8">
            ${sliderImages.length
              ? `
            <div class="portfolio-details-slider swiper init-swiper" data-aos="fade-up" data-aos-delay="100">
              <script type="application/json" class="swiper-config">${JSON.stringify(swiperConfig)}</script>
              <div class="swiper-wrapper align-items-center">
                ${sliderImages.map((image) => `
                  <div class="swiper-slide">
                    <img src="${escapeAttr(image.src ?? "")}" alt="${escapeAttr(image.alt ?? "")}">
                  </div>
                `).join("")}
              </div>
              <div class="swiper-pagination"></div>
            </div>`
              : ""}
            ${articleHtml
              ? `
            <article class="portfolio-article${sliderImages.length ? " portfolio-article--with-slider" : ""}" data-aos="fade-up" data-aos-delay="200">
              ${articleHtml}
              <p class="portfolio-article-back">
                <a href="${escapeAttr(backHref)}"><i class="bi bi-arrow-left" aria-hidden="true"></i> ${escapeHtml(backLabel)}</a>
              </p>
            </article>`
              : ""}
          </div>

          <div class="col-lg-4">
            <div class="portfolio-info portfolio-info--sidebar" data-aos="fade-up" data-aos-delay="200">
              <h3>${escapeHtml(detailsData.infoTitle ?? data.infoTitle ?? defaultInfoTitle)}</h3>
              ${articleNavHtml}
              <ul>
                ${projectInfo.map((item) => renderProjectInfoItem(item)).join("")}
              </ul>
              ${renderConfidentialNote(detailsData)}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderPortfolioDetailsData(data) {
  return renderContentDetailsSection(data, {
    getRequestedId: getRequestedProjectId,
    findById: findProjectById,
    itemsKey: "projects",
    backHref: "portfolio.html",
    backLabel: "Back to portfolio",
    sectionId: "portfolio-details",
    sectionClass: "portfolio-details",
    defaultInfoTitle: "Project information"
  });
}

function renderExploreDetailsData(data) {
  return renderContentDetailsSection(data, {
    getRequestedId: getRequestedTopicId,
    findById: findTopicById,
    itemsKey: "topics",
    backHref: "explore.html",
    backLabel: "Back to explore",
    sectionId: "explore-details",
    sectionClass: "portfolio-details explore-details",
    defaultInfoTitle: "Topic information"
  });
}

export function renderSection(section) {
  const type = section?.type;
  const data = section?.data ?? {};

  switch (type) {
    case "hero":
      return renderHero(data);
    case "resumeData":
      return renderResumeData(data);
    case "portfolioDynamic":
      return renderPortfolioDynamic(data);
    case "aboutData":
      return renderAboutData(data);
    case "servicesData":
      return renderServicesData(data);
    case "contactData":
      return renderContactData(data);
    case "starterData":
      return renderStarterData(data);
    case "portfolioDetailsData":
      return renderPortfolioDetailsData(data);
    case "exploreData":
      return renderExploreData(data);
    case "exploreDetailsData":
      return renderExploreDetailsData(data);
    default:
      console.warn("[renderPage] Unknown section type:", type);
      return "";
  }
}

export function renderPage(pageData) {
  const root = document.getElementById("page-root");
  if (!root) return;

  const html = (pageData?.sections ?? []).map(renderSection).join("");
  root.innerHTML = html;
  initAboutSkillsToggle(root);
  initProfileHeroTooltips(root);
  initCareerTimeline(root);
  initExplorePage(root);
  initPrintSelection(root);
  initArticleNav(root);
  initMermaid(root);
}

function initExplorePage(root) {
  const exploreRoot = root.querySelector("[data-explore-root]");
  if (!exploreRoot || exploreRoot.dataset.bound === "true") return;
  exploreRoot.dataset.bound = "true";

  const categoryButtons = Array.from(exploreRoot.querySelectorAll("[data-explore-category]"));
  const topicPanels = Array.from(exploreRoot.querySelectorAll("[data-explore-topics-panel]"));
  const descriptionEl = exploreRoot.querySelector("[data-explore-description-panel]");
  const topicsTitleEl = exploreRoot.querySelector("[data-explore-topics-title]");
  const topicsCountEl = exploreRoot.querySelector("[data-explore-topics-count]");
  const levelFilterRoot = exploreRoot.querySelector("[data-explore-level-filter]");
  const levelFilterButtons = levelFilterRoot
    ? Array.from(levelFilterRoot.querySelectorAll("[data-level]"))
    : [];
  const defaultCategoryId = exploreRoot.dataset.defaultCategory ?? "";

  function getActiveLevelFilter() {
    const activeButton = levelFilterButtons.find((button) => button.classList.contains("is-active"));
    return activeButton?.dataset.level ?? "all";
  }

  function setActiveLevelFilter(levelSlug) {
    const filterValue = levelSlug || "all";

    levelFilterButtons.forEach((button) => {
      const isActive = button.dataset.level === filterValue;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function updateTopicCount() {
    if (!topicsCountEl) {
      return;
    }

    const activePanel = topicPanels.find((panel) => !panel.hidden);
    if (!activePanel) {
      return;
    }

    const count = activePanel.querySelectorAll(".rl-explore-topic-card:not([hidden])").length;
    topicsCountEl.textContent = `${count} topic${count === 1 ? "" : "s"}`;
  }

  function applyLevelFilter(levelSlug = "all") {
    const filterValue = levelSlug || "all";

    topicPanels.forEach((panel) => {
      panel.querySelectorAll(".rl-explore-topic-card").forEach((card) => {
        const cardLevel = card.dataset.topicLevel ?? "none";
        const visible = filterValue === "all" || cardLevel === filterValue;
        card.hidden = !visible;
      });
    });

    setActiveLevelFilter(filterValue);
    updateTopicCount();
  }

  function showCategory(categoryId, description, categoryTitle) {
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.exploreCategory === categoryId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (descriptionEl) {
      descriptionEl.textContent = description;
    }

    if (topicsTitleEl) {
      topicsTitleEl.textContent = categoryTitle;
    }

    topicPanels.forEach((panel) => {
      const isActive = panel.dataset.category === categoryId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    applyLevelFilter(getActiveLevelFilter());
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      showCategory(
        button.dataset.exploreCategory ?? "",
        button.dataset.exploreLongDescription ?? "",
        button.dataset.exploreTitle ?? ""
      );
    });
  });

  levelFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLevelFilter(button.dataset.level ?? "all");
    });
  });

  if (defaultCategoryId) {
    const defaultButton = categoryButtons.find(
      (button) => button.dataset.exploreCategory === defaultCategoryId
    );
    showCategory(
      defaultCategoryId,
      defaultButton?.dataset.exploreLongDescription ?? descriptionEl?.textContent ?? "",
      defaultButton?.dataset.exploreTitle ?? topicsTitleEl?.textContent ?? ""
    );
  }
}

function initCareerTimeline(root) {
  const timelines = Array.from(root.querySelectorAll("[data-career-timeline]"));
  timelines.forEach((timeline) => {
    if (timeline.dataset.bound === "true") return;
    timeline.dataset.bound = "true";

    const items = Array.from(timeline.querySelectorAll("[data-career-exp-item]"));
    items.forEach((item) => {
      const toggle = item.querySelector(".rl-career-exp-toggle");
      const body = item.querySelector(".rl-career-exp-body");
      if (!toggle || !body) return;

      toggle.addEventListener("click", () => {
        const isExpanded = item.classList.contains("is-expanded");

        items.forEach((other) => {
          other.classList.remove("is-expanded");
          const otherToggle = other.querySelector(".rl-career-exp-toggle");
          if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
        });

        if (!isExpanded) {
          item.classList.add("is-expanded");
          toggle.setAttribute("aria-expanded", "true");
        }
      });
    });
  });
}

function initProfileHeroTooltips(root) {
  if (typeof window.bootstrap?.Tooltip !== "function") return;

  root.querySelectorAll('.rl-profile-hero-social-link[data-bs-toggle="tooltip"]').forEach((el) => {
    if (el.dataset.tooltipBound === "true") return;
    el.dataset.tooltipBound = "true";
    new window.bootstrap.Tooltip(el);
  });
}

function initAboutSkillsToggle(root) {
  const skillsBlocks = Array.from(root.querySelectorAll("[data-about-skills]"));
  skillsBlocks.forEach((block) => {
    if (block.dataset.bound === "true") return;
    block.dataset.bound = "true";

    const toggleButton = block.querySelector("[data-about-skills-toggle]");
    if (!toggleButton) return;

    const collapsibleItems = Array.from(
      block.querySelectorAll('[data-about-skill-item][data-about-skill-hidden="true"]')
    );

    if (!collapsibleItems.length) {
      toggleButton.remove();
      return;
    }

    const collapsedLabel = toggleButton.dataset.collapsedLabel || "Show all skills";
    const expandedLabel = toggleButton.dataset.expandedLabel || "Show less";

    toggleButton.addEventListener("click", () => {
      const isExpanded = block.dataset.expanded === "true";
      const nextExpanded = !isExpanded;
      block.dataset.expanded = String(nextExpanded);
      toggleButton.setAttribute("aria-expanded", String(nextExpanded));
      toggleButton.textContent = nextExpanded ? expandedLabel : collapsedLabel;

      collapsibleItems.forEach((item) => {
        item.classList.toggle("rl-about-skill-hidden", !nextExpanded);
      });
    });
  });
}

function initPrintSelection(root) {
  const toolbar = root.querySelector(".rl-print-toolbar");
  if (!toolbar || toolbar.dataset.bound === "true") return;
  toolbar.dataset.bound = "true";

  const storageKey = toolbar.dataset.printStorageKey || "cv-print-selection";
  const presetsStorageKey = `${storageKey}-presets`;
  const hiddenPresetsStorageKey = `${presetsStorageKey}-hidden`;
  const presetSelect = toolbar.querySelector("[data-print-preset-select]");
  const presetsConfigScript = toolbar.querySelector(".rl-print-presets-config");
  const checkboxes = Array.from(root.querySelectorAll(".rl-print-toggle-input"));
  const basePresets = parsePresets(presetsConfigScript?.textContent);
  let customPresets = parsePresets(window.localStorage.getItem(presetsStorageKey));
  let hiddenPresetIds = loadHiddenPresetIds(hiddenPresetsStorageKey);
  let mergedPresets = getVisibleMergedPresets(basePresets, customPresets, hiddenPresetIds);

  function buildSelectionState() {
    const state = {};
    checkboxes.forEach((checkbox) => {
      state[checkbox.dataset.target] = checkbox.checked;
    });
    return state;
  }

  function applySelectionState(selectionState) {
    checkboxes.forEach((checkbox) => {
      const nextValue = selectionState[checkbox.dataset.target];
      checkbox.checked = typeof nextValue === "boolean" ? nextValue : false;
      syncCardState(checkbox);
    });
  }

  function getSelectedIds() {
    return checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.dataset.target)
      .filter(Boolean);
  }

  function syncCardState(checkbox) {
    const targetId = checkbox.dataset.target;
    const card = targetId ? root.querySelector(`[data-print-id="${targetId}"]`) : null;
    if (!card) return;
    card.classList.toggle("rl-print-excluded", !checkbox.checked);
  }

  function persist() {
    window.localStorage.setItem(storageKey, JSON.stringify(buildSelectionState()));
  }

  function persistCustomPresets() {
    window.localStorage.setItem(presetsStorageKey, JSON.stringify(customPresets));
  }

  function renderPresetOptions(activeId = "") {
    if (!presetSelect) return;
    presetSelect.innerHTML = [
      `<option value="">Preset (optional)</option>`,
      ...mergedPresets.map((preset) => `<option value="${preset.id}">${preset.name}</option>`)
    ].join("");
    if (activeId) {
      presetSelect.value = activeId;
    }
  }

  function rebuildPresets(activeId = "") {
    mergedPresets = getVisibleMergedPresets(basePresets, customPresets, hiddenPresetIds);
    renderPresetOptions(activeId);
  }

  function applyPresetById(presetId) {
    const preset = mergedPresets.find((item) => item.id === presetId);
    if (!preset) return;
    const selectedIdSet = new Set(preset.selectedIds);
    const nextState = {};
    checkboxes.forEach((checkbox) => {
      nextState[checkbox.dataset.target] = selectedIdSet.has(checkbox.dataset.target);
    });
    applySelectionState(nextState);
    persist();
  }

  function applySavedState() {
    const savedRaw = window.localStorage.getItem(storageKey);
    if (!savedRaw) {
      checkboxes.forEach(syncCardState);
      return;
    }
    try {
      const savedState = JSON.parse(savedRaw);
      checkboxes.forEach((checkbox) => {
        const savedValue = savedState[checkbox.dataset.target];
        if (typeof savedValue === "boolean") {
          checkbox.checked = savedValue;
        }
        syncCardState(checkbox);
      });
    } catch (_error) {
      checkboxes.forEach(syncCardState);
    }
  }

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      syncCardState(checkbox);
      persist();
    });
  });

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-print-action]");
    if (!button) return;
    const action = button.dataset.printAction;
    if (action === "select-all") {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = true;
        syncCardState(checkbox);
      });
      persist();
      return;
    }
    if (action === "clear-all") {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
        syncCardState(checkbox);
      });
      persist();
      return;
    }
    if (action === "print") {
      window.print();
      return;
    }
    if (action === "save-preset") {
      const presetName = window.prompt("Preset name:", "");
      if (!presetName) return;
      const presetId = toPrintKey(presetName, "custom-preset");
      const preset = {
        id: presetId,
        name: presetName.trim(),
        selectedIds: getSelectedIds()
      };
      customPresets = upsertPreset(customPresets, preset);
      persistCustomPresets();
      rebuildPresets(presetId);
      return;
    }
    if (action === "update-preset") {
      const presetId = presetSelect?.value;
      if (!presetId) {
        return;
      }
      const existing = mergedPresets.find((item) => item.id === presetId);
      if (!existing) return;
      const preset = {
        id: existing.id,
        name: existing.name,
        selectedIds: getSelectedIds()
      };
      customPresets = upsertPreset(customPresets, preset);
      persistCustomPresets();
      rebuildPresets(presetId);
      return;
    }
    if (action === "delete-preset") {
      const presetId = presetSelect?.value;
      if (!presetId) {
        return;
      }
      const existing = buildMergedPresets(basePresets, customPresets).find((item) => item.id === presetId);
      if (!existing) return;
      const label = existing.name || presetId;
      if (!window.confirm(`Delete preset "${label}"?`)) {
        return;
      }
      const isCustom = customPresets.some((item) => item.id === presetId);
      if (isCustom) {
        customPresets = customPresets.filter((item) => item.id !== presetId);
        persistCustomPresets();
      }
      if (!isCustom && basePresets.some((item) => item.id === presetId)) {
        hiddenPresetIds = addHiddenPresetId(hiddenPresetIds, presetId);
        persistHiddenPresetIds(hiddenPresetsStorageKey, hiddenPresetIds);
      }
      rebuildPresets("");
      if (presetSelect) presetSelect.value = "";
    }
  });

  presetSelect?.addEventListener("change", () => {
    const presetId = presetSelect.value;
    if (!presetId) return;
    applyPresetById(presetId);
  });

  rebuildPresets();
  applySavedState();
}

function parsePresets(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => normalizePreset(item, index + 1));
  } catch (_error) {
    return [];
  }
}

function buildMergedPresets(basePresets, customPresets) {
  const mergedMap = new Map();
  basePresets.forEach((preset) => mergedMap.set(preset.id, preset));
  customPresets.forEach((preset) => mergedMap.set(preset.id, preset));
  return Array.from(mergedMap.values());
}

function loadHiddenPresetIds(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id ?? "").trim()).filter(Boolean));
  } catch (_error) {
    return new Set();
  }
}

function persistHiddenPresetIds(storageKey, hiddenIds) {
  window.localStorage.setItem(storageKey, JSON.stringify([...hiddenIds]));
}

function addHiddenPresetId(hiddenIds, presetId) {
  const next = new Set(hiddenIds);
  next.add(presetId);
  return next;
}

function getVisibleMergedPresets(basePresets, customPresets, hiddenPresetIds) {
  const merged = buildMergedPresets(basePresets, customPresets);
  return merged.filter((preset) => !hiddenPresetIds.has(preset.id));
}

function upsertPreset(presets, nextPreset) {
  const presetIndex = presets.findIndex((item) => item.id === nextPreset.id);
  if (presetIndex === -1) {
    return [...presets, nextPreset];
  }
  const updated = [...presets];
  updated[presetIndex] = nextPreset;
  return updated;
}
