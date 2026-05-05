# Pedagogical Quadratic Stepper V2 — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** Le V1 du stepper pédagogique pour équations du
> second degré a livré un pipeline complet pour `ax² + bx + c = 0` avec
> coefficients **numériques** (cf. `docs/wip/quadratic-stepper-progress.md`,
> 8 commits, 217 tests pedagogical-solve verts, branche
> `kind: 'quadratic-equation'` du Mode B). Coefficients **paramétriques**
> (`mx² + 2x + 1 = 0`) sont actuellement refusés via
> `PedagogicalQuadraticNotImplemented` → fallback Mode A.
>
> Le V2 (ce prompt) ajoute le support des coefficients paramétriques avec
> discussion sur le paramètre (cas `a(m) = 0`, signe de Δ(m), partition
> de ℝ en intervalles).

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Module V1 livré (à étendre)

- `src/lib/mathAST/pedagogical-solve/types.ts` — `EquationOperation` (31
  kinds dont 19 quadratique), `QuadraticSchoolLevel`,
  `QuadraticEquationStepsOptions`, `STRATEGIES_QUADRATIC`. Le V2 ajoute
  ~7 nouveaux kinds (count cible : 38).
- `src/lib/mathAST/pedagogical-solve/quadratic.ts` — pipeline V1 (~750
  LOC) : `generateQuadraticEquationSteps`, `detectCase`, builders
  per-cas (`buildStandardCaseSteps`, `buildBZeroCaseSteps`,
  `buildCZeroCaseSteps`, `buildFactoredCaseSteps`), helpers
  (`tryExtractGcd`, `smartNegate`, `extractLinearCoefficients`,
  `solveLinearFactor`), class `PedagogicalQuadraticNotImplemented`.
- `src/lib/mathAST/pedagogical-solve/quadratic-renderer.ts` — renderer
  V1 (~380 LOC) : TITLES + EXPLANATIONS lycée+supérieur,
  `formatExpressionLatex` per kind, `assertSupportedLevel` refuse
  primaire+college.
- `src/lib/mathAST/pedagogical-solve/_helpers.ts` — helpers partagés
  (canon, addToBothSides, makeStep, renumberSteps, etc.).
- `src/lib/mathAST/pedagogical-solve/index.ts` — dispatcher
  `generateEquationSteps` + barrel re-exports.

### 2. Pipeline linéaire (sous-pipeline réutilisé pour `a(m) = 0`)

- `src/lib/mathAST/pedagogical-solve/linear.ts` —
  `generateLinearEquationSteps(equation, options)` accepte un
  `LinearSchoolLevel` (= `'college' | 'lycee' | 'superieur'`). Le V2
  l'invoque comme sous-pipeline pour la branche dégénérée `a(m) = 0`.
- `src/lib/mathAST/pedagogical-solve/linear-renderer.ts` —
  `LinearEquationRenderer` (utilisé pour rendre les sous-steps
  linéaires de la branche dégénérée).

### 3. Logique algorithmique réutilisable

- `src/lib/mathAST/solve/solvers/quadratic.ts` —
  `extractQuadraticCoefficients(expr, variable)` exporté V1. Pour V2 :
  on l'invoque deux fois — une fois sur `expr` en `x` (extraire a(m),
  b(m), c(m) qui sont des expressions en m), une fois sur Δ(m) en `m`
  pour résoudre Δ(m) = 0 récursivement.
- `src/lib/mathAST/solve/numeric-value.ts` — `computeNumericValue` :
  retourne null pour les expressions paramétriques (au lieu d'un
  number). Le V2 doit gérer ce null gracefully.
- `src/lib/mathAST/solve/classify.ts` — `getPolynomialDegree(expr,
variable)` : utilisé pour vérifier le degré d'un coefficient en m
  (V2 exige ≤ 1).
- `src/lib/mathAST/eval/substitute.ts` — `getVariables(expr)` retourne
  l'ensemble des noms de variables (utilisé pour détecter le paramètre
  vs l'inconnue x).

### 4. Tests V1 (modèle à cloner)

