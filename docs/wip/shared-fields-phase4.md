# Phase 4: Transformer

Status: completed
Date: 2025-11-28 11:15

## Fichiers modifiés

- `src/lib/migration/question-transformer.ts`
  - Ligne 37: Import `SharedVariationDefaults`
  - Lignes 1009-1203: Section "Shared Fields Detection"
    - Interface `SharedFieldsResult`
    - Fonction `detectSharedFields()` - détecte partage pour: statement, variables, answer, correction, choices, validationRules
    - Helper `hasSharedContent()`
  - Lignes 1219-1299: Nouvelle fonction `createVariationsWithShared()` retourne `{ variations, shared? }`
  - Lignes 1301-1312: `createVariations()` marquée @deprecated
  - Lignes 1517-1524: `transformQuestion()` utilise `createVariationsWithShared()`
  - Ligne 1560: Champ `shared` ajouté au template output

## Logique de détection

- `enounces.length === 1 && variationCount > 1` → `shared.statement`
- `variabless.length === 1 && variationCount > 1` → `shared.variables`
- `solutionss.length === 1 && variationCount > 1` → `shared.answer`
- `correctionDetailss.length <= 1 && variationCount > 1` → `shared.correction`
- `choicess.length === 1 && variationCount > 1` → `shared.choices`
- `testAnswerss.length === 1 && variationCount > 1` → `shared.validationRules`

## Prochaines étapes

- Phase 5: Tests transformer shared detection

## Commandes exécutées

- `pnpm check:fast` → OK (erreurs non liées)
- `pnpm vitest run src/lib/migration/question-transformer.test.ts` → 23 tests pass
