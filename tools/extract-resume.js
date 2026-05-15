const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const h = fs.readFileSync(path.join(root, "resume.html"), "utf8");

const marker = '<section id="resume"';
const resumeStart = h.indexOf(marker);
if (resumeStart === -1) throw new Error("resume section not found");

const sub = h.slice(resumeStart);
const openIdx = sub.indexOf('<div class="container">');
if (openIdx === -1) throw new Error("container not found");

let i = openIdx + '<div class="container">'.length;
let depth = 1;
const lower = sub.toLowerCase();
while (depth > 0 && i < sub.length) {
  const nextDiv = lower.indexOf("<div", i);
  const nextClose = lower.indexOf("</div>", i);
  if (nextClose === -1) throw new Error("unclosed div");
  if (nextDiv !== -1 && nextDiv < nextClose) {
    depth++;
    i = nextDiv + 4;
  } else {
    depth--;
    i = nextClose + "</div>".length;
  }
}

const inner = sub.slice(openIdx + '<div class="container">'.length, i - "</div>".length);

const outPath = path.join(root, "assets", "data", "pages");
fs.mkdirSync(outPath, { recursive: true });

const payload = {
  meta: {
    title: "Resume - Karim",
    description: ""
  },
  sections: [
    {
      type: "resumeInnerHtml",
      data: {
        html: inner.trim()
      }
    }
  ]
};

fs.writeFileSync(path.join(outPath, "resume.json"), JSON.stringify(payload, null, 2), "utf8");
console.log("Wrote resume.json, inner length:", inner.length);
