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

- **5 commits intermédiaires** :
  1. `206e95f7b` — Phases 1+2 (infrastructure + target extractor + answer-format parser basique)
  2. `cbf546ac8` — Phase 3 (basic operations rules)
  3. `ff34f1d79` — Phase 4 (fraction rules)
  4. `cd1907374` — Phases 5+6 (radicaux + powers + scientific)
  5. `095556850` — Phases 7-10 (answer-format extraction, pipeline, demo, quality)
- **Tests ajoutés** : 239 tests dans `pedagogical-arithmetic/`
- **LOC** : ~3500 ajoutées (modules + tests + démo + doc)
- **Critères d'acceptation** : tous remplis (voir liste plus haut).

### Documents produits durant ce prompt

- `docs/wip/pedagogical-arithmetic-progress.md` (ce fichier — doc de progression complète)

### TODO post-prompt (refactos séparées)

1. **Populer `expressionName` directement dans `InstanceBlank`** via `generator/assign-blank-indices.ts` pour rendre le 3e arg `expressionName` redondant dans `extractPedagogicalTarget` (~2-3h).
2. **Intégration aux corrections de questions** (`QuestionCorrection.generatedSteps`) — actuellement le pipeline est PRÊT (extractPedagogicalTarget fonctionne) mais la connexion aux composants Svelte de correction reste à faire (autre prompt).
3. **Variantes de fractions par sous-niveau** : early-college (multiplication directe des dénominateurs, e.g. `1/3+1/6 → 6+3/18 = 9/18 = 1/2`) vs late-college (PGCD).
4. **`rationalize-denominator`** et **`simplify-square-root-of-square`** (radicaux niveau 3 avancé).
5. **Decimal mantissas** dans `multiplyScientific` / `addScientificSamePower` (mantissas non-entières en notation scientifique).
6. **Cohérence `signs`** : étape post-processing `5 + (-3) → 5 - 3` quand `signs: 'strict'` (pas couvert dans cette livraison).

---

## Phase 11 — Itérations UX post-livraison (en cours)

Travaux post-MVP pour rendre le rendu des étapes plus lisible, plus
pédagogique, et plus fidèle aux conventions scolaires françaises. Toutes
les modifications sont architecturalement compatibles avec la livraison
initiale et ne touchent pas aux contrats des phases 1-2.

### 11.1 — Bindings + format 2 lignes (commit `9ec77d607`)

**Problème** : titres `"On additionne ? et ?"` (bindings perdus) +
`expressionLatex` mono-ligne `before \Rightarrow after`.

**Fix** :

- Pipeline réécrit en boucle manuelle (au lieu de `rewrite()`) pour
  capturer bindings via `match()` + globalBefore/globalAfter à chaque step.
- Ajout `globalBefore?` / `globalAfter?` sur `PedagogicalArithmeticStep`.
- Renderer émet 2 lignes `\begin{aligned}` style solver pédagogique :
  ```
  \textcolor{blue}{globalBefore avec sub-tree colorisé}
  = globalAfter
  ```
- Coloration du fragment via `nodesEqual` (structurel) car `mapNode`
  reconstruit les sous-arbres → identité référentielle ne tient pas.

**Bug bonus fixé** : `evaluateBinaryDiv` restreinte aux résultats entiers.
`3/6 → 1/2` est désormais étiqueté "On simplifie la fraction"
(`reduceFraction`) et non "Division".

### 11.2 — Sortie CLI lisible via custom syntax (commit `110a55e18`)

**Problème** : LaTeX dans le terminal est illisible (`\dfrac{1}{3}`).

**Fix** :

- `formatTransformationCustom(step)` ajouté à `renderer.ts` (utilise
  `toCustom()` + string-replace pour `@blue{...}`).
- `demo-helpers` : `DemoFormat = 'custom' | 'latex' | 'both'`.
  `presentExpression(testCase, format = 'custom')`.
- Script CLI : flags `--latex` / `--both` / `--custom` (default), conversion
  ANSI auto en TTY.
- `cleanupTrivialParens` : supprime silencieusement `(5)` et `(-3)` après
  chaque rule application.

**Bug fixé** : `toScientificNotation` excluse de la rewrite loop (re-firait
sur `10` dans `5 × 10⁶` → boucle infinie). Top-level pre-pass uniquement.

### 11.3 — Highlight multi-fragment (commit `7052e8506`)

**Problème** : `groupMultiplicationsInAddition` transforme plusieurs
sous-arbres en une étape, mais le renderer ne pouvait colorer qu'un seul
fragment.

**Fix** :

- `step.highlightSubTrees?: readonly MathNode[]` (optionnel) ; fallback
  sur `[step.before]` quand absent.
