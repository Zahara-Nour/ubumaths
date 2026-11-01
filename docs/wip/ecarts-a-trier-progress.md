---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-01, après #2144 (#2155 ouverte)._

- **État** : liste A finie — lots A, 2b, 3, 4, 5 mergés (#2062→#2068, #2097, #2118, #2131, #2144 = L8 clos) ; ménage #2142 ; #2061, #1850 mergés, #1802 fermée. Rien en prod. #2155 OUVERTE (`test/reactive-award-achievement`) : réactive le test `award_achievement_manual` (le trigger `log_achievements_to_events` est corrigé en prod depuis le 2026-06-20, vérifié) ; CI rouge avant à cause de la migration en double `20261101215000` (corrigée par #2154, mergée), puis relancée → **vérifier sa CI et la merger**.
- **Prochaine action** : (1) merger #2155 si CI verte, puis retirer `../ubumaths-wt-award-achievement` ; (2) lire les réponses de la **page à cocher du lot RGPD** (liste B, T1-T15) : https://claude.ai/artifact/2qkUgP9ygUJ3J9ocggY6fe (`ArtifactData list`, collection `reponses`, une fiche par id `T1`…`T15`) ; puis lots : doc seule (T9, T12, T13, T14 si infos données), technique (T2 d'abord, puis T1, T6, T7, T8, T15), ensuite les lots B « destructif » et « spécification ».
- **En attente de David** : cocher la page RGPD (0/11 au 2026-11-01) ; T14 = infos des mentions légales dans le commentaire.
- **Pièges en cours** : nouvelles règles de migration (#2165) : `pnpm migration:horodatage`, `pnpm check:migrations --pr <n>` avant merge ; `charger-repartir-annuler.svelte.test.ts` (client) instable ; file de runners saturée.
- **Worktree / branche** : `../ubumaths-wt-award-achievement` (`test/reactive-award-achievement`, #2155).

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
