#!/bin/bash
# `pnpm deploy:prod` — mettre le site à jour, avec une nouvelle version (ADR 0021).
#
# Vercel ne déploie que la branche `production`. Ce script :
#   1. choisit le dernier commit de main vérifié par la CI (« CI Summary » vert),
#      en enjambant les commits de doc qui le suivent ;
#   2. crée la version (`pnpm release` : numéro, CHANGELOG, tag) et la pousse
#      sur main, sauf si ce commit est déjà une version ;
#   3. attend que la CI de ce commit de version soit verte ;
#   4. avance `production` jusqu'à lui, en avance rapide seulement.
# Lancé par David, ou par Claude à sa demande explicite : jamais de mise en
# prod — ni de version — à l'initiative de Claude.
#
# Pourquoi pas simplement la pointe de main ? Elle est souvent un commit de doc,
# que la CI de push ignore (filtre `paths` de quality.yml) : sans « CI
# Summary », les Deployment Checks de Vercel l'attendraient pour toujours. Les
# commits de doc qui suivent le dernier commit vérifié ne changent rien au site
# (l'ignore step les saute) : on les enjambe. Tout le reste arrête le script.
#
# Usage : pnpm deploy:prod            version + mise en prod
#         pnpm deploy:prod --essai    montre ce qui partirait, sans rien créer
# À lancer depuis le dépôt principal, sur main propre et à jour.
# Tests : scripts/__tests__/deploy-prod.test.ts.
set -euo pipefail

CHECK="CI Summary"
PROFONDEUR=50
# Sans `-s` : pnpm 12 ne connaît plus cette option (« unexpected argument »).
RELEASE="${DEPLOY_PROD_RELEASE:-pnpm release}"
PAUSE="${DEPLOY_PROD_PAUSE:-30}"
ATTENTE_MAX="${DEPLOY_PROD_ATTENTE_MAX:-1500}"
essai=0
[ "${1:-}" = "--essai" ] && essai=1

# success | failure | cancelled | pending | absent
etat_ci() {
	local e
	e="$(gh api "repos/{owner}/{repo}/commits/$1/check-runs?check_name=CI%20Summary" \
		--jq '.check_runs[0] | if . == null then "absent" elif .status != "completed" then "pending" else .conclusion end')"
	# « CI Summary » n'existe qu'une fois les autres jobs finis : pendant toute la
	# CI il est absent. Un workflow encore en cours vaut donc « en cours », pas
	# « commit sans CI » (vu le 2026-10-10 au premier deploy:prod).
	if [ "$e" = absent ]; then
		case "$(gh run list --workflow quality.yml --commit "$1" --json status --jq '.[0].status // "aucun"')" in
		aucun | completed) ;;
		*) e="pending" ;;
		esac
	fi
	echo "$e"
}

# Vrai si la CI de push ignore ce commit (même filtre que quality.yml) : rien
# que de la doc, hors data/corrections, src/ et static/.
sans_ci() {
	git diff-tree --no-commit-id --name-only -r -m --first-parent "$1" | while IFS= read -r f; do
		case "$f" in
		data/* | src/* | static/*) exit 1 ;;
		docs/* | *.md | .github/dependabot.yml) ;;
		*) exit 1 ;;
		esac
	done
}

decrire() {
	git log -1 --format='%h %s' "$1"
}

arreter() {
	echo "$1"
	[ -n "${2:-}" ] && echo "   $2"
	exit 1
}

# --- 0. main local propre et à jour -----------------------------------------
[ "$(git branch --show-current)" = "main" ] || arreter "⛔ À lancer sur main (branche actuelle : $(git branch --show-current))."
[ -z "$(git status --porcelain --untracked-files=no)" ] || arreter "⛔ main a des modifications non commitées."
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
	arreter "⛔ main local diffère de origin/main." "git pull --ff-only, puis relancer."

# --- 1. le dernier commit vérifié -------------------------------------------
cible=""
for c in $(git rev-list --first-parent -n "$PROFONDEUR" origin/main); do
	etat="$(etat_ci "$c")"
	case "$etat" in
	success)
		cible="$c"
		break
		;;
	absent)
		sans_ci "$c" || arreter "⛔ Commit de code sans « $CHECK » : $(decrire "$c")" "La CI ne l'a pas vérifié. Rien n'est créé."
		echo "↷ enjambé (doc seule, sans CI) : $(decrire "$c")"
		;;
	pending) arreter "⏳ CI en cours sur $(decrire "$c")" "Relancer quand « $CHECK » sera vert. Rien n'est créé." ;;
	*) arreter "⛔ « $CHECK » = $etat sur $(decrire "$c")" "Rien n'est créé." ;;
	esac
done
[ -n "$cible" ] || arreter "⛔ Aucun commit vérifié par la CI dans les $PROFONDEUR derniers de main."

prod=""
if git ls-remote --exit-code origin refs/heads/production >/dev/null 2>&1; then
	git fetch -q origin production
	prod="$(git rev-parse origin/production)"
	[ "$prod" != "$cible" ] || {
		echo "✅ production est déjà sur $(decrire "$cible") : rien à livrer."
		exit 0
	}
	git merge-base --is-ancestor "$prod" "$cible" ||
		arreter "⛔ production ($(decrire "$prod")) n'est pas un ancêtre de $(decrire "$cible")." "Jamais de force-push : à examiner à la main."
	echo "À livrer, $(git rev-list --count --first-parent "$prod..$cible") commit(s) de main :"
	git log --first-parent --format='  %h %s' "$prod..$cible"
else
	echo "Première mise en prod par la branche production : $(decrire "$cible")."
fi

if [ "$essai" = 1 ]; then
	echo "(--essai : rien n'est créé, rien n'est poussé)"
	exit 0
fi

# --- 2. la version ------------------------------------------------------------
if git tag --points-at "$cible" | grep -q '^v'; then
	version="$cible"
	echo "Déjà une version : $(git tag --points-at "$cible" | grep '^v' | head -1)."
else
	$RELEASE
	version="$(git rev-parse HEAD)"
	[ "$version" != "$cible" ] || arreter "⛔ pnpm release n'a créé aucun commit."
	tag="$(git tag --points-at "$version" | grep '^v' | head -1)"
	[ -n "$tag" ] || arreter "⛔ Le commit de version n'a pas de tag v…"
	git push -q origin main "refs/tags/$tag" ||
		arreter "⛔ Push de la version refusé (main a-t-il bougé ?)." "Version $tag locale, non publiée : à examiner."
	echo "🏷  $tag poussée sur main : $(decrire "$version")"
fi

# --- 3. la CI de la version ---------------------------------------------------
attendu=0
while :; do
	etat="$(etat_ci "$version")"
	case "$etat" in
	success) break ;;
	failure | cancelled | timed_out) arreter "⛔ « $CHECK » = $etat sur la version $(decrire "$version")." "Rien n'est mis en prod." ;;
	esac
	[ "$attendu" -lt "$ATTENTE_MAX" ] ||
		arreter "⏳ CI de la version toujours pas verte après ${ATTENTE_MAX} s." "Relancer pnpm deploy:prod plus tard : la version existe, seule la mise en prod reste."
	echo "⏳ CI de la version : ${etat}… (${attendu} s)"
	sleep "$PAUSE"
	attendu=$((attendu + PAUSE))
done

# --- 4. la mise en prod -------------------------------------------------------
git push -q origin "$version:refs/heads/production"
echo "🚀 production → $(decrire "$version"). Vercel construit ; suivi : vercel ls --prod"
