---
title: Limite d'une puissance uⁿ quand u → ±∞ (V66)
date: 2026-10-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-10-26, PR ouverte._

- **État** : stratégie 2.46 (`tryPowerOfUnboundedLimit`, `limits/evaluate.ts`) + `powerSign` corrigée (n < 0) ; tests verts (mathAST 25 560, atelier). PR ouverte, revue `code-reviewer` (Opus).
- **Prochaine action** : revue, CI, merge.
- **En attente de David** : écarts voisins notés V67-V69 dans `ecarts-a-trier.md`, hors de cette PR (non tranché : traiter ou non) ; exposants entiers seuls.
- **Worktree / branche** : `../ubumaths-wt-limite-puissance` · `fix/limite-puissance`.

---

## Journal

- **2026-10-26** — Cause : la composition ne traitait que xⁿ (variable nue) et les nœuds fonction (ln, exp, √) ; la continuité (2.45) refuse une limite intérieure infinie. `powerSign` (sign-tracking) existait, exportée, jamais appelée, fausse pour n < 0 en 0 (rendait 0 au lieu de ±∞). Phase 0 validée par David (« ok go »).
- **2026-10-26** — Première version dans `tryCompositionLimit` (via `classifyWithSign`) : `(x^2-x)^3` restait sans limite, le suivi du signe ne lève pas ∞ − ∞. Règle déplacée dans `evaluate.ts` (2.46, après la continuité 2.45) : limite de la base par le moteur entier. « Comment ? » de l'atelier : étapes « limite d'un produit » ou développement ; `(ln x)²` en 0⁺ sans « Comment ? » (repli). V65 renuméroté V66 (doublon).
