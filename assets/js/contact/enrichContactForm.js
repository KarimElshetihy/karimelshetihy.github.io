import { getContactForm } from "../content/configStore.js";

function getContactSection(pageData) {
  return (pageData?.sections ?? []).find((section) => section.type === "contactData");
}

function applyAccessKey(target, accessKey) {
  if (target && typeof target === "object") {
    target.accessKey = accessKey;
  }
}

export async function enrichContactPage(pageData) {
  const contactSection = getContactSection(pageData);
  if (!contactSection?.data) {
    return pageData;
  }

  let accessKey = "";
  try {
    const config = getContactForm();
    accessKey = String(config.web3formsAccessKey ?? "").trim();
  } catch (_error) {
    accessKey = "";
  }

  applyAccessKey(contactSection.data.form, accessKey);

  if (Array.isArray(contactSection.data.formSections)) {
    contactSection.data.formSections.forEach((section) => {
      applyAccessKey(section.form, accessKey);
    });
  }

  return pageData;
}
