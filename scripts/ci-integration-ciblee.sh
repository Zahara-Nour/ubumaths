#!/bin/bash
# La PR n'ajoute-t-elle qu'une migration de données et son test ? (nightly-integration.yml)
#
# Cas visé : le rangement d'un lot de modèles de questions (nœud + tag), soit une migration
# AJOUTÉE sous supabase/migrations/, son test sous tests/integration/, les JSON du lot, la
# doc. La suite complète (~120 fichiers, ~19 min) ne peut alors changer de verdict que par
# la migration neuve : la stack démarre quand même en appliquant TOUTES les migrations (une
# erreur SQL fait échouer le job), et seuls les tests d'intégration de la PR tournent (~1 min).
# Le cron nocturne rejoue la suite complète sur main : c'est le filet.
#
# Ciblé seulement si TOUS les fichiers de la PR sont :
#   - une migration de rangement AJOUTÉE (`A supabase/migrations/*rangement*.sql`, nom de toutes
#     les migrations de lots) ou de contenu de modèles publiés AJOUTÉE, au nom que lui donne
#     son générateur `scripts/questions/migration-contenu.ts`
#     (`A supabase/migrations/<14 chiffres>_questions_<lot>_contenu.sql`) ET accompagnée de sa
#     fixture du même nom — une migration modifiée, ou d'un autre nom (schéma, règles d'accès,
#     fonctions), ou de contenu sans sa fixture → suite complète ;
#   - la fixture AJOUTÉE d'une migration de contenu
#     (`A tests/integration/fixtures/contenu-publie/<nom>.json`) : elle ajoute à la liste le test
#     qui rejoue toutes ces fixtures, `tests/integration/migrations-contenu-publie.test.ts` ;
#   - la fixture AJOUTÉE d'une migration de rangement générée par
#     `scripts/questions/migration-rangement.ts`
#     (`A tests/integration/fixtures/rangement-tags/<nom>.json`), accompagnée de SA migration
#     ajoutée du même nom : elle ajoute à la liste le test qui rejoue toutes ces fixtures,
#     `tests/integration/migrations-rangement-tags.test.ts` (une migration de rangement écrite à
#     la main n'a pas de fixture : elle vient avec son test, et sans aucun test dans la PR la
#     suite complète tourne) ;
#   - un test d'intégration ajouté ou modifié (`tests/integration/*.test.ts`, à la racine du
#     dossier : ni helpers, ni fixtures, ni global-setup) ;
#   - du contenu (`scripts/questions/**/*.json`), de la doc (`docs/**`), un `.md` hors
#     `src/`, `static/`, `data/` ;
# et s'il y a au moins un test d'intégration dans la PR. Sinon : suite complète.
#
# Seulement sur `pull_request` : le checkout est le commit de merge, dont le premier parent
# est la base ; `git diff HEAD^1 HEAD` = ce que la PR change (checkout avec fetch-depth: 2).
#
# Écrit `fichiers=<tests séparés par des espaces>` (vide = suite complète) sur la sortie
# standard (pour $GITHUB_OUTPUT), la raison sur l'erreur standard. Dans le doute : vide.
# Tests : scripts/__tests__/ci-integration-ciblee.test.ts.
set -uo pipefail

complete() {
	echo "ci-integration-ciblee : $1 → suite complète" >&2
	echo "fichiers="
	exit 0
}

[ "${GITHUB_EVENT_NAME:-}" = "pull_request" ] || complete "pas une PR"
git rev-parse -q --verify HEAD^2 >/dev/null || complete "pas un commit de merge"
lignes="$(git diff --name-status --no-renames HEAD^1 HEAD 2>/dev/null)" || complete "diff illisible"
[ -n "$lignes" ] || complete "aucun fichier changé"

