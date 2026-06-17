# Short Todos — Progress

> Document de progression du tunnel `docs/wip/short-todos-prompt.md`
> (6 tracks A-F). Mis à jour après chaque track livré pour permettre la
> reprise en cas de crash.

---

## Track A — `expressionName` dans `InstanceBlank` ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~1.5h (estimation prompt révisée : 3-4h — gain via tests
existants déjà solides + structure claire)
**Tests ajoutés** : 11 (7 unit + 3 e2e + 4 deduction = 14 ; un test e2e
ajouté sur recommandation code review)
**Régressions** : 0

### Décisions arbitrées (pré-implémentation)

- Pattern d'usage 3 préservé (caller sans blank, 3e arg explicite) — pas
  de `@deprecated`.
- Quand `expressionName` (3e arg) ET `blank.expressionName` sont tous
  deux présents, le 3e arg explicite **prime** (override caller).
- Marker `<<expr:NAME>>` avec NAME inconnu de `answerFormats` → fallback
  silencieux sur le path « pas de marker » (cohérent avec le comportement
  pré-existant).

### Fichiers modifiés

| Fichier                                                      | Changement                                                                                                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/questions/generator/assign-blank-indices.ts`        | Ajout `expressionNameByIndex?: Record<number, string>` dans `AssignBlankIndicesResult`, peuplé quand un marker matche un `answerFormat` connu. JSDoc regex enrichie. |
| `src/lib/questions/types.ts`                                 | Ajout `expressionName?: string` dans `InstanceBlank`.                                                                                                                |
| `src/lib/questions/generator/instance-generator.ts`          | Propagation depuis `blankResult.expressionNameByIndex[i]` vers `InstanceBlank.expressionName`. Commentaire d'invariant ajouté.                                       |
| `src/lib/mathAST/pedagogical-arithmetic/target-extractor.ts` | Auto-déduction : `effectiveExpressionName = expressionName ?? blank?.expressionName`. JSDoc Q9 mise à jour.                                                          |

### Fichiers de tests modifiés

| Fichier                                                     | Tests ajoutés                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `assign-blank-indices.test.ts`                              | 7 (`describe('expressionNameByIndex — track A propagation map')`) |
| `__tests__/generation-fill-blanks.test.ts`                  | 4 (3 e2e + 1 mixed marker/plain ajouté post-review)               |
| `pedagogical-arithmetic/__tests__/target-extractor.test.ts` | 4 (`describe('expressionName deduction from blank (Track A)')`)   |

### Code review

`code-reviewer` (Opus). Verdict : « Ready to merge with optional minor
doc fixes ». 3 minor doc fixes appliqués post-review :

1. JSDoc `types.ts` : « replaces » → « complements » (le 3e arg n'est
   pas remplacé, il coexiste).
2. JSDoc `assign-blank-indices.ts` : commentaire regex étendu pour
   documenter la contrainte « NAME doit commencer par `expression` ».
3. Commentaire d'invariant ajouté dans `instance-generator.ts:305` sur
   l'alignement `i` ↔ `assignBlankIndices` counter.

Plus 1 suggestion adoptée : test e2e mixed marker + plain blank.

### Quality checks

- ESLint : clean sur les 4 fichiers source + 3 fichiers de tests
- TypeScript : `pnpm check:incremental` → 0 erreur (les 9 ERRORS du
  total brut sont dans `slides/demo`/`extern/`, filtrées par le script)
- Tests Track A : 104/104 verts (assign-blank-indices 32 + generation-
  fill-blanks 38 + target-extractor 34)
- Tests régression : `pedagogical-arithmetic` 256/256, `questions/`
  baseline 11 failures préexistantes orthogonales (variable-resolver,
  color-integration, e2e-fill-blanks-pipeline) — confirmé par stash test.

### Commit

À créer.

---

## Track C — `rationalize-denominator` + `simplify-square-root-of-square` ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~1.5h (estimation prompt révisée : 3-4h — gain via
décisions arbitrées en amont)
**Tests ajoutés** : 27 (13 rationalize + 14 simplifyRootOfSquare)
**Régressions** : 0 (1 test existant `RADICAL_RULES.length` mis à jour
2 → 3, intentionnel)

### Décisions arbitrées (pré-implémentation)

- **C-1** : `simplifyRootOfSquare` opt-in via flag
  `enableSquareRootOfSquare?: boolean`. Off par défaut.
- **C-2** : précondition « radicand non carré parfait » sur
  `rationalizeDenominator` (`simplifyRadical(n, 2n).radicand === 1n`
  identifie les carrés parfaits). Pas de jeu de priorités.
- **2A** : path B (rationalize first) abandonné. Le rule engine est
  bottom-up (`mapNode` from leaves up), donc `extractPerfectSquare` fire
  sur `√8` avant que `rationalizeDenominator` puisse matcher `1/√8` au
  top-level. Résultat V1 : `1/√8 → 1/(2√2)`. Élargir à `c/(k·√n)` est
  out of scope.
- **3A** : `simplifyRootOfSquare` skip TOUS les littéraux numériques
  (y compris `0`). Cohérent avec « rule cible expressions symboliques ».

### Fichiers modifiés

| Fichier                                                                | Changement                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/radicals.ts` | Ajout `rationalizeDenominator` (priority 105, college+) et `simplifyRootOfSquare` (priority 90, lycée+, opt-in). Helper `asSqrtRadicand` durci avec garde `!node`. JSDoc module mise à jour. |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/index.ts`    | Ajout `enableSquareRootOfSquare?` à `LoadRulesOptions`. `simplifyRootOfSquare` injectée comme terminal quand le flag est `true` ET schoolLevel match. Inclusion dans `ALL_RULES_BY_NAME`.    |
| `src/lib/mathAST/pedagogical-arithmetic/pipeline.ts`                   | Propagation de `options.enableSquareRootOfSquare` au loader.                                                                                                                                 |
| `src/lib/mathAST/pedagogical-arithmetic/types.ts`                      | `enableSquareRootOfSquare?: boolean` dans `PedagogicalArithmeticOptions`.                                                                                                                    |

### Tests ajoutés

| Fichier                                            | Tests                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `__tests__/rationalize-denominator.test.ts`        | 13 (basic non-square, signed numerator, precondition C-2, rational denom, √n/√n V1, metadata, e2e bottom-up) |
| `__tests__/simplify-square-root-of-square.test.ts` | 14 (avec flag, sans flag, exposant ≠ 2, opt-in via loader, non-overlap avec extractPerfectSquare, metadata)  |
| `__tests__/radicals.test.ts`                       | 1 ligne modifiée : `RADICAL_RULES.length` 2 → 3 (intentionnel)                                               |

### Code review

`code-reviewer` (Opus). Verdict : « Ready to merge, pending two minor
fixes ». Les 2 fixes appliqués post-review :

1. `rationalize-denominator.test.ts:13` : coverage bullet désormais
   reflète path A (`1/√8 → 1/(2√2)`) au lieu de l'ancien path B
   (`√2/4`) abandonné.
2. `index.ts:141` : retiré le guard `!filtered.includes(simplifyRootOfSquare)`
   redondant (la rule n'est jamais dans `filtered` puisqu'elle est
   exclue de `RADICAL_RULES`).

### Quality checks

- ESLint : clean sur les 7 fichiers modifiés
- TypeScript : `pnpm check:incremental` → 0 erreur (filtered slides/extern)
- Tests Track C : 27/27 verts
- Tests régression : `pedagogical-arithmetic` 283/283, `mathAST` complet
  13363/13363 (0 régression)

### Commit

À créer.

---

## Track E — Cohérence `signs: 'strict'` ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~30 min (estimation prompt révisée : 1h — le câblage
`strictCosmetics.signs` était déjà fait, ne restait qu'à ajouter la rule

- propagation)
  **Tests ajoutés** : 18 (cas right-opposite, left-opposite no-fire E-1,
  nested opposite Q2, loader gating, e2e numérique court-circuit + e2e
  variables fire)
  **Régressions** : 0

### Décisions arbitrées (pré-implémentation)

- **E-1** : `simplifyAddOpposite` fire uniquement à droite. `(-3) + 5`
  reste tel quel (réordonnancement par commutativité hors scope V1).
- **Q1** : `(-3) + (-5)` fire et produit `(-3) - 5` (left opposite
  préservé, right opposite éliminé).
- **Q2** : fizzle si `y` est lui-même un opposite (évite `5 - (-(-3))`
  pire que `5 + (-(-3))`).

### Fichiers modifiés

| Fichier                                                                        | Changement                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/basic-operations.ts` | Ajout rule `simplifyAddOpposite` (priority 25, all levels). Pattern `P._('s')` + condition manuelle (intentionnellement PAS `P.parse('x + -y')` — le matcher `+` est commutatif et matcherait aussi `(-3) + 5`, violant E-1). PAS dans `BASIC_OPERATION_RULES`. |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/index.ts`            | Ajout `needsSignsStrict?` à `LoadRulesOptions`. Injection terminale conditionnelle. Inclusion dans `ALL_RULES_BY_NAME`.                                                                                                                                         |
| `src/lib/mathAST/pedagogical-arithmetic/pipeline.ts`                           | Propagation `needsSignsStrict: target?.strictCosmetics?.signs === 'strict'` au loader.                                                                                                                                                                          |

### Tests ajoutés

| Fichier                          | Tests                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `__tests__/signs-strict.test.ts` | 18 (right-opposite fires, no-fire cases, Q2 nested, metadata, loader gating, e2e variables + e2e numeric short-circuit) |

### Observation pédagogique importante

Pour les **inputs numériques** (`5 + (-3)`), `evaluateBinaryAdd`
(priority 100) accepte `opposite(number)` comme atome numérique et
résoud à `2` directement, court-circuitant `simplifyAddOpposite`
(priority 25). La rule cosmétique est **pédagogiquement utile** seulement
quand l'évaluation est impossible (variables, ex: `2x + (-3x) → 2x - 3x`).
Test e2e dédié pour pin le contrat numérique.

### Code review

`code-reviewer` (Opus). 4 retours :

1. **Issue 1 (Important)** — Pattern `P._('s')` au lieu de `P.parse('x + -y')`.
   Tentative de refactor → **rejetée** : le matcher `+` est commutatif,
   `P.parse('x + -y')` matche aussi `(-3) + 5` violant E-1. Justification
   documentée dans la JSDoc (« Why not `P.parse('x + -y')` »).
2. **Issue 2 (Minor)** — Clarification Q2 transitive pour multi-nesting.
   JSDoc enrichie.
3. **Issue 3 (Suggestion)** — Documenter pourquoi priority 25.
   JSDoc enrichie avec « strictly lower than reduceFraction (30) /
   trivials (50) because signs cosmetics are the LAST cosmetic step ».
4. **Issue 4 (Suggestion)** — Test e2e numérique pour pin contrat
   short-circuit. Ajouté : `5 + (-3) → 2` avec signs strict, vérifie
   pas de step `simplify-add-opposite`.

### Quality checks

- ESLint : clean sur les 4 fichiers modifiés
- TypeScript : `pnpm check:incremental` → 0 erreur
- Tests Track E : 18/18 verts
- Tests régression : `pedagogical-arithmetic` 301/301 (0 régression)

### Commit

À créer.

---

## Track F — Format `--both` dans snapshots démo ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~10 min (estimation prompt révisée : 1-1.5h —
`presentExpression` supportait déjà `format: 'both'`, ne restait qu'à
ajouter un `it.each` parallèle)
**Snapshots ajoutés** : 34 `[both]` (custom + LaTeX stacked)
**Régressions** : 0

### Décision arbitrée (pré-implémentation)

- **F-1** : option A — même fichier `.snap`, snapshots `[both]` ajoutés
  EN PLUS des `custom` existants (pas de fichier dédié). Évite duplication
  de structure.

### Fichier modifié

| Fichier                                                                                | Changement                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/mathAST/pedagogical-arithmetic/__tests__/pedagogical-arithmetic-demo.test.ts` | Ajout `it.each` second avec format `'both'`, label `<original> [both]`. JSDoc mise à jour. |
| `__snapshots__/pedagogical-arithmetic-demo.test.ts.snap`                               | 34 nouveaux snapshots `[both]` ajoutés (à 34 existants `custom`). Total : 68.              |

