#!/bin/bash
# Fast incremental type-check that matches CI.
#
# Scope = CI: uses tsconfig.check.json (same as `pnpm check`), which excludes
# tests and the service-worker, and excludes extern/ *.ts files.
#
# IMPORTANT — extern/ filtering is NOT a hack:
#   svelte-check discovers .svelte files across the whole workspace and checks
#   them REGARDLESS of the tsconfig `exclude` (the exclude only affects .ts).
#   extern/ exists locally but is ABSENT in CI, so CI never sees extern's
#   .svelte files. We `grep -v extern/` to reproduce CI locally. Without it,
#   local would report extern errors that CI never can.
#   (The old `grep -v slides/demo` was dropped: that dir was deleted.)
#
# --incremental is kept on purpose — speed is the goal (~20s cached). The cache
# can go stale after DELETING/renaming files and emit a phantom error; if a
# reported error looks like a ghost (deleted file, or `pnpm check` disagrees),
# clear it once:  rm -rf .svelte-kit/.svelte-check && pnpm check:incremental
set -uo pipefail

# Match CI: regenerate $env/static + generated types before checking.
npx svelte-kit sync >/dev/null 2>&1

output=$(NODE_OPTIONS='--max-old-space-size=8192' npx svelte-check \
	--tsconfig ./tsconfig.check.json --threshold error --incremental --output machine 2>&1)

# Filter extern/ (present locally, absent in CI — see header).
errors=$(echo "$output" | grep " ERROR " | grep -v "extern/")

if [ -n "$errors" ]; then
	echo "TypeScript/Svelte errors found:"
	echo "$errors" | while IFS= read -r line; do
		# Extract file:line:col and message from machine output
		file=$(echo "$line" | cut -d' ' -f3 | sed 's/"//g')
		pos=$(echo "$line" | cut -d' ' -f4 | sed 's/"//g')
		msg=$(echo "$line" | cut -d' ' -f5- | sed 's/"//g')
		echo "  $file:$pos $msg"
	done
	echo ""
	echo "(If an error looks like a ghost — deleted file, or 'pnpm check' disagrees —"
	echo " clear the stale cache: rm -rf .svelte-kit/.svelte-check && pnpm check:incremental)"
	exit 1
else
	# Show summary line
	echo "$output" | grep "COMPLETED" | sed 's/^[0-9]* //' | sed 's/COMPLETED /✓ /'
	exit 0
fi
