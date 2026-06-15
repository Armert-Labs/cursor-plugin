import assert from "node:assert/strict";
import { test } from "node:test";

import { parseArgs, splitRawArgumentString } from "../plugins/cursor/scripts/lib/args.mjs";

test("parseArgs separates value options, boolean flags, and positionals", () => {
  const { options, positionals } = parseArgs(
    ["--model", "spark", "--read-only", "fix", "the", "bug"],
    { valueOptions: ["model"], booleanOptions: ["read-only"] }
  );
  assert.equal(options.model, "spark");
  assert.equal(options["read-only"], true);
  assert.deepEqual(positionals, ["fix", "the", "bug"]);
});

test("parseArgs supports --key=value and aliases", () => {
  const { options } = parseArgs(["--model=gpt-5.5-high", "-m", "ignored"], {
    valueOptions: ["model"],
    aliasMap: { m: "model" }
  });
  assert.equal(options.model, "ignored");
});

test("parseArgs treats everything after -- as positional", () => {
  const { positionals } = parseArgs(["--", "--not-a-flag", "text"], { booleanOptions: ["x"] });
  assert.deepEqual(positionals, ["--not-a-flag", "text"]);
});

test("splitRawArgumentString respects quotes and escapes", () => {
  assert.deepEqual(splitRawArgumentString(`--model spark "fix the bug" plain`), [
    "--model",
    "spark",
    "fix the bug",
    "plain"
  ]);
  assert.deepEqual(splitRawArgumentString(`it\\'s fine`), ["it's", "fine"]);
});
