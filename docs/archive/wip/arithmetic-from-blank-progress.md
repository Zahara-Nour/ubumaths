# `kind: 'arithmetic-from-blank'` — Progression

> Source : `docs/wip/mode-b-elargissement-prompt.md` (Track B minimal)
> Plan : `/Users/david/.claude/plans/quirky-sleeping-popcorn.md`
> Date : 2026-05-06
> Commit : `02af36796`

## Objectif

Élimination de la duplication entre l'expression d'arithmétique présente dans
le `statement` d'une question Mode B et celle dupliquée dans
`correction.generatedSteps.expression`. L'auteur peut désormais référencer
l'expression nommée par son nom (le marker `<<expr:NAME>>` déjà détecté en
amont par `assign-blank-indices.ts`).

## Décision architecturale clé

**Pas de refacto de `InstanceBlank`** — le mécanisme `instance.expressions[]`
existait déjà avec `{ name, latex, displayLatex?, answerFormat? }`. Il
manquait simplement un champ **`value?: string`** (optionnel — l'expression
au format custom parsable, post-résolution variables) pour fermer la boucle.

Cela rend obsolète le scope « B0 » du prompt original (refacto
`InstanceBlank.expressionName` + propagation depuis `assign-blank-indices.ts`)
qui reste un TODO indépendant pour `target-extractor.ts` (cf.
`pedagogical-arithmetic-progress.md` TODO #1, hors scope de ce tunnel).

## Phases livrées

### ✅ Phase 1 — `instance.expressions[].value`

**Fichiers** :

- `src/lib/questions/types.ts` — ajout `value?: string` (optionnel) au type
  inline `expressions[]` (lignes 645-655)
- `src/lib/questions/generator/instance-generator.ts` — ligne 354, ajout
  `value: variable.value` dans le push de `expressionsArray`

**Le champ est optionnel** parce que des fixtures de tests construisent
`expressions[]` directement (ex: `target-extractor.test.ts` — 8 sites)
sans passer par `instance-generator.ts`. Absence du champ → fallback
silencieux Mode A dans le case `arithmetic-from-blank` (cf. Phase 2).

**Tests** :

- `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts` :
  - Test étendu `should populate instance.expressions[]` (assert `value`
    post-résolution `'2+3'`)
  - Nouveau test `should populate instance.expressions[].value with custom
format` (assert format custom, pas LaTeX — `2+3*4` vs `2+3 \times 4`)
- 34/34 tests passent dans le fichier (32 existants + 2 nouveaux)

### ✅ Phase 2 — Type + Zod + correction-generator case

**Fichiers** :

- `src/lib/questions/types.ts` — ajout branche `'arithmetic-from-blank'` au
  type `GeneratedSteps` (lignes ~1066-1078)
- `src/lib/questions/template-schema.ts` — ajout `generatedStepsArithmeticFromBlank`
  (lax + strict) dans les `discriminatedUnion`
- `src/lib/questions/generator/correction-generator.ts` :
  - case `'arithmetic-from-blank'` ajouté dans le switch principal (ligne 174)
  - fonction `renderArithmeticFromBlank()` qui :
    1. lookup `instance.expressions.find(e => e.name === expressionName)`
    2. fallback silencieux si absent ou si `expr.value` undefined
    3. parse direct via `parseCustomSafe(expr.value.trim())` — **bypass
       `parseExpression`** (qui appellerait `resolveExpression` +
       `resolveColorReferences`, susceptibles de mutater une string déjà
       résolue qui ressemblerait à une template/color reference)
    4. refus silencieux des relation nodes (cohérent avec `kind: 'arithmetic'`)
    5. délégation au pipeline `pedagogical-arithmetic` :
       `extractPedagogicalTarget` → `generatePedagogicalArithmeticSteps` →
       `PedagogicalArithmeticRenderer.renderAll`

**Décision post-code-review** : le contrat est crisp — pas de re-résolution
des variables (qui était un no-op silencieux dans le cas typique mais
risquée pour les edge cases color-references / templates littéraux).

### ✅ Phase 3 — Tests + fixture + page debug

**Tests dédiés** (`src/lib/questions/generator/correction-generator.test.ts`,
suite `arithmetic-from-blank`) — **7 tests** :

1. Lookup nominal + `_renderedSteps` non-vide
2. Multi-expressions, ciblage correct via `expressionName`
3. Fallback silencieux si name inconnu
4. Fallback silencieux si `expr.value` absent (mock fixture sans le champ)
5. Fallback silencieux si `value` non-parsable
6. Refus silencieux si relation node
7. Override `schoolLevel: 'lycee'` propagé jusqu'au renderer

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
  - tous les steps `schoolLevel === 'primaire'` + snapshot stable
- 1 nouveau snapshot écrit (verrouille le rendu)

**Page debug** (`src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`) :

- Import + `generateInstance` + `buildAnswerResult` correct/incorrect
- 16e card dans la section « Aperçu direct `<GeneratedStepsCorrection>` »
- Cards 31 et 32 dans la section « `<CorrectionCard>` flux complet »
- État de génération inclut le compteur `arithmeticFromBlankDemo`
- JSON brut inclut `arithmeticFromBlank`

### ✅ Phase 4 — Quality + doc + commit

- `mcp__svelte__svelte-autofixer` sur la page debug : **0 issue, 0 suggestion**
- `npx eslint <10 fichiers modifiés>` : **0 erreur, 0 warning**
- `pnpm check:incremental` : **0 nouvelle erreur** (9 préexistantes filtrées
  dans `slides/demo` et `extern/`)
- Code review (`code-reviewer` agent Opus) : 3 issues identifiées + corrigées :
  1. **Critical** : `value: string` requis cassait `target-extractor.test.ts`
     (8 sites construisant `expressions[]` sans `value`) → rendu optionnel
  2. **Important** : `parseExpression` re-running `resolveExpression` sur
     une string déjà résolue → risque sur color-references / templates
     littéraux → bypass via `parseCustomSafe` direct
  3. **Important** : `console.warn` inconsistent avec les 9 autres kinds
     qui font silent fallback → retiré pour cohérence
- Doc : ce fichier
- MAJ `correction-integration-progress.md` : 9 → 10 kinds, 15 → 16 fixtures
- Commit `02af36796` (FR, sans `Co-Authored-By: Claude`)

## Tests cumulés

| Suite                            | Avant | Après         | Δ   |
| -------------------------------- | ----- | ------------- | --- |
| `generation-fill-blanks.test.ts` | 32    | 34            | +2  |
| `template-schema.test.ts`        | 54    | 58            | +4  |
| `correction-generator.test.ts`   | 36    | 43            | +7  |
| `generated-steps-demo.test.ts`   | 19    | 20            | +1  |
| **Total nouveau code**           | —     | **+14 tests** | —   |

**0 régression** sur les ~600 tests `pnpm test:server src/lib/questions/`.
Les 11 échecs préexistants (`variable-resolver`, `color-integration`,
`test-exact-repro`, `e2e-fill-blanks-pipeline`) ne sont pas liés aux
changements (vérifié via globalIndex spécifiques + nature des échecs sur
blank count / validation roundtrip — orthogonaux à `expressions[].value`).

## Fichiers modifiés (récap)

| #   | Fichier                                                                       | Action                                                                     |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `src/lib/questions/types.ts`                                                  | +`value?: string` sur `expressions[]` ; +branche `'arithmetic-from-blank'` |
| 2   | `src/lib/questions/generator/instance-generator.ts`                           | +`value: variable.value` (1 ligne)                                         |
| 3   | `src/lib/questions/template-schema.ts`                                        | +`generatedStepsArithmeticFromBlank` lax + strict                          |
| 4   | `src/lib/questions/generator/correction-generator.ts`                         | +case + fonction `renderArithmeticFromBlank` (parse direct, silent)        |
| 5   | `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`                | +`arithmeticFromBlankDemo`                                                 |
| 6   | `src/lib/questions/__tests__/generated-steps-demo.test.ts`                    | +1 test snapshot                                                           |
| 7   | `src/lib/questions/generator/correction-generator.test.ts`                    | +7 tests                                                                   |
| 8   | `src/lib/questions/__tests__/template-schema.test.ts`                         | +4 tests Zod                                                               |
| 9   | `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts`        | +2 tests assertion `value`                                                 |
| 10  | `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` | +16e fixture (5 endroits)                                                  |
| 11  | `docs/wip/arithmetic-from-blank-progress.md`                                  | NEW (ce fichier)                                                           |
| 12  | `docs/wip/correction-integration-progress.md`                                 | MAJ compteurs (9→10 kinds, 15→16 fixtures)                                 |

13 fichiers, 602 insertions, 8 suppressions.

## TODO non livrés (intentionnel)

- **`InstanceBlank.expressionName`** propagation via `assign-blank-indices.ts`
  → reste pour le tunnel TODO #1 du prompt arithmétique
  (`pedagogical-arithmetic-progress.md`). Indépendant de ce tunnel.
- **Migration des fixtures existantes** vers `arithmetic-from-blank` →
  laissée intacte sur `additionGroupingDemo` pour préserver la régression de
  l'API `kind: 'arithmetic'` (verbose-with-expression).
- **Track A `kind: 'solve'`** (cubic/quartic/transcendental) → skipé par
  décision utilisateur (l'hypothèse Option A pure était fragile, et le
  besoin produit Tle spé / sup pas vital).

## Documents produits

1. `/Users/david/.claude/plans/quirky-sleeping-popcorn.md` — plan d'exécution
   validé en plan mode
2. `docs/wip/arithmetic-from-blank-progress.md` — ce fichier (progression)
3. `docs/wip/correction-integration-progress.md` — MAJ section « Extensions
   post-MVP » (10e kind + 16e fixture)
