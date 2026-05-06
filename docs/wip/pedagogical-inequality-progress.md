# Pedagogical Linear Inequality — Progression palier 2a

**Date** : 2026-05-05 → 2026-05-06.
**Statut** : **livré et committé** — voir tableau « Commits » ci-dessous.

## Commits

| #   | Hash        | Sujet                                                                                |
| --- | ----------- | ------------------------------------------------------------------------------------ |
| 1   | `fbecbaa05` | feat(pedagogical-solve): palier 2a — linear inequality stepper                       |
| 2   | `fbe49b80f` | feat(pedagogical-solve): renderer V2 — lift V1 inequality limitations                |
| 3   | `a974787d7` | fix(pedagogical-solve): renderer aligned-block uses flipped operator on after-line   |
| 4   | `533aa6259` | feat(questions): wire 'linear-inequality' kind end-to-end + CLI pretty-print         |
| 5   | `02522eebb` | docs(wip): consolidate palier 2a progress doc                                        |
| 6   | `1cf5690e9` | fix(sign): split intervals at excludedPoints natively + remove inequality workaround |
| 7   | `184af30a9` | style(sign): move PARTITION_DEDUPE_TOLERANCE after all imports                       |

## Livrable

API publique pour générer des étapes pédagogiques (`EquationStep[]`) résolvant
une inéquation linéaire à coefficients **numériques**, avec retournement
explicite de l'opérateur lors d'une division par scalaire négatif.

```ts
import {
	generateInequalitySteps,
	generateLinearInequalitySteps
} from '$lib/mathAST/pedagogical-solve';

const steps = generateInequalitySteps(parseLatex('-2x \\geq 6'), { level: 'college' });
// steps[1].operation = { kind: 'divide-both-sides', operand: -2, flipOperator: true }
// steps[1].after.relation = '<='   (retourné depuis '>=')
// steps[1].after.right = -3
```

## Fichiers

| Fichier                                                                 | Rôle                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-solve/linear-inequality.ts`                | Implémentation                                                                                    |
| `src/lib/mathAST/pedagogical-solve/__tests__/linear-inequality.test.ts` | 22 tests (couvre les 20 cas spec)                                                                 |
| `src/lib/mathAST/pedagogical-solve/_helpers.ts`                         | Étendu : `divideBothSidesWithFlip` + `flipRelation`                                               |
| `src/lib/mathAST/pedagogical-solve/types.ts`                            | Étendu : `flipOperator?` sur 3 ops + `inequality-conclude-truth` + `LinearInequalityStepsOptions` |
| `src/lib/mathAST/pedagogical-solve/index.ts`                            | Dispatcher `generateInequalitySteps` + re-exports                                                 |
| `src/lib/mathAST/pedagogical-solve/linear-renderer.ts`                  | Helper `relToLatex` (mapping `<=`/`>=`/`!=` → `\leq`/`\geq`/`\neq`)                               |
| `docs/wip/pedagogical-inequality-spec.md`                               | Spec validée                                                                                      |

## Pipeline

```
generateInequalitySteps(ineq, opts)
  → si '=' → throw PedagogicalInequalityError
  → si pas de variable → linear (cas constant)
  → si degré null → throw UnsupportedInequalityDegree(null)  (transcendant non-poly)
  → si degré ≥ 2 → throw UnsupportedInequalityDegree(degree) (palier 2b)
  → sinon → generateLinearInequalitySteps

generateLinearInequalitySteps(ineq, opts)
  1. Validation operator (rejet de '=', non-inégalités)
  2. Détection variable (null = cas constant)
  3. Sanity degré 0/1 + rejet paramétrique
  4. Étape identify-equation (selon STRATEGIES.includeIdentify)
  5. Cas constant (variable null) → conclude-truth
  6. Regroupement (atomic OU combined selon STRATEGIES) — preserve l'opérateur
  7. Division par coefficient :
     - a = 0 → conclude-truth (évalué numériquement)
     - a = 1 → pas d'étape
     - a ≠ 0,1 → divideBothSidesWithFlip → flipOperator true ssi a < 0
  8. Renumber + return
