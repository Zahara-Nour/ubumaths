# Lieu Geometrique (Locus) — Progress

## Decisions prises

- **Q1** : Erreur DSL si le tracer ne depend pas du driver
- **Q2** : 200 echantillons par defaut, pas de parametre DSL
- **Q3** : Stylable (couleur, style de trait)
- **Algorithme** : Sampling uniforme + raffinement adaptatif (profondeur max 3)
- **Rendu** : Catmull-Rom via pipeline existant (bezier.ts -> curveToSVGPath)
- **Recomputation** : Sous-graphe isole driver->tracer, pas de mutation de la figure

## Phases

| Phase | Description            | Status |
| ----- | ---------------------- | ------ |
| 0     | Specification TDD      | done   |
| 1     | Types GeoLocus         | done   |
| 2     | compute-locus.ts       | done   |
| 3     | Figure + DSL           | done   |
| 4     | Rendu SVG              | done   |
| 5     | Raffinement adaptatif  | done   |
| 6     | Tests (16 tests)       | done   |
| 7     | Page demo (6 exemples) | done   |
| 8     | Validation finale      | done   |

## Code review feedback applied

- Memory optimization: reuse single Map across all samples (no per-sample allocation)
- Hyperbola parameter range: viewport-based instead of hardcoded
- Removed unused imports/constants (ESLint clean)

## Fichiers modifies

- `src/lib/geometry-core/types/elements.ts` — GeoLocus type + isLocus guard
- `src/lib/geometry-core/types/index.ts` — exports
- `src/lib/geometry-core/graph/compute-locus.ts` (nouveau) — core algorithm
- `src/lib/geometry-core/graph/figure.ts` — createLocus(), computeLocusCurveForElement()
- `src/lib/geometry-core/dsl/builtins.ts` — lieu() builtin + dependency validation
- `src/lib/geometry-core/dsl/serializer.ts` — locus serialization
- `src/lib/geometry-core/dsl/symbol-table.ts` — 'lieu' symbol type
- `src/lib/geometry-core/rendering/svg-primitives.ts` — locusToSVG()
- `src/lib/components/geometry/GeometryCanvas.svelte` — locus rendering block
- `src/lib/geometry-core/dsl/__tests__/locus.test.ts` (nouveau) — 16 tests
- `src/routes/(public)/geometry-demo/lieu/+page.svelte` (nouveau) — 6 demos
- `src/routes/(public)/geometry-demo/+page.svelte` — link to lieu demo

## Tests: 1757 total (75 files), all passing
