/**
 * Removes a leading YAML-style front matter block (--- ... ---) from Markdown.
 * Front matter holds build-time metadata and must not be rendered.
 */

const FRONT_MATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function stripFrontMatter(markdown) {
  return String(markdown ?? "").replace(FRONT_MATTER_PATTERN, "");
}
