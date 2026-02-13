# Fill-in-Blanks Redesign v2 — Progress

## Phase 1: TypeScript Types (COMPLETE)

### Status: Done

### Changes Summary

**Core type refactoring**: Removed `type` and `transformType` fields from `QuestionTemplate` and `QuestionInstance`, replaced with inferred `getQuestionType()` function. 7 old types collapsed to 2: `fill_in_blanks` (no choices) and `multiple_choice` (has choices). `transformType` entirely removed from codebase and DB. Legacy `solutionPool` replaced by `orderIndependent` flag on `blanks[]`.

### Decisions Made

1. **Type inference via `getQuestionType()`** — `choices` present (et non-vide) = `multiple_choice`, sinon = `fill_in_blanks`. `choices: []` est traite comme `fill_in_blanks`.
2. **`transformType` entierement supprime** — Supprime de types.ts, Zod schemas, API endpoints, migration transformer, QuestionTemplateForm, AnswerEditor, scripts, et colonne DB (migration `20260212162248_drop_transform_type_column.sql`).
3. **`fill_in_blanks` requiert `blanks[]`** — Chaque question fill_in_blanks doit definir `blanks[]`. Pas de champ `solution` pour fill_in_blanks. Le champ `solution` n'existe que pour `multiple_choice`.
4. **DB type column conservee** — Les endpoints API calculent `type` pour la colonne DB (indexation/requetes) mais le champ n'existe plus dans le modele TypeScript.
5. **`solutionPool` remplace par `orderIndependent`** — L'ancien `options.solutionPool` (base sur `solution`) est remplace par `options.orderIndependent` (base sur `blanks[]`). La logique de pool matching est integree dans `validateBlanks()`. Concerne 4 questions sur 633.

### Files Modified

