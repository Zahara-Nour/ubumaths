#!/bin/bash

# Reproduit en local les erreurs du job "Lint" de la CI, sans son coût.
#
# Le job CI construit le programme TypeScript (`projectService: true`, posé sur
# les fichiers Svelte) : ~35 s et 1,15 Go pour douze fichiers — d'où le choix de
# le garder CI-only sur cette machine. Or ses règles de niveau erreur ne
# consultent jamais le vérificateur de types (seule `svelte/no-unused-props`
# en a besoin, et se tait sans lui) :
#
#   no-unused-vars               -> oxlint le couvre (Rust, ~1 s), eslint aussi
#   js / typescript-eslint / svelte « recommended » -> règles AST ou de jeton
#     (dont `no-fallthrough`, rouge en CI sur #927, et `no-irregular-whitespace`, #762)
#   supabase/require-error-check, custom/require-zod-validation -> AST pur
#
# `eslint.fast.config.js` reprend donc la config complète sans `projectService` :
# ~1-2 s sur un lot de 24 fichiers, 33 s et 0 erreur sur tout `src/` (vérifié
# le 2026-10-07, la CI de main étant verte : ni raté connu ni faux positif).
# `--quiet` : les `warn` ne font pas échouer la CI, on ne montre que les erreurs.
#
# Usage : scripts/lint-fast.sh [ref]   (défaut : ce qui diffère d'origin/main, non suivis compris)
#         scripts/lint-fast.sh --staged
#         scripts/lint-fast.sh --push  (pre-push : les commits qui partent, sans les non suivis)
#
# Le choix des fichiers vit dans `lint-fast-fichiers.sh` (testé à part).

set -e

case "$1" in
	--staged) SOURCE="l'index" ;;
	--push) SOURCE="les commits poussés" ;;
	*) SOURCE="${1:-origin/main}" ;;
esac

FILES=$(bash "$(dirname "$0")/lint-fast-fichiers.sh" "$@")

if [ -z "$FILES" ]; then
	echo "✅ Aucun fichier TS/Svelte à relire ($SOURCE)"
	exit 0
fi

COUNT=$(echo "$FILES" | grep -c . || true)
echo "🔍 Lint rapide sur $COUNT fichier(s) ($SOURCE)"

EXIT=0

# oxlint : couvre no-unused-vars, en `error` (cf. .oxlintrc.json).
echo "$FILES" | xargs npx oxlint || EXIT=$?

# eslint : les règles d'erreur de la config complète, sans service TypeScript.
echo "$FILES" | xargs npx eslint --quiet --config eslint.fast.config.js || EXIT=$?

# Parité des variables d'environnement : une clé importée de `$env/static` mais
# absente de `.github/ci.env` rend le typecheck vert en local et rouge en CI.
node scripts/check-env-parity.mjs || EXIT=$?
# vitest-browser-svelte 3 : un `render` sans `await` monte quand même le
# composant, donc aucun test ne rougit. Lancée seulement si un test client a
# bougé (~2 s) ; la CI la passe toujours sur tout l'arbre.
if echo "$FILES" | grep -qE '\.svelte\.(test|spec)\.ts$'; then
	npx tsx scripts/check-await-render.ts || EXIT=$?
fi

if [ $EXIT -eq 0 ]; then
	echo "✅ Lint rapide : rien à signaler"
else
	echo ""
	echo "❌ La CI échouerait sur le job Lint. Corrige avant de pousser."
fi

exit $EXIT
