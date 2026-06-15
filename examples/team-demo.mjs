#!/usr/bin/env node
//
// team-demo.mjs — multi-model "team agent" orchestration with cursor-plugin.
//
// Demonstrates three things at once:
//   1. Model switching   — each member runs on a different model via --model.
//   2. Parallel dispatch — two implementers run at the same time (Promise.all).
//   3. A review stage    — a third model reviews the result, read-only.
//
// The "team" here is made of Cursor models so the example is self-contained
// (it only needs this plugin + cursor-agent). The same pattern extends to a
// cross-tool team (e.g. add an OpenAI Codex member) — see examples/README.md.
//
// Run it from inside the git project you want the team to work on:
//   node /path/to/cursor-plugin/examples/team-demo.mjs
//
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Resolve the companion shipped with this repo, relative to this file, so the
// example works from any clone without hardcoded paths.
const COMPANION = fileURLToPath(new URL("../plugins/cursor/scripts/cursor-companion.mjs", import.meta.url));
const cwd = process.cwd();

// The team. Swap the `model` aliases to route work however you like.
//   spark  -> composer-2.5            (fast, cheap)
//   max    -> gpt-5.5-high            (strong generalist)
//   review -> gpt-5.1-codex-max-high  (strong reviewer)
const IMPLEMENTERS = [
  {
    member: "Composer",
    model: "spark",
    task: "Create a new file slug.js that exports `slugify(str)`: lowercase the string, replace runs of whitespace with a single '-', strip characters that are not a-z, 0-9 or '-', collapse repeated '-', and trim leading/trailing '-'. Only create slug.js."
  },
  {
    member: "GPT-5 (max)",
    model: "max",
    task: "Create a new file truncate.js that exports `truncate(str, n)`: return str unchanged when its length <= n, otherwise return the first n characters followed by the ellipsis character. Validate that n is a non-negative integer. Only create truncate.js."
  }
];

const REVIEWER = {
  member: "codex-max (review)",
  model: "review",
  task: "Review slug.js and truncate.js in this repo for correctness and edge cases. Give one short paragraph per file. Do not edit anything."
};

function runCompanion(args) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn("node", [COMPANION, ...args], { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr, seconds: (Date.now() - startedAt) / 1000 }));
  });
}

function parse(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function oneLine(text, max = 240) {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

console.log("=== cursor-plugin team-agent demo ===\n");
console.log(`Working directory: ${cwd}\n`);

// Stage 1 — implementers run IN PARALLEL, each on a different model, writing
// different files (different files => no concurrent-write conflict).
console.log("Stage 1: implementers (parallel, write-capable)\n");
const built = await Promise.all(
  IMPLEMENTERS.map((m) =>
    runCompanion(["task", "--model", m.model, "--json", m.task]).then((r) => ({ ...r, ...m }))
  )
);
for (const r of built) {
  const j = parse(r.stdout);
  console.log(`  • ${r.member} (--model ${r.model}) -> ${j?.resolvedModel ?? "?"} | exit ${r.code} | ${r.seconds.toFixed(1)}s`);
  console.log(`      ${oneLine(j?.rawOutput ?? r.stderr)}\n`);
}

// Stage 2 — a third model reviews the result, read-only (no edits).
console.log("Stage 2: reviewer (read-only)\n");
const reviewed = await runCompanion(["task", "--model", REVIEWER.model, "--read-only", "--json", REVIEWER.task]);
const rj = parse(reviewed.stdout);
console.log(`  • ${REVIEWER.member} (--model ${REVIEWER.model}) -> ${rj?.resolvedModel ?? "?"} | exit ${reviewed.code} | ${reviewed.seconds.toFixed(1)}s`);
console.log(`      ${oneLine(rj?.rawOutput ?? reviewed.stderr, 600)}\n`);

console.log("=== done — `git status` to see what the team produced ===");
