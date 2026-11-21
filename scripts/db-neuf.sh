#!/bin/bash
# `pnpm db:neuf` : la base de DEV remise à neuf en une commande.
#
#   db-neuf.sh [--oui]
#
# Efface la base de dev, la reconstruit (migrations + seeds), puis la remplit avec le contenu de
# la prod et les élèves fictifs (`db:seed-riche`). Geste RARE : au quotidien, `pnpm db:a-jour`
# (lancé tout seul par `pnpm dev`) met la base à jour sans rien effacer.
#
# Pourquoi une commande : `pnpm db:reset && pnpm db:seed-riche` relâchait le verrou entre les deux
# (une autre session pouvait s'y glisser), et effaçait la base avant de savoir si la prod, dont
# vient le contenu, répondait (docs/archive/wip/base-locale-progress.md § 14).
#
# Ordre, sous le verrou `supabase` d'un bout à l'autre :
#   1. la prod répond-elle ? Sinon on s'arrête, rien n'est effacé ;
#   2. la pile de dev est démarrée si elle ne tourne pas ;
#   3. la base est reconstruite (`db reset`) ;
#   4. elle est remplie (`db-seed-riche`).
#
# La base de dev est partagée par toutes les sessions : sans `--oui`, il faut taper « oui » ;
# sans terminal ni `--oui` (script, agent), refus. La pile de test n'est pas concernée.
#
# À lancer depuis la racine du dépôt.
set -uo pipefail
ici="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
racine="$PWD"
tsx="$racine/node_modules/.bin/tsx"
libelle="Une commande sur la base Supabase locale"

oui=0
for argument in "$@"; do
	case "$argument" in
		--oui) oui=1 ;;
		*)
			echo "⛔ usage : pnpm db:neuf [--oui]" >&2
			exit 1
			;;
	esac
done

# Le script se relance lui-même sous le verrou, avec cette variable. Elle ne suffit pas : posée à la
# main, sans le verrou, elle sauterait la confirmation. On exige donc que le verrou soit tenu.
if [ -n "${DB_NEUF_SOUS_VERROU:-}" ] && ! python3 "$ici/lib/lock.py" --tenu supabase; then
	echo "⛔ DB_NEUF_SOUS_VERROU est réservée au script : lancer \`pnpm db:neuf\`." >&2
	exit 1
fi

if [ -z "${DB_NEUF_SOUS_VERROU:-}" ]; then
	[ -f "$racine/supabase/config.toml" ] || {
		echo "⛔ supabase/config.toml introuvable : lancer depuis la racine du dépôt." >&2
		exit 1
	}
	[ -x "$tsx" ] || { echo "⛔ tsx introuvable ($tsx) : \`pnpm install\` d'abord." >&2; exit 1; }

	# Verrou tenu par une autre session : le dire tout de suite (exit 2), avant de poser la
	# question. On ne le garde pas pendant la question : une invite oubliée bloquerait tout le monde.
	python3 "$ici/lib/lock.py" supabase "$libelle" -- true || exit $?

	if [ "$oui" = 0 ]; then
		if [ ! -t 0 ]; then
			echo "⛔ \`pnpm db:neuf\` efface la base de dev de TOUTES les sessions." >&2
			echo "   Sans terminal pour confirmer : relancer avec \`--oui\`." >&2
			exit 1
		fi
		echo "⚠️  La base de dev va être EFFACÉE puis reconstruite (contenu de la prod, élèves fictifs)."
		echo "   Elle est partagée par toutes les sessions et tous les worktrees."
		printf '   Taper « oui » pour continuer : '
		read -r reponse
		[ "$reponse" = "oui" ] || { echo "Abandon : rien n’est effacé."; exit 1; }
	fi

	DB_NEUF_SOUS_VERROU=1 exec bash "$ici/with-db-lock.sh" bash "$ici/db-neuf.sh"
fi

# ── Sous le verrou ──────────────────────────────────────────────────────────────────────────────
SECONDS=0

echo "▶ 1/4 La prod répond-elle ? (le contenu vient d'elle, en lecture seule)"
"$tsx" "$ici/db-seed-riche/index.ts" --verifier-prod || {
	echo "⛔ Vérification de la prod en échec (cause ci-dessus) : rien n’est effacé." >&2
	exit 1
}

echo "▶ 2/4 Pile de dev démarrée"
bash "$ici/pile-de-dev.sh" start || {
	echo "⛔ La pile de dev ne démarre pas : rien n’est effacé." >&2
	exit 1
}

echo "▶ 3/4 Reconstruction de la base (migrations + seeds)"
bash "$ici/pile-de-dev.sh" db reset || {
	echo "⛔ Reconstruction en échec : la base de dev est peut-être incomplète." >&2
	echo "   Corriger la cause affichée ci-dessus, puis relancer \`pnpm db:neuf\`." >&2
	exit 1
}

echo "▶ 4/4 Contenu de la prod et élèves fictifs"
"$tsx" "$ici/db-seed-riche/index.ts" || {
	echo "⛔ Remplissage en échec : la base est reconstruite (migrations + comptes de dev)," >&2
	echo "   mais le contenu de la prod manque ou est incomplet. Relancer \`pnpm db:seed-riche\`." >&2
	exit 1
}

echo "✅ Base de dev remise à neuf en $SECONDS s."
