#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corePath = path.resolve(__dirname, "../tokens/core.tokens.json");

function stripMeta(obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  delete copy.$exportedAt;
  delete copy.$source;
  return copy;
}

const before = stripMeta(JSON.parse(fs.readFileSync(corePath, "utf8")));
execSync("node export-tokens.mjs", { cwd: __dirname, stdio: "pipe" });
const after = stripMeta(JSON.parse(fs.readFileSync(corePath, "utf8")));

if (JSON.stringify(before) !== JSON.stringify(after)) {
  console.error("Token drift: index.css @theme and core.tokens.json disagree.");
  console.error("Run npm run tokens:export and commit, or npm run tokens:import from Figma.");
  process.exit(1);
}

console.log("Tokens in sync with index.css");
