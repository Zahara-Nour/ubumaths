# Angle V2 — Overloads `angle(u,v)` / `angle(seg1,seg2)` / `angle(d1,d2)` + dette tech

## Objectif

Étendre les **constructeurs** de l'objet `GeoAngle` (livré en V1 / `v0.9.1`) avec
3 nouvelles signatures :

- `angle(u, v)` — entre 2 vecteurs.
- `angle(seg1, seg2)` — entre 2 segments.
- `angle(d1, d2)` — entre 2 droites (convention angle aigu).

Toutes produisent un `GeoAngle` (3 points internes invisibles si nécessaire),
réutilisant intégralement le rendu / les accesseurs / les surcharges V1
(`mesure(α)`, `sommet(α)`, `cote(α, i)`, `bissectrice(α)`, `rotation(P, α, O)`).

V2 inclut aussi 4 findings de code-review V1 non bloquants à éliminer avant
la 1.0 :

- **B2** : dédup `mesure(A, V, B)` par tuple (cache).
- **B5** : serializer préserve `α → mesure(α)` (lien explicite, pas inliné).
- **D1** : `requireEnumNamed` rend le `callerName` obligatoire (qualité d'erreurs).
- **D3** : helper partagé `computeBisectorDirection` (déduplication des 3 surfaces de rendu).

Ajout fonctionnel léger :

- `arcSpacingPx` named arg (espacement entre arcs multiples pour
  `marque='arcs2' | 'arcs3'`), défaut 6 px.

**Hors scope V2** (différé V3) : la chorégraphie `bissectrice @euclide`
étendue pour `bissectrice(GeoAngle)` (toujours utilisable avec 3 points).

## Documents sources

- Plan d'implémentation : `~/.claude/plans/lucky-watching-fairy.md`
- Étude v2 (finale) : [`docs/wip/geometry/study-angle-object-v2.md`](./study-angle-object-v2.md)
- Progress V1 : [`docs/wip/geometry/angle-v1-progress.md`](./angle-v1-progress.md)
- Reference DSL : [`docs/ref/geometry/dsl-builtins.md`](../../ref/geometry/dsl-builtins.md)

## Statut des phases

| #   | Phase                                                                                          | Statut       |
| --- | ---------------------------------------------------------------------------------------------- | ------------ |
| P0  | Spec TDD + tests rouges                                                                        | **terminée** |
| P1  | Dette tech D1 (`requireEnumNamed` callerName) + D3 (helper `computeBisectorDirection` partagé) | **terminée** |
| P2  | Overloads `angle(u,v)` + `angle(seg1,seg2)` + `angle(d1,d2)` (dispatch + points synthétiques)  | à faire      |
| P3  | `arcSpacingPx` paramétrable + dette tech B2 (dédup `mesure(A, V, B)` par tuple)                | à faire      |
| P4  | Dette tech B5 (serializer `α → mesure(α)`) + tests intégration + doc V2                        | à faire      |

---

## Comportements attendus V2

### 1. Constructeur `angle(u, v)` — 2 vecteurs

`α = angle(u, v)` retourne un `GeoAngle` visible (par défaut `marque='arc'`,
`showLabel='aucun'`, `kind='saillant'`). Les 3 points internes du triplet
(`vertexId, p1Id, p2Id`) sont construits selon les 4 cas de figure :

| Cas | `u`                           | `v`                                                    | Vertex                                                                                                  | `p1`                                                      | `p2`                                                      |
| --- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| (a) | bound `vectorByPoints(P, Q1)` | bound `vectorByPoints(P, Q2)` partage point commun `P` | `P` (réutilisé)                                                                                         | `Q1` (réutilisé)                                          | `Q2` (réutilisé)                                          |
| (b) | bound `vectorByPoints(P, Q1)` | bound `vectorByPoints(R, Q2)` sans point commun        | point synthétique invisible à `u.startId` (`P`)                                                         | `u.endId` (`Q1`)                                          | point synthétique invisible à `vertex + v`                |
| (c) | bound + free                  | free + bound                                           | mix : vertex = origine du bound ; `p1` = autre extrémité du bound ; `p2` = vertex + composantes du free |                                                           |                                                           |
| (d) | free + free                   | —                                                      | vertex = point synthétique invisible à `(0, 0)`                                                         | vertex + composantes de `u` (point synthétique invisible) | vertex + composantes de `v` (point synthétique invisible) |

**Mesure attendue** : angle non orienté dans `[0, π]` via
`acos((u · v) / (|u| * |v|))`. La sémantique reste celle du V1
`mesure(u, v)` (scalarKind `'vectors_angle_measure'`) mais matérialisée
en tant que **GeoAngle**, donc rendable.

**Drag** : drag d'un point ancré → recalcule le triplet → arc et mesure
suivent. Cas (d) : les points synthétiques sont des `freePoint` invisibles
dont la position dépend des composantes des vecteurs libres via le graphe
de dépendances ; aucun drag direct possible sur eux (`draggable: false`).

### 2. Constructeur `angle(seg1, seg2)` — 2 segments

`α = angle(s1, s2)` retourne un `GeoAngle` visible. 3 cas :

| Cas | Configuration                        | Vertex                                                                              | `p1`                                                                | `p2`                                  |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- | ----------------------- |
| (a) | extrémité commune `P`                | `P` (réutilisé)                                                                     | autre extrémité de `s1`                                             | autre extrémité de `s2`               |
| (b) | segments sécants en `I`              | point synthétique à `I` (calculé via `intersectLL` projeté sur les droites support) | extrémité de `s1` la plus loin de `I` (point synthétique si besoin) | extrémité de `s2` la plus loin de `I` |
| (c) | segments **parallèles** ou confondus | —                                                                                   | —                                                                   | —                                     | **→ `DslRuntimeError`** |

**Erreur structurée** pour (c) :

```
summary : `angle(seg1, seg2)` : les 2 segments sont parallèles, l'angle n'est pas défini.
hint    : utilise `angle(d1, d2)` si tu veux la mesure entre 2 droites parallèles
          (qui vaut 0 par convention) ou réordonne les segments.
forms   : [
  { syntax: 'angle(A, V, B)',         description: 'angle par 3 points' },
  { syntax: 'angle(u, v)',            description: 'angle entre 2 vecteurs' },
  { syntax: 'angle(seg1, seg2)',      description: 'angle entre 2 segments sécants' },
  { syntax: 'angle(d1, d2)',          description: 'angle entre 2 droites sécantes' }
]
```

**Note implémentation P2** : on doit obtenir l'intersection des 2 droites
support des segments (pas l'intersection des segments eux-mêmes, qui peut
être vide même si les droites se coupent). Réutiliser `intersectLL` de
`geometry/intersections.ts`.

### 3. Constructeur `angle(d1, d2)` — 2 droites

`α = angle(d1, d2)` retourne un `GeoAngle` visible. La convention
**angle aigu** s'applique : la mesure retournée par `mesure(α)` est dans
`[0, π/2]`.

| Cas | Configuration                        | Vertex                                      | `p1`                               | `p2`                                                                                      |
| --- | ------------------------------------ | ------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| (a) | droites sécantes en `I`              | point synthétique à `I` (via `intersectLL`) | point synthétique à `I + unit(d1)` | point synthétique à `I + unit(d2)`, **swappé en `I - unit(d2)` si la mesure naïve > π/2** |
| (b) | droites **parallèles** ou confondues | —                                           | —                                  | —                                                                                         | **→ `DslRuntimeError`** |

**Swap pour angle aigu** (cas a) : après construction initiale, si
`acos((u1 · u2) / 1) > π/2`, alors on remplace `p2 = I - unit(d2)` pour
forcer l'angle dans `[0, π/2]`. La représentation reste un triplet de
points classique, donc le rendu V1 marche tel quel.

**Erreur structurée** pour (b) :

```
summary : `angle(d1, d2)` : les 2 droites sont parallèles, l'angle n'est pas défini.
hint    : 2 droites parallèles ont un angle de 0 (convention). Utilise `mesure(0)`
          ou réordonne les droites.
forms   : [...4 formes d'angle...]
```

### 4. Named arg `arcSpacingPx`

Espacement (en pixels) entre les arcs multiples pour `marque='arcs2'` et
`marque='arcs3'`. Défaut 6 (constante actuelle `ARC_SPACING_PX` dans
`svg-primitives.ts`).

- Accepté sur **toutes** les formes de `angle(...)` (3 points, 2 vecteurs,
  2 segments, 2 droites).
- Stocké sur le `GeoAngle` (champ optionnel `arcSpacingPx?: number`).
- Lu par les 3 renderers (`svg-primitives.ts`, `export-tikz.ts`,
  `export-typst.ts`).
- Valeurs invalides (≤ 0, NaN) → `DslRuntimeError` structurée.

### 5. Dette tech B2 — Dédup `mesure(A, V, B)` par tuple

**Problème V1** : chaque appel à `mesure(A, V, B)` (cas 3 points où le
GeoAngle est créé en interne) crée un **nouveau** `GeoAngle` invisible +
un nouveau scalaire de mesure, même si le triplet `(A, V, B)` est identique.

**Attendu V2** : 2 appels successifs `mesure(A, V, B)` sur le même triplet
retournent le **même** scalarId (cache au niveau de la `Figure`).

- Map privée `hiddenAngleByTriplet: Map<string, string>` keyée par
  `${p1Id}|${vertexId}|${p2Id}` → `angleId`.
- Méthode `figure.createHiddenAngleFor(p1, v, p2): GeoAngle` qui retourne
  l'angle caché existant ou en crée un nouveau et l'enregistre.
- `handleMesure` (branche 3-points) appelle cette méthode au lieu de
  `createAngle({marque:'aucune'}) + hideElement`.

### 6. Dette tech B5 — Serializer préserve `α → mesure(α)`

**Problème V1** : `α = angle(A, V, B); m = mesure(α)` → après serialize

- reparse, on obtient `m = mesure(A, V, B)` (3 points inlinés), perdant
  le lien explicite vers `α`.

**Attendu V2** : roundtrip idempotent. Le serializer inspecte
`figure.findAngleByMeasureScalarId(scalarId)` ; si trouvé, émet
`mesure(α)` (où `α` est le nom du binding actuel) au lieu de
`mesure(A, V, B)`.

- Helper `figure.findAngleByMeasureScalarId(scalarId): GeoAngle | undefined`
  qui inverse le cache `measureScalarIds`.
- Branche dans `dsl/serializer.ts` du case `scalar` / `scalarKind: 'angle_measure'`.
- Cas fallback : si l'angle est invisible (créé par `mesure(A, V, B)` direct,
  donc sans binding nommé), garder l'émission 3 points actuelle.

