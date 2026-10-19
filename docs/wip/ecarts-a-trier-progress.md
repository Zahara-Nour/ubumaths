---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-10-19, après la revérification du 2026-10-18 (commit 7846bfae6, pas de PR)._

- **État** : tous les écarts ouverts revérifiés ; tri A (faisable seul) / B (à David) dans la section « Revérification du 2026-10-18 » de [ecarts-a-trier.md](ecarts-a-trier.md), qui fait foi sur ses tableaux.
- **Prochaine action** : V62 (dérivée fausse après redéfinition d'un nom, atelier) + V65 (`solve` rend ∅ au lieu d'un refus), une PR ; puis le reste de A par lots (code mort, commentaires).
- **En attente de David** : le go sur V62 + V65 ; la liste B.
- **Pièges en cours** : les tableaux d'[ecarts-a-trier.md](ecarts-a-trier.md) ne sont pas réécrits (V57, L4, L14… y paraissent encore ouverts) ; ce fichier-ci n'est que le journal, le tri vit là-bas (nom gardé : une dizaine de liens, dont un test de `src/`).
- **Worktree / branche** : aucun (à créer : `fix/v62-v65` → `../ubumaths-wt-v62-v65`).

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.
