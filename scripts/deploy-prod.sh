#!/bin/bash
# `pnpm deploy:prod` — mettre le site à jour, avec une nouvelle version (ADR 0021).
#
# Vercel ne déploie que la branche `production`. Ce script :
#   1. choisit le dernier commit de main à « CI Summary » vert (CI allégée de
#      main : typecheck et build ; le reste a tourné sur la PR),
#      en enjambant les commits de doc qui le suivent ; CI en cours → l'attend,
#      sous le verrou « deploy » (au plus DEPLOY_PROD_ATTENTE_MAX s) ;
#   2. crée la version (`pnpm release` : numéro, CHANGELOG, tag) et la pousse
#      sur main, sauf si ce commit est déjà une version ;
#   3. attend que la CI de ce commit de version soit verte : c'est la seule CI
#      COMPLÈTE de main (un push de main ordinaire n'a que typecheck et build,
#      quality.yml) ; rien n'entre en prod sans elle. Rouge sur un plantage
#      connu des tests navigateur → la relance lui-même, sous le verrou ;
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
# Usage : pnpm deploy:prod                 version + mise en prod
#         pnpm deploy:prod --essai         montre ce qui partirait, sans rien créer
#         pnpm deploy:prod --relancer-ci   relance aussi, une fois, un échec de CI
#                                          que le script ne reconnaît pas (jugé sans
#                                          lien avec le code), sous le verrou
# À lancer depuis le dépôt principal, sur main propre et à jour.
# Tests : scripts/__tests__/deploy-prod.test.ts.
set -euo pipefail

CHECK="CI Summary"
PROFONDEUR=50
# Sans `-s` : pnpm 12 ne connaît plus cette option (« unexpected argument »).
RELEASE="${DEPLOY_PROD_RELEASE:-pnpm release}"
PAUSE="${DEPLOY_PROD_PAUSE:-30}"
ATTENTE_MAX="${DEPLOY_PROD_ATTENTE_MAX:-1500}"
RELANCES_MAX="${DEPLOY_PROD_RELANCES_MAX:-2}"
# Plantage connu du serveur de vitest dans les tests navigateur, sans lien avec le
# code (vu sur main et sur des PR depuis octobre ; v0.60.0, v0.61.0, v0.63.0).
SIGNATURE="reading 'wrapDynamicImport'"
essai=0
relancer_ci=0
for option in "$@"; do
	case "$option" in
	--essai) essai=1 ;;
	--relancer-ci) relancer_ci=1 ;;
	*)
		echo "⛔ Option inconnue : $option"
		echo "   Usage : pnpm deploy:prod [--essai] [--relancer-ci]"
		exit 1
		;;
	esac
done

# Verrou noyau « deploy » (scripts/lib/lock.py), dans le répertoire git commun à
# tous les worktrees : tant qu'il est tenu, le hook .claude/hooks/garde-commandes.py
# refuse aux sessions Claude `gh pr merge` et les commits ou pushes sur main. Un
# main qui bouge fait refuser le push de la version, et chaque merge relance la
# CI que le script attend (2026-10-13 : cinq merges en une heure). Un second
# deploy:prod sort en exit 2. `--essai` ne crée rien : pas de verrou.
if [ "$essai" = 0 ] && [ -z "${DEPLOY_PROD_SOUS_VERROU:-}" ]; then
	DEPLOY_PROD_SOUS_VERROU=1 exec python3 "$(dirname "${BASH_SOURCE[0]}")/lib/lock.py" \
		deploy "pnpm deploy:prod" -- bash "${BASH_SOURCE[0]}" "$@"
fi

# success | failure | cancelled | pending | absent
etat_ci() {
	# Workflow encore en cours → « en cours », quoi que dise « CI Summary » :
	# il n'existe qu'une fois les autres jobs finis (absent pendant toute la CI,
	# vu le 2026-10-10 au premier deploy:prod), et pendant une relance il garde
	# la conclusion rouge de la tentative précédente.
	case "$(gh run list --workflow quality.yml --commit "$1" --json status --jq '.[0].status // "aucun"')" in
	aucun | completed) ;;
	*)
		echo pending
		return
		;;
	esac
	gh api "repos/{owner}/{repo}/commits/$1/check-runs?check_name=CI%20Summary" \
		--jq '.check_runs[0] | if . == null then "absent" elif .status != "completed" then "pending" else .conclusion end'
}

# Le run de quality.yml d'un commit (vide s'il n'y en a pas).
run_de() {
	gh run list --workflow quality.yml --commit "$1" --json databaseId --jq '.[0].databaseId // empty'
}

# Vrai si TOUS les jobs rouges du run de ce commit — « CI Summary » mis à part,
# rouge par conséquence — sont tombés sur le plantage connu. Un seul job rouge
# pour une autre raison, ou des logs illisibles : faux (une vraie erreur ne se
# relance pas).
plantage_connu() {
	local run log jobs job
	run="$(run_de "$1")" || return 1
	[ -n "$run" ] || return 1
	log="$(gh run view "$run" --log-failed 2>/dev/null)" || return 1
	jobs="$(printf '%s\n' "$log" | cut -f1 | grep -vx -e "$CHECK" -e '' | sort -u)" || return 1
	while IFS= read -r job; do
		printf '%s\n' "$log" | awk -F'\t' -v j="$job" '$1 == j' | grep -qF "$SIGNATURE" || return 1
	done <<<"$jobs"
}

