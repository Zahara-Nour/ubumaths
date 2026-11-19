#!/bin/bash
# Installe (ou retire) la surveillance du Mac mini dans launchd : toutes les
# 5 minutes, scripts/surveillance-machine.sh du DÉPÔT PRINCIPAL (il suit main).
#
# Usage : surveillance-machine-installer.sh [--desinstaller]
#
# Crée au besoin le canal ntfy (nom aléatoire, ~/.config/surveillance-machine/
# ntfy-topic, lisible par soi seul) et l'affiche : s'y abonner dans l'appli ntfy.
# Journal : ~/.local/state/surveillance-machine/journal.log.
set -euo pipefail

LABEL="local.surveillance-machine"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
CONFIG="$HOME/.config/surveillance-machine"
ETAT="$HOME/.local/state/surveillance-machine"
DOMAINE="gui/$(id -u)"

if [ "${1:-}" = "--desinstaller" ]; then
	launchctl bootout "$DOMAINE/$LABEL" 2>/dev/null || true
	rm -f "$PLIST"
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
		<string>$script</string>
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
	<string>$ETAT/launchd.log</string>
	<key>StandardErrorPath</key>
	<string>$ETAT/launchd.log</string>
</dict>
</plist>
EOF

launchctl bootout "$DOMAINE/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAINE" "$PLIST"

echo "✅ Surveillance installée : $script, toutes les 5 minutes."
echo "   Canal ntfy à suivre dans l'appli : $(cat "$CONFIG/ntfy-topic")"
echo "   Notification de test : bash $script --test"
