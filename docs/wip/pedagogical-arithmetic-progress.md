# Pedagogical Arithmetic — Progress

> Source : `docs/wip/pedagogical-arithmetic-prompt.md`
> Started : 2026-05-05

## Phase 0 — Spécification TDD (terminée ✓)

### Décisions architecturales validées

**Q1** — Nommage : `pedagogical-arithmetic/` (parallèle à `pedagogical-solve/`).

**Q2** — Niveaux scolaires : 4 (`primaire | college | lycee | superieur`), avec `applicableLevels` par règle.

**Q3** — Granularité : règles fines en interne, groupement en post-processing optionnel selon `SchoolLevel`.

**Q4** — Stratégie de terminaison : `'deterministic'` (cohérent avec `pedagogical-solve/`).

**Q5** — Multi-chemins fractions : un chemin canonique par `SchoolLevel` (PGCD si simple, sinon multiplication).

**Q6** — Parser `answerFormat` : module séparé `answer-format-parser.ts`.

**Q7** — Dépendances `extractPedagogicalTarget` : import direct depuis `$lib/questions/types`.

**Q8** — Cas non-couverts : skip silencieux + délégation à `evaluate(exact)`.

**Q9** — `expressionName` : option (b), signature `extractPedagogicalTarget(instance, blank?, expressionName?)`. **TODO post-prompt** : populer `expressionName` directement dans `InstanceBlank` via `generator/assign-blank-indices.ts` pour rendre le 3e arg redondant. Refacto séparée, ~2-3h.

**Q10** — `PedagogicalTarget.structure` typée `TargetForm` (élargie depuis `RequiredForm`). Heuristiques de dérivation dans `extractPedagogicalTarget` :

1. `requiredForm` si déjà valeur `TargetForm` valide → passer tel quel
2. `answerFormat` patterns scientifiques (`'? × 10^?'`, `'10^?'`) → `'scientific'`
3. `reducedFractions: 'strict'` + contexte fraction → `'reduced-fraction'`
4. `precision` decimal + pas de fraction → `'decimal'`
5. fallback `undefined`

`PedagogicalEvaluateOptions.target` override l'extracteur. `answer-format-parser.ts` (Phase 7) utilisé aussi en Phase 2 pour les heuristiques.

**Q11** — Découpage : 1 tunnel continu avec 5-6 commits intermédiaires.

**Q12** — Cohabitation `arithmetic-steps.ts` : Option α (coexistence pure, pas de migration des callers).

**Q13** — Démos : ≥6 catégories avec ≥3 cas chacune.

**Q14** — Agents/modèles : `code-reviewer` Opus après chaque phase, `commit-manager` pour commits intermédiaires, `typescript-expert`/`debugger` Opus en cas de besoin.

### Critères d'acceptation

1. 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
2. `extractPedagogicalTarget()` testé (cascade + champs absents)
3. Pipeline opérationnel sur 4 niveaux pour basic, fractions, radicaux, scientifique
4. Support `answerFormat` extrait fragment exposant
5. Cohérence target → étapes (fraction réduite si strict, etc.)
6. ≥6 catégories de démos avec snapshots stables
7. Script CLI standalone fonctionnel
8. 0 erreur ESLint, 0 nouvelle erreur TS
9. Doc de progression écrite (ce fichier)
10. Commits via `commit-manager` (PAS de `Co-Authored-By: Claude`)

---

## Phase 1 — Infrastructure (terminée ✓)

### Sous-tâches

- [x] 1.1 Élargir `pedagogical-evaluate/types.ts` : `PedagogicalTarget.structure?: TargetForm`
- [x] 1.2 Créer structure `pedagogical-arithmetic/` (squelette)
- [x] 1.3 Types principaux dans `types.ts`
- [x] 1.4 Test d'isolation des types (compilation) — 4/4 tests
- [x] Code review : feu vert (cohérence avec `pedagogical-solve/types.ts`, améliorations vs spec)

