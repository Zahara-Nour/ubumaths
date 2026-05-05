# Pedagogical Quadratic Stepper — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 3 modules pédagogiques de
> step-by-step (`pedagogical-arithmetic/`, `pedagogical-solve/linear`,
> `pedagogical-differentiation/`) tous branchés sur le « Mode B » des
> corrections de questions (`QuestionCorrection.generatedSteps`,
> discriminé `kind: 'arithmetic' | 'linear-equation' | 'differentiate'`).
> Le module `pedagogical-solve/` ne supporte que le linéaire ; on ajoute
> la résolution pédagogique des équations du second degré et on branche
> un nouveau `kind: 'quadratic-equation'` côté Mode B.

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Module modèle (à cloner / étendre)

- `src/lib/mathAST/pedagogical-solve/types.ts` — `EquationStep`,
  `EquationOperation` (union discriminée à étendre), `LinearSchoolLevel`,
  `STRATEGIES`. Le commentaire ligne 35 est explicite : « Future
  quadratic / transcendental pipelines may extend this union ».
- `src/lib/mathAST/pedagogical-solve/linear.ts` — pipeline pédagogique
  complet pour le linéaire (canonicalisation, splitSide, addToBothSides,
  divideBothSides, extractCoefficientOfX, makeStep, renumberSteps,
  `generateLinearEquationSteps()`). **C'est le template architectural à
  cloner.**
- `src/lib/mathAST/pedagogical-solve/linear-renderer.ts` — renderer avec
  TITLES + EXPLANATIONS par niveau, `formatExpressionLatex`, gestion
  `subSteps` récursive, helper `formatColoredAddend`, assertion
  `assertSupportedLevel(primaire interdit)`. **C'est le template renderer
  à cloner.**
- `src/lib/mathAST/pedagogical-solve/__tests__/linear.test.ts` et
  `linear-renderer.test.ts` — modèle de tests.
- `src/lib/mathAST/pedagogical-solve/__tests__/linear-demo.test.ts` et
  `pedagogical-solve/demo-equations/` — modèle de snapshots catégorisés.

### 2. Logique algorithmique réutilisable (NE PAS réimplémenter)

- `src/lib/mathAST/solve/solvers/quadratic.ts` — solveur algorithmique
  complet : `extractQuadraticCoefficients(expr, variable)` (privée
  actuellement — il faudra l'**exporter** pour réutilisation),
  calcul du discriminant `Δ = b² - 4ac`, détection signe, formules
  `x = -b/(2a)` (Δ=0) et `x = (-b ± √Δ) / (2a)` (Δ>0), helpers
  `isZeroNode`, `isNegativeNode`. **Réutiliser ces building blocks
  pour les calculs effectifs ; ne pas re-coder.**
- `src/lib/mathAST/solve/classify.ts` — `getPolynomialDegree(expr, variable)`
  retourne le degré (la sanity check existante du linéaire passe par
  cet appel).
- `src/lib/mathAST/solve/descriptions-fr.ts` — rules quadratique déjà
  déclarées (`identify-quadratic`, `identify-coefficients`,
  `compute-discriminant`, `discriminant-{positive,zero,negative}`,
  `apply-quadratic-formula`, `quadratic-formula`, `double-solution`,
  `no-real-solution`, `simplify-solution`) et helpers paramétrés
  `describeCoefficients(a,b,c)`, `describeDiscriminant(value, numericValue)`,
  `describeSolution(variable, value, index?)`. **Réutiliser ou
  s'en inspirer pour les TITLES.**
- `src/lib/mathAST/solve/pedagogical-renderer.ts` — renderer MVP Phase 2
  qui contient déjà des TITLES quadratique pour
  `identify-quadratic`, `identify-coefficients`, `compute-discriminant`,
  `discriminant-{positive,zero,negative}`, `apply-quadratic-formula`,
  `simplify-solution`, en 3 niveaux (college/lycee/superieur). C'est
  **du vocabulaire pré-écrit** qu'on peut directement importer dans
  notre nouveau renderer ou copier comme point de départ.

### 3. Glue Mode B (pattern à reproduire)

- `src/lib/questions/types.ts` — chercher le bloc `GeneratedSteps` :
  union discriminée actuelle = `'arithmetic' | 'linear-equation' |
'differentiate'`. **Étendre avec `'quadratic-equation'`.**
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict)
  avec discriminator, à étendre.
