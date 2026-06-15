# VHS tape — generates assets/demo.gif
# Requires https://github.com/charmbracelet/vhs  (brew install vhs)
# and an authenticated cursor-agent on PATH.
#
# Run from the repo root:   vhs assets/demo.tape
#
# It spins up a throwaway git repo in /tmp and drives the plugin's companion
# (the same code the /cursor: slash commands call) so the GIF shows real output.

Output assets/demo.gif

Set Shell bash
Set FontSize 17
Set Width 1280
Set Height 760
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 35ms

Hide
Type "export C=$PWD/plugins/cursor/scripts/cursor-companion.mjs" Enter
Type "rm -rf /tmp/cursor-demo && mkdir -p /tmp/cursor-demo && cd /tmp/cursor-demo" Enter
Type "git init -q && git config user.email d@d.co && git config user.name demo" Enter
Type "printf 'export const add=(a,b)=>a+b\n' > math.js && git add -A && git commit -qm init" Enter
Type "printf 'export const add=(a,b)=>a+b\nexport const div=(a,b)=>a/b\n' > math.js" Enter
Show

Type "# 1) Check the toolchain" Enter
Sleep 800ms
Type "node $C setup" Enter
Sleep 3s

Type "# 2) Ask Cursor a read-only question (composer-2.5, fast)" Enter
Sleep 800ms
Type 'node $C task --read-only --model spark "What does div add, and what is the risk?"' Enter
Sleep 30s

Type "# 3) Structured, read-only code review of the working tree" Enter
Sleep 800ms
Type "node $C review --scope working-tree --model spark" Enter
Sleep 35s

Type "# 4) See the jobs this session ran" Enter
Sleep 800ms
Type "node $C status" Enter
Sleep 4s