- `src/lib/mathAST/pedagogical-solve/__tests__/quadratic.test.ts` —
  ~75 tests pipeline V1, fixtures `eqStandardPositive`, `eqCZero`,
  `eqFactored`, etc. + section V1.1 raffinements (factor-gcd,
  smartNegate, nodesEqual). Modèle pour les nouvelles fixtures
  paramétriques.
- `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-renderer.test.ts`
  — 29 tests renderer V1.
- `src/lib/mathAST/pedagogical-solve/__tests__/quadratic-demo.test.ts`
  — snapshots par catégorie.

### 5. Documentation V1 (contexte historique)

- `docs/wip/quadratic-stepper-progress.md` — bilan complet du V1 (8
  commits, 245 tests, 7 phases + V1.1 raffinements).
- `docs/wip/quadratic-stepper-prompt.md` — le prompt source V1.

---

## Phase 0 — Spécification TDD (bloquante : valider avec l'utilisateur AVANT d'écrire du code)

L'agent doit poser ces questions à l'utilisateur et **attendre des
réponses explicites** avant de passer à Phase 1.

### Comportements proposés

#### A. Couverture mathématique V2

1. **Coefficients paramétriques de degré ≤ 1 en m** :
   `a(m) = α₁m + α₀`, `b(m) = β₁m + β₀`, `c(m) = γ₁m + γ₀`. Donne
   Δ(m) de degré ≤ 2 en m → résoluble récursivement par V1.
2. **1 paramètre symbolique unique** (typiquement `m`). 2+ paramètres
   simultanés → throw `PedagogicalQuadraticNotImplemented`.
3. **Cas dégénéré `a(m) = 0`** (le coefficient devient nul pour une
   valeur particulière de m) → branche linéaire, sous-pipeline
   `generateLinearEquationSteps`.
4. **Discussion sur le signe de Δ(m)** :
   - Si Δ(m) constante (ne dépend pas de m) → fallback V1 path.
   - Si Δ(m) linéaire en m → 1 racine m₀ → 2 intervalles `]−∞, m₀[`,
     `]m₀, +∞[` ; signe sur chaque selon le coefficient directeur de Δ.
   - Si Δ(m) quadratique en m → 0, 1, ou 2 racines via V1 récursif.
   - Partition de ℝ \ {valeur dégénérante a(m) = 0} selon le signe de Δ.

#### B. Niveaux scolaires

`lycee + superieur` (cohérence V1). `primaire | college` refusés
(`assertSupportedLevel`). Type `QuadraticSchoolLevel` réutilisé.

#### C. Pipeline structurel

```
[1] parametric-identify
[2] discuss-leading-coefficient
    ├─ Cas a(m) = 0 (m = m₀)
    │   └─ subSteps : generateLinearEquationSteps(...)
    └─ Cas a(m) ≠ 0
[3] identify-coefficients-symbolic   (a(m), b(m), c(m))
[4] compute-discriminant-symbolic    (Δ(m))
[5] solve-discriminant-zero          (si Δ non-constante)
    └─ subSteps : generateQuadraticEquationSteps(Δ(m) = 0)
[6] discuss-discriminant-sign        (intervalles de m, signe de Δ)
    ├─ Cas Δ > 0 (m ∈ I₁) → 2 solutions distinctes x₁(m), x₂(m)
    ├─ Cas Δ = 0 (m ∈ {r}) → solution double x₀(m)
    └─ Cas Δ < 0 (m ∈ I₂) → S = ∅
[7] read-parametric-solutions        (ensemble final indexé par intervalle)
```

#### D. Détection automatique du paramètre

- Si l'équation contient 2 variables `{x, m}` et que l'utilisateur n'a
  pas explicitement fourni `variable` : détecter `x` comme inconnue
  (par convention) et `m` comme paramètre.
- `parameter` peut aussi être passé en option pour override.

#### E. Hors scope V2 (refus explicite)

- ≥ 2 paramètres simultanés (`(m + n)x² + 2x + (m − n) = 0`) → throw.
- Coefficients de degré ≥ 2 en m → throw.
- Bicarrées (V3 ou autre prompt).
- Inéquations (module séparé).

#### F. Notation FR

