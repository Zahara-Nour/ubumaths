# MathAST Flatten Helpers - Progress

## Objectif

Ajouter des helpers de flattening pour additions/soustractions et multiplications.

## Décisions

- Délimiteurs intangibles (frontières)
- Shallow : enfants directs uniquement
- Deep : Shallow + Map des sous-listes
- Associativité gauche pour unflatten
- Option A améliorée (pas de nouveaux types de noeuds)

## Current Phase

**Phase 1** : Types et helpers shallow

## Progress Log

### Phase 1 - COMPLETED

- Files: `src/lib/mathAST/flatten.ts`
- Created: Types (Sign, SignedTerm, FlatSum, FlatProduct, DeepFlatSumResult, DeepFlatProductResult)
- Created: flipSign(), flattenSumShallow(), flattenProductShallow()

### Phase 2 - IN PROGRESS

- Files: `src/lib/mathAST/flatten.ts`
- Adding: flattenSumDeep(), flattenProductDeep()
