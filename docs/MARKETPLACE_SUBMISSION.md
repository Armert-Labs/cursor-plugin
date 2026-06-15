# Submitting to the Claude Code plugin marketplace

This is the verified process from the official docs
([Submit your plugin](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace)).

## Two marketplaces

- **`claude-plugins-official`** — curated by Anthropic at its discretion.
  **No application process**, and the submission form does **not** add plugins here.
- **`claude-community`** ([`anthropics/claude-plugins-community`](https://github.com/anthropics/claude-plugins-community)) —
  the public community marketplace where third-party submissions land **after review**.
  This is the target for a submission. Users then install with:
  ```text
  /plugin marketplace add anthropics/claude-plugins-community
  /plugin install cursor@claude-community
  ```

Until/unless it's approved there, anyone can install directly from this repo:

```text
/plugin marketplace add Armert-Labs/cursor-plugin
/plugin install cursor@cursor-plugin
```

## How to submit (requires sign-in — must be done by the author)

Submission is through an **in-app form** behind your Anthropic account, so it
can't be automated on your behalf — pick the form that matches your account:

- **Console (individual authors):** <https://platform.claude.com/plugins/submit>
- **claude.ai (Team/Enterprise orgs):** <https://claude.ai/admin-settings/directory/submissions/plugins/new>
  — requires a Team/Enterprise org with directory-management access (org Owners have it).

After approval, the plugin is pinned to a commit SHA in the
`claude-plugins-community` catalog; CI bumps the pin as you push new commits, and
the public catalog syncs nightly (so there's a delay before it appears).

## Pre-submission status (done)

- [x] `claude plugin validate plugins/cursor --strict` → **passed**
- [x] `claude plugin validate . --strict` (marketplace manifest) → **passed**
- [x] Public repo, MIT license, thorough README + command reference
- [x] Tagged release `v0.1.2` with a published GitHub Release; CI green on Node 18/20/22
- [x] Clean install from the pinned tag verified (fresh clone: `setup` ready, tests green)
- [x] No runtime dependencies; nothing downloaded at install/runtime
- [x] Behavior (hooks, network, edits) disclosed in the plugin.json description

> The review pipeline runs `claude plugin validate` plus automated safety
> screening. The security/behavior answers below pre-empt that screening.

## Submission packet (what the form asks for)

| Field | Value |
| --- | --- |
| Plugin name | `cursor` |
| Repository | `https://github.com/Armert-Labs/cursor-plugin` |
| Plugin path in repo | `plugins/cursor` |
| Latest release / commit | `v0.1.2` / `f802d518c4bdbcd52afe5da8bc2b8248d0c46b09` |
| Category | `development` |
| Author | Armert Labs |
| Homepage | `https://github.com/Armert-Labs/cursor-plugin` |
| License | MIT |

**Description (matches plugin.json, discloses behavior):**

> Use Cursor's CLI (cursor-agent) from Claude Code to delegate coding tasks and
> review code, choosing the model per call. Shells out to your locally installed,
> authenticated cursor-agent (no data is sent to the plugin author). Registers
> session-lifecycle hooks and an optional, off-by-default stop-time review gate.

Equivalent catalog entry (the community catalog uses a `git-subdir` source and
auto-bumps the `sha`):

```json
{
  "name": "cursor",
  "description": "Use Cursor's CLI (cursor-agent) from Claude Code to delegate coding tasks and review code, choosing the model per call. Shells out to your locally installed, authenticated cursor-agent (no data is sent to the plugin author). Registers session-lifecycle hooks and an optional, off-by-default stop-time review gate.",
  "author": { "name": "Armert Labs" },
  "category": "development",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/Armert-Labs/cursor-plugin.git",
    "path": "plugins/cursor",
    "ref": "v0.1.2",
    "sha": "f802d518c4bdbcd52afe5da8bc2b8248d0c46b09"
  },
  "homepage": "https://github.com/Armert-Labs/cursor-plugin"
}
```

## Security & behavior disclosure (for the safety screening)

| Question | Answer |
| --- | --- |
| Makes external network calls? | **Yes** — only by invoking your locally installed, **authenticated `cursor-agent`**, which talks to **your own Cursor account**. No calls to any author endpoint. |
| Downloads additional software? | **No.** Zero runtime dependencies; `cursor-agent` must already be installed by the user. |
| Undisclosed telemetry? | **No.** No analytics, no author-side egress; the only egress is the user's own `cursor-agent`, which is the plugin's stated purpose. |
| Registered hooks | `SessionStart` / `SessionEnd` (lifecycle: session id + local job cleanup, no network) and `Stop` (the **off-by-default** review gate; when enabled it runs a read-only `cursor-agent` review of the previous turn). |
| Broad-scope hooks? | **No** `UserPromptSubmit` / `PreToolUse` / `PostToolUse` hooks. The `Stop` gate is opt-in and only reads the previous turn + repo state. |
| Description matches behavior? | **Yes** — the plugin.json description discloses the hooks, the optional gate, and the `cursor-agent` shell-out. |

Note: write-capable `/cursor:rescue` edits files in the working tree by design
(stated in the README); read-only operations use `cursor-agent --mode ask`.
