#!/bin/bash
# Outils communs de surveillance-machine.sh et menage-machine.sh (à sourcer).
# Compatibles avec le bash 3.2 de macOS (/bin/bash, celui de launchd).

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
