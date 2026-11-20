#!/bin/bash
# Ménage du Mac mini quand la charge est trop grande : `pnpm menage [--essai]`.
# Lancé aussi par surveillance-machine.sh quand le swap dépasse SEUIL_MENAGE_SWAP
# (le gel est proche : 2026-11-19, swap 11,5 Go sur 12, Mac figé).
#
# - onglets Chrome et Brave au-dessus de SEUIL_MENAGE_ONGLET_CPU % de CPU → fermés
#   (le navigateur reste ouvert, l'onglet se recharge d'un clic). Épargnés : les
#   extensions (surveillance-machine.sh les signale), et le Chrome for Testing de
#   Playwright (installé hors de /Applications, il porterait des tests en cours) ;
# - serveurs de dev de NOTRE dépôt lancés depuis plus de SEUIL_MENAGE_SERVEUR_HEURES h,
#   ou lancés dans le dépôt principal → arrêtés (jamais ceux d'un autre projet, ni
#   le serveur de test de David sur le port PORT_DAVID) ;
# - processus de test orphelins (orphelins_de_test de machine-commun.sh) → fermés.
# Dernière ligne de la sortie = le résumé (repris tel quel dans la notification).
#
# Tests : scripts/__tests__/surveillance-machine.test.ts.
set -uo pipefail

SEUIL_MENAGE_ONGLET_CPU="${SEUIL_MENAGE_ONGLET_CPU:-20}"
SEUIL_MENAGE_SERVEUR_HEURES="${SEUIL_MENAGE_SERVEUR_HEURES:-6}"
TUER="${SURVEILLANCE_TUER:-kill}"
PORT_DAVID=5173

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

# 1. Onglets Chrome et Brave gourmands (processus de rendu, hors extensions).
onglets=0
for pid in $(ps -Ao pid=,pcpu=,command= | awk -v seuil="$SEUIL_MENAGE_ONGLET_CPU" \
	'(/\/Applications\/Google Chrome\.app\// || /\/Applications\/Brave Browser\.app\//) &&
	/--type=renderer/ && !/--extension-process/ && $2 > seuil {print $1}'); do
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
	port="$(port_de_commande "$commande")"
	[ "$port" = "$PORT_DAVID" ] && continue
	heures=$(($(secondes_depuis_etime "$etime") / 3600))
	if [ "$heures" -ge "$SEUIL_MENAGE_SERVEUR_HEURES" ] || dans_depot_principal "$dossier"; then
		[ "$essai" = 1 ] && echo "serveur de dev :$port (pid $pid, $((rss / 1024)) Mo, ${heures} h) dans $dossier"
		arreter "$pid"
		serveurs=$((serveurs + 1))
		ports="$ports :$port"
	fi
done < <(serveurs_vite)

# 3. Processus de test orphelins.
orphelins=0
while read -r pid nom age rss; do
	[ -n "$pid" ] || continue
	[ "$essai" = 1 ] && echo "orphelin de test $nom (pid $pid, $(duree_lisible "$age"), $((rss / 1024)) Mo)"
	arreter "$pid"
	orphelins=$((orphelins + 1))
done < <(orphelins_de_test)

prefixe="Ménage"
[ "$essai" = 1 ] && prefixe="Ménage (essai, rien n'est fermé)"
resume="$prefixe : $onglets onglet(s) Chrome/Brave fermé(s), $serveurs serveur(s) de dev arrêté(s)"
[ -n "$ports" ] && resume="$resume ($(echo "$ports" | sed 's/^ //'))"
[ "$orphelins" -gt 0 ] && resume="$resume, $orphelins orphelin(s) de test fermé(s)"
echo "$resume."
exit 0