| File                                                                         | Changes                                                                                                                                         |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                                 | Removed `type`/`transformType`, added `getQuestionType()`, `InstanceBlank`, `blankDefaults`, `answerFormats`, `expressions`, `orderIndependent` |
| `src/lib/ubumark/types/ast.ts`                                               | `BlankNode.index`/`InputState.index` JSDoc 1-based→0-based, added `expressionName` on math nodes                                                |
| `src/lib/utils/answer-validator.ts`                                          | Removed `validateWithSolutionPool`, legacy solution fallback. `validateBlanks()` supporte `orderIndependent`. Constraints utilisent `blanks[]`. |
| `src/lib/utils/answer-validator.test.ts`                                     | Rewritten: `blanks[]` partout, zero `solution` pour fill_in_blanks, `orderIndependent` remplace `solutionPool`                                  |
| `src/lib/questions/generator/instance-generator.ts`                          | Adapted to new types, builds `InstanceBlank[]`                                                                                                  |
| `src/lib/questions/generator/content-resolver.ts`                            | `resolveSolution` accepts undefined                                                                                                             |
| `src/lib/questions/validators/template-validator.ts`                         | Type inferred, fill_in_blanks requires `blanks[]` (no solution)                                                                                 |
| `src/lib/questions/validators/template-validator.test.ts`                    | Rewritten: removed all `type:` refs, fill_in_blanks uses `blanks[]` only                                                                        |
| `src/lib/migration/question-transformer.ts`                                  | Removed `AlgebraicTransformType`/`transformType`, `solutionPool` → `orderIndependent`                                                           |
| `src/lib/migration/test-transformer-examples.ts`                             | `getQuestionType(template)` instead of `template.type`                                                                                          |
| `src/lib/server/validation/questions.ts`                                     | Removed `transformType` from Zod schemas                                                                                                        |
| `src/lib/questions/generator/instance-generator.test.ts`                     | Removed `type:` from templates                                                                                                                  |
| `src/lib/questions/generator/test-exact-repro.test.ts`                       | Removed `type:`                                                                                                                                 |
| `src/routes/api/questions/templates/+server.ts`                              | Compute `type` for DB column, removed `transform_type` write                                                                                    |
| `src/routes/api/questions/templates/[id]/+server.ts`                         | Compute `type` for DB column, removed `transform_type` write                                                                                    |
| `src/routes/api/questions/generate/[id]/+server.ts`                          | Removed `type` and `transformType` from `dbRowToQuestionTemplate`                                                                               |
| `src/lib/components/QuestionTemplateCard.svelte`                             | `getQuestionType(template)`, simplified to 2 types                                                                                              |
| `src/lib/components/QuestionPreview.svelte`                                  | Uses `getQuestionType()`                                                                                                                        |
| `src/lib/components/QuestionTemplateForm.svelte`                             | Removed `transformType` state, algebraic_transform branch, AnswerEditor prop                                                                    |
| `src/lib/components/AnswerEditor.svelte`                                     | Removed `transformType` prop, `TRANSFORM_TYPES`, algebraic transform UI section                                                                 |
| `src/lib/components/questions/FlashCard.svelte`                              | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/QuestionCard.svelte`                           | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/CorrectionCard.svelte`                         | Adapted to inferred type                                                                                                                        |
| `src/lib/components/questions/QuestionPreviewBaseCard.svelte`                | Adapted to inferred type                                                                                                                        |
| `src/lib/slides/core/QuestionSlide.svelte`                                   | Adapted to inferred type                                                                                                                        |
| `src/routes/(protected)/dashboard/admin/questions/+page.svelte`              | Badge uses `getQuestionType()`                                                                                                                  |
| `src/routes/(protected)/dashboard/admin/questions/[id]/preview/+page.svelte` | Badge uses `getQuestionType()`                                                                                                                  |
| `src/routes/(public)/demo/question-display-demo/+page.svelte`                | Removed `type:` from instances                                                                                                                  |
| `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte` | `getQuestionType()` for display                                                                                                                 |
| `scripts/import-questions-to-db.ts`                                          | Removed `transformType` from interface and DB insert                                                                                            |
| `scripts/validate-phase1-questions.ts`                                       | Removed `algebraic_transform` validation case                                                                                                   |
| `src/lib/types/database.ts`                                                  | Regenerated after dropping `transform_type` column                                                                                              |
| `docs/wip/options-migration-reference.md`                                    | `solutionPool` → `orderIndependent`                                                                                                             |
| `docs/wip/question-migration-status.md`                                      | `solutionPool` → `orderIndependent`                                                                                                             |

### Files Created

| File                                                                | Description                            |
| ------------------------------------------------------------------- | -------------------------------------- |
| `supabase/migrations/20260212162248_drop_transform_type_column.sql` | DB migration: drop constraint + column |

### Code Review Findings (post-commit fixes)

Issues corrigees apres code review (`code-reviewer` agent) :

1. **`getQuestionType()` edge case** — `choices: []` retournait `multiple_choice`, corrige pour retourner `fill_in_blanks`
2. **Test mis a jour** — Test "should fail multiple_choice without choices" adapte au nouveau comportement

Issues documentees pour phases suivantes :

- **Per-blank validation config** → Phase 4 : les types `InstanceBlank` declarent `precision`, `requiredForm`, `unit` per-blank, mais `validateBlanks()` ne les utilise pas encore (fait seulement `areEquivalent` ou string match).
- **`expectedAnswerLatex` non peuple** → Phase 3 : champ declare sur `InstanceBlank` mais jamais rempli par le generateur. Sert pour le flash back (afficher la bonne reponse en LaTeX apres correction).
- **Inference type blank (math vs text)** → Phase 3 : `InstanceBlank.type` doit etre infere du contexte par le generateur — `'math'` si le `?` est dans `$...$`, `'text'` si `[_]` est dans du texte. `assignBlankIndices` connait ce contexte.

### Test Results

- **1803 passed** | 7 failed (all pre-existing) | 5 skipped
- Pre-existing failures: variable-resolver (2), instance-generator (3), color-integration (2)
- Zero new test failures introduced

### User Feedback Fixes

