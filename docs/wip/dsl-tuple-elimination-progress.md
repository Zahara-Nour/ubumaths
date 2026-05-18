# DSL Refactor : Single-Object Returns + Accessors + Visibility Verbs

> Session : 2026-05-18
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : EN COURS

## Contexte

Refonte du DSL geometry-core pour éliminer les retours tuples des macros stdlib, au profit d'un design **un builtin = un objet principal + accesseurs explicites pour les sous-parties**. Les tuples restent acceptés quand le résultat est **intrinsèquement pluriel** (n sommets d'un polygone, 2 extrémités d'un segment).

Voir le plan complet pour les détails de conception.

## Commits planifiés (7)

| #   | Commit                                                                                   | Statut       |
| --- | ---------------------------------------------------------------------------------------- | ------------ |
| 1   | `feat(dsl): accessors centre/extremite/extremites/milieu(s)/sommet/sommets`              | ✅ c8f0f3693 |
| 2   | `feat(dsl): montre + masque + visible support in style`                                  | ✅ EN COURS  |
| 3   | `feat(dsl): point(A, longueur=...) + segment(A, longueur=...)`                           | ⏳           |
| 4   | `refactor(stdlib): cercle_circonscrit/inscrit/euler → return cercle` (BREAKING)          | ⏳           |
| 5   | `refactor(stdlib): rectangle/carre/losange/parallelogramme → return polygone` (BREAKING) | ⏳           |
| 6   | `refactor(stdlib): mediatrice → droite, triangle_* → polygone` (BREAKING)                | ⏳           |
| 7   | `docs: full refresh post-refactor`                                                       | ⏳           |

## Phase courante

Commit 2 livré. Reste : commits 3-7. Tests : 1768/1768 (1617 DSL + 120 v2 + 21 accessors + 10 visibility).

## Notes implémentation

### Commit 1 — Accessors (c8f0f3693)

- `getSegmentLikeEndpoints` helper interne : GeoSegment a `startId/endId`, GeoRay a `originId/throughId`. Helper unifie les deux.
- `centre()` sur quadrilatère utilise 2 droites cachées + intersection LL classique (au lieu d'un nouveau type d'élément). Pollue un peu la figure mais zéro changement de schéma.
- `centre()` sur `circleBy3Points` (le 3-point form) throw avec hint vers `cercle_circonscrit` — la migration commit 4 utilisera `cercle(O, passant=A)` qui a un centerId direct.

### Commit 2 — Visibility verbs

- `applyInlineStyle` étendu : la clé `visible` est gérée à part car `visible` est sur le top-level de GeoElement, pas dans `el.style`. Si présente, appelle `figure.showElement/hideElement`.
- Booleans DSL (`vrai`/`faux`) sont coercés en `nombre` (1/0) par l'interpréteur (interpreter.ts:519). Helper `namedToBoolean` accepte `nombre` uniquement.
- `montre(O, ...styleArgs)` = show + apply remaining style. `masque(O)` = hide-only.
- `style(O, visible=vrai)` fonctionne aussi (mutateur pur, accepte tous les args).