### Décisions de design (Phase 1)

- `PedagogicalArithmeticOptions` ajoute `target?` (override), `signal?`, `timeoutMs?` (cohérence avec `PedagogicalEvaluateOptions`).
- `PedagogicalArithmeticRule.priority` documentée par convention : 200+ grouping, 100 atomic, 50 cosmetic, 10 terminal.
- `explanations` retourne `string | undefined` pour skip silencieux selon les bindings.

## Phase 2a — answer-format-parser (basique) (terminée ✓)

### Livré

- `answer-format-parser.ts` : classification haut niveau (`scientific | fraction | power | radical | plain | unknown`)
- 56 tests passent (`__tests__/answer-format-parser.test.ts`)
- Heuristiques utilisées en Phase 2b

Le matching/extraction complet sera ajouté en Phase 7.

## Phase 2b — extractPedagogicalTarget (terminée ✓)

### Livré

- `target-extractor.ts` avec signature `extractPedagogicalTarget(instance, blank?, expressionName?)`
- Cascade : `blank > instance` (variation/shared déjà mergées par le générateur)
- Filtre strict-cosmetics (5 clés : reducedFractions, signs, nullTerms, factorOne, zeros)
- Heuristiques de dérivation `TargetForm` :
  1. `requiredForm` string membre de `TargetForm` → pass-through (drop `{ pattern }`)
  2. `answerFormat` scientifique → `'scientific'` (override fraction)
  3. `reducedFractions: 'strict'` + contexte fraction (requiredForm OU answerFormat) → `'reduced-fraction'`
  4. `precision.type === 'decimal'` + pas de fraction → `'decimal'`
  5. fallback `undefined`
- 27 tests passent (`__tests__/target-extractor.test.ts`)

### TODO post-prompt (refacto séparée ~2-3h)

Populer `expressionName` directement dans `InstanceBlank` via
`generator/assign-blank-indices.ts`. Une fois fait, le 3e argument
`expressionName` devient redondant (déductible depuis `blank`).

## Phase 5 — Règles niveau 3 : radicaux (terminée ✓)

### Livré

- `pedagogical-rules/radicals.ts` — 2 règles :
  - `extractPerfectSquare` (priority 100, college+) — `√8 → 2√2`, `√4 → 2`. Délègue à `simplifyRadical()` de `normal/radical.ts`.
  - `multiplyRadicals` (priority 110, college+) — `√2 × √3 → √6`, `√2 × √8 → 4` (collapse complet). Inclut l'extraction post-multiplication.
- 16 tests passent (`__tests__/radicals.test.ts`)

### Hors scope (Phase 5)

- `rationalize-denominator` (`1/√2 → √2/2`) — nécessite pattern fraction-aware
- `simplify-square-root-of-square` (`√(a²) → |a|`) — nécessite gestion de la valeur absolue

## Phase 6 — Règles niveau 4 : puissances + scientifique (terminée ✓)

### Livré

#### Puissances (`pedagogical-rules/powers.ts`)

- `expandSmallPower` (priority 80, primaire/college) — `2³ → 2 × 2 × 2`. Limite : exposant ≤ 5 (au-delà, `combinePowersSameBase` ou `evaluate(exact)` prennent le relais).
- `combinePowersSameBase` (priority 110, college+) — `2³ × 2⁵ → 2⁸`.
- `powerOfPower` (priority 120, college+) — `(2³)² → 2⁶`.

#### Notation scientifique (`pedagogical-rules/scientific-notation.ts`)

- `toScientificNotation` (priority 100, college+) — `5000000 → 5 × 10⁶`, `0.000037 → 3.7 × 10⁻⁵`. Algorithme string-level pour préserver `3.7` exactement (pas de float drift).
- `multiplyScientific` (priority 110, college+) — `(3 × 10⁴) × (2 × 10⁻²) → 6 × 10²`. Re-normalise les overflow (5×4=20 → 2 × 10).
- `addScientificSamePower` (priority 110, college+) — `3 × 10⁵ + 2 × 10⁵ → 5 × 10⁵`. Mantissas entières seulement (decimal mantissas hors scope MVP).

