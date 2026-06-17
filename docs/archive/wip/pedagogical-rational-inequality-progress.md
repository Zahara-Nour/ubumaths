# Palier 3 — Pedagogical Rational Inequality Stepper — Progress

## Status: V1 COMPLETE — 2026-05-06 ; V1.1 polish — 2026-05-06 ; V2 multi-fractions — 2026-05-06

Follow-up of palier 2c (`d010fb263`). Adds the pedagogical step-by-step
resolution for rational inequalities `P(x)/Q(x) ⊻ 0` according to the standard
French lycée curriculum method (domain restriction + 4-row sign table).

## Phases

| #   | Phase                                                                                                                                                                                           | Status                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0   | Spec doc figée — 14 comportements                                                                                                                                                               | ✅ `docs/wip/pedagogical-rational-inequality-spec.md` |
| 0.5 | Canon round-trip experiment (throwaway)                                                                                                                                                         | ✅ Confirmed `tryExtractRationalForm` strategy        |
| 1   | Failing TDD tests (~22 tests)                                                                                                                                                                   | ✅                                                    |
| 2   | `types.ts` : 5 new op kinds + `RationalInequalityStepsOptions` + `STRATEGIES_RATIONAL`                                                                                                          | ✅                                                    |
| 3   | Helpers : exposed `collectDenominators` from `solve/rational.ts` ; in-file `tryExtractRationalForm`, `findPolynomialZeros`, `extractLeadingCoefficient`, `rejectIfParametric`                   | ✅                                                    |
| 4   | Implem `rational-inequality.ts` (~430 LOC)                                                                                                                                                      | ✅                                                    |
| 5   | Renderer : 5 new TITLES + EXPLANATIONS, `formatRationalSignTable` (4-row sign table) + 4 other formatters                                                                                       | ✅                                                    |
| 6   | Dispatcher `index.ts` : route to rational pipeline when `degree === null` AND `collectDenominators` non-empty                                                                                   | ✅                                                    |
| 7   | Mode B integration : `rational-inequality` discriminator + Zod loose+strict + dispatch case + 2 fixtures + 2 snapshot tests + 2 `<GeneratedStepsCorrection>` cards + 4 `<CorrectionCard>` cards | ✅                                                    |
| 8   | CLI demo `pedagogical-rational-inequality-demo.ts` with 6 categories                                                                                                                            | ✅                                                    |
| 9   | Code review (`code-reviewer` agent, Opus) — 5 important fixes applied                                                                                                                           | ✅                                                    |
| 10  | Final regression + doc + commit                                                                                                                                                                 | ✅                                                    |

## Pipeline (lycée standard, 6 steps)

```
identify-equation              ─ « Inéquation rationnelle »
identify-rational              ─ « P(x) = …, Q(x) = … »
rational-domain-restriction    ─ « D = ℝ \ {z₁, …} »
rational-locate-roots          ─ « Racines de P : … ; zéros de Q : … »
rational-sign-table            ─ tableau combiné 4 lignes (x, P, Q, P/Q)
inequality-conclude-rational   ─ « S = … »
```

## 5 nouvelles op kinds

```ts
| { kind: 'identify-rational'; numerator; denominator }
| { kind: 'rational-domain-restriction'; excluded; variable }
| { kind: 'rational-locate-roots'; numeratorRoots; denominatorZeros }
| { kind: 'rational-sign-table';
    numerator; denominator;
    numeratorRoots; denominatorZeros;
    leadingCoefP; leadingCoefQ;
    degP; degQ; variable }
| { kind: 'inequality-conclude-rational'; relation; solutionDescription }
```

Plus `equationType: 'rational'` ajouté à `identify-equation`.

## 4-row sign table (renderer)

```
x        | -∞  ... 1  ... 3  ... +∞ |
P(x)     |     -   0  +       +     |
Q(x)     |     -      -   0   +     |
P(x)/Q(x)|     +   0  -   ||  +     |
```

Le renderer fusionne les points critiques (racines ∪ zéros), trie par
valeur numérique, calcule les signes via `(-1)^degree × leadSign` puis
walks left-to-right en flippant à chaque racine. Insère `||` aux zéros
de Q dans la dernière ligne.

## Code review fixes (5)

1. **Sign-at-−∞ formula bug** — utilisait `numeratorRoots.length` comme proxy
   de degré, faux pour racines doubles. Fix : passer le degré réel via
   `degP`/`degQ` dans le payload op.
2. **Guard double-roots** — si `degP === 2 && numeratorRoots.length === 1`
   (cas Δ=0), throw `InequalityNotSolvable` (V1 ne supporte pas la multiplicité).
