#!/bin/bash
# Lance la CLI Supabase sur la pile de DEV, avec les versions de la CI.
#
#   pile-de-dev.sh start | stop | db reset | …   (arguments passés tels quels à la CLI)
#
# Pourquoi : `supabase link` écrit dans `supabase/.temp/` les versions des services de la prod
# (`postgres-version`, `rest-version`, `storage-version`, `gotrue-version`, `storage-migration`),
# et la CLI les impose ensuite à la pile locale. La CI et les worktrees n'ont pas ce dossier
# (ignoré par git) : le dépôt principal tournait sur d'autres images qu'eux, et avec le Postgres
# de la prod la base ne se reconstruisait plus (docs/archive/wip/base-locale-progress.md § 3.2).
#
# Comment : la CLI travaille dans un dossier miroir (`--workdir`) qui montre tout `supabase/`
# par des liens, sauf `.temp` et `.branches`. Sans `.temp`, elle prend ses versions par défaut,
# celles de la CI (même CLI, version exacte dans package.json). Le nom du projet et les ports
# viennent de `config.toml` : c'est bien la même pile, les mêmes volumes.
#
# `supabase/.temp/` n'est jamais touché : `pnpm db:migrate` et `db:link` (la prod)
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

cli="$racine/node_modules/.bin/supabase"
[ -x "$cli" ] || { echo "⛔ CLI Supabase introuvable ($cli) : \`pnpm install\` d'abord." >&2; exit 1; }

travail="$racine/node_modules/.cache/pile-de-dev"
miroir="$travail/supabase"

# Refait à chaque lancement : il ne contient que des liens, plus le `.temp` de la CLI. Un fichier
# ajouté ou retiré dans `supabase/` est donc toujours vu, et rien n'y survit d'un lancement à
# l'autre. Construit à côté puis mis en place d'un coup : un autre lancement (hors verrou, à la
# main) ne lit jamais un miroir à moitié fait. `rm -rf` retire les liens, jamais ce qu'ils désignent.
mkdir -p "$travail"
neuf="$(mktemp -d "$travail/supabase.XXXXXX")"
for entree in "$source"/* "$source"/.[!.]*; do
	# Un motif sans correspondance reste tel quel ; un lien cassé (-L) est gardé, la CLI le dira.
	[ -e "$entree" ] || [ -L "$entree" ] || continue
	nom="$(basename "$entree")"
	case "$nom" in .temp | .branches) continue ;; esac
	ln -s "$entree" "$neuf/$nom"
done
rm -rf "$miroir"
mv "$neuf" "$miroir"

exec "$cli" --workdir "$travail" "$@"