### Hors scope V1 (confirmé)

- Pas d'extension aux modules consommateurs (`pedagogical-solve/`,
  `pedagogical-differentiation/`, `pedagogical-integration/`,
  `pedagogical-simplify/`, `pedagogical-limits/`, `pedagogical-domain/`).
  À ajouter quand l'utilité est avérée.

### Quality checks

- ESLint : clean
- Tests Track F : 68/68 verts (34 custom + 34 both)
- Tests régression : `pedagogical-arithmetic` 335/335 (0 régression)
- Snapshots stables sur deuxième run (idempotents)

### Note importante

Track F livré APRÈS Track E (respect du couplage F→E annoncé dans le
prompt révisé). Les snapshots `[both]` reflètent donc le pipeline final
incluant `simplifyAddOpposite`. Cela dit, les démos courantes ne
déclenchent pas la rule (pas de `target.strictCosmetics.signs === 'strict'`
dans les test cases), donc en pratique pas de différence visible avec un
hypothétique snapshot pré-E.

### Commit

À créer.

---

## Track B — Variantes fractions early-college ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~1h (estimation prompt révisée : 3-5h — plus rapide
grâce à : la sous-tâche 2 du prompt étant non-applicable
[`toCommonDenominator.applicableLevels` excluait déjà `'primaire'`], et
décisions arbitrées en amont)
**Tests ajoutés** : 18 (17 nouveaux + 1 update `FRACTION_RULES.length`)
**Régressions** : 0

