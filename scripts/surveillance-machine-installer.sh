#!/bin/bash
# Installe (ou retire) la surveillance du Mac mini dans launchd : toutes les
# 5 minutes, scripts/surveillance-machine.sh du DÉPÔT PRINCIPAL (il suit main).
#
# Installe aussi le relevé des durées (`pnpm durees --releve`, scripts/durees/) :
# chaque matin à 6 h 40, depuis le dépôt principal, même canal ntfy.
#
# Installe enfin la tâche de nuit (`pnpm nuit --lancer`, scripts/nuit/) : chaque
# nuit à 2 h, depuis le dépôt principal (elle travaille dans son propre worktree).
#
# Usage : surveillance-machine-installer.sh [--desinstaller]
#
# Crée au besoin le canal ntfy (nom aléatoire, ~/.config/surveillance-machine/
# ntfy-topic, lisible par soi seul) et l'affiche : s'y abonner dans l'appli ntfy.
# Journal : ~/.local/state/surveillance-machine/journal.log.
#
# Les chemins écrits dans les plists sont échappés (XML) et le dépôt passe en
# argument de bash, jamais collé dans sa commande : un chemin à « & » ou à
# guillemet ne casse rien. SURVEILLANCE_SANS_LAUNCHCTL=1 écrit les plists sans
# les charger (tests : scripts/__tests__/surveillance-installer.test.ts).
set -euo pipefail

LABEL="local.surveillance-machine"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
CONFIG="$HOME/.config/surveillance-machine"
ETAT="$HOME/.local/state/surveillance-machine"
DOMAINE="gui/$(id -u)"
LABEL_DUREES="local.durees-releve"
PLIST_DUREES="$HOME/Library/LaunchAgents/$LABEL_DUREES.plist"
ETAT_DUREES="$HOME/.local/state/durees"
LABEL_NUIT="local.tache-de-nuit"
PLIST_NUIT="$HOME/Library/LaunchAgents/$LABEL_NUIT.plist"
ETAT_NUIT="$HOME/.local/state/nuit"

# Une valeur placée dans un plist : &, < et > échappés.
xml() {
	printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

# Charge un plist dans launchd (sauf essai) : retire l'ancien, charge le nouveau.
charger() {
	[ "${SURVEILLANCE_SANS_LAUNCHCTL:-}" = "1" ] && return 0
	launchctl bootout "$DOMAINE/$1" 2>/dev/null || true
	launchctl bootstrap "$DOMAINE" "$2"
}

if [ "${1:-}" = "--desinstaller" ]; then
	launchctl bootout "$DOMAINE/$LABEL" 2>/dev/null || true
	launchctl bootout "$DOMAINE/$LABEL_DUREES" 2>/dev/null || true
	launchctl bootout "$DOMAINE/$LABEL_NUIT" 2>/dev/null || true
	rm -f "$PLIST" "$PLIST_DUREES" "$PLIST_NUIT"
	echo "Surveillance retirée (canal et journal gardés dans $CONFIG et $ETAT)."
	exit 0
fi

# Le dépôt principal, même lancé depuis un worktree.
commun="$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir)"
depot="$(dirname "$commun")"
script="$depot/scripts/surveillance-machine.sh"
if [ ! -f "$script" ]; then
	echo "⛔ $script introuvable : merger la PR et tirer main dans le dépôt principal d'abord." >&2
	exit 1
fi

mkdir -p "$CONFIG" "$ETAT" "$(dirname "$PLIST")"
if [ ! -s "$CONFIG/ntfy-topic" ]; then
	(umask 077 && echo "mac-$(openssl rand -hex 12)" >"$CONFIG/ntfy-topic")
fi

cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>$(xml "$script")</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
	</dict>
	<key>StartInterval</key>
	<integer>300</integer>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardOutPath</key>
	<string>$(xml "$ETAT/launchd.log")</string>
	<key>StandardErrorPath</key>
	<string>$(xml "$ETAT/launchd.log")</string>
</dict>
</plist>
EOF

charger "$LABEL" "$PLIST"

# ── Relevé des durées, chaque matin ───────────────────────────────────────────
# launchd ne lit pas le profil du shell : le dossier de node et de pnpm (mise,
# nvm…) est relevé ici, une fois. Sans pnpm, node ou gh, le relevé n'est pas installé.
dossier_pnpm="$(dirname "$(command -v pnpm || true)")"
dossier_node="$(dirname "$(command -v node || true)")"
dossier_gh="$(dirname "$(command -v gh || true)")"
if [ "$dossier_pnpm" = "." ] || [ "$dossier_node" = "." ] || [ "$dossier_gh" = "." ]; then
	echo "⚠️  pnpm, node ou gh introuvable : relevé des durées non installé."
else
	mkdir -p "$ETAT_DUREES"
	cat >"$PLIST_DUREES" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL_DUREES</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>-c</string>
		<string>cd "\$1" &amp;&amp; pnpm durees --releve</string>
		<string>durees</string>
		<string>$(xml "$depot")</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>$(xml "$dossier_pnpm:$dossier_node:$dossier_gh"):/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
	</dict>
	<key>StartCalendarInterval</key>
	<dict>
		<key>Hour</key>
		<integer>6</integer>
		<key>Minute</key>
		<integer>40</integer>
	</dict>
	<key>StandardOutPath</key>
	<string>$(xml "$ETAT_DUREES/launchd.log")</string>
	<key>StandardErrorPath</key>
	<string>$(xml "$ETAT_DUREES/launchd.log")</string>
</dict>
</plist>
EOF
	charger "$LABEL_DUREES" "$PLIST_DUREES"
	echo "✅ Relevé des durées installé : pnpm durees --releve, chaque matin à 6 h 40."

	# ── Tâche de nuit, à 2 h ────────────────────────────────────────────────────
	# Même PATH : pnpm, node, et git (/usr/bin). Elle finit avant le relevé de 6 h 40.
	if [ ! -f "$depot/scripts/nuit/index.ts" ]; then
		echo "⚠️  scripts/nuit absent du dépôt principal : tâche de nuit non installée (tirer main d'abord)."
	else
		mkdir -p "$ETAT_NUIT"
		cat >"$PLIST_NUIT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL_NUIT</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>-c</string>
		<string>cd "\$1" &amp;&amp; date &amp;&amp; pnpm nuit --lancer</string>
		<string>nuit</string>
		<string>$(xml "$depot")</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>$(xml "$dossier_pnpm:$dossier_node:$dossier_gh"):/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
	</dict>
	<key>StartCalendarInterval</key>
	<dict>
		<key>Hour</key>
		<integer>2</integer>
		<key>Minute</key>
		<integer>0</integer>
	</dict>
	<key>StandardOutPath</key>
	<string>$(xml "$ETAT_NUIT/launchd.log")</string>
	<key>StandardErrorPath</key>
	<string>$(xml "$ETAT_NUIT/launchd.log")</string>
</dict>
</plist>
EOF
		charger "$LABEL_NUIT" "$PLIST_NUIT"
		echo "✅ Tâche de nuit installée : pnpm nuit --lancer, chaque nuit à 2 h (bilan : pnpm nuit)."
	fi
fi

echo "✅ Surveillance installée : $script, toutes les 5 minutes."
echo "   Canal ntfy à suivre dans l'appli : $(cat "$CONFIG/ntfy-topic")"
echo "   Notification de test : bash $script --test"
