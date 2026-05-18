# DSL Refactor : Single-Object Returns + Accessors + Visibility Verbs

> Session : 2026-05-18
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : EN COURS

## Contexte

Refonte du DSL geometry-core pour éliminer les retours tuples des macros stdlib, au profit d'un design **un builtin = un objet principal + accesseurs explicites pour les sous-parties**. Les tuples restent acceptés quand le résultat est **intrinsèquement pluriel** (n sommets d'un polygone, 2 extrémités d'un segment).

Voir le plan complet pour les détails de conception.

## Commits planifiés (7)

| #   | Commit                                                                                   | Statut |
| --- | ---------------------------------------------------------------------------------------- | ------ |
| 1   | `feat(dsl): accessors centre/extremite/extremites/milieu(s)/sommet/sommets`              | ⏳     |
| 2   | `feat(dsl): montre + masque + visible support in style`                                  | ⏳     |
| 3   | `feat(dsl): point(A, longueur=...) + segment(A, longueur=...)`                           | ⏳     |
| 4   | `refactor(stdlib): cercle_circonscrit/inscrit/euler → return cercle` (BREAKING)          | ⏳     |
| 5   | `refactor(stdlib): rectangle/carre/losange/parallelogramme → return polygone` (BREAKING) | ⏳     |
| 6   | `refactor(stdlib): mediatrice → droite, triangle_* → polygone` (BREAKING)                | ⏳     |
| 7   | `docs: full refresh post-refactor`                                                       | ⏳     |

## Phase courante

Démarrage — commit 1 en préparation.
