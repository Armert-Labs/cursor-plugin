---
name: cursor-prompting
description: Internal guidance for composing compact, operator-style prompts for cursor-agent across coding, review, diagnosis, and research tasks
user-invocable: false
---

# Cursor Prompting

Treat `cursor-agent` like an operator, not a collaborator. Prompts should be compact and specific.

Principles:
- State the task and the done-state in one or two sentences. Avoid long preambles.
- Name the concrete output you expect (a patch, a diagnosis, a list, a one-line answer).
- Give one task per run. Do not bundle unrelated work.
- Add constraints only where they matter (files to touch or avoid, tests to keep green, "do not refactor unrelated code").
- Prefer explicit contracts over vague nudges. If you need verification, say "run the tests and report the result".

Cursor specifics:
- `cursor-agent` is headless and write-capable by default in this plugin (`--force`). `--read-only` maps to `--mode ask` (read-only Q&A): Cursor reads and answers but never edits.
- Cursor resolves its own model unless `--model` is set. There is no reasoning-effort flag.
- The agent already has read/write access to the working directory, so reference files by path rather than pasting their contents.

Recommended models per task (set via `--model <alias>`):
- Routine rescue / quick edits: `spark` (composer-2.5) — fast and cheap.
- Deep implementation or debugging: `review`/`codex` (gpt-5.1-codex-max-high) or `max` (gpt-5.5-high).
- Code review / adversarial review: `review` (gpt-5.1-codex-max-high).
- A second opinion from a different model family: `opus` (claude-opus-4-8-high).
- Any concrete `cursor-agent` model id from `cursor-agent --list-models` also works.
