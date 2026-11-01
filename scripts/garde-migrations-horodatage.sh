#!/bin/bash
# Garde : les migrations neuves d'une branche ne prennent pas un horodatage déjà
# pris sur origin/main, et ne passent pas avant la dernière migration de main.
#
# Supabase identifie une migration par son horodatage (`schema_migrations.version`).
# Le test `src/lib/__tests__/migrations-horodatage-unique.test.ts` ne voit le doublon
# que si la CI tourne sur le main qui le contient : la protection de main n'exige
# pas une branche à jour, donc une PR verte sur un main périmé peut être mergée et
# casser main pour toutes les PR (2026-11-01 : `20261101215000` pris par les lots
# 1re spé suites et 4e lot 8). Cette garde relit origin/main au moment même :
#
#   bash scripts/garde-migrations-horodatage.sh          # HEAD (hook pre-push)
#   bash scripts/garde-migrations-horodatage.sh --pr 12  # la PR 12, juste avant `gh pr merge`
#   bash scripts/garde-migrations-horodatage.sh --prochain  # l'horodatage à donner à une migration neuve
#
# `--prochain` (`pnpm migration:horodatage`) : l'heure réelle UTC à la seconde, toujours (une
# seconde de plus seulement si elle est déjà prise). Plus de « dernière migration + n » : quand
# main était en avance sur l'horloge (horodatages ronds posés à la main), toutes les sessions se
# serraient sur les mêmes secondes (2026-11-01 : 20261101224701 puis 224702 pris deux fois).
# Jamais un nombre rond choisi à la main.
#
# Refuse (exit 1) :
#   - une migration neuve dont l'horodatage est déjà pris sur origin/main ;
#   - deux migrations de la branche au même horodatage.
# Une migration plus ancienne que la dernière de main PASSE : `pnpm db:migrate` joue
# `supabase db push --include-all`, qui l'accepte (sans cette option, db push la refuse,
# « inserted before the last migration »). Les migrations de lots, chacune sur ses propres
# lignes, ne dépendent pas de leur ordre ; une migration qui dépend d'une autre le dit dans son
# en-tête et attend son merge.
# Hors ligne, ou sans origin : passe, avec un avertissement (le garde-fou
# n'empêche pas de travailler ; la CI reste le filet). En CI (CI=true) : refuse,
# car la garde y est la porte de la CI (quality.yml, job `version`).
#
# Tests : scripts/__tests__/garde-migrations-horodatage.test.ts.
set -uo pipefail

DOSSIER=supabase/migrations

pr=""
prochain=""
if [ "${1:-}" = "--prochain" ]; then
	prochain=1
elif [ "${1:-}" = "--pr" ]; then
	pr="${2:-}"
	if ! [[ "$pr" =~ ^[0-9]+$ ]]; then
		echo "usage : garde-migrations-horodatage.sh [--pr <numéro> | --prochain]" >&2
		exit 2
	fi
fi

# Réseau qui ne répond pas : on n'attend pas le délai de connexion SSH.
# (remote en https : on abandonne si le débit reste nul 5 s).
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh} -o ConnectTimeout=5"
if ! git -c http.lowSpeedLimit=1 -c http.lowSpeedTime=5 fetch -q origin main 2>/dev/null || ! git rev-parse -q --verify origin/main >/dev/null; then
	if [ -z "$prochain" ] && [ -n "${CI:-}" ]; then
		# En CI, la garde est la porte : elle ne laisse pas passer à l'aveugle.
		echo "⛔ garde des migrations : origin/main injoignable en CI, porte fermée (relancer le run)." >&2
		exit 1
	fi
	if [ -z "$prochain" ]; then
		echo "⚠️  garde des migrations : origin/main injoignable, horodatages non vérifiés." >&2
		exit 0
	fi
	echo "⚠️  origin/main injoignable : horodatage calculé sur la copie locale de main." >&2
fi

cible=HEAD
if [ -n "$pr" ]; then
	if ! git fetch -q origin "pull/$pr/head" 2>/dev/null; then
		echo "⛔ PR #$pr introuvable sur origin." >&2
		exit 2
	fi
	cible="$(git rev-parse FETCH_HEAD)"
fi

# AAAAMMJJHHMMSS + n secondes, en vraie heure UTC (date BSD de macOS, sinon GNU) : jamais de
# seconde 60.
ajouter_secondes() {
	local e
	if e="$(date -u -j -f %Y%m%d%H%M%S "$1" +%s 2>/dev/null)"; then
		date -u -j -r "$((e + $2))" +%Y%m%d%H%M%S
	elif e="$(date -u -d "${1:0:8} ${1:8:2}:${1:10:2}:${1:12:2}" +%s 2>/dev/null)"; then
		date -u -d "@$((e + $2))" +%Y%m%d%H%M%S
	fi
}

liste() {
	git ls-tree --name-only "$1" -- "$DOSSIER/" 2>/dev/null | sed -n "s#^$DOSSIER/##p" | grep '\.sql$' | sort
}

sur_main="$(liste origin/main)"

if [ -n "$prochain" ]; then
	# Horodatages déjà pris : main et la branche (ses migrations neuves comprises).
	pris="$( (printf '%s\n' "$sur_main"; liste HEAD) | cut -d_ -f1 | grep -E '^[0-9]{14}$' | sort -u)"
	v="$(date -u +%Y%m%d%H%M%S)"
	while printf '%s\n' "$pris" | grep -qx "$v"; do
		v="$(ajouter_secondes "$v" 1)"
	done
	echo "$v"
	exit 0
fi
sur_cible="$(liste "$cible")"
neuves="$(comm -13 <(printf '%s\n' "$sur_main") <(printf '%s\n' "$sur_cible") | sed '/^$/d')"

erreurs=0

while IFS= read -r f; do
	[ -n "$f" ] || continue
	v="${f%%_*}"
	pris="$(printf '%s\n' "$sur_main" | grep "^${v}_" || true)"
	if [ -n "$pris" ]; then
		echo "⛔ $f : l'horodatage $v est déjà pris sur origin/main par $pris." >&2
		erreurs=1
	fi
done <<<"$neuves"

# Deux migrations neuves de la branche au même horodatage (un doublon déjà sur main
# n'est pas l'affaire de cette branche : il ne bloque pas son push).
doublons="$(printf '%s\n' "$neuves" | cut -d_ -f1 | sed '/^$/d' | sort | uniq -d)"
for v in $doublons; do
	echo "⛔ horodatage $v pris par plusieurs migrations de la branche : $(printf '%s\n' "$neuves" | grep "^${v}_" | tr '\n' ' ')" >&2
	erreurs=1
done

if [ "$erreurs" -ne 0 ]; then
	echo "   Renommer la migration (et son test d'intégration, qui la rejoue par son nom) avec" >&2
	echo "   l'horodatage que donne : pnpm migration:horodatage — jamais un nombre rond choisi à la main." >&2
	exit 1
fi
exit 0