1. **`blanks[]` obligatoire pour fill_in_blanks** — Le validateur exige `blanks[]` pour toute question fill_in_blanks. Pas de fallback `solution`.
2. **Pas de `solution` pour fill_in_blanks** — Le champ `solution` n'existe que pour `multiple_choice`. Tous les tests ont ete reecrits pour refleter cette regle.
3. **`transformType` entierement supprime** — Y compris la colonne DB `transform_type` et sa contrainte, les scripts d'import/validation, et les composants Svelte.
4. **`solutionPool` remplace par `orderIndependent`** — L'ancien mecanisme base sur `solution` est remplace par un flag `options.orderIndependent` qui utilise `blanks[]`. `validateWithSolutionPool` supprime, logique integree dans `validateBlanks()`.

### Commits

- `9a8c5fe4` — refactor: remove type field from QuestionTemplate/QuestionInstance, infer from structure
- `3e8801c1` — chore: regenerate database types after dropping transform_type column
- `f6ac75a6` — docs: remove all transformType references from documentation
- `69d504bd` — docs: update Phase 1 progress with corrected decisions and complete file list
- `6114e256` — refactor: remove legacy solution fallback from answer-validator
- `1bb8e41a` — refactor: replace solutionPool with orderIndependent on blanks[]

### Next Steps

- **Phase 2**: Parser ubumark + `assignBlankIndices` (Steps 3-4)
- **Phase 3**: Pipeline de generation (Step 6)

---

## Phase 2: Parser ubumark + assignBlankIndices (COMPLETE)

### Status: Done

### Changes Summary

**Parser `<<expr:NAME>>` detection** : Le parser ubumark detecte les marqueurs `<<expr:NAME>>` au debut du contenu math (inline et block). Le marqueur est retire du `expression` et stocke dans `expressionName` sur le noeud AST. 4 sites de creation de noeuds math modifies + 1 helper `extractExpressionMarker()`.

**Nouveau module `assignBlankIndices()`** : Parcourt le statement resolu de gauche a droite avec un compteur global pour assigner des indices 0-based a tous les trous. Gere 3 types de trous : `?` dans math → `\placeholder[N]{}`, `[_]` dans texte → `{{blank:N}}`, `<<expr:NAME>>` → reserve indices via answerFormats.

### Decisions Made

1. **`[_]` pas dans le parser** — `assignBlankIndices()` remplace `[_]` par `{{blank:N}}` avant le parsing. Le parser ne voit jamais `[_]`, seulement `{{blank:N}}` qu'il gere deja. Pas de support `[_]` ajoute au parser.
2. **Expression avec answerFormat : seul l'answerFormat reserve des indices** — Si une zone math contient `<<expr:NAME>>` et que `answerFormats[NAME]` existe, seuls les `?` de l'answerFormat reservent des indices (statement inchange). Les 107 questions fill-in qui ont des `?` dans leur math n'utilisent pas de variable `expression*` — ce sont de simples zones math, traitees par le chemin normal (`?` → `\placeholder[N]{}`). Les deux cas ne se croisent jamais en pratique. Si un editeur cree une expression avec `?` ET un answerFormat, les `?` du statement seraient ignores silencieusement (validation a ajouter dans l'UI editeur — voir issues reportees).
3. **Marqueur `<<expr:>>` preserve dans le statement** — `assignBlankIndices` laisse le marqueur dans le statement. Le parser le retire ensuite pour mettre `expressionName` sur le noeud AST. Double-responsabilite intentionnelle : assignBlankIndices traite les indices, le parser traite le marqueur.
4. **Regex ancre au debut** — `<<expr:NAME>>` ne matche qu'au debut du contenu math (`^<<expr:...>>`), coherent avec le fait que le content-resolver l'insere toujours au debut.

### Files Modified

| File                                        | Changes                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/ubumark/parser/markdown-parser.ts` | Added `extractExpressionMarker()` helper + applied at 4 math node creation sites |

### Files Created

| File                                                            | Description                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/questions/generator/assign-blank-indices.ts`           | New module: assigns 0-based indices to all blanks in a statement |
| `src/lib/questions/generator/assign-blank-indices.test.ts`      | 25 tests for assignBlankIndices                                  |
| `src/lib/ubumark/__tests__/parser/blank-and-expression.test.ts` | 10 tests for `<<expr:NAME>>` parser detection                    |

