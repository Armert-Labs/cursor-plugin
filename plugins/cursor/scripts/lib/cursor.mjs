import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { binaryAvailable, runCommand } from "./process.mjs";

// Candidate binaries, in priority order. `cursor-agent` is the canonical name;
// `agent` is Cursor's newer name, accepted as a fallback only if its --version
// looks like a Cursor calver (YYYY.MM.DD) so an unrelated `agent` on PATH isn't
// mistaken for the CLI. This shape check is the lightest sufficient guard:
// stronger identity proofs are all worse here — `--version` carries no "cursor"
// string to match, `--help` grepping is brittle, codesign is macOS-only (and the
// launcher is unsigned), and a real invocation would spend credits. A wrong
// guess also fails safe: the bad binary errors out, `/cursor:setup` shows the
// resolved `bin`, and CURSOR_AGENT_BIN pins the right one.
const CURSOR_BIN_CANDIDATES = [
  { bin: "cursor-agent" },
  { bin: "agent", verify: (detail) => /^v?\d{4}\.\d{2}\.\d{2}/.test(detail) }
];

// A CURSOR_AGENT_BIN value is safe to invoke only as a bare command name
// (resolved on PATH) or an absolute path. Anything that is anchored — has a path
// separator, or a filesystem root — yet is NOT absolute is rejected: spawn()
// would resolve it against the untrusted workspace cwd. This covers POSIX
// relatives ("bin/agent", "./agent") and Windows drive-relative values
// ("C:agent", which has root "C:" but is not absolute). pathImpl is injectable
// so the Windows semantics stay testable on any host.
export function isUsableCursorOverride(override, pathImpl = path) {
  if (!override) {
    return false;
  }
  const anchored =
    override.includes("/") || override.includes(pathImpl.sep) || Boolean(pathImpl.parse(override).root);
  return !anchored || pathImpl.isAbsolute(override);
}

// Decide which cursor-agent binary to invoke. CURSOR_AGENT_BIN overrides
// everything (bare name → PATH, absolute path → as-is); a relative or
// drive-relative path is rejected — spawn() would resolve it against the
// untrusted workspace cwd — and we fall back to probing. Otherwise probe the
// candidates and use the first that runs, so a broken/duplicate install
// self-heals. Pure + injectable (probe/env/warn) for hermetic tests.
// Returns { bin, availability }.
export function pickCursorBin({ env = process.env, probe, warn = (m) => process.emitWarning(m) } = {}) {
  const runProbe = probe ?? ((bin) => binaryAvailable(bin, ["--version"]));
  const override = env.CURSOR_AGENT_BIN?.trim();
  if (override) {
    if (isUsableCursorOverride(override)) {
      return { bin: override, availability: runProbe(override) };
    }
    warn(
      `Ignoring CURSOR_AGENT_BIN="${override}": relative paths resolve against the ` +
        "workspace dir. Use an absolute path or a bare command name."
    );
  }
  let firstAvailability = null;
  for (const candidate of CURSOR_BIN_CANDIDATES) {
    const availability = runProbe(candidate.bin);
    if (availability.available && (!candidate.verify || candidate.verify(availability.detail))) {
      return { bin: candidate.bin, availability };
    }
    firstAvailability ??= availability;
  }
  return {
    bin: CURSOR_BIN_CANDIDATES[0].bin,
    availability: firstAvailability ?? { available: false, detail: "not found" }
  };
}

// Resolve once per process — the chosen binary doesn't change mid-run.
let resolvedCursor = null;
function resolveCursor(cwd) {
  if (!resolvedCursor) {
    resolvedCursor = pickCursorBin({ probe: (bin) => binaryAvailable(bin, ["--version"], { cwd }) });
  }
  return resolvedCursor;
}

export function getCursorBin(cwd) {
  return resolveCursor(cwd).bin;
}

export const SETUP_HINT =
  "Cursor CLI is not installed or not on PATH. Install it (e.g. `curl https://cursor.com/install -fsS | bash`), then rerun `/cursor:setup`.";

export const DEFAULT_CONTINUE_PROMPT = "Continue the previous task. Keep going until it is complete.";

// User-selectable models. NO hardcoded default — when --model is unset we pass
// no model flag and cursor-agent uses the account's configured default. Aliases
// are convenience shortcuts; any concrete cursor-agent model id passes through.
export const MODEL_ALIASES = new Map([
  ["spark", "composer-2.5"],
  ["fast", "composer-2.5-fast"],
  ["composer", "composer-2.5"],
  ["review", "gpt-5.1-codex-max-high"],
  ["codex", "gpt-5.1-codex-max-high"],
  ["max", "gpt-5.5-high"],
  ["opus", "claude-opus-4-8-high"]
]);

