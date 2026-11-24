#!/bin/bash
# Bilan du Mac mini : l'état de la machine en une page, à la demande (`pnpm machine:bilan`).
#
# La surveillance (surveillance-machine.sh) ne parle que quand un seuil est franchi ;
# son --essai répond « RAS » sur une machine saine. Le 2026-11-22, aucune commande ne
# montrait d'un coup 32 sessions Claude ouvertes (9 Go), le processus graphique de
# Chrome à 100 % depuis 12 jours, ni Chrome bloqué (processus morts jamais ramassés).
#
# Ce qu'il affiche (il ne fait RIEN : ni arrêt, ni envoi, ni écriture) :
# - charge, mémoire, pression, mémoire compressée, swap ;
# - programmes qui prennent le plus de mémoire et de CPU (regroupés) ;
# - processus emballés : n'importe quel processus au plafond de CPU depuis des heures
#   (pas seulement les extensions), et processus morts non ramassés par leur parent ;
# - sessions Claude par âge ;
# - serveurs de dev (port, worktree, âge, mémoire) et processus de test orphelins ;
# - disque, volume Preboot (mise à jour de macOS préparée), worktrees ;
# - sauvegarde Time Machine ;
# - tendance des dernières 24 h, lue dans l'historique de la surveillance.
#
# Affichage local seulement : les noms de worktree y figurent (jamais envoyés).
# Tests : scripts/__tests__/bilan-machine.test.ts.
set -uo pipefail

# shellcheck source=machine-commun.sh
. "$(dirname "$0")/machine-commun.sh"
initialiser_depot "$(dirname "$0")"

ETAT="${SURVEILLANCE_ETAT:-$HOME/.local/state/surveillance-machine}"
HISTORIQUE="$ETAT/historique.csv"
VOLUME_DISQUE="${SURVEILLANCE_DISQUE:-/System/Volumes/Data}"
[ -d "$VOLUME_DISQUE" ] || VOLUME_DISQUE=/
VOLUME_PREBOOT="${BILAN_PREBOOT:-/System/Volumes/Preboot}"
SEUIL_PREBOOT_GO="${SEUIL_PREBOOT_GO:-10}"         # au-delà : mise à jour de macOS préparée
SEUIL_NAVIGATEUR_JOURS="${SEUIL_NAVIGATEUR_JOURS:-7}"

if [ $# -gt 0 ]; then
	echo "Usage : $0 (sans argument)" >&2
	exit 2
fi

# ── Outils ────────────────────────────────────────────────────────────────────

# Nombre décimal à la française : « 4,1 ».
virgule() { sed 's/\./,/'; }
go_de_ko() { LC_ALL=C awk -v k="$1" 'BEGIN { printf "%.1f", k / 1048576 }' | virgule; }

titre() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Instantané de tous les processus : « pid ppid pcpu time etime stat rss commande ».
TOUS="$(LC_ALL=C ps -Ao pid=,ppid=,pcpu=,time=,etime=,stat=,rss=,command= 2>/dev/null)"

# ── En-tête ───────────────────────────────────────────────────────────────────
echo "Bilan du Mac — $(date '+%d/%m/%Y %H:%M')"
demarrage="$(sysctl -n kern.boottime 2>/dev/null | sed -n 's/.*sec = \([0-9]*\),.*/\1/p')"
if [ -n "$demarrage" ]; then
	echo "Allumé depuis $(duree_lisible $(($(date +%s) - demarrage)))"
fi

# ── Mémoire et charge ─────────────────────────────────────────────────────────
titre "Mémoire et charge"
coeurs="$(sysctl -n hw.ncpu 2>/dev/null)"
charge="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}')"
[ -n "$charge" ] && echo "Charge (1 min) : $(virgule <<<"$charge") pour ${coeurs:-?} cœurs"
memoire="$(sysctl -n hw.memsize 2>/dev/null)"
[ -n "$memoire" ] && echo "Mémoire vive : $((memoire / 1073741824)) Go"
case "$(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null)" in
1) echo "Pression mémoire : normale" ;;
2) echo "Pression mémoire : ⚠️ tendue" ;;
4) echo "Pression mémoire : ⛔ critique" ;;
esac
compresse="$(vm_stat 2>/dev/null | LC_ALL=C awk '
	/page size of/ { for (i = 1; i <= NF; i++) if ($i == "of") t = $(i + 1) }
	/occupied by compressor/ { gsub(/\./, "", $NF); p = $NF }
	END { if (t && p) printf "%.1f", p * t / 1073741824 }')"
