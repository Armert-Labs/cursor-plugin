# cursor-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
![Node ≥ 18.18](https://img.shields.io/badge/node-%E2%89%A5%2018.18-brightgreen)
![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-8A2BE2)
![Cursor cursor-agent](https://img.shields.io/badge/Cursor-cursor--agent-2563EB)
![Zero dependencies](https://img.shields.io/badge/deps-0-success)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

Use [Cursor](https://cursor.com)'s agentic CLI (`cursor-agent`) from inside **Claude Code** — delegate coding tasks, rescue stuck work, and run code reviews without leaving your Claude session, on whichever model you choose **per call**.

It mirrors the command surface of OpenAI's [`codex-plugin-cc`](https://github.com/openai/codex-plugin-cc) but targets Cursor. Because `cursor-agent` exposes a simple headless interface (`-p --output-format json`), there is no app-server or broker — the plugin just shells out to `cursor-agent` and parses its output.

> Unofficial community plugin by [Armert Labs](https://github.com/Armert-Labs). Not affiliated with Anysphere (Cursor) or Anthropic.

---

## Demo

A real session — type the `/cursor:` commands in Claude Code and Cursor's output
comes back inline (here, reviewing an in-memory cache that just grew a `ttl` option):

```console
> /cursor:setup
# Cursor Setup
Status: ready
Checks:
- node: v24.12.0
- cursor-agent: 2026.06.15-...
- auth: logged in as you@example.com
- session runtime: direct
- review gate: disabled

> /cursor:rescue --read-only --model max  what does src/cache.js do and what's the risk?
src/cache.js adds a process-local in-memory Map cache with get() and set() helpers,
where set() schedules deletion after ttlMs. The main risk is unbounded,
non-tenant-aware, per-process caching that can leak or mix sensitive data across
tenants and break consistency across horizontally scaled instances.

> /cursor:review
# Cursor Review
Target: working tree diff
Verdict: needs-attention

TTL support via bare setTimeout introduces a stale-timer eviction race on key
refresh and breaks prior two-argument set() semantics by scheduling immediate
deletion when ttlMs is omitted or invalid.

Findings:
- [high] Stale timers delete refreshed cache entries (src/cache.js:3-5)
  Each set() call schedules an independent setTimeout that unconditionally runs
  store.delete(key). If the same key is written again before an earlier timer
  fires, the obsolete timer still deletes the newer value before its TTL expires.
  Recommendation: track a per-key timer handle or generation token; clear the
  previous timer on set, and delete only if the token still matches.

> /cursor:status
# Cursor Status
Session runtime: direct
Review gate: disabled

Latest finished:
- review-mqfficjs | completed | review | Cursor Review
  Phase: done   Duration: 1m 5s
  Cursor chat ID: b9de94c9-f185-4044-9f28-242570bc9d43
  Resume in Cursor: cursor-agent --resume b9de94c9-f185-4044-9f28-242570bc9d43
```

> Prefer an animated GIF? A [VHS](https://github.com/charmbracelet/vhs) tape is in
> [`assets/demo.tape`](./assets/demo.tape) — run `vhs assets/demo.tape` to record one.

---

## Table of contents

- [Demo](#demo)
- [Why this plugin](#why-this-plugin)
- [Requirements](#requirements)
- [Installation (step by step)](#installation-step-by-step)
  - [1. Install the Cursor CLI](#1-install-the-cursor-cli)
  - [2. Authenticate the Cursor CLI](#2-authenticate-the-cursor-cli)
  - [3. Add the marketplace & install the plugin](#3-add-the-marketplace--install-the-plugin)
  - [4. Run setup & verify](#4-run-setup--verify)
  - [Updating & uninstalling](#updating--uninstalling)
- [Commands (comprehensive)](#commands-comprehensive)
  - [`/cursor:setup`](#cursorsetup)
  - [`/cursor:rescue`](#cursorrescue)
  - [`/cursor:review`](#cursorreview)
  - [`/cursor:adversarial-review`](#cursoradversarial-review)
  - [`/cursor:status`](#cursorstatus)
  - [`/cursor:result`](#cursorresult)
  - [`/cursor:cancel`](#cursorcancel)
- [Choosing a model](#choosing-a-model)
- [Foreground vs background jobs](#foreground-vs-background-jobs)
- [Resuming work](#resuming-work)
- [The stop-time review gate](#the-stop-time-review-gate)
- [Team orchestration (multi-model)](#team-orchestration-multi-model)
- [How it works](#how-it-works)
- [Where state is stored](#where-state-is-stored)
- [Troubleshooting](#troubleshooting)
- [Security & safety notes](#security--safety-notes)
- [Development](#development)
- [License](#license)

---

## Why this plugin

Claude Code is great, but sometimes you want a **second agent** on the job:

- a **cheaper/faster** model to grind through routine edits while Claude does the thinking,
- a **different model family** for a fresh perspective or a tie-breaker review,
- a **parallel teammate** so two pieces of work happen at once,
- or a steerable **code reviewer** that never touches your files.

`cursor-plugin` lets Claude hand any of these off to Cursor's `cursor-agent` and bring the result back inline — you pick the model on every call.

## Requirements

| Requirement | Notes |
| --- | --- |
| **Node.js ≥ 18.18** | The plugin's runtime is plain Node ESM with **zero dependencies**. |
| **git** | Reviews operate on your repository's git state. |
| **Cursor CLI (`cursor-agent`)** | Installed and authenticated (steps below). |
| **A Cursor account** | Any tier works (including free). Usage is billed against your Cursor plan. |

---

## Installation (step by step)

### 1. Install the Cursor CLI

**macOS / Linux:**

```bash
curl https://cursor.com/install -fsS | bash
```

This installs `cursor-agent` (typically to `~/.local/bin`). Restart your shell or
ensure that directory is on your `PATH`, then confirm:

```bash
cursor-agent --version
# e.g. 2026.06.15-...
```

**Windows:** follow the official instructions at <https://cursor.com/docs/cli>.
The plugin runs `cursor-agent` without a shell for safety, so `cursor-agent` must
be directly invokable on your `PATH` (WSL is the smoothest path on Windows).

### 2. Authenticate the Cursor CLI

Interactive (opens a browser, recommended for local use):

```bash
cursor-agent login
cursor-agent status        # → ✓ Logged in as you@example.com
```

Headless / CI (no browser):

```bash
export CURSOR_API_KEY="your_api_key"   # from the Cursor dashboard
```

### 3. Add the marketplace & install the plugin

Inside Claude Code, run:

```text
/plugin marketplace add Armert-Labs/cursor-plugin
/plugin install cursor@cursor-plugin
```

- `marketplace add` registers this GitHub repo as a plugin source.
- `install cursor@cursor-plugin` installs the `cursor` plugin from the
  `cursor-plugin` marketplace. After installing you may be prompted to reload;
  do so (or restart Claude Code) to load the new slash commands and hooks.

**Local development install** (from a checkout instead of GitHub):

```text
/plugin marketplace add /absolute/path/to/cursor-plugin
/plugin install cursor@cursor-plugin
```

### 4. Run setup & verify

```text
/cursor:setup
```

`/cursor:setup` prints a readiness report and tells you exactly what (if anything)
is missing:

```
# Cursor Setup
Status: ready
Checks:
- node: v24.12.0
- cursor-agent: 2026.06.15-...
- auth: logged in as you@example.com
- session runtime: direct
- review gate: disabled
```

- If **cursor-agent is missing**, it points you to the install command above.
- If **not authenticated**, it tells you to run `cursor-agent login`.
- It never installs or logs in *for* you — those stay in your hands.

You're ready. Try `/cursor:rescue --read-only summarize what this repo does`.

### Updating & uninstalling

```text
/plugin marketplace update cursor-plugin     # pull the latest version
/plugin uninstall cursor@cursor-plugin       # remove the plugin
```

---

## Commands (comprehensive)

All commands are namespaced under `/cursor:`. Below, "the companion" refers to the
bundled `cursor-companion.mjs` script that each command calls; you normally never
invoke it directly.

### `/cursor:setup`

**Purpose:** verify the toolchain and manage the optional review gate.

```text
/cursor:setup
/cursor:setup --enable-review-gate
/cursor:setup --disable-review-gate
```

| Flag | Effect |
| --- | --- |
| *(none)* | Print the readiness report (node, cursor-agent, auth, review-gate state). |
| `--enable-review-gate` | Turn on the [stop-time review gate](#the-stop-time-review-gate) for this repo. |
| `--disable-review-gate` | Turn it off again. |

The gate setting is **per repository** and persisted on disk.

### `/cursor:rescue`

**Purpose:** hand a real task to Cursor — investigate a bug, implement a change,
or continue earlier work. This is the main "do something" command. It runs through
a thin forwarding subagent (`cursor:cursor-rescue`) and returns Cursor's output
verbatim.

```text
/cursor:rescue <what Cursor should do>
/cursor:rescue --read-only investigate why the auth test is flaky
/cursor:rescue --model spark rename getUser to fetchUser across the repo
/cursor:rescue --background --model max implement the retry logic in src/queue.ts
/cursor:rescue --resume keep going
```

| Flag | Default | Meaning |
| --- | --- | --- |
| *(positional text)* | — | The task. Natural language. |
| `--read-only` | off | Analysis/diagnosis only — Cursor reads and answers but **does not edit** (`cursor-agent --mode ask`). |
| *(no `--read-only`)* | **on** | **Write-capable** — Cursor may edit files in the working tree (`cursor-agent --force`). |
| `--model <model\|alias>` | account default | Route this task to a specific model. See [Choosing a model](#choosing-a-model). |
| `--background` / `--wait` | `--wait` | Run detached (Claude keeps working) or in the foreground (Claude waits). |
| `--resume` / `--fresh` | ask | Continue the latest Cursor chat in this repo, or start a fresh one. |

**Key behavior:** rescue is **write-capable by default**. Add `--read-only` when
you only want analysis. When neither `--resume` nor `--fresh` is given and a
previous chat exists, Claude asks once whether to continue it.

The `cursor:cursor-rescue` subagent is also used **proactively**: when Claude is
stuck or wants a second pass, it can delegate to Cursor on its own.

### `/cursor:review`

**Purpose:** a structured, **read-only** code review of your current git changes.
Cursor never edits anything here. Output is sorted by severity with file:line
references.

```text
/cursor:review
/cursor:review --base main
/cursor:review --scope working-tree
/cursor:review --background --model review
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--base <ref>` | auto | Review the diff against a base branch/ref (e.g. `main`). |
| `--scope auto\|working-tree\|branch` | `auto` | What to review. `auto` = uncommitted changes if dirty, else branch diff. |
| `--model <model\|alias>` | account default | Model to review with (e.g. `--model review`). |
| `--wait` / `--background` | asks | Run in the foreground, or detached as a background job. |

If you don't pass `--wait`/`--background`, Claude estimates the change size and
asks whether to wait or run in the background.

### `/cursor:adversarial-review`

**Purpose:** like `/cursor:review`, but framed to **challenge the approach** —
design choices, assumptions, tradeoffs, failure modes — not just surface defects.
Also **read-only**. Unlike `/cursor:review`, it accepts optional **focus text**.

```text
/cursor:adversarial-review
/cursor:adversarial-review focus on the retry and idempotency logic
/cursor:adversarial-review --base main --model review challenge the caching design
```

Same flags as `/cursor:review`, plus trailing free-text focus.

### `/cursor:status`

**Purpose:** see active and recent Cursor jobs for this repository.

```text
/cursor:status                         # compact table of this session's jobs
/cursor:status <job-id>                # full detail for one job
/cursor:status <job-id> --wait         # block until that job finishes
/cursor:status --all                   # include older jobs
```

| Flag | Meaning |
| --- | --- |
| `<job-id>` | Show one job in detail (accepts a unique id prefix). |
| `--wait` | Poll until the given job leaves the queued/running state. |
| `--timeout-ms <ms>` | Cap how long `--wait` polls (default ~4 min). |
| `--all` | List all retained jobs, not just the recent window. |

Each row shows the kind (rescue/review/adversarial-review), status, phase, elapsed
time, the **Cursor chat id**, and follow-up commands.

### `/cursor:result`

**Purpose:** print the stored final output of a finished job.

```text
/cursor:result            # most recent finished job in this session
/cursor:result <job-id>   # a specific job
```

Includes the full output (review verdict/findings or rescue answer), token usage,
the **Cursor chat id**, and a `cursor-agent --resume <chatId>` hint so you can pick
the conversation back up in Cursor directly.

### `/cursor:cancel`

**Purpose:** stop an active background job.

```text
/cursor:cancel            # the single active job in this session
/cursor:cancel <job-id>   # a specific job
```

Cancellation signals the detached worker's process group and marks the job
`cancelled`. A concurrent finish won't overwrite a cancellation.

---

## Choosing a model

There is **no hardcoded default model**. When you omit `--model`, `cursor-agent`
uses your account's configured default. Otherwise pick per call. Aliases are
conveniences; **any** concrete `cursor-agent` model id also works
(`cursor-agent --list-models` shows the full list).

| Alias | Resolves to | Best for |
| --- | --- | --- |
| `spark` / `composer` | `composer-2.5` | Fast, cheap routine rescue |
| `fast` | `composer-2.5-fast` | Quick edits |
| `review` / `codex` | `gpt-5.1-codex-max-high` | Code review, deep/hard work |
| `max` | `gpt-5.5-high` | Demanding implementation tasks |
| `opus` | `claude-opus-4-8-high` | A second opinion from a different model family |

```text
/cursor:review --model review                       # strong reviewer
/cursor:rescue --model spark fix the lint errors      # cheap & fast
/cursor:rescue --model some-exact-model-id do X        # any cursor-agent model id
```

The model that actually ran is reported back (in `/cursor:result` and
`/cursor:status`) so you always know what produced an answer.

## Foreground vs background jobs

- **Foreground** (`--wait`, the default for rescue): Claude waits for Cursor and
  returns the result in the same turn. Simple; best for short tasks. `cursor-agent`
  has noticeable startup latency, so long tasks are better backgrounded.
- **Background** (`--background`): the task runs in a detached worker. Claude keeps
  working and you track it with `/cursor:status`, fetch it with `/cursor:result`,
  and stop it with `/cursor:cancel`. Progress is streamed to a per-job log.

## Resuming work

Every Cursor run returns a **chat id** (`session_id`). The plugin stores it so you
can continue the same conversation:

- `/cursor:rescue --resume keep going` continues the latest rescue chat in this repo.
- `/cursor:result` prints `cursor-agent --resume <chatId>` if you'd rather continue
  inside the Cursor app/CLI directly.

Resume candidates are scoped to your current Claude session.

## The stop-time review gate

An **optional** safety net. When enabled (`/cursor:setup --enable-review-gate`),
Claude runs a quick **read-only** Cursor review of the *previous* turn before the
session is allowed to stop:

- Cursor answers `ALLOW: …` → the session stops normally.
- Cursor answers `BLOCK: <reason>` → Claude is told to keep working and fix it first.

It only reviews turns that actually changed code, and it can never edit anything.
**Disabled by default.** Turn it off with `/cursor:setup --disable-review-gate`.

## Team orchestration (multi-model)

Because the model is chosen per call, you can run a **team**: dispatch one task to
Composer and another to a stronger model in parallel, then review with a third.
Driven straight from Claude:

```text
/cursor:rescue --background --model spark  implement slugify(str) in slug.js
/cursor:rescue --background --model max     implement truncate(str, n) in truncate.js
/cursor:status                              # watch both run at once
/cursor:review --model review               # review the combined result, read-only
```

A runnable orchestrator and a full walkthrough (including extending to a
cross-tool team with OpenAI Codex) live in **[`examples/`](./examples/README.md)**.

> ⚠️ Two write-capable jobs editing the **same** files at once will clobber each
> other. Give each parallel writer its own files, or keep all-but-one read-only.

## How it works

```
You ──/cursor:rescue──▶ cursor:cursor-rescue (subagent, thin forwarder)
                              │  one Bash call
                              ▼
                    cursor-companion.mjs  (dispatcher)
                              │  spawn, parse json / stream-json
                              ▼
                         cursor-agent  -p --output-format json --trust …
```

- **Commands** are thin: they shell out to the companion and return its output.
- **`cursor:cursor-rescue`** is a forwarding subagent — it makes exactly one call
  and returns Cursor's output verbatim (no second-guessing, no hidden edits).
- **`cursor-companion.mjs`** builds the `cursor-agent` argv, runs it, parses the
  result (`json` for one-shot, `stream-json` for live progress), tracks jobs, and
  renders output.
- **Reviews** collect a git diff context and ask Cursor for structured JSON, which
  is validated and rendered by severity.

Repository layout:

```
plugins/cursor/
  commands/      slash commands (setup, rescue, review, adversarial-review, status, result, cancel)
  agents/        cursor-rescue — the forwarding subagent
  skills/        internal contracts (runtime, result handling, prompting)
  hooks/         session lifecycle + optional stop-time review gate
  prompts/       review / adversarial / stop-gate templates
  schemas/       structured review-output JSON schema
  scripts/
    cursor-companion.mjs   the dispatcher
    lib/cursor.mjs         spawns cursor-agent, parses output
    lib/*.mjs              args, git, state, job tracking, rendering
examples/        runnable orchestration examples
tests/           hermetic node --test suite (fake cursor-agent)
```

## Where state is stored

Per-workspace job records, logs, and the review-gate setting live under:

```
~/.claude/cursor-companion/workspaces/<repo-slug>-<hash>/
  state.json          # config + job list
  jobs/<id>.json      # per-job record (incl. chat id, result)
  jobs/<id>.log       # streamed progress
```

When run inside Claude Code, the plugin uses its provided data directory instead.
State is **per repository**; jobs are scoped to your Claude session.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/cursor:*` commands don't appear | Finish `/plugin install cursor@cursor-plugin` and reload/restart Claude Code. |
| Setup says cursor-agent is missing | Install it (step 1) and make sure it's on your `PATH` (`cursor-agent --version`). |
| Setup says not authenticated | Run `cursor-agent login`, or set `CURSOR_API_KEY`. |
| "Workspace Trust Required" / hard fail | The plugin always passes `--trust`; if you see this, you're likely calling `cursor-agent` yourself without it. |
| A review returns no JSON / parse error | Output is shown raw with the parse error. Re-run, or try `--model review` for a stronger model. |
| A background job is stuck | `/cursor:status <id>` to inspect, `/cursor:cancel <id>` to stop it. |
| Windows issues | Best-effort only; use WSL, and ensure `cursor-agent` is directly on `PATH`. |

## Security & safety notes

- **No shell interpolation.** `cursor-agent` is never spawned through a shell, so
  prompt text can't be interpreted as shell commands (injection-safe).
- **Read-only really is read-only.** Reviews and `--read-only` rescues use
  `cursor-agent --mode ask`; Cursor reads and answers but cannot edit.
- **Write tasks edit your files.** A default (write-capable) rescue can modify the
  working tree — review the diff afterward, especially for background jobs.
- **Cost.** Stronger models cost more than `composer-2.5`; token usage is surfaced
  in `/cursor:result` and `/cursor:status`.

## Development

```bash
npm test    # node --test — hermetic, uses a fake cursor-agent (no credits spent)
```

Zero runtime dependencies — only Node.js built-ins. Contributions welcome; see
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Armert Labs
