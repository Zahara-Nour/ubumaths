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
#   processus emballé quel qu'il soit (CPU au plafond, des heures de CPU cumulées :
#   2 extensions à 100 % pendant 10 jours le 2026-11-19, le processus graphique de
#   Chrome 12 jours le 2026-11-22), programme qui ne ramasse plus ses processus
#   morts (Chrome puis Brave bloqués, 2026-11-22 et 24) → prévient seulement ;
# - trop de sessions Claude ouvertes depuis plus de SEUIL_SESSION_JOURS jours
#   (elles remplissent le swap) → prévient, au plus une fois par jour ;
# - charge au-delà de SEUIL_CHARGE deux passages de suite, pression mémoire de
#   macOS « tendue » ou « critique » → prévient, en nommant les 3 programmes qui
#   prennent le plus (CPU pour la charge, mémoire pour la pression et le swap) ;
# - à chaque passage, une ligne dans historique.csv (charge, pression, swap,
#   navigateurs, serveurs de dev, processus Claude) : après un gel, on lit ce qui
#   est monté avant (`pnpm surveillance:historique`) ;
# - swap au-delà de SEUIL_MENAGE_SWAP (gel proche) → lance menage-machine.sh
#   (onglets Chrome gourmands fermés, serveurs de dev oubliés arrêtés) et en
#   envoie le résumé ;
# - processus de test orphelins (vitest, svelte-check, tsgo, Playwright dont le
#   parent est mort depuis plus de SEUIL_ORPHELIN_MIN min) → les FERME (cas sûr :
#   personne ne lira plus leur résultat) et prévient ;
# - moins de SEUIL_DISQUE_GO Go libres sur le volume des données → prévient ;
# - disque qui a perdu plus de SEUIL_DISQUE_BAISSE_GO Go en 24 h (lu dans
#   l'historique) → prévient, au plus une fois par jour ;
# - une fois par jour, au premier passage après SURVEILLANCE_HEURE_RAS h, un
#   « RAS » qui prouve que la surveillance tourne (envoyé même s'il y a eu des
#   alertes : une surveillance morte ne se distingue pas d'une machine saine) ;
#   il compte les worktrees « en danger » (fichiers jamais commités ou commits
#   non poussés, intouchés depuis SEUIL_WORKTREE_JOURS jours : 2026-11-20, deux
#   articles dormaient 6 semaines dans des worktrees). Le message ne donne que le
#   nombre ; les noms : `pnpm surveillance:worktrees` ;
# - redémarrage du Mac → prévient, avec « (plantage du système) » si macOS a
#   laissé un rapport de plantage depuis le démarrage précédent.
# Alerte = notification ntfy.sh (canal au nom aléatoire, lu dans
# ~/.config/surveillance-machine/ntfy-topic) + ligne dans le journal. Le message
# envoyé ne contient que des chiffres et des ports : ni chemin, ni nom de projet.
# Une même alerte n'est renvoyée qu'après SURVEILLANCE_RAPPEL_MIN minutes.
#
# Usage : surveillance-machine.sh [--essai] [--test] [--historique] [--worktrees]
#   --essai      : affiche ce qu'elle ferait, n'arrête rien, n'envoie ni n'écrit rien ;
#   --test       : envoie une notification de test ;
#   --historique : affiche les 2 dernières heures de l'historique ;
#   --worktrees  : affiche les worktrees en danger, avec leur nom (rien n'est envoyé).
#
# Tests : scripts/__tests__/surveillance-machine.test.ts.
set -uo pipefail