- "Si m ∈ ]r₁ ; r₂[ alors Δ > 0 et x₁(m) = …, x₂(m) = …".
- Δ(m) écrit avec parens explicites quand le contexte est ambigu.
- Tableau de signes optionnel (toggle stratégie).

#### G. Mode B intégré

- **Pas de nouveau `kind`** : la détection automatique route
  l'équation paramétrique via le pipeline V2 quand `'quadratic-equation'`
  est utilisé. Le `correction-generator` reste inchangé.
- Catch `PedagogicalQuadraticNotImplemented` reste en place pour les
  cas V2 hors scope (degré ≥ 2 en m, 2+ paramètres).
- 1 fixture end-to-end paramétrique : `(m − 1)x² + 2x + m = 0` (Tle spé).

### Questions à poser explicitement

> **Q1 — Détection auto du paramètre vs explicite ?**
> Reco par défaut : auto (si 2 variables `{x, m}`, `x` est l'inconnue
> par convention) avec override possible via `parameter: 'm'` dans
> `QuadraticEquationStepsOptions`.

> **Q2 — Limite de degré en m pour les coefficients ?**
> Reco par défaut : ≤ 1 (linéaire). Degré ≥ 2 → throw NotImplemented.
> Cohérent avec la résolubilité de Δ(m) = 0 par V1 récursif.

> **Q3 — Sous-cases via `subSteps` ou nouveau type structurel ?**
> Reco par défaut : `subSteps` (déjà supporté par `EquationStep`).
> Pas de nouveau type ; on utilise les kinds existants au top-level
> avec `subSteps` pour les sous-pipelines.

> **Q4 — Notation des cas : "Si m … alors …" vs "Cas 1: …" ?**
> Reco par défaut : "Si m ∈ … alors …" (FR convention manuel).

> **Q5 — Cas `a(m) = 0` : sous-pipeline linéaire ou throw ?**
> Reco par défaut : sous-pipeline `generateLinearEquationSteps` pour
> le cas dégénéré (cohérence pédagogique). Si `a(m)` ne s'annule pas
> (pas de solution réelle à `a(m) = 0`), on saute cette étape.

> **Q6 — Δ ≡ constante (indépendante de m) → fallback V1 ?**
> Reco par défaut : OUI. Émet une étape "Δ ne dépend pas de m"
> puis route vers le path V1 (ramener au cas non-paramétrique).

> **Q7 — Cas Δ symbolique non-réductible (e.g., contient `m³` après
> simplification) → comportement ?**
> Reco par défaut : throw `PedagogicalQuadraticNotImplemented`. V3 si
> demandé plus tard.

> **Q8 — Volume tests cible ?**
> Reco par défaut : ~80 tests (50 pipeline + 20 renderer + 10 démos
> snapshot + ~5 intégration Mode B).

> **Q9 — Mode B : nouveau `kind: 'parametric-quadratic-equation'` OU
> réutilisation de `'quadratic-equation'` ?**
> Reco par défaut : **réutilisation**. Le pipeline détecte
> automatiquement la nature paramétrique. Pas de nouveau kind ; le
> `correction-generator` Mode B reste inchangé.

### Critères d'acceptation V2

- 0 régression sur les 245 tests V1 (pedagogical-solve + Mode B).
- Pipeline opérationnel sur les 4 sous-cas du paramétrique
  (a-degenerate, Δ > 0 sur I, Δ = 0 sur {r}, Δ < 0 sur I).
- Forme `Δ ≡ constante` détectée et routée vers V1.
- Renderer 2 niveaux (lycee, superieur) avec TITLES + EXPLANATIONS
  pour chaque nouveau kind.
- ≥ 1 catégorie de démos paramétriques avec snapshots stables.
- Mode B : 1 fixture end-to-end paramétrique (Tle spé), pas de
  nouveau kind dans `correction-generator`.
- 0 erreur ESLint, 0 nouvelle erreur TS (`pnpm check:incremental`).
- Doc de progression écrite (`docs/wip/quadratic-stepper-v2-progress.md`).
- Code review `code-reviewer` (Opus) après chaque phase.
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global).

---

## Phase 1 — Étendre les types (`pedagogical-solve/types.ts`)