### Code Review Findings (post-commit fixes)

Issues corrigees apres code review (`code-reviewer` agent) :

1. **Double-comptage `?` dans expressions** — Quand une expression avait un answerFormat, le code remplacait les `?` dans l'answerFormat ET dans le statement, doublant les indices. Corrige : si answerFormat existe pour l'expression, seul l'answerFormat est modifie (statement inchange).
2. **Regex non ancre** — `EXPR_MARKER_REGEX` ne commencait pas par `^`, pouvait matcher un marqueur au milieu du contenu math. Corrige : ancre a `^`.

Issues documentees pour plus tard :

- **Validation editeur : expression avec `?` ET answerFormat** → UI editeur de questions : si une expression contient des `?` dans son contenu ET a un answerFormat, c'est une erreur (les deux sont mutuellement exclusifs). Ajouter une validation dans le formulaire d'edition pour empecher cette configuration.

### Test Results

- **Parser** : 10/10 nouveaux + 719 existants (4 pre-existants en echec sur horizontal tables)
- **assignBlankIndices** : 25/25
- **TypeScript** : `tsc --noEmit` OK sur tous les fichiers modifies/crees
- Zero nouvelle regression

### Next Steps

- **Phase 3**: Pipeline de generation (Step 6)
- **Phase 4**: Validation per-blank (Step 7)

---

## Phase 3: Pipeline de generation (COMPLETE)

### Status: Done

### Changes Summary

**Pipeline fill-in-blanks complet dans `instance-generator.ts`** : Detection des variables expression\*, insertion des marqueurs `<<expr:NAME>>`, resolution des answerFormats (variables + LaTeX), appel a `assignBlankIndices()`, construction de `blanks[]` avec type infere et validation mergee, construction de `expressions[]`, generation de `expectedAnswerLatex`, coherence check `totalBlanks === blanks.length`.

**Nouvelles fonctions dans `content-resolver.ts`** : `insertExpressionMarkers()` insere les marqueurs avant la resolution des variables. `resolveAnswerFormat()` resout les variables puis convertit en LaTeX en preservant les `?`. `convertToLatex()` convertit une expression en LaTeX pour le flash back.

**`assignBlankIndices` augmente** : Retourne `blankTypes: ('math' | 'text')[]` en plus de `statement`, `answerFormats` et `totalBlanks`. Permet au generateur d'inferer le type de chaque blank sans re-analyser le statement.

### Decisions Made

1. **Pipeline answerFormat : resolve → LaTeX → assignBlankIndices** — Les variables sont resolues d'abord (`10^{{a}}` → `10^2`), puis converties en LaTeX (`10^{?}`), puis `assignBlankIndices` remplace les `?` par `\placeholder[N]{}`. Cette sequence garantit une structure LaTeX correcte (ex: `5^{?}` pas `5^?`).
2. **`blankTypes` retourne par `assignBlankIndices`** — Au lieu d'inferer les types separement dans le generateur, `assignBlankIndices` retourne `blankTypes[]` car il connait le contexte (math zone vs texte). Evite la duplication de logique.
3. **`preserveHoles` sur `toLatex`** — Le parser custom cree des `HoleNode` avec indices locaux 1-based (le compteur redemarre a 1 par appel `parseCustomSafe`). `toLatex` les emetait comme `\placeholder[N]{}`. Mais `assignBlankIndices` a besoin de `?` bruts pour assigner des indices globaux 0-based sur l'ensemble du statement (blanks math + blanks texte + blanks d'expressions answerFormat). L'option `toLatex(ast, { preserveHoles: true })` emet `?` directement, sans aller-retour inutile `? → \placeholder[N]{} → ?`.
4. **Resolution conditionnelle de `expectedAnswer`** — Les valeurs textuelles comme "pair", "entier" ne sont pas passees au resolver (qui les traiterait comme des references de variables via `normalizeExpression`). Seules les valeurs contenant `{{` sont resolues.
5. **Validation expression variable manquante** — Si une variable expression\* est detectee dans le statement mais absente des variables resolues, le generateur retourne une erreur explicite.
6. **`solution` toujours `undefined` pour fill_in_blanks** — Coherent avec Phase 1 : `blanks[]` est la source de verite, pas `solution`.

