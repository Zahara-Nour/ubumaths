#!/bin/bash
# Prettier check with the same visibility as CI — sur ce que le push AJOUTE.
#
# DEUX RESTRICTIONS SUCCESSIVES, pour deux problèmes différents.
#
# 1. `prettier --check .` → fichiers SUIVIS (correction précédente).
#   `.` parcourt l'arbre de travail, donc aussi ce que git ne suit pas. La CI,
#   elle, travaille sur un clone frais où ces fichiers n'existent pas : le
#   contrôle local était donc PLUS STRICT que la chose qu'il sert à prédire. Le
#   brouillon non commité d'une autre session bloquait un push qui ne le
#   concernait pas, et le correctif proposé (`pnpm format:all`) aurait reformaté
#   le travail en cours de quelqu'un d'autre. Le contournement appris était
#   `git push --no-verify`, qui saute AUSSI le garde-fou lint:fast — un garde
#   qu'on apprend à contourner protège moins que pas de garde.
#
# 2. Fichiers suivis → PORTÉE DU PUSH (celle-ci).
#   Vérifier les ~7000 fichiers suivis coûtait 22 s à CHAQUE push, y compris pour
#   trois lignes de doc : un impôt fixe pour zéro information. Les fichiers déjà
#   sur le distant ont été vus par la CI lors de leur propre push ; les
#   revérifier ne peut rien apprendre sur CE push-ci. Seul ce qu'il ajoute est
#   nouveau — et c'est exactement ce que la CI verra changer.
#
#   Conséquence assumée : si `main` porte déjà un fichier mal formaté (poussé en
#   `--no-verify`, CI rouge ignorée), ce hook ne le signale plus. Il ne le
#   réparait pas davantage avant — il bloquait un push étranger à la faute — et
#   la CI reste là pour le voir.
#
#   `FULL=1 pnpm format:check` rejoue l'arbre suivi entier.
#
# WHY THE SYMLINK FILTER:
#   `git ls-files` lists tracked symlinks (tools/shantell-math/venv/bin/python*),
#   and Prettier ERRORS on an explicitly named symlink instead of skipping it —
#   it only skips them silently when expanding a directory itself. Without this
#   filter the check exits 1 on a perfectly clean tree.
#
# --ignore-unknown: same reason, for extensions Prettier has no parser for.
#   Explicit paths make it fail; directory walking makes it skip.
set -uo pipefail

# Base de comparaison : ce que le distant connaît déjà.
#
# La branche suivie d'abord ; `origin/main` ensuite, pour une branche qui n'a pas
# encore d'amont. Sans base — clone neuf, `origin` absent — on retombe sur
# l'arbre suivi entier : mieux vaut lent que muet.
base=""
if upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null); then
	base=$(git merge-base HEAD "$upstream" 2>/dev/null || true)
fi
if [ -z "$base" ]; then
	base=$(git merge-base HEAD origin/main 2>/dev/null || true)
fi

liste_fichiers() {
	if [ -n "${FULL:-}" ] || [ -z "$base" ]; then
		git ls-files -z
	else
		# `--diff-filter=d` retire les suppressions : prettier échouerait sur un
		# chemin qui n'existe plus.
		git diff --name-only --diff-filter=d -z "$base" HEAD
	fi
}

# ⚠️ La liste transite par un FICHIER, jamais par `$(...)` : une substitution de
# commande supprime les octets nuls, et tous les chemins se retrouveraient collés
# en un seul, que prettier rejette en `ENAMETOOLONG`.
liste=$(mktemp)
trap 'rm -f "$liste"' EXIT

liste_fichiers |
	while IFS= read -r -d '' file; do
		[ -L "$file" ] || printf '%s\0' "$file"
	done >"$liste"

# Rien à vérifier : un push qui n'ajoute aucun fichier (remise à jour de branche,
# push à vide). Le silence est la bonne réponse, pas une erreur.
[ -s "$liste" ] || exit 0

xargs -0 npx prettier --check --cache --ignore-unknown <"$liste"
