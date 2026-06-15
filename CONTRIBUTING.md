# Contributing

Thanks for your interest in improving **cursor-plugin**.

Participation is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). To report
a security issue, follow [SECURITY.md](./SECURITY.md) (please don't open a public issue).

## Project layout

- `plugins/cursor/` — the installable plugin (commands, agent, skills, hooks, scripts).
- `plugins/cursor/scripts/cursor-companion.mjs` — the CLI dispatcher every command calls.
- `plugins/cursor/scripts/lib/cursor.mjs` — the only Cursor-specific runtime: it spawns
  `cursor-agent` and parses its `json` / `stream-json` output. Most other libs are
  CLI-agnostic (args, git, state, job tracking, rendering).
- `tests/` — `node --test` suite with a fake `cursor-agent` fixture (no network, no credits).
- `examples/` — runnable orchestration examples (not part of the installed plugin).

## Ground rules

- **Zero runtime dependencies.** Use only Node.js built-ins (`node:*`).
- **No credits in tests.** Unit tests must stay hermetic via `tests/fake-cursor-fixture.mjs`.
- **`cursor-agent` contract** (verified, do not regress):
  - Invocation: `cursor-agent -p --output-format json|stream-json --trust [--model X] [--force | --mode ask] [--resume <chatId>] [--workspace <cwd>] "PROMPT"`.
  - `--trust` is **required** for headless runs.
  - Success → one JSON object `{ type:"result", is_error:false, result, session_id, usage }`.
  - Failure → non-zero exit with **plain-text stderr** (not JSON). Treat success as
    `exit === 0 && is_error !== true`.
  - Read-only work uses `--mode ask` (Q&A), not `--mode plan`.

## Local development

```bash
# point Claude Code at your checkout
/plugin marketplace add /path/to/cursor-plugin
/plugin install cursor@cursor-plugin

# run the test suite
npm test
```

When changing parsing or job/state logic, add or update a test in `tests/` and run
`node --test tests/*.test.mjs` before opening a PR.

## Commit / PR

- Keep changes focused; describe the user-visible behavior in the PR.
- Update `CHANGELOG.md` and bump the version in `.claude-plugin/marketplace.json`,
  `plugins/cursor/.claude-plugin/plugin.json`, and `package.json` together.
