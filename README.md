# cursor-plugin

Use [Cursor](https://cursor.com)'s agentic CLI (`cursor-agent`) from inside **Claude Code** — delegate coding tasks, rescue stuck work, and run code reviews without leaving your Claude session, on whichever model you choose per call.

It mirrors the command surface of OpenAI's [`codex-plugin-cc`](https://github.com/openai/codex-plugin-cc) but targets Cursor. Because `cursor-agent` exposes a simple headless interface (`-p --output-format json`), there is no app-server or broker — the plugin just shells out to `cursor-agent` and parses its output.

> Unofficial community plugin by [Armert Labs](https://github.com/Armert-Labs). Not affiliated with Anysphere (Cursor) or Anthropic.

---

## Requirements

- **Node.js** ≥ 18.18 and **git**
- **Cursor CLI** (`cursor-agent`) installed and authenticated:
  ```bash
  curl https://cursor.com/install -fsS | bash      # macOS / Linux
  cursor-agent login                               # or set CURSOR_API_KEY for headless use
  ```
  Works with any Cursor subscription tier; usage is billed against your Cursor plan.

## Install

```text
/plugin marketplace add Armert-Labs/cursor-plugin
/plugin install cursor@cursor-plugin
/cursor:setup
```

Developing locally? Point the marketplace at a local checkout instead of GitHub:

```text
/plugin marketplace add /path/to/cursor-plugin
/plugin install cursor@cursor-plugin
```

## Commands

| Command | What it does |
| --- | --- |
| `/cursor:setup [--enable-review-gate \| --disable-review-gate]` | Check `cursor-agent` install/auth; toggle the stop-time review gate. |
| `/cursor:rescue [flags] <task>` | Delegate an investigation or fix to Cursor via the `cursor:cursor-rescue` subagent. **Write-capable by default.** |
| `/cursor:review [--base <ref>] [--scope ...] [--model ...]` | Structured, read-only code review of local git state. |
| `/cursor:adversarial-review [...] [focus]` | Design-challenging read-only review with optional focus text. |
| `/cursor:status [job-id] [--wait] [--all]` | Show active and recent Cursor jobs. |
| `/cursor:result [job-id]` | Show the stored output of a finished job (with a `cursor-agent --resume <id>` hint). |
| `/cursor:cancel [job-id]` | Cancel an active background job. |

### Rescue flags

| Flag | Meaning |
| --- | --- |
| `--read-only` | Analysis/diagnosis only; maps to `cursor-agent --mode ask` (read-only Q&A, no edits). Default is write-capable (`--force`). |
| `--background` / `--wait` | Run detached or in the foreground (default: foreground). |
| `--resume` / `--fresh` | Continue the latest Cursor chat in this repo, or start clean. |
| `--model <model\|alias>` | Pick the model for this call (see below). |

## Models — pick per call, no hardcoded default

When you omit `--model`, `cursor-agent` uses your account's configured default. Otherwise route each task to the right model. Convenience aliases (any concrete `cursor-agent` model id also works):

| Alias | Resolves to | Good for |
| --- | --- | --- |
| `spark` / `composer` | `composer-2.5` | Fast, cheap routine rescue |
| `fast` | `composer-2.5-fast` | Quick edits |
| `review` / `codex` | `gpt-5.1-codex-max-high` | Code review, deep work |
| `max` | `gpt-5.5-high` | Hard implementation tasks |
| `opus` | `claude-opus-4-8-high` | A second opinion from a different model family |

```text
/cursor:review --model review               # strong reviewer
/cursor:rescue --model spark tidy the imports in src/utils.ts
```

## Team orchestration (multi-model)

Because the model is chosen per call, you can run a **team**: send one task to
Composer and another to a stronger model in parallel, then review with a third.
Drive it straight from Claude:

```text
/cursor:rescue --background --model spark  implement slugify(str) in slug.js
/cursor:rescue --background --model max     implement truncate(str, n) in truncate.js
/cursor:status                              # watch both
/cursor:review --model review               # review the result, read-only
```

A runnable orchestrator and a full explanation (including extending to a
cross-tool team with OpenAI Codex) live in [`examples/`](./examples/README.md).

## Stop-time review gate (optional)

`/cursor:setup --enable-review-gate` makes Claude run a quick read-only Cursor
review of the *previous* turn before the session stops; if Cursor finds a
blocking issue it returns `BLOCK: <reason>` and Claude keeps working. Disabled by
default; turn it off again with `/cursor:setup --disable-review-gate`.

## Notes & caveats

- **Concurrent writes:** a background write-capable rescue edits the same working
  tree Claude may be touching. Scope background write tasks to files you are not
  editing, or run them read-only. Foreground rescues are safe because Claude waits.
- **Cost:** stronger models (`gpt-5.5-high`, `gpt-5.1-codex-max-high`,
  `claude-opus-4-8-high`) cost more than `composer-2.5`. Token usage is shown in
  `/cursor:result` and `/cursor:status`.
- **Trust:** every headless run passes `--trust`, auto-trusting the workspace for
  that `cursor-agent` run.
- **Windows:** best-effort; developed and tested on macOS/Linux. The plugin never
  spawns `cursor-agent` through a shell (injection-safe), so `cursor-agent` must be
  directly spawnable on `PATH`.

## State

Per-workspace job state and logs live under
`~/.claude/cursor-companion/workspaces/<slug>-<hash>/` (or under the plugin's data
directory when run inside Claude Code).

## Architecture

```
commands/         slash commands (setup, rescue, review, adversarial-review, status, result, cancel)
agents/           cursor-rescue — a thin forwarding subagent
skills/           internal contracts (runtime, result handling, prompting)
hooks/            session lifecycle + optional stop-time review gate
prompts/          review / adversarial / stop-gate templates
schemas/          structured review-output JSON schema
scripts/
  cursor-companion.mjs   dispatcher
  lib/cursor.mjs         spawns cursor-agent, parses json / stream-json
  lib/*.mjs              args, git, state, job tracking, rendering
```

## Development

```bash
npm test    # node --test — hermetic, uses a fake cursor-agent (no credits spent)
```

Zero runtime dependencies — only Node.js built-ins. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Armert Labs
