# assets

- **`demo.tape`** — a [VHS](https://github.com/charmbracelet/vhs) script that
  records a terminal GIF of the plugin in action (setup → read-only rescue →
  review → status), driving the same companion the `/cursor:` commands use.

Generate the GIF (requires `vhs` and an authenticated `cursor-agent`):

```bash
vhs assets/demo.tape      # writes assets/demo.gif
```

The model calls are real, so the recording takes a couple of minutes and consumes
a small amount of Cursor credits. Tune the `Sleep` durations in `demo.tape` to match
your machine's latency.
