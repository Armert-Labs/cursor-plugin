# Changelog

All notable changes to this project are documented here.

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