#### Loader update

- `loadPedagogicalRules({ targetForm: 'scientific' })` injecte les règles scientific-notation. Sans cette opt-in, elles ne fire pas (sinon elles essaieraient de convertir tout entier en notation scientifique).

#### Tests

- 21 tests dans `__tests__/powers-and-scientific.test.ts`
- 8 tests dans `__tests__/load-rules.test.ts` (étendus pour le terminal scientific)
- Total : 195 tests passent

### Décisions design (Phase 6)

- **Mantissas string-level** dans toScientificNotation : préservation exacte de `3.7` (pas de conversion via Number qui perdrait des décimales).
- **Re-normalisation post-multiplication** : `5 × 4 = 20`, donc `(5×10³)×(4×10²) → 20×10⁵ → 2×10⁶`.
- **Mantissa entière obligatoire** pour multiply/add scientific : évite la complexité de l'addition de décimaux en string.
- **Priority `expandSmallPower` (80) < combinePowersSameBase (110) < powerOfPower (120)** : permet à `(2³)² × (2³)²` de se réduire correctement (powerOfPower → combinePowersSameBase → ...).

## Phase 4 — Règles niveau 2 : fractions (terminée ✓)

### Livré

- `pedagogical-rules/fractions.ts` — 5 règles :
  - `toCommonDenominator` (priority 130, college+) — `1/3 + 1/6 → 2/6 + 1/6` via LCM
  - `divideFractions` (priority 120, college+) — `(a/b)/(c/d) → (a/b)×(d/c)`
  - `addSameDenominator` (priority 110, all levels) — `1/6 + 2/6 → 3/6` (sans réduction)
  - `multiplyFractions` (priority 110, college+) — `(2/3)×(5/7) → 10/21` (sans réduction)
  - `reduceFraction` (priority 30, college+) — `3/6 → 1/2` via PGCD ; ré-injectée comme terminal pour primaire si `targetForm === 'reduced-fraction'` ou `needsReducedFractions`
- `loadPedagogicalRules()` étendu avec terminal `reduceFraction`
- 24 tests dans `__tests__/fractions.test.ts`
- 6 tests pour `loadPedagogicalRules` dans `__tests__/load-rules.test.ts`
- Total : 156 tests passent

### Décisions design (Phase 4)

- **Stratégie unique PGCD/LCM** (pas de différentiation collège-précoce vs collège-tardif). Variante "multiplication directe" possible plus tard.
- **`asIntegerFraction` strictement structurel** : matche seulement `divide` et `opposite(divide)`, pas les entiers nus. Évite que `addSameDenominator` ne fire sur `2 + 3` (cas géré par `evaluateBinaryAdd`).
- **`unreducedFractionNode`** : étape intermédiaire sans réduire ; `reduceFraction` est une étape pédagogique distincte.
- **`reduceFraction` priority 30** : tourne après `evaluateBinaryDiv` (100) et `multiplyFractions` (110) pour simplifier ce qu'ils ont produit.

## Phase 3 — Règles niveau 1 : basic operations (terminée ✓)

### Livré

- `pedagogical-rules/basic-operations.ts` — 10 règles :
  - **Atomiques (priority 100)** : `evaluateBinary{Add, Sub, Mul, Div}` — évaluation exacte de `number ⊕ number` (la contrainte `:number` matche aussi les opposés).
  - **Groupement (priority 200, college+)** : `groupMultiplicationsInAddition` — dans une somme avec ≥2 multiplications numériques, les évalue toutes en une étape (pédagogie de regroupement).
  - **Trivial (priority 50)** : `simplify{Add, Sub}Zero`, `simplify{Mul, Div}One`, `simplifyMulZero` — `x+0`, `x-0`, `x*1`, `x/1`, `x*0`.
