#!/bin/bash
# Tests serveur à lancer sur une PR de contenu (quality.yml, job `test-server`, shard 1).
#
# Une PR de contenu (scripts/ci-nature-changement.sh → contenu=true) ne change que des
# modèles `scripts/questions/**/*.json`, de la doc et des `.md` hors src/, static/, data/.
# Aucun test ne lit docs/ (garde : src/lib/__tests__/tests-sans-lecture-de-docs) : seuls
# les tests qui lisent scripts/questions peuvent changer de verdict. On les trouve par le
# chemin écrit dans leur source, sans liste à tenir à jour. ⚠️ Un test qui lit les modèles
# doit donc écrire `scripts/questions` en clair (pas `resolve(__dirname, '../questions')`).
#
# Périmètre = projet vitest `server` (vite.config.ts) : `src/**` et `scripts/**`, sans les
# `*.svelte.{test,spec}.*` (projet `client`, sauté sur une PR de contenu : aucun ne lit
# scripts/questions). tests/integration/ tourne ailleurs (nightly-integration.yml).
#
# Écrit un fichier par ligne. Aucun fichier → exit 1 : une CI rouge plutôt qu'une PR de
# contenu validée sans aucun test (motif cassé, tests déplacés…).
# Tests : scripts/__tests__/ci-tests-contenu.test.ts.
set -uo pipefail

fichiers="$(git grep -l -E "scripts/questions|'scripts', ?'questions'" -- \
	'src/**/*.test.ts' 'src/**/*.spec.ts' 'scripts/**/*.test.ts' 'scripts/**/*.spec.ts' \
	'src/**/*.test.js' 'src/**/*.spec.js' 'scripts/**/*.test.js' 'scripts/**/*.spec.js' \
	':!*.svelte.test.ts' ':!*.svelte.spec.ts' ':!*.svelte.test.js' ':!*.svelte.spec.js')"

if [ -z "$fichiers" ]; then
	echo "ci-tests-contenu : aucun test ne lit scripts/questions → échec (motif à revoir)" >&2
	exit 1
fi

echo "$fichiers"
