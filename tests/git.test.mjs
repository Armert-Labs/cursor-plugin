import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { resolveReviewTarget } from "../plugins/cursor/scripts/lib/git.mjs";

function git(cwd, args) {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cpcc-git-"));
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "t@t.co"]);
  git(dir, ["config", "user.name", "t"]);
  fs.writeFileSync(path.join(dir, "a.txt"), "one\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-qm", "init"]);
  return dir;
}

test("resolveReviewTarget honors explicit working-tree scope", () => {
  const dir = makeRepo();
  try {
    const target = resolveReviewTarget(dir, { scope: "working-tree" });
    assert.equal(target.mode, "working-tree");
    assert.equal(target.explicit, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveReviewTarget honors an explicit base ref", () => {
  const dir = makeRepo();
  try {
    const target = resolveReviewTarget(dir, { base: "HEAD" });
    assert.equal(target.mode, "branch");
    assert.equal(target.baseRef, "HEAD");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveReviewTarget auto-detects working tree when the tree is dirty", () => {
  const dir = makeRepo();
  try {
    fs.appendFileSync(path.join(dir, "a.txt"), "two\n");
    const target = resolveReviewTarget(dir, { scope: "auto" });
    assert.equal(target.mode, "working-tree");
    assert.equal(target.explicit, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveReviewTarget rejects an unsupported scope", () => {
  const dir = makeRepo();
  try {
    assert.throws(() => resolveReviewTarget(dir, { scope: "staged" }), /Unsupported review scope/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
