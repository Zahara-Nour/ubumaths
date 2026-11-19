# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-19, avant la PR._

- **État** : garde de `pnpm dev` (refus dans le dépôt principal) + script de surveillance launchd + installeur, testés · **Prochaine action** : PR, CI, merge ; puis dans le dépôt principal `pnpm surveillance:installer` et `bash scripts/surveillance-machine.sh --test` · **En attente de David** : installer l'appli ntfy sur l'iPhone et s'abonner au canal affiché par l'installeur · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-surveillance-machine`, `chore/surveillance-machine`

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).