- `src/lib/questions/generator/correction-generator.ts` — dispatch
  switch/case sur `kind`. La case `linear-equation` (lignes ~34-36
  d'imports) est le modèle direct à reproduire.
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` —
  ajouter une fixture quadratique (lycée, par exemple
  `x² - 5x + 6 = 0`).
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` —
  étendre les snapshots.
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` —
  page debug à étendre avec les nouvelles fixtures (le pattern
  différentiation a déjà ajouté 2 cartes — en faire de même).

### 4. Docs de progression liées

- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble.
- `docs/wip/correction-integration-progress.md` — détails de
  l'architecture Mode B.
- `docs/wip/differentiation-stepper-progress.md` — modèle de doc de
  progression à reproduire (phasage, code review, quality checks).
- `docs/wip/pedagogical-arithmetic-progress.md` — autre exemple de
  doc de progression complète (Phase 11 UX itérative).

---

## Phase 0 — Spécification TDD (bloquante : valider avec l'utilisateur AVANT d'écrire du code)

L'agent doit poser ces questions à l'utilisateur et **attendre des réponses
explicites** avant de passer à Phase 1. Ne pas inventer une réponse en
absence de l'utilisateur.

### Comportements proposés

#### A. Couverture mathématique V1

1. **Cas standard** `ax² + bx + c = 0` (a ≠ 0) avec discriminant.
   - Δ > 0 → deux solutions distinctes `x₁ = (-b - √Δ) / (2a)`, `x₂ = (-b + √Δ) / (2a)`.
   - Δ = 0 → solution double `x = -b / (2a)`.
   - Δ < 0 → pas de solution réelle (énoncé pédagogique "Pas de solution dans ℝ").
2. **Cas spéciaux pédagogiques** (priorisés AVANT la formule générale) :
   - `ax² + c = 0` (b = 0) → résolution directe `x² = -c/a` puis `x = ±√(-c/a)` (ou pas de solution si -c/a < 0).
   - `ax² + bx = 0` (c = 0) → factorisation `x(ax + b) = 0` → produit nul → `x = 0` ou `x = -b/a`.
   - `(ax + b)(cx + d) = 0` (forme déjà factorisée détectée) → produit nul direct, sans développement.
3. **Forme normalisée** : avant tout, normaliser à `... = 0` (transposer ce
   qui est à droite). Si l'entrée est `2x² + 3 = x - 4`, on commence par
   transposer pour obtenir `2x² - x + 7 = 0`.

#### B. Niveaux scolaires

- `lycee` : niveau standard. Vocabulaire : "discriminant", "racines",
  "S = {x₁, x₂}".
- `superieur` : vocabulaire compact ("Δ = b² - 4ac > 0", S = …).
- `college` et `primaire` : **refusés** au type-level (le quadratique n'est
  pas au programme avant la 1ère). Type `QuadraticSchoolLevel = 'lycee' | 'superieur'`,
  symétriquement à `LinearSchoolLevel`.

#### C. Pipeline structurel par niveau

| Niveau    | Étapes top-level (cas Δ > 0)                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lycee     | identify → standardize (si nécessaire) → identify-coefficients → compute-discriminant → discriminant-positive (avec valeur) → apply-quadratic-formula (formules x₁, x₂) → simplify-solutions → read-solutions (S = {…}) |
| supérieur | identify (skip) → standardize → identify-coefficients (compact) → compute-discriminant + signe en 1 step → apply-quadratic-formula compact → read-solutions                                                             |

Idem pour Δ = 0 et Δ < 0 (versions adaptées).

Pour les **cas spéciaux** (b=0, c=0, factorisé), branches dédiées :

- **b = 0, ax² + c = 0** :
  identify → standardize → recognize-no-linear-term →
  isolate-square (`ax² = -c`, `x² = -c/a`) →
  extract-square-root (`x = ±√(-c/a)`) ou no-real-solution si -c/a < 0 →
  read-solutions.
- **c = 0, ax² + bx = 0** :
  identify → standardize → recognize-no-constant-term →
  factor-common-x (`x(ax+b) = 0`) → zero-product → solve-each-factor → read-solutions.
- **Forme factorisée déjà** :
  identify → recognize-factored → zero-product → solve-each-factor → read-solutions.

#### D. Bindings & detection

- Détection de cas spécial AVANT extraction de coefficients (regex AST simple).
- Réutiliser `extractQuadraticCoefficients` du solveur algorithmique (il
  faudra l'**exporter** depuis `solvers/quadratic.ts` ; aujourd'hui privée).
- Réutiliser `getPolynomialDegree` de `solve/classify.ts` pour la sanity check.
- Réutiliser `computeNumericValue` de `solve/numeric-value.ts` pour
  obtenir la valeur numérique du discriminant et décider du signe.

#### E. Présentation des solutions

- `lycee` : `S = \\{x_1, x_2\\}` avec valeurs simplifiées.
- `superieur` : `S = \\{x_1, x_2\\}` ou `S = \\{x_0\\}` (Δ=0) ou `S = \\emptyset` (Δ<0).
- Quand Δ est un **carré parfait** : afficher la valeur de `√Δ` directement
  (ex : `√16 = 4`) au lieu de laisser `\\sqrt{16}` dans la formule.
  Détection via `isPerfectSquare` (helper à écrire si absent — vérifier dans
  `normal/radical.ts` d'abord).
- Quand Δ est négatif **dans ℝ** : message `"Le discriminant est négatif :
pas de solution réelle. S = \\emptyset"`.

#### F. Cas hors scope V1 (refus explicite avec message)

- Coefficients **paramétriques** (ex: `mx² + 2mx + 1 = 0`) — V2.
- **Discussion sur le paramètre** (Δ = 4m² − 4m → discuter du signe) — V2.
- **Équations bicarrées** `ax⁴ + bx² + c = 0` — V2 (gérées par `solvers/quartic.ts` algorithmiquement).
- **Cubiques / quartiques** — hors scope (gérés par `solvers/cubic.ts`, `solvers/quartic.ts`).
- **Inéquations du 2nd degré** — hors scope (relation différente).

Le cas non-supporté lève `PedagogicalQuadraticNotImplemented` (analogue de
`PedagogicalDifferentiationNotImplemented`) ; côté correction-generator, fallback Mode A.

#### G. Mode B intégré

- Nouveau `kind: 'quadratic-equation'` dans `GeneratedSteps`.
- Schéma Zod (lax + strict) avec discriminator étendu.
- Case dédiée dans `correction-generator.ts` qui appelle
  `generateQuadraticEquationSteps()` puis le renderer.
- Bump `primaire` / `college` → `lycee` (pas de `QuadraticSchoolLevel='primaire'`).
- 1 fixture end-to-end : `x² - 5x + 6 = 0` (Tle spécialité).
- Page debug étendue (5 fixtures total au lieu de 4).

### Questions à poser explicitement

> **Q1 — Module séparé vs extension ?**
> Option A : nouveau fichier `pedagogical-solve/quadratic.ts` +
> `quadratic-renderer.ts`, frères de `linear.ts` / `linear-renderer.ts`.
> Option B : étendre `linear.ts` / `linear-renderer.ts` pour gérer les deux.
>
> **Reco par défaut** : Option A. Cohérent avec le style établi
> (un fichier par sujet, comme `pedagogical-rules/basic-operations.ts`,
> `fractions.ts`, etc. dans `pedagogical-arithmetic/`).
>
> **Q2 — Dispatcher unifié ?**
> Faut-il créer un `pedagogical-solve/index.ts` qui dispatch
> linéaire/quadratique selon `getPolynomialDegree()` ? Cela simplifierait
> l'API publique (`generateEquationSteps(eq, options)` au lieu de deux
> fonctions distinctes). **Reco par défaut** : OUI, mais en gardant les
> deux fonctions individuelles exportées pour le code existant
> (`correction-generator.ts` linear-equation reste tel quel).
>
> **Q3 — Granularité des cas spéciaux ?**
> Faut-il les 3 cas spéciaux (b=0, c=0, forme factorisée) en V1, ou
> seulement le cas standard + cas factorisé (qui est le plus pédagogique) ?
> **Reco par défaut** : les 3 cas spéciaux + standard. Faible coût, gros
> bénéfice pédagogique (un élève qui voit `x² - 4 = 0` traité comme
> `x² = 4 → x = ±2` au lieu de discriminant complet apprend mieux).
>
> **Q4 — Rendu du discriminant comme étape compacte ou décomposée ?**
> Lycée standard : "Δ = b² - 4ac = 5² - 4×1×6 = 25 - 24 = 1"
> en une seule cellule LaTeX (les sous-calculs en ligne).
> Décomposé : 3 sub-steps (compute b², compute 4ac, soustraire).
> **Reco par défaut** : compact. Les sous-calculs détaillés pourraient
> être un raffinement V1.1 si demandé (cf. raffinements V1.1 différentiation).
>
> **Q5 — Présentation des solutions x₁, x₂ : 1 ou 2 étapes ?**
> A : `apply-quadratic-formula` produit déjà `x₁ = ... et x₂ = ...` en
> une étape, puis `simplify-solutions` simplifie les deux ensemble.
> B : étape distincte par solution (4 étapes total).
> **Reco par défaut** : A. La symétrie ± de la formule est l'idée
> centrale — la dissocier en deux étapes la dilue.
>
> **Q6 — Démos snapshot : combien de catégories ?**
> Cf. modèle différentiation (6 catégories × ~6 cas) ou linear (7 catégories × ~3 cas).
> Catégories proposées :
>
> - `standard-positif` (Δ > 0) — 4-5 cas
> - `standard-double` (Δ = 0) — 2-3 cas
> - `standard-negatif` (Δ < 0) — 2-3 cas
> - `b-zero` (`ax² + c = 0`) — 3-4 cas (positif, négatif, fraction)
> - `c-zero` (`ax² + bx = 0`) — 3 cas
> - `factorise` (forme déjà factorisée) — 2-3 cas
> - `non-standard-form` (transposition d'abord) — 2-3 cas
>
> **Reco par défaut** : 7 catégories × ~3 cas = ~20 cas total.
>
> **Q7 — `kind: 'quadratic-equation'` ou regrouper sous `'polynomial-equation'` générique ?**
> A : `kind: 'quadratic-equation'` cohérent avec `'linear-equation'`
> existant. Couvre exactement le scope V1.
> B : `kind: 'polynomial-equation'` plus générique, anticipe cubic/quartic.
> **Reco par défaut** : A. Cohérence > anticipation. Si on ajoute cubic
> plus tard, on peut soit ajouter `'cubic-equation'`, soit refactorer.
>
> **Q8 — `notImplemented` : silent fallback ou throw ?**
> Le cas paramétrique / bicarrée est explicitement hors scope V1. Le
> module doit-il throw `PedagogicalQuadraticNotImplemented` (comme
> `PedagogicalDifferentiationNotImplemented`) pour que le
> correction-generator catche et fallback Mode A ?
> **Reco par défaut** : OUI, classe d'erreur dédiée + catch dans correction-generator.
>
> **Q9 — Couverture des tests ?**
> Volume cible (modèle différentiation) : ~80-100 tests pipeline + ~15-20 tests
> renderer + 20 snapshots demo + 3-5 tests intégration correction-generator.
> **Reco par défaut** : ~120 tests cible total, ~3500 LOC ajoutées.

### Critères d'acceptation

- 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
- Pipeline opérationnel sur les 4 cas (Δ>0, Δ=0, Δ<0, cas spéciaux)
- Forme `... = 0` standardisée automatiquement si nécessaire
- Renderer 2 niveaux (lycee, superieur) avec TITLES + EXPLANATIONS
- ≥6 catégories de démos avec snapshots stables
- Script CLI standalone (`scripts/pedagogical-quadratic-demo.ts`)
- Mode B `kind: 'quadratic-equation'` intégré + 1 fixture end-to-end
- Page debug étendue avec la nouvelle fixture
- 0 erreur ESLint, 0 nouvelle erreur TS (`pnpm check:incremental`)
- Doc de progression écrite (`docs/wip/quadratic-stepper-progress.md`)
- Code review `code-reviewer` (Opus) après chaque phase
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global)

