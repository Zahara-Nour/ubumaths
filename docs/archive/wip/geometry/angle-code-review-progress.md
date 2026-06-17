# Code-review consolidée GeoAngle V1+V2+V3a+A1+A2x — Livrée

Suite à la livraison de V1 → V3a + A1 + A2x + B3 (cf. `angle-v1-progress.md`,
`angle-v2-progress.md`, `angle-v3a-progress.md`, `transporte-euclide-progress.md`),
une code-review consolidée a sorti 7 findings (2 P0 bloquants + 5 P1 nice-to-have).
Tous ont été traités en commits ciblés sur `main`, sans nouvelle release jusqu'à v0.9.6.

## Récapitulatif

| #   | ID       | Sévérité | Sujet                                                                    | Commit      |
| --- | -------- | -------- | ------------------------------------------------------------------------ | ----------- |
| 1   | B-V2-1   | P0       | `angle(u, v)` quand u et v partagent endpoints → dégénéré                | `85e8ec34d` |
| 2   | B-A1-1   | P0       | A1 transporte : intersection cercle-cercle index k incorrect cas α obtus | `85e8ec34d` |
| 3   | D-A2.x-1 | P1       | `GeoFreeVectorPoint` exposé sans `@internal`                             | `3271b4a7b` |
| 4   | D-V3a-2  | P1       | `handleTransporte` double-passe `applyInlineStyle`                       | `3271b4a7b` |
| 5   | D-V2-1   | P1       | `mesure(u, v)` ne cache pas le scalaire dérivé                           | `d9a57089c` |
| 6   | D-V3a-1  | P1       | Calcul géométrique d'angle dupliqué dans 4 renderers                     | `3d2320d1f` |
| 7   | B-V2-2   | P1       | `angle(d1, d2)` peut devenir obtus au drag (acute figé)                  | `a7740f448` |

## Détails par finding

### P0 — B-V2-1 (angle(u, v) endpoints partagés)

**Symptôme** : `u = vecteur(A, B); v = vecteur(A, B); angle(u, v)` levait une erreur
au lieu de retourner un angle dégénéré (mesure 0).

**Fix** : ajout du garde `sameSupportingPoints` dans `handleAngleVectors`
(`builtins.ts:3128-3145`) qui détecte `u.startId === v.startId && u.endId === v.endId`
(en plus de l'égalité d'id `u.id === v.id` existante).

**Test** : `builtins-angle-overloads.test.ts` ajout d'un cas régression.

### P0 — B-A1-1 (intersection k pour |α| > π/2)

**Symptôme** : la chorégraphie `transporte @euclide` choisissait toujours
`createIntersectionCC(c1, c2, 0)` pour `B''`. Quand `α > π/2`, le mauvais index
était sélectionné, le 2e côté de β se trouvait du mauvais côté.

**Fix** : remplacement par sélection par "probe" : on évalue les 2 candidats
`B''_0` et `B''_1`, on garde celui dont la direction `V' → B''` correspond au
demi-plan défini par le côté `(V', A'')` et la direction `dir`.

### P1 — D-A2.x-1 (GeoFreeVectorPoint @internal)

**Symptôme** : le type `GeoFreeVectorPoint` ajouté en A2.x était exposé dans
l'union `GeoElement` sans marqueur d'usage interne. Risque qu'un caller externe
le crée directement et casse l'invariant "free-vector anchor reactive".

**Fix** : ajout du tag JSDoc `@internal` sur l'interface, documentation que la
factory `figure.createFreeVectorPoint` est appelée uniquement depuis
`handleAngleVectors` quand un des 2 vecteurs est un free vector sans anchor.

### P1 — D-V3a-2 (single-pass applyInlineStyle)

**Symptôme** : `handleTransporte` faisait 2 passes de style : un `styleOverride`
manuel sur l'angle β, puis un `applyInlineStyle(figure, betaId, named)` qui
ré-écrasait. Inefficace + risque d'incohérence si l'ordre changeait.

**Fix** : suppression du `styleOverride` manuel, une seule passe via
`applyInlineStyle` qui consomme `named`. -8 LoC.

### P1 — D-V2-1 (cache mesure(u, v))

**Symptôme** : 2 appels successifs `mesure(u, v)` créaient 2 `GeoScalar`
distincts (id différent, mêmes inputs, même valeur). Coûteux pour les pages
DSL qui référencent la même paire de vecteurs depuis plusieurs annotations
texte (ex: "α = π/3 rad ≈ 60°").

**Fix** : ajout d'un cache `vectorsAngleMeasureCache: Map<string, string>`
sur `Figure`, keyé par `${vec1Id}|${vec2Id}|${unite}`. Mirror du pattern
`hiddenAngleByTriplet` existant pour `angle(A, V, B)`.

