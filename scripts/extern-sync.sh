#!/usr/bin/env bash
# Clone ou met à jour les dépôts tiers listés dans extern/repos.txt.
# Leur contenu est ignoré par git : seule la liste est versionnée.
set -euo pipefail

cd "$(dirname "$0")/../extern"

{ grep -v -E '^\s*(#|$)' repos.txt || true; } | while read -r url; do
	name=$(basename "$url" .git)
	if [ -d "$name/.git" ]; then
		echo "↻ $name"
		git -C "$name" pull --ff-only
	else
		echo "⤓ $name"
		git clone --depth 1 "$url" "$name"
	fi
done