### 7. Dette tech D1 — `requireEnumNamed` callerName obligatoire

**Problème V1** : signature `requireEnumNamed<T>(named, key, allowedSet, line, callerName = 'angle')`
→ le défaut `'angle'` est trompeur pour les autres callers.

**Attendu V2** : retirer le défaut, rendre `callerName` obligatoire.
Audit des 5-6 sites d'appel et passage du nom explicite (`'angle'`,
`'mesure'`, etc.).

### 8. Dette tech D3 — Helper `computeBisectorDirection` partagé

**Problème V1** : la logique de calcul du vecteur bissecteur (direction du
label de mesure) est dupliquée 3 fois dans `svg-primitives.ts:angleToSVG`,
`export-tikz.ts` (branche angle) et `export-typst.ts` (branche angle).

**Attendu V2** : nouveau fichier `rendering/bisector-direction.ts` exportant :

```ts
export function computeBisectorDirection(
	d1x: number,
	d1y: number,
	d2x: number,
	d2y: number,
	kind: 'saillant' | 'rentrant'
): { bisX: number; bisY: number; blen: number };
```

Les 3 sites appellent ce helper au lieu de reconstruire le calcul.

---

## Cas dégénérés V2

| Cas                                      | Comportement attendu                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `angle(u, 0)` (vecteur nul)              | `DslRuntimeError` : « vecteur de norme nulle, angle indéterminé » |
| `angle(0, v)` (vecteur nul)              | idem                                                              |
| `angle(u, u)` (vecteurs identiques)      | mesure = 0, rendu OK (arc minuscule), pas d'erreur                |
| `angle(u, -u)` (vecteurs antiparallèles) | mesure = π, rendu demi-cercle                                     |
| `angle(s, s)` (segments confondus)       | mesure = 0, rendu OK                                              |
| `angle(s1, s2)` parallèles non confondus | `DslRuntimeError` structurée (voir §2)                            |
| `angle(d, d)` (droites confondues)       | `DslRuntimeError` (parallèles)                                    |
| `angle(d1, d2)` perpendiculaires         | mesure = π/2, rendu OK (convention angle aigu inclut π/2)         |
| `arcSpacingPx = 0`                       | refus `DslRuntimeError` : valeur strictement positive attendue    |
| `arcSpacingPx < 0`                       | refus `DslRuntimeError`                                           |
| `arcSpacingPx = NaN`                     | refus `DslRuntimeError`                                           |
| 1 vecteur + 1 segment (mix types)        | `DslRuntimeError` structurée listant les 4 formes acceptées       |
| 1 vecteur + 1 droite (mix types)         | idem                                                              |
| `angle()` 0 args                         | `DslRuntimeError` structurée                                      |
| `angle(A)` 1 arg                         | `DslRuntimeError` structurée                                      |
| `angle(A, B, C, D)` 4 args               | `DslRuntimeError` structurée                                      |