# Relance les jobs rouges du run de ce commit, sous le verrou, si c'est permis :
# plantage connu (au plus RELANCES_MAX fois par commit), ou `--relancer-ci`
# (une fois). Vrai si relancé. Rendre le verrou pour relancer à la main laissait
# les merges annuler la relance en attente (2026-11-02, v0.63.0 : groupe de
# concurrence de quality.yml, un seul run en attente par ref).
relance_sha=""
relance_n=0
relancer() {
	local sha="$1" etat="$2" motif run
	[ "$essai" = 0 ] || return 1
	[ "$sha" = "$relance_sha" ] || {
		relance_sha="$sha"
		relance_n=0
	}
	[ "$relance_n" -lt "$RELANCES_MAX" ] || return 1
	if [ "$relancer_ci" = 1 ]; then
		motif="--relancer-ci"
		relancer_ci=0
	elif [ "$etat" = failure ] && plantage_connu "$sha"; then
		motif="plantage connu (wrapDynamicImport)"
	else
		return 1
	fi
	relance_n=$((relance_n + 1))
	run="$(run_de "$sha")"
	[ -n "$run" ] || arreter "⛔ Aucun run de CI à relancer pour $(decrire "$sha")." "Rien n'est mis en prod."
	gh run rerun "$run" --failed ||
		arreter "⛔ gh n'a pas pu relancer la CI de $(decrire "$sha")." "Rien n'est mis en prod."
	echo "🔁 $motif sur $(decrire "$sha") : relance $relance_n/$RELANCES_MAX sous le verrou"
	# Laisser GitHub repasser le run « en cours » avant de relire son état
	sleep "$PAUSE"
}

# Ajouté aux arrêts sur CI rouge.
CONSEIL="Échec sans lien avec le code ? pnpm deploy:prod --relancer-ci le relance sous le verrou."

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
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
	# Nommer les commits en cause : sous le verrou, une autre session ne peut plus pousser le sien.
	git log --format='   non poussé : %h %s' origin/main..HEAD
	git log --format='   à tirer    : %h %s' HEAD..origin/main
	arreter "⛔ main local diffère de origin/main." "git pull --ff-only (ou laisser l'autre session pousser), puis relancer."
fi

# --- 1. le dernier commit vérifié -------------------------------------------
# CI en cours : sous le verrou, personne ne merge, la CI ne repart donc pas de
# zéro ; on l'attend (au plus ATTENTE_MAX s) au lieu de rendre le verrou
# (2026-11-01 : une heure de relances, chaque merge relançait la CI). `--essai`
# ne tient pas le verrou : il n'attend pas.
pointe="$(git rev-parse origin/main)"
attendu_main=0
premier_tour=1
while :; do
	cible=""
	en_cours=""
	for c in $(git rev-list --first-parent -n "$PROFONDEUR" origin/main); do
		etat="$(etat_ci "$c")"
		case "$etat" in
		success)
			cible="$c"
			break
			;;
		absent)
			sans_ci "$c" || arreter "⛔ Commit de code sans « $CHECK » : $(decrire "$c")" "Sa CI n'a pas tourné. Rien n'est créé."
			[ "$premier_tour" = 0 ] || echo "↷ enjambé (doc seule, sans CI) : $(decrire "$c")"
			;;
		pending)
			en_cours="$c"
			break
			;;
		*)
			if relancer "$c" "$etat"; then
				en_cours="$c"
				attendu_main=0
				break
			fi
			arreter "⛔ « $CHECK » = $etat sur $(decrire "$c")" "Rien n'est créé. $CONSEIL"
			;;
		esac
	done
	premier_tour=0
	[ -z "$en_cours" ] && break
	[ "$essai" = 0 ] && [ "$attendu_main" -lt "$ATTENTE_MAX" ] ||
		arreter "⏳ CI en cours sur $(decrire "$en_cours")" "Relancer quand « $CHECK » sera vert. Rien n'est créé."
	echo "⏳ CI en cours sur $(decrire "$en_cours") : attente sous le verrou… (${attendu_main} s)"
	sleep "$PAUSE"
	# Au moins 1 par tour : avec DEPLOY_PROD_PAUSE=0 (tests), l'attente reste bornée
	attendu_main=$((attendu_main + (PAUSE > 0 ? PAUSE : 1)))
	# Un humain peut encore pousser (le verrou ne retient que les sessions Claude)
	git fetch -q origin main
	[ "$(git rev-parse origin/main)" = "$pointe" ] ||
		arreter "⛔ origin/main a bougé pendant l'attente." "git pull --ff-only, puis relancer. Rien n'est créé."
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
	# Seule CI complète de main : deux PR vertes chacune peuvent casser ici une fois
	# réunies. La version et son tag restent (GitHub Release comprise) ; la suivante
	# prendra le numéro d'après.
	failure | cancelled | timed_out)
		if relancer "$version" "$etat"; then
			attendu=0
			continue
		fi
		arreter "⛔ « $CHECK » = $etat sur la version $(decrire "$version")." "Rien n'est mis en prod. Lire la CI de la version, corriger par une PR, merger, puis relancer pnpm deploy:prod. $CONSEIL"
		;;
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
