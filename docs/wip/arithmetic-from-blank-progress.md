# `kind: 'arithmetic-from-blank'` — Progression

> Source : `docs/wip/mode-b-elargissement-prompt.md` (Track B minimal)
> Plan : `/Users/david/.claude/plans/quirky-sleeping-popcorn.md`
> Date : 2026-05-06

## Objectif

Élimination de la duplication entre l'expression d'arithmétique présente dans
le `statement` d'une question Mode B et celle dupliquée dans
`correction.generatedSteps.expression`. L'auteur peut désormais référencer
l'expression nommée par son nom (le marker `<<expr:NAME>>` déjà détecté en
amont par `assign-blank-indices.ts`).

## Décision architecturale clé

**Pas de refacto de `InstanceBlank`** — le mécanisme `instance.expressions[]`
existait déjà avec `{ name, latex, displayLatex?, answerFormat? }`. Il
manquait simplement un champ `value: string` (l'expression au format custom
parsable, post-résolution variables) pour fermer la boucle.

Cela rend obsolète le scope « B0 » du prompt original (refacto
`InstanceBlank.expressionName` + propagation depuis `assign-blank-indices.ts`)
qui reste un TODO indépendant pour `target-extractor.ts` (cf.
`pedagogical-arithmetic-progress.md` TODO #1, hors scope de ce tunnel).

## Phases livrées

### ✅ Phase 1 — `instance.expressions[].value`

**Fichiers** :

- `src/lib/questions/types.ts` — ajout `value: string` au type inline
  `expressions[]` (ligne 645)
- `src/lib/questions/generator/instance-generator.ts` — ligne 353, ajout
  `value: variable.value` dans le push de `expressionsArray`

**Tests** :

- `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts` :
  - Test étendu `should populate instance.expressions[]` (assert `value`
    post-résolution `'2+3'`)
  - Nouveau test `should populate instance.expressions[].value with custom
format` (assert format custom, pas LaTeX)
- 34/34 tests passent dans le fichier (32 existants + 2 nouveaux)

### ✅ Phase 2 — Type + Zod + correction-generator case

**Fichiers** :

- `src/lib/questions/types.ts` — ajout branche `'arithmetic-from-blank'` au
  type `GeneratedSteps` (ligne ~1058)
- `src/lib/questions/template-schema.ts` — ajout `generatedStepsArithmeticFromBlank`
  (lax + strict) dans les `discriminatedUnion`
- `src/lib/questions/generator/correction-generator.ts` :
  - case `'arithmetic-from-blank'` ajouté dans le switch principal
  - fonction `renderArithmeticFromBlank()` qui lookup `instance.expressions`
    par `expressionName`, `console.warn` + null si absent, sinon délégation à
    `renderArithmetic({ expression: expr.value, ... })`

**Note d'asymétrie** : `expr.value` est déjà résolu (variables substituées) au
moment où le case est appelé. `renderArithmetic` appelle ensuite
`parseExpression` → `resolveExpression` qui est un **no-op silencieux** sur
une string sans `{{...}}` restants. Documenté en JSDoc.

### ✅ Phase 3 — Tests + fixture + page debug

**Tests dédiés** (`src/lib/questions/generator/correction-generator.test.ts`) :

1. Lookup nominal + `_renderedSteps` non-vide
2. Multi-expressions, ciblage correct via `expressionName`
3. Fallback silencieux + `console.warn` si name inconnu
4. Fallback silencieux si `value` non-parsable
5. Refus silencieux si relation node (cohérent avec `kind: 'arithmetic'`)
6. Override `schoolLevel: 'lycee'` propagé jusqu'au renderer

**Tests Zod** (`src/lib/questions/__tests__/template-schema.test.ts`) :

- Accept avec `expressionName` valide
- Accept avec options
- Reject sans `expressionName`
- Reject avec `expressionName` vide

**Fixture** (`src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`) :

- `arithmeticFromBlankDemo` (CM2, statement avec `{{expression1}}`, calcul
  `2+3*4`, `kind: 'arithmetic-from-blank', expressionName: 'expression1'`)

**Snapshot test** (`src/lib/questions/__tests__/generated-steps-demo.test.ts`) :

- `CM2 arithmetic-from-blank` : assert `instance.expressions[0].value === '2+3*4'`
  - tous les steps `schoolLevel === 'primaire'` + snapshot
- 1 nouveau snapshot écrit (verrouille le rendu)

**Page debug** (`src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`) :

- Import + `generateInstance` + `buildAnswerResult` correct/incorrect
- 16e card dans la section « Aperçu direct `<GeneratedStepsCorrection>` »
- Cards 31 et 32 dans la section « `<CorrectionCard>` flux complet »
- État de génération inclut le compteur `arithmeticFromBlankDemo`
- JSON brut inclut `arithmeticFromBlank`

### ✅ Phase 4 — Quality + doc + commit

- `mcp__svelte__svelte-autofixer` sur la page debug : 0 issue, 0 suggestion
- `npx eslint <fichiers modifiés>` : à exécuter
- `pnpm check:incremental` : à exécuter
- Doc de progression : ce fichier
- MAJ `correction-integration-progress.md` : 9 → 10 kinds, 15 → 16 fixtures
- Commit final FR sans `Co-Authored-By: Claude`

## Tests cumulés

| Suite                            | Avant | Après         | Δ   |
| -------------------------------- | ----- | ------------- | --- |
| `generation-fill-blanks.test.ts` | 32    | 34            | +2  |
| `template-schema.test.ts`        | 54    | 58            | +4  |
| `correction-generator.test.ts`   | 36    | 42            | +6  |
| `generated-steps-demo.test.ts`   | 19    | 20            | +1  |
| **Total nouveau code**           | —     | **+13 tests** | —   |

0 régression (les 11 échecs préexistants dans `variable-resolver`,
`color-integration`, `test-exact-repro`, `e2e-fill-blanks-pipeline` ne sont
pas liés aux changements).

## Fichiers modifiés (récap)

| #   | Fichier                                                                       | Action                                                                    |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `src/lib/questions/types.ts`                                                  | +`value: string` sur `expressions[]` ; +branche `'arithmetic-from-blank'` |
| 2   | `src/lib/questions/generator/instance-generator.ts`                           | +`value: variable.value` (1 ligne)                                        |
| 3   | `src/lib/questions/template-schema.ts`                                        | +`generatedStepsArithmeticFromBlank` lax + strict                         |
| 4   | `src/lib/questions/generator/correction-generator.ts`                         | +case + fonction `renderArithmeticFromBlank`                              |
| 5   | `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`                | +`arithmeticFromBlankDemo`                                                |
| 6   | `src/lib/questions/__tests__/generated-steps-demo.test.ts`                    | +1 test snapshot                                                          |
| 7   | `src/lib/questions/generator/correction-generator.test.ts`                    | +6 tests                                                                  |
| 8   | `src/lib/questions/__tests__/template-schema.test.ts`                         | +4 tests Zod                                                              |
| 9   | `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts`        | +2 tests assertion `value`                                                |
| 10  | `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` | +16e fixture (3 endroits)                                                 |
| 11  | `docs/wip/arithmetic-from-blank-progress.md`                                  | NEW (ce fichier)                                                          |
| 12  | `docs/wip/correction-integration-progress.md`                                 | MAJ compteurs                                                             |

## TODO non livrés (intentionnel)

- **`InstanceBlank.expressionName`** propagation via `assign-blank-indices.ts`
  → reste pour le tunnel TODO #1 du prompt arithmétique
  (`pedagogical-arithmetic-progress.md`). Indépendant de ce tunnel.
- **Migration des fixtures existantes** vers `arithmetic-from-blank` →
  laissée intacte sur `additionGroupingDemo` pour préserver la régression de
  l'API `kind: 'arithmetic'` (verbose-with-expression).