- `pedagogical-rules/index.ts` — `loadPedagogicalRules({ schoolLevel, targetForm? })` filtre par niveau et appendra les terminaux des phases ultérieures.
- 32 tests passent (`__tests__/basic-operations.test.ts`)
- 0 régression sur 12086 tests `mathAST`

### Décisions design (Phase 3)

- **Évaluation via factory + `evaluate(exact)`** : la replacement function reconstruit l'AST `add(a,b)` puis appelle `evaluate(exact)`. Pas d'optimisation prématurée (pas de cas spéciaux pour les entiers vs fractions).
- **Pattern `:number` accepte les opposés** (`-3`) : on profite de la sémantique du parser de patterns. Pas besoin de canonicalisation préalable.
- **Groupement = `P._('s', P.custom(...))` + replacement custom** : le pattern matche tout nœud, la condition checke `flattenSumShallow(node)` pour ≥2 multiplications, le replacement re-flatten / évalue chaque multiplication / unflatten.
- **`evaluateBinaryDiv` a une condition `b≠0`** explicite (la pattern ne peut pas l'exprimer en `:number`).

### Fichiers à créer

```
src/lib/mathAST/pedagogical-arithmetic/
├── types.ts                      # Types spécifiques
├── pipeline.ts                   # Orchestrateur (Phase 8)
├── target-extractor.ts           # extractPedagogicalTarget() (Phase 2b)
├── answer-format-parser.ts       # Parser answerFormat (Phase 2a + Phase 7)
├── renderer.ts                   # PedagogicalArithmeticRenderer (Phase 8)
├── pedagogical-rules/
│   ├── index.ts                  # loadPedagogicalRules + exports (Phase 8)
│   ├── basic-operations.ts       # Phase 3
│   ├── fractions.ts              # Phase 4
│   ├── radicals.ts               # Phase 5
│   ├── powers.ts                 # Phase 6
│   └── scientific-notation.ts    # Phase 6
├── demo-helpers.ts               # presentExpression (Phase 9)
├── demo-cases/
│   ├── basic.ts, fractions.ts, radicals.ts, scientific.ts,
│   ├── target-form-scenarios.ts, answer-format-scenarios.ts (Phase 9)
│   └── index.ts
└── __tests__/
    ├── target-extractor.test.ts
    ├── pipeline.test.ts
    ├── answer-format-parser.test.ts
    ├── pedagogical-arithmetic-demo.test.ts
    └── __snapshots__/
```

---

## Phase 7 — answer-format-parser enrichi + extraction fragment (terminée ✓)

### Livré

- `extractAnswerFragment(node, format)` ajouté à `answer-format-parser.ts`
- Templates supportés (Phase 7) :
  - `'?'` → fragment = full node (path = `[]`)
  - `'10^?'` → match `superscript(10, exp)` → fragment = exp (path = `['superscript']`)
  - `'? × 10^?'` → match `multiply(a, 10^_)` → fragment = a (mantisse, path = `['left']`)
  - `'\sqrt{?}'` → match `sqrt(arg)` → fragment = arg (path = `['arg']`)
  - `'?^?'` → match `superscript(_, exp)` → fragment = exp (path = `['superscript']`)
- 9 nouveaux tests dans `__tests__/answer-format-parser.test.ts` (67 tests total)

## Phase 8 — Pipeline orchestrateur (terminée ✓)

### Livré

- `pipeline.ts` — `generatePedagogicalArithmeticSteps(node, options)` :
  1. Charge les rules via `loadPedagogicalRules({ targetForm, schoolLevel, … })`
  2. **Pré-passe top-down** pour `groupMultiplicationsInAddition` (avant la rewrite engine bottom-up qui sinon réduirait les multiplications avant que le grouping voie la somme)
  3. Rewrite engine en mode `'deterministic'`
  4. Fallback `evaluate(exact)` si la valeur n'est pas réduite
  5. Post-processing strict (`reduceFraction` final si `reducedFractions: 'strict'`)
  6. Extraction fragment si `target.answerFormat`
- `renderer.ts` — `PedagogicalArithmeticRenderer` :
  - Titre via `rule.descriptions[schoolLevel]` avec fallback `lycee`
  - `expressionLatex` colorée : `\textcolor{blue}{before} \quad\Rightarrow\quad after`
  - Explanation gated by verbosity 'detailed'
- `ALL_RULES_BY_NAME` exporté depuis `pedagogical-rules/index.ts` pour que le renderer retrouve les rule metadata
- 11 tests dans `__tests__/pipeline.test.ts`

### Décisions design (Phase 8)

- **Pré-passe top-down pour le grouping** : nécessaire car `applyRulesDeepOnceTracked` traverse bottom-up. Sans cette pré-passe, `evaluate-binary-mul` (priority 100) collapse les multiplications AVANT que `groupMultiplicationsInAddition` (priority 200) ne voie la somme. La pré-passe utilise `mapNodeTopDown` + `applyRule` direct.
- **Le grouping rule est exclu de la liste passée au rewrite engine** pour éviter la double application.

## Phase 9 — Démo + tests snapshot (terminée ✓)

### Livré

- `demo-helpers.ts` : `presentExpression(testCase)` produit le rendu côte-à-côte 4 niveaux × 2 verbosities (8 vues), avec answerFragment quand pertinent.
- `demo-cases/` : 6 catégories × ≥3 cas chacune :
  - `basic.ts` (4 cas) — 2+3, 2+3×4, 2+3×4+5×6, 10−7+3
  - `fractions.ts` (5 cas) — 1/3+1/6, 1/4+1/6, 2/3×5/7, (2/3)÷(5/7), 2/4 réduction
  - `radicals.ts` (5 cas) — √8, √18, √45, √2×√3, √2×√8
  - `scientific.ts` (4 cas) — 5000000, 0.000037, (3×10⁴)×(2×10⁻²), (5×10³)×(4×10²)
  - `target-form-scenarios.ts` (3 cas) — même expression, target différent → étapes différentes
  - `answer-format-scenarios.ts` (3 cas) — fragment extraction
- `__tests__/pedagogical-arithmetic-demo.test.ts` : 24 snapshots (1 par cas)
- `scripts/pedagogical-arithmetic-demo.ts` : CLI standalone avec filtre par catégorie

## Phase 10 — Quality checks + doc finale (terminée ✓)

### Quality checks

- ✓ ESLint sur tous les fichiers du module : 0 error, 0 warning
- ✓ `pnpm check:incremental` : 0 nouvelle erreur (9 erreurs préexistantes dans slides/demo + extern/ exclues par le script)
- ✓ Suite mathAST complète : 12201/12222 passent (18 skipped, 3 todo, 0 fail)
- ✓ 0 régression vs baseline
- 0 fichier `.svelte` modifié → svelte-autofixer non applicable

### Documents produits

- `docs/wip/pedagogical-arithmetic-progress.md` (ce fichier)

### Récapitulatif final

- **6 commits intermédiaires** :
  1. `206e95f7b` — Phases 1+2 (infrastructure + target extractor + answer-format parser basique)
  2. `cbf546ac8` — Phase 3 (basic operations rules)
  3. `ff34f1d79` — Phase 4 (fraction rules)
  4. `cd1907374` — Phases 5+6 (radicaux + powers + scientific)
  5. à venir — Phases 7-10 (answer-format extraction, pipeline, demo, quality)
- **Tests ajoutés** : 239 tests dans `pedagogical-arithmetic/`
- **LOC** : ~3500 ajoutées (modules + tests + démo + doc)
- **Critères d'acceptation** : tous remplis (voir liste plus haut).