---

## Phase 1 — Étendre les types (`pedagogical-solve/types.ts`)

### Sous-tâches

1. Étendre `EquationOperation` avec les nouveaux `kind` :

   - `identify-equation` : élargir l'`equationType: 'linear'` vers
     `equationType: 'linear' | 'quadratic'`.
   - `standardize` : `{ kind: 'standardize'; from: 'free-form' }` (transposition vers `... = 0`).
   - `identify-coefficients` : `{ kind: 'identify-coefficients'; a, b, c: MathNode }`.
   - `compute-discriminant` : `{ kind: 'compute-discriminant'; a, b, c, discriminant: MathNode }`.
   - `discriminant-positive` / `discriminant-zero` / `discriminant-negative` :
     `{ kind: 'discriminant-positive'; discriminant: MathNode; numericValue?: number }`.
   - `apply-quadratic-formula` : `{ kind: 'apply-quadratic-formula'; a, b, discriminant: MathNode; case: 'two-distinct' | 'double' }`.
   - `simplify-solutions` : `{ kind: 'simplify-solutions'; solutions: readonly MathNode[] }`.
   - `read-solutions` : `{ kind: 'read-solutions'; variable: string; solutions: readonly MathNode[] }` (pluriel, distinct de `read-solution` linéaire).
   - `recognize-no-linear-term` : `{ kind: 'recognize-no-linear-term' }`.
   - `recognize-no-constant-term` : `{ kind: 'recognize-no-constant-term' }`.
   - `recognize-factored` : `{ kind: 'recognize-factored'; factors: readonly MathNode[] }`.
   - `isolate-square` : `{ kind: 'isolate-square'; rhs: MathNode }` (cas b=0).
   - `extract-square-root` : `{ kind: 'extract-square-root'; argument: MathNode }`.
   - `factor-common-x` : `{ kind: 'factor-common-x'; remainder: MathNode }`.
   - `zero-product` : `{ kind: 'zero-product'; factors: readonly MathNode[] }`.
   - `solve-each-factor` : `{ kind: 'solve-each-factor'; solutions: readonly { factor: MathNode; value: MathNode }[] }`.
   - `no-real-solution` : `{ kind: 'no-real-solution' }`.

