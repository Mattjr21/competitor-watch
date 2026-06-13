#!/usr/bin/env node
/**
 * Import design tokens from Figma/Tokens Studio export → frontend CSS
 * Run: npm run tokens:import (from frontend/)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOKENS_DIR = path.join(ROOT, "tokens");
const INDEX_CSS = path.resolve(ROOT, "../frontend/src/index.css");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, name), "utf8"));
}

function resolveValue(val) {
  if (typeof val === "string") return val;
  if (val && typeof val.$value === "string") return val.$value;
  if (val && typeof val.$value === "object" && val.$value.hex) return val.$value.hex;
  return null;
}

const core = readJson("core.tokens.json");
let css = fs.readFileSync(INDEX_CSS, "utf8");

const updates = {
  "--color-ink": resolveValue(core.color?.ink?.DEFAULT),
  "--color-ink-2": resolveValue(core.color?.ink?.["2"]),
  "--color-ink-3": resolveValue(core.color?.ink?.["3"]),
  "--color-brand": resolveValue(core.color?.brand),
  "--color-leaf": resolveValue(core.color?.leaf),
  "--color-sky": resolveValue(core.color?.sky),
  "--font-sans": core.font?.family?.sans
    ? `"${String(resolveValue(core.font.family.sans)).split(",")[0].trim().replace(/"/g, "")}", ui-sans-serif, system-ui, sans-serif`
    : null,
  "--font-display": core.font?.family?.display
    ? `"${String(resolveValue(core.font.family.display)).split(",")[0].trim().replace(/"/g, "")}", Inter, sans-serif`
    : null,
  "--app-gutter": resolveValue(core.spacing?.gutter),
  "--app-panel": resolveValue(core.spacing?.panel),
};

let changed = 0;
for (const [varName, value] of Object.entries(updates)) {
  if (!value) continue;
  const re = new RegExp(`(${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*)[^;]+(;)`, "m");
  if (re.test(css)) {
    css = css.replace(re, `$1${value}$2`);
    changed++;
  }
}

if (changed === 0) {
  console.error("No @theme variables updated. Check core.tokens.json format.");
  process.exit(1);
}

fs.writeFileSync(INDEX_CSS, css);
console.log(`Imported ${changed} token(s) into frontend/src/index.css @theme`);
console.log("Run npm run tokens:export to verify round-trip sync.");
