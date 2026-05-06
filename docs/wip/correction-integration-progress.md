# Intégration steppers pédagogiques aux corrections — Progression

> Source : `docs/wip/correction-integration-prompt.md`
> Branche : `main`
> Dernière mise à jour : 2026-05-06

## Objectif global

Permettre aux questions de déclarer une **correction Mode B** :
les étapes pédagogiques sont générées automatiquement par un des 7
pipelines (`pedagogical-arithmetic`, `pedagogical-solve/linear`,
`pedagogical-solve/quadratic`, `pedagogical-solve/linear-inequality`,
`pedagogical-solve/quadratic-inequality`, `pedagogical-solve/rational-inequality`,
`pedagogical-differentiation`) au lieu d'être écrites à la main par l'auteur.
Le composant Svelte `<GeneratedStepsCorrection>` (Phase 3) les affiche
aux élèves.

## Décisions architecturales validées (Phase 0)

| #   | Décision                                                                             |
| --- | ------------------------------------------------------------------------------------ |
| Q1  | Glue dans `correction-generator.ts` (séparé de `correction-resolver.ts`)             |
| Q2  | `gradeLevelToSchoolLevel()` — multi-grades → plus haut, vide → `'lycee'`             |
| Q3  | `MarkdownRenderer` existant pour rendu LaTeX                                         |
| Q4  | **V1 = 2 kinds** : `arithmetic` + `linear-equation` (skip `arithmetic-from-blank`)   |
| Q5  | `_renderedSteps` sur `ResolvedCorrection`, `generatedSteps` copié sur les deux types |
| Q6  | V1 passive (pas d'interactivité)                                                     |
| Q7  | Fallback silencieux + `console.warn`                                                 |
| Q8  | 2 questions migrées (1 primaire arithmétique + 1 collège équation)                   |
| Q9  | **Auto-call** dans `generateInstance()` avec early-return strict                     |

## Phases

### ✅ Phase 1 — Schéma types + grade level mapping

**Fichiers :**

- `src/lib/questions/grade-level-to-school-level.ts` (nouveau)
- `src/lib/questions/grade-level-to-school-level.test.ts` (12 tests)
- `src/lib/questions/types.ts` (ajout `GeneratedSteps`, `GeneratedStepsOptions`,
  extension `QuestionCorrection.generatedSteps` et
  `ResolvedCorrection.{generatedSteps, _renderedSteps}`)
- `src/lib/questions/template-schema.ts` (Zod : `generatedStepsSchema`,
  `generatedStepsOptionsSchema`, mise à jour `correctionSchema` et version stricte)
- `src/lib/questions/__tests__/template-schema.test.ts` (14 nouveaux tests)

**Résultat :** types cohérents, Zod aligné, mapping CP-T validé.

### ✅ Phase 2 — `generateCorrection()` + auto-call

**Fichiers :**

- `src/lib/questions/generator/correction-generator.ts` (nouveau)
- `src/lib/questions/generator/correction-generator.test.ts` (16 tests)
- `src/lib/questions/generator/instance-generator.ts` (import + auto-call à la
  fin de `generateInstance`, copie de `generatedSteps` sur la `ResolvedCorrection`)
- `src/lib/questions/generator/instance-generator.test.ts` (4 tests d'intégration)
- `src/lib/questions/validators/template-validator.ts` (correction valide aussi
  avec `generatedSteps` seul)

**Comportements clés :**

1. **Early-return strict** : si `correction.generatedSteps` absent, retour
   immédiat (zéro allocation, zéro log).
2. **Fallback silencieux** : tout throw / parse-fail dans la pipeline mène à un
   `console.warn` + retour de l'instance sans `_renderedSteps`. Le composant
   tombera sur Mode A si présent.
3. **`schoolLevel: 'auto'`** : résolu via `gradeLevelToSchoolLevel()`.
   Override explicite possible.
4. **`primaire` bumpé à `college`** pour `kind: 'linear-equation'` (linear
   algebra hors curriculum primaire).
5. **`generatedSteps` copié tel quel** sur `ResolvedCorrection` (les `{{vars}}`
   ne sont résolus que dans `generateCorrection`).

**Code review (code-reviewer agent)** : OK. 2 micro-corrections appliquées
(spread superflu, commentaire sur le cast `RelationNode`).

**Tests cumulés Phase 1+2** : 47 tests dédiés aux nouveautés, 0 régression
(les 11 échecs préexistants dans `variable-resolver`, `color-integration`,
`test-exact-repro`, `e2e-fill-blanks-pipeline` ne sont pas liés aux changements
— vérifié via `git stash`).

### ✅ Phase 3 — Composant `<GeneratedStepsCorrection>` + `CorrectionCard`

**Fichiers :**

- `src/lib/components/questions/GeneratedStepsCorrection.svelte` (nouveau)
- `src/lib/components/questions/CorrectionCard.svelte` (extension Mode B)

**Comportements clés :**

- Liste verticale numérotée, une étape par bloc.
- Titre + LaTeX (`$$\\begin{aligned}...$$` via `MarkdownRenderer`) +
  explanation si `verbosity === 'detailed'`.
- SubSteps récursifs avec indent visuel et bordure muted.
- `CorrectionCard` dérive `useGeneratedSteps` (`_renderedSteps?.length > 0 &&
!hasModeASteps`) — Mode A gagne si les deux sont présents (explicite >
  implicite).
- Mode B view rend toujours `feedback.correct` sous les étapes.
- **Svelte autofixer** : 0 issue sur le nouveau composant ; 0 issue introduite
  dans `CorrectionCard` (suggestions $effect/bind:this concernent du code
  pré-existant — hors scope).

Commit : `034e1d717`.

### ✅ Phase 4 — Migration de 2 questions tests (fixtures + snapshots)

**Fichiers :**

- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` (nouveau)
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` (5 tests + 2 snapshots)
- `src/lib/questions/__tests__/__snapshots__/generated-steps-demo.test.ts.snap`

**Démos livrées :**

| Question               | Niveau         | Pipeline                   | Steps générés                                    |
| ---------------------- | -------------- | -------------------------- | ------------------------------------------------ |
| `2 + 3×4 + 5×6 = ?`    | CM2 → primaire | `pedagogical-arithmetic`   | 4 (mul + add séquentiels, pas de groupement)     |
| `3x + 5 = 14`, `x = ?` | 4e → college   | `pedagogical-solve/linear` | 4 (identify + subtract + divide + read solution) |

Snapshots verrouillent `id`/`rule`/`title`/`schoolLevel` + booléens
`hasExpressionLatex`/`hasExplanation` ; le contenu LaTeX exact est verrouillé
par les tests des pipelines sous-jacents.

Commit : `4b6d01b8e`.

### ✅ Phase 5 — Quality checks + doc + commit final

**Vérifications réalisées :**

- `npx eslint` sur les 14 fichiers touchés : **0 erreur, 0 warning**.
- `pnpm check:incremental` : **0 nouvelle erreur** (les 9 erreurs détectées
  sont toutes pré-existantes dans `slides/demo*` et `extern/`, déjà filtrées
  par le script).
- `mcp__svelte__svelte-autofixer` exécuté sur les 2 fichiers `.svelte` modifiés :
  **0 issue dans le code écrit** (suggestions sur `$effect`/`bind:this` =
  code pré-existant non touché).
- 168 tests passent sur les suites dédiées Phase 1–4 (47 nouveaux tests +
  47 tests d'intégration existants) ; 0 régression sur la base de 2092
  tests `pnpm test:server src/lib/questions/`.

### ✅ Phase 6 — Page debug + validation visuelle

**Fichier :**

- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`
  (nouveau, ~200 lignes)

**Trois sections sur la page :**

1. **État de la génération** — statut ✓/✗ par fixture + bouton « Afficher le
   JSON brut des `RenderedStep[]` » pour inspecter la sortie pipeline brute.
2. **Aperçu direct** `<GeneratedStepsCorrection>` — composant nu, 2 cartes
   côte à côte (CM2 + 4e), sans flip ni `TestAnswerResult`.
3. **`<CorrectionCard>` flux complet** — 4 cartes (correct/incorrect ×
   arithmétique/linéaire) ; flip sur ↻ pour voir Mode B dans son contexte
   réel d'élève.

**Accès** : `http://localhost:5175/dashboard/admin/debug/correction-mode-b`
(authentification admin requise via le layout `(protected)`).

**Validation visuelle utilisateur** : ✓ — rendu LaTeX correct, étapes
colorées (`\textcolor{blue}{...}`), feedback préservé sous les étapes,
flip card opérationnelle en Mode B.

**Svelte autofixer** : 0 issue.

Commit : `c7ea40154`.

## État final des fichiers

**Nouveaux (11) :**

- `src/lib/questions/grade-level-to-school-level.{ts,test.ts}`
- `src/lib/questions/generator/correction-generator.{ts,test.ts}`
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`
- `src/lib/questions/__tests__/generated-steps-demo.test.ts`
- `src/lib/questions/__tests__/__snapshots__/generated-steps-demo.test.ts.snap`
- `src/lib/components/questions/GeneratedStepsCorrection.svelte`
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`
- `docs/wip/correction-integration-progress.md` (ce fichier)
- `docs/wip/correction-integration-prompt.md` (le prompt source)

**Modifiés (6) :**

- `src/lib/questions/types.ts`
- `src/lib/questions/template-schema.ts`
- `src/lib/questions/__tests__/template-schema.test.ts`
- `src/lib/questions/generator/instance-generator.{ts,test.ts}`
- `src/lib/questions/validators/template-validator.ts`
- `src/lib/components/questions/CorrectionCard.svelte`

## Tests cumulés Phase 1–4

| Suite                                 | Avant | Après        | Δ       |
| ------------------------------------- | ----- | ------------ | ------- |
| `grade-level-to-school-level.test.ts` | —     | 12           | +12     |
| `template-schema.test.ts`             | 40    | 54           | +14     |
| `correction-generator.test.ts`        | —     | 16           | +16     |
| `instance-generator.test.ts`          | 43    | 47           | +4      |
| `generated-steps-demo.test.ts`        | —     | 5            | +5      |
| **Total nouveau code**                | —     | **52 tests** | **+52** |

## Commits livrés

| #   | SHA         | Phase   | Description                                               |
| --- | ----------- | ------- | --------------------------------------------------------- |
| 1   | `caa9c58e7` | Phase 1 | types + Zod schema for Mode B generated correction steps  |
| 2   | `f7a878dfc` | Phase 2 | generateCorrection() pipeline glue + auto-call wiring     |
| 3   | `034e1d717` | Phase 3 | generated steps Svelte component + correction card wiring |
| 4   | `4b6d01b8e` | Phase 4 | end-to-end Mode B demo fixtures + snapshot tests          |
| 5   | `23485641a` | Phase 5 | progress doc final + quality checks                       |
| 6   | `c7ea40154` | Phase 6 | debug page `/dashboard/admin/debug/correction-mode-b`     |

## Extensions post-MVP — 7 nouveaux kinds

Le scope V1 listait 2 kinds (`arithmetic` + `linear-equation`). Depuis la
livraison initiale, **7 nouveaux kinds** ont été ajoutés via des prompts
distincts qui réutilisent l'infrastructure Mode B existante sans la modifier
en profondeur (discriminator étendu, case dispatch ajouté dans
`correction-generator.ts`, fixtures + page debug étendues) :

- **`kind: 'differentiate'`** (`differentiation-stepper-progress.md`) — pipeline
  pédagogique de dérivation de fonction. Bumps absents (la dérivation est
  acceptable de la primaire au supérieur, le renderer adapte le vocabulaire).
- **`kind: 'quadratic-equation'`** (`quadratic-stepper-progress.md`) — équations
  du second degré (Δ > 0, Δ = 0, Δ < 0, b = 0, c = 0, factorisé,
  non-standard-form). Bumps `primaire | college → lycee` (la formule du
  second degré n'est pas au syllabus avant 1ère). Catch
  `PedagogicalQuadraticNotImplemented` pour les cas hors V1 (paramétriques)
  → fallback Mode A silencieux.
- **`kind: 'linear-inequality'`** (`pedagogical-inequality-progress.md`,
  palier 2a) — inéquations linéaires avec retournement explicite de
  l'opérateur lors d'une division par scalaire négatif. Renderer V2
  polyvalent (équation/inéquation, pas de duplication ; helpers
  `isInequalityStep`, `flipNote`, `divideExplanation`/`multiplyExplanation`
  adaptés). Catch `UnsupportedInequalityDegree` /
  `InequalityNotSolvable` / `PedagogicalInequalityError`.
- **`kind: 'quadratic-inequality'`** (`pedagogical-quadratic-inequality-progress.md`,
  palier 2b + 2c) — inéquations du second degré via discriminant Δ + tableau
  de signes ; 6 sous-cas (signe(a) × signe(Δ)). Auto-délégation au
  pipeline linéaire quand a = 0. Palier 2c (`d010fb263`) ajoute 3 fast
  paths qui évitent Δ : `b = 0` (isolate-square), `c = 0` (factor-x),
  forme déjà factorisée. Renderer V2 étendu avec sign-table LaTeX et
  conclusion render.
- **`kind: 'rational-inequality'`** (`pedagogical-rational-inequality-progress.md`,
  palier 3 V1 + V1.1 + V2) — inéquations rationnelles `P(x)/Q(x) ⊻ 0`
  selon la méthode standard française : domaine de définition, racines
  de P, zéros de Q, tableau de signes combiné 4 lignes
  (`x | P | Q | P/Q` avec `||` aux zéros de Q), lecture de S. V2 ajoute
  l'étape `combine-fractions` pour `1/x + 1/(x-1) < 0` (cap 2
  dénominateurs distincts coprimes). Catch
  `InequalityNotSolvable` / `UnsupportedRationalInequality` →
  fallback Mode A.
- **`kind: 'integrate'`** (`integration-stepper-progress.md`) — primitives
  et intégrales définies. Champ `definite?: { lower, upper }` (LaTeX)
  optionnel pour intégrales définies (trio `apply-fundamental-theorem` +
  `substitute-bounds` + `simplify-bounds-result`). Bumps
  `primaire | college → lycee` (l'intégration n'est pas au syllabus avant
  Terminale). Catch `PedagogicalIntegrationNotImplemented` → fallback Mode A
  silencieux. **V1+V1.1+V2 livrés** : 27 rules pédagogiques au total
  incluant IPP cyclique (`∫eˣ·sin(x) dx`), arctan/arcsin (sup), partial-
  fractions simples (Q quadratique Δ>0). Cas refusés : racines répétées,
  deg(P) ≥ deg(Q), Q degré ≥ 3, facteurs quadratiques irréductibles,
  trig-substitution, intégrales impropres, fonctions par morceaux,
  paramétriques.
- **`kind: 'simplify'`** (`simplify-stepper-progress.md`) — simplification
  d'expressions selon un `intent` requis (`'factoriser'` |
  `'developper'` | `'reduire'` | `'auto'`). Architecture **Option C′**
  (pipeline manuel à la `pedagogical-arithmetic`, réutilise rule sets
  pattern + normalize StepRecorder, sans `rewrite()`). Pas de bump : 4
  niveaux distincts (la simplification est enseignée dès le primaire).
  Catch `PedagogicalSimplifyNotImplemented` → fallback Mode A
  (matrices, inéquations, piecewise, logical, `auto` ambigu).

**État actuel :** la page debug `/dashboard/admin/debug/correction-mode-b`
expose **15 fixtures** : `additionGroupingDemo` (CM2 arithmétique),
`linearEquationDemo` (4e équation linéaire),
`differentiatePolynomialDemo` + `differentiateCompositionDemo`
(1ère/Tle spé), `quadraticEquationDemo` (Tle spé),
`linearInequalityFlipDemo` + `linearInequalityTwoSidesDemo`
(2nde/1ère), `quadraticInequalityClassicDemo` +
`quadraticInequalityNegativeADemo` (1ère/Tle spé),
`rationalInequalitySimpleDemo` + `rationalInequalityQuadDenomDemo`
(1ère/Tle spé), `integrateIndefiniteDemo` + `integrateDefiniteDemo`
(Tle spé), `simplifyDistributionDemo` (4e) +
`simplifyTrigDemo` (1ère spé).

Ces 6 extensions valident que l'architecture Mode B est suffisamment
robuste pour accueillir de nouveaux pipelines pédagogiques sans refactoring
de la glue. Le pattern `(types/Zod loose+strict/correction-generator
case/fixtures/page debug card)` est devenu reproductible mécaniquement.

## Risques connus / TODOs futurs (post-V1)

### UX à raffiner (différé)

L'utilisateur a validé visuellement le rendu de bout en bout sur la page
debug (Phase 6). L'UI elle-même reste à améliorer dans une session ultérieure :

- **Hiérarchie visuelle des étapes** : la liste numérotée fonctionne mais
  pourrait gagner en lisibilité (séparation entre étapes plus marquée,
  gestion responsive du LaTeX qui déborde, animation de progression).
- **Densité du `\textcolor{blue}{...}`** : à confronter à différents
  zooms / tailles d'écran pour vérifier le contraste et la lisibilité.
- **Intégration au flow flashcard** : aujourd'hui Mode B s'affiche dans
  `CorrectionCard` (face arrière, après flip) ; à valider que le ressenti
  est cohérent dans les autres écrans qui consomment des `QuestionInstance`.

### Périmètre technique non livré

- **`arithmetic-from-blank`** : skip en V1, à reconsidérer si la duplication
  d'expression entre `expectedAnswer` (`{{eval:a+b}}`) et
  `generatedSteps.expression` (`{{a}}+{{b}}`) devient gênante en pratique.
- **`kind: 'solve'` (algorithmique générique)** : pas couvert. Le
  pedagogical-solve V1.0 supporte linéaire + quadratique pour équations
  ET inéquations + rationnelles pour inéquations (cf. extensions
  ci-dessus) ; cubic / quartic / transcendental restent hors scope.
- **Palier 2d — coefficients paramétriques quadratiques** (`mx² + nx + p ⊻ 0`,
  m libre) : « discuter selon m » du programme Tle, hors scope V1
  (multi-sessions, complexité ↑↑ disjonction de cas dans le tableau de
  signes). Le solveur algorithmique `solveInequality` rejette les
  paramétriques avec `InequalityNotSolvable`.
- **Palier 3 V3 — extensions rationnelles** : 3+ fractions, dénominateur
  quadratique, PGCD polynomial non-trivial, fractions imbriquées.
- **Composant interactif (étape par étape)** : V1 passive uniquement.
- **UI éditeur de questions** : écriture JSON manuelle pour V1.
- **Hybridation Mode A + Mode B** : Mode A prioritaire si les deux présents.
