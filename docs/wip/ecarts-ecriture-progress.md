# Chantier `ecarts-ecriture` — écarts d'écriture vue par l'élève

## Reprendre ici

_Mis à jour le 2026-11-01, PR ouverte._

- **État** : V39, V44, V46, V51, V52 corrigés sur `fix/ecarts-ecriture`, PR ouverte, pas mergée ·
  **Prochaine action** : revue (`code-reviewer` opus, mathAST) puis merge · **En attente de David** :
  lecture de `\ln 5^2` par le parseur (V39, groupe B) ; écriture de `\sin\left( x \right)^2`
  (`\sin^2 x` ou parenthèses) ; solution `\dfrac{-6}{\pi - 9}` de V52 (`canonicalForm`, hors périmètre)
  · **Pièges en cours** : trois attendus de `integration/__tests__` mis à jour (forme ambiguë de V39)
  · **Worktree / branche** : `ubumaths-wt-ecarts-ecriture` / `fix/ecarts-ecriture`

## Journal

- 2026-11-01 : ouverture. Source : [ecarts-a-trier.md](ecarts-a-trier.md), groupe A « Écriture vue
  par l'élève ».
- 2026-11-01 : les cinq écarts re-mesurés (tous présents), corrigés un commit chacun, test rouge
  vérifié d'abord. Doc : `docs/systeme/mathast/README.md` (paragraphe « Écarts d'écriture »).