### Décision arbitrée (pré-implémentation)

- **B-1** : option orthogonale `collegeSubLevel?: 'early' | 'late'`,
  PAS d'extension de `SchoolLevel`. Default `'late'` (compat — comportement
  actuel inchangé).

### Découverte importante

La sous-tâche 2 du prompt (« retirer `'primaire'` de `toCommonDenominator.applicableLevels` »)
était **non-applicable** : le code source à `fractions.ts:198` excluait
déjà primaire (`['college', 'lycee', 'superieur']`). Track B se réduit
donc à : ajouter la nouvelle rule + plumbing.

### Fichiers modifiés

| Fichier                                                                 | Changement                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/fractions.ts` | Ajout rule `toCommonDenominatorMultiply` (priority 130, `['primaire', 'college']`). Ajout dans `FRACTION_RULES`. Commentaire `toCommonDenominator` mis à jour pour mentionner la complémentarité. |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/index.ts`     | Ajout `collegeSubLevel?` à `LoadRulesOptions`. Filtre étendu : à collège, discrimination LCM/multiply via `collegeSubLevel`.                                                                      |
| `src/lib/mathAST/pedagogical-arithmetic/pipeline.ts`                    | Propagation `collegeSubLevel` au loader.                                                                                                                                                          |
| `src/lib/mathAST/pedagogical-arithmetic/types.ts`                       | `collegeSubLevel?: 'early' \| 'late'` dans `PedagogicalArithmeticOptions`.                                                                                                                        |
| `src/lib/mathAST/pedagogical-arithmetic/__tests__/fractions.test.ts`    | Update : `FRACTION_RULES.length` 5 → 6 (intentionnel).                                                                                                                                            |

