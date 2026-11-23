#!/bin/bash
# Lance une commande et note sa durée pour `pnpm durees` (scripts/durees/noter.sh).
#
#   chrono.sh <phase> <commande…> -- [arguments de l'appelant]
#
# Dans package.json, la ligne finit par « -- » : ce que l'appelant ajoute
# (`pnpm test:server <fichier>`) arrive après. Avec le moindre argument, la
# commande n'a pas tout joué (un fichier, un filtre) ou pas comme d'habitude (une
# option) : elle est lancée telle quelle, sans être notée. Seule la commande
# entière et verte est une mesure, comme pour la CI.
#
# En CI et sur Vercel : la commande, rien d'autre.
# Le code de sortie est toujours celui de la commande.
# Tests : scripts/__tests__/durees-noter.test.ts.
set -uo pipefail
phase="$1"
shift
commande=()
while [ $# -gt 0 ] && [ "$1" != "--" ]; do
	commande+=("$1")
	shift
done
[ "${1:-}" = "--" ] && shift

if [ $# -gt 0 ] || [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${VERCEL:-}" ]; then
	exec "${commande[@]}" "$@"
fi

debut=$(date +%s)
"${commande[@]}"
code=$?
if [ "$code" -eq 0 ]; then
	bash "$(dirname "${BASH_SOURCE[0]}")/noter.sh" "$phase" "$debut"
fi
exit "$code"
