# Extended Metadata - Progression

## Etat actuel

- [x] Bloc 1 : Types + Factories (commit: def388d3)
- [x] Bloc 2 : LaTeX Generator (commit: f949ab31)
- [x] Bloc 3 : Guards + Transforms (commit: fae979c1)
- [x] Bloc 4 : Tests (commit: bf7de1ad)
- [ ] Bloc 5 : Documentation + Finalisation

## Derniere action

Bloc 4 termine - 129 tests ajoutes (tous passent)

## Prochaine etape

Bloc 5 : Mettre a jour docs/ref/mathAST.md et quality checks

## Fichiers modifies

- src/lib/mathAST/types.ts
- src/lib/mathAST/factory.ts
- src/lib/mathAST/transforms.ts
- src/lib/mathAST/latex-generator.ts
- src/lib/mathAST/guards.ts
- src/lib/mathAST/index.ts
- src/lib/mathAST/**tests**/extended-metadata.test.ts

## Decisions prises

- Retrocompatibilite via union type `BinaryOpOptions | NodeMetadata`
- Coalescence sur couleur uniquement
- Helpers de normalisation pour chaque type d'options
- Transforms preservent toutes les metadonnees etendues
- Type guards pour tous les types de metadonnees etendues
- Transform helpers avec merge de metadonnees existantes
