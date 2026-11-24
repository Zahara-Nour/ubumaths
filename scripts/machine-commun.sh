#!/bin/bash
# Outils communs de surveillance-machine.sh et menage-machine.sh (à sourcer).
# Compatibles avec le bash 3.2 de macOS (/bin/bash, celui de launchd).

# Date de modification d'un fichier (secondes) et date formatée d'un instant :
# macOS (BSD) en vrai, Linux (GNU) dans la CI qui joue les tests.
STAT_GNU=0
stat -c %Y / >/dev/null 2>&1 && STAT_GNU=1
date_modif() {
	if [ "$STAT_GNU" = 1 ]; then stat -c %Y "$1"; else stat -f %m "$1"; fi 2>/dev/null
}
date_de() {
	date -r "$1" "$2" 2>/dev/null || date -d "@$1" "$2"
}

# Âge en secondes d'un champ etime de ps : [[jj-]hh:]mm:ss.
secondes_depuis_etime() {
	local e="$1" jours=0 h=0 m=0 s=0 parts
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

# Dossier git commun de NOTRE dépôt (celui du script <dossier_du_script>, ou
# SURVEILLANCE_DEPOT) : un `vite dev` d'un autre projet n'est jamais touché.
initialiser_depot() {
	DEPOT_COMMUN="$(git -C "${SURVEILLANCE_DEPOT:-$1}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
}

# Vrai si <dossier> appartient à NOTRE dépôt (dépôt principal ou worktree lié).
de_notre_depot() {
	[ -n "${DEPOT_COMMUN:-}" ] || return 1
	local commun
	commun="$(git -C "$1" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 1
	[ "$commun" = "$DEPOT_COMMUN" ]
}

# Vrai si <dossier> est le dépôt principal de NOTRE dépôt (pas un worktree lié,
# pas un autre projet) : même règle que garde-dev-depot-principal.sh.
dans_depot_principal() {
	de_notre_depot "$1" || return 1
	local dossier_git
	dossier_git="$(git -C "$1" rev-parse --path-format=absolute --git-dir 2>/dev/null)" || return 1
	[ "$dossier_git" = "$DEPOT_COMMUN" ]
}

# Serveurs de dev : « pid rss etime commande » du processus node qui exécute vite
# (pas l'enveloppe pnpm, ni le `sh -c "… && vite dev"` du script `dev`).
serveurs_vite() {
	ps -Ao pid=,rss=,etime=,command= | awk '$4 ~ /(^|\/)node$/ && /vite(\.js)? dev/ {print}'
}

# Durée lisible d'un nombre de secondes : « 10 j », « 2 h », « 45 min ».
duree_lisible() {
	if [ "$1" -ge 86400 ]; then
		echo "$(($1 / 86400)) j"
	elif [ "$1" -ge 3600 ]; then
		echo "$(($1 / 3600)) h"
	else
		echo "$(($1 / 60)) min"
	fi
}

# Processus de test orphelins : « pid nom âge_s rss_ko » des vitest, svelte-check,
# tsgo et navigateurs de Playwright dont le parent est mort (rattachés à launchd,
# ppid 1) depuis plus de SEUIL_ORPHELIN_MIN minutes. Personne ne lira plus leur
# résultat : les fermer ne perd rien (2026-11-19 : un Chrome for Testing seul
# depuis 10 jours). Un processus dont la session vit encore a un autre parent :
# jamais compté. Le nom vient d'une liste fermée : jamais un chemin.
# On regarde l'EXÉCUTABLE (et, pour node, le script lancé), jamais un chemin cité
# dans les arguments d'une autre commande. Épargné : chrome_crashpad_handler, que
# Chrome détache toujours (ppid 1) même quand son navigateur est vivant.
SEUIL_ORPHELIN_MIN="${SEUIL_ORPHELIN_MIN:-30}"
nom_outil_de_test() {
	local commande="$1" premier script
	case "$commande" in *crashpad_handler*) return ;; esac
	# Navigateur de Playwright : son chemin (qui contient des espaces) EST le début de la commande.
	if [[ "$commande" == /*/ms-playwright/* && "${commande%%/ms-playwright/*}" != *" "* ]]; then
		echo Playwright
		return
	fi
	premier="${commande%% *}"
	case "$premier" in
	*/tsgo) echo tsgo ;;
	node | */node)
		script="${commande#* }"
		script="${script%% *}"
		case "$script" in
		*/@playwright/* | */playwright-core/* | */playwright/*) echo Playwright ;;
		*/svelte-check/*) echo svelte-check ;;
		*/vitest/*) echo vitest ;;
		esac
		;;
	esac
}
orphelins_de_test() {
	local pid ppid etime rss commande nom age
	ps -Ao pid=,ppid=,etime=,rss=,command= | while read -r pid ppid etime rss commande; do
		[ "$ppid" = 1 ] || continue
		nom="$(nom_outil_de_test "$commande")"
		[ -n "$nom" ] || continue
		age="$(secondes_depuis_etime "$etime")"
		[ "$age" -ge $((SEUIL_ORPHELIN_MIN * 60)) ] || continue
		echo "$pid $nom $age $rss"
	done
}

# Dossier courant d'un processus.
dossier_du_processus() {
	lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1
}

# Port d'une commande `… --port N …`, « ? » sinon.
port_de_commande() {
	local port
	port="$(sed -n 's/.*--port[= ]\([0-9]*\).*/\1/p' <<<"$1")"
	echo "${port:-?}"
}

