# Phase 3: Tests Generator

Status: completed
Date: 2025-11-28 11:00

## Fichiers modifiés

- `src/lib/questions/generator/instance-generator.test.ts`
  - Ajout suite de tests `generateInstance - Shared Fields` (12 tests)

## Tests créés

1. should work without shared field (backward compatible)
2. should inherit shared.statement when variation has no statement
3. should use variation.statement over shared.statement when both exist
4. should merge shared.variables with variation.variables
5. should override shared variable when variation has same name
6. should inherit shared.answer when variation has no answer
7. should inherit shared.correction with feedback
8. should inherit shared.choices when variation has no choices
9. should resolve random expressions in shared variables
10. should allow cross-reference between shared and variation variables
11. should work with multiple variations with different overrides
12. should inherit shared.correction with steps

## Résultats

- 12/12 tests passent
- 3 tests pré-existants échouent (GCD, LaTeX braces, min>max validation) - non liés aux shared fields
- 4 tests pré-existants skippés

## Prochaines étapes

- Phase 4: Modifier transformer pour détecter partage

## Commandes exécutées

- `pnpm vitest run src/lib/questions/generator/instance-generator.test.ts` → 32 passed, 3 failed (pre-existing), 4 skipped
