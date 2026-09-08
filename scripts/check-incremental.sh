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
#
# TWO GUARDS, because this script costs ~40s warm but ~10 min after an edit, and
# on this machine a wasted run is wasted wall-clock the user pays for:
#   1. A lock: a second instance refuses to start while one is running (two
#      concurrent svelte-check + tsc make an 8 GB machine unusable).
#   2. A redundancy guard: if nothing that can change the result has changed
#      since the last completed run, the previous result is REPLAYED instead of
#      recomputed. Re-running to "have another look" answers nothing.
# Both are bypassed with FORCE=1 (and FRESH=1 implies a real run).
set -uo pipefail

# ---------------------------------------------------------------------------
# Guard state. Kept out of .svelte-check/ so FRESH=1 (which wipes that cache)
# does not also destroy the lock we are holding.
# ---------------------------------------------------------------------------
state_dir=.svelte-kit/.check-incremental
mkdir -p "$state_dir"
lock="$state_dir/lock"
marker="$state_dir/last-run"
last_output="$state_dir/last-output"
last_status="$state_dir/last-status"

# --- Guard 1: one run at a time ---------------------------------------------
if [ -f "$lock" ]; then
	running_pid=$(cat "$lock" 2>/dev/null)
	if [ -n "${running_pid:-}" ] && kill -0 "$running_pid" 2>/dev/null; then
		since=$(ps -o etime= -p "$running_pid" 2>/dev/null | tr -d ' ')
		echo "⛔ Un check:incremental tourne déjà (PID $running_pid, depuis ${since:-?})."
		echo "   Deux typechecks en parallèle rendent la machine inutilisable — attends"
		echo "   sa fin. Pour tuer le précédent : kill $running_pid"
		exit 2
	fi
	# Stale lock: the previous run was killed (OOM, Ctrl-C) without its trap firing.
	rm -f "$lock"
fi
echo $$ >"$lock"
trap 'rm -f "$lock"' EXIT INT TERM

# --- Guard 2: don't run while the local Supabase stack is up -----------------
# Le 2026-09-09, un check a été tué après 15 minutes. Aucun fantôme : la pile
# Supabase locale (12 conteneurs, ~1,9 Go mesurés) était restée allumée depuis
# des tests d'intégration, et le check venait d'être poussé sur son chemin LENT
# (une édition sous src/routes force `svelte-kit sync`, qui invalide le cache :
# ~1,6 Go et 2x plus long, cf. plus bas). Sur 8 Go, la machine ne calculait
# plus, elle swappait.
#
# Refuser franchement vaut mieux que ramer : un check étranglé ne donne aucun
# verdict, coûte un quart d'heure, et se fait tuer — ce qui laisse en plus un
# cache à moitié écrit, donc le run suivant repart à froid.
if command -v docker >/dev/null 2>&1; then
	supa_containers=$(docker ps --quiet --filter label=com.supabase.cli.project=ubumaths 2>/dev/null | wc -l | tr -d ' ')
	if [ "${supa_containers:-0}" -gt 0 ] && [ "${ALLOW_DB:-0}" != "1" ]; then
		echo "⛔ La pile Supabase locale tourne ($supa_containers conteneurs, ~1,9 Go)."
		echo "   Sur cette machine (8 Go), elle étrangle le typecheck : mesuré 15 min"
		echo "   au lieu de ~40 s, puis tué sans verdict."
		echo
		echo "   → pnpm db:stop      puis relance le check"
		echo "   → ALLOW_DB=1 pnpm check:incremental   pour passer outre en connaissance de cause"
		rm -f "$lock"
		exit 2
	fi
fi

# --- Guard 2: refuse a run that cannot say anything new ----------------------
# Anything that can change the verdict: sources, the tsconfig this script uses,
# the svelte/vite config, and the dependency set.
shopt -s nullglob
guard_watch=(src tsconfig*.json svelte.config.* vite.config.* package.json)
shopt -u nullglob
if [ "${FORCE:-0}" != "1" ] && [ "${FRESH:-0}" != "1" ] &&
	[ -f "$marker" ] && [ -f "$last_output" ] && [ -f "$last_status" ] &&
	[ -z "$(find "${guard_watch[@]}" -type f -newer "$marker" 2>/dev/null | head -1)" ]; then
	cat "$last_output"
	echo ""
	echo "↑ Résultat REJOUÉ : rien n'a changé depuis le dernier check ($(date -r "$marker" '+%H:%M:%S'))."
	echo "  Relancer ne dirait rien de neuf. Pour forcer quand même : FORCE=1 pnpm check:incremental"
	exit "$(cat "$last_status")"
fi

# Timestamped BEFORE the run, so a file edited *during* the run still counts as
# newer than the marker and is not silently swallowed by guard 2.
touch "$state_dir/run-started"

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
	# Prévenir : ce sync invalide le cache, donc ce run sera ~2x plus long et ~2x
	# plus gourmand. Le dire évite de croire à un blocage.
	echo "ℹ️  Routes ou config modifiées → svelte-kit sync : cache invalidé,"
	echo "   ce passage sera plus lent (~2x) et plus gourmand (~1,6 Go)."
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
	report=$(
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
	)
	status=1
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

	report=$(
		echo "✓ ${files:-?} FILES 0 ERRORS ${warnings:-?} WARNINGS"
		if [ "$extern_errors" -gt 0 ]; then
			echo "  ($extern_errors extern/ .svelte error(s) ignored — absent in CI, see scripts/check-incremental.sh header)"
		fi
	)
	status=0
fi

# Store the verdict so guard 2 can replay it instead of recomputing it, and date
# the marker from the START of the run (see `run-started` above).
printf '%s\n' "$report"
printf '%s\n' "$report" >"$last_output"
echo "$status" >"$last_status"
mv -f "$state_dir/run-started" "$marker"
exit "$status"