# « total utilisé » du swap en Mo, depuis
# « total = 12288.00M  used = 11540.94M  free = 747.06M  (encrypted) ».
lire_swap() {
	sysctl -n vm.swapusage | awk '{
		for (i = 1; i <= NF; i++) { if ($i == "total") t = $(i + 2); if ($i == "used") u = $(i + 2) }
		printf "%d %d\n", t, u }'
}

# Programmes regroupés, une ligne « nom<TAB>cpu<TAB>rss_ko<TAB>processus » par
# programme : les processus d'un même programme (onglets d'un navigateur…) sont
# additionnés. Nom = la première appli .app du chemin (Google Chrome → Chrome,
# Brave Browser → Brave), sinon le nom de l'exécutable ; le binaire de Claude Code
# (…/claude/versions/2.1.327) → claude. Seuls les noms de PROGRAMMES_CONNUS
# sortent tels quels, le reste devient « autres » : un exécutable de projet
# (…/MonProjet/target/debug/monprojet) ne doit jamais nommer le projet dans une
# notification.
PROGRAMMES_CONNUS="Chrome Brave Chrome-Playwright Safari Firefox node bun deno python3 claude OrbStack Docker WindowServer kernel_task mds_stores mdworker_shared Finder Terminal iTerm2 Ghostty Code Cursor"
programmes_regroupes() {
	ps -Ao pcpu=,rss=,comm= | LC_ALL=C awk -v connus="$PROGRAMMES_CONNUS" '
		NF >= 3 {
			cpu = $1; rss = $2
			sub(/^ *[^ ]+ +[^ ]+ +/, "")
			if (match($0, /\/[^\/]+\.app\//)) nom = substr($0, RSTART + 1, RLENGTH - 6)
			else { nom = $0; sub(/.*\//, "", nom) }
			if ($0 ~ /\/claude\/versions\// || nom ~ /^claude /) nom = "claude"
			if (nom == "Google Chrome") nom = "Chrome"
			else if (nom == "Brave Browser") nom = "Brave"
			else if (nom == "Google Chrome for Testing") nom = "Chrome-Playwright"
			if (!((" " connus " ") ~ (" " nom " "))) nom = "autres"
			c[nom] += cpu; m[nom] += rss; n[nom]++
		}
		END { for (k in c) printf "%s\t%d\t%d\t%d\n", k, c[k], m[k], n[k] }'
}

# Les 3 programmes qui prennent le plus de CPU (« Chrome 640 % · node 180 % »),
# depuis la sortie de programmes_regroupes sur l'entrée standard. « autres »
# (des centaines de petits processus) n'est jamais un coupable : pas classé.
en_tete_cpu() {
	sort -t "$(printf '\t')" -k2,2nr | awk -F '\t' '$1 != "autres" && $2 > 0 && i < 3 {
		printf "%s%s %d %%", (i++ ? " · " : ""), $1, $2 }'
}

# Les 3 programmes qui prennent le plus de mémoire (« Chrome 4,1 Go · node 1,5 Go »).
en_tete_memoire() {
	sort -t "$(printf '\t')" -k3,3nr | LC_ALL=C awk -F '\t' '$1 != "autres" && $3 > 0 && i < 3 {
		go = sprintf("%.1f", $3 / 1048576); sub(/\./, ",", go)
		printf "%s%s %s Go", (i++ ? " · " : ""), $1, go }'
}

# Valeur d'un programme (colonne 2 = CPU, 4 = processus) dans programmes_regroupes, 0 sinon.
valeur_programme() {
	awk -F '\t' -v nom="$1" -v col="$2" '$1 == nom { v = $col } END { print v + 0 }'
}

# Temps CPU cumulé de ps en secondes : « 3203:22.05 » (macOS, minutes:secondes)
# ou « [jj-]hh:mm:ss » (Linux).
secondes_cpu() {
	case "$1" in
	*.*)
		local min="${1%%:*}" sec="${1#*:}"
		sec="${sec%%.*}"
		echo $((10#$min * 60 + 10#$sec))
		;;
	*) secondes_depuis_etime "$1" ;;
	esac
}

# Nom lisible d'un processus : l'appli (.app) et le rôle du processus d'un navigateur
# (« Chrome (processus graphique) »), sinon le nom de l'exécutable. Pour l'écran
# seulement ; une notification passe par nom_pour_notification.
nom_lisible() {
	local commande="$1" appli role=""
	if [[ "$commande" =~ /([^/]+)\.app/ ]]; then
		appli="${BASH_REMATCH[1]}"
		case "$appli" in
		"Google Chrome") appli=Chrome ;;
		"Brave Browser") appli=Brave ;;
		"Google Chrome for Testing") appli=Chrome-Playwright ;;
		esac
		case "$commande" in
		*--type=gpu-process*) role=" (processus graphique)" ;;
		*--extension-process*) role=" (extension)" ;;
		*--type=renderer*) role=" (onglet)" ;;
		*--type=utility*) role=" (utilitaire)" ;;
		esac
		echo "$appli$role"
	else
		local exe="${commande%% *}"
		echo "${exe##*/}"
	fi
}

