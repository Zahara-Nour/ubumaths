#!/bin/bash

# Reproduit en local les erreurs du job "Lint" de la CI, sans son coût.
#
# Le job CI est type-aware (`projectService: true`) : il construit tout le
# programme TypeScript, soit ~35 s et 1,15 Go pour douze fichiers — d'où le choix
# de le garder CI-only sur cette machine. Or les trois règles qui l'ont fait
# rougir sur les 100 derniers runs ne consultent jamais le vérificateur de types :
#
#   no-unused-vars              -> oxlint le couvre à l'identique (Rust, ~1 s)
#   supabase/require-error-check -> règle AST pure
#   custom/require-zod-validation -> règle AST pure
#
# Les deux dernières tournent donc sous `eslint.fast.config.js`, sans le service
# TypeScript : ~2 s et 279 Mo sur le même lot. Vérifié fidèle à la config
# complète (même verdict, ni raté ni faux positif) sur les 419 routes d'API.
#
# Usage : scripts/lint-fast.sh [ref]   (défaut : ce qui diffère d'origin/main)
#         scripts/lint-fast.sh --staged

set -e

if [ "$1" = "--staged" ]; then
	FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|svelte)$' || true)
	SOURCE="l'index"
else
	SINCE="${1:-origin/main}"
	# `git diff` ignore les fichiers non suivis : un fichier tout neuf passerait
	# entre les mailles en usage manuel (au push il est commité, donc vu).
	FILES=$(
		{
			git diff --name-only --diff-filter=ACMR "$SINCE"
			git ls-files --others --exclude-standard
		} | grep -E '\.(ts|svelte)$' | sort -u || true
	)
	SOURCE="$SINCE"
fi

# Un fichier supprimé depuis reste dans le diff : eslint s'arrête net dessus.
# Le `|| true` est indispensable : sous `set -e`, une boucle dont la dernière
# itération est fausse (ligne vide) ferait sortir le script en silence.
FILES=$(echo "$FILES" | while read -r f; do
	if [ -n "$f" ] && [ -f "$f" ]; then echo "$f"; fi
done || true)

if [ -z "$FILES" ]; then
	echo "✅ Aucun fichier TS/Svelte modifié depuis $SOURCE"
	exit 0
fi

COUNT=$(echo "$FILES" | grep -c . || true)
echo "🔍 Lint rapide sur $COUNT fichier(s) modifié(s) depuis $SOURCE"

EXIT=0

# oxlint : couvre no-unused-vars, en `error` (cf. .oxlintrc.json).
echo "$FILES" | xargs npx oxlint || EXIT=$?

# eslint réduit aux deux règles maison.
echo "$FILES" | xargs npx eslint --config eslint.fast.config.js || EXIT=$?

# Parité des variables d'environnement : une clé importée de `$env/static` mais
# absente de `.github/ci.env` rend le typecheck vert en local et rouge en CI.
node scripts/check-env-parity.mjs || EXIT=$?

if [ $EXIT -eq 0 ]; then
	echo "✅ Lint rapide : rien à signaler"
else
	echo ""
	echo "❌ La CI échouerait sur le job Lint. Corrige avant de pousser."
fi

exit $EXIT