2. Ajouter `QuadraticSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`.

3. Ajouter `QuadraticEquationStepsOptions` (analogue de `LinearEquationStepsOptions`).

4. Ajouter `STRATEGIES_QUADRATIC: Readonly<Record<QuadraticSchoolLevel, QuadraticGenerationStrategy>>`
   (granularité par niveau : `discriminantMode: 'compact' | 'detailed'`,
   `formulaPresentation: 'one-step' | 'split-x1-x2'`, etc.).

5. Tests d'isolation des types (compilation only) — adapter le pattern
   du Phase 1 différentiation.

### Code review attendu

`code-reviewer` (Opus) sur le diff.

### Validation

- Compile clean (`pnpm check:incremental` sur les fichiers modifiés)
- Tests d'isolation passent
- Revue : cohérence avec `LinearSchoolLevel`, naming, `Readonly` partout.

---

## Phase 2 — Pipeline `pedagogical-solve/quadratic.ts`

### Sous-tâches

1. **Exporter** `extractQuadraticCoefficients` depuis `solve/solvers/quadratic.ts`.
   Vérifier qu'aucune mutation n'est faite sur les coefficients après
   extraction (sinon les rendre immuables).

2. Créer `pedagogical-solve/quadratic.ts` avec :

   - `generateQuadraticEquationSteps(equation, options): readonly EquationStep[]`
     — point d'entrée principal.
   - Helpers privés : `standardizeEquation`, `detectSpecialCase`,
     `dispatchByCase`, `buildStandardCaseSteps`, `buildBZeroCaseSteps`,
     `buildCZeroCaseSteps`, `buildFactoredCaseSteps`,
     `buildDiscriminantStep`, `buildFormulaStep`, `buildReadSolutionsStep`,
     `simplifyOrLeaveExact`, `isPerfectSquare`.
   - Réutiliser `canon`, `canonEquation`, `addToBothSides`, `divideBothSides`,
     `makeStep`, `renumberSteps` du `linear.ts` — soit en les **important**
     (probable refacto vers `_helpers.ts` partagé), soit en les
     **dupliquant localement** si l'import casse l'isolation. **Reco** :
     extraire dans `pedagogical-solve/_helpers.ts` partagé entre `linear`
     et `quadratic`.
   - Throw `PedagogicalQuadraticNotImplemented` pour les cas hors scope
     (paramétrique, bicarrée non-réduite). Classe d'erreur exportée.

