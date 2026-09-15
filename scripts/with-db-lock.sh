#!/bin/bash
# Exécute une commande sous le verrou de la base Supabase LOCALE, verrou partagé
# par tous les worktrees du dépôt.
#
# Pourquoi : il n'y a qu'UNE pile Supabase locale pour tout le dépôt
# (project_id "ubumaths", ports 54321-54329 figés dans supabase/config.toml).
# Un worktree ne duplique pas Docker, et deux piles sur 8 Go ne tiennent pas.
#
# Ce que ça évite précisément : un `db:reset` lancé pendant une suite
# d'intégration ne rend PAS d'erreur, il rend des fichiers en échec sans aucun
# test en échec — signature indiscernable d'un GoTrue dégradé. On passe alors
# l'heure suivante à débugger son propre code. Le verrou change une corruption
# silencieuse en refus explicite, qui nomme le worktree fautif.
set -uo pipefail

# Charger le verrou, et ÉCHOUER si on ne peut pas : un `source` raté laisse
# `acquire_lock: command not found` puis exécute la commande SANS verrou, en
# sortant 0. Silence total sur la disparition de la seule protection.
lock_lib="$(dirname "${BASH_SOURCE[0]}")/lib/lock.sh"
# shellcheck source=scripts/lib/lock.sh
source "$lock_lib" || {
	echo "⛔ $lock_lib introuvable : on n'exécute rien sans verrou." >&2
	exit 1
}
type -t acquire_lock >/dev/null || {
	echo "⛔ acquire_lock absent de $lock_lib : on n'exécute rien sans verrou." >&2
	exit 1
}
acquire_lock supabase "Une commande sur la base Supabase locale"

"$@"
exit $?
