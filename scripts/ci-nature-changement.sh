#!/bin/bash
# La PR ne touche-t-elle que du contenu ? (quality.yml, job `version`)
#
# Contenu = modèles de questions (`scripts/questions/**/*.json`), doc (`docs/**`, dont les
# scripts générateurs `docs/wip/questions/*.py`) et `.md` hors `src/`, `static/`, `data/`.
# Rien de cela n'est importé par le code : typecheck, build, audit et garde SECURITY
# DEFINER ne peuvent pas changer de verdict, on les saute. Les tests serveur et client
# tournent toujours : deux d'entre eux lisent les JSON de scripts/questions
# (answer-complexity-corpus, student-answer-safety.render), et le Lint garde la doc.
#
# Seulement sur `pull_request` : le checkout est alors le commit de merge, dont le
# premier parent est la base ; `git diff HEAD^1 HEAD` = ce que la PR change.
# Sur main (push) : pas de verdict de contenu (quality.yml y allège déjà la CI).
#
# Écrit `contenu=true` ou `contenu=false` sur la sortie standard (pour $GITHUB_OUTPUT),
# la raison sur l'erreur standard. Dans le doute : false.
# Tests : scripts/__tests__/ci-nature-changement.test.ts.
set -uo pipefail

non() {
	echo "ci-nature-changement : $1 → CI complète" >&2
	echo "contenu=false"
	exit 0
}

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || non "pas une PR"
git rev-parse -q --verify HEAD^2 >/dev/null || non "pas un commit de merge"
fichiers="$(git diff --name-only HEAD^1 HEAD 2>/dev/null)" || non "diff illisible"
[ -n "$fichiers" ] || non "aucun fichier changé"

while IFS= read -r f; do
	case "$f" in
	src/* | static/* | data/*) non "$f touche le code ou des données servies" ;;
	scripts/questions/*.json | docs/* | *.md) ;;
	*) non "$f n'est pas du contenu" ;;
	esac
done <<<"$fichiers"

echo "ci-nature-changement : contenu seul → typecheck, build, audit et garde SECURITY DEFINER sautés" >&2
echo "contenu=true"