### Tests ajoutés

| Fichier                             | Tests                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/fractions-early.test.ts` | 18 (cross-product, signed numerator Q4, same-denom no-fire, metadata, loader gating tous niveaux × collegeSubLevel, e2e pipeline) |

### Code review

`code-reviewer` (Opus). Verdict : « Ready to merge with one documentation
fix ». 2 fixes appliqués post-review :

1. **Important** — Inconsistance `applicableLevels: ['primaire', 'college']`
   vs commentaire de `toCommonDenominator` (« primaire pas au programme »).
   Résolution : commentaire de `toCommonDenominator` mis à jour pour
   reconnaître la complémentarité, et commentaire ajouté sur `toCommonDenominatorMultiply`
   expliquant l'inclusion intentionnelle de primaire (méthode acceptable
   sans PGCD).
2. **Minor** — Test gap signe. Ajouté : test `(-1)/3 + 1/6 → -6/18 + 3/18`
   vérifiant la préservation du signe via cross-product.

### Quality checks

- ESLint : clean
- Tests Track B : 18/18 verts
- Tests régression : `pedagogical-arithmetic` 353/353 (0 régression)

### Commit

À créer.

---

## Track D — Decimal mantissas dans scientific-notation ✅ Livré

**Date** : 2026-05-07
**Effort réel** : ~30 min (estimation prompt révisée : 3-4h — gain via
décision arbitrée en amont sur la représentation `{ digits: bigint,
decimalPos: number }`)
**Tests ajoutés** : 15
**Régressions** : 0

### Décision arbitrée (pré-implémentation)

Représentation unique `Mantissa = { digits: bigint, decimalPos: number }`
(significand + position du point depuis la droite). Sign porté séparément
(cohérent avec `aSign: 1 | -1` actuel). Toute l'arithmétique en bigint —
**zéro float drift**.

### Fichiers modifiés

| Fichier                                                                           | Changement                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-arithmetic/pedagogical-rules/scientific-notation.ts` | Ajout 5 helpers (`parseMantissa`, `formatMantissa`, `multiplyMantissas`, `addSignedMantissas`, `normalizeScientific`). `applyMultiplyScientific` et `applyAddScientificSamePower` réécrits pour supporter mantissas décimales. JSDoc module + commentaire ligne 207 mis à jour. |

