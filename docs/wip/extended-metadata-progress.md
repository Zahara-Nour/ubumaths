# Extended Metadata - Progression

## Etat actuel

- [x] Bloc 1 : Types + Factories (commit: def388d3)
- [x] Bloc 2 : LaTeX Generator (commit: f949ab31)
- [ ] Bloc 3 : Guards + Transforms
- [ ] Bloc 4 : Tests
- [ ] Bloc 5 : Documentation

## Derniere action

Bloc 2 termine - LaTeX Generator avec coalescence

## Prochaine etape

Bloc 3.1 : Ajouter type guards pour metadonnees etendues

## Fichiers modifies

- src/lib/mathAST/types.ts
- src/lib/mathAST/factory.ts
- src/lib/mathAST/transforms.ts
- src/lib/mathAST/**tests**/factory.test.ts

## Decisions prises

- Retrocompatibilite via union type `BinaryOpOptions | NodeMetadata`
- Coalescence sur couleur uniquement
- Helpers de normalisation pour chaque type d'options
- Transforms preservent toutes les metadonnees etendues
