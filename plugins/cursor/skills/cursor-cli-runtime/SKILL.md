---
name: cursor-cli-runtime
description: Internal helper contract for calling the cursor-companion runtime from Claude Code
user-invocable: false
---

# Cursor Runtime

Use this skill only inside the `cursor:cursor-rescue` subagent.

Primary helper:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" task "<raw arguments>"`

Execution rules:
- The rescue subagent is a forwarder, not an orchestrator. Its only job is to invoke `task` once and return that stdout unchanged.
- Prefer the helper over hand-rolled `git`, direct `cursor-agent` strings, or any other Bash activity.
- Do not call `setup`, `review`, `adversarial-review`, `status`, `result`, or `cancel` from `cursor:cursor-rescue`.
- Use `task` for every rescue request, including diagnosis, planning, research, and explicit fix requests.
- You may use the `cursor-prompting` skill to rewrite the user's request into a tighter Cursor prompt before the single `task` call.
- That prompt drafting is the only Claude-side work allowed. Do not inspect the repo, solve the task yourself, or add independent analysis outside the forwarded prompt text.

Write mode:
- `task` is write-capable by default: Cursor runs with `--force` and may edit files in the working tree.
- Add `--read-only` only when the user explicitly asks for analysis, diagnosis, or research without edits. `--read-only` maps to `cursor-agent --mode ask` (read-only Q&A).
- Never add a separate write flag yourself; write is the default and `--read-only` is the opt-out.

Model selection:
- Leave the model unset by default. Add `--model` only when the user explicitly asks for one.
- The companion resolves these aliases (any concrete `cursor-agent` model id also passes through):
  - `spark` / `composer` -> `composer-2.5` (fast, cheap; good for routine rescue)
  - `fast` -> `composer-2.5-fast`
  - `review` / `codex` -> `gpt-5.1-codex-max-high` (strong reasoning/coding)
  - `max` -> `gpt-5.5-high`
  - `opus` -> `claude-opus-4-8-high` (Claude via Cursor, for a different model family)

Command selection:
- Use exactly one `task` invocation per rescue handoff.
- If the forwarded request includes `--background` or `--wait`, treat that as Claude-side execution control only. Strip it before calling `task`, and do not treat it as part of the natural-language task text.
- If the forwarded request includes `--model`, pass it through to `task` (the companion resolves aliases).
- If the forwarded request includes `--read-only`, pass `--read-only` to `task`.
- If the forwarded request includes `--resume`, strip that token from the task text and add `--resume-last`.
- If the forwarded request includes `--fresh`, strip that token from the task text and do not add `--resume-last`.
- `task --resume-last`: continues the latest Cursor task chat in this repository/session ("keep going", "resume", "apply the top fix", "dig deeper").

Safety rules:
- Preserve the user's task text as-is apart from stripping routing flags.
- Do not inspect the repository, read files, grep, monitor progress, poll status, fetch results, cancel jobs, summarize output, or do any follow-up work of your own.
- Return the stdout of the `task` command exactly as-is.
- If the Bash call fails or Cursor cannot be invoked, return nothing.
