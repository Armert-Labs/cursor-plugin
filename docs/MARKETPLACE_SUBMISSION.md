# Submitting to the official Claude Code plugin directory

> **The official directory does NOT accept pull requests.**
> [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official)
> runs a `close-external-prs.yml` workflow that auto-closes external PRs. Third-party
> plugins are submitted through a **web form**, then reviewed by Anthropic.

**Submission form:** <https://clau.de/plugin-directory-submission>

Until/unless it is accepted there, users install directly from this repo:

```text
/plugin marketplace add Armert-Labs/cursor-plugin
/plugin install cursor@cursor-plugin
```

---

## Submission packet (paste into the form)

| Field | Value |
| --- | --- |
| Plugin name | `cursor` |
| Repository | `https://github.com/Armert-Labs/cursor-plugin` |
| Plugin path in repo | `plugins/cursor` |
| Pinned ref / commit | `v0.1.1` / `d6359fc0247cdec22908d8b600a42ad0fb1143ae` |
| Category | `development` (valid per the directory's current category list) |
| Author | Armert Labs |
| Homepage | `https://github.com/Armert-Labs/cursor-plugin` |
| License | MIT |

**Description (matches the plugin.json, discloses behavior):**

> Use Cursor's CLI (cursor-agent) from Claude Code to delegate coding tasks and
> review code, choosing the model per call. Shells out to your locally installed,
> authenticated cursor-agent (no data is sent to the plugin author). Registers
> session-lifecycle hooks and an optional, off-by-default stop-time review gate.

**Equivalent marketplace entry** (the directory uses a `git-subdir` source):

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
    "ref": "v0.1.1",
    "sha": "d6359fc0247cdec22908d8b600a42ad0fb1143ae"
  },
  "homepage": "https://github.com/Armert-Labs/cursor-plugin"
}
```

---

## Security & behavior disclosure

The directory runs an automated safety/behavior review (see its
`.github/policy/schema.json`). Pre-answers for this plugin:

| Check | Answer |
| --- | --- |
| `may_make_external_network_calls` | **Yes** — only by invoking your locally installed, **authenticated `cursor-agent`**, which talks to **your own Cursor account**. The plugin makes no calls to any Armert Labs / author endpoint. |
| `may_download_additional_software` | **No.** Zero runtime dependencies; nothing is fetched or installed at runtime. `cursor-agent` must already be installed by the user. |
| `has_undisclosed_telemetry` | **No.** No analytics, no author-side egress. The only network egress is the user's own `cursor-agent`, which is the plugin's stated purpose and is disclosed in the description and README. |
| Registered hooks | `SessionStart` and `SessionEnd` (lifecycle: export/clean up a session id and local job records — no network), and `Stop` (the **off-by-default** review gate; when a user enables it via `/cursor:setup --enable-review-gate`, it runs a read-only `cursor-agent` review of the previous turn). |
| `has_broad_scope_hooks` | **No.** The plugin registers **no** `UserPromptSubmit`, `PreToolUse`, or `PostToolUse` hooks. The `Stop` gate is opt-in and reads only the previous turn + repo state to review it. |
| `description_matches_behavior` | **Yes.** The plugin.json description explicitly discloses the hooks, the optional stop-time gate, and that it shells out to `cursor-agent`. |

Notes for reviewers:
- Write-capable `/cursor:rescue` edits files in the user's working tree by design
  (this is the plugin's purpose, stated in the README); read-only operations use
  `cursor-agent --mode ask` and never edit.
- The directory's internal `validate-licenses` step references Apache-2.0 for
  plugins vendored *inside* its repo; this plugin is external (`git-subdir`) and
  ships its own permissive **MIT** LICENSE. Relicensing to Apache-2.0 is trivial
  if the reviewers require it.

## Pre-submission checklist

- [x] Public repo, OSI license (MIT), thorough README with install + command reference
- [x] Valid `plugins/cursor/.claude-plugin/plugin.json`; all paths use `${CLAUDE_PLUGIN_ROOT}`
- [x] Tagged release `v0.1.1` with a published GitHub Release
- [x] CI green (syntax + JSON + hermetic tests) on Node 18/20/22
- [x] No runtime dependencies; nothing downloaded at install/runtime
- [x] Behavior (hooks, network, edits) disclosed in the plugin.json description
- [ ] Submit the packet above at https://clau.de/plugin-directory-submission (manual; requires your account)
- [ ] If asked, confirm `category`/`name` and relicense to Apache-2.0
