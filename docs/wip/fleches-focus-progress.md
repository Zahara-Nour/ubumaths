# Flèches de la vue Géométrie : la toile prend le focus au clic

## Reprendre ici

_Mis à jour le 2026-10-22, avant la PR._

- **État** : correctif codé, tests verts · **Prochaine action** : PR, CI, merge · **En attente de David** : vérification à la souris · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-fleches-focus` / `fix/atelier-fleches-focus-toile`

## Constat (David, 2026-10-22)

Les flèches, pour déplacer un point, déplaçaient le focus dans la barre d'icônes (gauche/droite) ou faisaient défiler la vue Géométrie. Cause : la toile annule le `pointerdown` (glisser, outils), le navigateur ne lui donnait donc jamais le focus ; les tests M8 le donnaient à la main (`toile.focus()`).
