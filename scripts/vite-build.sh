#!/bin/bash
# `vite build` avec un plafond de heap V8 adapté à la machine (lancé par
# `pnpm build`, sous le verrou de scripts/gros-process.sh).
#
# Vercel (variable VERCEL) : conteneur de 8 Go en tout. Avec un heap à
# 8192 Mio, Node peut à lui seul remplir le conteneur : SIGKILL « Out of
# Memory » pendant l'étape de l'adaptateur (v0.52.0, 2026-10-27, deux builds
# de suite). Mesuré le 2026-10-28 dans un conteneur Linux 8 Go / 2 cœurs
# (docker --memory=8g --cpus=2) : pic 7,67 Go à 8192, 7,02 Go à 6144. Sous
# 6144 le build manque de heap (« Reached heap limit » à 5120 et à 4096).
#
# Ailleurs (Mac, CI) : 8192, la mémoire ne manque pas.
set -euo pipefail
if [ -n "${VERCEL:-}" ]; then
	heap=6144
else
	heap=8192
fi
NODE_OPTIONS="--max-old-space-size=$heap" exec vite build "$@"
