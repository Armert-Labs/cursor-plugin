---
description: Check whether the local Cursor CLI is ready and optionally toggle the stop-time review gate
argument-hint: '[--enable-review-gate|--disable-review-gate]'
allowed-tools: Bash(node:*), Bash(cursor-agent:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cursor-companion.mjs" setup --json $ARGUMENTS
```

Output rules:
- Present the final setup output to the user.
- If the result says `cursorAgent.available` is false, tell the user to install the Cursor CLI manually, for example `curl https://cursor.com/install -fsS | bash` (macOS/Linux), then rerun `/cursor:setup`. Do not auto-run a network installer for them.
- If `cursorAgent.available` is true but `auth.loggedIn` is false, preserve the guidance to run `!cursor-agent login`, or to set `CURSOR_API_KEY` for headless use.
- Do not attempt to fix anything else.
