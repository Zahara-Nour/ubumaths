# Courbes quadratiques (coniques) — Progress

## Status: Phase 5/5 complete

## Ce qui a ete fait

### Phase 1 : extractQuadraticCombination (mathAST/analysis)

- **Fichier** : `src/lib/mathAST/analysis/quadratic-combination.ts`
- Extrait les 6 coefficients (A, B, C, D, E, F) d'un polynome de degre <= 2 en deux variables
- Pattern identique a `extractAffineCombination` : flattenSumShallow + extraction des monomes
- Gere : x^2, xy, x\*y, x^2/4, coefficients symboliques compiles en nombres
- **Tests** : 23 tests dans `analysis/__tests__/quadratic-combination.test.ts`
- Exporte via `analysis/index.ts`

### Phase 2 : GeoQuadraticCurve + classification conique

- **Type** : `GeoQuadraticCurve` dans `types/elements.ts`
  - Stocke : expression MathNode, equation string, 6 coefficients numeriques, ConicParams
- **Classification** : `geometry/conic-classify.ts`
  - Discriminant B^2 - 4AC pour type (ellipse/hyperbole/parabole)
  - Det 3x3 pour degenerescence
  - Rotation + translation pour parametres geometriques (centre, semi-axes, rotation)
- **Figure** : `createQuadraticCurve()` dans `graph/figure.ts`
- **Tests** : 13 tests dans `geometry/__tests__/conic-classify.test.ts`

### Phase 3 : Integration dans courbe() builtin

- **Fichier** : `dsl/builtins.ts`, fonction `createCurveFromEquation`
- Try 3 apres droite et y=f(x) : `extractQuadraticCombination` → compile coefficients → `classifyConic` → `createQuadraticCurve`
- Les paths existants (droite, y=f(x)) sont preserves sans regression
- **Tests** : 8 nouveaux tests dans `dsl/__tests__/interpreter-courbe.test.ts`

### Phase 4 : Rendu parametrique SVG

- **Fichier** : `rendering/svg-primitives.ts`, fonction `quadraticCurveToSVG`
- Cercle/ellipse : echantillonnage parametrique cos/sin sur [0, 2pi]
- Hyperbole : deux branches cosh/sinh
- Parabole : parametrisation t^2/(4p)
- **Canvas** : bloc `{:else if el.type === 'quadraticCurve'}` dans `GeometryCanvas.svelte`
- **Demo** : section coniques dans `/geometry-demo`

## Fichiers modifies/crees

| Fichier                                                            | Action                              |
| ------------------------------------------------------------------ | ----------------------------------- |
| `src/lib/mathAST/analysis/quadratic-combination.ts`                | Cree                                |
| `src/lib/mathAST/analysis/__tests__/quadratic-combination.test.ts` | Cree                                |
| `src/lib/mathAST/analysis/index.ts`                                | Modifie (export)                    |
| `src/lib/geometry-core/geometry/conic-classify.ts`                 | Cree                                |
| `src/lib/geometry-core/geometry/__tests__/conic-classify.test.ts`  | Cree                                |
| `src/lib/geometry-core/types/elements.ts`                          | Modifie (GeoQuadraticCurve + union) |
| `src/lib/geometry-core/graph/figure.ts`                            | Modifie (createQuadraticCurve)      |
| `src/lib/geometry-core/dsl/builtins.ts`                            | Modifie (try 3 quadratic)           |
| `src/lib/geometry-core/dsl/__tests__/interpreter-courbe.test.ts`   | Modifie (tests coniques)            |
| `src/lib/geometry-core/rendering/svg-primitives.ts`                | Modifie (quadraticCurveToSVG)       |
| `src/lib/components/geometry/GeometryCanvas.svelte`                | Modifie (rendu bloc)                |
| `src/routes/(public)/geometry-demo/+page.svelte`                   | Modifie (section demo)              |
| `docs/ref/parser-known-issues.md`                                  | Cree (incoh. moins unaire)          |

## Tests : 1295 passes (1272 geometry-core + 23 quadratic-combination)

## Decisions techniques

- **Option B choisie** : rendu parametrique (pas marching squares) — plus precis pour les coniques
- Classification via rotation + translation pour eliminer les termes xy et lineaires
- Convention a >= b pour les semi-axes (rotation ajustee si necessaire)
- Les coefficients MathNode sont compiles en nombres via `compile()` pour la classification
- Les paraboles type y=x^2 sont toujours gerees par le path y=f(x) existant (priorite try 2)

## Limitations connues

- Pas de support pour les courbes implicites de degre > 2
- Les coniques degenerees (point isole, droites croisees) ne sont pas rendues
- Pas de rendu rough.js pour les coniques (uniquement normal)
- Le label est positionne au centre/vertex, pas de placement intelligent le long de la courbe
