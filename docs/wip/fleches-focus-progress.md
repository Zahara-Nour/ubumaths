# Flèches de la vue Géométrie : la toile prend le focus au clic

## Reprendre ici

_Mis à jour le 2026-10-22, après #1612._

- **État** : livré, #1612 mergée (pas en prod) · **Prochaine action** : aucune ; journal à archiver · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

## Constat (David, 2026-10-22)

Les flèches, pour déplacer un point, déplaçaient le focus dans la barre d'icônes (gauche/droite) ou faisaient défiler la vue Géométrie. Cause : la toile annule le `pointerdown` (glisser, outils), le navigateur ne lui donnait donc jamais le focus ; les tests M8 le donnaient à la main (`toile.focus()`).
