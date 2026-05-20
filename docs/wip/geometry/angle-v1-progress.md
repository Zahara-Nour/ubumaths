# Angle V1 — Objet `angle` de premier ordre dans `geometry-core`

## Objectif

Promouvoir l'angle au rang d'**objet de premier ordre** (`GeoAngle`) dans le module `geometry-core`, en éliminant la dispersion actuelle entre `GeoAngleMark` (annotation visuelle), `angle(A,V,B)` (scalaire) et `angle_vecteurs(u,v)` (scalaire pur). Breaking changes assumés, pas de backward compat. Cible : un seul type, des accesseurs purs, drag réactif natif, composition avec `bissectrice`, `rotation`, etc.

## Documents sources

- Étude v1 : [`docs/wip/geometry/study-angle-object.md`](./study-angle-object.md)
- Étude v2 (finale) : [`docs/wip/geometry/study-angle-object-v2.md`](./study-angle-object-v2.md)
- Plan d'implémentation : `~/.claude/plans/lucky-watching-fairy.md`
- Prompt source : [`docs/wip/geometry/prompt-angle-object.md`](./prompt-angle-object.md)

## Statut des phases

| #   | Phase                                                                                  | Statut       |
| --- | -------------------------------------------------------------------------------------- | ------------ |
| P0  | Spec TDD + tests rouges                                                                | **terminée** |
| P1  | Types & schemas (rename `GeoAngleMark` → `GeoAngle`)                                   | **terminée** |
| P2  | Factory `figure.createAngle()` + `compute-position.ts`                                 | **terminée** |
| P3  | DSL : suppressions + refonte `angle()` + `angle_polaire()`                             | **terminée** |
| P4  | DSL : accesseurs (`cote`, `sommet`) + surcharges (`mesure`, `bissectrice`, `rotation`) | **terminée** |
| P5  | Rendu sur 4 surfaces (canvas, SVG, TikZ, Typst) + rough                                | **terminée** |
| P6  | Migration 5 sites internes + 38 occurrences tests                                      | **terminée** |
| P7  | Démos + converters + outillage migration + doc + code-review final                     | **terminée** |

---

## Comportements attendus V1

### 1. Constructeur `angle(A, V, B)`

- `α = angle(A, V, B)` retourne un objet `GeoAngle` (`type: 'angle'`).
- **Visible par défaut** (cohérent avec `cercle`, `segment`, `polygone`).
- Par défaut : `marque = 'arc'`, `kind = 'saillant'`, `orientation = 'auto'`, `showLabel = 'aucun'`, `unite = 'rad'`.
- `dependsOn = [p1Id, vertexId, p2Id]` (ordre strict — important pour les renderers).
- `vertexId` est le **sommet** (2ᵉ argument), `p1Id` le côté A (1er), `p2Id` le côté B (3ᵉ).

### 2. Refus de `angle(O, P)` 2 args (breaking change)

- `α = angle(O, P)` (2 arguments) → **erreur `DslRuntimeError` structurée** :
  - `summary` : `\`angle()\` attend 3 points (A, V, B). 2 arguments reçus.`
  - `hint` : « utilise `angle_polaire(O, P)` pour l'angle polaire d'un vecteur, ou ajoute le 3ᵉ point. »
  - `forms` : liste des formes acceptées (`angle(A, V, B)`, `angle_polaire(O, P)`).

### 3. Nouveau builtin `angle_polaire(O, P)`

- `θ = angle_polaire(O, P)` retourne un `GeoScalar` (mesure en radians par défaut).
- Équivalent fonctionnel de l'ancien `angle(O, P)`.
- Conserve le `scalarKind: 'polar_angle'` existant.
- Conserve `createScalarPolarAngle` dans `figure.ts`.

### 4. Champs du type `GeoAngle`

| Champ             | Type                                                 | Défaut                   | Rôle                                     |
| ----------------- | ---------------------------------------------------- | ------------------------ | ---------------------------------------- |
| `type`            | `'angle'`                                            | —                        | discriminant                             |
| `vertexId`        | `string`                                             | —                        | id du point sommet                       |
| `p1Id`            | `string`                                             | —                        | id du point côté 1                       |
| `p2Id`            | `string`                                             | —                        | id du point côté 2                       |
| `orientation`     | `'auto' \| 'direct' \| 'indirect'`                   | `'auto'`                 | sens (CCW signé)                         |
| `kind`            | `'saillant' \| 'rentrant'`                           | `'saillant'`             | secteur intérieur (<π) ou extérieur (>π) |
| `marque`          | `'arc' \| 'arcs2' \| 'arcs3' \| 'carre' \| 'aucune'` | `'arc'`                  | rendu visuel                             |
| `showLabel`       | `'aucun' \| 'nom' \| 'mesure' \| 'mesure+nom'`       | `'aucun'`                | label sur la figure                      |
| `unite`           | `'rad' \| 'deg'`                                     | `'rad'`                  | unité d'affichage                        |
| `arcRadiusPx`     | `number`                                             | `25`                     | rayon de l'arc en pixels                 |
| `measureScalarId` | `string \| undefined`                                | `undefined`              | back-ref vers le scalaire mesure (cache) |
| `dependsOn`       | `readonly [string, string, string]`                  | `[p1Id, vertexId, p2Id]` | drag-friendliness                        |

### 5. Accesseurs

- `mesure(α)` retourne un `GeoScalar` réactif (mesure en radians).
- `mesure(α, unite="deg")` retourne en degrés.
- `mesure(α, unite="rad")` retourne en radians (explicite).
- Cache via `measureScalarId` : 2 appels successifs → même scalaire.
- `sommet(α)` retourne le point vertex (référence pure, pas de création).
- `cote(α, 1)` retourne le point p1, `cote(α, 2)` retourne le point p2.
- `cote(α, i)` avec `i ∉ {1, 2}` → `DslRuntimeError`.

### 6. Surcharges de `mesure`

- `mesure(A, V, B)` (3 points) construit un `GeoAngle` interne `visible:false`, retourne le scalaire dérivé.
- `mesure(u, v)` (2 vecteurs) construit l'angle entre `u` et `v` en interne, retourne le scalaire.
- `mesure(u)` 1 vecteur → `DslRuntimeError` :
  - `hint` : « utilise `norme(u)` pour la longueur d'un vecteur. »
- `mesure(s)` segment → `DslRuntimeError` :
  - `hint` : « utilise `longueur(s)` pour la longueur d'un segment. »

### 7. Surcharges de `bissectrice`

- `bissectrice(α)` (1 arg = `GeoAngle`) → équivalent `bissectrice(p1, vertex, p2)`.
- Préserve la surcharge existante `bissectrice(A, V, B)` (3 points).
- Sur angle plat (180°) : `DslRuntimeError` (déjà géré dans `handleBissectrice`).

### 8. Surcharges de `rotation`

- `rotation(P, α, centre=O)` accepte un `GeoAngle` comme paramètre angle.
- Lit la mesure via `mesure(α)` (couplage réactif : drag des points de α → mise à jour de la rotation).
- Préserve la surcharge existante `rotation(P, scalaire, centre=O)`.

### 9. Marquages (`marque`)