3. Tests pipeline `__tests__/quadratic.test.ts` : ~60-80 tests couvrant
   les 4 cas + variantes (coefficients fractionnaires, négatifs,
   simplification de Δ, carré parfait, etc.).

4. Cas critiques à tester :
   - `x² + 5x + 6 = 0` → Δ=1, x₁=-3, x₂=-2 (cas standard simple)
   - `2x² - 4x + 2 = 0` → Δ=0, x₀=1 (double)
   - `x² + x + 1 = 0` → Δ=-3 (pas de solution)
   - `x² - 9 = 0` → cas b=0, x = ±3
   - `x² + 4 = 0` → cas b=0 négatif, S = ∅
   - `2x² + 6x = 0` → cas c=0, x(2x+6) = 0, x=0 ou x=-3
   - `(x-2)(x+3) = 0` → forme factorisée, x=2 ou x=-3
   - `x² + 2 = x + 8` → standardisation `x² - x - 6 = 0` puis Δ=25
   - `3x² - 3x - 18 = 0` → simplification (factor 3) puis cas standard
   - Cas paramétrique → throw

### Code review attendu

`code-reviewer` (Opus) sur le pipeline complet.

### Validation

- Tests passent
- 0 régression sur le linéaire (`linear.test.ts`)
- Revue : pas de duplication avec `solve/solvers/quadratic.ts`,
  réutilisation propre, cas spéciaux correctement détectés AVANT le cas standard.

