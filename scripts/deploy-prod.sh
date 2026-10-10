#!/bin/bash
# `pnpm deploy:prod` — mettre le site à jour (ADR 0021).
#
# Vercel ne déploie que la branche `production`. Ce script l'avance, en avance
# rapide seulement, jusqu'au dernier commit de main vérifié par la CI
# (« CI Summary » vert). Il est lancé par David, ou par Claude à sa demande
# explicite : jamais de mise en prod à l'initiative de Claude.
#
# Pourquoi pas simplement la pointe de main ? Elle est souvent un commit de doc,
# que la CI de push ignore (filtre `paths` de quality.yml) : il n'a pas de
# « CI Summary », et les Deployment Checks de Vercel l'attendraient pour
# toujours. Les commits de doc qui SUIVENT le dernier commit vérifié ne
# changent rien au site (l'ignore step les saute) : on les enjambe. Tout le
# reste arrête le script : CI en cours ou rouge, ou commit de code sans CI.
#
# Usage : pnpm deploy:prod            avance production et pousse
#         pnpm deploy:prod --essai    montre ce qui partirait, sans pousser
# Tests : scripts/__tests__/deploy-prod.test.ts.
set -euo pipefail

CHECK="CI Summary"
PROFONDEUR=50
essai=0
[ "${1:-}" = "--essai" ] && essai=1

# success | failure | cancelled | pending | absent
etat_ci() {
	gh api "repos/{owner}/{repo}/commits/$1/check-runs?check_name=CI%20Summary" \
		--jq '.check_runs[0] | if . == null then "absent" elif .status != "completed" then "pending" else .conclusion end'
}

# Vrai si la CI de push ignore ce commit (même filtre que quality.yml) : rien
# que de la doc, hors docs/corrections, src/ et static/.
sans_ci() {
	git diff-tree --no-commit-id --name-only -r -m --first-parent "$1" | while IFS= read -r f; do
		case "$f" in
		docs/corrections/* | src/* | static/*) exit 1 ;;
		docs/* | *.md | .github/dependabot.yml) ;;
		*) exit 1 ;;
		esac
	done
}

decrire() {
	git log -1 --format='%h %s' "$1"
}

git fetch -q origin main

cible=""
for c in $(git rev-list --first-parent -n "$PROFONDEUR" origin/main); do
	etat="$(etat_ci "$c")"
	case "$etat" in
	success)
		cible="$c"
		break
		;;
	absent)
		if sans_ci "$c"; then
			echo "↷ enjambé (doc seule, sans CI) : $(decrire "$c")"
			continue
		fi
		echo "⛔ Commit de code sans « $CHECK » : $(decrire "$c")"
		echo "   La CI ne l'a pas vérifié. Rien n'est poussé."
		exit 1
		;;
	pending)
		echo "⏳ CI en cours sur $(decrire "$c")"
		echo "   Relancer quand « $CHECK » sera vert. Rien n'est poussé."
		exit 1
		;;
	*)
		echo "⛔ « $CHECK » = $etat sur $(decrire "$c")"
		echo "   Rien n'est poussé."
		exit 1
		;;
	esac
done
[ -n "$cible" ] || {
	echo "⛔ Aucun commit vérifié par la CI dans les $PROFONDEUR derniers de main."
	exit 1
}

if git ls-remote --exit-code origin refs/heads/production >/dev/null 2>&1; then
	git fetch -q origin production
	prod="$(git rev-parse origin/production)"
	if [ "$prod" = "$cible" ]; then
		echo "✅ production est déjà sur $(decrire "$cible") : rien à livrer."
		exit 0
	fi
	if ! git merge-base --is-ancestor "$prod" "$cible"; then
		echo "⛔ production ($(decrire "$prod")) n'est pas un ancêtre de $(decrire "$cible")."
		echo "   Jamais de force-push : à examiner à la main."
		exit 1
	fi
	echo "Livraison de $(git rev-list --count --first-parent "$prod..$cible") commit(s) de main :"
	git log --first-parent --format='  %h %s' "$prod..$cible"
else
	echo "Création de la branche production sur $(decrire "$cible")."
fi

if [ "$essai" = 1 ]; then
	echo "(--essai : rien n'est poussé)"
	exit 0
fi
git push -q origin "$cible:refs/heads/production"
echo "🚀 production → $(decrire "$cible"). Vercel construit ; suivi : vercel ls --prod"