# ── Seuils (surchargeables par l'environnement) ────────────────────────────────
SEUIL_SERVEUR_MO="${SEUIL_SERVEUR_MO:-1500}"         # mémoire d'un serveur de dev
SEUIL_SERVEUR_HEURES="${SEUIL_SERVEUR_HEURES:-6}"    # âge d'un serveur de dev
SEUIL_CHROME_CPU="${SEUIL_CHROME_CPU:-600}"          # CPU cumulé de Chrome, en %
SEUIL_CHROME_ONGLETS="${SEUIL_CHROME_ONGLETS:-60}"   # processus d'onglets Chrome
# Processus emballés et parents bloqués : SEUIL_EMBALLE_CPU, SEUIL_EMBALLE_HEURES,
# SEUIL_ZOMBIES, SEUIL_ZOMBIE_MIN, dans machine-commun.sh (partagés avec le bilan).
SEUIL_SESSION_JOURS="${SEUIL_SESSION_JOURS:-7}"      # âge d'une vieille session Claude
SEUIL_SESSIONS_VIEILLES="${SEUIL_SESSIONS_VIEILLES:-10}" # vieilles sessions avant l'alerte
SEUIL_DISQUE_BAISSE_GO="${SEUIL_DISQUE_BAISSE_GO:-5}" # Go perdus en 24 h
RAPPEL_JOUR_MIN=1440                                  # alertes de fond : une fois par jour
SEUIL_SWAP_POURCENT="${SEUIL_SWAP_POURCENT:-85}"     # swap utilisé / swap total
NB_COEURS="$(sysctl -n hw.ncpu 2>/dev/null)"
NB_COEURS="${NB_COEURS:-12}"
SEUIL_CHARGE="${SEUIL_CHARGE:-$((NB_COEURS * 3))}"   # charge (1 min), deux passages de suite
SEUIL_MENAGE_SWAP="${SEUIL_MENAGE_SWAP:-95}"         # swap au-delà duquel le ménage part seul
SURVEILLANCE_RAPPEL_MIN="${SURVEILLANCE_RAPPEL_MIN:-60}"
SURVEILLANCE_MENAGE_PAUSE_MIN="${SURVEILLANCE_MENAGE_PAUSE_MIN:-15}"
SURVEILLANCE_HISTORIQUE_LIGNES="${SURVEILLANCE_HISTORIQUE_LIGNES:-4032}" # 14 jours à 5 min
SEUIL_DISQUE_GO="${SEUIL_DISQUE_GO:-15}"             # Go libres du volume des données
SURVEILLANCE_HEURE_RAS="${SURVEILLANCE_HEURE_RAS:-9}" # heure du « RAS » quotidien (24 = jamais)
VOLUME_DISQUE="${SURVEILLANCE_DISQUE:-/System/Volumes/Data}" # « / » = le système seul, il tromperait
[ -d "$VOLUME_DISQUE" ] || VOLUME_DISQUE=/
SEUIL_WORKTREE_JOURS="${SEUIL_WORKTREE_JOURS:-7}"    # travail non sauvé intouché depuis
RAPPORTS="${SURVEILLANCE_RAPPORTS:-/Library/Logs/DiagnosticReports}" # rapports de plantage

ETAT="${SURVEILLANCE_ETAT:-$HOME/.local/state/surveillance-machine}"
CONFIG="${SURVEILLANCE_CONFIG:-$HOME/.config/surveillance-machine}"
NTFY_SERVEUR="${NTFY_SERVEUR:-https://ntfy.sh}"
TUER="${SURVEILLANCE_TUER:-kill}"
MENAGE="${SURVEILLANCE_MENAGE:-$(dirname "$0")/menage-machine.sh}"
JOURNAL="$ETAT/journal.log"
HISTORIQUE="$ETAT/historique.csv"
ENTETE_HISTORIQUE="date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude;disque_libre_go"

essai=0
test_notif=0
voir_historique=0
voir_worktrees=0
for arg in "$@"; do
	case "$arg" in
	--essai) essai=1 ;;
	--test) test_notif=1 ;;
	--historique) voir_historique=1 ;;
	--worktrees) voir_worktrees=1 ;;
	*)
		echo "Usage : $0 [--essai] [--test] [--historique] [--worktrees]" >&2
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

# Envoie le message ntfy (sauf en --essai), avec l'étiquette <tags> (warning par
# défaut). Sans canal configuré : journal seul.
envoyer() {
	local message="$1" tags="${2:-warning}"
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
	if ! curl -sf -m 10 -o /dev/null -H "Title: Mac mini" -H "Tags: $tags" \
		-d "$message" "$NTFY_SERVEUR/$canal"; then
		journaliser "échec de l'envoi ntfy : alerte retentée au prochain passage"
		return 1
	fi
}