```

`divideBothSidesWithFlip` :

| op original | divisor < 0 ? | op résultat |
| ----------- | ------------- | ----------- |
| `<`         | oui           | `>`         |
| `>`         | oui           | `<`         |
| `<=`        | oui           | `>=`        |
| `>=`        | oui           | `<=`        |
| `<,>,<=,>=` | non           | inchangé    |
| `!=`        | quelconque    | inchangé    |
| `=`         | quelconque    | inchangé    |

## Décisions issues du code review

1. **Signature `UnsupportedInequalityDegree`** alignée sur `UnsupportedEquationDegree` : accepte maintenant `number | null`, avec branche dédiée pour le cas non-polynomial. Le dispatcher distingue explicitement « pas de variable détectée » (= constante, route vers linear) de « variable présente mais expression non-polynomiale » (= throw `UnsupportedInequalityDegree(null)`).
2. **`InequalityNotSolvable`** importé depuis `solve/inequality/types` directement dans le barrel `pedagogical-solve/index.ts` (pas de re-export depuis `linear-inequality.ts` — surface publique unique).
3. **Imports tests fusionnés** (un seul bloc d'import depuis `linear-inequality`).
4. **JSDoc `relToLatex`** clarifie qu'il ne couvre que les 5 opérateurs émis par les pipelines linéaires (pas le `RelationType` étendu).
5. **Imports inutilisés supprimés** dans `linear-inequality.ts` (`relation`) et le test (`lastRelationLatex`).

## Renderer pour inéquations — V2 livré (2026-05-06)

Les limitations V1 du renderer sont **levées**. Le `LinearEquationRenderer` est
maintenant polyvalent (équation/inéquation) sans duplication — l'extension est
faite par branchement sur `step.before.relation !== '='` et `op.flipOperator`,
plutôt que par création d'un `LinearInequalityRenderer` dédié.

### V1 → V2

| Limitation V1                                                                                             | Solution V2                                                                                  |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TITLES sans note « (changement de sens) »                                                                 | Helper `flipNote(op)` ajoute la note quand `flipOperator: true`                              |
| EXPLANATIONS parlent de « l'égalité » même pour inéquations                                               | Helper `divideExplanation`/`multiplyExplanation` branchent sur `isInequalityStep`            |
| `inequality-conclude-truth` sans TITLE/EXPLANATION                                                        | `inequalityConcludeTruthTitle` + `inequalityConcludeTruthExplanation`, ajoutés aux 3 niveaux |
| `identify-equation` dit « Équation » pour les inéquations                                                 | `identifyEquationTitle` retourne « Inéquation du premier degré » via `isInequalityStep`      |
| `formatTransformationLines` rendait l'aligned block pour `inequality-conclude-truth` (rien à transformer) | Ajout au filtre info-only                                                                    |

### Helpers ajoutés

- `isInequalityStep(step)` — `true` si `step.before.relation !== '='`
- `preservedNoun(step)` — « l'inégalité » ou « l'égalité » avec élision
- `flipNote(op)` — chaîne « (changement de sens car X est négatif) » ou vide
- `inequalityConcludeTruthTitle` / `inequalityConcludeTruthExplanation`
- `divideExplanation` / `multiplyExplanation` — adaptés au type d'opérateur

### Tests renderer V2

Nouveau fichier `__tests__/linear-renderer-inequality.test.ts` (23 tests) :

- TITLES « changement de sens » présent ssi `flipOperator: true`
- EXPLANATIONS adaptées (inégalité vs égalité)
- `inequality-conclude-truth` rendu avec mention « S = ℝ » ou « contradiction »
- `formatTransformationLines` retourne `null` pour la conclude-truth (info-only)
- Régression équation : titres et explications inchangés (vérifiés via 13 tests existants `linear-renderer.test.ts`)

### Décisions issues du code review V2

1. **Lycée `add-both-sides` simplifié** : remplacement de la comparaison fragile
   `preservedNoun(step) === "l'inégalité"` par `isInequalityStep(step)` direct
   (résistant à un futur renommage de `preservedNoun`).

## Bug fix renderer (commit `a974787d7`) — détecté par la démo CLI

`formatTransformationLines` utilisait `step.before.relation` pour les **deux**
lignes du bloc aligned. Pour les ops avec `flipOperator: true`, la ligne
« après » affichait du coup l'opérateur d'origine au lieu du retourné — par ex.
`-x < 3` divisé par −1 produisait `x < -3` au lieu de `x > -3`.

Régression non détectée par les 23 tests V2 (qui inspectaient
`step.after.relation` au niveau data, pas le LaTeX rendu).

**Fix** : split `rel` en `relBefore` (ligne 1, opération en cours) et
`relAfter` (ligne 2, résultat simplifié, opérateur déjà retourné). Pour les
non-flip et les équations, les deux sont égaux donc rendu identique.

5 tests de régression ajoutés à `linear-renderer-inequality.test.ts` (28 tests
au total) couvrant les 4 variantes : aligned college (< → >), aligned college
(≥ → ≤), simplify-coefficient lycée (< → >), et 2 régressions non-flip
(inéquation positive + équation).

## Mode B integration (commit `533aa6259`) — page debug + CLI pretty-print

### Wiring end-to-end

Nouveau kind `linear-inequality` dans `GeneratedSteps` (ré-utilisé par les
templates de questions Mode B), câblé bout-en-bout :

- **Type** : `src/lib/questions/types.ts` — discriminator `linear-inequality`
  avec champ `inequality: string` (template avec `{{a}}`, `{{eval:…}}`).
- **Schéma** : `src/lib/questions/template-schema.ts` — Zod loose + strict.
- **Dispatch** : `src/lib/questions/generator/correction-generator.ts` —
  fonction `renderLinearInequality` qui appelle
  `generateLinearInequalitySteps` et avale silencieusement
  `UnsupportedInequalityDegree` / `InequalityNotSolvable` /
  `PedagogicalInequalityError` (mirror du flow quadratique).
- **Fixtures démo** : 2 nouvelles dans
  `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` :
  - `linearInequalityFlipDemo` — `−2x ≥ 6` (cas avec changement de sens)
  - `linearInequalityTwoSidesDemo` — `2x + 1 < x + 5` (sans flip)
- **Page debug** : `/dashboard/admin/debug/correction-mode-b` — 2 cartes
  `<GeneratedStepsCorrection>` + 4 cartes `<CorrectionCard>` (chaque fixture
  a sa version « réponse correcte » et « réponse incorrecte »).
- **Snapshot tests** : 2 nouveaux dans `generated-steps-demo.test.ts`
  (verrouille le rendu).

### CLI pretty-print parity

Le script standalone produisait initialement du LaTeX brut peu lisible en
terminal :

```
│ \dfrac{-x}{\textcolor{blue}{-1}} &< \dfrac{3}{\textcolor{blue}{-1}}
│ x &> -3
```

Aligné maintenant sur le pattern arithmetic :

```
│ (-x)/-1 < (3)/-1     ← -1 en bleu/gras dans un terminal
│ x > -3
```

**Mécanisme** :

- Nouveau export `formatTransformationCustom` dans `linear-renderer.ts` —
  utilise `toCustom` (ASCII-math) au lieu de `toLatex` et émet `@blue{…}` en
  guise de marqueur de couleur.
- Le script `scripts/pedagogical-inequality-demo.ts` post-traite : ANSI
  escape codes pour `@blue{…}` (TTY uniquement) + substitutions cosmétiques
  `*` → `×`, `<=` → `≤`, `>=` → `≥`, `!=` → `≠`, `:/` → `÷`.
- Flags `--custom` (défaut), `--latex`, `--both` — copient le pattern de
  `pedagogical-arithmetic-demo.ts`.

## Vérifications V1

| Étape                                       | Résultat                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tests inéquation (`linear-inequality.test`) | **22 pass / 0 fail**                                                                            |
| Tests pedagogical-solve (régression)        | **239 pass / 0 fail**                                                                           |
| Tests mathAST entier (régression)           | **12582 pass / 19 skip / 3 todo / 0 fail**                                                      |
| ESLint (fichiers nouveaux et modifiés)      | **0 erreur**                                                                                    |
| `pnpm check:incremental`                    | **0 nouvelle erreur** (les 9 erreurs existantes sont pré-existantes en `slides/demo`/`extern/`) |

## Vérifications V2 (renderer)

| Étape                                                    | Résultat                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Tests renderer V2 (`linear-renderer-inequality.test.ts`) | **23 pass / 0 fail**                                      |
| Régression renderer équation (`linear-renderer.test.ts`) | **13 pass / 0 fail**                                      |
| Régression pedagogical-solve total                       | **262 pass / 0 fail**                                     |
| Régression mathAST entier                                | **12605 pass / 19 skip / 3 todo / 0 fail** (+23 nouveaux) |
| ESLint                                                   | **0 erreur**                                              |
| `pnpm check:incremental`                                 | **0 nouvelle erreur**                                     |

## Vérifications après bug fix + Mode B

| Étape                                                          | Résultat                                      |
| -------------------------------------------------------------- | --------------------------------------------- |
| Tests renderer (5 régressions flip ajoutées)                   | **28 pass / 0 fail**                          |
| Tests pedagogical-solve total                                  | **267 pass / 0 fail**                         |
| Tests questions (`generated-steps-demo`, correction-generator) | **597 pass / 0 fail** (+2 fixtures snapshots) |
| ESLint (renderer + script CLI + correction-generator + page)   | **0 erreur**                                  |
| `pnpm check:incremental`                                       | **0 nouvelle erreur**                         |
| `mcp__svelte__svelte-autofixer` sur la page debug              | **0 issue**                                   |

## Comment tester

```bash
# 1. Tests automatisés
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/linear-inequality.test.ts
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/linear-renderer-inequality.test.ts
pnpm test:server src/lib/questions/__tests__/generated-steps-demo.test.ts

