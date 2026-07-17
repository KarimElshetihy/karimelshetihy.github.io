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

function renderField(field, formId) {
  const name = String(field?.name ?? "").trim();
  if (!name) {
    return "";
  }

  const fieldId = `contact-${formId}-${name}`;
  const label = escapeHtml(field.label ?? name);
  const type = String(field.type ?? "text").trim().toLowerCase();
  const required = field.required === true ? " required" : "";
  const placeholder = field.placeholder ? ` placeholder="${escapeAttr(field.placeholder)}"` : "";
  const colClass = field.halfWidth === true ? "col-md-6" : "col-md-12";

  if (type === "textarea") {
    const rows = Number(field.rows) || 6;
    return `
      <div class="${colClass}">
        <label for="${escapeAttr(fieldId)}" class="form-label">${label}</label>
        <textarea class="form-control" name="${escapeAttr(name)}" id="${escapeAttr(fieldId)}" rows="${rows}"${required}${placeholder}></textarea>
      </div>`;
  }

  if (type === "select") {
    const options = Array.isArray(field.options) ? field.options : [];
    const optionsHtml = options
      .map((option) => {
        const value = escapeAttr(option.value ?? option.label ?? "");
        const labelText = escapeHtml(option.label ?? option.value ?? "");
        return `<option value="${value}">${labelText}</option>`;
      })
      .join("");

    return `
      <div class="${colClass}">
        <label for="${escapeAttr(fieldId)}" class="form-label">${label}</label>
        <select class="form-select" name="${escapeAttr(name)}" id="${escapeAttr(fieldId)}"${required}>
          ${optionsHtml}
        </select>
      </div>`;
  }

  const inputType = type === "email" ? "email" : "text";
  return `
    <div class="${colClass}">
      <label for="${escapeAttr(fieldId)}" class="form-label">${label}</label>
      <input type="${inputType}" class="form-control" name="${escapeAttr(name)}" id="${escapeAttr(fieldId)}"${required}${placeholder}>
    </div>`;
}

export function renderContactForm(formConfig = {}, options = {}) {
  const formId = String(options.formId ?? formConfig.id ?? "contact").trim() || "contact";
  const accessKey = String(formConfig.accessKey ?? "").trim();
  const fields = Array.isArray(formConfig.fields) ? formConfig.fields : [];
  const messages = formConfig.messages ?? {};
  const submitLabel = escapeHtml(formConfig.submitLabel ?? "Send Message");
  const loadingText = escapeHtml(messages.loading ?? "Loading");
  const successText = escapeHtml(messages.success ?? "Your message has been sent. Thank you!");
  const errorText = escapeHtml(messages.error ?? "Something went wrong. Please try again.");
  const emailSubjectPrefix = String(formConfig.subject ?? "Portfolio contact form").trim();
  const formType = String(formConfig.formType ?? formId).trim();

  if (!accessKey) {
    return `
      <div class="php-email-form contact-form--unconfigured" role="alert">
        <p class="mb-0">Contact form is not configured yet. Add your Web3Forms access key to <code>config/contact-form.json</code>.</p>
      </div>`;
  }

  const fieldHtml = fields.map((field) => renderField(field, formId)).join("");

  return `
    <form
      class="php-email-form php-email-form--panel"
      data-web3-form
      data-web3-endpoint="${escapeAttr("https://api.web3forms.com/submit")}"
      data-web3-subject-prefix="${escapeAttr(emailSubjectPrefix)}"
      action="#"
      method="POST"
      novalidate>
      <input type="hidden" name="access_key" value="${escapeAttr(accessKey)}">
      <input type="hidden" name="form_type" value="${escapeAttr(formType)}">
      <input type="checkbox" name="botcheck" class="d-none" tabindex="-1" autocomplete="off">
      <div class="row gy-4">
        ${fieldHtml}
        <div class="col-md-12 text-center">
          <div class="loading">${loadingText}</div>
          <div class="error-message">${errorText}</div>
          <div class="sent-message">${successText}</div>
          <button type="submit">${submitLabel}</button>
        </div>
      </div>
    </form>`;
}
