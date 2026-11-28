#!/bin/bash
# Garde de `pnpm dev` : pas de serveur de dev dans le dépôt principal.
#
# Toutes les sessions tirent et commitent dans le dépôt principal. Un `vite dev`
# qui y tourne recompile chaque fichier tiré et garde tout en mémoire : le
# 2026-11-19, 4 h 20 et 101 commits plus tard, il pesait 2,5 Go pour ~200 % de
# CPU sans visiteur, et le Mac mini a gelé (docs/pratiques/claude-md-pourquoi.md).
#
# Dépôt principal = le worktree dont le dossier git est le dossier commun
# (`--git-dir` = `--git-common-dir`). Un worktree lié a son propre dossier git.
# Hors dépôt git, ou en CI : on laisse passer.
#
# Tests : scripts/__tests__/garde-dev-depot-principal.test.ts.
set -uo pipefail

[ -n "${CI:-}" ] && exit 0
dossier_git="$(git rev-parse --path-format=absolute --git-dir 2>/dev/null)" || exit 0
dossier_commun="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || exit 0

if [ "$dossier_git" = "$dossier_commun" ]; then
	echo "⛔ Pas de serveur de dev dans le dépôt principal : toutes les sessions y tirent et y commitent." >&2
	echo "   Lancer \`pnpm dev --port 5176 --strictPort\` (5176+) depuis un worktree (docs/pratiques/worktrees.md)." >&2
	exit 1
fi
exit 0
