#!/bin/bash
# Avant `pnpm dev` : la base locale reçoit les migrations déjà mergées qui lui manquent.
#
# Personne ne pensait à mettre la base locale à jour : le 2026-11-21 elle avait 96 migrations
# de retard, et 218 fichiers de tests d'intégration échouaient pour cette seule raison
# (docs/archive/wip/base-locale-progress.md). Ce script la met à jour sans qu'on y pense.
#
# Il ne bloque JAMAIS le serveur de dev : sortie 0 dans tous les cas.
# - en CI : rien (pas de serveur de dev, pas de base locale de dev) ;
# - verrou Supabase tenu (reset, seed en cours) : on reporte, sans attendre ;
# - base arrêtée, git muet, migration en échec : un avertissement, c'est `db:a-jour --auto`
#   qui le dit.
# Seules les migrations présentes sur origin/main sont jouées : celle d'une branche en cours
# (peut-être destructive) demande un `pnpm db:a-jour` explicite.
set -uo pipefail

[ -n "${CI:-}" ] && exit 0
ici="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if python3 "$ici/lib/lock.py" --tenu supabase; then
	echo "ℹ️  Base locale occupée (reset ou seed en cours) : mise à jour reportée au prochain \`pnpm dev\`."
	exit 0
fi
bash "$ici/with-db-lock.sh" pnpm exec tsx "$ici/db-a-jour/index.ts" --auto || true
exit 0