3. **Test #16** ajoute le cas double-root pour locker le comportement.
4. **Test #15** ajoute le cas dégénéré `(x²-1)/(x-1)` qui canonise en polynôme.
5. **Cleanup** : suppression des imports `void` inutiles (`number`, `opposite`,
   `collectDenominators`) ; `bumpForRational` factorisé en alias de
   `bumpForQuadratic`.

## Test results

- `pedagogical-solve` : **331 → 353 tests** (+22 = 16 spec + 6 structurels)
- `mathAST` total : **12729 passing | 18 skipped | 3 todo** (no regression vs 12707 baseline)
- Mode B snapshots : **14 / 14** (12 → 14, +2 fixtures rational)
- ESLint + check:incremental : **0 nouvelle erreur**
- `mcp__svelte__svelte-autofixer` sur la page debug : **0 issue**

## Files changed

| File                                                                          | Type | Notes                                                           |
| ----------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| `src/lib/mathAST/pedagogical-solve/rational-inequality.ts`                    | NEW  | ~430 LOC pipeline                                               |
| `src/lib/mathAST/pedagogical-solve/__tests__/rational-inequality.test.ts`     | NEW  | 22 tests                                                        |
| `src/lib/mathAST/pedagogical-solve/types.ts`                                  | MOD  | +5 op kinds + types + STRATEGIES_RATIONAL                       |
| `src/lib/mathAST/pedagogical-solve/quadratic-renderer.ts`                     | MOD  | +TITLES/EXPLANATIONS + 5 formatters + `formatRationalSignTable` |
| `src/lib/mathAST/pedagogical-solve/quadratic-inequality.ts`                   | MOD  | +export `_describeDomain`                                       |
| `src/lib/mathAST/pedagogical-solve/index.ts`                                  | MOD  | dispatcher routes to rational pipeline + re-exports             |
| `src/lib/mathAST/solve/rational.ts`                                           | MOD  | exported `collectDenominators`                                  |
| `src/lib/questions/types.ts`                                                  | MOD  | +`rational-inequality` discriminator                            |
| `src/lib/questions/template-schema.ts`                                        | MOD  | +loose + strict Zod schemas                                     |
| `src/lib/questions/generator/correction-generator.ts`                         | MOD  | +`renderRationalInequality` dispatch                            |
| `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`                | MOD  | +2 fixtures                                                     |
| `src/lib/questions/__tests__/generated-steps-demo.test.ts`                    | MOD  | +2 snapshot tests                                               |
| `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` | MOD  | +2 GeneratedStepsCorrection cards + 4 CorrectionCards           |
| `scripts/pedagogical-rational-inequality-demo.ts`                             | NEW  | ~200 LOC CLI                                                    |
| `docs/wip/pedagogical-rational-inequality-spec.md`                            | NEW  | spec doc                                                        |
| `docs/wip/pedagogical-rational-inequality-progress.md`                        | NEW  | this doc                                                        |

## Verification

```bash
# Tests TDD
pnpm test:server src/lib/mathAST/pedagogical-solve/__tests__/rational-inequality.test.ts  # 22/22

# Régression complète
pnpm test:server src/lib/mathAST/pedagogical-solve   # 353/353
pnpm test:server src/lib/mathAST                     # 12729 passing
pnpm test:server src/lib/questions/__tests__/generated-steps-demo.test.ts  # 14/14

# CLI visual
pnpm tsx scripts/pedagogical-rational-inequality-demo.ts simple        # cas standard
pnpm tsx scripts/pedagogical-rational-inequality-demo.ts -v quad-num   # avec explanations
pnpm tsx scripts/pedagogical-rational-inequality-demo.ts --latex       # LaTeX brut

# Page debug (rendu navigateur via MathLive)
pnpm dev -- --port 5175
# → http://localhost:5175/dashboard/admin/debug/correction-mode-b

# Quality
npx eslint <files…>                  # 0 errors
pnpm check:incremental               # 0 new errors
```

## V1.1 polish — livré 2026-05-06

**D — Degenerate canon retry to polynomial (test only, not a bug)** :
le dispatcher `generateInequalitySteps` route déjà correctement
`(x²-1)/(x-1) < 0` (canon → `x+1`, degré 1 → linear pipeline) et
`(x³-1)/(x-1) < 0` (canon → `x²+x+1`, degré 2 → quadratic pipeline).
Le throw dans `generateRationalInequalitySteps` (appel direct) reste
correct comme contrat. Message d'erreur clarifié pour pointer vers le
dispatcher. **+2 tests dispatcher**.