- Renderer (LaTeX et custom) itère sur les fragments et colorise chacun.
- `findOutsideWrapper` évite de re-colorer un span déjà dans `@blue{...}`.
- Pipeline collecte tous les `n*m` du grouping et les passe au step.

Avant : `2+3*4+5*6` (rien de coloré). Après : `2+@blue{3*4}+@blue{5*6}`.

### 11.4 — Display-only filter primaire+college (commit `41ca86628`)

`DISPLAYED_LEVELS = ['primaire', 'college']` + `DISPLAYED_VERBOSITIES = ['detailed']`
dans `demo-helpers.ts`. Les `schoolLevels` des cas restent intacts (scope
pédagogique réel) ; intersection appliquée seulement à l'affichage.

### 11.5 — Cas avec parenthèses + `groupParentheses` (commits `f4c628599`, `fcf11d872`)

**Cas demo ajoutés** : `(2+3)×4`, `2×(3+4)`, `10−(3+2)`, `(2+3)×(4−1)`.

**Nouvelle règle** `groupParentheses` (priority 250, college+) :

- Pattern wildcard + condition `hasCalculableParens`.
- Replacement : remplace chaque parens calculable par sa valeur.
- Highlight : chaque parens originale.
- Pré-passe top-level dans le pipeline (comme `groupMultiplicationsInAddition`).
- Description : "On effectue les calculs entre parenthèses".

**Au primaire** : pas de `groupParentheses` → calcul atomique de chaque
parens un step à la fois (cf §11.10).

### 11.6 — Divisions inline + post-traitement opérateurs (commits `aac72f66b`, `c7e28e3d6`)

**Cas demo divisions** : `12÷3`, `6+12÷3`, `20÷4−3`, `(15+5)÷4`, `24÷6+2×3`.

**Post-traitement CLI** : `:/` → `÷`, `*` → `×` (cosmetic-only). Snapshots
préservent la syntaxe custom native pour stabilité.

**Format compact** : pas d'espaces autour des opérateurs (cohérent avec
`toCustom` natif). `2+@blue{3×4}+@blue{5×6}` au lieu de `2 + @blue{3 × 4} + @blue{5 × 6}`.

### 11.7 — Ordre gauche-à-droite + grouping × et ÷ (commit `1ebb489e6`)

**Problème** : pour `24÷6+2×3` au primaire, `evaluateBinaryMul` firait
avant `evaluateBinaryDiv` (rule-first iteration), violant l'ordre
gauche-à-droite.

**Fix** :

- `findFirstApplication` itère **node-first** puis rule-by-rule à chaque
  nœud. Le sub-tree le plus à gauche gagne quand priorités égales.
- `groupMultiplicationsInAddition` étendu aux divisions (`isNumericHighPriorityOp`).
- Description : "On effectue d'abord les multiplications et divisions".

Primaire : `24÷6` puis `2×3` (gauche-à-droite) ; Collège : `@blue{24÷6}+@blue{2×3} = 4+6` en 1 step.

### 11.8 — Grouping étendu aux chaînes mul/div (commit `55b5477a5`)

**Problème** : pour `24÷(6+2)×3+(15+5)÷4`, après `(6+2)→8` et `(15+5)→20`,
on a `24÷8×3+20÷4` → `mul(div(24,8), 3)` n'est pas une op binaire simple,
le grouping ne firait pas.

**Fix** :

- `isNumericMulDivChain` : reconnaît récursivement les chaînes (un mul/div
  dont les opérandes sont eux-mêmes atoms ou chaînes).
- `applyGroupMultiplications` évalue la chaîne entière via `evaluateExact`.
- Highlight = la chaîne entière comme un bloc.

Collège : `@blue{24÷8×3}+@blue{20÷4} = 9+5` (1 step au lieu de 3).

### 11.9 — Cas demo complet (commit `55b5477a5`)

Ajouté : `24÷(6+2)×3+(15+5)÷4 = 14`. Le rendu démontre bien la
différence pédagogique entre primaire (atomique, 6 steps) et collège
(condensé, 3 steps).

### 11.10 — Primaire calcule toutes les parens d'abord (commit `7a8233cca`)

**Problème** : au primaire, après `(6+2)→8` le pipeline ferait
`24÷8` ensuite (gauche-à-droite à plat) au lieu d'attaquer d'abord la
seconde parens `(15+5)`.

**Fix** :

- Nouveau helper `findFirstApplicationInAnyParens` cherche les
  applications uniquement à l'intérieur d'une `(...)`.
- Rewrite loop : `findFirstApplicationInAnyParens(...) ??
findFirstApplication(...)`. Une app dans une parens gagne TOUJOURS sur
  une app au niveau externe.