# Vrai si l'alerte <cle> n'a pas été envoyée depuis [<minutes>] (SURVEILLANCE_RAPPEL_MIN
# par défaut).
a_renvoyer() {
	local marque="$ETAT/alerte-$1" delai="${2:-$SURVEILLANCE_RAPPEL_MIN}"
	[ -f "$marque" ] || return 0
	local maintenant derniere
	maintenant="$(date +%s)"
	derniere="$(cat "$marque" 2>/dev/null || echo 0)"
	[ $((maintenant - derniere)) -ge $((delai * 60)) ]
}

# Clés notées au passage précédent dans <fichier>, si ce passage date de moins de
# 11 min (Mac en veille : pas « de suite »). Une alerte qui l'exige ne part qu'au
# 2e passage de suite où elle est vue : un pic ou un instant fugace n'en est pas une.
vus_au_passage_precedent() {
	[ -n "$(find "$1" -mmin -11 2>/dev/null)" ] && cat "$1"
	return 0
}

# Ajoute une ligne à l'historique (sauf en --essai) et n'en garde que les
# SURVEILLANCE_HISTORIQUE_LIGNES dernières. Un échec d'écriture n'empêche jamais
# les alertes.
ecrire_historique() {
	[ "$essai" = 1 ] && return 0
	[ -e "$HISTORIQUE" ] && [ ! -f "$HISTORIQUE" ] && return 0
	# Colonnes changées : l'ancien fichier est mis de côté, pas mélangé.
	if [ -s "$HISTORIQUE" ] && [ "$(head -1 "$HISTORIQUE")" != "$ENTETE_HISTORIQUE" ]; then
		mv "$HISTORIQUE" "$ETAT/historique-ancien.csv" 2>/dev/null || return 0
	fi
	{ [ -s "$HISTORIQUE" ] || echo "$ENTETE_HISTORIQUE"; echo "$1"; } 2>/dev/null >>"$HISTORIQUE" || return 0
	local lignes=$(($(wc -l <"$HISTORIQUE") - 1))
	if [ "$lignes" -gt "$SURVEILLANCE_HISTORIQUE_LIGNES" ]; then
		{ head -1 "$HISTORIQUE"; tail -n "$SURVEILLANCE_HISTORIQUE_LIGNES" "$HISTORIQUE"; } >"$HISTORIQUE.tmp" &&
			mv "$HISTORIQUE.tmp" "$HISTORIQUE"
	fi
	return 0
}

# Les alertes de ce passage ; marquées seulement une fois l'envoi réussi.
a_marquer=()
marquer() {
	a_marquer+=("$1")
}

# shellcheck source=machine-commun.sh
source "$(dirname "$0")/machine-commun.sh"
initialiser_depot "$(dirname "$0")"

# Worktrees de NOTRE dépôt (dépôt principal exclu) qui portent du travail non
# sauvé — fichiers jamais commités, commits sur aucune branche distante — auquel
# personne n'a touché depuis SEUIL_WORKTREE_JOURS jours. Une ligne
# « dossier|fichiers|commits|jours » par worktree. Dossier disparu : sauté.
worktrees_en_danger() {
	[ -n "${DEPOT_COMMUN:-}" ] || return 0
	local maintenant w ligne chemin m dernier nf nc t
	maintenant="$(date +%s)"
	git -C "$DEPOT_COMMUN" worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' |
		while IFS= read -r w; do
			[ -d "$w" ] || continue
			dans_depot_principal "$w" && continue
			dernier=0
			nf=0
			while IFS= read -r ligne; do
				[ -n "$ligne" ] || continue
				nf=$((nf + 1))
				chemin="${ligne:3}"
				chemin="${chemin##* -> }"
				chemin="${chemin#\"}"
				chemin="${chemin%\"}"
				# Fichier supprimé : la date du premier dossier parent qui existe encore.
				chemin="$w/$chemin"
				while [ ! -e "$chemin" ] && [ "$chemin" != "$w" ] && [ "$chemin" != / ]; do
					chemin="$(dirname "$chemin")"
				done
				m="$(date_modif "$chemin" || echo 0)"
				[ "$m" -gt "$dernier" ] && dernier="$m"
			done < <(git -C "$w" -c core.quotePath=false status --porcelain --untracked-files=all 2>/dev/null)
			nc="$(git -C "$w" rev-list --count HEAD --not --remotes 2>/dev/null || echo 0)"
			if [ "$nc" -gt 0 ]; then
				t="$(git -C "$w" log -1 --format=%ct HEAD 2>/dev/null || echo 0)"
				[ "$t" -gt "$dernier" ] && dernier="$t"
			fi
			[ $((nf + nc)) -gt 0 ] || continue
			[ $((maintenant - dernier)) -ge $((SEUIL_WORKTREE_JOURS * 86400)) ] || continue
			echo "$w|$nf|$nc|$(((maintenant - dernier) / 86400))"
		done
}

