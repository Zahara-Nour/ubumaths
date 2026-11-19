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
# - serveur de dev trop gros ou trop vieux, Chrome trop gourmand, swap trop plein
#   → prévient seulement.
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
SEUIL_CHROME_CPU="${SEUIL_CHROME_CPU:-300}"          # CPU cumulé de Chrome, en %
SEUIL_CHROME_ONGLETS="${SEUIL_CHROME_ONGLETS:-60}"   # processus d'onglets Chrome
SEUIL_SWAP_POURCENT="${SEUIL_SWAP_POURCENT:-85}"     # swap utilisé / swap total
SURVEILLANCE_RAPPEL_MIN="${SURVEILLANCE_RAPPEL_MIN:-60}"

ETAT="${SURVEILLANCE_ETAT:-$HOME/.local/state/surveillance-machine}"
CONFIG="${SURVEILLANCE_CONFIG:-$HOME/.config/surveillance-machine}"
NTFY_SERVEUR="${NTFY_SERVEUR:-https://ntfy.sh}"
TUER="${SURVEILLANCE_TUER:-kill}"
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
	curl -s -m 10 -o /dev/null -H "Title: Mac mini" -H "Tags: warning" \
		-d "$message" "$NTFY_SERVEUR/$canal" || journaliser "échec de l'envoi ntfy"
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

marquer() {
	[ "$essai" = 1 ] || date +%s >"$ETAT/alerte-$1"
}

# Âge en secondes d'un champ etime de ps : [[jj-]hh:]mm:ss.
secondes_depuis_etime() {
	local e="$1" jours=0 h=0 m=0 s=0
	if [[ "$e" == *-* ]]; then
		jours="${e%%-*}"
		e="${e#*-}"
	fi
	IFS=: read -r -a parts <<<"$e"
	case "${#parts[@]}" in
	3) h="${parts[0]}" m="${parts[1]}" s="${parts[2]}" ;;
	2) m="${parts[0]}" s="${parts[1]}" ;;
	*) s="${parts[0]}" ;;
	esac
	echo $(((10#$jours * 86400) + (10#$h * 3600) + (10#$m * 60) + 10#$s))
}

# Vrai si <dossier> est dans le dépôt principal (même règle que garde-dev-depot-principal.sh).
dans_depot_principal() {
	local dossier_git dossier_commun
	dossier_git="$(git -C "$1" rev-parse --path-format=absolute --git-dir 2>/dev/null)" || return 1
	dossier_commun="$(git -C "$1" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 1
	[ "$dossier_git" = "$dossier_commun" ]
}

# ── Contrôles ──────────────────────────────────────────────────────────────────

if [ "$test_notif" = 1 ]; then
	envoyer "Test de la surveillance : les alertes arriveront ici."
	journaliser "notification de test"
	exit 0
fi

alertes=()

# 1. Serveurs de dev : le processus node qui exécute vite (pas l'enveloppe pnpm,
# ni le `sh -c "… && vite dev"` du script `dev`).
while read -r pid rss etime commande; do
	[ -n "$pid" ] || continue
	dossier="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"
	[ -n "$dossier" ] || continue
	port="$(sed -n 's/.*--port[= ]\([0-9]*\).*/\1/p' <<<"$commande")"
	port="${port:-?}"
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
done < <(ps -Ao pid=,rss=,etime=,command= | awk '$4 ~ /(^|\/)node$/ && /vite(\.js)? dev/ {print}')

# 2. Chrome : CPU cumulé et nombre de processus d'onglets.
read -r chrome_cpu chrome_onglets chrome_actifs < <(
	ps -Ao pcpu=,command= | awk '
		/Google Chrome/ { cpu += $1 }
		/Google Chrome/ && /--type=renderer/ { onglets++; if ($1 > 20) actifs++ }
		END { printf "%d %d %d\n", cpu, onglets, actifs }'
)
if [ "$chrome_cpu" -gt "$SEUIL_CHROME_CPU" ] || [ "$chrome_onglets" -gt "$SEUIL_CHROME_ONGLETS" ]; then
	if a_renvoyer chrome; then
		alertes+=("Chrome : $chrome_cpu % CPU, $chrome_onglets onglets dont $chrome_actifs actifs.")
		marquer chrome
		journaliser "alerte : Chrome $chrome_cpu % CPU, $chrome_onglets onglets ($chrome_actifs actifs)"
	fi
fi

# 3. Swap : « total = 12288.00M  used = 11540.94M  free = 747.06M ».
read -r swap_total swap_utilise < <(
	sysctl -n vm.swapusage | awk '{
		for (i = 1; i <= NF; i++) { if ($i == "total") t = $(i + 2); if ($i == "used") u = $(i + 2) }
		printf "%d %d\n", t, u }'
)
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

# ── Envoi groupé ───────────────────────────────────────────────────────────────

if [ "${#alertes[@]}" -gt 0 ]; then
	envoyer "$(printf '%s\n' "${alertes[@]}")"
elif [ "$essai" = 1 ]; then
	echo "RAS"
fi
exit 0