### Tests ajoutés

| Fichier                                         | Tests                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/scientific-notation-decimal.test.ts` | 15 (basic decimal product, renormalize up/down, deep underflow `(0.001 × 10⁰) × 1 → 1 × 10⁻³`, no float drift `(0.1)² → 1 × 10⁰`, signed decimal, zero-mantissa guard, addition + renormalize, opposite-sign cancellation, 2 régressions integer) |

### Code review

`code-reviewer` (Opus). Verdict : « Ready to merge with one test title
fix ». 3 fixes appliqués post-review :

1. **Minor** — Test title obsolète : `'no float drift: (0.1 × 10¹)² → 1 × 10⁻¹'` (faux) corrigé en `'... → 1 × 10⁰'`.
2. **Minor (note documentaire)** — JSDoc `normalizeScientific` enrichie pour expliquer que la représentation après normalize peut être non-minimale (ex: `10 → {digits:10n, decimalPos:1}` au lieu de `{1n, 0}`). Avertissement caller : terminal step uniquement.
3. **Suggestion (test)** — Ajout test « zero-mantissa guard » : `(0 × 10³) × (2 × 10²)` ne fire pas (rule fizzle). Documente l'intent.

Confirmation reviewer : aucun `Number()` / `parseFloat()` / float arithmetic dans le code path. Float drift requirement satisfait.

### Quality checks

- ESLint : clean
- Tests Track D : 15/15 verts
- Tests régression : `pedagogical-arithmetic` 367/367, mathAST complet
  13447/13447 (0 régression)

### Commit

`ce885a2c7`.

---

## 🎉 Tunnel complet — récapitulatif final

**Date de clôture** : 2026-05-07

### Synthèse des 6 tracks livrés

| Track     | Sujet                                             | Estimé     | Réel      | Commit                            | Tests                    |
| --------- | ------------------------------------------------- | ---------- | --------- | --------------------------------- | ------------------------ |
| A         | `expressionName` dans `InstanceBlank`             | 3-4h       | ~1.5h     | `4629911e1`                       | 14                       |
| C         | rationalize-denominator + simplify-root-of-square | 3-4h       | ~1.5h     | `bff974c95`                       | 27                       |
| E         | `signs: 'strict'` (`+ (-y) → - y`)                | 1h         | ~30 min   | `f7c58fe6d`                       | 18                       |
| F         | snapshots format `--both`                         | 1-1.5h     | ~10 min   | `3ddaddd12`                       | 34 snaps                 |
| B         | fractions early-college (multiplication directe)  | 3-5h       | ~1h       | `7d0c5b5d4`                       | 18                       |
| D         | decimal mantissas dans scientific-notation        | 3-4h       | ~30 min   | `ce885a2c7`                       | 15                       |
| **Total** |                                                   | **14-19h** | **~5.5h** | **6 commits + 1 prompt revision** | **126 tests + 34 snaps** |

### Indicateurs de qualité

- **0 régression** sur 13447 tests mathAST + 367 tests pedagogical-arithmetic
- **6 code reviews** (Opus) — toutes « Ready to merge » avec fixes mineurs appliqués
- **ESLint et TypeScript clean** sur tous les fichiers modifiés
- **Aucun `Co-Authored-By: Claude`** dans les commits (préférence utilisateur respectée)

### Décisions arbitrées en amont (gain de temps majeur)

Toutes les ambiguïtés du prompt initial ont été tranchées dans le commit
de révision `4e24ed457` AVANT de commencer l'implémentation :

- **C-1** : `simplifyRootOfSquare` opt-in via flag (default OFF)
- **C-2** : précondition « radicand non carré parfait » sur rationalize
- **B-1** : option orthogonale `collegeSubLevel?`, pas d'extension SchoolLevel
- **E-1** : `simplifyAddOpposite` fire à droite uniquement
- **F-1** : snapshots `[both]` dans le même `.snap` file
- **2A** : path A pour `1/√8 → 1/(2√2)` (rule engine bottom-up)
- **3A** : `simplifyRootOfSquare` skip TOUS les littéraux numériques

Effort réel **3-4× moins** que l'estimation maximale grâce à ces
décisions précises + découvertes (sub-task 2 du Track B non-applicable).

### Documents produits

1. `docs/wip/short-todos-prompt.md` — prompt source (révisé `4e24ed457`)
2. `docs/wip/short-todos-progress.md` — ce document
3. `docs/wip/pedagogical-arithmetic-progress.md` — TODOs post-prompt
   marqués comme livrés (table mise à jour avec hashes des commits)

### Commits du tunnel

- `4e24ed457` — révision short-todos-prompt (corrections + arbitrage 5 décisions)
- `4629911e1` — Track A (`feat(questions)`)
- `bff974c95` — Track C (`feat(pedagogical-arithmetic)`)
- `f7c58fe6d` — Track E (`feat(pedagogical-arithmetic)`)
- `3ddaddd12` — Track F (`test(pedagogical-arithmetic)`)
- `7d0c5b5d4` — Track B (`feat(pedagogical-arithmetic)`)
- `ce885a2c7` — Track D (`feat(pedagogical-arithmetic)`)

### Hors scope V1 (à reprendre si besoin)

- Track C path B (`1/√8 → √2/4` canonique) — exigerait match `c/(k·√n)` post-extract
- Track E left-opposite `(-3) + 5 → 5 - 3` — exigerait commutativity reordering
- Track F extension aux modules consommateurs (pedagogical-solve, etc.)
- Réglage espacement par niveau (TODO encore ouvert dans `pedagogical-arithmetic-progress.md`)
