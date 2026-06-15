# assets

- **`demo.gif`** — the animated terminal demo shown in the main README. Rendered
  with [VHS](https://github.com/charmbracelet/vhs) from a **real** `/cursor:` review
  (the output is genuine, not mocked).
- **`demo.svg`** — a tiny static fallback of the same idea (handy where GIFs don't
  animate).
- **`demo.tape`** — a VHS script you can adapt to record your own GIF.

## Regenerate the GIF

Requires `vhs` (`brew install vhs`) + an authenticated `cursor-agent`:

```bash
vhs assets/demo.tape      # writes assets/demo.gif
```

The committed `demo.gif` was produced by seeding one real review into a scratch
repo and then recording the fast `cursor-plugin setup` / `result` reads, so the
clip stays short while showing real output. Model calls cost a small amount of
Cursor credits; tune the `Sleep`/`Set` directives in `demo.tape` for your machine.
