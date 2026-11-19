#!/bin/bash
# Surveillance du Mac mini : serveurs de dev oubliés, Chrome emballé, swap plein.
#
# Lancée toutes les 5 minutes par launchd (scripts/surveillance-machine-installer.sh).
# Le 2026-11-19, le Mac a gelé : 62 onglets Chrome à ~1 170 % de CPU, un `vite dev`
# laissé 4 h dans le dépôt principal (2,5 Go), swap à 11,5 Go sur 12.
#
# Ce qu'elle fait :
# - serveur de dev dans le dépôt principal → l'ARRÊTE (cas sûr : on le relance
#   en une commande, et la règle l'interdit) et prévient ;
# - serveur de dev trop gros ou trop vieux, Chrome trop gourmand, swap trop plein,
#   extension de Chrome ou de Brave bloquée (CPU au plafond, des heures de CPU
#   cumulées : 2 extensions à 100 % pendant 10 jours le 2026-11-19) → prévient
#   seulement ;
# - swap au-delà de SEUIL_MENAGE_SWAP (gel proche) → lance menage-machine.sh
#   (onglets Chrome gourmands fermés, serveurs de dev oubliés arrêtés) et en
#   envoie le résumé.
# Alerte = notification ntfy.sh (canal au nom aléatoire, lu dans
# ~/.config/surveillance-machine/ntfy-topic) + ligne dans le journal. Le message
# envoyé ne contient que des chiffres et des ports : ni chemin, ni nom de projet.
# Une même alerte n'est renvoyée qu'après SURVEILLANCE_RAPPEL_MIN minutes.
#
# Usage : surveillance-machine.sh [--essai] [--test]
#   --essai : affiche ce qu'elle ferait, n'arrête rien et n'envoie rien ;
#   --test  : envoie une notification de test.
#
# Tests : scripts/__tests__/surveillance-machine.test.ts.
set -uo pipefail

# ── Seuils (surchargeables par l'environnement) ────────────────────────────────
SEUIL_SERVEUR_MO="${SEUIL_SERVEUR_MO:-1500}"         # mémoire d'un serveur de dev
SEUIL_SERVEUR_HEURES="${SEUIL_SERVEUR_HEURES:-6}"    # âge d'un serveur de dev
SEUIL_CHROME_CPU="${SEUIL_CHROME_CPU:-600}"          # CPU cumulé de Chrome, en %
SEUIL_CHROME_ONGLETS="${SEUIL_CHROME_ONGLETS:-60}"   # processus d'onglets Chrome
SEUIL_EXTENSION_CPU="${SEUIL_EXTENSION_CPU:-90}"      # CPU d'un processus d'extension, en %
SEUIL_EXTENSION_HEURES="${SEUIL_EXTENSION_HEURES:-1}" # temps CPU cumulé de ce processus
SEUIL_SWAP_POURCENT="${SEUIL_SWAP_POURCENT:-85}"     # swap utilisé / swap total
SEUIL_MENAGE_SWAP="${SEUIL_MENAGE_SWAP:-95}"         # swap au-delà duquel le ménage part seul
SURVEILLANCE_RAPPEL_MIN="${SURVEILLANCE_RAPPEL_MIN:-60}"
SURVEILLANCE_MENAGE_PAUSE_MIN="${SURVEILLANCE_MENAGE_PAUSE_MIN:-15}"

ETAT="${SURVEILLANCE_ETAT:-$HOME/.local/state/surveillance-machine}"
CONFIG="${SURVEILLANCE_CONFIG:-$HOME/.config/surveillance-machine}"
NTFY_SERVEUR="${NTFY_SERVEUR:-https://ntfy.sh}"
TUER="${SURVEILLANCE_TUER:-kill}"
MENAGE="${SURVEILLANCE_MENAGE:-$(dirname "$0")/menage-machine.sh}"
JOURNAL="$ETAT/journal.log"

essai=0
test_notif=0
for arg in "$@"; do
	case "$arg" in
	--essai) essai=1 ;;
	--test) test_notif=1 ;;
	*)
		echo "Usage : $0 [--essai] [--test]" >&2
		exit 2
		;;
	esac
