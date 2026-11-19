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
