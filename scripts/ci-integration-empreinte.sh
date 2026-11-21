#!/bin/bash
# Empreinte d'un passage de la suite d'intégration sur une PR (nightly-integration.yml, job `portee`)
#
# Sur 37 pushes de correction mesurés, 20 ne touchaient aucun fichier dont dépend la suite et
# relançaient 16 à 20 min de tests pour un résultat identique (2026-11-21). L'empreinte résume
# tout ce qui peut changer le résultat :
#
#   - les fichiers couverts par le filtre `on.pull_request.paths` du workflow (la garde
#     `pnpm check:integration-paths` assure qu'il couvre toute la suite), pris sur le commit de
#     merge : si `main` avance sur l'un d'eux, l'empreinte change ;
#   - la portée calculée pour ce passage ($FICHIERS, $EXCLURE, $TOTAL) : deux passages ne se
#     valent que s'ils lancent exactement les mêmes tests.
#
# Un passage entièrement vert enregistre son empreinte (cache GitHub de la PR) ; un passage de la
# même PR qui retrouve la même empreinte ne relance pas les tests.
#
# Motifs du filtre lus en `:(glob)` de git : `*` sans `/`, `**` avec, comme chez GitHub. Le filtre
# n'emploie ni `?`, ni `+`, ni `[]`, ni `!` (sens différents entre les deux) : sinon, vide.
#
# Seulement sur `pull_request` (commit de merge). Écrit `empreinte=<sha>` sur la sortie standard
# (pour $GITHUB_OUTPUT), la raison sur l'erreur standard. Dans le doute : `empreinte=` (vide),
# et la suite tourne. Tests : scripts/__tests__/ci-integration-empreinte.test.ts.
set -uo pipefail

WORKFLOW='.github/workflows/nightly-integration.yml'

aucune() {
	echo "ci-integration-empreinte : $1 → pas d'empreinte, la suite tourne" >&2
	echo "empreinte="
	exit 0
}

# LISTER=1 : écrit les fichiers couverts de HEAD au lieu de l'empreinte (pour le test qui compare
# cette lecture du filtre à celle de GitHub), sur n'importe quel commit.
if [ "${LISTER:-}" != "1" ]; then
	[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || aucune "pas une PR"
	git rev-parse -q --verify HEAD^2 >/dev/null || aucune "pas un commit de merge"
fi
[ -f "$WORKFLOW" ] || aucune "$WORKFLOW introuvable"

# Motifs du filtre : entrées `- '…'` de `on.pull_request.paths`, jusqu'à la clé suivante.
motifs="$(awk '
	/^  pull_request:/ { dans_pr = 1; next }
	dans_pr && /^  [a-z_]+:/ { dans_pr = 0 }
	/^[a-z]/ { dans_pr = 0; dans_paths = 0 }
	dans_pr && /^    paths:/ { dans_paths = 1; next }
	dans_paths && /^    [a-z_-]+:/ { dans_paths = 0 }
	dans_paths && /^      - / {
		sub(/^      - /, ""); sub(/[ \t]+#.*$/, ""); sub(/[ \t]+$/, "")
		gsub(/^'\''|'\''$/, ""); gsub(/^"|"$/, "")
		print
	}
' "$WORKFLOW")"
[ -n "$motifs" ] || aucune "filtre paths introuvable"
if grep -q '[][?+!]' <<<"$motifs"; then aucune "motif hors de la lecture glob"; fi
# Guillemet ou espace restant : entrée mal lue, elle ne couvrirait rien sans le dire.
if grep -q "[\"' ]" <<<"$motifs"; then aucune "motif mal lu (guillemet ou espace)"; fi
# `**` collé à un nom (`src/**server.ts`) : « tout » chez GitHub, mais `*` pour git → refusé.
while IFS= read -r m; do
	IFS='/' read -ra segments <<<"$m"
	for seg in "${segments[@]}"; do
		if [[ "$seg" == *'**'* && "$seg" != '**' ]]; then aucune "\`**\` collé à un nom : $m"; fi
	done
done <<<"$motifs"

pathspecs=()
while IFS= read -r m; do pathspecs+=(":(glob)$m"); done <<<"$motifs"

# `git ls-tree` refuse `:(glob)` : on lit HEAD dans un index jetable, puis `ls-files` le filtre
# (l'index du dépôt, lui, peut différer de HEAD).
index="$(mktemp)" || aucune "fichier temporaire impossible"
trap 'rm -f "$index"' EXIT
GIT_INDEX_FILE="$index" git read-tree HEAD || aucune "HEAD illisible"
arbre="$(GIT_INDEX_FILE="$index" git ls-files -s -- "${pathspecs[@]}")" || aucune "arbre illisible"
[ -n "$arbre" ] || aucune "aucun fichier couvert"
# Motif sans aucun fichier (coquille ?) : signalé seulement, `check:integration-paths` le refuse.
while IFS= read -r m; do
	if [ -z "$(GIT_INDEX_FILE="$index" git ls-files -- ":(glob)$m" | head -1)" ]; then
		echo "ci-integration-empreinte : motif sans fichier : $m" >&2
	fi
done <<<"$motifs"
if [ "${LISTER:-}" = "1" ]; then
	cut -f2- <<<"$arbre"
	exit 0
fi

empreinte="$(
	{
		echo "$arbre"
		echo "fichiers=${FICHIERS:-}"
		echo "exclure=${EXCLURE:-}"
		echo "total=${TOTAL:-}"
	} | git hash-object --stdin
)" || aucune "calcul impossible"

echo "ci-integration-empreinte : $(wc -l <<<"$arbre" | tr -d ' ') fichiers couverts → $empreinte" >&2
echo "empreinte=$empreinte"
