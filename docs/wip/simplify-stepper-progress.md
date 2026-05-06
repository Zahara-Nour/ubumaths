# Simplify Stepper — Progrès

> **Source du plan** : `docs/wip/simplify-stepper-prompt.md` > **Décision architecturale** : **Option C′** (variante d'Option C — pipeline manuel à la `pedagogical-arithmetic/`, réutilise rule sets pattern + normalize StepRecorder, pas de `rewrite()` pour la passe pédagogique)
> **Démarré** : 2026-05-06

## Objectif

Créer un module `src/lib/mathAST/pedagogical-simplify/` qui implémente un stepper pédagogique pour la simplification d'expressions, sans cloner les ~100 rules pattern existantes ni instrumenter `simplify/simplify.ts`.

## État global

| Phase | Status          | Commit      | Notes                                                                                                                          |
| ----- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0     | ✅ Spec validée | —           | Q1-Q10 tranchées, Option C′ retenue après analyse empirique                                                                    |
| 1     | ✅ Livrée       | `8fc5c8f86` | Types + intent dispatcher + categorize, 109 tests verts (it.each)                                                              |
| 2     | ✅ Livrée       | `a7fdf91af` | Pipeline manuel + bridge normalize StepRecorder + rule binomial + descriptions FR + timeoutMs, 47 nouveaux tests (156 cumulés) |
| 3     | ✅ Livrée       | (à venir)   | Renderer + descriptions FR 4 niveaux + LaTeX 2-line, 18 nouveaux tests (174 cumulés)                                           |
| 4     | ⏳ À venir      | —           | Démos catégorisées + CLI                                                                                                       |
| 5     | ⏳ À venir      | —           | Mode B `kind: 'simplify'` + 2 fixtures + page debug                                                                            |
| 6     | ⏳ À venir      | —           | Quality checks + doc finale + commit                                                                                           |

## Décisions architecturales (Phase 0 — validées)

### A. Architecture C′ (pas A, pas B, pas C-prompt)

**Constat empirique** : `simplify()` actuel produit la mauvaise réponse pédagogique pour 4 cas-test V1 sur 9 (`(x+1)² → (x+1)²` au lieu de `x²+2x+1`, `√8 → √8` au lieu de `2√2`, `sin²+cos² → cos²+sin²` au lieu de `1`, `x²-4 → x²-4` au lieu de `(x+2)(x-2)`). Cost-fixpoint et phantom phases `normalize` sont incompatibles avec la pédagogie.

**Option A (pure renderer sur `simplify()`) éliminée** : sortie souvent fausse, step trace dominé par des boîtes noires.

**Option B (clone parallèle)** : ~1500-2500 LOC réelles (pas 3500), mais coût de synchronisation élevé.

**Option C-prompt (override engine)** : 3 problèmes techniques — skipper normalize casse l'expansion + combine-like-terms ; deterministic ne résout pas le ping-pong rules/normalize ; grouping post-engine est de la rétro-ingénierie fragile.

**Option C′ (retenue)** :

- Pipeline manuel à la `pedagogical-arithmetic/` (loop + match + applyRule + bindings).
- Réutilise les rule sets pattern existants par `import` (pas de duplication).
- **Réutilise `normalize()` directement avec son `StepRecorder`** (qui produit déjà des steps granulaires `combine-like-terms`, `simplify-fraction`, `expand-power`, `radical-simplify`, etc., avec ~80 descriptions FR déjà présentes dans `normal/rule-descriptions-fr.ts`).
- Pas d'appel à `rewrite()` pour la passe pédagogique principale.

### B. Flag `intent` requis (pas de défaut implicite)

```ts
type SimplifyIntent = 'factoriser' | 'developper' | 'reduire' | 'auto';
```

| Intent       | Sémantique                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `factoriser` | Active `algebraicFactoringRules` + identités trig facto, désactive expand-\*                                                         |
| `developper` | Active `expandSumSquared`/`expandDiffSquared`/`productToDiffSquares` + `distribute-binomial-product` (nouvelle), désactive factoring |
| `reduire`    | combine-like-terms + fractions + radicaux + identités trig (pythagore→1) + log/exp + abs. Pas de factoring/expanding ambigu          |
| `auto`       | `reduire` + factoring/expanding **uniquement si non-ambigu** (`√8 → 2√2`, `sin²+cos² → 1`, mais `x²-4` reste tel quel)               |

**Justification** : « simplifier » est polysémique en français. `x²-4` peut être simplifié vers `(x+2)(x-2)` (collège, identité remarquable) ou laissé tel quel (lycée, forme courte). Le générateur de questions sait toujours l'intent (la consigne le dit), donc on l'exige explicitement.

### C. Distribution V1a — atomique via rules existantes

Les 3 rules d'expansion existent déjà dans `algebraic-identities.ts` mais sont exclues de `algebraicSimplifyRules` :

```ts
expandSumSquared; // (a+b)² → a² + 2ab + b²
expandDiffSquared; // (a-b)² → a² - 2ab + b²
productToDiffSquares; // (a+b)(a-b) → a² - b²
```

On les **ré-active** quand `intent: 'developper'`. Pour `(ax+b)(cx+d)` non couvert, on **ajoute UNE nouvelle rule pédagogique** `distribute-binomial-product` (~30-50 LOC).

**Périmètre V1** : binomial × binomial uniquement. `(a+b+c)(d+e)` et `(a+b)³` → V2.

### D. 4 niveaux scolaires distincts (pas de bump)

Différence vs differentiation : la simplification est enseignée **dès le primaire** (réduction de fractions, addition de termes semblables), donc primaire et collège ont leurs propres TITLES + EXPLANATIONS, pas de bump.

| Niveau      | Rules actives par défaut                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `primaire`  | combine-like-terms, simplify-fraction, abs basique                                                  |
| `college`   | + distribution, factorisation simple, identités remarquables, puissances entières, radicaux simples |
| `lycee`     | + identités trig, exp/log, factorisation avancée                                                    |
| `superieur` | tout, vocabulaire compact                                                                           |

`PedagogicalSimplifyNotImplemented` throw si l'expression contient des constructions hors-niveau (ex : trig à `primaire`).

### E. Sub-steps : non pour V1

Type `subSteps?: readonly PedagogicalSimplifyStep[]` présent mais jamais peuplé. Les transformations de simplification sont **plates** par nature (≠ différentiation récursive). Sub-steps reportés en V2 si besoin.

### F. 9 catégories (vs 7 du prompt)

`distribution`, `factorisation`, `combinaison-termes-semblables`, `fractions`, `puissances`, `radicaux`, `identites-trig`, `identites-log-exp`, `valeur-absolue`. Le prompt regroupait log/exp et abs dans « identités » — on les sépare pour clarté.

### G. Mode B `kind: 'simplify'` cohérent

Discriminator étendu de 8 → 9 kinds. Champs : `expression`, `intent` (requis), `variable?`, `enableTrig?`, `enableLogExp?`, `enableAbs?`, `schoolLevel`.

### H. Throw `PedagogicalSimplifyNotImplemented` + fallback Mode A

Cas : matrices, équations, hyperboliques, cubes, produits non-binomiaux, niveau-mismatch, paramètres formels.

## Cible chiffrée

| Élément                                            | LOC            |
| -------------------------------------------------- | -------------- |
| `types.ts`                                         | 80             |
| `pipeline.ts`                                      | 350            |
| `intent-rules.ts`                                  | 100            |
| `renderer.ts`                                      | 200            |
| `descriptions-fr.ts` (4 niveaux × 9 catégories)    | 400            |
| `pedagogical-rules/distribute-binomial-product.ts` | 50             |
| `demo-cases/`, `demo-helpers.ts`, CLI              | 250            |
| Mode B glue                                        | 80             |
| **Total source**                                   | **~1500 LOC**  |
| **Total tests**                                    | **~110 tests** |

## Anti-pattern à éviter

1. **Ne PAS instrumenter `simplify/simplify.ts`** — il reste intact, rétrocompatibilité parfaite.
2. **Ne PAS dupliquer les rule sets** — `import` depuis `pattern/rule-sets/`.
3. **Ne PAS appeler `rewrite()`** pour la passe pédagogique principale (boucle manuelle).
4. **Ne PAS utiliser `cost-fixpoint`** — l'intent driverait le choix de forme.
5. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

## Phase 1 — Livraison

### Fichiers livrés

- `src/lib/mathAST/pedagogical-simplify/types.ts` (~190 LOC)
  - `ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES` (`as const` array, 10 entrées)
  - Sentinel `PEDAGOGICAL_SIMPLIFY_CATEGORY_COUNT`
  - Types : `PedagogicalSimplifyCategory`, `SimplifyIntent`, `SimplifyBindings`, `PedagogicalSimplifyStep`, `PedagogicalSimplifyOptions`, `PedagogicalSimplifyResult`
  - Error class `PedagogicalSimplifyNotImplemented`
- `src/lib/mathAST/pedagogical-simplify/intent-rules.ts` (~280 LOC)
  - `selectRulesForIntent(intent, flags) → { rules, useNormalize }`
  - `categorizeRule(name) → category` (map exhaustive ~110 entrées)
  - `dedupeByName` interne
- `src/lib/mathAST/pedagogical-simplify/__tests__/types.test.ts` (~130 LOC, 11 tests)
- `src/lib/mathAST/pedagogical-simplify/__tests__/intent-rules.test.ts` (~280 LOC, 97 tests dont it.each)

### Tests cumulés

- **108 tests verts** (Phase 1)
- 0 régression sur `simplify/` + `pattern/` (1079 tests verts)

### Décisions Phase 1 (validées)

- Map `categorizeRule` unifiée pour rules pattern + rules normalize (espaces de noms disjoints)
- Flag `enableLogExp` ajouté (default true au lycée+, false au primaire/collège)
- `useNormalize` boolean dans le retour du dispatcher (granularité plus fine reportée si besoin)
- `as const` array + sentinel pour les catégories (pas seulement sentinel)
- `globalBefore`/`globalAfter` présents dans le step (populés en Phase 2)
- Numeric factoring rules (`diff-squares-numeric`, `sum-cubes-numeric`, `diff-cubes-numeric`) exclues d'`auto` (ambiguïté pédagogique : `x²-4` doit-il être factorisé ?)

## Phase 2 — Livraison

### Fichiers livrés

- `src/lib/mathAST/pedagogical-simplify/pipeline.ts` (~280 LOC)
  - `generatePedagogicalSimplifySteps(node, options)` entry point
  - `rejectUnsupported` walker (matrices, inéquations → throw)
  - `resolveFlags` defaults par `schoolLevel`
  - `runPatternLoop` (Phase A — boucle manuelle `applyRulesDeepOnceTracked`)
  - `runNormalizePass` (Phase B — bridge `normalize()` + `StepRecorder`)
- `src/lib/mathAST/pedagogical-simplify/pedagogical-rules/distribute-binomial-product.ts` (~110 LOC)
  - 1 rule pattern unique pour `(a±b)(c±d)` → 4 termes pré-distribués
  - Priority `-1` pour laisser passer les identités remarquables d'abord
- `src/lib/mathAST/pedagogical-simplify/pedagogical-rules/index.ts` (barrel)
- `src/lib/mathAST/pedagogical-simplify/__tests__/pipeline.test.ts` (29 tests)
- `src/lib/mathAST/pedagogical-simplify/__tests__/distribute-binomial-product.test.ts` (10 tests)
- Patch `intent-rules.ts` : intègre `distributeBinomialProduct` dans `'developper'` + categorize map

### Tests cumulés Phase 1 + 2

- **156 tests verts** (109 Phase 1 + 47 Phase 2)
- 0 régression sur `simplify/` + `pattern/` + `normal/` (2525 tests adjacents)

### Code review fixes appliqués (Phase 2)

- **Should-fix #1 — tree walker** : `rejectUnsupported` rejette désormais `piecewise`, `logical`, `logical-not` outright (et non pas par walk profond). Évite que des matrices/inéquations cachées dans une condition piecewise glissent à travers.
- **Should-fix #2 — `timeoutMs`** : wired up via `composeAbortSignal` (cleanup via `dispose` dans un `finally`). `timeoutMs <= 0` = abort immédiat (sémantique testable).
- **Should-fix #3 — descriptions FR** : nouveau module `descriptions-fr.ts` avec `PATTERN_RULE_DESCRIPTIONS` pour les rules pattern + fallback sur `normal/rule-descriptions-fr.ts` pour les rules normalize. Plus aucune description `"Règle: <name>"` brute dans les steps.
- **Nitpick #6 — concurrence** : `nextId` déplacé dans une closure (`createStepFactory`) pour éliminer le risque de corruption en cas d'appels concurrents (`Promise.all` côté serveur).
- **Test coverage** : assertion stricte ajoutée pour `(a-b)(c-d)` (vérifie le sign table par output exact), tests pour piecewise/logical/timeoutMs reject + tests descriptions FR.

### Limitation connue V1 — `reduire` peut développer

`normalize()` canonicalise les polynômes, ce qui inclut le développement de `(x+1)²` en `x²+2x+1`. Sous l'intent `reduire`, le pattern `expand-sum-squared` est exclu du rule set, mais normalize l'expansera en Phase B. C'est documenté dans `pipeline.test.ts` et accepté pédagogiquement (la forme développée EST une forme tidied-up canonique). Seul `factoriser` préserve la forme factorisée (parce qu'il skippe normalize).

### Notation `\sin^2(x)` vs `\sin(x)^2`

Le parser distingue les deux : `\sin^2(x)` produit un `FunctionNode` avec `power: 2`, `\sin(x)^2` produit un `SuperscriptNode` au-dessus du `FunctionNode`. La rule `pythagorean` (et toutes les rules trig) sont écrites pour la 1re forme. **Tous les inputs trig doivent utiliser la notation `\sin^2(x)`.**

## Documents de référence

- `docs/wip/simplify-stepper-prompt.md` — prompt source
- `docs/wip/differentiation-stepper-progress.md` — modèle de format
- `src/lib/mathAST/pedagogical-arithmetic/pipeline.ts` — modèle de pipeline manuel
- `src/lib/mathAST/normal/rule-descriptions-fr.ts` — descriptions FR à réutiliser
- `src/lib/mathAST/pattern/rule-sets/algebraic-identities.ts` — rules expand-\* à activer
