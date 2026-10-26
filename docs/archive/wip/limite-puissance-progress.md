---
title: Limite d'une puissance uⁿ quand u → ±∞ (V66)
date: 2026-10-26
status: clos le 2026-10-26 (#1839), versé dans docs/systeme/mathast/README.md (stratégie 2.46)
---

## Reprendre ici

_Mis à jour le 2026-10-26, après #1839 (mergée). Chantier CLOS._

- **État** : V66 corrigé (stratégie 2.46, `powerSign`), versé dans `docs/systeme/mathast/README.md`. Worktree retiré.
- **Suite** : V67-V71 (écarts voisins, `ecarts-a-trier.md`) — David a dit « traite-les » le 2026-10-26 ; phase 0 proposée (2 PR : V70+V71, puis V67-V69), en attente de sa validation.

---

## Journal

- **2026-10-26** — Cause : la composition ne traitait que xⁿ (variable nue) et les nœuds fonction (ln, exp, √) ; la continuité (2.45) refuse une limite intérieure infinie. `powerSign` (sign-tracking) existait, exportée, jamais appelée, fausse pour n < 0 en 0 (rendait 0 au lieu de ±∞). Phase 0 validée par David (« ok go »).
- **2026-10-26** — Première version dans `tryCompositionLimit` (via `classifyWithSign`) : `(x^2-x)^3` restait sans limite, le suivi du signe ne lève pas ∞ − ∞. Règle déplacée dans `evaluate.ts` (2.46, après la continuité 2.45) : limite de la base par le moteur entier. « Comment ? » de l'atelier : étapes « limite d'un produit » ou développement ; `(ln x)²` en 0⁺ sans « Comment ? » (repli). V65 renuméroté V66 (doublon).
- **2026-10-26** — Revue Opus de #1839 : `(\frac{\sin x}{x})^{-1}` en +∞ et `(x\sin\frac{1}{x})^{-1}` en 0 rendaient −∞ (branche u → 0, n < 0 via `classifyWithSign`, qui suppose un signe constant). Branche retirée (hors cible V66) ; garde sur le statut `infinite` de la limite de u. Restes notés : V70 (`1/0` exact par substitution directe), V71 (suivi du signe), double calcul de la limite de la base avec 2.45 (négligeable, 7 ms sur 8 puissances imbriquées).
