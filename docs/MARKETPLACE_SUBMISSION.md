# Submitting to the official Claude Code plugin marketplace

This guide prepares the submission of **cursor-plugin** to Anthropic's official
marketplace, [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official).
Until then, users install directly from this repo:

```text
/plugin marketplace add Armert-Labs/cursor-plugin
/plugin install cursor@cursor-plugin
```

## How submission works

The official marketplace is a single `.claude-plugin/marketplace.json` listing
plugins. Each entry references an external repo with a `git-subdir` source (the
plugin's `plugins/<name>` folder is pulled from a pinned tag/commit). To get
listed you open a PR to that repo adding one entry.

1. Fork `anthropics/claude-plugins-official`.
2. Add the entry below to the `plugins` array in `.claude-plugin/marketplace.json`
   (keep the array sorted/conventional to match the repo).
3. Open a PR following their CONTRIBUTING guidelines; maintainers review name,
   category, description, and that the plugin installs cleanly.

## Proposed entry

```json
{
  "name": "cursor",
  "description": "Use Cursor's agentic CLI (cursor-agent) from inside Claude Code: delegate coding tasks, rescue stuck work, and run read-only code reviews — choosing the model per call. Includes background jobs, resumable chats, an optional stop-time review gate, and multi-model team orchestration.",
  "author": {
    "name": "Armert Labs"
  },
  "category": "development",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/Armert-Labs/cursor-plugin.git",
    "path": "plugins/cursor",
    "ref": "v0.1.0",
    "sha": "899c2fe35f6fd6e3d924f5b0daf425621a2e5e8f"
  },
  "homepage": "https://github.com/Armert-Labs/cursor-plugin"
}
```

Notes:
- `ref`/`sha` pin the listing to the **v0.1.0** tag. Bump both on each release
  (`git rev-parse 'vX.Y.Z^{commit}'` gives the sha).
- `category` is a guess — match it to Anthropic's accepted category list during review.
- The entry `name` (`cursor`) is the install id (`cursor@claude-plugins-official`).
  If the maintainers prefer a more specific/namespaced name (e.g. `cursor-agent`),
  that's a one-line change here and in our `plugin.json`.

## Pre-submission checklist

- [x] Public repo with an OSI license (MIT) and a clear README
- [x] Valid `.claude-plugin/marketplace.json` and `plugins/cursor/.claude-plugin/plugin.json`
- [x] Commands, agent, skills, hooks all use `${CLAUDE_PLUGIN_ROOT}` (no absolute paths)
- [x] Tagged release (`v0.1.0`) + GitHub Release notes
- [x] CI green (syntax + JSON + hermetic tests) on Node 18/20/22
- [x] No runtime dependencies; nothing fetched at install time
- [ ] Re-test a clean install from the pinned tag before opening the PR
- [ ] Confirm the chosen `category` and `name` against the marketplace's current rules