### Sous-tâches

1. Ajouter ~7 nouveaux kinds à `EquationOperation` (count cible :
   31 → 38) :

   - `parametric-identify` : `{ kind: 'parametric-identify'; parameter: string }`.
   - `discuss-leading-coefficient` :
     `{ kind: 'discuss-leading-coefficient'; a: MathNode; vanishingAt: readonly MathNode[] }`.
   - `identify-coefficients-symbolic` (alternative : étendre
     `identify-coefficients` existant — décider en Phase 1 selon la
     simplicité TS).
   - `compute-discriminant-symbolic` :
     `{ kind: 'compute-discriminant-symbolic'; a, b, c, discriminant: MathNode }`
     (sans `numericValue` car symbolique).
   - `solve-discriminant-zero` :
     `{ kind: 'solve-discriminant-zero'; discriminant: MathNode; parameterRoots: readonly MathNode[] }`.
   - `discuss-discriminant-sign` :
     `{ kind: 'discuss-discriminant-sign'; intervals: readonly { range: ParameterRange; sign: '+' | '0' | '-' }[] }`.
   - `parametric-case` :
     `{ kind: 'parametric-case'; condition: MathNode; subKind: 'linear-branch' | 'distinct' | 'double' | 'no-solution'; solutions?: readonly MathNode[] }`.
   - `read-parametric-solutions` :
     `{ kind: 'read-parametric-solutions'; variable: string; bySign: readonly { range: ParameterRange; solutions: readonly MathNode[] }[] }`.

2. Définir le type helper `ParameterRange` :

   ```ts
   export type ParameterRange =
   	| { kind: 'point'; value: MathNode } // m = r
   	| { kind: 'open-interval'; from: MathNode | '-infinity'; to: MathNode | '+infinity' }
   	| { kind: 'half-open-left'; from: MathNode | '-infinity'; to: MathNode }
   	| { kind: 'half-open-right'; from: MathNode; to: MathNode | '+infinity' }
   	| { kind: 'union'; ranges: readonly ParameterRange[] };
   ```

3. Étendre `QuadraticEquationStepsOptions` avec un champ optionnel
   `parameter?: string` pour override la détection automatique.

4. Étendre `STRATEGIES_QUADRATIC` si nécessaire (probablement pas).

5. Tests d'isolation des types — adapter `quadratic-types.test.ts`
   (count : 31 → 38).

### Code review attendu

`code-reviewer` (Opus).

### Validation

- Compile clean (`pnpm check:incremental`).
- Tests d'isolation passent (count enforcé).
- Revue : cohérence avec V1, naming, `Readonly` partout.

---

## Phase 2 — Helpers symboliques (`pedagogical-solve/_parametric.ts`)

### Sous-tâches

1. **`extractParametricCoefficients(expr, variable, parameter)`** :
   généralise `extractQuadraticCoefficients` pour accepter une
   variable d'extraction (`x`) et un paramètre symbolique (`m`)
   présent dans les coefficients.

2. **`extractLinearInParameter(coeff, parameter): { alpha, beta } | null`** :
   wrapper sur `extractQuadraticCoefficients(coeff, parameter)` qui
   renomme `coeffs.b → alpha`, `coeffs.c → beta` et vérifie que
   `coeffs.a` est nul (degré 1 en m).

3. **`detectParameter(equation, x): string | null`** : si l'équation
   contient exactement 2 variables dont l'une est `x`, retourner
   l'autre comme paramètre. Sinon null.

4. **`isConstantInParameter(coeff, parameter): boolean`** : true si
   le coefficient ne dépend pas de m (`getVariables(coeff).has(m) === false`).

5. **`vanishingPoints(coeff, parameter): readonly MathNode[]`** :
   résout `coeff(m) = 0` en m. Réutilise V1 récursivement pour
   degré 1 ou 2.

6. **`signOnIntervals(poly, parameter, roots): readonly { range, sign }[]`** :
   détermine le signe d'un polynôme sur les intervalles entre racines.
   Convention :

   - Évaluation numérique en un point intérieur de chaque intervalle
     (e.g., milieu rationnel), via `computeNumericValue` après
     substitution.
   - Si évaluation impossible : fallback sur signe du coefficient
     directeur + parité (théorème des valeurs intermédiaires).

