import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCursorArgv,
  normalizeRequestedModel,
  parseStructuredOutput,
  runCursorAgent
} from "../plugins/cursor/scripts/lib/cursor.mjs";
import { installFakeCursor } from "./fake-cursor-fixture.mjs";

test("normalizeRequestedModel resolves aliases and passes through unknown ids", () => {
  assert.equal(normalizeRequestedModel("spark"), "composer-2.5");
  assert.equal(normalizeRequestedModel("review"), "gpt-5.1-codex-max-high");
  assert.equal(normalizeRequestedModel("OPUS"), "claude-opus-4-8-high");
  assert.equal(normalizeRequestedModel("some-custom-model"), "some-custom-model");
  assert.equal(normalizeRequestedModel(null), null);
  assert.equal(normalizeRequestedModel("  "), null);
});

test("buildCursorArgv always sets --print and --trust and the output format", () => {
  const argv = buildCursorArgv({ prompt: "hi" });
  assert.ok(argv.includes("--print"));
  assert.ok(argv.includes("--trust"));
  assert.deepEqual(argv.slice(-1), ["hi"]);
  const fmtIndex = argv.indexOf("--output-format");
  assert.equal(argv[fmtIndex + 1], "json");
});

test("buildCursorArgv maps write -> --force and plan -> --mode plan", () => {
  const writeArgv = buildCursorArgv({ prompt: "p", write: true });
  assert.ok(writeArgv.includes("--force"));
  assert.ok(!writeArgv.includes("--mode"));

  const planArgv = buildCursorArgv({ prompt: "p", write: true, mode: "plan" });
  const modeIndex = planArgv.indexOf("--mode");
  assert.equal(planArgv[modeIndex + 1], "plan");
  assert.ok(!planArgv.includes("--force"), "plan mode must not also force writes");
});

test("buildCursorArgv adds resume and stream flags when requested", () => {
  const argv = buildCursorArgv({ prompt: "p", stream: true, resumeChatId: "abc", model: "composer-2.5" });
  assert.ok(argv.includes("--stream-partial-output"));
  assert.equal(argv[argv.indexOf("--output-format") + 1], "stream-json");
  assert.equal(argv[argv.indexOf("--resume") + 1], "abc");
  assert.equal(argv[argv.indexOf("--model") + 1], "composer-2.5");
});

test("parseStructuredOutput parses plain JSON", () => {
  const out = parseStructuredOutput('{"verdict":"approve","findings":[]}');
  assert.equal(out.parseError, null);
  assert.equal(out.parsed.verdict, "approve");
});

test("parseStructuredOutput strips ```json fences", () => {
  const out = parseStructuredOutput('```json\n{"verdict":"needs-attention"}\n```');
  assert.equal(out.parseError, null);
  assert.equal(out.parsed.verdict, "needs-attention");
});

test("parseStructuredOutput recovers a JSON object embedded in prose", () => {
  const out = parseStructuredOutput('Sure, here you go:\n{"verdict":"approve","findings":[]}\nHope that helps.');
  assert.equal(out.parseError, null);
  assert.equal(out.parsed.verdict, "approve");
});

test("parseStructuredOutput reports an error for empty/garbage output", () => {
  assert.equal(parseStructuredOutput("").parsed, null);
  assert.equal(parseStructuredOutput("not json at all").parsed, null);
});

test("runCursorAgent (json) returns final text, session id, and usage", async () => {
  const fake = installFakeCursor();
  try {
    const result = await runCursorAgent("/tmp", { prompt: "echo me", stream: false });
    assert.equal(result.status, 0);
    assert.equal(result.finalMessage, "echo me");
    assert.equal(result.sessionId, "fake-session-123");
    assert.equal(result.usage.inputTokens, 1);
  } finally {
    fake.restore();
  }
});

test("runCursorAgent (stream-json) parses events and captures model + session", async () => {
  const fake = installFakeCursor();
  try {
    const result = await runCursorAgent("/tmp", { prompt: "stream me", stream: true });
    assert.equal(result.status, 0);
    assert.equal(result.finalMessage, "stream me");
    assert.equal(result.resolvedModel, "fake-model");
    assert.equal(result.sessionId, "fake-session-123");
  } finally {
    fake.restore();
  }
});

test("runCursorAgent (stream-json) recovers a final result line with no trailing newline", async () => {
  const fake = installFakeCursor();
  try {
    const result = await runCursorAgent("/tmp", { prompt: "NONL", stream: true });
    assert.equal(result.status, 0);
    assert.equal(result.finalMessage, "NONL");
    assert.equal(result.sessionId, "fake-session-123");
  } finally {
    fake.restore();
  }
});

test("runCursorAgent falls back to accumulated deltas when the result text is empty", async () => {
  const fake = installFakeCursor();
  try {
    const result = await runCursorAgent("/tmp", { prompt: "DELTASONLY", stream: true });
    assert.equal(result.status, 0);
    assert.equal(result.finalMessage, "ABCD");
  } finally {
    fake.restore();
  }
});

test("runCursorAgent treats a non-zero exit as failure with plain-text stderr", async () => {
  const fake = installFakeCursor();
  try {
    const result = await runCursorAgent("/tmp", { prompt: "FAIL", stream: false });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /boom/);
  } finally {
    fake.restore();
  }
});