---

## Fichiers à toucher

### Phase 1 — Dette tech D1 + D3

- `src/lib/geometry-core/dsl/builtins.ts` : `requireEnumNamed` signature changée + audit sites d'appel (D1).
- `src/lib/geometry-core/rendering/bisector-direction.ts` : **nouveau** helper (D3).
- `src/lib/geometry-core/rendering/svg-primitives.ts` : `angleToSVG` utilise le helper.
- `src/lib/geometry-core/rendering/export-tikz.ts` : branche angle utilise le helper.
- `src/lib/geometry-core/rendering/export-typst.ts` : branche angle utilise le helper.

### Phase 2 — Overloads `angle(u,v)` / `angle(seg1,seg2)` / `angle(d1,d2)`

- `src/lib/geometry-core/dsl/builtins.ts` :
  - `handleAngle` dispatch enrichi (3 args → V1 ; 2 args → type guards).
  - Helpers privés : `handleAngleVectors`, `handleAngleSegments`, `handleAngleLines`.
  - Réutilisation des helpers existants : `createHiddenPoint`, `intersectLL`, type guards (`isVector`, `isSegment`, `isLine`).
- `src/lib/geometry-core/types/elements.ts` : type guards `isVector` (peut nécessiter un alias couvrant `vectorByPoints` + `freeVector`).
- `src/lib/geometry-core/geometry/intersections.ts` : vérifier que `intersectLL` est exporté (sinon le rendre public).

