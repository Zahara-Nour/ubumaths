#!/bin/bash
# Note la durée d'une commande du Mac mini pour `pnpm durees` (scripts/durees/) :
# une ligne « date;phase;secondes » dans ~/.local/state/durees/local.csv.
#
#   noter.sh <phase> <début>      <début> = `date +%s` pris avant la commande
#
# Appelé par scripts/durees/chrono.mjs (tests), scripts/check-incremental.sh,
# .husky/pre-push et scripts/pr-merger/index.ts, seulement quand la commande a
# réussi et a tout joué : une exécution rouge ou partielle n'est pas une mesure.
#
# Ne note rien en CI, sur Vercel, ni depuis un test (vitest) : le journal est
# celui du poste, pas d'un runner ni d'un décor. `DUREES_ETAT` (le dossier du
# journal) passe outre : c'est ainsi que les tests écrivent dans un dossier jetable.
#
# Ne fait JAMAIS échouer l'appelant : sortie 0, aucun message, quoi qu'il arrive.
# Tests : scripts/__tests__/durees-noter.test.ts.
phase="${1:-}"
debut="${2:-}"

if [ -z "${DUREES_ETAT:-}" ]; then
	if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${VERCEL:-}" ] || [ -n "${VITEST:-}" ]; then
		exit 0
	fi
fi

# La phase devient une colonne du journal : ni « ; » ni espace.
case "$phase" in
	'' | *[!a-z0-9-]*) exit 0 ;;
esac
case "$debut" in
	'' | *[!0-9]*) exit 0 ;;
esac

dossier="${DUREES_ETAT:-$HOME/.local/state/durees}"
duree=$(($(date +%s) - debut))
[ "$duree" -ge 0 ] || exit 0
{
	mkdir -p "$dossier" &&
		echo "$(date -u +%Y-%m-%dT%H:%M:%SZ);$phase;$duree" >>"$dossier/local.csv"
} 2>/dev/null
exit 0
