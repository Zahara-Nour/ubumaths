---
title: Lot d'écarts « fiches » (PDF et Typst)
date: 2026-11-28
status: en cours
---

# Lot d'écarts « fiches »

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR._

- **État** : L85, T23, L111 corrigés et barrés au registre (commits sur la branche, pas de PR encore). Phase 0 posée à David le 2026-11-28 pour V108 (+ M44), V109, V111, L86 (question d'accès), L9 (décision du 2026-11-03 à revoir).
- **Prochaine action** : coder les cinq points tranchés (§ Questions), dans cette même PR : L9, V111, V108 + M44, V109, L86.
- **En attente de David** : rien.
- **Pièges en cours** : la preuve de M44 utilise `--include=*.ts` : la rejouer sous bash, pas zsh (glob). Tests de preuve : `ECARTS_PREUVES=1 npx vitest run --project ecarts …`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-fiches` · `fix/ecarts-fiches`.

## Écarts du lot

V108, V109, V111 (visibles, phase 0) · L9, L85, L86, L111 (latents) · T23 (RGPD) · M44 (code mort).

## Questions posées à David (2026-11-28)

1. **V108 + M44** : au corrigé d'une série d'automatismes, vecteur attendu en flèche verte, droite verticale en vert ; le dessin `solved` de `courbe-typst.ts` (M44, sans appelant) servirait au lieu d'être supprimé.
2. **V109** : au corrigé imprimé, aiguilles de l'horloge à régler et barre à construire dessinées en vert.
3. **V111** : fiche anglaise, notion sans nom anglais : quel titre en tête ?
4. **L86** : fonction SQL (droits de l'appelant) qui écrit notions et fiche d'un coup ; question d'accès.
5. **L9** : la prod n'a pas STIX Two Math (polices du bundle typst.ts : New Computer Modern Math) ; le témoin devrait la retirer plutôt que la mettre dans le dépôt.

**Tranché par David le 2026-11-28 (« d'accord » sur les recommandations)** : (1) V108 + M44 : flèche verte, pointillés de construction gardés, dessin `solved` appelé (pas supprimé) ; (2) V109 : aiguilles et barre en vert ; (3) V111 : nom anglais de la branche s'il existe, sinon « Worksheet » ; (4) L86 : fonction SQL aux droits de l'appelant, accès inchangé ; (5) L9 : STIX retirée du témoin (décision du 2026-11-03 remplacée).

## Historique

- 2026-11-28 : L85 (`escapeTypst` échappe `//` et `/*`), T23 (`escapeTypstBrackets` sur le texte du prof d'une fiche), L111 (refus HTTP relevé tel quel) ; tests compilés pour de vrai, vérifiés rouges sans le correctif.

- 2026-11-28 : lot pris, worktree ouvert, preuves rejouées (9 rouges).