---

## Phase 3 — Renderer `pedagogical-solve/quadratic-renderer.ts`

### Sous-tâches

1. Créer `QuadraticEquationRenderer` (classe analogue à `LinearEquationRenderer`).

2. TITLES (lycée, superieur) — réutiliser/copier depuis
   `solve/pedagogical-renderer.ts` MVP Phase 2 quand pertinent (déjà des
   titres pour identify-quadratic, identify-coefficients,
   compute-discriminant, discriminant-{positive,zero,negative},
   apply-quadratic-formula, simplify-solution).

3. Ajouter TITLES pour les nouveaux kinds (standardize, recognize-\*,
   isolate-square, extract-square-root, factor-common-x, zero-product,
   solve-each-factor, read-solutions, no-real-solution).

4. EXPLANATIONS (lycee detailed, superieur compact).

5. `formatExpressionLatex(step)` — adapter pour les nouvelles opérations :

   - `compute-discriminant` : afficher Δ = b² - 4ac avec substitution
     numérique en ligne.
   - `apply-quadratic-formula` : afficher la formule x = (-b ± √Δ)/(2a)
     puis la version substituée (les valeurs de a, b, Δ injectées).
   - `read-solutions` : `S = \\{x_1; x_2\\}` (en lycée FR).
   - `no-real-solution` : `S = \\emptyset`.

6. `assertSupportedLevel(level)` adapté : refuse `primaire` ET `college`.

7. Tests renderer `__tests__/quadratic-renderer.test.ts` : ~15-20 tests.

### Code review attendu

`code-reviewer` (Opus) sur les TITLES + EXPLANATIONS + formatExpressionLatex.

### Validation

- Tests renderer passent
- Visuellement vérifiable via demo CLI (Phase 5)

---

## Phase 4 — Dispatcher `pedagogical-solve/index.ts` (Q2)

Si Q2 = OUI (reco) :

1. Créer `pedagogical-solve/index.ts` exportant :

   - `generateEquationSteps(eq, options)` — dispatch automatique selon
     `getPolynomialDegree`.
   - Re-export des fonctions individuelles
     (`generateLinearEquationSteps`, `generateQuadraticEquationSteps`)
     pour le code existant.
   - Re-export des renderers (`LinearEquationRenderer`,
     `QuadraticEquationRenderer`).
   - Re-export des types et erreurs.

2. Tests dispatcher `__tests__/dispatcher.test.ts` : ~10 tests
   (linéaire → linear, quadratique → quadratic, degré ≥3 → throw).

### Code review attendu

`code-reviewer` (Opus).

### Validation

- Tests dispatcher passent
- 0 régression sur consumers existants (correction-generator linear-equation)

---

## Phase 5 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-solve/demo-equations-quadratic/` (frère de
   `demo-equations/` linéaire) avec ~7 catégories :

   - `standard-positif.ts`
   - `standard-double.ts`
   - `standard-negatif.ts`
   - `b-zero.ts`
   - `c-zero.ts`
   - `factorise.ts`
   - `non-standard-form.ts`
   - `index.ts` agrégateur (`ALL_CATEGORIES_QUADRATIC`).

