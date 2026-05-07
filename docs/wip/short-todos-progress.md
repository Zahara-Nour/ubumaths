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

## Track B, D, F — En attente

Statut : non démarrés.

---

## Documents produits dans ce tunnel

À compléter à la fin du tunnel.

- `docs/wip/short-todos-progress.md` (ce fichier)
- Commits :
  - `4e24ed457` — révision short-todos-prompt
  - `4629911e1` — Track A
  - `bff974c95` — Track C
  - Track E — à venir
