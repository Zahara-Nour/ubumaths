#!/bin/bash
# Quels fichiers ESLint relit-il ? (quality.yml, job `Lint`)
#
# Sur une PR : les fichiers de code que la PR ajoute ou modifie, plus les `.svelte`
# qui importent un `.ts`/`.js` qu'elle modifie ou supprime. Relire tout l'arbre
# prenait 19 à 24 min par PR (cache ESLint de main périmé : main ne lance pas le Lint).
#
# Pourquoi ces `.svelte` : presque toutes les règles d'erreur sont AST ou de jeton et
# ne lisent qu'un fichier (cf. eslint.fast.config.js), sauf `svelte/no-unused-props`
# (erreur dans `svelte.configs.recommended`) qui lit les types : changer le type des
# props défini dans un `.ts` change le verdict du composant qui l'importe. Un import
# indirect (type d'un type), ou des props importées d'un autre `.svelte` (en suivre les
# parents relirait trop), peuvent échapper : le filet est `lint-nocturne.yml`, qui
# relit tout l'arbre chaque nuit sur main.
#
# Tout l'arbre (`.`) quand un fichier change le verdict de TOUS les autres : config
# ESLint, règles maison, dépendances, .gitignore (ignores), config Svelte/Vite,
# tsconfig, types globaux `.d.ts`, version de Node ; hors PR ; diff illisible ; plus
# de 300 fichiers de code changés.
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

# quotepath=off : un chemin accentué sort tel quel, pas en octal entre guillemets.
diff_pr() {
	git -c core.quotepath=off diff "$@" HEAD^1 HEAD 2>/dev/null
}

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || tout "pas une PR"
git rev-parse -q --verify HEAD^2 >/dev/null || tout "pas un commit de merge"
changes="$(diff_pr --name-only --diff-filter=ACMR)" || tout "diff illisible"
# Supprimés, et ancien nom des renommés (2e colonne de --name-status).
supprimes="$(diff_pr --name-status --diff-filter=DR)" || tout "diff illisible"
supprimes="$(echo "$supprimes" | cut -f2)"

while IFS= read -r f; do
	case "$f" in
	eslint.config.* | eslint.fast.config.* | eslint-rules/* | package.json | pnpm-lock.yaml | \
		pnpm-workspace.yaml | .gitignore | svelte.config.* | vite.config.* | tsconfig*.json | \
		*.d.ts | .nvmrc)
		tout "$f change le verdict de tous les fichiers"
		;;
	esac
done <<<"$changes"$'\n'"$supprimes"

CODE='\.(ts|mts|cts|js|mjs|cjs|svelte)$'
a_relire="$(echo "$changes" | grep -E "$CODE" || true)"
[ "$(echo "$a_relire" | grep -c .)" -le 300 ] || tout "plus de 300 fichiers de code"

# Motifs d'import des modules TS/JS modifiés ou supprimés : `/logger.` et `/logger'`
# couvrent `#lib/utils/logger.ts` comme `./logger` ; un `index` se cherche par son
# dossier (`/button/index`, `/button'`). Un sur-ensemble suffit.
motifs="$(
	echo "$changes"$'\n'"$supprimes" | grep -E '\.(ts|mts|cts|js|mjs|cjs)$' |
		while IFS= read -r f; do
			nom="$(basename "$f")"
			nom="${nom%.*}"
			if [ "$nom" = "index" ]; then
				dossier="$(basename "$(dirname "$f")")"
				printf '/%s/index\n/%s'"'"'\n/%s"\n' "$dossier" "$dossier" "$dossier"
			else
				printf '/%s.\n/%s'"'"'\n/%s"\n' "$nom" "$nom" "$nom"
			fi
		done
)"
if [ -n "$motifs" ]; then
	importeurs="$(git ls-files -z '*.svelte' | xargs -0 grep -lF -- "$motifs" 2>/dev/null || true)"
	a_relire="$(printf '%s\n%s\n' "$a_relire" "$importeurs" | grep . | sort -u || true)"
fi

echo "ci-lint-fichiers : $(echo "$a_relire" | grep -c . || true) fichier(s) à relire" >&2
[ -n "$a_relire" ] && echo "$a_relire"
exit 0
