# Migration stdlib → builtins : Progression

> Session : 2026-05-19
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : EN COURS

## Contexte

Conversion des 23 macros de `dsl/stdlib.ts` en builtins TypeScript dans `dsl/builtins.ts`. Chaque builtin produit 1 objet principal ; les sous-produits (points intermédiaires) sont créés directement invisibles (`{ visible: false }`).

Mécanisme `macro foo(...):` du DSL conservé, désormais réservé aux utilisateurs qui veulent enregistrer leurs propres constructions (paradigme Cabri/CarMetal/GeoGebra Custom Tools).

## Commits planifiés (6)

| #   | Commit                                                                                        | Statut      |
| --- | --------------------------------------------------------------------------------------------- | ----------- |
| 1   | `feat(geometry-core/dsl): migrate 5 line/segment macros to builtins`                          | ⏳ EN COURS |
| 2   | `feat(geometry-core/dsl): migrate 4 triangle macros to builtins`                              | ⏳          |
| 3   | `feat(geometry-core/dsl): migrate 4 quadrilateral macros to builtins`                         | ⏳          |
| 4   | `feat(geometry-core/dsl)!: migrate iterative polygone_regulier/etoile to builtins (BREAKING)` | ⏳          |
| 5   | `feat(geometry-core/dsl): migrate 4 derived-circle macros + corde to builtins`                | ⏳          |
| 6   | `feat(geometry-core/dsl): migrate 4 remarkable points + cleanup stdlib + docs`                | ⏳          |

## Phase courante

Démarrage — commit 1 en préparation.