2. Créer `pedagogical-solve/demo-helpers-quadratic.ts` avec
   `presentEquationQuadratic(label, eq, format)` analogue à
   `presentEquation` linéaire. Format `'custom' | 'latex' | 'both'`.

3. Créer `__tests__/quadratic-demo.test.ts` avec snapshots (~20 cas).

4. Créer `scripts/pedagogical-quadratic-demo.ts` (CLI standalone) :

   - Filtre par catégorie (args).
   - Flags `--latex` / `--custom` / `--both`.
   - Pretty-print custom syntax + ANSI bold-blue (cf. modèle
     `scripts/pedagogical-differentiation-demo.ts`).

5. Vérifier que le CLI tourne :
   ```bash
   pnpm tsx scripts/pedagogical-quadratic-demo.ts standard-positif
   pnpm tsx scripts/pedagogical-quadratic-demo.ts --latex
   ```

### Code review attendu

`code-reviewer` (Opus) sur les snapshots + CLI.

### Validation

- 20 snapshots stables
- CLI fonctionne avec et sans args
- 0 régression

---

## Phase 6 — Mode B : `kind: 'quadratic-equation'`

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   - Ajouter `'quadratic-equation'` au `kind` de `GeneratedSteps`.
   - Type narrowing : si `kind === 'quadratic-equation'`, `expression: string`
     (l'équation au format LaTeX/custom, ex `"x^2 - 5x + 6 = 0"`).
     Même shape que `'linear-equation'`.

2. Étendre `src/lib/questions/template-schema.ts` :

   - Ajouter le membre `quadratic-equation` au discriminator Zod (lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generateQuadraticEquationSteps`, `QuadraticEquationRenderer`,
     `QuadraticSchoolLevel`, `PedagogicalQuadraticNotImplemented`.
   - Case `'quadratic-equation'` dans le switch principal.
   - Bump `'primaire' | 'college'` → `'lycee'` pour le quadratique
     (analogue au bump `'primaire' → 'college'` du linéaire).
   - Catch `PedagogicalQuadraticNotImplemented` → fallback silencieux + warn.

4. Tests `correction-generator.test.ts` : +6-8 tests
   (cas standard, cas spécial, bump niveau, fallback notImplemented, override).

5. Étendre `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`
   avec une fixture quadratique (`x^2 - 5x + 6 = 0`, niveau Tle spé).

6. Étendre `__tests__/generated-steps-demo.test.ts` : +1 snapshot.

7. Étendre la page debug
   `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`
   avec la nouvelle fixture (5e carte).

### Svelte autofixer (OBLIGATOIRE pour la page debug)

```
mcp__svelte__svelte-autofixer(code: <contenu>, desired_svelte_version: 5,
                              filename: "+page.svelte")
```

### Code review attendu

`code-reviewer` (Opus) sur la glue Mode B + Svelte.
`security-auditor` (Opus) puisqu'on touche au pipeline qui consomme
des données utilisateur via Zod — vérifier que le strict schema valide bien.

### Validation

- Tests correction-generator passent
- Snapshot generated-steps-demo passe
- Page debug visible : `pnpm dev -- --port 5175` puis
  `http://localhost:5175/dashboard/admin/debug/correction-mode-b` (auth admin).
  Vérifier visuellement que la 5e carte rend correctement.

---

## Phase 7 — Quality checks finaux + commit final + doc

### Sous-tâches

1. **ESLint** sur tous les fichiers créés/modifiés :

   ```bash
   npx eslint <fichiers>
   ```

   Doit retourner 0 erreur, 0 warning.

2. **TypeScript + Svelte** :

   ```bash
   pnpm check:incremental
   ```

   Doit retourner 0 nouvelle erreur (les 9 erreurs préexistantes dans
   `slides/demo` et `extern/` sont attendues).

3. **Svelte autofixer** sur `+page.svelte` modifié :

   ```
   mcp__svelte__svelte-autofixer(...)
   ```

4. **Tests régression complets** sur les suites adjacentes :

   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```

   Aucune régression attendue.

5. **Doc de progression** : créer `docs/wip/quadratic-stepper-progress.md`
   sur le modèle de `differentiation-stepper-progress.md`. Inclure :

   - Tableau État global (Phase × Status × Commit × Notes).
   - Décisions architecturales validées (Phase 0).
   - Fichiers livrés.
   - Tests cumulés.
   - Code review (post-livraison) avec les éventuels fixes.
   - Limitations connues V1.
   - Pistes d'amélioration (post-V1).
   - Documents de référence.

6. **Mise à jour des docs principales** (à faire en fin de tunnel) :

   - `docs/wip/pedagogical-steppers-mvp-progress.md` — ajouter une entrée
     "✅ Stepper pédagogique pour quadratique" dans la section "Livrés
     depuis dans des prompts/sessions ultérieurs", retirer
     `pedagogical-solve/ quadratique` de "Élargissement de couverture
     toujours à faire".
   - `docs/wip/correction-integration-progress.md` — mentionner
     l'extension `kind: 'quadratic-equation'` dans la section "État final".

7. **Commit final** : direct (`git commit`) si peu de changements
   conceptuels en Phase 7, ou via `commit-manager` si beaucoup.

   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit
   (cf. CLAUDE.md global utilisateur).

### Validation

- ESLint clean
- check:incremental clean
- Svelte autofixer clean
- 0 régression sur ~12000 tests
- Doc de progression écrite
- Commit final créé

---

## Anti-patterns à éviter (RECAP des erreurs des sessions précédentes)

1. **Ne PAS** réimplémenter la logique algorithmique du discriminant — utiliser
   `extractQuadraticCoefficients` de `solve/solvers/quadratic.ts`. La
   session différentiation avait fait l'erreur de ne pas réutiliser
   `differentiation/rules.ts` au début.

2. **Ne PAS** ignorer les cas `FunctionNode.power` (`\sin^2(x)`-type) —
   pas applicable ici, mais le **principe général** est : avant de
   dispatcher sur `node.type`, vérifier les flags annexes (`.power`,
   `.subscript`) qui peuvent changer la sémantique. Pour le quadratique,
   bien vérifier que `extractQuadraticCoefficients` gère correctement
   les variables avec `subscript` (ex: `x_1² + 2x_1 = 5`).

3. **Ne PAS** émettre des steps vides (`steps: []`) au top-level — si
   un cas dégénéré (ex: `0 = 0` après standardisation, ou `5 = 0` faux)
   produit zéro étape, retourner soit un step `recognize-trivial-truth`
   ou `recognize-contradiction`, soit throw `PedagogicalQuadraticNotImplemented`
   pour fallback Mode A. **Ne jamais retourner `[]`.**

4. **Ne PAS** silently skip les cas hors scope. Toujours throw avec
   classe d'erreur dédiée + catch côté correction-generator.

5. **Ne PAS** dupliquer les helpers `canon`, `canonEquation`,
   `addToBothSides`, etc. — refactor en `_helpers.ts` partagé entre
   linear et quadratic.

6. **Ne PAS** mettre `Co-Authored-By: Claude` dans les commits.

7. **Ne PAS** exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint` sur tout le projet. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

8. **Ne PAS** s'arrêter au premier échec de phase. Si la phase 2 plante,
   debugger avec l'agent `debugger` (Opus). Continuer jusqu'à la fin du tunnel.

9. **Ne PAS** prendre de décision architecturale unilatérale. Si en
   cours de route un trade-off non couvert par Phase 0 émerge, **demander
   à l'utilisateur**.

10. **Ne PAS** déduire de la Phase 0 sans valider explicitement les
    réponses Q1-Q9 avec l'utilisateur. Attendre les réponses.

---

## Récap effort estimé

| Phase     | Effort estimé                               |
| --------- | ------------------------------------------- |
| 0         | 10-15 min validation Q1-Q9 avec utilisateur |
| 1         | 30-45 min types + tests isolation           |
| 2         | 2-3h pipeline + tests (~80 tests)           |
| 3         | 1.5-2h renderer + tests (~20 tests)         |
| 4         | 30-45 min dispatcher + tests                |
| 5         | 1.5-2h démos + script CLI + snapshots       |
| 6         | 1-1.5h Mode B + fixture + page debug        |
| 7         | 30-45 min quality + doc + commit            |
| **Total** | **~8-10h en tunnel continu**                |

Cible : **~120 tests verts spécifiques au feature**, **~3500 LOC**,
**6-8 commits intermédiaires**, **0 régression** sur ~12000 tests existants.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/quadratic-stepper-progress.md` — doc de progression complète.
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
3. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 3 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
