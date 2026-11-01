---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-01, après #2131 (décisions de David plus bas)._

- **État** : lots A, 2b, 3, 4 mergés (#2062→#2068, #2097, #2118, #2131) ; ménage en cours (`chore/menage-mono-prof` : 7 tests « deux profs » supprimés, agent `mathast-expert` corrigé) ; #2061 et #1850 mis à jour avec main, CI en cours, à merger.
- **Prochaine action** : lot 5 = **L8** (9 derniers fichiers vers le logger structuré, avec la doc de leurs zones), worktree `ecarts-l8`.
- **En attente de David** : rien. Signalé : trigger `log_achievements_to_events` lit `NEW.metadata` (colonne absente de `student_achievements`) → tout INSERT y échoue (42703), test sauté dans `mono-teacher-rpc-param-cleanup.test.ts:61`.
- **Pièges en cours** : « Code Quality » parfois non déclenchée → `gh workflow run quality.yml --ref <branche>` ; `playwright install` qui pend → `gh run rerun <id> --failed`.
- **Worktree / branche** : `../ubumaths-wt-menage-mono-prof` (`chore/menage-mono-prof`).

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.

## Décisions de David (2026-11-01, sur mes recos)

- V65 reste `|x^2-1|=3` : **refus gardé** (périmètre affine voulu de `absolute-value.ts`) ; à rouvrir seulement si un modèle de 1re en a besoin.
- #2061, #1850 : à merger (CI fraîche) ; #1802 à fermer.
- Tests RLS `it.skip` « deux profs » : **supprimés**. Agent `mathast-expert` : **corrigé** (`e` = constante d'Euler, `i` = nœud `complex`).
- Liste A : **L8 d'abord** ; **M19 jamais seul** (seulement en passant, dans un chantier de géométrie) ; **L12 sur demande** seulement.
- Écriture : racines approchées → **décimal arrondi avec ≈** (ou forme exacte), jamais une fraction décimale géante ; `\sin(x)^2` → **`\sin^2(x)`** ; `\dfrac{-6}{\pi-9}` → **`\dfrac{6}{9-\pi}`** (dénominateur positif ; touche `tidy` → chantier `fusion-moteurs`).
- `a(x) = x^2` puis `a = 2` : **fonction constante gardée** (cohérent avec #905), l'Atelier doit afficher `a(x) = 2`.
