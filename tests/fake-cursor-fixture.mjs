import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// A stub `cursor-agent` binary used for hermetic tests. It never makes network
// calls or spends credits. It mirrors the real CLI's observed contract:
//   --version        -> prints a version, exit 0
//   status           -> prints "Logged in as ...", exit 0
//   -p ... "PROMPT"  -> emits json or stream-json echoing the prompt as result
// A prompt of exactly "FAIL" makes it exit 1 with plain-text stderr (the real
// CLI's error path is plain text, not JSON).
export const FAKE_CURSOR_SOURCE = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("--version")) { process.stdout.write("0.0.0-fake\\n"); process.exit(0); }
if (args[0] === "status") { process.stdout.write("\\u2713 Logged in as test@example.com\\n"); process.exit(0); }
const prompt = args.length ? args[args.length - 1] : "";
const sid = "fake-session-123";
if (prompt === "FAIL") { process.stderr.write("boom: something broke\\n"); process.exit(1); }
const stream = args.includes("stream-json");
if (stream) {
  process.stdout.write(JSON.stringify({ type: "system", subtype: "init", model: "fake-model", session_id: sid }) + "\\n");
  if (prompt === "DELTASONLY") {
    process.stdout.write(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "AB" }] }, session_id: sid, timestamp_ms: 1 }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "CD" }] }, session_id: sid, timestamp_ms: 2 }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, duration_ms: 5, result: "", session_id: sid, usage: { inputTokens: 1, outputTokens: 2 } }) + "\\n");
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: prompt }] }, session_id: sid }) + "\\n");
  const tail = prompt === "NONL" ? "" : "\\n";
  process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, duration_ms: 5, result: prompt, session_id: sid, usage: { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } }) + tail);
} else {
  process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, duration_ms: 5, result: prompt, session_id: sid, usage: { inputTokens: 1, outputTokens: 2 } }) + "\\n");
}
process.exit(0);
`;

export function installFakeCursor() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-cursor-"));
  const binPath = path.join(dir, "cursor-agent");
  fs.writeFileSync(binPath, FAKE_CURSOR_SOURCE, "utf8");
  fs.chmodSync(binPath, 0o755);

  const previousPath = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${previousPath ?? ""}`;

  return {
    dir,
    restore() {
      process.env.PATH = previousPath;
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
  };
}