### Files Modified

| File                                                  | Changes                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/generator/instance-generator.ts`   | Pipeline fill-in-blanks complet : detection expressions, insertion markers, assignBlankIndices, blanks avec type infere, expressions[], expectedAnswerLatex, coherence check                                                       |
| `src/lib/questions/generator/content-resolver.ts`     | 3 nouvelles fonctions exportees (`insertExpressionMarkers`, `resolveAnswerFormat`, `convertToLatex`); `convertMathZonesToLatex` gere les marqueurs `<<expr:>>` ; utilise `toLatex({ preserveHoles: true })` pour preserver les `?` |
| `src/lib/questions/generator/assign-blank-indices.ts` | Ajout `blankTypes: ('math' \| 'text')[]` a `AssignBlankIndicesResult`, tracking des types a chaque point d'assignation                                                                                                             |
| `src/lib/mathAST/latex-generator.ts`                  | Ajout option `preserveHoles` a `LatexGeneratorOptions` ; 3 sites d'emission de `\placeholder` conditionnels                                                                                                                        |

### Files Created

| File                                                                   | Description                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/generator/__tests__/generation-fill-blanks.test.ts` | 33 tests couvrant : math blanks simples, text blanks, expression convention, blankDefaults + overrides, mixed blanks, expression + statement blanks, coherence check, exemples reels (patterns globalIndex 10/51/413/411), resolution variables dans blanks |

### Code Review Findings (post-commit fixes)

Issues corrigees apres code review (`code-reviewer` agent) :

1. **Set iteration** — `for...of` sur `Set` converti en `Array.from(set).forEach()` pour compatibilite TypeScript
2. **Validation expression variable manquante** — Ajout d'un `return { success: false, errors: [...] }` si une variable expression\* n'est pas trouvee dans `resolvedVariables`

Issues documentees pour plus tard :

- **Limitation heuristique texte** : La detection `expectedAnswer.includes('{{')` pour savoir si la valeur doit etre resolue est fragile pour des cas theoriques (ex: texte avec `{{color:}}`). Fonctionne pour les 633 questions migrees.
- **Validation position marqueur expression** : `insertExpressionMarkers()` ne verifie pas que `{{expression*}}` est au debut d'une zone math. Si place au milieu, le marqueur est silencieusement ignore par `assignBlankIndices` (le regex est ancre a `^`). A valider dans l'UI editeur.
- **Limitation heuristique texte** (toujours ouvert) : voir ci-dessus.
- **Validation position marqueur expression** (toujours ouvert) : voir ci-dessus.

### Test Results

- **generation-fill-blanks.test.ts** : 33/33
- **assign-blank-indices.test.ts** : 25/25
- **instance-generator.test.ts** : 39/39 (0 skipped — tous corriges post-Phase 3)
- TypeScript : `tsc --noEmit --project tsconfig.json` OK sur fichiers modifies
- Zero nouvelle regression

### Post-Phase 3 Fixes

1. **Tests instance-generator.test.ts corriges** : Les 29 tests en echec (manquaient `blanks[]`, avaient `solution` pour fill_in_blanks) et les 5 tests skipped (ancienne syntaxe `{#:...}`, `{eval:{@:...}}`, double braces LaTeX) ont ete corriges. 39/39 passent, 0 skipped.

2. **Suppression du revert `\placeholder → ?`** : Le hack regex `PLACEHOLDER_REVERT_REGEX` (3 sites dans `content-resolver.ts`) est remplace par l'option `toLatex({ preserveHoles: true })` dans `latex-generator.ts`. Voir decision 3 ci-dessus.

