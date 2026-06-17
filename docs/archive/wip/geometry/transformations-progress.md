# Objets Transformation Reutilisables — Progress

## Statut : COMPLETE (8/8 phases)

## Tests : 1496 (1426 pre-existants + 70 nouveaux), 0 regression

## Fichiers modifies

- `src/lib/geometry-core/types/elements.ts` — 6 nouveaux types (GeoRotation, GeoReflection, GeoReflectionOverLine, GeoTranslation, GeoHomothety, GeoComposition) + type guards
- `src/lib/geometry-core/dsl/symbol-table.ts` — ajout SymbolType 'transformation'
- `src/lib/geometry-core/graph/figure.ts` — 8 factories (createRotation, createReflection, createReflectionOverLine, createTranslation, createTranslationByVector, createHomothety, createComposition) + transformeOrigins side-map + visible option sur 6 factories existantes
- `src/lib/geometry-core/dsl/builtins.ts` — 0-arg/1+-arg dispatch + transforme() + compose() + resolveAxeArg helper
- `src/lib/geometry-core/dsl/serializer.ts` — serialisation transformation objects + transforme() via origin map + composition
- `src/lib/geometry-core/dsl/transform-apply.ts` — NOUVEAU : applyTransformationToPoint, applyTransformationToElement, transformVectorLinear

## Fichiers de test crees

- `dsl/__tests__/transformation-objects.test.ts` (17 tests)
- `dsl/__tests__/transforme-points.test.ts` (11 tests)
- `dsl/__tests__/transform-direct.test.ts` (6 tests)
- `dsl/__tests__/transforme-lines.test.ts` (12 tests)
- `dsl/__tests__/transforme-circles.test.ts` (10 tests)
- `dsl/__tests__/transforme-polygons.test.ts` (4 tests)
- `dsl/__tests__/transforme-vectors.test.ts` (7 tests)
- `dsl/__tests__/compose.test.ts` (8 tests)
- `dsl/__tests__/serialize-transformations.test.ts` (12 tests)

## Syntaxe DSL implementee

```python
# Creation d'objets transformation (0 arg positionnel)
r = rotation(angle=40, centre=O)
s = symetrie(centre=O)
s2 = symetrie(axe=(A, B))
s3 = symetrie(axe=d)  # d est une droite
t = translation(vecteur=(A, B))
t2 = translation(vecteur=v)
h = homothetie(rapport=2, centre=O)

# Composition
f = compose(r, t)

# Application via transforme()
B = transforme(r, A)         # point
s2 = transforme(r, segment)  # segment
d2 = transforme(r, droite)   # droite
r2 = transforme(r, ray)      # demi-droite
c2 = transforme(r, cercle)   # cercle
a2 = transforme(r, arc)      # arc
p2 = transforme(r, poly)     # polygone (via API Figure)
v2 = transforme(r, vecteur)  # vecteur (lie ou libre)

# Application directe (syntaxe etendue)
s2 = rotation(segment, centre=O, angle=90)
d2 = symetrie(droite, centre=O)
```

## Decisions techniques cles

- Les objets transformation sont des GeoElement invisibles dans le dependency graph
- transforme() reutilise les types de points existants (GeoRotatedPoint, etc.)
- Les points images intermediaires (pour segments, cercles, etc.) sont invisible
- La composition chaine les transformations (pas de precalcul)
- Le serializer reconstruit la forme d'origine via un side-map dans Figure
