---
title: Lot d'outils « espace » (outils 64 et 65)
date: 2026-11-28
status: phase 0 de l'outil 64 envoyée à David
---

# Lot d'outils « espace »

## Reprendre ici

_Mis à jour le 2026-11-28, avant toute PR._

- **État** : lot réservé ; outil 64 (case « représentation paramétrique » jugée « même droite ») en phase 0 · **Prochaine action** : coder le 64 selon la réponse de David, puis le 65 (point au tiers d'une arête dans ` ```solide `) · **En attente de David** : réponses aux questions de phase 0 du 64 (ci-dessous) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-outil-espace`, `feat/outil-espace`

## Outil 64 — phase 0 (envoyée le 2026-11-28)

Vérifié : aucune nature de case ne juge une représentation paramétrique (rien dans
`src/lib/questions/`). Proposition : `answerKind: 'droite-parametrique'`, une case, trois lignes
`x =`, `y =`, `z =` ; attendue = la représentation de l'auteur ; juste si la droite de l'élève est
la même (point de l'élève sur la droite attendue, vecteurs colinéaires). Questions posées à David
dans le message de la session.
