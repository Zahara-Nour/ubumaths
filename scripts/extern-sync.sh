#!/usr/bin/env bash
# Clone ou met à jour les dépôts tiers listés dans extern/repos.md.
# Seules les lignes qui commencent par une URL https:// (précédée ou non de « - ») sont lues.
# Leur contenu est ignoré par git : seule la liste est versionnée.
set -euo pipefail

cd "$(dirname "$0")/../extern"

{ grep -E '^[[:space:]]*(- )?https://' repos.md | grep -oE 'https://[^[:space:]]+' || true; } | while read -r url; do
	name=$(basename "$url" .git)
	if [ -d "$name/.git" ]; then
		echo "↻ $name"
		git -C "$name" pull --ff-only
	else
		echo "⤓ $name"
		git clone --depth 1 "$url" "$name"
	fi
done