# Nom sûr pour une notification : celui de nom_lisible si le programme est dans
# PROGRAMMES_CONNUS, « un processus » sinon (jamais le nom d'un projet).
nom_pour_notification() {
	local nom programme
	nom="$(nom_lisible "$1")"
	programme="${nom%% (*}"
	case " $PROGRAMMES_CONNUS " in
	*" $programme "*) echo "$nom" ;;
	*) echo "un processus" ;;
	esac
}

# Processus emballés : « pid cpu secondes_cpu etime commande » de tout processus à
# plus de SEUIL_EMBALLE_CPU % de CPU avec plus de SEUIL_EMBALLE_HEURES h de CPU
# cumulées (un pic bref n'en est pas un). 2026-11-22 : le processus graphique de
# Chrome à 100 % pendant 12 jours, que la surveillance des seules extensions ne
# voyait pas. LC_ALL=C : un « 99,3 » régional ne passerait pas le test numérique.
SEUIL_EMBALLE_CPU="${SEUIL_EMBALLE_CPU:-90}"
SEUIL_EMBALLE_HEURES="${SEUIL_EMBALLE_HEURES:-1}"
processus_emballes() {
	local pid pcpu temps etime commande cpu_s
	LC_ALL=C ps -Ao pid=,pcpu=,time=,etime=,command= 2>/dev/null | while read -r pid pcpu temps etime commande; do
		[ -n "$pid" ] || continue
		[ "${pcpu%%.*}" -ge "$SEUIL_EMBALLE_CPU" ] 2>/dev/null || continue
		cpu_s="$(secondes_cpu "$temps")"
		[ "$cpu_s" -ge $((SEUIL_EMBALLE_HEURES * 3600)) ] || continue
		echo "$pid ${pcpu%%.*} $cpu_s $etime $commande"
	done
}

# Parents bloqués : « pid_parent nombre commande_parent » d'un processus qui ne ramasse
# plus ses processus morts (au moins SEUIL_ZOMBIES, lancés depuis plus de
# SEUIL_ZOMBIE_MIN min : etime compte depuis le lancement, pas depuis la mort ;
# la surveillance exige en plus deux passages de suite).
# Chrome et Brave, 2026-11-22 et 24 : bloqués, « Quitter » sans réponse.
SEUIL_ZOMBIES="${SEUIL_ZOMBIES:-3}"
SEUIL_ZOMBIE_MIN="${SEUIL_ZOMBIE_MIN:-10}"
parents_bloques() {
	local tous ppid nombre
	tous="$(LC_ALL=C ps -Ao pid=,ppid=,stat=,etime=,command= 2>/dev/null)"
	awk '$3 ~ /^Z/ { print $2, $4 }' <<<"$tous" | while read -r ppid etime; do
		[ "$(secondes_depuis_etime "$etime")" -ge $((SEUIL_ZOMBIE_MIN * 60)) ] && echo "$ppid"
	done | sort | uniq -c | while read -r nombre ppid; do
		[ "$nombre" -ge "$SEUIL_ZOMBIES" ] || continue
		echo "$ppid $nombre $(awk -v p="$ppid" '$1 == p { $1 = $2 = $3 = $4 = ""; sub(/^ +/, ""); print; exit }' <<<"$tous")"
	done
}

# Sessions Claude : « âge_s rss_ko » par session (binaire `claude` ou
# …/claude/versions/x.y.z).
sessions_claude() {
	local pid etime rss commande exe
	ps -Ao pid=,etime=,rss=,command= 2>/dev/null | while read -r pid etime rss commande; do
		exe="${commande%% *}"
		[ "${exe##*/}" = claude ] || [[ "$exe" == */claude/versions/* ]] || continue
		echo "$(secondes_depuis_etime "$etime") $rss"
	done
}

