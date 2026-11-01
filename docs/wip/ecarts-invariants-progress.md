# Chantier `ecarts-invariants` — 3 écarts latents de mathAST

## Reprendre ici

_Mis à jour le 2026-11-01, à l'ouverture de la PR._

- **État** : L21, L28, L31 corrigés sur la branche (un commit chacun), PR ouverte, pas mergée.
- **Prochaine action** : revue (`code-reviewer` en opus), CI verte, merge par la session principale.
- **En attente de David** : rien.
- **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy`, `solve/`.
- **Worktree / branche** : `ubumaths-wt-ecarts-invariants` / `fix/ecarts-invariants-mathast`.

## Journal

- 2026-11-01 : ouverture. Écarts pris dans `docs/wip/ecarts-a-trier.md` (section A, « Latents »).
- L21 : rouge 9/9 (« Unknown command »), rd lit les deux commandes comme pratt.
- L28 : cas réel `-1e-8` (|f| à gauche de 0) substitué en littéral négatif ; `numericNode`.
- L31 : aucun cas visible (le nœud fait main était identique à `opposite()`) ; rouge = garde de source ; `variable` faits main remplacés aussi.
