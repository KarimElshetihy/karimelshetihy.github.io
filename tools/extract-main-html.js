const fs = require("fs");
const path = require("path");

const [, , filename, outJsonName, title] = process.argv;
if (!filename || !outJsonName || !title) {
  console.error("Usage: node extract-main-html.js <source.html> <outBasename> <pageTitle>");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const htmlPath = path.join(root, filename);
const h = fs.readFileSync(htmlPath, "utf8");

const mainStart = h.indexOf('<main class="main">');
if (mainStart === -1) throw new Error("main not found in " + filename);
const innerStart = mainStart + '<main class="main">'.length;
const mainEnd = h.indexOf("</main>", innerStart);
if (mainEnd === -1) throw new Error("</main> not found");

const inner = h.slice(innerStart, mainEnd).trim();

const outDir = path.join(root, "assets", "data", "pages");
fs.mkdirSync(outDir, { recursive: true });

const payload = {
  meta: {
    title,
    description: ""
  },
  sections: [
    {
      type: "mainInnerHtml",
      data: {
        html: inner
      }
    }
  ]
};

fs.writeFileSync(path.join(outDir, `${outJsonName}.json`), JSON.stringify(payload, null, 2), "utf8");
console.log("Wrote", outJsonName + ".json", "inner length:", inner.length);
