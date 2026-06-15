# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue.

- Preferred: GitHub **private vulnerability reporting** —
  [open a report](https://github.com/Armert-Labs/cursor-plugin/security/advisories/new)
  (repo → **Security** → **Report a vulnerability**).
- Alternatively, email **mertcan@armert.com.tr** with the details.

Please include reproduction steps, affected version, and impact. We aim to
acknowledge reports within a few days and to coordinate a fix and disclosure.

## Scope & trust model

This plugin is a thin wrapper that shells out to your **locally installed,
authenticated `cursor-agent`**. Useful context for triage:

- The plugin spawns `cursor-agent` **without a shell** and passes the prompt as a
  literal argument (no shell interpolation of prompt text).
- `/cursor:rescue` is **write-capable by default** — it can edit files in your
  working tree. Read-only operations use `cursor-agent --mode ask` and never edit.
- The only outbound network activity is `cursor-agent` talking to **your own
  Cursor account**. The plugin sends no data to the author and ships no telemetry.
- Job state and logs are written under your home directory
  (`~/.claude/cursor-companion/...`) or the plugin's Claude Code data directory.

**Out of scope:** vulnerabilities in `cursor-agent`, the Cursor service, Node.js,
or Claude Code themselves — please report those to their respective vendors.