# ── Contrôles ──────────────────────────────────────────────────────────────────

if [ "$test_notif" = 1 ]; then
	envoyer "Test de la surveillance : les alertes arriveront ici."
	journaliser "notification de test"
	exit 0
fi

if [ "$voir_historique" = 1 ]; then
	if [ -s "$HISTORIQUE" ]; then
		{ head -1 "$HISTORIQUE"; tail -n +2 "$HISTORIQUE" | tail -n 24; } | column -t -s ';'
	else
		echo "Pas encore d'historique ($HISTORIQUE)."
	fi
	exit 0
fi

if [ "$voir_worktrees" = 1 ]; then
	liste="$(worktrees_en_danger)"
	if [ -z "$liste" ]; then
		echo "Aucun worktree en danger (travail non sauvé intouché depuis $SEUIL_WORKTREE_JOURS jours)."
	else
		while IFS='|' read -r w nf nc jours; do
			echo "$w : $nf fichier(s) non commité(s), $nc commit(s) non poussé(s), intouché depuis $jours j"
		done <<<"$liste"
	fi
	exit 0
fi

alertes=()
nb_serveurs=0
PROGRAMMES="$(programmes_regroupes)"

# 1. Serveurs de dev.
while read -r pid rss etime commande; do
	[ -n "$pid" ] || continue
	nb_serveurs=$((nb_serveurs + 1))
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

# 1 bis. Processus de test orphelins : fermés à chaque passage, signalés une fois
#    par SURVEILLANCE_RAPPEL_MIN (un orphelin qui résiste ne spamme pas).
orphelins_signales=()
orphelin_plus_vieux=0
while read -r pid nom age rss; do
	[ -n "$pid" ] || continue
	if [ "$essai" = 1 ]; then
		echo "ARRÊT : orphelin de test $nom (pid $pid, $(duree_lisible "$age"))"
	else
		"$TUER" "$pid" 2>/dev/null
		journaliser "fermé : orphelin de test $nom (pid $pid, $(duree_lisible "$age"), $((rss / 1024)) Mo)"
	fi
	if a_renvoyer "orphelin-$pid"; then
		orphelins_signales+=("$nom")
		marquer "orphelin-$pid"
		[ "$age" -gt "$orphelin_plus_vieux" ] && orphelin_plus_vieux="$age"
	fi
done < <(orphelins_de_test)
if [ "${#orphelins_signales[@]}" -gt 0 ]; then
	par_programme="$(printf '%s\n' "${orphelins_signales[@]}" | awk '
		!(n[$0]++) { ordre[++k] = $0 }
		END { for (i = 1; i <= k; i++) printf "%s%s × %d", (i > 1 ? ", " : ""), ordre[i], n[ordre[i]] }')"
	alertes+=("Orphelins de test fermés : $par_programme (le plus vieux : $(duree_lisible "$orphelin_plus_vieux")).")
fi

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

