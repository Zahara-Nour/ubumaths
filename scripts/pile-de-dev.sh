#!/bin/bash
# Lance la CLI Supabase sur la pile de DEV, avec les versions de la CI.
#
#   pile-de-dev.sh start | stop | db reset | …   (arguments passés tels quels à la CLI)
#
# Pourquoi : `supabase link` écrit dans `supabase/.temp/` les versions des services de la prod
# (`postgres-version`, `rest-version`, `storage-version`, `gotrue-version`, `storage-migration`),
# et la CLI les impose ensuite à la pile locale. La CI et les worktrees n'ont pas ce dossier
# (ignoré par git) : le dépôt principal tournait sur d'autres images qu'eux, et avec le Postgres
# de la prod la base ne se reconstruisait plus (docs/wip/base-locale-progress.md § 3.2).
#
# Comment : la CLI travaille dans un dossier miroir (`--workdir`) qui montre tout `supabase/`
# par des liens, sauf `.temp` et `.branches`. Sans `.temp`, elle prend ses versions par défaut,
# celles de la CI (même CLI, version exacte dans package.json). Le nom du projet et les ports
# viennent de `config.toml` : c'est bien la même pile, les mêmes volumes.
#
# `supabase/.temp/` n'est jamais touché : `pnpm db:migrate`, `db:link` et `db:types` (la prod)
# y lisent `project-ref`, et ne passent PAS par ce script. Un nouveau `pnpm db:link` peut donc
# réécrire les versions de la prod sans rien changer à la pile de dev.
#
# À lancer depuis la racine du dépôt, sous le verrou `supabase` (`with-db-lock.sh`), comme le
# font `pnpm db:start`, `db:stop` et `db:reset`.
set -euo pipefail

[ "$#" -gt 0 ] || { echo "⛔ usage : pile-de-dev.sh <commande de la CLI supabase…>" >&2; exit 1; }

racine="$PWD"
source="$racine/supabase"
[ -f "$source/config.toml" ] || {
	echo "⛔ supabase/config.toml introuvable : lancer depuis la racine du dépôt." >&2
	exit 1
}

travail="$racine/node_modules/.cache/pile-de-dev"
miroir="$travail/supabase"

# Refait à chaque lancement : il ne contient que des liens, plus le `.temp` de la CLI. Un fichier
# ajouté ou retiré dans `supabase/` est donc toujours vu, et rien n'y survit d'un lancement à
# l'autre. `rm -rf` retire les liens, jamais ce qu'ils désignent.
rm -rf "$miroir"
mkdir -p "$miroir"
for entree in "$source"/* "$source"/.[!.]*; do
	[ -e "$entree" ] || continue
	nom="$(basename "$entree")"
	case "$nom" in .temp | .branches) continue ;; esac
	ln -s "$entree" "$miroir/$nom"
done

exec "$racine/node_modules/.bin/supabase" --workdir "$travail" "$@"
