const DEFAULT_ENDPOINT = "https://api.web3forms.com/submit";

function showLoading(form, visible) {
  form.querySelector(".loading")?.classList.toggle("d-block", visible);
}

function showError(form, message) {
  const errorEl = form.querySelector(".error-message");
  if (!errorEl) {
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.add("d-block");
}

function hideFeedback(form) {
  form.querySelector(".error-message")?.classList.remove("d-block");
  form.querySelector(".sent-message")?.classList.remove("d-block");
}

function showSuccess(form) {
  form.querySelector(".sent-message")?.classList.add("d-block");
}

async function submitWeb3Form(form) {
  const endpoint = String(form.dataset.web3Endpoint ?? DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;
  const subjectPrefix = String(form.dataset.web3SubjectPrefix ?? "Portfolio contact form").trim();
  const payload = Object.fromEntries(new FormData(form).entries());

  const userSubject = String(payload.subject ?? "").trim();
  payload.subject = userSubject ? `${subjectPrefix}: ${userSubject}` : subjectPrefix;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Form submission failed.");
  }
}

export function initWeb3Form(root = document) {
  root.querySelectorAll("[data-web3-form]").forEach((form) => {
    if (form.dataset.web3FormBound === "true") {
      return;
    }

    form.dataset.web3FormBound = "true";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideFeedback(form);
      showLoading(form, true);

      try {
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        await submitWeb3Form(form);
        showSuccess(form);
        form.reset();
      } catch (error) {
        const fallback = form.querySelector(".error-message")?.textContent?.trim();
        showError(form, error.message || fallback || "Something went wrong. Please try again.");
      } finally {
        showLoading(form, false);
      }
    });
  });
}
