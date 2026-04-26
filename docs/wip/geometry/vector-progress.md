# Vecteurs geometry-core — Progression

> Date: 2026-04-26

## Etat: Phase 1 complete

### Ce qui a ete fait

**Types** (`types/elements.ts`):

- `GeoVectorByPoints` — vecteur lie (startId, endId, dependsOn)
- `GeoFreeVector` — vecteur libre (dx, dy, anchorX, anchorY, dependsOn: [])
- `GeoVector` — union des deux
- Type guards: `isVectorByPoints`, `isFreeVector`, `isVector`
- `SymbolType`: ajout de `'vecteur'`

**Figure** (`graph/figure.ts`):

- `createVectorByPoints(startId, endId, options)` — comme createSegment
- `createFreeVector(dx, dy, anchor?, options)` — ancre a (0,0) par defaut
- `moveFreeVector(id, newAnchorX, newAnchorY)` — deplace l'ancrage, composantes preservees
- Undo/redo: support freeVector dans applyDelta

**Rendu SVG** (`rendering/svg-primitives.ts`):

- `VectorSVG` interface — extends LineSVG avec arrowPoints, shaftX2, shaftY2
- `vectorToSVG()` — gere vectorByPoints et freeVector
- Fleche: triangle plein, 10px, ±25 degres
- Shaft raccourci pour ne pas depasser dans la fleche

**Export** (`rendering/`):

- SVG: line + polygon (normal et rough.js)
- TikZ: `\draw[->, >=stealth]`
- Typst: `line(..., mark: (end: "stealth", fill: color))`

**DSL** (`dsl/`):

- Builtin `vecteur(A, B)` — vecteur lie
- Builtin `vecteur(3, 2)` — vecteur libre (detection automatique)
- `translation(P, vecteur=v)` — accepte un vecteur element en plus de `vecteur=(A,B)`
- Serialization round-trip pour les deux types

**Hit-testing** (`interaction/hit-testing.ts`):

- vectorByPoints et freeVector — meme logique que segment (distToSegment)

### Tests: 29 nouveaux, 1320 total (0 echecs)

- `graph/__tests__/figure-vector.test.ts` — 14 tests (creation, dependances, move, undo/redo)
- `dsl/__tests__/vector-dsl.test.ts` — 8 tests (DSL builtin, translation, round-trip)
- `rendering/__tests__/vector-svg.test.ts` — 7 tests (SVG, export)

### Fichiers modifies

| Fichier                     | Lignes ajoutees |
| --------------------------- | --------------- |
| types/elements.ts           | ~30             |
| dsl/symbol-table.ts         | 1               |
| graph/figure.ts             | ~55             |
| rendering/svg-primitives.ts | ~75             |
| rendering/export-svg.ts     | ~15             |
| rendering/export-tikz.ts    | ~12             |
| rendering/export-typst.ts   | ~12             |
| rendering/rough-geometry.ts | ~15             |
| dsl/builtins.ts             | ~45             |
| dsl/serializer.ts           | ~10             |
| interaction/hit-testing.ts  | ~15             |

### Phase 2 (futur): Operations vectorielles

- Somme de vecteurs (option A: via geoAdd/geoSub existants)
- Multiplication par scalaire
- Produit scalaire
- Norme
- Angle entre vecteurs