# 2 bis. Processus emballés, quels qu'ils soient : CPU au plafond ET des heures de
#    CPU cumulées, deux passages de suite (WindowServer ou un `vite dev` qui
#    recompile montent un instant). Jamais arrêtés : on ne sait pas ce qu'ils font.
#    Le pid est au journal (`kill <pid>` : un navigateur relance son processus).
fichier_emballes="$ETAT/emballes-vus"
emballes_avant="$(vus_au_passage_precedent "$fichier_emballes")"
emballes_vus=""
while read -r pid cpu cpu_s _etime commande; do
	[ -n "$pid" ] || continue
	emballes_vus+="$pid"$'\n'
	grep -qx "$pid" <<<"$emballes_avant" || continue
	if a_renvoyer "emballe-$pid"; then
		nom="$(nom_pour_notification "$commande")"
		alertes+=("$nom emballé : $cpu % CPU, $((cpu_s / 3600)) h de CPU cumulées.")
		marquer "emballe-$pid"
		journaliser "alerte : $(nom_lisible "$commande") (pid $pid) $cpu % CPU, $((cpu_s / 3600)) h de CPU"
	fi
done < <(processus_emballes)
[ "$essai" = 1 ] || printf '%s' "$emballes_vus" >"$fichier_emballes"

# 2 ter. Programme bloqué : il ne ramasse plus ses processus morts (Chrome, puis
#    Brave : « Quitter » sans réponse). Deux passages de suite : un parent qui
#    ramasse ses morts quelques millisecondes après le passage n'est pas bloqué.
#    Le relancer ; fermé de force s'il le faut.
fichier_bloques="$ETAT/bloques-vus"
bloques_avant="$(vus_au_passage_precedent "$fichier_bloques")"
bloques_vus=""
while read -r ppid nombre commande; do
	[ -n "$ppid" ] || continue
	bloques_vus+="$ppid"$'\n'
	grep -qx "$ppid" <<<"$bloques_avant" || continue
	if a_renvoyer "bloque-$ppid"; then
		nom="$(nom_pour_notification "$commande")"
		alertes+=("$nom ne répond plus ($nombre processus morts non ramassés) : le relancer.")
		marquer "bloque-$ppid"
		journaliser "alerte : $(nom_lisible "$commande") (pid $ppid) bloqué, $nombre processus morts non ramassés"
	fi
done < <(parents_bloques)
[ "$essai" = 1 ] || printf '%s' "$bloques_vus" >"$fichier_bloques"

# 2 quater. Vieilles sessions Claude : chacune garde son contexte en mémoire.
read -r sessions_total sessions_vieilles sessions_ko < <(sessions_claude |
	awk -v s=$((SEUIL_SESSION_JOURS * 86400)) '{ n++; m += $2; if ($1 >= s) v++ } END { printf "%d %d %d\n", n, v, m }')
if [ "${sessions_vieilles:-0}" -ge "$SEUIL_SESSIONS_VIEILLES" ] && a_renvoyer sessions "$RAPPEL_JOUR_MIN"; then
	alertes+=("Sessions Claude : $sessions_vieilles ouvertes depuis plus de $SEUIL_SESSION_JOURS jours ($sessions_total en tout, $((sessions_ko / 1048576)) Go). Fermer celles des chantiers finis.")
	marquer sessions
	journaliser "alerte : $sessions_vieilles sessions Claude de plus de $SEUIL_SESSION_JOURS j ($sessions_total en tout)"
fi

# 3. Swap.
swap_pourcent=0
read -r swap_total swap_utilise < <(lire_swap)
if [ "${swap_total:-0}" -gt 0 ]; then
	swap_pourcent=$((swap_utilise * 100 / swap_total))
	if [ "$swap_pourcent" -ge "$SEUIL_SWAP_POURCENT" ]; then
		if a_renvoyer swap; then
			en_tete="$(en_tete_memoire <<<"$PROGRAMMES")"
			alertes+=("Swap : $swap_pourcent % ($((swap_utilise / 1024)) Go sur $((swap_total / 1024)) Go).${en_tete:+ En tête : $en_tete.}")
			marquer swap
			journaliser "alerte : swap $swap_pourcent % ($swap_utilise Mo / $swap_total Mo)"
		fi
	fi
