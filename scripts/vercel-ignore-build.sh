#!/bin/bash
# Étape « Ignored Build Step » de Vercel (`ignoreCommand` de vercel.json).
#
# Vercel lance ce script dans le conteneur de build, juste après un clone
# superficiel du commit (--depth=10) :
#   sortie 0      → build sauté (déploiement « Canceled », rien de stocké) ;
#   sortie 1 ou + → build. Une erreur imprévue construit donc : dans le doute,
#                   on construit.
#
# Pourquoi ce soin : un build de prod coûte ~6 min (un seul à la fois sur le
# plan gratuit) et ~110 Mo de stockage, plafonné à 10 Go — alerte 100 % le
# 2026-10-10, avec ~45 pushes de code par jour sur main.
#
# Trois règles, en production seulement. Hors production, tout est sauté :
# seuls les pushes sur main déploient (git.deploymentEnabled de vercel.json).
#
# 1. Un REDÉPLOIEMENT se construit toujours. `pnpm maintenance:on|off` et le
#    bouton « Redeploy » rejouent un déploiement déjà réussi pour changer ses
#    variables : le sauter rendrait la bascule muette. On le reconnaît grâce à
#    VERCEL_GIT_PREVIOUS_SHA, le commit du dernier déploiement RÉUSSI : un push
#    neuf en descend strictement, un redéploiement non.
#
# 2. Seule la POINTE de main se construit. Quand des merges s'accumulent
#    derrière le build en cours, les commits dépassés sont sautés : le build
#    de la pointe les embarque. Simulé sur les pushes du 30/09 au 10/10 :
#    13 à 20 % de builds en moins.
#
# 3. Rien que de la doc depuis le dernier déploiement réussi → sauté. La
#    comparaison part de ce déploiement, pas du seul parent : sinon le code
#    d'un commit sauté par la règle 2 serait perdu quand la pointe n'est
#    qu'un commit de doc. `:(glob)` est nécessaire pour que `**/*.md` couvre
#    aussi la racine (CLAUDE.md, CONTEXT.md), comme le filtre de la CI.
#
# Tests : scripts/__tests__/vercel-ignore-build.test.ts.
set -uo pipefail

decider() {
	echo "ignoreCommand : $2"
	exit "$1"
}

court() {
	printf '%s' "${1:0:9}"
}

present() {
	git cat-file -e "$1^{commit}" 2>/dev/null
}

# Borne les appels réseau : un GitHub muet ne doit pas tenir le seul créneau de build.
borne() {
	if command -v timeout >/dev/null 2>&1; then
		timeout 30 "$@"
	else
		"$@"
	fi
}

[ "${VERCEL_ENV:-}" = "production" ] ||
	decider 0 "hors production (VERCEL_ENV=${VERCEL_ENV:-vide}) → build sauté"

sha="${VERCEL_GIT_COMMIT_SHA:-}"
[ -n "$sha" ] || sha="$(git rev-parse HEAD 2>/dev/null)" || decider 1 "commit inconnu → build"
precedent="${VERCEL_GIT_PREVIOUS_SHA:-}"

# Le dépôt où lire la pointe de main. IGNORE_BUILD_REMOTE_URL ne sert qu'aux
# tests ; sur Vercel, le dépôt (public) se déduit des variables système.
depot="${IGNORE_BUILD_REMOTE_URL:-}"
if [ -z "$depot" ] && [ -n "${VERCEL_GIT_REPO_OWNER:-}" ] && [ -n "${VERCEL_GIT_REPO_SLUG:-}" ]; then
	depot="https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}.git"
fi

if [ -z "$precedent" ]; then
	# Dernier déploiement inconnu : impossible de distinguer un redéploiement
	# d'un push neuf. Règle d'avant, sur le seul dernier commit, sans règle 2.
	echo "ignoreCommand : VERCEL_GIT_PREVIOUS_SHA vide → comparaison au seul parent"
	base="$(git rev-parse "$sha^" 2>/dev/null)" || decider 1 "parent de $(court "$sha") introuvable → build"
else
	# Règle 1.
	[ "$precedent" != "$sha" ] ||
		decider 1 "redéploiement de $(court "$sha"), le dernier déploiement réussi → build"

	# Le clone ne remonte que de 10 commits : l'approfondir si le dernier
	# déploiement est plus loin (rare : ~1 % des pushes du 30/09 au 10/10).
	if ! present "$precedent" && [ -n "$depot" ]; then
		borne git fetch -q --depth=50 "$depot" "$sha" 2>/dev/null || true
	fi
	if ! present "$precedent" || ! git merge-base --is-ancestor "$precedent" "$sha" 2>/dev/null; then
		decider 1 "$(court "$sha") ne descend pas du dernier déploiement $(court "$precedent") (redéploiement d'un ancien commit ?) → build"
	fi

	# Règle 2.
	if [ "${VERCEL_GIT_COMMIT_REF:-}" = "main" ] && [ -n "$depot" ]; then
		pointe="$(borne git ls-remote "$depot" refs/heads/main 2>/dev/null | cut -f1)"
		if [ -n "$pointe" ] && [ "$pointe" != "$sha" ]; then
			decider 0 "main a avancé jusqu'à $(court "$pointe"), dont le build embarquera $(court "$sha") → build sauté"
		fi
	fi
	base="$precedent"
fi

# Règle 3.
git diff --quiet "$base" "$sha" -- ':(exclude,glob)docs/**' ':(exclude,glob)**/*.md'
case $? in
0) decider 0 "rien que de la doc depuis $(court "$base") → build sauté" ;;
1) decider 1 "du code a changé depuis $(court "$base") → build" ;;
*) decider 1 "comparaison impossible depuis $(court "$base") → build" ;;
esac
