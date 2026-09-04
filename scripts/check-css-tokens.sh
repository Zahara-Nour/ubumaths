#!/usr/bin/env bash
#
# Guard against `hsl(var(--token))` in stylesheets.
#
# The project runs Tailwind 4: src/app.css defines complete colours as
# `--color-*` tokens (e.g. `--color-border: light-dark(#e0e0e0, #3d3d3a)`).
# The bare `--border`, `--foreground`, … tokens the `hsl(var(--x))` idiom
# expects do not exist anywhere. The declaration is therefore invalid and
# silently dropped, leaving the property at its inherited value.
#
# This is not theoretical: the `y = x` line of the sequence staircase was
# stroked with `hsl(var(--muted-foreground))` and rendered fully invisible,
# because an SVG stroke has no sane fallback. Borders and colours degrade more
# quietly — they fall back to `currentColor` — which is why the idiom spread
# unnoticed across the codebase.
#
#   wrong:  border: 1px solid hsl(var(--border));
#   right:  border: 1px solid var(--color-border);
#
# For a translucent colour there is no direct equivalent, since `--color-*`
# already holds a complete colour:
#
#   wrong:  background: hsl(var(--primary) / 0.1);
#   right:  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
#
# Full reference: docs/ref/css-color-tokens.md
#
# A baseline file records the debt that predates this guard, so it can land
# without turning CI red. The guard fails when a file exceeds its baseline, or
# when a file with no baseline gains an occurrence. Run with --update after
# fixing a file to ratchet the baseline down.
#
# Usage:
#   scripts/check-css-tokens.sh            # check (used by CI)
#   scripts/check-css-tokens.sh --update   # rewrite the baseline

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE="$ROOT/scripts/css-tokens-baseline.txt"
PATTERN='hsl(var(--'

# One "path count" line per offending file, sorted, paths relative to the repo.
scan() {
	cd "$ROOT"
	grep -rc --include='*.svelte' --include='*.css' -F "$PATTERN" src 2>/dev/null |
		grep -v ':0$' |
		awk -F: '{print $1 " " $2}' |
		sort
}

current="$(scan || true)"

if [ "${1:-}" = "--update" ]; then
	printf '%s\n' "$current" >"$BASELINE"
	total=$(printf '%s' "$current" | awk '{s+=$2} END {print s+0}')
	files=$(printf '%s' "$current" | grep -c . || true)
	echo "Baseline mise à jour : $total occurrences dans $files fichiers."
	exit 0
fi

if [ ! -f "$BASELINE" ]; then
	echo "::error::Baseline absente ($BASELINE). Lancer scripts/check-css-tokens.sh --update."
	exit 1
fi

status=0

# A file over its baseline — or absent from it — is a regression.
while read -r file count; do
	[ -z "$file" ] && continue
	allowed=$(awk -v f="$file" '$1 == f {print $2}' "$BASELINE")
	allowed=${allowed:-0}

	if [ "$count" -gt "$allowed" ]; then
		status=1
		if [ "$allowed" -eq 0 ]; then
			echo "::error file=$file::$count occurrence(s) de 'hsl(var(--…))' — utiliser var(--color-*) (voir docs/ref/css-color-tokens.md)"
		else
			echo "::error file=$file::$count occurrence(s) de 'hsl(var(--…))' pour une référence de $allowed — utiliser var(--color-*)"
		fi
	fi
done <<<"$current"

# A file below its baseline is progress: ask for the baseline to be tightened
# so the debt can only ever shrink.
while read -r file allowed; do
	[ -z "$file" ] && continue
	count=$(awk -v f="$file" '$1 == f {print $2}' <<<"$current")
	count=${count:-0}

	if [ "$count" -lt "$allowed" ]; then
		status=1
		echo "::error file=$file::$count occurrence(s) au lieu de $allowed : dette réduite, lancer scripts/check-css-tokens.sh --update et committer la baseline."
	fi
done <"$BASELINE"

total=$(printf '%s' "$current" | awk '{s+=$2} END {print s+0}')

if [ "$status" -eq 0 ]; then
	echo "::notice::Aucune régression 'hsl(var(--…))' — dette résiduelle : $total occurrence(s)."
fi

exit "$status"