done

mkdir -p "$ETAT"

# ── Outils ─────────────────────────────────────────────────────────────────────

journaliser() {
	[ "$essai" = 1 ] && return 0
	printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >>"$JOURNAL"
}

# Envoie le message ntfy (sauf en --essai). Sans canal configuré : journal seul.
envoyer() {
	local message="$1"
	if [ "$essai" = 1 ]; then
		printf 'ENVOI : %s\n' "$message"
		return 0
	fi
	local fichier_canal="$CONFIG/ntfy-topic"
	if [ ! -s "$fichier_canal" ]; then
		journaliser "pas de canal ntfy ($fichier_canal) : alerte non envoyée"
		return 0
	fi
	local canal
	canal="$(tr -d '[:space:]' <"$fichier_canal")"
	if ! curl -sf -m 10 -o /dev/null -H "Title: Mac mini" -H "Tags: warning" \
		-d "$message" "$NTFY_SERVEUR/$canal"; then
		journaliser "échec de l'envoi ntfy : alerte retentée au prochain passage"
		return 1
	fi
}

# Vrai si l'alerte <cle> n'a pas été envoyée depuis SURVEILLANCE_RAPPEL_MIN minutes.
a_renvoyer() {
	local marque="$ETAT/alerte-$1"
	[ -f "$marque" ] || return 0
	local maintenant derniere
	maintenant="$(date +%s)"
	derniere="$(cat "$marque" 2>/dev/null || echo 0)"
	[ $((maintenant - derniere)) -ge $((SURVEILLANCE_RAPPEL_MIN * 60)) ]
}

# Les alertes de ce passage ; marquées seulement une fois l'envoi réussi.
a_marquer=()
marquer() {
	a_marquer+=("$1")
}

# shellcheck source=machine-commun.sh
source "$(dirname "$0")/machine-commun.sh"
initialiser_depot "$(dirname "$0")"

# ── Contrôles ──────────────────────────────────────────────────────────────────

if [ "$test_notif" = 1 ]; then
	envoyer "Test de la surveillance : les alertes arriveront ici."
	journaliser "notification de test"
	exit 0
fi

alertes=()

# 1. Serveurs de dev.
while read -r pid rss etime commande; do
	[ -n "$pid" ] || continue
	dossier="$(dossier_du_processus "$pid")"
	[ -n "$dossier" ] || continue
	port="$(port_de_commande "$commande")"
	mo=$((rss / 1024))
	heures=$(($(secondes_depuis_etime "$etime") / 3600))

	if dans_depot_principal "$dossier"; then
		if [ "$essai" = 1 ]; then
			echo "ARRÊT : serveur de dev :$port (pid $pid) dans le dépôt principal $dossier"
		else
			"$TUER" "$pid" 2>/dev/null
			journaliser "arrêté : serveur de dev :$port (pid $pid, $mo Mo, ${heures} h) dans $dossier"
		fi
		alertes+=("Serveur de dev :$port arrêté (dépôt principal, $mo Mo, ${heures} h).")
		continue
	fi

	if [ "$mo" -gt "$SEUIL_SERVEUR_MO" ] || [ "$heures" -ge "$SEUIL_SERVEUR_HEURES" ]; then
		if a_renvoyer "serveur-$pid"; then
			alertes+=("Serveur de dev :$port : $mo Mo, ${heures} h.")
			marquer "serveur-$pid"
			journaliser "alerte : serveur de dev :$port (pid $pid, $mo Mo, ${heures} h) dans $dossier"
		fi
	fi
done < <(serveurs_vite)

