#!/usr/bin/env bash
# SessionStart hook: prints shared memory + the other dev's in-flight branches.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0
MEM=.claude/memory
DEV="${CLAUDE_DEV:-$(git config user.name)}"
DEV="${DEV:-unknown}"

echo "## MEMORY (dev: $DEV, branch: $(git branch --show-current))"
echo "### STATE.md"; cat "$MEM/STATE.md" 2>/dev/null
echo; echo "### LOG.md (last 15)"; tail -n 15 "$MEM/LOG.md" 2>/dev/null
echo; echo "### dev/$DEV.md"; cat "$MEM/dev/$DEV.md" 2>/dev/null || echo "(none yet — create it)"

echo; echo "### OTHER BRANCHES (files changed vs origin/main)"
timeout 10 git fetch -q --prune 2>/dev/null
found=0
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -e '^origin$' -e '^origin/main$' -e '^origin/HEAD$' -e "^origin/$DEV/"); do
  files=$(git diff --name-only origin/main...$b 2>/dev/null | head -n 20 | tr '\n' ' ')
  [ -n "$files" ] && { echo "- $b: $files"; found=1; }
done
[ $found = 0 ] && echo "(none)"
[ "$(git branch --show-current)" = main ] && echo && echo "WARNING: on main — create a branch/worktree before editing."
exit 0