7. **`buildParameterRange(...)` factory** : helpers pour construire
   les `ParameterRange` (point, open-interval, half-open, union).

8. Tests unitaires des helpers (~20 tests).

### Code review attendu

`code-reviewer` (Opus).

### Validation

- Tests passent.
- 0 régression V1.
- Revue : édge cases (Δ ≡ 0, Δ ≡ constant, Δ avec racine double).

---

## Phase 3 — Détection enrichie (`detectCase`)

### Sous-tâches

1. Avant le check `isConstantCoefficient` strict actuel (qui throw),
   ajouter une branche :

   ```ts
   if (!isConstantCoefficient(coeffs.a) || !isConstantCoefficient(coeffs.b) || !isConstantCoefficient(coeffs.c)) {
       const parameter = detectParameter(equation, variable);
       if (parameter !== null) {
           // Vérifier degré ≤ 1 en parameter pour chaque coeff
           if (allCoefficientsLinearInParameter(coeffs, parameter)) {
               return { kind: 'parametric', a: coeffs.a, b: coeffs.b, c: coeffs.c, parameter, ... };
           }
           throw new PedagogicalQuadraticNotImplemented(
               'parameter degree > 1 in coefficients (V2 supports linear-in-parameter only)'
           );
       }
       throw new PedagogicalQuadraticNotImplemented('parametric coefficients (V1 supports only numeric coefficients)');
   }
   ```

2. Ajouter `DetectedParametric` au type `DetectedCase` union :

   ```ts
   interface DetectedParametric {
   	readonly kind: 'parametric';
   	readonly a: MathNode;
   	readonly b: MathNode;
   	readonly c: MathNode;
   	readonly parameter: string;
   	readonly needsStandardize: boolean;
   	readonly standardForm: MathNode;
   }
   ```

3. Le dispatch dans `generateQuadraticEquationSteps` ajoute une
   case `'parametric'` qui appelle `buildParametricCaseSteps`.

### Validation

- 245 tests V1 toujours verts.
- Tests détection paramétrique.

---

## Phase 4 — Pipeline parametric (`buildParametricCaseSteps`)

### Sous-tâches

1. **Builder principal** dans `quadratic.ts` (ou nouveau fichier
   `_parametric-pipeline.ts` si la taille le justifie) :

```ts
function buildParametricCaseSteps(
    equation: RelationNode,
    detected: DetectedParametric,
    strategy: QuadraticGenerationStrategy,
    variable: string,
    idGen: () => number,
    options: QuadraticEquationStepsOptions
): readonly EquationStep[] {
    const steps: EquationStep[] = [];
    let current = equation;

    // 1. parametric-identify
    steps.push(buildParametricIdentifyStep(current, detected.parameter, idGen));

    // 2. (optionnel) standardize
    if (detected.needsStandardize) { ... }

    // 3. discuss-leading-coefficient (si a(m) peut être nul)
    const aVanishingAt = vanishingPoints(detected.a, detected.parameter);
    if (aVanishingAt.length > 0) {
        steps.push(buildDiscussLeadingCoefficientStep({
            a: detected.a,
            vanishingAt,
            // sub-steps : un parametric-case par valeur dégénérante,
            // chacun appelant generateLinearEquationSteps après substitution
            subSteps: aVanishingAt.map((m0) => buildLinearBranchSubSteps(equation, m0, ...))
        }));
    }

    // 4. identify-coefficients (avec a, b, c symboliques)
    steps.push(buildIdentifyCoefficientsStep(...));

    // 5. compute-discriminant-symbolic
    const discriminant = symbolicDiscriminant(detected.a, detected.b, detected.c);
    steps.push(buildComputeDiscriminantSymbolicStep(...));

    // 6. Si Δ constant → route vers V1 path (factor-V1-numeric)
    if (isConstantInParameter(discriminant, detected.parameter)) {
        // Fallback V1 : reconstruire un DetectedStandard et appeler buildStandardCaseSteps
        return [...steps, ...buildStandardCaseSteps(...)];
    }

    // 7. solve-discriminant-zero
    const dRoots = vanishingPoints(discriminant, detected.parameter);
    steps.push(buildSolveDiscriminantZeroStep({
        discriminant,
        parameterRoots: dRoots,
        subSteps: <appel récursif à generateQuadraticEquationSteps(Δ(m) = 0)>
    }));

    // 8. discuss-discriminant-sign
    const signMap = signOnIntervals(discriminant, detected.parameter, dRoots);
    steps.push(buildDiscussDiscriminantSignStep({
        intervals: signMap,
        subSteps: signMap.map((entry) => buildParametricCaseStep(entry, detected, ...))
    }));

    // 9. read-parametric-solutions
    steps.push(buildReadParametricSolutionsStep({...}));

    return steps;
}
```

