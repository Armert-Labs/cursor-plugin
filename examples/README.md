# Examples

## `team-demo.mjs` — multi-model "team agent" orchestration

A small, runnable orchestrator that dispatches work to **several models at once**
and then runs a **review pass** with a different model. It shows the three things
people usually want from this plugin:

1. **Model switching** — each team member runs on a different model (`--model`).
2. **Parallel dispatch** — two implementers run concurrently.
3. **A review stage** — a third model reviews the result, read-only.

```
Stage 1 (parallel, write):   Composer ─┐                ┌─ slug.js
                                        ├─ run together ─┤
                              GPT-5 ────┘                └─ truncate.js
Stage 2 (read-only):         codex-max reviews both files
```

### Run it

From inside a **git** project you want the team to work on:

```bash
# clone this repo somewhere, then:
cd ~/my-project
node ~/path/to/cursor-plugin/examples/team-demo.mjs
```

It writes files into the current directory, so use a scratch repo the first time.
The script resolves the plugin's companion automatically — no paths to edit.

### How to use this pattern *inside Claude Code* (no script)

You usually don't run a script at all — you ask Claude to orchestrate the team
using the plugin's slash commands. The script above is just the same idea made
explicit. For example, tell Claude:

> "Delegate the slugify implementation to Cursor Composer and the truncate
> implementation to a strong model, in parallel, then review both with codex-max."

Claude will run something like:

```text
/cursor:rescue --background --model spark   implement slugify(str) in slug.js
/cursor:rescue --background --model max      implement truncate(str, n) in truncate.js
/cursor:status                               # watch both jobs
/cursor:review --model review                # review the result, read-only
```

Key points that make this work as a "team":

- **`--model <alias>` per call** routes each task to the right model
  (`spark`=composer-2.5, `max`=gpt-5.5-high, `review`=gpt-5.1-codex-max-high,
  `opus`=claude-opus-4-8-high — or any `cursor-agent` model id).
- **`--background`** lets Claude fire several rescues and keep moving; it polls
  `/cursor:status` and collects results with `/cursor:result`.
- **Different files per parallel writer.** Two write-capable agents editing the
  *same* files at once will clobber each other — give each member its own files,
  or run all-but-one read-only. (See the concurrency note in the main README.)
- **The reviewer is read-only** (`--read-only` → `cursor-agent --mode ask`), so it
  never edits — it just reports findings for you to act on.

### Extending to a cross-tool team (optional)

The same orchestration works across *tools*, not just Cursor models. If you also
have OpenAI's [`codex-plugin-cc`](https://github.com/openai/codex-plugin-cc)
installed, you can make one team member Codex and another Cursor — e.g. Cursor
Composer implements while Codex reviews (or vice-versa). In a script you'd add a
second companion command; driven by Claude you'd mix `/cursor:rescue` with
`/codex:rescue` / `/codex:review`. The plugins are independent and run side by side.
