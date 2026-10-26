# Console de l'atelier en panneau flottant

## Reprendre ici

_Mis à jour le 2026-10-26, avant la PR._

- **État** : CSS écrit (`AtelierContainer.svelte`, `.console`), tests de la console verts, `check:incremental` à 0 · **Prochaine action** : avis de David sur le serveur de test (port 5177), puis PR · **En attente de David** : le rendu · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-console-flottante` / `fix/console-flottante`

## Journal

- 2026-10-26 — David : sur bureau, la console pleine largeur et opaque donne l'impression d'un atelier coupé en deux. Choix retenu : panneau flottant (marges, coins arrondis, ombre) en verre dépoli (fond 90 % + flou) ; fond plein si `prefers-reduced-transparency` ou `prefers-contrast: more` ; téléphone inchangé (pleine scène, opaque).