2. **Helpers atomiques** :

   - `symbolicDiscriminant(a, b, c)` : `canon(b² − 4ac)` mais en
     préservant la dépendance en m. Réutilise `power`, `subtract`,
     `implicitMultiply`.
   - `buildLinearBranchSubSteps(equation, m₀, parameter, level)` :
     substitue `m → m₀` dans l'équation → `2x + 1 = 0` (ou similaire),
     appelle `generateLinearEquationSteps` avec le bon level.
   - `parametricSolutions(a, b, discriminant, sign)` : pour Δ > 0
     retourne `[(-b - √Δ)/(2a), (-b + √Δ)/(2a)]` symbolique.
   - `recursiveSolveDeltaZero(discriminant, parameter, level)` :
     appelle `generateQuadraticEquationSteps(Δ(m) = 0, { level,
variable: parameter })` pour produire le sous-arbre. Garde-fou :
     vérifier que la profondeur de récursion ≤ 1 (un seul niveau de
     récursion autorisé).

3. **Tests pipeline** dans `__tests__/quadratic-parametric.test.ts` :
   ~50 tests couvrant :
   - `mx² + 2x + 1 = 0` : a peut être 0 (m=0 → linéaire), Δ = 4 − 4m
     → racine m=1 → 3 cas pour la suite.
   - `(m − 1)x² + 2x + m = 0` : a=0 si m=1 (linéaire `2x + 1 = 0`),
     sinon Δ = 4 − 4m(m − 1).
   - `mx² − 4x + m = 0` : Δ = 16 − 4m² → racines ±2.
   - `2x² + (m + 1)x + m = 0` : a constant, b et c paramétriques.
   - Cas Δ constant : `2x² + 0·x − 8 + m·0 = 0` → Δ ne dépend pas de
     m → fallback V1.
   - Cas dégénérés : `0·x² + … = 0` (a ≡ 0, à throw ou linéaire).
   - Throws : degré ≥ 2 en m, 2 paramètres simultanés.

### Code review attendu

`code-reviewer` (Opus) sur le pipeline complet.

### Validation

- Tests passent.
- 0 régression V1.
- Revue : récursion bornée, sous-pipelines correctement isolés.

---

## Phase 5 — Renderer (`quadratic-renderer.ts`)

### Sous-tâches

1. Ajouter aux TITLES (lycee + supérieur) les ~7 nouveaux kinds.

2. Ajouter aux EXPLANATIONS (lycee detailed) les nouveaux kinds.

3. Étendre `formatExpressionLatex` :

   - `parametric-identify` : "Équation paramétrique en `x` (paramètre
     `m`) : `a(m)·x² + b(m)·x + c(m) = 0`".
   - `discuss-leading-coefficient` : aligned `Si m = m₀ : … | Si m ≠ m₀
: …`. La sous-arborescence des `subSteps` est rendue récursivement.
   - `compute-discriminant-symbolic` : `Δ = b² − 4ac = (expression en
m)`. Identique à V1 sans la valeur numérique finale.
   - `solve-discriminant-zero` : "On résout `Δ(m) = 0`". Les
     sous-steps (V1 récursif) rendent eux-mêmes la résolution.
   - `discuss-discriminant-sign` : tableau de signes ou liste
     d'intervalles. **Décision Phase 5** : tableau LaTeX (`\\begin{array}`)
     vs liste d'items.
   - `parametric-case` : `\\text{Si } m \\in [range] \\text{ alors }
S = \\{x_1(m), x_2(m)\\}`.
   - `read-parametric-solutions` : récap final avec table des cas.

