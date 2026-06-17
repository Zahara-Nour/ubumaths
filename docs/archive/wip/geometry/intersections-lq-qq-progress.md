# Intersections LQ/QQ — Progression

## Statut : COMPLETE

Date : 2026-04-27

## Fichiers modifies

| Fichier                                                                | Action                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/lib/geometry-core/geometry/intersections.ts`                      | +`intersectLQ`, +`intersectQQ`, +helpers (solveCubic, factorDegenerateConic, deduplicatePoints) |
| `src/lib/geometry-core/geometry/__tests__/intersections-conic.test.ts` | Nouveau : 18 tests geometrie pure                                                               |
| `src/lib/geometry-core/types/elements.ts`                              | +`GeoIntersectionLQ`, +`GeoIntersectionQQ`, unions, guards                                      |
| `src/lib/geometry-core/types/schemas.ts`                               | +`intersectionLQSchema`, +`intersectionQQSchema`                                                |
| `src/lib/geometry-core/graph/figure.ts`                                | +`createIntersectionLQ`, +`createIntersectionQQ`                                                |
| `src/lib/geometry-core/graph/compute-position.ts`                      | +`getConicCoefficients`, +`computeIntersectionLQPos`, +`computeIntersectionQQPos`               |
| `src/lib/geometry-core/dsl/builtins.ts`                                | Dispatch etendu (LQ, QL, QQ, CQ, QC), index 1-4 pour QQ                                         |
| `src/lib/geometry-core/dsl/serializer.ts`                              | +2 cases serialisation, +2 typePrefix                                                           |
| `src/lib/geometry-core/dsl/__tests__/intersection-lq-qq.test.ts`       | Nouveau : 14 tests DSL integration                                                              |
| `src/routes/(public)/geometry-demo/+page.svelte`                       | +2 sections demo (LQ, QQ)                                                                       |

## Decisions prises

1. **Arithmetique LQ** : `number` (pas GeoValue) car coefficients coniques deja numeriques
2. **Algorithme QQ** : Pencil de coniques — trouve lambda degenerant C1+lambda\*C2, factorise en 2 droites, intersecte avec C1 via `intersectLQ`
3. **Cercle+conique** : `createIntersectionQQ` accepte cercles, `getConicCoefficients()` convertit cercle en [1, 0, 1, -2cx, -2cy, cx^2+cy^2-r^2]
4. **Detection conique DSL** : `figure.getElementById()` + check `el.type === 'quadraticCurve'` (car symbolType 'courbe' couvre aussi GeoFunction)
5. **Index** : LQ 0|1 (DSL 1-2), QQ 0|1|2|3 (DSL 1-4)

## Corrections de robustesse (code review)

- `solveCubic` : tolerance relative sur discriminant (pas absolue 1e-10)
- `solveCubic` : clamp pour `Math.acos` + guard `Math.sqrt`
- `factorDegenerateConic` Case 3 (A=C=0, B!=0) : verification du residu F-ED/B
- `factorViaQuadraticInX/Y` : verification beta^2 ≈ discC

## Tests

- 1646 tests geometry-core passent (71 fichiers)
- 26 tests geometrie pure (intersections-conic.test.ts) incluant edge cases :
  - Off-center ellipse, tilted conics (B != 0), large coordinates (radius 1000)
  - Degenerate conic (pair of lines), identical conics, conic containment
  - Large-scale conics (radius 500)
- 21 tests DSL integration (intersection-lq-qq.test.ts) incluant :
  - Hyperbole, parabole, segment-conique
  - Rotated conics (B != 0), exterior line (null positions)
  - Disjoint conics, hyperbola+circle
  - Swap auto, default index, index errors, serialisation roundtrip, reactivite
- 0 regressions

## Demos (5 sections ajoutees)

1. Droite-ellipse (LQ) — draggable
2. Droite-hyperbole (LQ) — 2 branches
3. Droite-parabole (LQ) — secante/tangente
4. Cercle-ellipse (QQ) — 4 points, centre draggable
5. Ellipse-ellipse (QQ) — 4 points symetriques

## Qualite

- ESLint : 0 erreurs sur fichiers modifies
- TypeScript + Svelte check : 0 nouvelles erreurs (9 pre-existantes)
- Svelte autofixer : 0 problemes
- Code review final : LGTM (asymetrie mineure LQ/QQ validation documentee, pas de bug expose)