**Test** : régression "2 mesure(u, v) successifs retournent le même scalarId".

### P1 — D-V3a-1 (factor angle render geometry shared)

**Symptôme** : le calcul géométrique d'un `GeoAngle` (vertex polar angles,
sweep direction, arc concentric layout pour marque ||, |||, ////, right-angle
corner, bisector pos, label pos) était dupliqué dans 4 sites :
`svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts`, `GeometryCanvas.svelte`.

**Fix** : extraction dans `src/lib/geometry-core/rendering/angle-geometry-shared.ts`
de 2 fonctions pures :

- `projectAngleEndpoints(angle, figure, projectFn)` : résout vertex/p1/p2 via la
  fonction de projection (pixels SVG ou unités math).
- `computeAngleGeometry(angle, coords, options)` : retourne `AngleRenderGeometry`
  avec tous les champs partagés (vertex, d1/d2 unit vectors, angles polaires,
  sweepRad/interiorRad, arcs[], outerRadius, rightAngle corner, bisX/bisY,
  labelX/labelY).

Les générateurs de strings spécifiques (SVG `M…A`, TikZ `\draw … arc`, Typst
`arc`) restent locaux à chaque renderer — syntaxes trop divergentes.

**Net** : -79 LoC supprimées des 3 renderers, +323 LoC dans le helper (dont
~120 LoC de JSDoc/interface docs).

**Canvas** non touché : il consomme `angleToSVG` via `svg-primitives.ts`, la
signature `AngleSVG` est préservée à l'identique.

### P1 — B-V2-2 (acute swap dynamique pour angle(d1, d2))

**Symptôme** : la convention "angle aigu" pour `angle(d1, d2)` était figée à la
construction (le choix `dot >= 0 ? v2 : -v2` était évalué une seule fois).
Si les droites tournaient au drag et que le signe du dot product changeait,
l'angle traversait π/2 et devenait obtus.

**Fix** : introduction du nouveau type `GeoVectorOrientedAlongLine` (ajouté au
union `GeoVector` existant). Sa direction est recalculée à chaque
`resolveVectorComponents` selon le signe courant de
`dot(dir(lineId), dir(referenceLineId))`. Toujours `visible: false` donc aucune
des 4 surfaces de rendu n'est impactée.

Factory : `figure.createVectorOrientedAlongLine(lineId, referenceLineId)`.

`handleAngleLines` remplace le choix statique par un appel unique au lieu du
ternaire `dot >= 0 ? createVectorByPoints(p1,p2) : createVectorByPoints(p2,p1)`.

**Tests** : 4 nouveaux dans `builtins-angle-overloads.test.ts` (régression
statique dot≥0, drag flip +→−, drag flip −→+, drag sweep 7 angles).

## Statut tests

| Suite                              | Avant                  | Après                              |
| ---------------------------------- | ---------------------- | ---------------------------------- |
| `builtins-angle-overloads.test.ts` | 42 passed              | **51 passed** (+9 nouveaux)        |
| `angle-canonical-cases.test.ts`    | 22 passed              | **22 passed** (refactor invisible) |
| `geometry-core/` global            | 3320 / 8 fail baseline | **3329 / 8 fail baseline**         |

Les 8 échecs baseline sont pré-existants (parser legacy, format `:deg` sur
scalaire, `trace-demos.test.ts` forme dépréciée). Aucune régression introduite.

## Release

v0.9.6 publiée (patch — pas de breaking change, P1-4 introduit un nouveau type
mais marqué internal et factory privée à l'usage `handleAngleLines`).

## Fichiers modifiés

- `src/lib/geometry-core/dsl/builtins.ts` (handleAngleVectors garde dégénéré +
  handleTransporte single-pass style + handleAngleLines orientedVector)
- `src/lib/geometry-core/types/elements.ts` (GeoFreeVectorPoint @internal +
  GeoVectorOrientedAlongLine interface + guard + union GeoVector)
- `src/lib/geometry-core/graph/figure.ts` (vectorsAngleMeasureCache +
  createVectorOrientedAlongLine factory)
- `src/lib/geometry-core/graph/vector-components.ts` (branche dynamique
  oriented-along-line dans `resolveVectorComponents`)
- `src/lib/geometry-core/rendering/angle-geometry-shared.ts` (nouveau, 323 LoC)
- `src/lib/geometry-core/rendering/svg-primitives.ts` (-54 LoC)
- `src/lib/geometry-core/rendering/export-tikz.ts` (-38 LoC)
- `src/lib/geometry-core/rendering/export-typst.ts` (-37 LoC)
- `src/lib/constructions-v2/core/choreographies/transporte.ts` (probe-based
  intersection index pour |α| > π/2)
- `src/lib/geometry-core/dsl/__tests__/builtins-angle-overloads.test.ts` (+9 tests)