fi

# 3 bis. Charge : au-delà de SEUIL_CHARGE deux passages de suite (un pic de
#    compilation n'est pas un emballement). La marque du passage précédent ne
#    compte que si elle a moins de 11 min (Mac en veille : pas « de suite »).
charge="$(sysctl -n vm.loadavg 2>/dev/null | awk '{ print int($2) }')"
charge="${charge:-0}"
marque_charge="$ETAT/charge-haute"
if [ "$charge" -gt "$SEUIL_CHARGE" ]; then
	if [ -n "$(find "$marque_charge" -mmin -11 2>/dev/null)" ] && a_renvoyer charge; then
		en_tete="$(en_tete_cpu <<<"$PROGRAMMES")"
		alertes+=("Charge $charge ($NB_COEURS cœurs).${en_tete:+ En tête : $en_tete.}")
		marquer charge
		journaliser "alerte : charge $charge (seuil $SEUIL_CHARGE)"
	fi
	[ "$essai" = 1 ] || touch "$marque_charge"
else
	[ "$essai" = 1 ] || rm -f "$marque_charge"
fi

# 3 ter. Pression mémoire de macOS : 1 normale, 2 tendue, 4 critique (absente : sautée).
pression="$(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null | tr -d '[:space:]')"
case "$pression" in
2) etat_memoire=tendue ;;
4) etat_memoire=critique ;;
*) etat_memoire="" ;;
esac
# Clé par état : « critique » part même si « tendue » vient d'être envoyée.
if [ -n "$etat_memoire" ] && a_renvoyer "pression-$etat_memoire"; then
	en_tete="$(en_tete_memoire <<<"$PROGRAMMES")"
	alertes+=("Mémoire $etat_memoire.${en_tete:+ En tête : $en_tete.}")
	marquer "pression-$etat_memoire"
	journaliser "alerte : pression mémoire $etat_memoire ($pression)"
fi

# 3 quater. Disque : Go libres du volume des données (df en échec : sauté).
read -r disque_total disque_libre < <(df -k "$VOLUME_DISQUE" 2>/dev/null |
	awk 'NR == 2 { printf "%d %d\n", $2 / 1048576, $4 / 1048576 }')
if [ -n "${disque_libre:-}" ] && [ "$disque_libre" -lt "$SEUIL_DISQUE_GO" ] && a_renvoyer disque; then
	alertes+=("Disque : $disque_libre Go libres sur $disque_total Go. Pour en libérer : pnpm disque:liberer --essai")
	marquer disque
	journaliser "alerte : disque $disque_libre Go libres sur $disque_total Go ($VOLUME_DISQUE)"
fi

# 3 sexies. Disque qui fond : Go libres d'il y a 24 h (première ligne de
#    l'historique dans les 24 h, au moins 20 h en arrière) face à maintenant.
#    Aucune ligne dans cette fenêtre (Mac éteint ou endormi) : rien ce jour-là.
if [ -n "${disque_libre:-}" ] && [ -s "$HISTORIQUE" ]; then
	il_y_a_24h="$(date_de $(($(date +%s) - 86400)) '+%Y-%m-%d %H:%M')"
	il_y_a_20h="$(date_de $(($(date +%s) - 72000)) '+%Y-%m-%d %H:%M')"
	disque_hier="$(awk -F ';' -v depuis="$il_y_a_24h" -v avant="$il_y_a_20h" '
		NR == 1 { for (i = 1; i <= NF; i++) if ($i == "disque_libre_go") c = i; next }
		c && $1 >= depuis && $1 <= avant && $c != "?" { print $c; exit }' "$HISTORIQUE")"
	if [ -n "$disque_hier" ] && [ $((disque_hier - disque_libre)) -gt "$SEUIL_DISQUE_BAISSE_GO" ] &&
		a_renvoyer disque-baisse "$RAPPEL_JOUR_MIN"; then
		alertes+=("Disque : $((disque_hier - disque_libre)) Go perdus en 24 h ($disque_hier → $disque_libre Go libres). Ce qui pèse : pnpm machine:bilan")
		marquer disque-baisse
		journaliser "alerte : disque $disque_hier → $disque_libre Go libres en 24 h"
	fi