### Commits

- `9dc51f4b` — feat: implement fill-in-blanks generation pipeline (Phase 3)
- `6075ae66` — fix: correct 3 failing instance-generator tests
- `c91cf03e` — fix: unskip all 5 instance-generator tests by fixing syntax issues
- `a8e64948` — refactor: add preserveHoles option to toLatex, remove placeholder revert hack

### Next Steps

- **Phase 4**: Validation per-blank (Step 7)
- **Phase 5**: Composants Svelte (Step 8)

---

## Phase 4: Validation per-blank (COMPLETE)

### Status: COMPLETE

### Phase 4.0 — TDD Specification

#### A. Inference du mode de validation (trou math)

1. Trou math sans `precision` ni `unit` → equivalence (`areEquivalent()`)
2. Trou math avec `precision` (sans `unit`) → numerique approchee (`validateNumerical()`)
3. Trou math avec `unit.expected: true` (sans `precision`) → unite (`validateQuantityAnswer()`)
4. Trou math avec `unit.expected: true` + `precision` → unite avec precision
5. Trou math avec `unit.expected: true` + `unit.required: "m"` → unite imposee

#### B. Validation trou texte (fuzzy)

6. Match exact (casse ignoree) → correct
7. Match accents ignores → correct
8. Levenshtein <= 1 → correct
9. Levenshtein > 1 → incorrect
10. `pool` n'est PAS utilise pour la validation

#### C. Pipeline per-blank (trou math)

11. `validationRules` echouent → short-circuit incorrect
12. `validationRules` passent → continue pipeline (mode infere, requiredForm, constraints)
13. Pas de `validationRules` → mode infere puis `checkRequiredForm` per-blank si correct + LaTeX
14. Puis `applyConstraints` per-blank si correct + LaTeX

#### D. Multi-blank aggregation

15. Tous corrects → `isCorrect: true`
16. Au moins un incorrect → `isCorrect: false` avec feedback
17. `orderIndependent` → pool matching avec mode infere per-blank

#### E. Signature `validateAnswer`

18. Signature polymorphe inchangee, normalisation interne
19. Branch via `instance.choices !== undefined`
20. `requiredForm` et `constraints` per-blank (plus globalement)
21. Suppression de `instance.validationRules` du validateur

#### F. Signature `validateQuantityAnswer`

22. Nouvelle signature : `(userAnswer, correctAnswer, precision?, requiredUnit?)`
23. `requiredUnit` → unite doit matcher exactement
24. `precision` utilise `PrecisionType`
25. 770 tests unitaires existants passent

#### G. Correction generateur

26. Fallback `validationRules` globales sur les blanks : `blank.validationRules ?? resolvedVariation.validationRules`

### Decisions prises