# 2. Chrome : CPU cumulé et nombre de processus d'onglets (Chrome de /Applications
#    seulement : le Chrome for Testing de Playwright n'est pas celui de David).
read -r chrome_cpu chrome_onglets chrome_actifs < <(
	ps -Ao pcpu=,command= | awk '
		/\/Applications\/Google Chrome\.app\// { cpu += $1 }
		/\/Applications\/Google Chrome\.app\// && /--type=renderer/ { onglets++; if ($1 > 20) actifs++ }
		END { printf "%d %d %d\n", cpu, onglets, actifs }'
)
if [ "$chrome_cpu" -gt "$SEUIL_CHROME_CPU" ] || [ "$chrome_onglets" -gt "$SEUIL_CHROME_ONGLETS" ]; then
	if a_renvoyer chrome; then
		alertes+=("Chrome : $chrome_cpu % CPU, $chrome_onglets onglets dont $chrome_actifs actifs.")
		marquer chrome
		journaliser "alerte : Chrome $chrome_cpu % CPU, $chrome_onglets onglets ($chrome_actifs actifs)"
	fi
fi

# 2 bis. Extensions bloquées : CPU au plafond ET des heures de CPU cumulées (un pic
#    bref n'en est pas une). Jamais arrêtées : on ne sait pas laquelle c'est.
#    time= de ps (macOS) : « minutes:secondes.centièmes ».
while read -r pid cpu temps commande; do
	[ -n "$pid" ] || continue
	case "$commande" in
	*"/Applications/Google Chrome.app/"*) navigateur=Chrome ;;
	*"/Applications/Brave Browser.app/"*) navigateur=Brave ;;
	*) continue ;;
	esac
	cpu_entier="${cpu%%.*}"
	heures_cpu=$(($(secondes_depuis_etime "${temps%%.*}") / 3600))
	[ "$cpu_entier" -ge "$SEUIL_EXTENSION_CPU" ] && [ "$heures_cpu" -ge "$SEUIL_EXTENSION_HEURES" ] || continue
	if a_renvoyer "extension-$pid"; then
		alertes+=("Extension $navigateur bloquée : $cpu_entier % CPU, $heures_cpu h de CPU cumulées.")
		marquer "extension-$pid"
		journaliser "alerte : extension $navigateur (pid $pid) $cpu_entier % CPU, $heures_cpu h de CPU"
	fi
done < <(ps -Ao pid=,pcpu=,time=,command= | awk '/--extension-process/')

# 3. Swap.
swap_pourcent=0
read -r swap_total swap_utilise < <(lire_swap)
if [ "${swap_total:-0}" -gt 0 ]; then
	swap_pourcent=$((swap_utilise * 100 / swap_total))
	if [ "$swap_pourcent" -ge "$SEUIL_SWAP_POURCENT" ]; then
		if a_renvoyer swap; then
			alertes+=("Swap : $swap_pourcent % ($((swap_utilise / 1024)) Go sur $((swap_total / 1024)) Go).")
			marquer swap
			journaliser "alerte : swap $swap_pourcent % ($swap_utilise Mo / $swap_total Mo)"
		fi
	fi
fi

# 4. Gel proche : ménage automatique (au plus une fois par SURVEILLANCE_MENAGE_PAUSE_MIN).
if [ "$swap_pourcent" -ge "$SEUIL_MENAGE_SWAP" ]; then
	marque_menage="$ETAT/menage"
	derniere=0
	[ -f "$marque_menage" ] && derniere="$(cat "$marque_menage" 2>/dev/null || echo 0)"
	if [ $(($(date +%s) - derniere)) -ge $((SURVEILLANCE_MENAGE_PAUSE_MIN * 60)) ]; then
		options=()
		[ "$essai" = 1 ] && options=(--essai)
		resume="$(/bin/bash "$MENAGE" ${options[@]+"${options[@]}"} 2>/dev/null | tail -1)"
		[ "$essai" = 1 ] || date +%s >"$marque_menage"
		alertes+=("${resume:-Ménage : échec du lancement.}")
		journaliser "ménage automatique (swap $swap_pourcent %) : $resume"
	fi
fi

# ── Envoi groupé ───────────────────────────────────────────────────────────────

if [ "${#alertes[@]}" -gt 0 ]; then
	if envoyer "$(printf '%s\n' "${alertes[@]}")" && [ "$essai" = 0 ] && [ "${#a_marquer[@]}" -gt 0 ]; then
		for cle in "${a_marquer[@]}"; do
			date +%s >"$ETAT/alerte-$cle"
		done
	fi
elif [ "$essai" = 1 ]; then
	echo "RAS"
fi
exit 0
