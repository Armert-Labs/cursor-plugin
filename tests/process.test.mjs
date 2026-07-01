import assert from "node:assert/strict";
import { test } from "node:test";

import { binaryAvailable } from "../plugins/cursor/scripts/lib/process.mjs";

// Hermetic: probes `node` itself (no cursor-agent, no network, no credits).
const NODE = process.execPath;

test("binaryAvailable: missing binary reports 'not found'", () => {
  const r = binaryAvailable("definitely-not-a-real-binary-xyz", ["--version"]);
  assert.equal(r.available, false);
  assert.equal(r.detail, "not found");
});

test("binaryAvailable: a working --version is available with a clean detail", () => {
  const r = binaryAvailable(NODE, ["--version"]);
  assert.equal(r.available, true);
  assert.match(r.detail, /^v?\d/);
});

test("binaryAvailable: caps a crashing binary's huge stderr to <=500 chars", () => {
  const r = binaryAvailable(NODE, ["-e", "console.error('X'.repeat(100000)); process.exit(1)"]);
  assert.equal(r.available, false);
  assert.ok(r.detail.length <= 500, `detail too long: ${r.detail.length}`);
});

test("binaryAvailable: a whitespace-only preferred stream falls through to the other", () => {
  // failure: stderr is whitespace-only, the real error is on stdout
  const fail = binaryAvailable(NODE, [
    "-e",
    "process.stderr.write('  \\n'); console.log('Real error'); process.exit(1)"
  ]);
  assert.equal(fail.available, false);
  assert.equal(fail.detail, "Real error");

  // success: stdout is whitespace-only, the version is on stderr
  const ok = binaryAvailable(NODE, ["-e", "process.stdout.write('  \\n'); process.stderr.write('v9.9.9\\n')"]);
  assert.equal(ok.available, true);
  assert.equal(ok.detail, "v9.9.9");
});
