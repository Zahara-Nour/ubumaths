#!/bin/bash
# La CI peut-elle sauter ses jobs lourds pour ce commit ? (ADR 0021)
#
# Oui seulement pour un commit de version (`pnpm deploy:prod` → `pnpm release`)
# qui ne change RIEN d'autre que le numéro de version et le CHANGELOG, posé sur
# un état déjà vérifié par la CI. Refaire typecheck, build et tests sur un
# numéro de version coûtait ~5 min à chaque mise en prod, pour rien.
#
# Conditions, toutes requises :
# - sujet `chore(release): …` ;
# - seuls CHANGELOG.md et package.json changent par rapport au parent ;
# - dans package.json, seule la ligne "version" change ;
# - le parent est vérifié : « CI Summary » vert, ou commits de doc sans CI
#   (même filtre que quality.yml) jusqu'à un commit vert.
#
# Écrit `seule=true` ou `seule=false` sur la sortie standard (pour
# $GITHUB_OUTPUT), la raison sur l'erreur standard. Dans le doute : false.
# Tests : scripts/__tests__/ci-version-seule.test.ts.
set -uo pipefail

sha="${1:?usage : ci-version-seule.sh <commit>}"
depot="${GITHUB_REPOSITORY:-}"
[ -n "$depot" ] || depot='{owner}/{repo}' # gh le résout depuis le remote
PROFONDEUR=50

non() {
	echo "ci-version-seule : $1 → CI complète" >&2
	echo "seule=false"
	exit 0
}

etat_ci() {
	gh api "repos/$depot/commits/$1/check-runs?check_name=CI%20Summary" \
		--jq '.check_runs[0] | if . == null then "absent" elif .status != "completed" then "pending" else .conclusion end' 2>/dev/null ||
		echo "inconnu"
}

# Même filtre que quality.yml : rien que de la doc, hors data/corrections, src/ et static/.
sans_ci() {
	git diff-tree --no-commit-id --name-only -r -m --first-parent "$1" | while IFS= read -r f; do
		case "$f" in
		data/* | src/* | static/*) exit 1 ;;
		docs/* | *.md | .github/dependabot.yml) ;;
		*) exit 1 ;;
		esac
	done
}

git log -1 --format=%s "$sha" 2>/dev/null | grep -q '^chore(release): ' || non "pas un commit de version"
parent="$(git rev-parse -q --verify "$sha^")" || non "parent absent du clone"

fichiers="$(git diff --name-only "$parent" "$sha" | sort | tr '\n' ' ')"
[ "$fichiers" = "CHANGELOG.md package.json " ] || non "fichiers modifiés : $fichiers"

lignes="$(git diff -U0 "$parent" "$sha" -- package.json | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ')"
[ "$(printf '%s\n' "$lignes" | wc -l | tr -d ' ')" = 2 ] || non "package.json : plus d'une ligne modifiée"
if printf '%s\n' "$lignes" | grep -qvE '^[-+][[:space:]]*"version": "[0-9]+\.[0-9]+\.[0-9]+",?$'; then
	non "package.json change autre chose que la version"
fi

for c in $(git rev-list --first-parent -n "$PROFONDEUR" "$parent" 2>/dev/null); do
	etat="$(etat_ci "$c")"
	case "$etat" in
	success)
		echo "ci-version-seule : version sur $(git rev-parse --short "$c"), vérifié → jobs lourds sautés" >&2
		echo "seule=true"
		exit 0
		;;
	absent) sans_ci "$c" || non "$(git rev-parse --short "$c") : code sans « CI Summary »" ;;
	*) non "$(git rev-parse --short "$c") : « CI Summary » = $etat" ;;
	esac
done
non "aucun ancêtre vérifié trouvé (clone trop court ?)"
