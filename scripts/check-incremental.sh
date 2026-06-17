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
# --incremental is load-bearing, not a nicety: without it svelte-check re-transpiles
# every .svelte file each run — measured ~6x more CPU, and it thrashes swap and
# CRASHES on this 8 GB machine (366s then SIGABRT vs ~37s with the cache). The
# disk cache can go stale after DELETING/renaming files and emit a phantom "ghost"
# error. That is the SAME trigger as the conditional-sync blind spot below, so one
# switch cures both: `FRESH=1 pnpm check:incremental` clears the cache AND forces a
# sync. Reach for it after deleting/renaming files, or if an error here disagrees
# with `pnpm check`.
set -uo pipefail

# FRESH=1 → drop svelte-check's transpile cache (cures ghosts) and force a sync.
if [ "${FRESH:-0}" = "1" ]; then
	rm -rf .svelte-kit/.svelte-check
	need_sync=1
fi

# `svelte-kit sync` regenerates .svelte-kit/* with fresh mtimes, which busts
# svelte-check's incremental cache → measured ~2x slower and ~2x memory (72s/1.6GB
# vs 37s/0.8GB). So only sync when routes / svelte config / env actually changed
# since the last sync, detected against a file the sync ALWAYS rewrites
# (.svelte-kit/tsconfig.json). Editing lib/component code needs no sync → fast path.
# Blind spot: route DELETIONS/renames leave no "newer" file → use FRESH=1 then.
sentinel=.svelte-kit/tsconfig.json
shopt -s nullglob
watch=(src/routes svelte.config.* .env .env.*)
shopt -u nullglob
if [ "${need_sync:-0}" = "1" ] || [ ! -f "$sentinel" ] || \
	[ -n "$(find "${watch[@]}" -type f -newer "$sentinel" 2>/dev/null | head -1)" ]; then
	npx svelte-kit sync >/dev/null 2>&1
fi

# Heap cap = 4096 MiB, not 8192. Measured peak RSS for the full check is ~1.5 GB
# (1697 source files; tests are excluded via tsconfig.check.json), so 4 GiB is
# ~2.7x headroom. On an 8 GB machine an 8192 cap is dangerous: it lets V8 grow
# the heap toward 8 GB before GC kicks in hard, so it can grab all RAM and thrash
# swap. 4096 guarantees ~4 GB stays free for the OS while keeping ample headroom
# over the real working set. If a future, much larger codebase OOMs here, bump it
# (and re-measure — don't cargo-cult the number back up).
output=$(NODE_OPTIONS='--max-old-space-size=4096' npx svelte-check \
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
	# svelte-check's COMPLETED line counts extern/ .svelte errors that CI never
	# sees (the tsconfig `exclude` only filters .ts; svelte-check checks every
	# .svelte regardless, and `--ignore` only works with `--no-tsconfig`). So we
	# report the REAL, CI-equivalent count (0 here — we are in the no-real-errors
	# branch) and disclose how many extern errors were ignored, instead of echoing
	# svelte-check's misleading raw count.
	completed=$(echo "$output" | grep "COMPLETED" | tail -1)
	files=$(echo "$completed" | sed -E 's/.*COMPLETED ([0-9]+) FILES .*/\1/')
	warnings=$(echo "$completed" | sed -E 's/.* ([0-9]+) WARNINGS.*/\1/')
	extern_errors=$(echo "$output" | grep " ERROR " | grep -c "extern/")

	echo "✓ ${files:-?} FILES 0 ERRORS ${warnings:-?} WARNINGS"
	if [ "$extern_errors" -gt 0 ]; then
		echo "  ($extern_errors extern/ .svelte error(s) ignored — absent in CI, see scripts/check-incremental.sh header)"
	fi
	exit 0
fi