# 2. Démo CLI (pretty-print ANSI + opérateurs Unicode)
pnpm tsx scripts/pedagogical-inequality-demo.ts                    # tous, custom
pnpm tsx scripts/pedagogical-inequality-demo.ts -v flip            # cas avec flip + explanations
pnpm tsx scripts/pedagogical-inequality-demo.ts --latex            # LaTeX brut
pnpm tsx scripts/pedagogical-inequality-demo.ts --both             # custom + LaTeX

# 3. Page debug (rendu navigateur via MathLive)
pnpm dev -- --port 5175
# → http://localhost:5175/dashboard/admin/debug/correction-mode-b
```

## Documents produits

- `docs/wip/pedagogical-inequality-spec.md` — spec figée
- `docs/wip/pedagogical-inequality-progress.md` — ce document

## Upstream fix `sign/splitDomainAtZeros` aux excludedPoints (2026-05-06)

Le workaround `expandExcludedPoints` créé pour le palier 1 est **supprimé**.
`analyzeSign` partitionne maintenant nativement aux points exclus du domaine.

### Avant / Après

Avant le fix, `analyzeSign(1/x)` produisait un seul `signedInterval` `]−∞, +∞[`
avec `sign='unknown'` parce que `splitDomainAtZeros` itérait uniquement
`domain.intervals` et ignorait `excludedPoints`. Le wrapper `solveInequality`
compensait avec un helper privé `expandExcludedPoints` qui pré-éclatait les
intervalles avant l'appel à `analyzeSign`.

Après le fix : tous les consommateurs (`variations`, tableaux de signes,
`solveInequality`, futurs paliers) profitent de la partition native.

### Implémentation

- Nouveau type interne `PartitionPoint { value, approximate, isZero }`
  unifiant zéros et points exclus.
- Nouveau helper `splitIntervalAtPoints(int, zeros, excluded)` qui remplace
  l'ancien `splitIntervalAtZeros`. Logique identique, mais les points exclus
  ouvrent une lacune (open endpoints des deux côtés) **sans** émettre de
  sous-intervalle ponctuel `{p}`.
- Nouveau helper `mergeAndSortPartitionPoints(zeros, excluded)` — merge,
  tri par approximation, déduplication (un zéro qui coïncide avec un point
  exclu est traité comme exclu — l'expression est indéfinie là, pas
  identiquement nulle).
- `splitIntervalSetAtZeros` lit maintenant `domain.excludedPoints` (avec
  fallback `?? []` pour compat avec le `intervalSet` de
  `$lib/math/intervals/factory` qui ne porte pas le champ).
- `splitDomainAtZeros` route les branches universal / condition_domain /
  periodic_exclusion vers `splitIntervalAtPoints` avec `excluded[]` vide
  (uniformité).

### Tests

Nouveau fichier `__tests__/analyze-excluded-points.test.ts` (7 tests) :

- `1/x` → 2 intervalles `]−∞, 0[ negative` et `]0, +∞[ positive`
- `1/(x − 2)` → split à 2 (open endpoints)
- `1/(x(x − 1))` → 3 partitions à 0 et 1 (signes approximatifs documentés
  comme limitation upstream du sampling)
- `1/x − 1` → split à 0 ; le zéro à x=1 n'est pas détecté (limitation
  upstream `solve` transcendantal)
- 3 régressions : `x² − 4`, `ln(x)`, `x − 2` inchangés

### Suppression du workaround

`solve/inequality/index.ts` : suppression de `expandExcludedPoints`,
`splitIntervalAtExcluded`, et de l'import de `computeDomain`,
`endpointToNumber`, `interval`, `openEndpoint`, `intervalSet` (de
`intervals/factory`), `IntervalSet`, `Endpoint`, `Interval`. La fonction
`solveInequality` passe maintenant `options.domain` directement à
`analyzeSign`.

### Décisions issues du code review

1. **Tolérance de dedupe** colocée au top du fichier (`PARTITION_DEDUPE_TOLERANCE`),
   alignée sur `DEFAULT_SIGN_OPTIONS.tolerance` — évite la divergence avec la
   tolérance de `getUniqueZeros`.
2. **`isValidSplitPoint` redondant mais conservé** comme défense-en-profondeur
   contre une future divergence entre les filtres et la logique de split.
   Documenté en commentaire.

### Vérifications

| Étape                                              | Résultat                                   |
| -------------------------------------------------- | ------------------------------------------ |
| Tests sign (incl. excluded-points + trig-periodic) | **149 pass / 0 fail**                      |
| Régression mathAST entier                          | **12617 pass / 19 skip / 3 todo / 0 fail** |
| Régression questions (Mode B + correction-gen)     | **40 pass / 0 fail**                       |
| ESLint + `pnpm check:incremental`                  | **0 nouvelle erreur**                      |

## Suite

- **Palier 2b** : pédagogique quadratique numérique (Δ + tableau de signes + 6 sous-cas selon signe(a) × signe(Δ)). À spécifier avec une nouvelle Phase 0 TDD.
- **Upstream solve** : `solve(a·e^x + b = 0)` (pour réactiver le test 14
  skippé) et `solve(1/x − 1 = 0)` (pour mieux résoudre les rationnelles).
- **Upstream sign sampling** : `MAX_SAMPLE_BOUND = 1e6` provoque des
  faux 'zero' sur transcendantes — adapter au type d'expression.
- **Reste palier 2c/d** : paramétrique (V2, scope ouvert).
