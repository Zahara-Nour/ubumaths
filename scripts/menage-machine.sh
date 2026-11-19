#!/bin/bash
# Ménage du Mac mini quand la charge est trop grande : `pnpm menage [--essai]`.
# Lancé aussi par surveillance-machine.sh quand le swap dépasse SEUIL_MENAGE_SWAP
# (le gel est proche : 2026-11-19, swap 11,5 Go sur 12, Mac figé).
#
# - onglets Chrome au-dessus de SEUIL_MENAGE_ONGLET_CPU % de CPU → fermés (Chrome
#   reste ouvert, l'onglet se recharge d'un clic ; les extensions sont épargnées) ;
# - serveurs de dev de NOTRE dépôt lancés depuis plus de SEUIL_MENAGE_SERVEUR_HEURES h,
#   ou lancés dans le dépôt principal → arrêtés (jamais ceux d'un autre projet).
# Dernière ligne de la sortie = le résumé (repris tel quel dans la notification).
#
# Tests : scripts/__tests__/menage-machine.test.ts.
set -uo pipefail

SEUIL_MENAGE_ONGLET_CPU="${SEUIL_MENAGE_ONGLET_CPU:-20}"
SEUIL_MENAGE_SERVEUR_HEURES="${SEUIL_MENAGE_SERVEUR_HEURES:-6}"
TUER="${SURVEILLANCE_TUER:-kill}"

# shellcheck source=machine-commun.sh
source "$(dirname "$0")/machine-commun.sh"
initialiser_depot "$(dirname "$0")"

essai=0
case "${1:-}" in
--essai) essai=1 ;;
"") ;;
*)
	echo "Usage : $0 [--essai]" >&2
	exit 2
	;;
esac

arreter() {
	[ "$essai" = 1 ] || "$TUER" "$1" 2>/dev/null || true
}

# 1. Onglets Chrome gourmands (processus de rendu, hors extensions).
onglets=0
for pid in $(ps -Ao pid=,pcpu=,command= | awk -v seuil="$SEUIL_MENAGE_ONGLET_CPU" \
	'/Google Chrome/ && /--type=renderer/ && !/--extension-process/ && $2 > seuil {print $1}'); do
	arreter "$pid"
	onglets=$((onglets + 1))
done

# 2. Serveurs de dev oubliés de notre dépôt.
serveurs=0
ports=""
while read -r pid rss etime commande; do
	[ -n "$pid" ] || continue
	dossier="$(dossier_du_processus "$pid")"
	[ -n "$dossier" ] || continue
	de_notre_depot "$dossier" || continue
	heures=$(($(secondes_depuis_etime "$etime") / 3600))
	if [ "$heures" -ge "$SEUIL_MENAGE_SERVEUR_HEURES" ] || dans_depot_principal "$dossier"; then
		port="$(port_de_commande "$commande")"
		[ "$essai" = 1 ] && echo "serveur de dev :$port (pid $pid, $((rss / 1024)) Mo, ${heures} h) dans $dossier"
		arreter "$pid"
		serveurs=$((serveurs + 1))
		ports="$ports :$port"
	fi
done < <(serveurs_vite)

prefixe="Ménage"
[ "$essai" = 1 ] && prefixe="Ménage (essai, rien n'est fermé)"
resume="$prefixe : $onglets onglet(s) Chrome fermé(s), $serveurs serveur(s) de dev arrêté(s)"
[ -n "$ports" ] && resume="$resume ($(echo "$ports" | sed 's/^ //'))"
echo "$resume."
exit 0
