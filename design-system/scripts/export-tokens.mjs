#!/usr/bin/env node
/**
 * Export design tokens from code → design-system/tokens/*.tokens.json
 * Run: npm run tokens:export (from frontend/)
 *
 * Figma: Tokens Studio → Import → select design-system/tokens folder
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOKENS_DIR = path.join(ROOT, "tokens");
const INDEX_CSS = path.resolve(ROOT, "../frontend/src/index.css");

function parseThemeBlock(css) {
  const match = css.match(/@theme\s*\{([^}]+)\}/s);
  if (!match) throw new Error("No @theme block in index.css");
  const vars = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, name), "utf8"));
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(TOKENS_DIR, name), JSON.stringify(data, null, 2) + "\n");
}

const css = fs.readFileSync(INDEX_CSS, "utf8");
const theme = parseThemeBlock(css);
const core = readJson("core.tokens.json");

const colorMap = {
  "--color-ink": ["color", "ink", "DEFAULT"],
  "--color-ink-2": ["color", "ink", "2"],
  "--color-ink-3": ["color", "ink", "3"],
  "--color-brand": ["color", "brand"],
  "--color-leaf": ["color", "leaf"],
  "--color-sky": ["color", "sky"],
};

for (const [cssVar, pathKeys] of Object.entries(colorMap)) {
  if (!theme[cssVar]) continue;
  let node = core;
  for (let i = 0; i < pathKeys.length - 1; i++) {
    node = node[pathKeys[i]];
  }
  const leaf = pathKeys[pathKeys.length - 1];
  if (node[leaf]) {
    node[leaf].$value = theme[cssVar];
    node[leaf].$type = "color";
  }
}

if (theme["--font-sans"]) {
  core.font.family.sans.$value = theme["--font-sans"].replace(/^"|"$/g, "");
}
if (theme["--font-display"]) {
  core.font.family.display.$value = theme["--font-display"].replace(/^"|"$/g, "");
}
if (theme["--app-gutter"]) core.spacing.gutter.$value = theme["--app-gutter"];
if (theme["--app-panel"]) core.spacing.panel.$value = theme["--app-panel"];

core.$exportedAt = new Date().toISOString();
core.$source = "frontend/src/index.css @theme";

writeJson("core.tokens.json", core);

console.log("Exported tokens → design-system/tokens/");
console.log("  core.tokens.json updated from index.css");
console.log("\nNext: Figma → Tokens Studio → Import → design-system/tokens/");
