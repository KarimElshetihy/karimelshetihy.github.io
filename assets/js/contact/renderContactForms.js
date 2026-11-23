import { renderContactForm } from "./renderContactForm.js";

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

function normalizeFormSections(data) {
  if (Array.isArray(data?.formSections) && data.formSections.length) {
    return data.formSections;
  }

  if (data?.form) {
    return [
      {
        id: "general",
        title: "Contact",
        description: data.subtitle ?? "",
        icon: "bi-envelope",
        default: true,
        form: data.form
      }
    ];
  }

  return [];
}

function getDefaultSectionId(sections) {
  return (
    sections.find((section) => section.default === true)?.id
    ?? sections.find((section) => !section.soon)?.id
    ?? sections[0]?.id
    ?? ""
  );
}

function renderSoonPanel(section) {
  return `
    <div class="contact-form-soon">
      <span class="contact-form-soon-icon" aria-hidden="true">
        <i class="bi ${escapeAttr(section.icon ?? "bi-calendar-event")}"></i>
      </span>
      <h4 class="contact-form-soon-title">${escapeHtml(section.title ?? "Coming soon")}</h4>
      <p class="contact-form-soon-text mb-0">${escapeHtml(section.soonMessage ?? "This option will be available soon.")}</p>
    </div>`;
}

function renderFormPanel(section) {
  if (section.soon === true || Number(section.soon) === 1) {
    return renderSoonPanel(section);
  }

  return renderContactForm(section.form ?? {}, { formId: section.id });
}

export function renderContactForms(data) {
  const sections = normalizeFormSections(data);
  if (!sections.length) {
    return "";
  }

  const defaultId = getDefaultSectionId(sections);
  const defaultSection = sections.find((section) => section.id === defaultId) ?? sections[0];

  const tabsHtml = sections
    .map((section) => {
      const isSoon = section.soon === true || Number(section.soon) === 1;
      const isDefault = section.id === defaultId;
      const soonBadge = isSoon
        ? `<span class="rl-contact-form-tab-soon">${escapeHtml(section.soonLabel ?? "Soon")}</span>`
        : "";

      return `
        <button
          type="button"
          class="rl-contact-form-tab${isDefault ? " is-active" : ""}"
          data-contact-form-tab
          data-contact-form-id="${escapeAttr(section.id ?? "")}"
          data-contact-title="${escapeAttr(section.title ?? "")}"
          data-contact-desc="${escapeAttr(section.description ?? "")}"
          role="tab"
          aria-selected="${isDefault ? "true" : "false"}"
          ${isSoon ? "disabled aria-disabled=\"true\"" : ""}>
          <i class="bi ${escapeAttr(section.icon ?? "bi-chat-dots")}" aria-hidden="true"></i>
          <span>${escapeHtml(section.title ?? "")}</span>
          ${soonBadge}
        </button>`;
    })
    .join("");

  const panelsHtml = sections
    .map((section) => {
      const isDefault = section.id === defaultId;
      return `
        <div
          class="rl-contact-form-panel${isDefault ? " is-active" : ""}"
          data-contact-form-panel
          data-contact-form-id="${escapeAttr(section.id ?? "")}"
          role="tabpanel"
          ${isDefault ? "" : "hidden"}>
          ${renderFormPanel(section)}
        </div>`;
    })
    .join("");

  return `
    <div class="rl-contact-forms" data-contact-forms data-default-form="${escapeAttr(defaultId)}">
      <div class="rl-contact-form-tabs" role="tablist" aria-label="Contact form options">
        ${tabsHtml}
      </div>
      <div class="rl-contact-form-head">
        <h3 class="rl-contact-form-title mb-0" data-contact-form-title>${escapeHtml(defaultSection?.title ?? "")}</h3>
        <p class="rl-contact-form-desc mb-0" data-contact-form-desc>${escapeHtml(defaultSection?.description ?? "")}</p>
      </div>
      <div class="rl-contact-form-panels">
        ${panelsHtml}
      </div>
    </div>`;
}