4. Helper `formatRange(range: ParameterRange): string` :

   - `point` → `m = r`
   - `open-interval` → `]r₁ ; r₂[`
   - `half-open-left` → `]−∞ ; r[`
   - `half-open-right` → `]r ; +∞[`
   - `union` → `R₁ ∪ R₂`

5. Tests renderer (~20 tests).

### Code review attendu

`code-reviewer` (Opus).

### Validation

- Tests renderer passent.
- Visuel vérifié via demo CLI (Phase 6).

---

## Phase 6 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-solve/demo-equations-quadratic/parametric.ts`
   (~8 cas) :

   - `mx² + 2x + 1 = 0`.
   - `(m − 1)x² + 2x + m = 0`.
   - `mx² − 4x + m = 0`.
   - `2x² + (m + 1)x + m = 0` (a constant, b et c paramétriques).
   - `(m + 2)x² + (m − 1)x + 1 = 0` (a, b paramétriques).
   - `mx² + 2mx + 1 = 0` (b proportionnel à a).
   - `(m² + 1)x² + … = 0` → throw NotImplemented (degré 2 en m).
   - Cas Δ constant.

2. Étendre `demo-equations-quadratic/index.ts` :

   ```ts
   import { PARAMETRIC } from './parametric';
   export const ALL_CATEGORIES_QUADRATIC: readonly DemoCategory[] = [
       ...,
       { name: 'parametric', cases: PARAMETRIC }
   ];
   ```

3. Vérifier que `presentEquationQuadratic` gère le throw de
   `PedagogicalQuadraticNotImplemented` (déjà fait V1 via le sentinel
   `[skip — NotImplemented: …]`).

4. Mettre à jour `__tests__/quadratic-demo.test.ts` (auto via
   `ALL_CATEGORIES_QUADRATIC`).

5. Tester le CLI :
   ```bash
   pnpm tsx scripts/pedagogical-quadratic-demo.ts parametric
   ```

### Code review attendu

`code-reviewer` (Opus).

### Validation

- ≥ 8 snapshots stables.
- CLI fonctionne avec et sans args.
- 0 régression.

---

## Phase 7 — Mode B + doc finale

### Sous-tâches

1. **Pas de modification du `correction-generator.ts`** : le pipeline
   V2 est invoqué automatiquement par `generateQuadraticEquationSteps`
   quand des coefficients paramétriques sont détectés. Le case
   `'quadratic-equation'` dans le switch reste tel quel.

2. **1 fixture end-to-end paramétrique** :

   ```ts
   export const parametricQuadraticEquationDemo: QuestionTemplate = {
   	id: 'demo-parametric-quadratic-tle',
   	title: 'Équation paramétrique du second degré (Tle spé)',
   	variations: [
   		{
   			statement: templateMarkdown('Discuter selon $m$ : $(m - 1)x^2 + 2x + m = 0$'),
   			variables: [],
   			blanks: [{ expectedAnswer: 'discussion par cas' }],
   			correction: {
   				feedback: { correct: '...' },
   				generatedSteps: {
   					kind: 'quadratic-equation',
   					equation: '(m-1)*x^2 + 2*x + m = 0',
   					options: { schoolLevel: 'auto' }
   				}
   			}
   		}
   	],
   	grades: ['T_SPE'],
   	theme: 'Algèbre',
   	domain: 'Équations',
   	subdomain: 'Second degré paramétrique',
   	level: 3
   };
   ```

3. Étendre `__tests__/generated-steps-demo.test.ts` (+1 snapshot).

4. Étendre la page debug `correction-mode-b/+page.svelte` (6e carte).

5. Svelte autofixer obligatoire sur la page modifiée.

6. **Doc de progression** : créer
   `docs/wip/quadratic-stepper-v2-progress.md` modèle V1 :

   - Tableau État global Phases 0-7.
   - Décisions architecturales validées (Phase 0).
   - Fichiers livrés.
   - Tests cumulés.
   - Code review notes.
   - Limitations connues V2.
   - Pistes V3 (cubic param, bicarrées param, 2 paramètres, etc.).