[ -n "$compresse" ] && echo "Mémoire compressée : $(virgule <<<"$compresse") Go"
read -r swap_total swap_utilise <<<"$(lire_swap 2>/dev/null)"
if [ -n "${swap_total:-}" ] && [ "$swap_total" -gt 0 ]; then
	pct=$((swap_utilise * 100 / swap_total))
	marque=""
	[ "$pct" -ge 85 ] && marque=" ⚠️"
	echo "Swap : ${pct} % ($(go_de_ko $((swap_utilise * 1024))) Go sur $(go_de_ko $((swap_total * 1024))) Go)$marque"
fi

# ── Programmes ────────────────────────────────────────────────────────────────
PROGRAMMES="$(programmes_regroupes)"
titre "Programmes qui prennent le plus de mémoire"
sort -t "$(printf '\t')" -k3,3nr <<<"$PROGRAMMES" | LC_ALL=C awk -F '\t' '$1 != "autres" && $3 > 0 && i++ < 6 {
	go = sprintf("%.1f", $3 / 1048576); sub(/\./, ",", go)
	printf "  %-20s %6s Go  (%d processus)\n", $1, go, $4 }'
titre "Programmes qui prennent le plus de CPU"
sort -t "$(printf '\t')" -k2,2nr <<<"$PROGRAMMES" | awk -F '\t' '$1 != "autres" && $2 > 0 && i++ < 6 {
	printf "  %-20s %6d %%\n", $1, $2 }'

# ── Processus emballés ────────────────────────────────────────────────────────
titre "Processus emballés"
emballes=0
while read -r pid cpu cpu_s etime commande; do
	[ -n "$pid" ] || continue
	echo "  ⚠️  $(nom_lisible "$commande") — pid $pid, $cpu % de CPU, $(duree_lisible "$cpu_s") de CPU cumulées, lancé il y a $(duree_lisible "$(secondes_depuis_etime "$etime")")"
	emballes=$((emballes + 1))
done < <(processus_emballes)
# Processus morts que leur parent ne ramasse plus : parent sans doute bloqué.
while read -r parent nombre commande; do
	[ -n "$parent" ] || continue
	echo "  ⚠️  $(nom_lisible "${commande:-?}") (pid $parent) : $nombre processus morts non ramassés — il ne répond sans doute plus"
	emballes=$((emballes + 1))
done < <(parents_bloques)
[ "$emballes" = 0 ] && echo "  aucun"

# Navigateurs ouverts depuis longtemps : un redémarrage les remet d'aplomb.
titre "Navigateurs"
navigateurs=0
while read -r pid ppid _pcpu _temps etime _stat _rss commande; do
	case "$commande" in
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"* | "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"*) ;;
	*) continue ;;
	esac
	age="$(secondes_depuis_etime "$etime")"
	[ "$age" -ge $((SEUIL_NAVIGATEUR_JOURS * 86400)) ] || continue
	echo "  ℹ️  $(nom_lisible "$commande") ouvert depuis $(duree_lisible "$age") (le relancer de temps en temps)"
	navigateurs=$((navigateurs + 1))
done <<<"$TOUS"
[ "$navigateurs" = 0 ] && echo "  rien à signaler"

# ── Sessions Claude ───────────────────────────────────────────────────────────
titre "Sessions Claude"
sessions_claude | {
	n=0 rss=0 j0=0 j1=0 j3=0 j7=0
	while read -r age ko; do
		n=$((n + 1))
		rss=$((rss + ko))
		if [ "$age" -lt 86400 ]; then
			j0=$((j0 + 1))
		elif [ "$age" -lt $((3 * 86400)) ]; then
			j1=$((j1 + 1))
		elif [ "$age" -lt $((7 * 86400)) ]; then
			j3=$((j3 + 1))
		else
			j7=$((j7 + 1))
		fi
	done
	if [ "$n" = 0 ]; then
		echo "  aucune"
	else
		echo "  $n ouvertes, $(go_de_ko "$rss") Go de mémoire vive"
		echo "  moins d'1 jour : $j0 · 1 à 3 jours : $j1 · 3 à 7 jours : $j3 · plus de 7 jours : $j7"
		[ "$j7" -gt 0 ] && echo "  ℹ️  fermer les sessions des chantiers finis ou en pause soulage le swap"
	fi
}

# ── Serveurs de dev et orphelins ──────────────────────────────────────────────
titre "Serveurs de dev"
serveurs="$(serveurs_vite)"
if [ -z "$serveurs" ]; then
	echo "  aucun"