export function normalizeRequestedModel(model) {
  if (model == null) {
    return null;
  }
  const normalized = String(model).trim();
  if (!normalized) {
    return null;
  }
  return MODEL_ALIASES.get(normalized.toLowerCase()) ?? normalized;
}

export function getCursorAvailability(cwd) {
  const { bin, availability } = resolveCursor(cwd);
  return { ...availability, bin };
}

export function ensureCursorAvailable(cwd) {
  const availability = getCursorAvailability(cwd);
  if (!availability.available) {
    const override = process.env.CURSOR_AGENT_BIN?.trim();
    // Only blame the override when it was actually used. A rejected relative
    // override never reached the probe, so naming it (with cursor-agent's
    // PATH-probe detail) would mislead and contradict the earlier warning.
    throw new Error(
      isUsableCursorOverride(override)
        ? `Cursor CLI not runnable via CURSOR_AGENT_BIN="${override}" (${availability.detail}). ` +
            "Fix the override or unset it to fall back to PATH. " +
            SETUP_HINT
        : SETUP_HINT
    );
  }
  return availability;
}

export function getCursorAuthStatus(cwd) {
  const availability = getCursorAvailability(cwd);
  if (!availability.available) {
    return {
      available: false,
      loggedIn: false,
      email: null,
      apiKey: Boolean(process.env.CURSOR_API_KEY),
      detail: availability.detail
    };
  }

  const result = runCommand(getCursorBin(cwd), ["status"], { cwd });
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  const loggedIn = result.status === 0 && /logged in as/i.test(combined);
  const emailMatch = combined.match(/logged in as\s+(\S+)/i);
  return {
    available: true,
    loggedIn,
    email: emailMatch ? emailMatch[1] : null,
    apiKey: Boolean(process.env.CURSOR_API_KEY),
    detail: loggedIn
      ? `logged in as ${emailMatch ? emailMatch[1] : "unknown"}`
      : combined || "not authenticated"
  };
}

// Cursor runs one cursor-agent process per command. There is no shared
// app-server/broker, so the "session runtime" is always direct.
export function getSessionRuntimeStatus() {
  return {
    mode: "direct",
    label: "direct",
    detail: "Each command starts a fresh cursor-agent process. There is no shared runtime to manage.",
    endpoint: null
  };
}

export function buildCursorArgv(options = {}) {
  const argv = ["--print", "--trust"];
  argv.push("--output-format", options.stream ? "stream-json" : "json");
  if (options.stream) {
    argv.push("--stream-partial-output");
  }
  if (options.model) {
    argv.push("--model", options.model);
  }

  if (options.mode === "plan") {
    argv.push("--mode", "plan");
  } else if (options.mode === "ask") {
    argv.push("--mode", "ask");
  } else if (options.write) {
    argv.push("--force");
  }

  if (options.resumeChatId) {
    argv.push("--resume", options.resumeChatId);
  }
  if (options.workspace) {
    argv.push("--workspace", options.workspace);
  }

  argv.push(String(options.prompt ?? ""));
  return argv;
}

function cleanStderr(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join("\n");
}

