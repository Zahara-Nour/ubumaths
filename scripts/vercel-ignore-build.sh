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
# Hors production, tout est sauté : seuls les pushes sur main déploient
# (git.deploymentEnabled de vercel.json). En production, tout repose sur
# VERCEL_GIT_PREVIOUS_SHA, le commit du dernier déploiement RÉUSSI ; vide,
# on construit.
#
# 1. Un REDÉPLOIEMENT se construit toujours. `pnpm maintenance:on|off` et le
#    bouton « Redeploy » rejouent un déploiement déjà réussi pour changer ses
#    variables : le sauter rendrait la bascule muette. Un push neuf descend
#    strictement du dernier déploiement ; un redéploiement, non.
#
# 2. Seule la POINTE de la branche déployée se construit (`production` depuis
#    l'ADR 0021, `main` avant). Si elle a avancé pendant que ce commit
#    attendait son tour, il est sauté : le build de la pointe l'embarque.
#
# 3. Ce qui change sous src/ ou static/ se construit, `.md` compris : les
#    articles du Shtam (src/lib/server/shtam/articles/*.md) sont importés au
#    build.
#
# 4. Rien que de la doc depuis le dernier déploiement réussi → sauté. La
#    comparaison part de ce déploiement, pas du seul parent : sinon le code
#    d'un commit sauté par la règle 2 serait perdu quand la pointe n'est
#    qu'un commit de doc. `:(glob)` fait couvrir à `**/*.md` la racine aussi
#    (CLAUDE.md, CONTEXT.md), comme le filtre de la CI.
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

sha="$(git rev-parse --verify -q "${VERCEL_GIT_COMMIT_SHA:-HEAD}^{commit}")" ||
	decider 1 "commit ${VERCEL_GIT_COMMIT_SHA:-HEAD} absent du clone → build"

precedent="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -n "$precedent" ] ||
	decider 1 "VERCEL_GIT_PREVIOUS_SHA vide : dernier déploiement inconnu → build"

# Le dépôt où lire la pointe de la branche. IGNORE_BUILD_REMOTE_URL ne sert qu'aux
# tests ; sur Vercel, le dépôt (public) se déduit des variables système.
depot="${IGNORE_BUILD_REMOTE_URL:-}"
if [ -z "$depot" ] && [ -n "${VERCEL_GIT_REPO_OWNER:-}" ] && [ -n "${VERCEL_GIT_REPO_SLUG:-}" ]; then
	depot="https://github.com/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}.git"
fi
echo "ignoreCommand : commit $(court "$sha"), dernier déploiement $(court "$precedent"), dépôt ${depot:-inconnu}"

# Le clone ne remonte que de 10 commits : l'approfondir si le dernier
# déploiement est plus loin (rare : ~1 % des pushes du 30/09 au 10/10).
if ! present "$precedent" && [ -n "$depot" ]; then
	borne git fetch -q --depth=50 "$depot" "$sha" 2>/dev/null || true
fi
present "$precedent" ||
	decider 1 "dernier déploiement $(court "$precedent") absent de l'historique de $(court "$sha") (redéploiement d'un ancien commit ?) → build"
precedent="$(git rev-parse "$precedent^{commit}")"

# Règle 1.
[ "$precedent" != "$sha" ] ||
	decider 1 "redéploiement de $(court "$sha"), le dernier déploiement réussi → build"
git merge-base --is-ancestor "$precedent" "$sha" 2>/dev/null ||
	decider 1 "$(court "$sha") ne descend pas du dernier déploiement $(court "$precedent") → build"

# Règle 2. Une pointe qui est un ancêtre de ce commit est une réponse en
# retard : elle ne sera pas reconstruite, ce commit doit l'être.
branche="${VERCEL_GIT_COMMIT_REF:-}"
if [ -n "$branche" ] && [ -n "$depot" ]; then
	pointe="$(borne git ls-remote "$depot" "refs/heads/$branche" 2>/dev/null | cut -f1)"
	if [ -n "$pointe" ] && [ "$pointe" != "$sha" ] &&
		! git merge-base --is-ancestor "$pointe" "$sha" 2>/dev/null; then
		decider 0 "$branche a avancé jusqu'à $(court "$pointe"), dont le build embarquera $(court "$sha") → build sauté"
	fi
fi

# Règle 3.
git diff --quiet "$precedent" "$sha" -- src static
case $? in
0) ;;
1) decider 1 "src/ ou static/ a changé depuis $(court "$precedent") → build" ;;
*) decider 1 "comparaison impossible depuis $(court "$precedent") → build" ;;
esac

# Règle 4.
git diff --quiet "$precedent" "$sha" -- ':(exclude,glob)docs/**' ':(exclude,glob)**/*.md'
case $? in
0) decider 0 "rien que de la doc depuis $(court "$precedent") → build sauté" ;;
1) decider 1 "du code a changé depuis $(court "$precedent") → build" ;;
*) decider 1 "comparaison impossible depuis $(court "$precedent") → build" ;;
esac
