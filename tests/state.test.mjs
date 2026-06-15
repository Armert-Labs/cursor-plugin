import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { resolveJobFile } from "../plugins/cursor/scripts/lib/state.mjs";
import { readStoredJob } from "../plugins/cursor/scripts/lib/job-control.mjs";

test("readStoredJob returns null for a corrupted job file instead of throwing", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cpcc-data-"));
  const previous = process.env.CLAUDE_PLUGIN_DATA;
  process.env.CLAUDE_PLUGIN_DATA = dataDir;
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cpcc-ws-"));
  try {
    const jobFile = resolveJobFile(workspace, "task-corrupt");
    fs.writeFileSync(jobFile, "{ this is not valid json", "utf8");

    assert.equal(readStoredJob(workspace, "task-corrupt"), null);
    assert.equal(readStoredJob(workspace, "task-missing"), null);
  } finally {
    if (previous === undefined) delete process.env.CLAUDE_PLUGIN_DATA;
    else process.env.CLAUDE_PLUGIN_DATA = previous;
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
