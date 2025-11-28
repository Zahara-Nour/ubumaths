# Phase 1: Types

Status: completed
Date: 2025-11-28 10:30

## Fichiers modifiés

- `src/lib/questions/types.ts`
  - Ligne 183: `correction?: TemplateMarkdown` → `correction?: QuestionCorrection`
  - Lignes 216-244: Ajout interface `SharedVariationDefaults`
  - Lignes 276-282: Ajout champ `shared?: SharedVariationDefaults` dans `QuestionTemplate`

## Décisions prises

- `SharedVariationDefaults.choices` utilise la même structure inline que `QuestionVariation.choices`
- `QuestionVariation.correction` upgradé de `TemplateMarkdown` à `QuestionCorrection`

## Prochaines étapes

- Phase 2: Modifier instance-generator.ts pour merger shared + variation

## Commandes exécutées

- `pnpm check:fast` → FAIL (erreurs attendues dans generator/transformer)

## Erreurs attendues

- `/src/lib/migration/question-transformer.ts:1089` - type mismatch correction
- `/src/lib/questions/generator/instance-generator.ts:99` - type mismatch correction