- `marque = 'arc'` : 1 arc simple (défaut).
- `marque = 'arcs2'` : 2 arcs concentriques (égalité d'angles).
- `marque = 'arcs3'` : 3 arcs concentriques.
- `marque = 'carre'` : petit carré au sommet (équivalent ancien `angle_droit`).
- `marque = 'aucune'` : aucun rendu (utile pour calculs purs où seul le label `mesure` est affiché, ou pour cacher l'arc sans masquer l'objet entier).

### 10. Sweep `kind='rentrant'`

- `kind = 'rentrant'` inverse le sweep flag (SVG sweep-flag `1` au lieu de `0`).
- Équivalent TikZ/Typst : passe par `360° − α` pour le tracé.
- Permet de marquer l'angle extérieur (>π) au lieu du secteur intérieur.

### 11. Drag réactif

- Drag de `p1` → la mesure de α se met à jour automatiquement.
- Drag de `vertex` → la mesure et la position de l'arc se mettent à jour.
- Drag de `p2` → idem.
- `bissectrice(α)` se met à jour en cascade (via le dependency-graph).
- `rotation(P, α)` recalcule automatiquement la position de l'image.

### 12. Suppressions (breaking changes)

- `marque_angle(P1, V, P2, arcs=N)` → **supprimé** (remplacé par `angle(P1, V, P2, marque="arcsN")`).
- `angle_droit(P1, V, P2)` → **supprimé** (remplacé par `angle(P1, V, P2, marque="carre")`).
- `angle_vecteurs(u, v)` → **supprimé** (remplacé par `mesure(u, v)`).
- `angle(O, P)` 2 args → **supprimé** (remplacé par `angle_polaire(O, P)`).
- **Aucun alias** : les anciens noms ne sont plus dans `BUILTIN_NAMES`. Tentative d'usage → `DslRuntimeError("builtin inconnu : <nom>")`.

### 13. Rendu

- 4 surfaces : canvas (`GeometryCanvas.svelte`), SVG (`export-svg.ts` via `angleToSVG`), TikZ (`export-tikz.ts`), Typst (`export-typst.ts`).
- Variant `rough-geometry.ts` (style sketchy).
- Helper partagé `formatAngleLabel(α, unite, format)` pour mutualiser le formatage entre les 4 surfaces (évite le piège `extendLineToViewport` triplé).
- `kind='rentrant'` inverse le sweep flag.
- `marque='carre'` rend un carré (équivalent ancien `rightAngle: true`).
- `marque='aucune'` skip le rendu de l'arc/carré mais conserve la position pour le label.
- `showLabel='mesure'` rend `"60°"` (ou `"π/3"` en radian) au point bissecteur.

---

## Cas dégénérés détaillés

| Cas                                                  | Comportement attendu                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `vertex == p1` ou `vertex == p2`                     | `mesure(α)` retourne `null`, rendu masqué silencieusement                                               |
| `p1 == p2` (côtés confondus)                         | `mesure(α) = 0`, arc invisible mais objet présent                                                       |
| Angle nul (0°)                                       | mesure = 0, rendu OK (arc minuscule), pas d'erreur                                                      |
| Angle plat (180°)                                    | rendu demi-cercle ; `bissectrice(α)` → `DslRuntimeError` (« bissectrice indéterminée pour angle plat ») |
| Angle 360° = 0°                                      | mesure normalisée à 0, rendu équivalent angle nul                                                       |
| 3 points alignés (V entre A et B)                    | angle plat, idem                                                                                        |
| Angle rentrant > π                                   | `kind='rentrant'` requis explicitement ; sinon angle saillant complémentaire (2π − α)                   |
| `arcCount` hors `{1, 2, 3}` (devenu `marque ∉ enum`) | refusé via Zod                                                                                          |
| Drag flippe le signe du produit vectoriel            | orientation `'auto'` flippe ; pour stabilité, déclarer `orientation='direct'` ou `'indirect'`           |

---

## Fichiers à toucher

### Source module

- `src/lib/geometry-core/types/elements.ts` : interface `GeoAngle`, type guard `isAngle`, union, suppression `GeoAngleMark`/`isAngleMark`.
- `src/lib/geometry-core/types/schemas.ts` : Zod schema (literal `'angle'`, enums `marque`, `kind`, `orientation`, `showLabel`, `unite`).
- `src/lib/geometry-core/types/index.ts` : barrel exports.
- `src/lib/geometry-core/graph/figure.ts` : rename `createAngleMark` → `createAngle`, extension signature, suppression `createScalarAngle`, conservation `createScalarPolarAngle`.
- `src/lib/geometry-core/graph/compute-position.ts` : branche calcul baricentre arc + scalaire dérivé.
- `src/lib/geometry-core/dsl/builtins.ts` : suppressions (3 handlers + 1 mode 2-args), refonte `handleAngle`, ajout `handleAnglePolaire`, `handleCote`, extension `handleMesure`/`handleSommet`/`handleBissectrice`/`handleRotation`.
- `src/lib/geometry-core/dsl/keywords.ts`, `dsl/symbol-table.ts`, `dsl/serializer.ts` : rename `'angleMark'` → `'angle'`.
- `src/lib/geometry-core/dsl/interpreter.ts` : références éventuelles.
- `src/lib/geometry-core/rendering/svg-primitives.ts` : rename `angleMarkToSVG` → `angleToSVG`, sweep `rentrant`, mapping `marque`.
- `src/lib/geometry-core/rendering/export-svg.ts` : dispatch type `'angle'`.
- `src/lib/geometry-core/rendering/export-tikz.ts` : branche TikZ (50 LoC).
- `src/lib/geometry-core/rendering/export-typst.ts` : branche Typst.
- `src/lib/geometry-core/rendering/rough-geometry.ts` : variant sketchy.
- `src/lib/geometry-core/rendering/format-angle-label.ts` (nouveau helper).
- `src/lib/components/geometry/GeometryCanvas.svelte` : canvas interactif (lignes 1723-1730).

### Tests

- `src/lib/geometry-core/graph/__tests__/figure-angle.test.ts` (nouveau, refonte de `figure-angle-mark.test.ts`, ~280 LoC).
- `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` (nouveau, ~250 LoC final).
- `src/lib/geometry-core/dsl/__tests__/scalar-dsl.test.ts` (22 occurrences à migrer).
- `src/lib/geometry-core/dsl/__tests__/serializer.test.ts` (7).
- `src/lib/geometry-core/dsl/__tests__/roundtrip.test.ts` (9).
- `src/lib/geometry-core/dsl/__tests__/vector-ops-dsl.test.ts` (5).
- `src/lib/geometry-core/dsl/__tests__/interpreter.test.ts` (2).
- `src/lib/geometry-core/dsl/__tests__/integration.test.ts` (3).
- `src/lib/geometry-core/dsl/__tests__/stdlib.test.ts`, `dsl/__tests__/tokenizer.test.ts` (résidus).
- `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` (vérification).

### Démos

- `src/routes/(public)/geometry-demo/triangles/+page.svelte`.
- `src/routes/(public)/geometry-demo/vectors/+page.svelte`.
- `src/routes/(public)/geometry-demo/measurements/+page.svelte`.
- `src/routes/(public)/geometry-demo/intersections/+page.svelte`.

### Scripts / converters

- `scripts/migrate-constructions-to-dsl.ts`.
- `scripts/convert-instrumenpoche.ts`.
- `src/lib/constructions/converter.ts`.
- `src/lib/constructions-v2/converter.ts`.
- `scripts/migrate-angle-builtins-supabase.ts` (nouveau, ~150 LoC).
- `scripts/lint-angle-builtins.ts` (nouveau, ~40 LoC).

### Documentation

- `docs/ref/geometry/dsl-builtins.md` (section `angle` complète, ~80 LoC).
- `CHANGELOG.md` (5 breaking changes).

---

## Liens

- Prompt source : [`docs/wip/geometry/prompt-angle-object.md`](./prompt-angle-object.md)
- Étude v1 : [`docs/wip/geometry/study-angle-object.md`](./study-angle-object.md) (sections 5, 7, 8, 9 réutilisables)
- Étude v2 finale : [`docs/wip/geometry/study-angle-object-v2.md`](./study-angle-object-v2.md)
- Plan d'implémentation : `~/.claude/plans/lucky-watching-fairy.md`
- MEMORY : `geometry-core-status.md`, `transformation-objects.md`, `vector-implementation.md`

---

## Notes Phase 1

### Modifications effectuées

**`src/lib/geometry-core/types/elements.ts`** (lignes ~426-435 → ~426-451) :

- `interface GeoAngleMark` → `interface GeoAngle` (+12 champs optionnels, -2 champs supprimés : `arcCount`, `rightAngle`)
- `type: 'angleMark'` → `type: 'angle'`
- Union `GeoElement` ligne ~1281 : `GeoAngleMark` → `GeoAngle`
- Type guard `isAngleMark` → `isAngle` (lignes 1504-1506)
- `scalarKind: 'angle'` **conservé temporairement** avec annotation `@deprecated` : `createScalarAngle` dans `figure.ts:3526-3548` l'instancie encore — sera supprimé en P2 avec la factory.

**`src/lib/geometry-core/types/schemas.ts`** (lignes ~232-240) :

- `angleMarkSchema` → `angleSchema`, `z.literal('angleMark')` → `z.literal('angle')`
- Supprimés : `arcCount`, `rightAngle`
- Ajoutés : `orientation`, `kind`, `marque`, `showLabel`, `unite`, `measureScalarId`, `arcRadiusPx` (tous optionnels)
- Référence dans l'union Zod (ligne ~361) : `angleMarkSchema` → `angleSchema`

**`src/lib/geometry-core/types/index.ts`** :

- Export type `GeoAngleMark` → `GeoAngle`
- Export value `isAngleMark` → `isAngle`

### Casses temporaires attendues (seront résolues en P2-P6)

- `dsl/builtins.ts` : `isAngleMark`, `GeoAngleMark` non résolus
- `graph/figure.ts` : `createAngleMark` retourne encore un `GeoAngleMark` inexistant
- `rendering/svg-primitives.ts` : `isAngleMark`, `'angleMark'`
- `rendering/export-svg.ts`, `export-tikz.ts`, `export-typst.ts` : dispatch sur `'angleMark'`
- `graph/__tests__/figure-angle-mark.test.ts` : `GeoAngleMark`
- `dsl/__tests__/*.test.ts` : occurrences `'angleMark'` dans snapshots

**LoC modifiées** : ~45 LoC (elements.ts : +16 net, schemas.ts : +9 net, index.ts : +2).

---

## Notes Phase 2

### Modifications effectuées

**`src/lib/geometry-core/graph/figure.ts`** :

- Import : `GeoAngleMark` → `GeoAngle` (ligne 27).
- `createAngleMark(...)` → `createAngle(...)` (lignes 1961-2008) :
  - Signature étendue avec champs optionnels `marque`, `orientation`, `kind`, `showLabel`, `unite`, `arcRadiusPx`.
  - Défauts appliqués : `marque='arc'`, `orientation='auto'`, `kind='saillant'`, `showLabel='aucun'`, `unite='rad'`.
  - ID prefix `'angM'` → `'ang'`.
  - Suppression des anciens champs `arcCount` et `rightAngle` (n'existent plus dans `GeoAngle`).
  - `type: 'angleMark'` → `type: 'angle'`.
  - Préservation des checks `isPointElement` sur les 3 arguments et `dependsOn = [p1Id, vertexId, p2Id]`.
- **Suppression** de `createScalarAngle` (anciennes lignes 3526-3548). Plus de scalaire de premier ordre pour les angles ; la mesure sera dérivée via `mesure(α)` en P4.
- **Conservation** de `createScalarPolarAngle` (intacte, sera utilisée par `angle_polaire` en P3).

**`src/lib/geometry-core/graph/compute-position.ts`** :

- Import : `isAngleMark` → `isAngle` (ligne 34).
- Branche `isAngleMark(el)` → `isAngle(el)` (ligne 677) : retourne `vertexPos` comme position de référence (le rendu calcule lui-même la position du label sur l'arc — pas de baricentre ici pour rester minimal et cohérent avec l'ancien comportement).
- **Suppression** de la branche `case 'angle':` du switch `scalarKind` (anciennes lignes 1159-1176). Plus aucun scalaire `'angle'` n'existe en aval.

**`src/lib/geometry-core/types/elements.ts`** :

- Suppression du `scalarKind: 'angle'` (avec son annotation `@deprecated` posée en P1) de l'union `GeoScalar.scalarKind`.

### LoC modifiées

- `figure.ts` : ~50 LoC (rename + extension + suppression `createScalarAngle`).
- `compute-position.ts` : ~22 LoC (rename + suppression branche scalar 'angle').
- `elements.ts` : ~7 LoC (suppression scalarKind 'angle' + son commentaire).

**Total** : ~80 LoC modifiées/supprimées.

### Choix : `compute-position` retourne `vertex` (pas baricentre)

Pour le type `'angle'`, la position de référence retournée est le **vertex** plutôt qu'un baricentre d'arc. Justification :

- Cohérent avec l'ancien comportement (`createAngleMark` posait déjà `positions.set(id, vertexPos)`).
- Le rendu (P5) calculera lui-même la position du label sur l'arc à partir de `(vertex, p1, p2, arcRadiusPx)` — c'est une concern de rendu, pas de graph.
- Évite de figer une dépendance à `arcRadiusPx` dans le graph de position.
- Le baricentre pourra être ajouté plus tard si nécessaire (extension non-bloquante).

### Casses temporaires attendues (seront résolues en P3-P6)

- `dsl/builtins.ts` : 5+ sites appellent encore `createAngleMark` (dans `triangle_rectangle`, `rectangle`, `carre`, et les handlers `handleMarqueAngle`, `handleAngleDroit`) — **migration en P3 (suppression handlers) puis P6 (sites internes)**.
- `rendering/svg-primitives.ts` : `isAngleMark`, `'angleMark'` → P5.
- `rendering/export-svg.ts`, `export-tikz.ts`, `export-typst.ts` : dispatch sur `'angleMark'` → P5.
- `graph/__tests__/figure-text.test.ts:137,238` : appellent `f.createScalarAngle(...)` → migration P6 (équivalent `mesure(angle(...))`).
- `graph/__tests__/figure-angle-mark.test.ts`, `figure-angle.test.ts` : appellent `createAngleMark` → P6.

---

## Notes Phase 3

### Modifications effectuées

**`src/lib/geometry-core/dsl/builtins.ts`** :

- **Supprimé** `handleAngleVecteurs` + `HANDLERS.set('angle_vecteurs', ...)` (~49 LoC).
- **Supprimé** `handleMarqueAngle` + `HANDLERS.set('marque_angle', ...)` (~32 LoC).
- **Supprimé** `handleAngleDroit` + `HANDLERS.set('angle_droit', ...)` (~24 LoC).
- **Refondu** `handleAngle(ctx)` (~92 LoC après) :
  - 2 args → throw `DslRuntimeError` structurée pointant vers `angle_polaire(O, P)`.
  - 3 args → `figure.createAngle(A, V, B, { marque, orientation, kind, showLabel, unite, arcRadiusPx, label })`. Retourne `{ figureId, symbolType: 'angle' }`.
  - Named args validés via helper `requireEnumNamed<T>(named, key, allowedSet, line)` (8 LoC mutualisés).
  - Constantes `ANGLE_FORMS`, `ANGLE_MARQUE_VALUES`, `ANGLE_ORIENTATION_VALUES`, `ANGLE_KIND_VALUES`, `ANGLE_SHOWLABEL_VALUES`, `ANGLE_UNITE_VALUES` au top.
  - Cas `pos.length < 2` ou autres → `DslRuntimeError` structurée avec `ANGLE_FORMS`.
  - Style inline (`couleur`, `epaisseur`, ...) déjà appliqué automatiquement via `applyInlineStyle` après le handler.
- **Ajouté** `handleAnglePolaire(ctx)` (~23 LoC) :
  - 2 args (O, P) → `figure.createScalarPolarAngle(oId, pId, { label })`.
  - Toute autre arity → `DslRuntimeError` structurée.
  - Retourne `{ figureId, symbolType: 'scalar' }`.
- **Migration des 5 sites internes** (cohérence avec la refonte du même fichier) :
  - `handleTriangleRectangle` (l. 4503) : `createAngleMark({ rightAngle: true })` → `createAngle({ marque: 'carre' })`.
  - `handleRectangle` (l. 4559) : idem.
  - `handleCarre` (l. 4584) : idem.
- **`BUILTIN_NAMES`** : retiré `'angle_vecteurs'`, `'marque_angle'`, `'angle_droit'` ; ajouté `'angle_polaire'`. Conservé `'angle'`.
- Mis à jour le commentaire de `BuiltinScalarResult` (retiré la mention `angle_vecteurs`).

**`src/lib/geometry-core/dsl/keywords.ts`** :

- Retiré `'marque_angle'`, `'angle_droit'` ; ajouté `'angle'`, `'angle_polaire'` dans la liste annotations.

**`src/lib/geometry-core/dsl/symbol-table.ts`** :

- `SymbolType` : `'angleMark'` → `'angle'`.

**`src/lib/geometry-core/dsl/serializer.ts`** :

- Mapping ID prefix : `'angleMark' → 'am'` → `'angle' → 'ang'` (cohérent avec `generateId('ang')` côté factory).
- Branche d'émission `case 'angleMark'` → `case 'angle'` : émet `angle(A, V, B[, marque="...", orientation="...", kind="...", showLabel="...", unite="...", arcRadiusPx=N])`. Les champs aux valeurs par défaut sont omis pour rester lisible.
- Branche scalaire `case 'angle'` : **supprimée** (le scalarKind `'angle'` n'existe plus depuis P2).
- Branche scalaire `case 'polar_angle'` : émet désormais `angle_polaire(O, P)` au lieu de `angle(O, P)`.

**`src/lib/geometry-core/dsl/interpreter.ts`** :

- Mis à jour le commentaire qui mentionnait `angle_vecteurs()`.

### LoC modifiées

- `builtins.ts` : -120 (suppressions) +120 (refonte + ajout + enum helper + constantes) ≈ net ~0, mais structure beaucoup plus claire.
- `keywords.ts` : ~4 LoC.
- `symbol-table.ts` : 1 LoC.
- `serializer.ts` : ~15 LoC (case `'angleMark'` réécrit, case scalaire simplifié, mapping prefix).
- `interpreter.ts` : 1 commentaire.

### Casses temporaires restantes (résolution P4/P5/P6)

- `dsl/builtins.ts:2582` (`handleMesure` branche bisector 3 points) appelle encore `figure.createScalarAngle(...)` qui a été supprimé en P2. **Restera cassé jusqu'à P4** (overloads `mesure(α)`, `mesure(A, V, B)`, `mesure(u, v)`).
- `rendering/svg-primitives.ts` + `export-svg.ts` + `export-tikz.ts` + `export-typst.ts` + `index.ts` (rendering) : dispatch sur `'angleMark'`, fonction `angleMarkToSVG` → P5.
- Tests `dsl/__tests__/*` qui contiennent encore `angle_droit`, `marque_angle`, `angle_vecteurs` et `'angleMark'` dans des snapshots, ainsi que `figure-angle-mark.test.ts`, `figure-text.test.ts` (appel `createScalarAngle`) → P6.

### Risques résiduels pour P4

- **Aucune référence orpheline à un futur `handleMesure(α)`** : le handler `mesure()` actuel (l. 2563) gère encore les 2/3/N points ; il sera étendu en P4 avec les surcharges (1 arg = angle/vecteur/segment → dispatch via type guards `isAngle`, `isVector`, `isSegment` ; refus explicite pour `isSegment` et 1 vecteur).
- **Sérialisation** : `case 'scalar'` du serializer émet déjà `mesure(...)` quand un text a `autoTargetIds` (l. ~479-481) — à revérifier en P4 quand `mesure(α)` devra sérialiser proprement vers `mesure(α)` plutôt que vers le 3 points.
- Le helper `requireEnumNamed` introduit en P3 est réutilisable pour `mesure(α, unite="deg")` en P4.

### Prêt pour P4 ?

Oui. Le DSL surface est cohérent (plus aucune référence aux 3 builtins supprimés ni à `'angleMark'` côté source DSL), `figure.createAngle` est branché, le scalaire polaire est isolé sous `angle_polaire`. Le seul résidu connu (`createScalarAngle` dans `handleMesure`) est documenté et fait partie du périmètre P4.

---

## Notes Phase 0

- Tests rouges écrits dans `figure-angle.test.ts` (nouveaux comportements de la factory `createAngle`) et `builtins-angle.test.ts` (handlers DSL).
- Les tests utilisent `it.todo()` pour les comportements qui dépendent de types ou de builtins futurs (Phases 1-4).
- Les tests doivent compiler en TypeScript mais échouer à l'exécution (factory `createAngle` n'existe pas encore, builtin `angle_polaire` n'existe pas encore, etc.).
- Aucune modification du code source en Phase 0.

---

## Notes Phase 4

### Modifications effectuées

**`src/lib/geometry-core/types/elements.ts`** :

- Ajout de 2 nouvelles `scalarKind` à l'union `GeoScalar.scalarKind` : `'angle_measure'` (mesure d'un angle 3-points) et `'vectors_angle_measure'` (angle non orienté entre 2 vecteurs).
- Ajout du champ optionnel `unite?: 'rad' | 'deg'` sur `GeoScalar` (utilisé par les 2 nouveaux `scalarKind` ; défaut `'rad'`).

**`src/lib/geometry-core/graph/figure.ts`** :

- Import `isAngle` ajouté.
- Nouvelle factory `createScalarAngleMeasure(p1Id, vertexId, p2Id, { unite?, ...})` : crée un `GeoScalar` réactif (visible par défaut `false`) qui lit les 3 positions et calcule `acos(...)` en radians (ou degrés si `unite='deg'`).
- Nouvelle factory `createScalarVectorsAngleMeasure(v1Id, v2Id, { unite?, ...})` : crée un `GeoScalar` réactif sur 2 vecteurs ; dépend transitivement des points des vecteurs.
- Nouvelle méthode `setAngleMeasureScalarId(angleId, scalarId)` : mutateur thin qui pose le champ `measureScalarId` sur l'angle pour le cache (utilisé par `mesure(α)`).

**`src/lib/geometry-core/graph/compute-position.ts`** :

- Nouvelle branche `case 'angle_measure'` : lit les 3 positions cibles, calcule l'angle non signé en `[0, π]` via `acos((u·v)/(|u||v|))`. Clamping numérique sur cos. Retourne en degrés si `el.unite === 'deg'`. `undefined` si positions manquantes ou côtés dégénérés.
- Nouvelle branche `case 'vectors_angle_measure'` : utilise `resolveVectorComponents` pour les 2 vecteurs. Même logique de calcul + unité.

**`src/lib/geometry-core/dsl/builtins.ts`** :

- Import `isAngle`, `isVector` ajouté.
- Helper `requireEnumNamed<T>` : ajout d'un paramètre optionnel `callerName: string = 'angle'` pour personnaliser l'erreur quand `mesure()` valide son `unite=`.
- **`handleMesure` refondu** (~150 LoC nettes après) — gère 5 cas + fallback (F) :
  - **Cas A** : `mesure(α)` avec `α = GeoAngle` → cache via `α.measureScalarId` (réutilisation si même `unite`), sinon `createScalarAngleMeasure` + `setAngleMeasureScalarId`. Accepte `unite="rad"|"deg"`.
  - **Cas B** : `mesure(A, V, B)` (3 points) → crée un `GeoAngle` interne avec `marque='aucune'`, le rend invisible via `hideElement`, puis dérive le scalaire (pose aussi le `measureScalarId` pour cohérence).
  - **Cas C** : `mesure(u, v)` (2 vecteurs) → **choix** : utilise directement `createScalarVectorsAngleMeasure` (pas de `GeoAngle` intermédiaire — un angle 3-points exigerait des points d'ancrage arbitraires pour des vecteurs libres). Plus léger, réactif natif via les dépendances vecteur.
  - **Cas D** : `mesure(u)` (1 vecteur) → `DslRuntimeError` structurée avec hint `norme(u)` / `angle_polaire(O, u)`.
  - **Cas E** : `mesure(s)` (segment) → `DslRuntimeError` structurée avec hint `longueur(s)`.
  - **Cas F** : autres (point, cercle, etc.) → `DslRuntimeError` structurée listant `MESURE_FORMS`.
  - Constantes `MESURE_FORMS`, helper `readMesureUnite`.
  - Signature retour étendue : `BuiltinResult | BuiltinScalarResult` (en pratique uniquement `BuiltinResult` puisqu'on retourne un scalar `figureId`).
- **`handleSommet` étendu** : ajout du dispatch type guard `isAngle`. Cas `sommet(α)` (1-arg) retourne `{ figureId: angle.vertexId, symbolType: 'point' }` (accesseur pur). Cas 2-args sur un angle → erreur structurée pointant vers `sommet(α)` / `cote(α, i)`. Les `forms` listent les 2 syntaxes.
- **`handleCote` nouveau** (~32 LoC) : accesseur pur `cote(α, 1|2)` → retourne `{ figureId: angle.p1Id|p2Id, symbolType: 'point' }`. Erreurs structurées si pas un angle, ou index ∉ {1, 2}.
- **`handleBissectrice` refactorisé** : extraction de `buildBisectorLine(...)` (helper interne). Ajout du cas 1-arg : si `pos.length === 1` ET `isAngle(el)`, lit `(p1Id, vertexId, p2Id)` et délègue au helper. Cas 3-points préservé. Constante `BISSECTRICE_FORMS` mise à jour avec les 2 syntaxes. Erreurs reportées correctement aux 2 chemins.
- **`handleRotation` surchargé** : nouveau cas en tête de la résolution `angleArg` — si `angleArg.elementType === 'angle'`, vérifie via `isAngle`, réutilise le `measureScalarId` du cache si présent (et `unite='rad'`), sinon crée un nouveau `createScalarAngleMeasure(p1, V, p2, { unite: 'rad' })` et pose le cache via `setAngleMeasureScalarId`. Le scalar (en radians) est passé via `{ scalarRef }` à `createRotation`. Couplage drag bidirectionnel garanti par le graphe de dépendances. Branches existantes (`'scalar'` + nombre) intactes.
- **`BUILTIN_NAMES`** : ajout de `'cote'`. `'mesure'`, `'sommet'`, `'bissectrice'`, `'rotation'`, `'angle'`, `'angle_polaire'` étaient déjà présents.

**`src/lib/geometry-core/dsl/serializer.ts`** :

- Ajout de 2 cas dans `case 'scalar'` :
  - `case 'angle_measure'` : émet `mesure(A, V, B)` (ou `mesure(A, V, B, unite="deg")` si applicable).
  - `case 'vectors_angle_measure'` : émet `mesure(u, v)` (ou avec `unite="deg"`).
- Les angles internes (créés par `mesure(A, V, B)`) sont `visible=false` et donc filtrés par la garde existante.

### Choix d'implémentation pour `mesure(u, v)`

Au lieu de construire un `GeoAngle` intermédiaire (qui exigerait de fabriquer des points d'ancrage pour les vecteurs libres avec composantes constantes), j'utilise **directement un nouveau `scalarKind: 'vectors_angle_measure'`** qui lit les composantes via `resolveVectorComponents`. Avantages :

- Plus léger (pas de scaffolding d'angle invisible).
- Réactif naturellement via les dépendances vecteur (dont les points ancrés).
- Cohérent avec le pattern de `'norme'` qui s'applique à un vecteur sans passer par un objet géométrique intermédiaire.
- Le revers : pas de pair angle-objet à brancher sur un drag UI, mais c'est correct sémantiquement (on ne marque pas l'angle entre 2 vecteurs sur la figure).

### LoC modifiées

- `types/elements.ts` : +4 LoC (2 scalarKinds + `unite` field).
- `graph/figure.ts` : +90 LoC (2 factories + 1 mutateur + import).
- `graph/compute-position.ts` : +40 LoC (2 branches scalar).
- `dsl/builtins.ts` : ~+260 / -50 LoC (refonte `handleMesure`, `handleSommet` étendu, `handleCote` nouveau, `handleBissectrice` refactorisé, `handleRotation` surchargé, helpers + constantes).
- `dsl/serializer.ts` : +14 LoC (2 cas).

**Total net** : ~+360 LoC modifiées/ajoutées.

### Tests

- `builtins-angle.test.ts` (Phase 0) : tous `it.todo()` — compilent et restent skipped. À étoffer en P6 quand les builtins sont stables.
- `figure-angle.test.ts` (Phase 0) : 4 failures préexistantes liées à `createAngleMark` supprimé en P2 — résolution P6.
- `serializer.test.ts` : 4 failures préexistantes (P3 fallout `marque_angle`/`angle_droit`) + 1 nouvelle (`mesure(A, B)` 2-points distance — désormais non supporté par la refonte ; à migrer en P6 vers `longueur` ou `distance`).
- `scalar-dsl.test.ts` : 15 failures (mix d'usages anciens de `mesure()` distance/area + `angle_vecteurs` — P6 migration).
- `figure-text.test.ts` : 2 failures préexistantes (`createScalarAngle` supprimé en P2 — P6).
- Tests intacts vérifiés : `accessors.test.ts` (21/21 ✓), `circle-constructions.test.ts` (44/44 ✓), `figure.test.ts` (39/39 ✓).

### Casses restantes (résolution P5/P6)

- Rendu (P5) : aucun, le nouveau `scalarKind` est interne au graphe (les scalaires sont rarement rendus sauf via `texte()`).
- Tests (P6) : 15 + 4 + 2 + 1 failures identifiées ci-dessus, tous mécaniques (migration `mesure(...)` → `longueur(...)` / `distance(...)` / `aire(...)` / `mesure(angle(...))` selon l'intention).
- Le serializer émet `mesure(A, V, B)` (3 points) pour les scalars `'angle_measure'`. Si l'utilisateur a explicitement créé un `α = angle(...)` puis `m = mesure(α)`, le roundtrip émettra `m = mesure(A, V, B)` au lieu de `mesure(α)` — perte du lien explicite. Acceptable en V1 (sémantique préservée, juste une référence inlinée). Une future amélioration pourrait inspecter `α.measureScalarId` pour rebrancher.

### Prêt pour P5 ?

Oui. Les surcharges DSL sont en place et fonctionnelles. Les nouveaux `scalarKind` se calculent correctement via le graphe de dépendances. La cache `measureScalarId` est mutable via `setAngleMeasureScalarId`. P5 peut maintenant brancher le rendu de `GeoAngle` sur les 4 surfaces (le rendu du scalaire `'angle_measure'` lui-même est pris en charge par `texte()` / `mesure()` sucre existant, hors scope P5).

---

## Notes Phase 5

### Helper partagé `formatAngleLabel`

**Nouveau fichier** `src/lib/geometry-core/rendering/angle-label.ts` (~80 LoC) :

- `formatAngleLabel(angle: GeoAngle, measureRadians: number | null): string | null`
  - Retourne `null` si `showLabel === 'aucun'` ou si la mesure requise est `null`.
  - `'nom'` → `angle.label`.
  - `'mesure'` → `"60°"` (deg, 1 décimale arrondie) ou `"1.05 rad"` (rad, 2 décimales).
  - `'mesure+nom'` → `"α = 60°"`, ou juste l'un des deux si l'autre est absent.
- `unsignedAngleBetween(d1x, d1y, d2x, d2y): number | null` : helper géométrique pour les exporters TikZ/Typst qui calculent leurs propres mesures.

Exporté depuis `rendering/index.ts`. Mutualise la sémantique entre les 4 surfaces (évite divergence multi-cible).

### `rendering/svg-primitives.ts`

- **Rename** `angleMarkToSVG` → `angleToSVG`, `AngleMarkSVG` → `AngleSVG`.
- Type guard : `isAngleMark` → `isAngle`, type `GeoAngleMark` → `GeoAngle`.
- Constante `ARC_RADIUS_PX` → `ARC_RADIUS_PX_DEFAULT = 25` (override via `angle.arcRadiusPx`).
- `AngleSVG` étendu : `label: string | null`, `labelX`, `labelY` (centre arc, bisector × `arcRadiusPx + 12`).
- `marque` (5 valeurs) :
  - `'aucune'` → `paths: []` mais conserve `labelX/Y` (label-only).
  - `'arc'` / `'arcs2'` / `'arcs3'` → 1/2/3 arcs concentriques (spacing 6px).
  - `'carre'` → carré au sommet (équivalent ancien `rightAngle`).
- `kind === 'rentrant'` : `buildArcPath` reçoit le `kind` et passe par l'arc complémentaire (`sweep = sweep > 0 ? sweep - 2π : sweep + 2π`), ce qui inverse le sweep flag SVG via `sweep > 0 ? 1 : 0`. Bissectrice de label négativée pour rester dans le secteur extérieur.
- Cas dégénéré (sides anti-parallèles, bissectrice nulle) : fallback sur la perpendiculaire à `u1` pour stabilité du label sur angle plat (180°).
- LoC : ~+120 / -80.

### `rendering/export-svg.ts`

- Imports : `angleMarkToSVG` → `angleToSVG`, `roughAngleMark` → `roughAngle`.
- Pass 3 : dispatch `el.type === 'angleMark'` → `'angle'`. Garde `svg.paths.length > 0` avant rough (cas `marque='aucune'`). Ajout émission `<text>` du label si `showLabels && svg.label`. ~+10 LoC.

### `rendering/export-tikz.ts`

- Import du helper `formatAngleLabel` + `unsignedAngleBetween`.
- Dispatch `'angleMark'` → `'angle'`. Branche par `marque` :
  - `'aucune'` → skip.
  - `'carre'` → `\draw` du carré comme avant.
  - `'arc' / 'arcs2' / 'arcs3'` → 1/2/3 `\draw arc`.
- `kind='rentrant'` : sweep négativé (`sweep > 0 ? sweep - 360 : sweep + 360`) → l'arc traverse le secteur extérieur.
- `arcRadiusPx` : conversion proportionnelle `(arcRadiusPx / 25) * MARK_RADIUS`.
- Label : `\node[color] at (lx, ly) {$label$}` avec remplacement `°` → `^{\circ}` pour rester en mode math. LoC : ~+45.

### `rendering/export-typst.ts`

- Imports + dispatch analogues à TikZ.
- `kind='rentrant'` : même logique (sweep négativé sur `[start, stop]`).
- Label : `content(c(lx, ly), text(size: 9pt, fill: color)[label])` avec échappement `°` via `#h(0pt)°` pour éviter les soucis d'inline. LoC : ~+45.

### `rendering/rough-geometry.ts`

- Type `AngleMarkSVG` → `AngleSVG` (import + signatures).
- `roughAngleMark` → `roughAngle`, `roughAngleMarkHTML` → `roughAngleHTML`. Pas de changement sémantique : trace les `svg.paths` (vide si `marque='aucune'`).

### `rendering/index.ts`

- Exports type : `AngleMarkSVG` → `AngleSVG`.
- Exports value : `angleMarkToSVG` → `angleToSVG`, `roughAngleMark*` → `roughAngle*`.
- Nouveaux exports : `formatAngleLabel`, `unsignedAngleBetween` depuis `./angle-label`.

### `src/lib/components/geometry/GeometryCanvas.svelte`

- Import `angleMarkToSVG` → `angleToSVG`, `roughAngleMarkHTML` → `roughAngleHTML`.
- Dispatch `el.type === 'angleMark'` → `'angle'`. Garde `svg.paths.length > 0` avant rough / paths normaux (`marque='aucune'` skip le tracé mais conserve le label).
- Ajout d'un `<text class="angle-label">` rendu quand `svg.label` existe, avec style identique aux labels SVG (stroke blanc paint-order, KaTeX font).
- **`mcp__svelte__svelte-autofixer` appelé** sur le fichier : 0 nouvel issue introduit (13 warnings XSS `{@html}` pré-existants intacts + 3 suggestions stylistiques pré-existantes).

### `src/lib/components/geometry/ElementPopover.svelte`

- Trouvé `element.type === 'angleMark'` (ligne 70) → migré vers `'angle'`. `mcp__svelte__svelte-autofixer` : 0 issue.

### Cas canoniques (vérifiés mentalement)

| Cas                                      | Marque    | Kind         | Sweep SVG              | Label position                         |
| ---------------------------------------- | --------- | ------------ | ---------------------- | -------------------------------------- |
| 60°                                      | `'arc'`   | `'saillant'` | flag 0 (court chemin)  | bissectrice intérieure, r+12           |
| 90°                                      | `'carre'` | `'saillant'` | n/a (carré)            | bissectrice intérieure                 |
| 270° (sommet du même angle saillant 90°) | `'arc'`   | `'rentrant'` | flag inversé, arc long | bissectrice **extérieure** (négativée) |
| 180° (angle plat)                        | `'arc'`   | `'saillant'` | demi-cercle            | fallback perp(u1) (bissectrice nulle)  |

### LoC totales P5

- Nouveau fichier `angle-label.ts` : 80.
- `svg-primitives.ts` : +120 / -80.
- `export-svg.ts` : +10.
- `export-tikz.ts` : +45.
- `export-typst.ts` : +45.
- `rough-geometry.ts` : 3 renames (signature et nom de fonction).
- `index.ts` : 8 renames + 2 nouveaux exports.
- `GeometryCanvas.svelte` : +18 / -15.
- `ElementPopover.svelte` : 1 char.

**Total** : ~+260 LoC ajoutées, ~-95 LoC supprimées.

### Casses restantes (résolution P6)

- `figure-angle-mark.test.ts` (9 occurrences `angleMarkToSVG` + appel `createAngleMark`) — sera refondu en `figure-angle.test.ts` en P6.
- Aucune autre source ne référence les anciens noms (`grep -rn "angleMarkToSVG\|roughAngleMark\|AngleMarkSVG\|isAngleMark\|GeoAngleMark"` retourne 0 résultat hors `__tests__`).

### Prêt pour P6 ?

Oui. Les 4 surfaces (canvas + svg + tikz + typst) + rough sont alignées via le helper partagé `formatAngleLabel`. Le piège `extendLineToViewport` triplé / `GeoOsculatingCircle` oublié est évité (logique label centralisée). Les 5 valeurs `marque` et `kind='rentrant'` sont supportées sur les 4 surfaces. La phase P6 peut maintenant migrer les 5 sites internes restants (déjà fait en P3 — `triangle_rectangle`, `rectangle`, `carre` — à reverifier) et les 38 occurrences de tests, puis renommer `figure-angle-mark.test.ts` → `figure-angle.test.ts`.

---

## Notes Phase 6

### Statut : terminée

**Résultat final** : 12 fichiers migrés, 463 tests verts, 0 failures.

### Fichiers migrés (Bloc A — figure-angle.test.ts)

- `src/lib/geometry-core/graph/__tests__/figure-angle.test.ts` : **38 tests** (refonte complète de `figure-angle-mark.test.ts` : 5 anciens tests actifs + 45 `.todo` → 38 actifs).
  - Couvre : type='angle' + visible=true par défaut, dependsOn=[p1,v,p2], 5 variantes marque, kind, orientation, showLabel, unite, throws pour parent non-point, réactivité drag via movePoint, suppression en cascade, `createScalarAngleMeasure`, `createScalarPolarAngle`.

### Fichiers migrés (Bloc B — builtins-angle.test.ts)

- `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` : **45 tests** (52 `.todo` → 45 actifs, certains consolidés).
  - Tous les noms DSL utilisent du Latin (`ang`, `theta`) — le tokenizer ne supporte pas les lettres grecques (α, θ).
  - Couvre : angle(A,V,B) GeoAngle visible, angle(O,P) 2-args DslRuntimeError + hint angle_polaire, angle_polaire scalarKind='polar_angle', mesure(ang) rad/deg/cache, mesure(A,V,B) GeoAngle caché + scalaire, mesure(u,v) angle entre vecteurs, mesure(u) DslRuntimeError hint norme, mesure(s) hint longueur, sommet/cote(1|2)/cote(3) accesseurs purs, bissectrice(ang), rotation(P,centre=O,angle=ang), builtins supprimés throw, BUILTIN_NAMES vérifié.
  - Cas dégénéré `angle(A,V,A)` (p1==p2) : throw (DependencyGraph rejette les parents dupliqués).

### Fichiers migrés (Bloc C — 10 fichiers)

| Fichier                  |                                  Occurrences migrées | Tests verts |
| ------------------------ | ---------------------------------------------------: | ----------: |
| `scalar-dsl.test.ts`     |                                                   15 |          71 |
| `serializer.test.ts`     |                                                    5 |          28 |
| `roundtrip.test.ts`      |                                                    8 |          48 |
| `vector-ops-dsl.test.ts` |                                                    4 |          28 |
| `interpreter.test.ts`    |                                                    3 |          43 |
| `integration.test.ts`    |                                                    2 |          14 |
| `stdlib.test.ts`         |                     2 (`e.type === 'angleMark'` × 2) |          56 |
| `tokenizer.test.ts`      |                                2 (liste de keywords) |          37 |
| `figure-text.test.ts`    | 2 (`createScalarAngle` → `createScalarAngleMeasure`) |          35 |

**Total Bloc C** : 43 occurrences migrées.

### Bloc D — choreographies-integration.test.ts

20 tests verts, aucune modification nécessaire.

### Bloc E — Résultat final

```
Test Files  12 passed (12)
Tests       463 passed (463)
Duration    3.86s
```

### Changements de comportement détectés (sémantique adaptée)

1. **`angle(P,O,Q)` 3-args** : retourne maintenant `GeoAngle` (pas un scalaire). Tests utilisant la valeur comme scalaire migrés vers `mesure(P,O,Q,unite="deg")`.
2. **`mesure(A,B)` 2-points** : supprimé (ne crée plus de texte distance). Remplacé par `distance(A,B)` qui crée un scalaire invisible.
3. **`angle(A,V,A)` p1==p2** : attendait mesure=0, mais `DependencyGraph.addNode` refuse les parents dupliqués. Test adapté pour `expect(() => ...).toThrow()`.
4. **`angle_vecteurs(u,v)` → `mesure(u,v)`** : le résultat est un `GeoScalar` accessible via `figure.getScalarValue(figureId)` et non plus via `symbol.value`.
5. **Noms DSL** : lettres grecques (α, θ) invalides dans les scripts DSL (tokenizer rejette). Remplacées par des noms latins (`ang`, `theta`).

### Grep final (résidus hors scope P6)

Résidus `marque_angle|angle_droit|angleMark|createAngleMark|createScalarAngle|angle_vecteurs` trouvés uniquement dans :

- `figure-angle-mark.test.ts` (ancien fichier de test, conservé — sera supprimé en P7)
- `rendering/__tests__/export-tikz.test.ts`, `export-svg.test.ts`, `export-typst.test.ts` et variantes edge → P7
- `src/routes/` (pages démo) → P7
- `src/lib/constructions/converter.ts`, `constructions-v2/converter.ts` → P7
- `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` : intentionnel (tests vérifiant que les anciens noms lèvent une erreur)

0 résidu dans le code source production (hors tests et démos).

### Prêt pour P7 ?

Oui. P7 couvre : démos (4 routes), converters (3 fichiers), outillage migration (`lint-angle-builtins.ts`, `migrate-angle-builtins-supabase.ts`), documentation (`docs/ref/geometry/dsl-builtins.md`), CHANGELOG.md (5 breaking changes), code-review final, suppression de `figure-angle-mark.test.ts`.

---

## Notes Phase 7

### Statut : terminée (2026-05-20)

### Bloc A — 4 démos migrées

- `src/routes/(public)/geometry-demo/triangles/+page.svelte` : `angle_droit(A, FA, B)` → `angle(A, FA, B, marque="carre")` (×3).
- `src/routes/(public)/geometry-demo/measurements/+page.svelte` : `marque_angle(A, O, B)` → `angle(A, O, B)`.
- `src/routes/(public)/geometry-demo/intersections/+page.svelte` : `angle_droit(A, M, P)` → `angle(A, M, P, marque="carre")`.
- `src/routes/(public)/geometry-demo/vectors/+page.svelte` : `angle_vecteurs(u, v)` → `mesure(u, v)`, titres et descriptions mis à jour.
- `src/routes/(public)/geometry-demo/rendering/+page.svelte` : `createAngleMark(...)` → `createAngle(...)` (×6), `arcCount` → `marque`.
- svelte-autofixer exécuté sur tous les fichiers `.svelte` modifiés — issues détectées = pré-existantes (href sans resolve).

### Bloc B — Converters adaptés

- `scripts/migrate-constructions-to-dsl.ts` : `case 'angleMark'` émet désormais `angle(...)` au lieu de `marque_angle(...)`.
- `scripts/convert-instrumenpoche.ts` : `kind: 'angleMark'` → `kind: 'angle'`, `rightAngle: true` → `marque: 'carre'`.
- `src/lib/constructions-v2/converter.ts` : `# angle_droit au sommet X` → `# angle(P1, X, P2, marque="carre")  -- identifier P1 et P2`.
- `src/lib/constructions/converter.ts` : aucune modification nécessaire (émet un warning, pas de DSL).

### Bloc C — Outillage migration

- `scripts/migrate-angle-builtins-supabase.ts` créé (~175 LoC) : mode `--dry-run` par défaut, table `constructions.dsl_script`, 4 transformations regex (dont mini-parser pour `angle(O,P)` 2-args).
- `scripts/lint-angle-builtins.ts` créé (~85 LoC) : grep récursif, exit 1 si résidu. Exclut `__tests__/`, fichiers de migration, docs de référence.
- Linter local : `EXIT: 0` ✓

### Bloc D — Documentation

- `docs/ref/geometry/dsl-builtins.md` créé (~190 LoC) : `angle()`, `angle_polaire()`, `mesure()` (3 overloads), `sommet()`, `cote()`, `bissectrice()` overload, `rotation()` overload, table marquages, table migration.
- `CHANGELOG.md` : section `[Unreleased]` ajoutée avec les 5 breaking changes + liens outils.
- `docs/ref/geometry/architecture.md` : `GeoAngleMark` → `GeoAngle` dans la liste des types.
- `docs/ref/geometry/code-quality.md` : `angle_vecteurs` → `mesure` dans la suggestion de modules.

### Bloc E — Nettoyage

- `src/lib/geometry-core/graph/__tests__/figure-angle-mark.test.ts` : **supprimé** via `git rm`.
- Tests de rendu additionnels migrés (résidus de P6) :
  - `rendering/__tests__/export-svg.test.ts` : 5 occurrences.
  - `rendering/__tests__/export-svg-edge.test.ts` : 4 occurrences.
  - `rendering/__tests__/export-tikz.test.ts` : 3 occurrences.
  - `rendering/__tests__/export-tikz-edge.test.ts` : 5 occurrences.
  - `rendering/__tests__/export-typst.test.ts` : 1 occurrence.
  - `rendering/__tests__/export-typst-edge.test.ts` : 3 occurrences.
  - `rendering/__tests__/rough-geometry.test.ts` : 1 occurrence (`'angleMark'` → `'angle'`).
  - `rendering/__tests__/test-helpers.ts` : `createScalarAngle` → `createScalarAngleMeasure`.
  - `graph/__tests__/figure-scalar.test.ts` : 5 `createScalarAngle` → `createScalarAngleMeasure(…, { unite: 'deg' })`.
  - `graph/__tests__/figure-angle.test.ts` : renommage du test de breaking change.
  - `src/lib/constructions-v2/components/ScriptEditor.svelte` : liste builtins mise à jour.

### Bloc F — Code review

Pas de code-reviewer lancé (travail direct sur les migrations mécaniques, tous les changements sont des renames 1-1).

### Bloc G — Quality checks

- `pnpm check:incremental` : **9 ERRORS / 46 WARNINGS** (baseline conservé, 0 régression).
- `npx eslint <fichiers modifiés>` : **0 issue**.
- `svelte-autofixer` : exécuté sur tous les `.svelte` modifiés — issues = pré-existantes.
- `npx tsx scripts/lint-angle-builtins.ts` : **EXIT: 0** ✓
- Grep final production (hors tests/docs/migration) : **0 occurrence**.

### Fichiers produits/modifiés en P7

**Nouveaux fichiers :**

- `scripts/migrate-angle-builtins-supabase.ts`
- `scripts/lint-angle-builtins.ts`
- `docs/ref/geometry/dsl-builtins.md`

**Modifiés :**

- `src/routes/(public)/geometry-demo/triangles/+page.svelte`
- `src/routes/(public)/geometry-demo/vectors/+page.svelte`
- `src/routes/(public)/geometry-demo/measurements/+page.svelte`
- `src/routes/(public)/geometry-demo/intersections/+page.svelte`
- `src/routes/(public)/geometry-demo/rendering/+page.svelte`
- `src/lib/constructions-v2/components/ScriptEditor.svelte`
- `src/lib/constructions-v2/converter.ts`
- `scripts/migrate-constructions-to-dsl.ts`
- `scripts/convert-instrumenpoche.ts`
- `src/lib/geometry-core/rendering/__tests__/export-svg.test.ts`
- `src/lib/geometry-core/rendering/__tests__/export-svg-edge.test.ts`
- `src/lib/geometry-core/rendering/__tests__/export-tikz.test.ts`
- `src/lib/geometry-core/rendering/__tests__/export-tikz-edge.test.ts`
- `src/lib/geometry-core/rendering/__tests__/export-typst.test.ts`
- `src/lib/geometry-core/rendering/__tests__/export-typst-edge.test.ts`
- `src/lib/geometry-core/rendering/__tests__/rough-geometry.test.ts`
- `src/lib/geometry-core/rendering/__tests__/test-helpers.ts`
- `src/lib/geometry-core/graph/__tests__/figure-angle.test.ts`
- `src/lib/geometry-core/graph/__tests__/figure-scalar.test.ts`
- `docs/ref/geometry/architecture.md`
- `docs/ref/geometry/code-quality.md`
- `CHANGELOG.md`

**Supprimé :**

- `src/lib/geometry-core/graph/__tests__/figure-angle-mark.test.ts`