### Phase 3 — `arcSpacingPx` + dette tech B2

- `src/lib/geometry-core/types/elements.ts` : champ optionnel `arcSpacingPx?: number` sur `GeoAngle`.
- `src/lib/geometry-core/types/schemas.ts` : Zod schema étendu.
- `src/lib/geometry-core/graph/figure.ts` :
  - `createAngle` signature étendue avec `arcSpacingPx`.
  - Méthode `createHiddenAngleFor(p1, v, p2)` (B2) + map privée `hiddenAngleByTriplet`.
- `src/lib/geometry-core/dsl/builtins.ts` :
  - `handleAngle` lit `arcSpacingPx` via `requireNumber` (toutes les overloads).
  - `handleMesure` (branche 3-points) appelle `createHiddenAngleFor` (B2).
- `src/lib/geometry-core/rendering/svg-primitives.ts` : `ARC_SPACING_PX` → `angle.arcSpacingPx ?? 6`.
- `src/lib/geometry-core/rendering/export-tikz.ts` : idem.
- `src/lib/geometry-core/rendering/export-typst.ts` : idem.

### Phase 4 — B5 serializer + tests intégration + doc

- `src/lib/geometry-core/graph/figure.ts` : helper `findAngleByMeasureScalarId(scalarId): GeoAngle | undefined`.
- `src/lib/geometry-core/dsl/serializer.ts` : branche `scalarKind: 'angle_measure'` émet `mesure(α)` si lien retrouvé.
- `src/lib/geometry-core/rendering/__tests__/angle-canonical-cases.test.ts` : ajouts 3 cas par type (`angle(u,v)` 60°, `angle(seg1,seg2)` 90°, `angle(d1,d2)` 45°).
- `docs/ref/geometry/dsl-builtins.md` : section `angle` étendue avec les 3 overloads.
- `CHANGELOG.md` : section `[Unreleased]` → `v0.10.0`.

