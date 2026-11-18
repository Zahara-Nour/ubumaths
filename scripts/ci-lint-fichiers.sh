#!/bin/bash
# Quels fichiers ESLint relit-il ? (quality.yml, job `Lint`)
#
# Sur une PR : seulement les fichiers que la PR ajoute ou modifie. Les règles de
# niveau ERREUR de la config sont des règles AST ou de jeton, qui ne lisent qu'un
# fichier à la fois (cf. en-tête de eslint.fast.config.js) : changer un fichier ne
# peut pas faire apparaître une erreur dans un autre. Relire tout l'arbre prenait
# 19 à 24 min par PR (cache ESLint de main périmé : main ne lance pas le Lint).
#
# Tout l'arbre (`.`) quand un fichier change le verdict de TOUS les autres : config
# ESLint, règles maison, dépendances, .gitignore (ignores), svelte.config, tsconfig ;
# et hors PR, ou si le diff est illisible. Le filet : `lint-nocturne.yml` relit tout
# l'arbre chaque nuit sur main.
#
# Seulement sur `pull_request` : le checkout est alors le commit de merge, dont le
# premier parent est la base ; `git diff HEAD^1 HEAD` = ce que la PR change.
#
# Écrit les fichiers sur la sortie standard, un par ligne (`.` = tout l'arbre, rien =
# aucun fichier à relire) ; la raison sur l'erreur standard. Dans le doute : `.`.
# Tests : scripts/__tests__/ci-lint-fichiers.test.ts.
set -uo pipefail

tout() {
	echo "ci-lint-fichiers : $1 → tout l'arbre" >&2
	echo "."
	exit 0
}

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || tout "pas une PR"
git rev-parse -q --verify HEAD^2 >/dev/null || tout "pas un commit de merge"
fichiers="$(git diff --name-only --diff-filter=ACMR HEAD^1 HEAD 2>/dev/null)" || tout "diff illisible"

while IFS= read -r f; do
	case "$f" in
	eslint.config.* | eslint.fast.config.* | eslint-rules/* | package.json | pnpm-lock.yaml | \
		pnpm-workspace.yaml | .gitignore | svelte.config.* | tsconfig*.json)
		tout "$f change le verdict de tous les fichiers"
		;;
	esac
done <<<"$fichiers"

a_relire="$(echo "$fichiers" | grep -E '\.(ts|mts|cts|js|mjs|cjs|svelte)$' || true)"
echo "ci-lint-fichiers : $(echo "$a_relire" | grep -c . || true) fichier(s) de la PR" >&2
[ -n "$a_relire" ] && echo "$a_relire"
exit 0
