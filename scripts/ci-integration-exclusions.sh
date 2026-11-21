#!/bin/bash
# Tests de migration de données à laisser de côté sur une PR (nightly-integration.yml, job `portee`)
#
# Un test marqué `@migration-de-donnees` rejoue une migration qui ne fait que ranger, taguer ou
# corriger du contenu : il ne prouve quelque chose qu'avant le `db:migrate` de sa migration. Une
# fois celle-ci en prod, son fichier ne change plus ; rejouer ces ~300 tests sur chaque PR coûtait
# ~5 min de suite (mesuré le 2026-11-21). Ils tournent la nuit et à la main, plus sur les PR :
#
#   - sauf un test marqué que la PR ajoute ou modifie ;
#   - sauf un test marqué dont la PR modifie (ou ajoute) une migration citée ;
#   - aucun n'est laissé de côté si la PR touche :
#       · une migration qui n'est ni un rangement (`*rangement*.sql`) ni un contenu (`*_contenu.sql`),
#         ou un autre fichier de `supabase/` : ces tests rejouent leur migration sous le schéma
#         COURANT (triggers de garde des tags compris), qu'une telle PR peut changer ;
#       · l'outillage de la suite (`tests/helpers/**`, `tests/integration/fixtures/**`, le
#         global-setup, les configs vitest, le verrou, le lockfile) ;
#       · la mention elle-même (`scripts/lib/migrations-de-donnees.ts`) ou ce script.
#
# La garde `pnpm check:migrations-de-donnees` refuse la mention sur un test dont la migration
# touche le schéma ou les règles d'accès : ceux-là tournent toujours.
#
# Seulement sur `pull_request` : le checkout est le commit de merge, dont le premier parent est la
# base ; `git diff HEAD^1 HEAD` = ce que la PR change (checkout avec fetch-depth: 2).
#
# Écrit `exclure=<tests séparés par des espaces>` (vide = rien n'est laissé de côté) sur la sortie
# standard (pour $GITHUB_OUTPUT), la raison sur l'erreur standard. Dans le doute : vide.
# Tests : scripts/__tests__/ci-integration-exclusions.test.ts.
set -uo pipefail

MENTION='@migration-de-donnees'

aucune() {
	echo "ci-integration-exclusions : $1 → tous les tests tournent" >&2
	echo "exclure="
	exit 0
}

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || aucune "pas une PR"
git rev-parse -q --verify HEAD^2 >/dev/null || aucune "pas un commit de merge"
changes="$(git diff --name-only --no-renames HEAD^1 HEAD 2>/dev/null)" || aucune "diff illisible"

while IFS= read -r f; do
	case "$f" in
	supabase/migrations/*rangement*.sql | supabase/migrations/*_contenu.sql) ;;
	supabase/*) aucune "$f : schéma ou base possiblement changés" ;;
	tests/helpers/* | tests/integration/fixtures/* | tests/integration/global-setup.ts | \
		vitest*.config.ts | scripts/with-db-lock.sh | scripts/lib/lock.py | \
		scripts/pile-de-test.sh | scripts/pile-de-test/* | pnpm-lock.yaml)
		aucune "$f : outillage de la suite"
		;;
	scripts/lib/migrations-de-donnees.ts | scripts/ci-integration-exclusions.sh) aucune "$f : la règle elle-même" ;;
	esac
done <<<"$changes"

marques="$(git grep -l -F -e "$MENTION" -- 'tests/integration/*.test.ts' 'tests/integration/**/*.test.ts' 2>/dev/null | sort -u)"
[ -n "$marques" ] || aucune "aucun test marqué"

exclure=()
gardes=0
while IFS= read -r t; do
	if grep -qxF -e "$t" <<<"$changes"; then
		gardes=$((gardes + 1))
		continue
	fi
	touche=""
	for m in $(grep -oE 'supabase/migrations/[0-9]{14}_[a-z0-9_]+\.sql' "$t" | sort -u); do
		grep -qxF -e "$m" <<<"$changes" && touche=1
	done
	if [ -n "$touche" ]; then
		gardes=$((gardes + 1))
		continue
	fi
	exclure+=("$t")
done <<<"$marques"

echo "ci-integration-exclusions : ${#exclure[@]} tests de migration de données laissés de côté, $gardes gardés (touchés par la PR)" >&2
echo "exclure=${exclure[*]-}"
