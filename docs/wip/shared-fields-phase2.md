# Phase 2: Generator

Status: completed
Date: 2025-11-28 10:45

## Fichiers modifiés

### instance-generator.ts

- Lignes 16-26: Import de `QuestionVariation`, `QuestionVariable`, `SharedVariationDefaults`, `ResolvedCorrection`
- Lignes 45-60: Ajout fonction `mergeVariables()`
- Lignes 72-101: Ajout fonction `resolveVariationWithShared()`
- Ligne 149+: Intégration dans `generateInstance()` - step 3 pour résoudre variation avec shared
- Lignes 177-215: Correction resolution mise à jour pour `QuestionCorrection` structure
- Remplacement de `selectedVariation` par `resolvedVariation` dans tout le reste de la fonction

### types.ts

- Lignes 441-445: `QuestionInstance.correction` changé de `ResolvedMarkdown` à `ResolvedCorrection`
- Lignes 624-636: Ajout interface `ResolvedCorrection` avec `feedback` et `steps` résolus

### template-validator.ts

- Lignes 133-144: Validation correction mise à jour pour structure objet

### question-transformer.ts

- Lignes 1086-1091: Création objet `QuestionCorrection` avec array `steps`

### Tests mis à jour

- instance-generator.test.ts (lignes 554-581)
- template-validator.test.ts (ligne 895)
- correction-integration.test.ts (lignes 96-119)
- generator.test.ts (lignes 66-70, 250-258, 276, 342)

## Décisions prises

- `statement` utilise `||` (string vide → shared)
- `answer`, `correction`, `choices`, `validationRules` utilisent `??` (null coalescing)
- `variables` sont mergées, pas overridées
- `blanks` reste per-variation seulement

## Prochaines étapes

- Phase 3: Tests dédiés pour shared fields (merge, override)

## Commandes exécutées

- `pnpm check:fast` → OK (erreurs pré-existantes dans fichiers non liés)
