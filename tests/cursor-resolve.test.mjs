import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { isUsableCursorOverride, pickCursorBin } from "../plugins/cursor/scripts/lib/cursor.mjs";

// Build a fake prober from a { binName: {available, detail} } map. Keeps these
// tests hermetic — no real cursor-agent, no spawning, no credits.
function fakeProbe(map) {
  return (bin) => map[bin] ?? { available: false, detail: "not found" };
}
const OK = (detail = "2026.06.26-7079533") => ({ available: true, detail });
const NO = (detail = "not found") => ({ available: false, detail });

test("pickCursorBin: cursor-agent wins when available and no override", () => {
  const r = pickCursorBin({ env: {}, probe: fakeProbe({ "cursor-agent": OK() }) });
  assert.equal(r.bin, "cursor-agent");
  assert.equal(r.availability.available, true);
});

test("pickCursorBin: falls back to `agent` when cursor-agent is unavailable", () => {
  const r = pickCursorBin({ env: {}, probe: fakeProbe({ "cursor-agent": NO(), agent: OK() }) });
  assert.equal(r.bin, "agent");
  assert.equal(r.availability.available, true);
});

test("pickCursorBin: rejects an `agent` whose --version isn't a Cursor calver", () => {
  const r = pickCursorBin({
    env: {},
    probe: fakeProbe({ "cursor-agent": NO(), agent: OK("some-other-tool 1.2.3") })
  });
  assert.equal(r.bin, "cursor-agent");
  assert.equal(r.availability.available, false);
});

test("pickCursorBin: absolute override is honored and short-circuits the chain", () => {
  const probed = [];
  const r = pickCursorBin({
    env: { CURSOR_AGENT_BIN: "/opt/cursor/agent" },
    probe: (bin) => {
      probed.push(bin);
      return OK();
    }
  });
  assert.equal(r.bin, "/opt/cursor/agent");
  assert.deepEqual(probed, ["/opt/cursor/agent"]);
});

test("pickCursorBin: bare-name override is honored", () => {
  const r = pickCursorBin({ env: { CURSOR_AGENT_BIN: "my-agent" }, probe: fakeProbe({ "my-agent": OK() }) });
  assert.equal(r.bin, "my-agent");
});

test("pickCursorBin: relative override with a separator is rejected and warns", () => {
  const warnings = [];
  const r = pickCursorBin({
    env: { CURSOR_AGENT_BIN: "bin/agent" },
    probe: fakeProbe({ "cursor-agent": OK() }),
    warn: (m) => warnings.push(m)
  });
  assert.equal(r.bin, "cursor-agent");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /relative/i);
});

test("pickCursorBin: nothing available → canonical name, not available", () => {
  const r = pickCursorBin({ env: {}, probe: fakeProbe({}) });
  assert.equal(r.bin, "cursor-agent");
  assert.equal(r.availability.available, false);
});

test("isUsableCursorOverride: bare names and absolute paths are usable, relatives are not", () => {
  // Bare command name → resolved on PATH.
  assert.equal(isUsableCursorOverride("agent", path.posix), true);
  // Absolute path → used as-is.
  assert.equal(isUsableCursorOverride("/opt/cursor/agent", path.posix), true);
  // Relative paths with a separator → rejected (resolve against workspace cwd).
  assert.equal(isUsableCursorOverride("bin/agent", path.posix), false);
  assert.equal(isUsableCursorOverride("./agent", path.posix), false);
  assert.equal(isUsableCursorOverride("../agent", path.posix), false);
  // Empty / unset → not usable.
  assert.equal(isUsableCursorOverride(""), false);
  assert.equal(isUsableCursorOverride(undefined), false);
});

test("isUsableCursorOverride: Windows drive-relative values are rejected", () => {
  // "C:agent" has a root ("C:") but is NOT absolute — spawn would resolve it
  // against the drive's current dir (workspace cwd), so it must be rejected.
  assert.equal(isUsableCursorOverride("C:agent", path.win32), false);
  // A real absolute Windows path is fine.
  assert.equal(isUsableCursorOverride("C:\\cursor\\agent.exe", path.win32), true);
  assert.equal(isUsableCursorOverride("C:/cursor/agent.exe", path.win32), true);
  // Backslash-relative → rejected.
  assert.equal(isUsableCursorOverride("bin\\agent", path.win32), false);
  // Bare name → usable on Windows too.
  assert.equal(isUsableCursorOverride("agent", path.win32), true);
});