### Tests (toutes phases)

- `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` : extension P0 (~30 tests `.todo` ajoutés).
- `src/lib/geometry-core/dsl/__tests__/builtins-angle-overloads.test.ts` : **nouveau** fichier P0 (~150 LoC, tests sémantiques).

---

## Notes Phase 0

(à compléter en fin de P0)

- Tests rouges écrits dans `builtins-angle.test.ts` (extension) et
  `builtins-angle-overloads.test.ts` (nouveau).
- Tests utilisent `it.todo()` pour les comportements qui dépendent des
  futurs handlers (P2/P3/P4).
- Tests compilent en TypeScript (imports valides) mais restent skipped à
  l'exécution.
- Aucune modification du code source en Phase 0.

---

## Notes Phase 1

- **D1 — `requireEnumNamed` callerName obligatoire** : défaut `'angle'` retiré, paramètre rendu obligatoire. 6 sites d'appel mis à jour : 5 dans `handleAngle` (→ `'angle'`) et 1 dans `readMesureUnite` (→ `'mesure'`, déjà explicite).
- **D3 — Helper `computeBisectorDirection`** : nouveau fichier `rendering/bisector-direction.ts` (~60 LoC). Reproduit exactement la formule des 3 sites originaux (average unit vectors + fallback perpendiculaire si anti-parallèle + négation pour `'rentrant'`). Retourne `null` si vecteur dégénéré (longueur < 1e-10). Réexporté depuis `rendering/index.ts`.
- **3 sites adaptés** : `svg-primitives.ts:angleToSVG`, `export-tikz.ts` (branche label angle), `export-typst.ts` (branche label angle).
- **Résultats tests (0 régression)** :
  - `figure-angle.test.ts` : 39/39 passed
  - `builtins-angle.test.ts` : 46 passed | 44 todo (skipped P2-P4)
  - `angle-canonical-cases.test.ts` : 9/9 passed
  - `export-svg.test.ts` : 31 passed | 1 failed (pré-existant, non lié)
  - `export-tikz.test.ts` : 26 passed | 1 failed (pré-existant, non lié)
  - `export-typst.test.ts` : 12/12 passed
- **Fichiers modifiés** :
  - `src/lib/geometry-core/dsl/builtins.ts` (D1 : signature + 5 call sites)
  - `src/lib/geometry-core/rendering/bisector-direction.ts` (nouveau, D3)
  - `src/lib/geometry-core/rendering/svg-primitives.ts` (D3 : use helper)
  - `src/lib/geometry-core/rendering/export-tikz.ts` (D3 : use helper)
  - `src/lib/geometry-core/rendering/export-typst.ts` (D3 : use helper)
  - `src/lib/geometry-core/rendering/index.ts` (re-export du helper D3)
