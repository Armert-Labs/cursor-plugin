# Changelog

All notable changes to this project are documented here.

## [0.2.0] - 2026-07-01

### Added
- `CURSOR_AGENT_BIN` env var to choose which `cursor-agent` binary the plugin
  invokes — an absolute path or a bare command name (resolved on `PATH`).
  Relative paths with a separator are rejected (they would resolve against the
  workspace cwd) with a warning, falling back to auto-detection.
- Automatic binary fallback: when `cursor-agent` isn't runnable, the plugin tries
  Cursor's newer `agent` name (accepted only if its `--version` is a Cursor
  calver) before failing, so a broken or shadowed install on `PATH` self-heals.

### Changed
- When `cursor-agent` can't be run and `CURSOR_AGENT_BIN` is set, the error names
  the override value instead of the generic install hint.

### Fixed
- `binaryAvailable` no longer returns a crashing binary's full stderr as
  `detail` — a crashing CLI can emit tens of KB (e.g. its own minified source),
  which previously flooded `/cursor:setup` output. `detail` is now the first
  meaningful line, capped at 500 chars. Per-stream `.trim()` selection runs
  before truncating, so a whitespace-only stream still falls through to the other.
- `CURSOR_AGENT_BIN` resolution hardening (from a post-merge review): a rejected
  relative override no longer gets blamed in the "not runnable" error (it now
  shows the generic install hint, matching the earlier warning), and Windows
  drive-relative values (e.g. `C:agent`) are now rejected too, not just
  separator-bearing relatives. Rejection logic is shared via `isUsableCursorOverride`.

## [0.1.2] - 2026-06-16

### Fixed
- `readStoredJob` / `readStoredJobOrNull` now return `null` for a corrupted or
  half-written job file instead of throwing on `JSON.parse`. `/cursor:status`,
  `/cursor:result`, `/cursor:cancel`, and the background worker now degrade
  gracefully on bad on-disk state (found by an automated repo audit).

## [0.1.1] - 2026-06-15

### Changed
- Expanded the plugin description to explicitly disclose the session-lifecycle
  hooks and the optional, off-by-default stop-time review gate, and to clarify
  that the plugin only shells out to your own authenticated `cursor-agent` (no
  data goes to the plugin author). Improves clarity and marketplace-review readiness.

### Added
- Release automation: a GitHub Actions workflow publishes a GitHub Release from
  the matching `CHANGELOG.md` section whenever a `vX.Y.Z` tag is pushed.

## [0.1.0] - 2026-06-15

Initial release.

### Added
- `/cursor:setup` — verify `cursor-agent` install/auth and toggle the stop-time review gate.
- `/cursor:rescue` — delegate an investigation or fix to Cursor through the `cursor:cursor-rescue` subagent (write-capable by default, `--read-only` to opt out).
- `/cursor:review` — structured code review of local git state (read-only).
- `/cursor:adversarial-review` — design-challenging review with optional focus text (read-only).
- `/cursor:status`, `/cursor:result`, `/cursor:cancel` — background job lifecycle.
- Background jobs via a detached worker streaming `stream-json` progress to a per-job log.
- Optional stop-time review gate (`Stop` hook) plus `SessionStart`/`SessionEnd` lifecycle hooks.
- Model aliases (`spark`, `fast`, `review`, `max`, `opus`) with pass-through for any `cursor-agent` model id; no hardcoded default model.

### Hardened (post-review)
After an adversarial code review (run via Codex), the following were fixed:
- Parse a final stream-json `result` line that lacks a trailing newline (no lost output/usage).
- Write the background job record before spawning the detached worker (removes a "No stored job found" startup race).
- Preserve a concurrent `/cursor:cancel` instead of overwriting it with completed/failed.
- `terminateProcessTree` falls back to a direct process signal when the process-group signal returns `ESRCH`.
- Never spawn `cursor-agent` through a shell, so prompts can't be shell-interpreted (command-injection hardening).
- Read-only operations (review, adversarial-review, and `--read-only` rescue) use `cursor-agent --mode ask` instead of `--mode plan`. Plan mode is for generating implementation plans and could return empty answer text for pure analysis prompts on heavy reasoning models; ask mode reliably returns the answer.
- Accumulate streamed assistant deltas as a fallback so output is still captured when the final result text is empty.