function extractText(message) {
  if (!message || !Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .join("");
}

function phaseForEvent(type) {
  switch (type) {
    case "system":
      return "starting";
    case "assistant":
      return "running";
    case "tool_call":
    case "tool":
    case "command":
    case "shell":
    case "function_call":
      return "investigating";
    default:
      return null;
  }
}

// Run cursor-agent and capture/parse output.
// options: { prompt, model, write, mode, resumeChatId, workspace, stream, onProgress, timeoutMs }
export async function runCursorAgent(cwd, options = {}) {
  ensureCursorAvailable(cwd);

  const stream = Boolean(options.stream);
  const argv = buildCursorArgv({ ...options, stream, workspace: options.workspace ?? cwd });

  // Never spawn through a shell: the prompt is passed as a literal argv element,
  // so a shell could otherwise interpret metacharacters in user prompts
  // (command injection). On Windows this means `cursor-agent` must be directly
  // spawnable on PATH (see README's Windows caveat).
  const child = spawn(getCursorBin(cwd), argv, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true
  });

  let stdoutBuf = "";
  let stderrBuf = "";
  let resultEvent = null;
  let assistantText = "";
  let deltaText = "";
  let sessionId = null;
  let resolvedModel = null;
  let lineRemainder = "";
  let timedOut = false;

  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  function captureEvent(evt) {
    if (!evt || typeof evt !== "object") {
      return;
    }
    if (typeof evt.session_id === "string" && evt.session_id) {
      sessionId = evt.session_id;
    }
    if (evt.type === "system" && typeof evt.model === "string") {
      resolvedModel = evt.model;
    }
    if (evt.type === "result") {
      resultEvent = evt;
    }
    if (evt.type === "assistant") {
      const text = extractText(evt.message);
      if (!text) {
        return;
      }
      // With --stream-partial-output, streaming deltas carry timestamp_ms while
      // the consolidated final message does not. Keep the last full message as
      // the primary source and accumulate deltas as a deeper fallback, so we
      // still surface content if the final message / result text is empty.
      if (typeof evt.timestamp_ms === "number") {
        deltaText += text;
      } else {
        assistantText = text;
      }
    }
  }

  function reportProgress(evt) {
    if (!onProgress || !evt || typeof evt !== "object") {
      return;
    }
    const phase = phaseForEvent(evt.type);
    if (evt.type === "system") {
      onProgress({ message: `Cursor session started (model ${evt.model ?? "default"}).`, phase, chatId: evt.session_id ?? null });
    } else if (evt.type === "assistant") {
      onProgress({ message: "Assistant output streaming.", phase });
    } else if (phase === "investigating") {
      onProgress({ message: "Tool activity.", phase });
    } else if (evt.type === "result") {
      onProgress({
        message: evt.is_error ? "Turn failed." : `Turn completed in ${evt.duration_ms ?? "?"}ms.`,
        phase: evt.is_error ? "failed" : "finalizing"
      });
    }
  }

  child.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString("utf8");
  });

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    stdoutBuf += text;
    if (!stream) {
      return;
    }
    lineRemainder += text;
    let newlineIndex;
    while ((newlineIndex = lineRemainder.indexOf("\n")) >= 0) {
      const line = lineRemainder.slice(0, newlineIndex).trim();
      lineRemainder = lineRemainder.slice(newlineIndex + 1);
      if (!line) {
        continue;
      }
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      captureEvent(evt);
      reportProgress(evt);
    }
  });

  let timer = null;
  if (Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);
  }

  const exitCode = await new Promise((resolve) => {
    child.on("error", (err) => {
      stderrBuf += `\n${err.message}`;
      resolve(127);
    });
    child.on("close", (code) => resolve(code ?? 0));
  });

  if (timer) {
    clearTimeout(timer);
  }

  // NDJSON producers do not guarantee a trailing newline, so the final `result`
  // event may still be buffered when the process closes. Parse it before
  // deciding success/failure.
  if (stream && lineRemainder.trim()) {
    try {
      const evt = JSON.parse(lineRemainder.trim());
      captureEvent(evt);
      reportProgress(evt);
    } catch {
      // ignore an unparseable trailing fragment
    }
  }

  if (!stream) {
    const trimmed = stdoutBuf.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        captureEvent(parsed);
      } catch {
        resultEvent = null;
      }
    }
  }

  const ok = exitCode === 0 && !timedOut && resultEvent && resultEvent.is_error !== true;
  const finalText =
    (resultEvent && typeof resultEvent.result === "string" && resultEvent.result) ||
    assistantText ||
    deltaText ||
    "";
  const failureMessage = ok
    ? ""
    : timedOut
      ? `cursor-agent timed out after ${options.timeoutMs}ms`
      : cleanStderr(stderrBuf) ||
        (resultEvent && typeof resultEvent.result === "string" ? resultEvent.result : "") ||
        `cursor-agent exited with code ${exitCode}`;

  return {
    status: ok ? 0 : 1,
    sessionId,
    resolvedModel,
    finalMessage: finalText,
    usage: resultEvent?.usage ?? null,
    durationMs: resultEvent?.duration_ms ?? null,
    stderr: cleanStderr(stderrBuf),
    timedOut,
    rawJson: resultEvent
  };
}

// Parse a JSON object out of a model's text response. Cursor models often wrap
// JSON in ```json fences or add prose around it, so strip fences and fall back
// to the first balanced {...} block before giving up.
export function parseStructuredOutput(rawOutput, fallback = {}) {
  const raw = typeof rawOutput === "string" ? rawOutput : "";
  if (!raw.trim()) {
    return {
      parsed: null,
      parseError: fallback.failureMessage ?? "Cursor did not return a final structured message.",
      rawOutput: raw,
      ...fallback
    };
  }

  const candidates = [];
  const trimmed = raw.trim();
  candidates.push(trimmed);

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1].trim()) {
    candidates.push(fenceMatch[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return {
        parsed: JSON.parse(candidate),
        parseError: null,
        rawOutput: raw,
        ...fallback
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    parsed: null,
    parseError: lastError ? lastError.message : "Could not parse JSON from Cursor output.",
    rawOutput: raw,
    ...fallback
  };
}