7. Mettre à jour les docs principales :

   - `docs/wip/quadratic-stepper-progress.md` : section "V2 livré".
   - `docs/wip/pedagogical-steppers-mvp-progress.md` : section
     "Livrés depuis", étendue avec V2.
   - `docs/wip/correction-integration-progress.md` : section
     "Extension post-MVP", étendue avec V2.

8. **Quality checks finaux** :

   - ESLint : `npx eslint <fichiers>`.
   - TypeScript + Svelte : `pnpm check:incremental` (0 nouvelle).
   - Svelte autofixer sur `+page.svelte`.
   - Tests régression : `pnpm test:server src/lib/mathAST/`,
     `pnpm test:server src/lib/questions/`.

9. **Commit final** : direct ou `commit-manager` selon volume.
   **IMPORTANT** : pas de `Co-Authored-By: Claude` (CLAUDE.md global).

### Validation

- ESLint clean.
- check:incremental clean (9 préexistantes inchangées).
- Svelte autofixer clean.
- 0 régression sur ~12 000 tests.
- Doc de progression écrite.
- Commit final créé.

---

## Anti-patterns à éviter

1. **Ne PAS** réimplémenter la logique de résolution de Δ(m) = 0 —
   réutiliser `generateQuadraticEquationSteps` récursivement avec
   garde-fou de profondeur.

2. **Ne PAS** déléguer la détection paramétrique à un
   `solve/parametric.ts` ad-hoc — étendre les helpers V1 existants
   (`extractQuadraticCoefficients` est déjà polyvalent).

3. **Ne PAS** émettre de step vide ni de step sans avant/après
   significatif. Les sous-cases doivent toujours produire un sous-arbre
   non vide.

4. **Ne PAS** silently skip un cas ambigu. Toujours throw avec un
   message explicite et catch en `correction-generator`.

5. **Ne PAS** dupliquer la logique du V1 dans le pipeline V2 — le
   pipeline V2 doit DÉLÉGUER au V1 dès qu'il a réduit le problème
   (linéaire après substitution m=m₀, ou Δ constant → V1 numeric).

6. **Ne PAS** oublier le mapping `level` quand on appelle des
   sous-pipelines (linéaire ou V1 récursif).

7. **Ne PAS** écrire `Co-Authored-By: Claude` dans les commits.

8. **Ne PAS** exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint` sur tout le projet. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

9. **Ne PAS** prendre de décision architecturale unilatérale. Si en
   cours de route un trade-off non couvert par Phase 0 émerge,
   **demander à l'utilisateur**.

10. **Ne PAS** déduire de la Phase 0 sans valider explicitement les
    réponses Q1-Q9 avec l'utilisateur.

11. **Ne PAS** introduire un nouveau `kind` dans `GeneratedSteps` du
    Mode B — réutiliser `'quadratic-equation'` (Q9).

---

## Récap effort estimé

| Phase     | Effort estimé                                       |
| --------- | --------------------------------------------------- |
| 0         | 15-30 min validation Q1-Q9 avec utilisateur         |
| 1         | 1 h types + tests isolation (count 31 → 38)         |
| 2         | 3 h helpers symboliques + tests unitaires           |
| 3         | 1 h détection enrichie                              |
| 4         | 4 h pipeline parametric + ~50 tests                 |
| 5         | 2-3 h renderer + ~20 tests                          |
| 6         | 2 h démos + script CLI + ~10 snapshots              |
| 7         | 1-1.5 h Mode B fixture + page debug + docs + commit |
| **Total** | **~14-16 h en tunnel continu**                      |

Cible : **~80 tests verts spécifiques au feature** (s'ajoutant aux
245 V1), **~2500 LOC** ajoutées (en majorité dans `_parametric.ts` et
le renderer), **5-7 commits intermédiaires**, **0 régression**.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/quadratic-stepper-v2-progress.md` — doc de progression
   complète V2.
2. Mise à jour de `docs/wip/quadratic-stepper-progress.md` (section
   "V2 livré").
3. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
4. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 4 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