1. **`validationRules` = pre-condition, pas remplacement** — Si les regles passent, le pipeline standard continue (mode infere → requiredForm → constraints). Short-circuit uniquement en cas d'echec.
2. **`instance.validationRules` supprime du validateur** — Le generateur merge les regles globales sur les blanks via fallback. Plus de double chemin de validation.
3. **Prefilled = editable** — Les blanks avec `prefilled` sont valides normalement (l'eleve peut modifier la valeur).
4. **Fuzzy text = vrai Levenshtein** — Distance <= 1 acceptee, pas juste strip accents.
5. **Signature `validateAnswer` inchangee** — Polymorphe, normalisation en `string[]` interne.
6. **`requiredForm` per-blank** — Lu depuis `blank.requiredForm`, pas `instance.requiredForm`.
7. **`constraints` globales mais evaluees per-blank** — `instance.options.constraints` appliquees a chaque blank individuellement.

### Files to modify

| File                                                | Changes                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/utils/answer-validator.ts`                 | Refactorer `validateBlanks()` → validation per-blank, supprimer `instance.validationRules` global |
| `src/lib/questions/units/validator.ts`              | Nouvelle signature `validateQuantityAnswer(userAnswer, correctAnswer, precision?, requiredUnit?)` |
| `src/lib/questions/generator/instance-generator.ts` | Fallback `validationRules` globales sur blanks                                                    |

### Files Created

| File                                            | Description                   |
| ----------------------------------------------- | ----------------------------- |
| `src/lib/utils/answer-validator-blanks.test.ts` | 49 tests validation per-blank |

### Implementation Summary

**`validateQuantityAnswer` rewritten** (units/validator.ts): New signature `(userAnswer, expectedAnswer, precision?, requiredUnit?)`. Removed `ValidationOptions` interface and `requireSameSymbol`. `requiredUnit` uses `checkExactUnitMatch` (coefficient + components) to distinguish km from m. 76 unit tests rewritten and passing.

**Per-blank pipeline** (answer-validator.ts): Added Levenshtein distance + fuzzy text matching. New `validateSingleBlank()` function implements pipeline: validationRules → inferred mode → requiredForm → constraints. New `validateBlankValue()` for order-independent matching. `validateBlanks()` rewritten with per-blank pipeline and aggregation. `validateAnswer()` restructured: fill_in_blanks returns early with per-blank pipeline, multiple_choice keeps global behavior.

**Generator fix** (instance-generator.ts): One-liner `blank.validationRules ?? resolvedVariation.validationRules`.

### Decisions hors-TDD (implementation)

1. **Propagation `constraintViolations` quand `status === 'correct'`** — Les tests existants attendaient `status: 'correct'` et `constraintViolations: []` quand les constraints passent toutes. `validateSingleBlank` retourne toujours `{ status, constraintViolations }` quand du LaTeX est fourni.
2. **Deplacement `requiredForm` instance → blank dans 3 tests existants** — `createInstanceWithRequiredForm()`, "should apply required form before other constraints", "should combine requiredForm and constraints". Coherent avec spec E20 (requiredForm per-blank).
3. **Guard chaine vide `isFuzzyTextMatch`** — Empeche `""` de matcher `"a"` (Levenshtein distance 1).
4. **Suppression `checkSameSymbol`** — Fonction inutilisee apres remplacement par `checkExactUnitMatch`. Detecte par lint.
5. **Signature `validateBlanks` changee** — `(userAnswers, correctAnswers, orderIndependent?)` → `(userAnswers, instance, userAnswersLatex?)`. Pas d'appelants externes.

### Code Review Findings

1. **Empty string guard in fuzzy matching** — Added: prevent `""` from fuzzy-matching `"a"` (Levenshtein distance 1)
2. **Status aggregation improved** — `worstStatus !== 'bad_form'` instead of `=== 'correct'` for better coverage
3. **requiredForm dual-level design** documented — `instance.requiredForm` for multiple_choice, `blank.requiredForm` for fill_in_blanks

### Test Results

- **answer-validator-blanks.test.ts**: 49/49
- **answer-validator.test.ts**: 55/55 (updated: `requiredForm` moved from instance to blank)
- **validator.test.ts** (units): 76/76
- **instance-generator.test.ts**: 39/39
- **Total**: 219 tests, 0 failures

### Commits

- `9904b9f8` — docs: add Phase 4 TDD specification for per-blank validation
- `7ce3ea27` — feat: implement per-blank validation pipeline (Phase 4)

### Next Steps

- **Phase 5**: Transformer de migration (Step 8)

---

## Phase 5: Transformer de migration (IN PROGRESS)

### Status: Phase 5.0 TDD Specification — VALIDATED

### Phase 5.0 — TDD Specification

#### A. Reclassification result/rewrite → fill_in_blanks

1. **Result simple (globalIndex 10)** : `expressions: ["(&1*100) + (&2*10) + &3"]` sans `answerFormats`, sans `choicess` → produit `blanks: [{ expectedAnswer: "eval:a*100+b*10+c" }]`, variable `expression1`, statement `$${{expression1}}$$`. Pas d'`answerFormats` en sortie (defaut `"?"` gere par le generateur).

2. **Result avec answerFormat `10^?` (globalIndex 413)** : `expressions: ["10^&2*10^&3"]`, `answerFormats: ["10^?"]` → produit `blanks: [{ expectedAnswer: "eval:b+c" }]`, `shared.answerFormats: { "expression1": "10^?" }`.

3. **Result avec answerFormat multi-trous `?*10^?` (globalIndex 411)** : `expressions: ["[._&1,&3*10^{&4}_]"]`, `answerFormats: ["?*10^?"]`, `solutionss: [["&1,&3", "&4"]]` → produit 2 blanks : `blanks: [{ expectedAnswer: "a,c" }, { expectedAnswer: "d" }]`, `shared.answerFormats: { "expression1": "?*10^?" }`.

4. **Result sans solutionss** : quand `solutionss` est absent, generer 1 blank par defaut `{ expectedAnswer: "eval:expression1" }` (le resultat est l'evaluation de l'expression).

5. **Pas de reclassification si `choicess` present** : une question avec `expressions` ET `choicess` reste `multiple_choice` (pas de blanks).

#### B. Conversion answerField → fill_in_blanks

6. **AnswerField mono-trou (globalIndex 0, variation 0)** : `answerFields: ["\\text{Le chiffre des dizaines est }$$...$$\\text{.}"]` → statement `Le chiffre des dizaines est $?$.`, `blanks: [{ expectedAnswer: "a" }]`.

7. **AnswerField multi-trous** : `answerFields` avec plusieurs `$$...$$` → statement avec plusieurs `$?$`, un blank par `...`.

8. **AnswerField avec variables dans le texte** : `$$&1$$` dans le texte → `${{a}}$` dans le statement (pas un trou, juste une variable affichee).

#### C. Unite dans la solution (answerField)

9. **AnswerField dont la solution contient une unite** (ex: globalIndex 470, solution `[_&2_km.h^{-1}_]`) → blank avec `unit: { expected: true }`. Detection via pattern `_unit_` dans la syntaxe TinyMath des solutions.

10. **Expressions avec unite visible** (ex: `&1 km = ? m`, globalIndex 426-469) → PAS de champ `unit` sur les blanks. L'unite est visible dans l'expression, l'eleve tape un nombre pur, la validation est une simple comparaison numerique.

#### D. `expressions2` (QCM)

11. **QCM avec `expressions2`** (globalIndex 478, 587) : creer une variable `expression2` depuis `expressions2[i]` en plus de `expression1`. Le statement affiche les deux expressions. Ces questions restent `multiple_choice` (pas de blanks).

#### E. Retirer `type` de la sortie

12. **Plus de champ `type` sur le template** : le transformer ne met plus `type` dans la sortie. Le type est infere de la structure (`choices` present → MC, sinon → FIB).

#### F. Corriger les 8 tests pre-existants

13. **Tests `result.template?.type`** : remplacer par `getQuestionType(result.template!)` ou verifier la structure.
14. **Test `solution` obligatoire** : `solution` n'est plus obligatoire pour fill_in_blanks (blanks est la source de verite). Corriger le test `validateTransformedTemplate`.
15. **Nouveau champ `blanks[]` pour result/rewrite** : les tests qui creent des questions result/rewrite doivent verifier la presence de `blanks[]` au lieu de `solution`.

### Decisions prises

1. **Pas de `unit` pour les expressions avec unite visible** — Les questions Grandeurs 426-469 (`&1 km = ? m`) n'ont pas de champ `unit` sur les blanks. L'unite est decorative dans l'expression, l'eleve tape un nombre pur, la validation est numerique standard.
2. **`unit: { expected: true }` uniquement pour les solutions avec unite** — Seules les questions dont la solution TinyMath contient une unite (pattern `_unit_`) recoivent `unit: { expected: true }` sur le blank. Ex: globalIndex 470 (`[_&2_km.h^{-1}_]`).

### Next Steps

- **Phase 5.1** : Ecrire les tests (`src/lib/migration/__tests__/transformer-fill-blanks.test.ts`)
- **Phase 5.2** : Implementation dans `question-transformer.ts`
