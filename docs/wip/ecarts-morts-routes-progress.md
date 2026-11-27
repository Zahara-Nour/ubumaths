---
title: Chantier ecarts-morts-routes — code mort (routes d'API et fonctions sans appelant)
date: 2026-11-28
status: en cours
---

# Chantier `ecarts-morts-routes`

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture._

- **État** : lot réservé ([ecarts-lots.md](ecarts-lots.md)), aucun écart traité · **Prochaine action** : vérifier chaque écart (grep des adresses dans `src`, `e2e`, `tests`), puis supprimer · **En attente de David** : rien (lot sans décision) · **Pièges en cours** : chaînes d'adresse (`fetch('/api/…')`) et tests qui seuls appellent le code · **Worktree / branche** : `../ubumaths-wt-ecarts-morts-routes`, `chore/ecarts-morts-routes`

## Écarts du lot

M23, M24, M25, M26, M42, M43, M45 (7).

## Journal

- 2026-11-28 : lot pris, worktree ouvert.