Avant pour `24÷(6+2)×3+(15+5)÷4` au primaire :
`(6+2), 24÷8, 3×3, (15+5), 20÷4, 9+5` (entrelacé).
Après : `(6+2), (15+5), 24÷8, 3×3, 20÷4, 9+5` (toutes parens d'abord).

### Récap commits Phase 11

| Commit      | Sujet                                                                 |
| ----------- | --------------------------------------------------------------------- |
| `9ec77d607` | Bindings + format 2 lignes du renderer                                |
| `110a55e18` | Pretty CLI output via custom syntax                                   |
| `41ca86628` | Filtrage display-only primaire+college                                |
| `7052e8506` | highlightSubTrees pour multi-fragment coloring                        |
| `f4c628599` | Cas avec parenthèses + cleanup auto                                   |
| `fcf11d872` | groupParentheses (calculs entre () en 1 step au collège)              |
| `aac72f66b` | Cas avec divisions inline (÷)                                         |
| `c7e28e3d6` | Format compact (sans espaces autour des opérateurs)                   |
| `1ebb489e6` | Ordre gauche-à-droite + grouping × et ÷                               |
| `55b5477a5` | Grouping étendu aux chaînes mul/div + cas complet 24÷(6+2)×3+(15+5)÷4 |
| `7a8233cca` | Primaire calcule toutes les parens d'abord                            |

### Stats actuelles

- **252 tests** passent dans `pedagogical-arithmetic/` (+13 vs livraison initiale)
- **0 régression** sur le reste de mathAST
- **17 commits cumulés** sur le module (5 livraison + 12 itérations)
- **Categories demo** : 6 catégories, 13 cas dans `basic` (couvre +/-, ×, ÷, parens, chaînes).

### TODO restant (post-Phase 11)

- Tester d'autres cas pédagogiques utilisateur-driven
- Compléter snapshots avec le format `--both` (custom + latex côte à côte)
- Décider du destin des espaces : actuellement compact — peut-être ajuster
  par niveau (primaire = plus aéré ?)

---

## Statut global et docs liés

### Travail livré dans ce prompt

- Pipeline pédagogique arithmétique complet (Phases 1-10)
- Itérations UX post-livraison (Phase 11)
- `extractPedagogicalTarget()` effectif
- Support `answerFormat` avec extraction de fragment
- 252 tests, 17 commits cumulés, 0 régression

### Docs frères dans `docs/wip/`

- `pedagogical-steppers-mvp-progress.md` — infrastructure générique sur laquelle ce module s'appuie (rewriting-engine, step-renderer-base, technical-renderer, etc.)
- `pedagogical-steppers-mvp-prompt.md` — prompt source du MVP infrastructure
- `pedagogical-arithmetic-prompt.md` — prompt source de ce travail
- `units-imperial-affine-progress.md`, `units-derived-progress.md`, `units-area-progress.md` — travaux unités livrés en parallèle (orthogonaux)

### TODOs post-prompt à reprendre dans des sessions ultérieures

| Item                                                                                              | Effort | Notes                                                  |
| ------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| Populer `expressionName` dans `InstanceBlank` via `assign-blank-indices.ts`                       | ~2-3h  | Rend le 3e arg de `extractPedagogicalTarget` redondant |
| Intégration aux corrections de questions (`QuestionCorrection.generatedSteps` + composant Svelte) | ~6-8h  | Pipeline prêt côté backend, manque la glue UX          |
| Variantes fractions par sous-niveau (early-college multiplication vs late-college PGCD)           | ~2-3h  | Affinage pédagogique                                   |
| `rationalize-denominator` + `simplify-square-root-of-square` (radicaux avancés)                   | ~3-4h  | Niveau 3 lycée+                                        |
| Decimal mantissas dans `multiplyScientific` / `addScientificSamePower`                            | ~2-3h  | Support mantisses non-entières                         |
| Cohérence `signs: 'strict'` en post-processing (`5 + (-3) → 5 - 3`)                               | ~2h    | Étape pédagogique finale conditionnelle                |
| Format `--both` dans snapshots démo (custom + LaTeX côte à côte)                                  | ~1h    | Lisibilité du dev                                      |
| Réglage espacement par niveau (primaire plus aéré ?)                                              | ~1-2h  | À évaluer après retour utilisateur                     |

### Hors scope ce prompt et liés à ce travail

- Stepper différentiation (nouveau step recorder + renderer pédagogique)
- Renderers pédagogiques pour autres domaines (integration, limits, matrix, domain)
- Pipeline pédagogique pour simplification d'expression
- Modes `SymbolicComputation` (Mode 0, Mode 2) inspirés de Poincaré
- `NormalizeTarget` à 3 niveaux (refactor `normalize.ts`)
- Investigation root-cause load-order issue (note dans `common/index.ts:56-77`)
