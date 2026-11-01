---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-01, après #2118._

- **État** : lot A fini (#2062→#2068) ; lot 2b (V32, V27, V64) mergé #2097 ; lot 3 (conditions √ et ln, `ecarts-conditions`) mergé #2118, journaux archivés ; lot 4 en cours (`ecarts-lot4` : L10, L16, puis V65 reste `|x^2-1|=3`).
- **Prochaine action** : voir [ecarts-lot4-progress.md](ecarts-lot4-progress.md). Restent de la liste A après lui : M19 (Newton, géométrie), L12 (« Renommer » de l'Atelier : une fonctionnalité), L8 (9 fichiers, avec leur doc). L15, L25, V34, V17 → `fusion-moteurs`.
- **En attente de David** : (1) #2061 (audit dépendances) et #1850 (SIGPIPE) ; (2) supprimer les ~8 tests RLS `it.skip` « deux profs » ; (3) définition de l'agent `mathast-expert` (`e`/`i` = constantes) ; (4) écriture : racines approchées en fraction décimale géante, `\sin(x)^2`, `\dfrac{-6}{\pi-9}` ; (5) `a(x) = x^2` puis `a = 2` garde une fonction constante (#905) — garder ou refuser ? et la liste B d'[ecarts-a-trier.md](ecarts-a-trier.md).
- **Pièges en cours** : « Code Quality » parfois non déclenchée → `gh workflow run quality.yml --ref <branche>` ; `playwright install` qui pend → `gh run rerun <id> --failed`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-lot4` (`fix/ecarts-lot4`).

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.