tests=()
contenu=""
migrations_contenu=()
fixtures_contenu=" "
migrations_rangement=" "
fixtures_rangement=()
while IFS=$'\t' read -r statut f; do
	case "$f" in
	src/* | static/* | data/*) complete "$f touche le code ou des données servies" ;;
	supabase/migrations/*rangement*.sql)
		[ "$statut" = "A" ] || complete "$f : migration existante modifiée ($statut)"
		nom="${f#supabase/migrations/}"
		migrations_rangement+="${nom%.sql} "
		;;
	tests/integration/fixtures/rangement-tags/*.json)
		[ "$statut" = "A" ] || complete "$f : fixture de rangement existante modifiée ($statut)"
		nom="${f#tests/integration/fixtures/rangement-tags/}"
		fixtures_rangement+=("${nom%.json}")
		;;
	supabase/migrations/*_contenu.sql)
		[ "$statut" = "A" ] || complete "$f : migration existante modifiée ($statut)"
		nom="${f#supabase/migrations/}"
		nom="${nom%.sql}"
		[[ "$nom" =~ ^[0-9]{14}_questions_[a-z0-9_]+_contenu$ ]] ||
			complete "$f : migration de contenu qui n'a pas le nom du générateur"
		migrations_contenu+=("$nom")
		;;
	tests/integration/fixtures/contenu-publie/*.json)
		[ "$statut" = "A" ] || complete "$f : fixture de contenu existante modifiée ($statut)"
		nom="${f#tests/integration/fixtures/contenu-publie/}"
		fixtures_contenu+="${nom%.json} "
		contenu=1
		;;
	supabase/migrations/*) complete "$f : migration autre qu'un rangement" ;;
	tests/integration/*/*) complete "$f : outillage de la suite" ;;
	tests/integration/*.test.ts)
		[ "$statut" = "D" ] && complete "$f : test supprimé"
		tests+=("$f")
		;;
	scripts/questions/*.json | docs/* | *.md) ;;
	*) complete "$f n'est ni une migration ajoutée, ni un test d'intégration, ni du contenu" ;;
	esac
done <<<"$lignes"

# Les tests que la PR apporte elle-même (avant ceux qu'ajoutent les fixtures)
tests_de_la_pr="${#tests[@]}"

# Chaque migration de contenu arrive avec SA fixture : sinon le test ne la rejouerait pas
for nom in "${migrations_contenu[@]-}"; do
	[ -z "$nom" ] && continue
	case "$fixtures_contenu" in *" $nom "*) ;; *) complete "$nom : migration de contenu sans sa fixture" ;; esac
done

# Le test qui rejoue les fixtures de contenu, une seule fois (s'il est déjà dans la PR, il y est)
if [ -n "$contenu" ]; then
	t=tests/integration/migrations-contenu-publie.test.ts
	case " ${tests[*]-} " in *" $t "*) ;; *) tests+=("$t") ;; esac
fi

# Chaque fixture de rangement arrive avec SA migration (le test rejoue le fichier qu'elle nomme) ;
# le test qui rejoue ces fixtures, une seule fois
for nom in "${fixtures_rangement[@]-}"; do
	[ -z "$nom" ] && continue
	case "$migrations_rangement" in *" $nom "*) ;; *) complete "$nom : fixture de rangement sans sa migration" ;; esac
	t=tests/integration/migrations-rangement-tags.test.ts
	case " ${tests[*]-} " in *" $t "*) ;; *) tests+=("$t") ;; esac
done

# Une migration de rangement sans fixture est écrite à la main : elle vient avec SON test, que le
# test des fixtures ne remplace pas
for nom in $migrations_rangement; do
	case " ${fixtures_rangement[*]-} " in *" $nom "*) continue ;; esac
	[ "$tests_de_la_pr" -gt 0 ] || complete "$nom : migration de rangement sans fixture ni test dans la PR"
done

[ "${#tests[@]}" -gt 0 ] || complete "aucun test d'intégration dans la PR"

echo "ci-integration-ciblee : migration de rangement et son test → ${tests[*]}" >&2
echo "fichiers=${tests[*]}"
