export function initContactFormSwitcher(root = document) {
  const hub = root.querySelector("[data-contact-forms]");
  if (!hub || hub.dataset.bound === "true") {
    return;
  }

  hub.dataset.bound = "true";

  const tabs = Array.from(hub.querySelectorAll("[data-contact-form-tab]"));
  const panels = Array.from(hub.querySelectorAll("[data-contact-form-panel]"));
  const titleEl = hub.querySelector("[data-contact-form-title]");
  const descEl = hub.querySelector("[data-contact-form-desc]");
  const defaultFormId = hub.dataset.defaultForm ?? "";

  function showForm(formId, title, description) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.contactFormId === formId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.contactFormId === formId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (titleEl) {
      titleEl.textContent = title;
    }

    if (descEl) {
      descEl.textContent = description;
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.disabled) {
        return;
      }

      showForm(
        tab.dataset.contactFormId ?? "",
        tab.dataset.contactTitle ?? "",
        tab.dataset.contactDesc ?? ""
      );
    });
  });

  if (defaultFormId) {
    const defaultTab = tabs.find((tab) => tab.dataset.contactFormId === defaultFormId);
    showForm(
      defaultFormId,
      defaultTab?.dataset.contactTitle ?? titleEl?.textContent ?? "",
      defaultTab?.dataset.contactDesc ?? descEl?.textContent ?? ""
    );
  }
}
