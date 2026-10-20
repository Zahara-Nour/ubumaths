---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-10-20, V62 + V65 corrigés sur `fix/v62-v65` (PR à ouvrir)._

- **État** : V62 (redéfinir sous un autre type → refus, `defineObject`) et V65 (`solve` sans inconnue, plusieurs lettres → échec au lieu de « contradiction ») corrigés, tests verts ; marqués ✅ dans [ecarts-a-trier.md](ecarts-a-trier.md).
- **Prochaine action** : merger la PR de V62 + V65 ; puis le reste de A par lots (code mort, commentaires).
- **En attente de David** : (1) `a(x) = x^2` puis `a = 2` garde une fonction constante (règle #905 : `f = …` redéfinit dans sa lettre) — garder ou refuser ? (2) la liste B.
- **Pièges en cours** : les tableaux d'[ecarts-a-trier.md](ecarts-a-trier.md) ne sont pas réécrits (V57, L4, L14… y paraissent encore ouverts) ; `|x^2-1|=3` non résolue (manque à part, noté sous V65).
- **Worktree / branche** : `../ubumaths-wt-v62-v65` · `fix/v62-v65`.

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.
