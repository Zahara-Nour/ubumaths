#!/bin/bash
# Prettier check with the SAME visibility as CI.
#
# WHY NOT `prettier --check .`:
#   That walks the working TREE, so it also checks files git does not track.
#   CI (.github/workflows/quality.yml) runs the same command on a fresh clone,
#   where those files do not exist. The local check was therefore STRICTER than
#   the thing it exists to predict: an unformatted, uncommitted scratch file —
#   another session's docs/wip/ note, a scratch script — blocked a push it had
#   nothing to do with, and the suggested fix (`pnpm format:all`) would have
#   reformatted someone else's work in progress.
#   The learned workaround was `git push --no-verify`, which ALSO skips the
#   lint:fast gate. A guard people learn to bypass protects less than no guard.
#
# WHY THE SYMLINK FILTER:
#   `git ls-files` lists tracked symlinks (tools/shantell-math/venv/bin/python*),
#   and Prettier ERRORS on an explicitly named symlink instead of skipping it —
#   it only skips them silently when expanding a directory itself. Without this
#   filter the check exits 1 on a perfectly clean tree.
#
# --ignore-unknown: same reason, for extensions Prettier has no parser for.
#   Explicit paths make it fail; directory walking makes it skip.
set -uo pipefail

git ls-files -z |
	while IFS= read -r -d '' file; do
		[ -L "$file" ] || printf '%s\0' "$file"
	done |
	xargs -0 npx prettier --check --cache --ignore-unknown
