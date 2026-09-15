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
#
# `exec` plutôt qu'un simple appel : lock.py remplace ce processus par la
# commande, en gardant ouvert le descripteur verrouillé. Et si python3 manquait,
# l'exec échouerait — la commande ne tournerait PAS. Jamais de tour sans verrou.
exec python3 "$(dirname "${BASH_SOURCE[0]}")/lib/lock.py" \
	supabase "Une commande sur la base Supabase locale" -- "$@"
