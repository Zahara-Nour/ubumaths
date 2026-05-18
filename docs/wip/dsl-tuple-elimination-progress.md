# DSL Refactor : Single-Object Returns + Accessors + Visibility Verbs

> Session : 2026-05-18
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : EN COURS

## Contexte

Refonte du DSL geometry-core pour éliminer les retours tuples des macros stdlib, au profit d'un design **un builtin = un objet principal + accesseurs explicites pour les sous-parties**. Les tuples restent acceptés quand le résultat est **intrinsèquement pluriel** (n sommets d'un polygone, 2 extrémités d'un segment).

Voir le plan complet pour les détails de conception.

## Commits planifiés (7)

| #   | Commit                                                                         | Statut       |
| --- | ------------------------------------------------------------------------------ | ------------ |
| 1   | `feat(dsl): accessors centre/extremite/extremites/milieu(s)/sommet/sommets`    | ✅ c8f0f3693 |
| 2   | `feat(dsl): montre + masque + visible support in style`                        | ✅ 9f1a59fbb |
| 3   | `feat(dsl): point(A, longueur=...) + segment(A, longueur=...)`                 | ✅ 6e81a1cc4 |
| 4-6 | `refactor(stdlib): full migration to single-object returns` (BREAKING, MERGED) | ✅ EN COURS  |
| 7   | `docs: full refresh post-refactor`                                             | ⏳           |

## Phase courante

Commits 4-5-6 fusionnés (interdépendances de macros). Reste : commit 7 (docs). Tests : 1781/1781 (1617 + 120 v2 + 21 + 10 + 14 + 25-1 net post-migration).

### Décision : merge des commits 4-5-6

Les macros stdlib sont interdépendantes : `cercle_circonscrit` utilise `mediatrice`, `orthocentre` utilise `hauteur`, `cercle_euler` utilise `cercle_circonscrit`, `droite_euler` utilise `centre_gravite` + `orthocentre`. Migrer en plusieurs commits aurait demandé des étapes intermédiaires avec compatibilité ascendante temporaire (`hauteur` retournant à la fois tuple et single), trop de complexité pour zéro bénéfice. Un seul commit BREAKING propre.

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

### Commit 3 — `point(A, longueur=...)` + `segment(A, longueur=...)`

- Nouveau helper `resolveDirection(ctx, Apos)` qui résout (dx, dy) unitaire depuis `angle=`, `direction=` ou `vecteur=`. Sans direction explicite → angle=0 par défaut (horizontal).
- `point(A, longueur=L, ...)` retourne le nouveau point (idiomatique : `B = point(A, longueur=5, angle=30)`).
- `segment(A, longueur=L, ...)` crée le point d'extrémité comme byproduct visible (la suppression silencieuse rendrait la figure incomplète), retourne le segment. L'utilisateur récupère l'endpoint via `extremite(s, 2)`.
- `angle=` respecte le `@mode("deg"|"rad")` actif via `toRadians(val, angleMode)`.
- Erreurs structurées : `direction=` avec point confondu → "indéterminée" ; `vecteur=` nul → idem.

### Commits 4-5-6 fusionnés — Migration stdlib (BREAKING)

**Macros migrées** (retour : tuple → objet unique) :

- `mediatrice(A, B)` : `(M, d)` → `d` (droite)
- `mediane(A, B, C)` : `(M, s)` → `s` (segment)
- `hauteur(A, B, C)` : `(F, d)` → `d` (droite)
- `cercle_circonscrit(A, B, C)` : `(O, c)` → `c` (cercle)
- `cercle_inscrit(A, B, C)` : `(I, c)` → `c` (cercle)
- `cercle_euler(A, B, C)` : `(Oe, ce)` → `ce` (cercle)
- `corde(c, d)` : `(P1, P2, s)` → `s` (segment)
- `triangle(A, B, C)` : pas de retour → `t` (polygone)
- `triangle_equilateral/isocele/rectangle(A, B[, …])` : `C` (point) → `t` (polygone)
- `rectangle/carre/losange(A, B[, …])` : `(C, D)` → `p` (polygone)
- `parallelogramme(A, B, C)` : `D` (point) → `p` (polygone)

**Refactor interne stdlib** :

- Tous les byproducts (points intermédiaires, droites internes) sont `masque()`-d immédiatement après création. La figure n'expose que l'objet retourné. L'utilisateur révèle les sous-parties via `centre(c)`, `milieu(A, B)`, `sommet(p, i)`, `montre(...)`.
- `cercle_circonscrit` utilise maintenant `mediatrice → d` (single) ; `orthocentre` utilise `hauteur → d` (single) ; `cercle_euler` utilise `cercle_circonscrit → c` (single).
- Pour les triangles : les 3 segments explicites sont remplacés par `polygone(A, B, C)` qui rend l'outline par défaut. Comportement visuel cohérent. Le `angle_droit` reste pour `triangle_rectangle`.

**Test sites migrés** :

- `dsl/__tests__/stdlib.test.ts` : 17 sites destructuring
- `dsl/__tests__/circle-constructions.test.ts` : 4 sites `corde`
- Routes : `/construction-demo/+page.svelte`, `/geometry-demo/triangles/+page.svelte`
- `dsl/__tests__/parser.test.ts` ligne 53 / 318 : intentionnellement INCHANGÉ — ces tests vérifient la SYNTAXE de destructuring qui reste valide (le parser ne dépend pas de la sémantique du macro).
- `dsl/__tests__/integration.test.ts` / `macros.test.ts` : INCHANGÉS — ils définissent des macros locales avec ancienne API, ce qui est légitime (test du mécanisme de macro, pas de la stdlib).

**Polygone outline** : la nouvelle implémentation des triangles/quadrilatères s'appuie sur le rendu d'outline natif du `GeoPolygon`. La figure montre l'outline; la fill est transparente par défaut. Visuel équivalent à avant.
