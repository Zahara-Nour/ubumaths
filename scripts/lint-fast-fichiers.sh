#!/bin/bash

# Les fichiers TS/Svelte que `lint-fast.sh` relit, un par ligne.
#
# Trois usages :
#   --push   le hook pre-push : seulement les fichiers des commits qui partent
#            (`origin/main...HEAD`), JAMAIS un fichier non suivi. Le dépôt
#            principal est partagé par toutes les sessions : le brouillon `.ts`
#            non suivi de l'une bloquait le push de doc de toutes les autres
#            (2026-10-18). Un non suivi ne part pas : la CI ne le verra pas.
#   --staged l'index seul.
#   [ref]    à la main (défaut : origin/main) : ce qui diffère de ref, plus les
#            fichiers non suivis — un fichier tout neuf passerait sinon entre
#            les mailles avant son premier commit.
#
# Testé par scripts/__tests__/lint-fast-fichiers.test.ts.

set -e

if [ "$1" = "--staged" ]; then
	FILES=$(git diff --cached --name-only --diff-filter=ACMR)
elif [ "$1" = "--push" ]; then
	# Trois points : depuis l'ancêtre commun, donc ce que la branche apporte,
	# pas ce qu'origin/main a reçu d'autres sessions entre-temps.
	FILES=$(git diff --name-only --diff-filter=ACMR origin/main...HEAD)
else
	SINCE="${1:-origin/main}"
	FILES=$(
		git diff --name-only --diff-filter=ACMR "$SINCE"
		git ls-files --others --exclude-standard
	)
fi

# Un fichier supprimé depuis reste dans le diff : eslint s'arrête net dessus.
# Le `|| true` est indispensable : sous `set -e`, une boucle dont la dernière
# itération est fausse (ligne vide) ferait sortir le script en silence.
echo "$FILES" | grep -E '\.(ts|svelte)$' | sort -u | while read -r f; do
	if [ -n "$f" ] && [ -f "$f" ]; then echo "$f"; fi
done || true
