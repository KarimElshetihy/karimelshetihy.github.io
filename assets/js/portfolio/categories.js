/**
 * Portfolio categories: a simple string list on each project.
 * Example: "categories": ["End-to-End", "Data Modeling"]
 */

export function slugifyCategory(label) {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category"
  );
}

export function getProjectCategories(project) {
  if (Array.isArray(project?.categories)) {
    return project.categories.map(normalizeCategoryEntry).filter(Boolean);
  }

  if (typeof project?.category === "string" && project.category.trim()) {
    const label =
      typeof project.categoryLabel === "string" && project.categoryLabel.trim()
        ? project.categoryLabel.trim()
        : project.category.trim();
    const id = project.category.trim();
    return [{ id, label }];
  }

  return [];
}

function normalizeCategoryEntry(entry) {
  if (typeof entry === "string" && entry.trim()) {
    const label = entry.trim();
    return { id: slugifyCategory(label), label };
  }

  return null;
}

export function collectCategoryFilters(projects) {
  const categories = new Map();

  for (const project of projects) {
    for (const { id, label } of getProjectCategories(project)) {
      if (!categories.has(id)) {
        categories.set(id, label);
      }
    }
  }

  return categories;
}

export function getFilterClassNames(categories) {
  return categories.map(({ id }) => `filter-${id}`).join(" ");
}
