---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-01, après #2144._

- **État** : liste A finie, hors restes décidés : lots A, 2b, 3, 4, 5 mergés (#2062→#2068, #2097, #2118, #2131, #2144 = L8 clos) ; ménage #2142 (7 tests « deux profs » retirés, agent `mathast-expert` corrigé) ; #2061 (deps) et #1850 (SIGPIPE) mergés, #1802 fermée. Rien en prod.
- **Prochaine action** : page à cocher du lot RGPD de la liste B (T1-T15), puis destructif, puis spécification ; ensuite clore le chantier. La liste A est vide (M19 en passant seulement, L12 sur demande, L15/L25/V34/V17 → `fusion-moteurs`). Reste la **liste B** d'[ecarts-a-trier.md](ecarts-a-trier.md) (décisions de David) ; proposer de la trier par lots, ou clore le chantier (versement des restes dans les Points ouverts).
- **En attente de David** : rien. (Le trigger `log_achievements_to_events` était déjà corrigé en prod depuis le 2026-06-20, migration `20260620130000` ; seul le `it.skip` était périmé → réactivé, `test/reactive-award-achievement`.)
- **Pièges en cours** : `charger-repartir-annuler.svelte.test.ts` (client, shard 2/2) instable : rouge puis vert à la relance (#2061) ; « Code Quality » parfois non déclenchée → `gh workflow run quality.yml --ref <branche>`.
- **Worktree / branche** : aucun.

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
