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
| P0  | Spec TDD + tests rouges                                                                | **en cours** |
| P1  | Types & schemas (rename `GeoAngleMark` → `GeoAngle`)                                   | à faire      |
| P2  | Factory `figure.createAngle()` + `compute-position.ts`                                 | à faire      |
| P3  | DSL : suppressions + refonte `angle()` + `angle_polaire()`                             | à faire      |
| P4  | DSL : accesseurs (`cote`, `sommet`) + surcharges (`mesure`, `bissectrice`, `rotation`) | à faire      |
| P5  | Rendu sur 4 surfaces (canvas, SVG, TikZ, Typst) + rough                                | à faire      |
| P6  | Migration 5 sites internes + 38 occurrences tests                                      | à faire      |
| P7  | Démos + converters + outillage migration + doc + code-review final                     | à faire      |

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

## Notes Phase 0

- Tests rouges écrits dans `figure-angle.test.ts` (nouveaux comportements de la factory `createAngle`) et `builtins-angle.test.ts` (handlers DSL).
- Les tests utilisent `it.todo()` pour les comportements qui dépendent de types ou de builtins futurs (Phases 1-4).
- Les tests doivent compiler en TypeScript mais échouer à l'exécution (factory `createAngle` n'existe pas encore, builtin `angle_polaire` n'existe pas encore, etc.).
- Aucune modification du code source en Phase 0.
