# assets

- **`demo.svg`** — the terminal demo shown in the main README. A lightweight,
  static SVG (renders inline on GitHub) built from a real `/cursor:` session.
- **`demo.tape`** — a [VHS](https://github.com/charmbracelet/vhs) script that
  records an animated terminal **GIF** of the plugin in action (setup → read-only
  rescue → review → status), driving the same companion the `/cursor:` commands use.

Generate an animated GIF (requires `vhs` + an authenticated `cursor-agent`):

```bash
vhs assets/demo.tape      # writes assets/demo.gif
```

The model calls are real, so the recording takes a couple of minutes and consumes
a small amount of Cursor credits. Tune the `Sleep` durations in `demo.tape` to match
your machine's latency, then swap the README image to `demo.gif` if you prefer the
animation.
