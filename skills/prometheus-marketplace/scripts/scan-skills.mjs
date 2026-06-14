#!/usr/bin/env node
/**
 * Prometheus Marketplace Scanner
 *
 * Scans all skill directories and builds/updates the catalog manifest.
 * Run after adding/removing skills:
 *   node skills/prometheus-marketplace/scripts/scan-skills.mjs
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "..", "..", "..", "skills");
const CATALOG_PATH = join(__dirname, "..", "references", "catalog.json");

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const raw = match[1];

  // Use python3 to parse YAML reliably
  try {
    const result = execSync(
      `python3 -c "import yaml,sys; y=yaml.safe_load(sys.stdin.read()); import json; print(json.dumps(y if y else {}))"`,
      { input: raw, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 5000 },
    ).trim();
    if (result) return JSON.parse(result);
  } catch {
    // Fallback below
  }

  // Fallback: just return the description
  const fm = {};
  for (const line of raw.split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line
      .slice(sep + 1)
      .trim()
      .replace(/^"|"$/g, "");
    if (key && val && !line.startsWith(" ") && !line.startsWith("\t")) {
      fm[key] = val;
    }
  }
  return fm;
}

function scanSkills() {
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skills = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(SKILLS_DIR, entry.name);
    const skillPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    const content = readFileSync(skillPath, "utf8");
    const fm = parseFrontmatter(content);

    const name = fm.name || entry.name;
    const description = fm.description || "";
    const metaRaw = typeof fm.metadata === "object" && fm.metadata !== null ? fm.metadata : {};
    const promMeta = metaRaw?.prometheus || metaRaw?.openclaw || {};
    const requires = promMeta?.requires || {};

    skills[name] = {
      name,
      description,
      emoji: promMeta.emoji || (typeof promMeta === "object" ? null : null) || "📦",
      group: promMeta.group || "community",
      "user-invocable": promMeta["user-invocable"] ?? true,
      source: "bundled",
      bins: requires.bins || [],
    };
  }

  const catalog = {
    version: "0.1.0",
    updated: new Date().toISOString().slice(0, 10),
    registry: "https://github.com/prometheus-ai/prometheus-marketplace",
    skills,
  };

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`✅ Scanned ${Object.keys(skills).length} skills → ${CATALOG_PATH}`);
}

scanSkills();