**E — `_describeDomain` promu dans `_helpers.ts`** : `describeDomain` +
helpers privés (`isInfinite`, `latexBound`, `formatInterval`) déplacés
dans `_helpers.ts` comme export public. Les pipelines quadratique et
rationnel partagent maintenant l'implémentation. Nettoyage : suppression
de l'export `_describeDomain` de `quadratic-inequality.ts`, suppression
des imports `Domain`/`IntervalSet`/`toLatex` devenus inutiles.

**B — Racines doubles supportées dans le tableau de signes** : ajout des
champs `numeratorMultiplicities` et `denominatorMultiplicities` dans
l'op `rational-sign-table`. Le pipeline calcule la multiplicité depuis le
shortfall `degree − rootsCount` (V1.1 supporte deg ≤ 2 → mult 1 ou 2).
Le renderer ne flippe le signe qu'aux racines de multiplicité **impaire**
(une racine double est une tangente, le polynôme ne change pas de signe).
Test #16 mis à jour : `(x²-2x+1)/(x-3) < 0` → solution `]−∞ ; 1[ ∪ ]1 ; 3[`.

**F+G — Garde défensif** : `formatRationalSignTable` retourne désormais
un sentinel `\text{tableau de signes (N valeurs symboliques non
évaluables, hors V1)}` si `computeNumericValue` échoue sur une racine
(cas paramétrique slipped past upstream guards).

### Test results V1.1

- `pedagogical-solve` : **353 → 355** (+2 tests dispatcher)
- `mathAST` : **12731 passing** (+2 vs 12729 baseline)
- Mode B snapshots : **14/14** inchangés

## V2 — Multi-fractions livré 2026-05-06

**Spec** : `docs/wip/pedagogical-rational-inequality-v2-spec.md` (7 V2
comportements + 4 OUT V3+).

**Étape pédagogique nouvelle** : `combine-fractions` — emise AVANT
`identify-rational` quand l'input n'est pas déjà une fraction unique
(multi-fraction OU fraction sur côté droit OU polynôme + fraction).

Le renderer formate un bloc `\begin{aligned}` 3 lignes :

```
1/x + 1/(x-1)
= (x-1)/(x²-x) + x/(x²-x)
= (2x-1)/(x²-x)
```

**Helpers** : `collectFractionTerms(node, variable)` walks la structure
top-level sum/diff et classifie chaque terme (fraction vs polynomial).
`combineFractions(terms)` calcule le dénominateur commun (produit des
dénominateurs distincts, V2 cap à 2) + les numérateurs ajustés (numerator ×
missing factor) + le numérateur combiné (somme signée canonisée).

**Cap V2** : au plus 2 dénominateurs distincts coprimes (pas de PGCD
polynomial). 3+ fractions ou dénominateurs en commun → throw V3 hors scope.

**Bug palier 1 surfacé + corrigé** : `determineProductSign` dans
`sign/helpers/interval-sign.ts` recursait à l'infini sur `opposite(N)`
(ex: `-1/x > 0` stack-overflow). Cause : le `factors.map(determineSignOnInterval)`
s'exécutait AVANT le check `length === 1 && isOpposite`, recursant
infiniment. Fix : check spécial AVANT le map.

**Code review fixes** (3 minor) :

1. Guard `× 1` quand `missingFactor === 1` (cas même dénominateur).
2. Renderer LaTeX : suppression de l'espace de tête quand sign est vide.
3. Type annotation `NonNullable<>` au lieu de `& object`.

**Tests V2** : 7 nouveaux + V1 régression. Pedagogical-solve 355 → 361.
mathAST 12737 (+6 vs 12731). +1 fixture Mode B (`rationalInequalityMultiFracDemo`)

- 1 snapshot test (Mode B 14 → 15).

## Quality debt restante (V3+)

- **Fraction sur le côté droit** (`x < 1/(x-3)`) : V1.1 rejette toujours via
  le check `unwrap(left).type === 'division'`. V2 pourrait swap les côtés
  ou standardize avant détection.
- **Multi-fraction** (`1/x + 1/(x-1) < 0`) : V1.1 rejette. V2 pourrait
  ajouter une étape pédagogique « réduction au même dénominateur ».
- **Coincident root + denominator zero** : V1.1 a le merge path testé en
  unit test mais pas via un cas end-to-end. Edge case improbable post-canon.

## Next paliers

- **2d** — coefficients paramétriques (`mx² + nx + p ⊻ 0`, m libre)
- **V2** — étape « réduction au même dénominateur » pour multi-fractions
- **V2** — fraction sur le côté droit, swap automatique
