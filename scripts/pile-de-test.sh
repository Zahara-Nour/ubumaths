#!/bin/bash
# Lance une commande sur la pile Supabase de TEST, sous son verrou (`supabase-test`).
#
#   pile-de-test.sh lancer <commande…>   prépare la pile, puis lance la commande dessus
#   pile-de-test.sh stop | reset
#
# Pourquoi une pile à part : les tests d'intégration supprimaient le prof de dev et les classes
# du seed-riche, et les données de dev les faisaient échouer (docs/archive/wip/base-locale-progress.md
# § 3.3 et § 12). La base de dev (verrou `supabase`) n'est plus concernée : les tests ne bloquent
# plus `pnpm dev` ni les `db:*`, et inversement. Deux suites en même temps restent interdites
# (une seule pile de test pour tous les worktrees) : exit 2 = attendre, ne pas contourner.
#
# En CI, la pile est celle du workflow (`supabase start`, ports par défaut) : la commande est
# lancée telle quelle, sous le verrou habituel. On reconnaît la CI à `GITHUB_ACTIONS`, pas à `CI` :
# un shell ou un outil qui exporterait `CI` sur le poste enverrait la suite sur la base de dev.
set -euo pipefail
ici="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
action="${1:?usage : pile-de-test.sh lancer <commande…> | stop | reset}"
shift

if [ -n "${GITHUB_ACTIONS:-}" ]; then
	[ "$action" = lancer ] || { echo "⛔ En CI, pas de pile de test à part." >&2; exit 1; }
	exec bash "$ici/with-db-lock.sh" "$@"
fi

case "$action" in
	lancer) set -- lancer -- "$@" ;;
	stop | reset) set -- "$action" ;;
	*) echo "⛔ usage : pile-de-test.sh lancer <commande…> | stop | reset" >&2; exit 1 ;;
esac
exec python3 "$ici/lib/lock.py" supabase-test "Une commande sur la pile Supabase de test" -- \
	"$ici/../node_modules/.bin/tsx" "$ici/pile-de-test/index.ts" "$@"