fi

# 3 quinquies. Redémarrage : heure de démarrage avancée de plus de 2 min depuis le
#    passage précédent (macOS la décale d'une ou deux secondes quand il recale
#    l'horloge : pas un redémarrage). Premier passage : notée sans rien envoyer.
#    Marque mise à jour une fois l'envoi réussi, et jamais sans canal (plus bas).
demarrage="$(sysctl -n kern.boottime 2>/dev/null | sed -n 's/.*sec = \([0-9]*\),.*/\1/p')"
marque_demarrage="$ETAT/demarrage"
nouveau_demarrage=""
if [ -n "$demarrage" ]; then
	precedent="$(cat "$marque_demarrage" 2>/dev/null)"
	if [ -z "$precedent" ]; then
		[ "$essai" = 1 ] || echo "$demarrage" >"$marque_demarrage"
	elif [ "$demarrage" -gt $((precedent + 120)) ] || [ "$demarrage" -lt $((precedent - 120)) ]; then
		plantage=""
		for rapport in "$RAPPORTS"/*panic*; do
			[ -f "$rapport" ] || continue
			if [ "$(date_modif "$rapport" || echo 0)" -gt "$precedent" ]; then
				plantage=" (plantage du système)"
				break
			fi
		done
		quand="le $(date_de "$demarrage" '+%d/%m') à $((10#$(date_de "$demarrage" +%H))) h $(date_de "$demarrage" +%M)"
		alertes+=("Le Mac a redémarré $quand$plantage.")
		nouveau_demarrage="$demarrage"
		journaliser "redémarrage $quand$plantage"
	fi
fi

ecrire_historique "$(date '+%Y-%m-%d %H:%M');$charge;${pression:-?};$swap_pourcent;$(valeur_programme Chrome 2 <<<"$PROGRAMMES");$(valeur_programme Brave 2 <<<"$PROGRAMMES");$nb_serveurs;$(valeur_programme claude 4 <<<"$PROGRAMMES");${disque_libre:-?}"

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

# ── « RAS » quotidien : marqué seulement une fois l'envoi réussi ───────────────
# Sans canal, rien n'est marqué : le canal créé dans la journée reçoit son « RAS ».

marque_ras="$ETAT/ras"
aujourdhui="$(date +%F)"
if [ $((10#$(date +%H))) -ge "$SURVEILLANCE_HEURE_RAS" ] &&
	[ "$(cat "$marque_ras" 2>/dev/null)" != "$aujourdhui" ] &&
	{ [ "$essai" = 1 ] || [ -s "$CONFIG/ntfy-topic" ]; }; then
	nb_danger="$(worktrees_en_danger | grep -c .)"
	en_danger=""
	[ "$nb_danger" -eq 1 ] && en_danger=" · 1 worktree en danger"
	[ "$nb_danger" -gt 1 ] && en_danger=" · $nb_danger worktrees en danger"
	if envoyer "RAS : surveillance active · charge $charge · swap $swap_pourcent % · disque ${disque_libre:-?} Go libres$en_danger." white_check_mark &&
		[ "$essai" = 0 ]; then
		echo "$aujourdhui" >"$marque_ras"
	fi
fi

# ── Envoi groupé ───────────────────────────────────────────────────────────────

if [ "${#alertes[@]}" -gt 0 ]; then
	if envoyer "$(printf '%s\n' "${alertes[@]}")" && [ "$essai" = 0 ]; then
		[ -n "$nouveau_demarrage" ] && [ -s "$CONFIG/ntfy-topic" ] && echo "$nouveau_demarrage" >"$marque_demarrage"
		if [ "${#a_marquer[@]}" -gt 0 ]; then
			for cle in "${a_marquer[@]}"; do
				date +%s >"$ETAT/alerte-$cle"
			done
		fi
	fi
elif [ "$essai" = 1 ]; then
	echo "RAS"
fi
exit 0
