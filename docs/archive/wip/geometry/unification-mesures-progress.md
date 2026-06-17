# Unification GeoMeasure → GeoScalar + GeoText

## Statut : COMPLETE

## Resume

Fusion du type GeoMeasure (affichage + calcul) en deux types distincts :

- **GeoScalar** (existant, enrichi) : valeur reactive pour les calculs
- **GeoText** (nouveau) : element d'affichage reactif avec interpolation de templates

## Decisions prises

1. **Templates inline** : `{d*2:.2f}` supporte des expressions simples
2. **Positionnement** : 3 modes — libre (x,y), ancrage point, auto-positionne
3. **mesure()** : sucre syntaxique → cree scalar + texte auto-positionne
4. **Pas de retro-compatibilite** : GeoMeasure supprime directement

## Fichiers modifies

### Types

- `types/elements.ts` : GeoMeasure→GeoText, isMeasure→isText
- `types/schemas.ts` : measureSchema→textSchema
- `types/index.ts` : exports mis a jour

### Core

- `graph/figure.ts` : createMeasure/getMeasureValue supprimes, createScalarArea/createText/resolveTemplate ajoutes
- `graph/compute-position.ts` : computeMeasureValue supprime (~45 lignes)

### DSL

- `dsl/builtins.ts` : mesure() reecrit, texte() et aire() ajoutes
- `dsl/interpreter.ts` : isScalarValue nettoye
- `dsl/serializer.ts` : serialisation GeoText + skip des scalars internes
- `dsl/symbol-table.ts` : 'measure'→'text'

### Rendering

- `rendering/svg-primitives.ts` : measureToSVG→textToSVG
- `rendering/export-svg.ts` : pass 6 mis a jour
- `rendering/export-typst.ts` : pass 6 mis a jour
- `rendering/export-tikz.ts` : pass 6 mis a jour
- `rendering/rough-geometry.ts` : 'measure'→'text'
- `rendering/index.ts` : exports mis a jour
- `components/geometry/GeometryCanvas.svelte` : rendu mis a jour

### Tests

- `figure-measure.test.ts` supprime
- `figure-text.test.ts` cree (27 tests)
- `rendering/__tests__/test-helpers.ts` cree
- ~10 fichiers de tests mis a jour

## Resultats

- 1900 tests verts (79 fichiers)
- 0 references residuelles a GeoMeasure
- pnpm check:incremental OK
