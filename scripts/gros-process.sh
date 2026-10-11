#!/bin/bash
# Un seul gros process à la fois (CLAUDE.md) : `pnpm check`, `pnpm build` et
# `pnpm lint` (4 à 6 Go chacun) passent sous le MÊME verrou noyau que
# `check:incremental` (scripts/lib/lock.py, nom « typecheck »), partagé par
# tous les worktrees. Un second lanceur sort en exit 2 en nommant le détenteur :
# ça s'attend, ça ne se contourne pas.
#
# Pas de verrou en CI (variable CI) ni sur Vercel (VERCEL) : une machine par
# job, et python3 n'y est pas garanti.
#
# Usage : gros-process.sh "<libellé>" <commande…>
# Tests : scripts/__tests__/gros-process.test.ts.
set -euo pipefail
libelle="$1"
shift
if [ -n "${CI:-}" ] || [ -n "${VERCEL:-}" ]; then
	exec "$@"
fi
exec python3 "$(dirname "${BASH_SOURCE[0]}")/lib/lock.py" typecheck "$libelle" -- "$@"