else
	while read -r pid rss etime commande; do
		dossier="$(dossier_du_processus "$pid")"
		# Dossier inconnu (lsof muet) : jamais `git -C ""`, qui lirait le dossier courant.
		if [ -z "$dossier" ]; then
			lieu="?"
		elif dans_depot_principal "$dossier"; then
			lieu="⛔ dépôt principal"
		else
			lieu="${dossier##*/}"
		fi
		echo "  :$(port_de_commande "$commande")  ${lieu:-?}  $(duree_lisible "$(secondes_depuis_etime "$etime")"), $((rss / 1024)) Mo"
	done <<<"$serveurs"
fi
titre "Processus de test orphelins"
orphelins="$(orphelins_de_test)"
if [ -z "$orphelins" ]; then
	echo "  aucun"
else
	while read -r pid nom age rss; do
		echo "  $nom (pid $pid) depuis $(duree_lisible "$age"), $((rss / 1024)) Mo — \`pnpm menage\` les ferme"
	done <<<"$orphelins"
fi

# ── Disque ────────────────────────────────────────────────────────────────────
titre "Disque"
libre_ko="$(df -k "$VOLUME_DISQUE" 2>/dev/null | awk 'NR == 2 { print $4 }')"
if [ -n "$libre_ko" ]; then
	marque=""
	[ "$libre_ko" -lt $((15 * 1048576)) ] && marque=" ⚠️"
	echo "  Libre : $(go_de_ko "$libre_ko") Go$marque"
fi
preboot_ko="$(df -k "$VOLUME_PREBOOT" 2>/dev/null | awk 'NR == 2 { print $3 }')"
if [ -n "$preboot_ko" ] && [ "$preboot_ko" -ge $((SEUIL_PREBOOT_GO * 1048576)) ]; then
	echo "  ℹ️  Preboot : $(go_de_ko "$preboot_ko") Go — une mise à jour de macOS est préparée ; l'installer libère de la place"
fi
if [ -n "${DEPOT_COMMUN:-}" ]; then
	nb_wt="$(git -C "$DEPOT_COMMUN" worktree list --porcelain 2>/dev/null | grep -c '^worktree ')"
	echo "  Worktrees : $((nb_wt - 1)) (sans le dépôt principal) · en danger : \`pnpm surveillance:worktrees\`"
fi

# ── Sauvegarde ────────────────────────────────────────────────────────────────
titre "Sauvegarde"
# Sortie lue d'un bloc : un `| grep -q` ferait mourir tmutil de SIGPIPE (pipefail).
destinations="$(tmutil destinationinfo 2>&1)"
if [[ "$destinations" == *"No destinations configured"* ]]; then
	echo "  ⚠️  Time Machine n'est pas configuré : aucune sauvegarde de la machine"
else
	derniere="$(tmutil latestbackup 2>/dev/null | sed -n 's/.*\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)-\([0-9]\{2\}\)\([0-9]\{2\}\).*/\1 \2:\3/p' | tail -1)"
	echo "  Dernière sauvegarde : ${derniere:-inconnue (disque de sauvegarde absent ?)}"
fi

# ── Tendance 24 h ─────────────────────────────────────────────────────────────
titre "Dernières 24 h (historique de la surveillance)"
if [ ! -s "$HISTORIQUE" ]; then
	echo "  pas d'historique ($HISTORIQUE)"
else
	depuis="$(date_de $(($(date +%s) - 86400)) '+%Y-%m-%d %H:%M')"
	LC_ALL=C awk -F ';' -v depuis="$depuis" '
		NR == 1 {
			for (i = 1; i <= NF; i++) col[$i] = i
			# Ancien en-tête sans ces colonnes : $col[x] vaudrait $0, des nombres absurdes.
			if (!col["charge"] || !col["swap_pct"]) { print "  historique d’un ancien format : rien à lire"; fin = 1; exit }
			cd = col["disque_libre_go"]
			next
		}
		$1 >= depuis && $col["charge"] != "?" && $col["swap_pct"] != "?" {
			n++
			c = $col["charge"] + 0; s = $col["swap_pct"] + 0; d = cd ? $cd : "?"
			if (n == 1 || c > cmax) cmax = c
			if (n == 1 || s > smax) smax = s
			if (n == 1) { s0 = s; d0 = d }
			s1 = s; d1 = d
		}
		END {
			if (fin) exit
			if (!n) { print "  aucune ligne depuis " depuis; exit }
			printf "  Charge max : %d\n", cmax
			printf "  Swap : %d %% → %d %% (max %d %%)\n", s0, s1, smax
			if (d0 != "?" && d1 != "?") printf "  Disque libre : %d Go → %d Go\n", d0, d1
		}' "$HISTORIQUE"
fi
