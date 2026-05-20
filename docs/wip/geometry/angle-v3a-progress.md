# Angle V3a — `transporte(α, V', direction)` + `fill` secteur + chorégraphie `bissectrice(angle)`

## Objectif

Compléter la trilogie de l'objet `GeoAngle` (V1 = première classe, V2 = overloads
constructeurs + dette tech) avec **3 features pédagogiques** :

1. **Builtin `transporte(α, V', direction)`** — construction au compas du report
   d'angle (figure très utilisée du collège au lycée). Retourne un nouveau
   `GeoAngle` au sommet `V'`, de même mesure que `α`, orienté dans la
   `direction` choisie.
2. **Marquage `fill` du secteur angulaire** — réutilise `style.fillColor` /
   `style.fillOpacity` existants (cohérent avec `polygone`, `cercle`, etc.).
   Pas de nouveau champ. Le rendu génère une path supplémentaire fermée
   (`M V L p1 A ... p2 Z`) quand `marque ∈ {'arc','arcs2','arcs3'}` ET
   `fillColor` est défini.
3. **Chorégraphie `bissectrice(angle) @euclide` étendue** — détecte un
   `GeoAngle` en input, extrait `(p1, vertex, p2)`, et délègue au flow
   d'animation V2 existant. **Aucune nouvelle animation**, juste un dispatch
   d'input.

**Hors scope V3a** (différé V3.5/V3.6) :

- Chorégraphie `transporte @euclide` animée (lourde, ~600 LoC chorégraphique).
- Drag réactif des sources `angle(u, v)` (limitation V2 connue).
- Refactor `extendLineToViewport` triplée + helper rendu unique.

## Documents sources

- Plan d'implémentation : `~/.claude/plans/lucky-watching-fairy.md`
- Progress V2 (référence pour structure et style) : [`docs/wip/geometry/angle-v2-progress.md`](./angle-v2-progress.md)
- Progress V1 : [`docs/wip/geometry/angle-v1-progress.md`](./angle-v1-progress.md)
- Reference DSL : [`docs/ref/geometry/dsl-builtins.md`](../../ref/geometry/dsl-builtins.md)

## Statut des phases

| #   | Phase                                                                                      | Statut       |
| --- | ------------------------------------------------------------------------------------------ | ------------ |
| P0  | Spec TDD + tests rouges                                                                    | terminée     |
| P1  | Builtin `transporte` + factory (héritage style + 4 signatures direction)                   | **terminée** |
| P2  | Rendu `fill` du secteur sur 4 surfaces (canvas + SVG + TikZ + Typst)                       | à faire      |
| P3  | Chorégraphie `bissectrice(angle)` extension (dispatch input `GeoAngle` → flow V2 existant) | **terminée** |
| P4  | Tests intégration + CHANGELOG + doc V3a + release `v0.9.3` (ou `v0.10.1`)                  | à faire      |

---

## Comportements attendus V3a

### 1. Builtin `transporte(α, V', direction)`

`transporte` construit un nouveau `GeoAngle` au sommet `V'` de **même mesure**
que `α`, orienté dans une direction au choix.

#### Signatures DSL

| #   | Signature                    | Direction du nouveau côté 1                                |
| --- | ---------------------------- | ---------------------------------------------------------- |
| 1   | `transporte(α, V')`          | Axe `Ox` par défaut → `d̂ = (1, 0)`                         |
| 2   | `transporte(α, V', P)`       | Rayon `V' → P` → `d̂ = unit(P − V')`                        |
| 3   | `transporte(α, V', vec=v)`   | Vecteur `v` (bound ou free) → `d̂ = unit(v)`                |
| 4   | `transporte(α, V', angle=θ)` | Angle polaire `θ` en **mode courant** → `d̂ = (cosθ, sinθ)` |

Les options nommées `vec=` et `angle=` sont mutuellement exclusives entre elles
et avec la signature à 3 positionnels (sinon `DslRuntimeError`).

#### Sémantique attendue

1. Lire `α` : extraire `(p1, vertex, p2)`. Calculer `mesure(α)` en radians
   (sens conservé, donc `interior` éventuellement augmenté à `2π − interior`
   pour `kind='rentrant'`).
2. Calculer la direction `d̂` unitaire au nouveau sommet `V'`.
3. Créer 2 points témoins synthétiques invisibles non draggables :
   - `p1' = V' + d̂` (côté 1 du nouvel angle, sur le rayon direction)
   - `p2' = rotation(p1', V', mesure(α))` — rotation autour de `V'` d'angle
     égal à `mesure(α)`.
4. Construire le `GeoAngle` : `figure.createAngle(p1', V', p2', options)`.

#### Héritage de style

Le nouveau `GeoAngle` **hérite** des options de `α` non explicitement
overridées :

- `marque` (arc, arcs2, arcs3, carre, aucune)
- `kind` (saillant, rentrant)
- `showLabel` (aucun, mesure)
- `unite` (rad, deg)
- `arcRadiusPx` / `arcSpacingPx`
- `style.fillColor` / `style.fillOpacity` (V3a P2)
- Couleurs de trait, opacités, épaisseur, etc.

**Override possible** via options nommées au call site :

```
β = transporte(α, V', P, marque="carre")     # force marque carrée
β = transporte(α, V', vec=v, fill_color="red", opacite_fond=0.3)
```

#### Retour

Un seul objet : le nouveau `GeoAngle` `β`. Les 2 points témoins `p1'`/`p2'`
sont créés invisibles (pas de pollution UI).

#### Cas dégénérés

| Cas                                       | Comportement attendu                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `V' == vertex(α)` (sommets confondus)     | `DslRuntimeError` structurée : « le nouveau sommet est confondu avec celui de α » |
| `transporte(α, V', P)` avec `P == V'`     | `DslRuntimeError` : « direction nulle (P confondu avec V') »                      |
| `transporte(α, V', vec=v)` avec `‖v‖ = 0` | `DslRuntimeError` : « vecteur direction de norme nulle »                          |
| `α` mesure 0 (angle plat fermé)           | mesure 0 propagée, p1'=p2' à `V' + d̂` (rendu correct via arc minuscule)           |
| `α` mesure π (antiparallèles)             | mesure π propagée, p2' à `V' − d̂` (rendu demi-cercle)                             |
| `α` rentrant                              | mesure `2π − interior` propagée, `kind='rentrant'` hérité par défaut sur `β`      |
| `transporte(α, V')` sans direction        | défaut axe Ox (`d̂ = (1, 0)`), pas d'erreur                                        |
| Argument 1 != `GeoAngle`                  | `DslRuntimeError` structurée listant la signature attendue                        |
| Argument 2 != point                       | `DslRuntimeError` structurée                                                      |
| `vec=` + `angle=` ensemble                | `DslRuntimeError` : options mutuellement exclusives                               |
| `vec=` + 3e positionnel ensemble          | `DslRuntimeError` : direction multipliée                                          |

#### Forms (pour erreurs structurées)

```
forms : [
  { syntax: 'transporte(α, V\')',           description: 'report sur l\'axe Ox' },
  { syntax: 'transporte(α, V\', P)',        description: 'direction = rayon V\'→P' },
  { syntax: 'transporte(α, V\', vec=v)',    description: 'direction = vecteur v' },
  { syntax: 'transporte(α, V\', angle=θ)',  description: 'direction = angle polaire θ (mode courant)' }
]
```

### 2. Marquage `fill` du secteur

#### Décision : pas de nouveau champ

`GeoAngle` (depuis V1) hérite déjà du `style` commun via `el.style`. On exploite
`style.fillColor` et `style.fillOpacity` (déjà résolus par `resolveStyle` dans
`svg-primitives.ts`). Cohérence avec `polygone`, `cercle`, etc.

#### Conditions de rendu

Le secteur fermé est rendu **si et seulement si** :

1. `marque ∈ {'arc', 'arcs2', 'arcs3'}`
2. `style.fillColor` est défini (non `undefined`)
3. Le secteur est non dégénéré (mesure > 0)

#### Convention

- `marque='carre'` (angle droit) → **ignore `fillColor`** (carré, pas secteur).
  Documenter dans `dsl-builtins.md`.
- `marque='aucune'` → pas de fill (pas d'arc à fermer).
- `marque='arcs2'` ou `'arcs3'` → **un seul fill** sur le rayon de l'arc le
  plus extérieur (les arcs concentriques restent traits par-dessus).

#### Construction de la path

Pour `marque='arc'`, secteur = `M Vx Vy L p1Ax p1Ay A rx ry 0 0 sweepFlag p2Ax p2Ay Z`
où `p1A`/`p2A` sont les points de l'arc à rayon `arcRadiusPx` et `sweepFlag`
dépend de `kind='saillant'|'rentrant'` (même valeur que pour l'arc visuel).

Le `fill-opacity` provient de `style.fillOpacity` (défaut 1 si `fillColor`
défini, 0 sinon — convention existante de `resolveStyle`).

#### Ordre de rendu

`<path d=fillPath fill=color fill-opacity=op />` **avant** `<path d=arc stroke=... />`
pour que le trait de l'arc reste visible par-dessus le fill.

#### Surfaces concernées

1. `rendering/svg-primitives.ts:angleToSVG` — produit `fillPath?: string` dans `AngleSVG`.
2. `rendering/export-svg.ts` — branche angle : émet `<path d=fillPath fill=... />`.
3. `rendering/export-tikz.ts` — branche angle : `\path[fill=color, fill opacity=op] (V) -- ... arc(...) -- cycle;`.
4. `rendering/export-typst.ts` — équivalent CeTZ.
5. `GeometryCanvas.svelte` — utilise `fillPath` côté canvas.

#### Cas dégénérés (fill)

| Cas                                    | Comportement attendu                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `fillColor` défini + `marque='carre'`  | `fillColor` ignoré silencieusement (documenté)       |
| `fillColor` défini + `marque='aucune'` | Aucun fill (rien à fermer)                           |
| `fillColor` défini + mesure 0          | Aucun fill (secteur dégénéré)                        |
| `fillOpacity` sans `fillColor`         | Aucun fill (cohérent avec convention `resolveStyle`) |
| `fillColor='red'` + `marque='arcs2'`   | Un seul fill au rayon de l'arc extérieur             |

### 3. Chorégraphie `bissectrice(angle)` extension

#### Sémantique

La chorégraphie `bissectrice(A, V, B) @euclide` (livrée V2, ~834 LoC) anime :
arc centré en V → 2 petits arcs à A' et B' → intersection P → droite (VP).

V3a ajoute un **dispatch d'entrée** : si l'argument est un `GeoAngle` au lieu
de 3 points, extraire `(p1, vertex, p2)` et déléguer **textuellement** au flow
d'animation existant.

#### Conditions

- `α = angle(A, V, B); d = bissectrice(α) @euclide` produit **strictement les
  mêmes étapes d'animation** que `d = bissectrice(A, V, B) @euclide` sur la
  même figure.
- Le timing (durations par étape) est identique.
- Le nombre total d'étapes (`totalSteps`) est identique.
- La voie par défaut (`arcs_egaux`) et l'override `@arc_milieu` sont identiques.

#### Compatibilité descendante

`bissectrice(A, V, B) @euclide` (forme 3 points) reste **inchangée** : aucune
régression. Le dispatch ne modifie le comportement que pour la forme 1-argument.

#### Cas dégénérés

| Cas                                         | Comportement attendu                                      |
| ------------------------------------------- | --------------------------------------------------------- |
| `bissectrice(α)` avec α dégénéré (mesure 0) | Même comportement que `bissectrice(A, V, B)` mesure 0     |
| `bissectrice(α)` avec α rentrant            | Bissectrice extérieure animée (cohérent V2 3 points)      |
| `bissectrice(α)` sans `@euclide`            | Comportement statique inchangé (handler builtin existant) |

---

## Cas dégénérés V3a (récap global)

| Cas                                       | Phase | Comportement attendu                              |
| ----------------------------------------- | ----- | ------------------------------------------------- |
| `transporte(α, V')` V' == vertex(α)       | P1    | `DslRuntimeError` structurée                      |
| `transporte(α, V', P)` P == V'            | P1    | `DslRuntimeError` structurée                      |
| `transporte(α, V', vec=v)` ‖v‖ = 0        | P1    | `DslRuntimeError` structurée                      |
| `transporte(α, V', vec=v, angle=θ)`       | P1    | `DslRuntimeError` (options exclusives)            |
| `transporte()` 0 arg                      | P1    | `DslRuntimeError` structurée                      |
| `transporte(α)` 1 arg                     | P1    | `DslRuntimeError` structurée                      |
| `transporte("foo", V')` arg1 non GeoAngle | P1    | `DslRuntimeError` structurée                      |
| `transporte(α, "foo")` arg2 non point     | P1    | `DslRuntimeError` structurée                      |
| `α` rentrant → β                          | P1    | Hérite `kind='rentrant'` + mesure `2π − interior` |
| `α` mesure 0 → β                          | P1    | Mesure 0 propagée, rendu arc minuscule            |
| `α` mesure π → β                          | P1    | Mesure π propagée, rendu demi-cercle              |
| `fillColor` + `marque='carre'`            | P2    | Fill ignoré (documenté)                           |
| `fillColor` + `marque='aucune'`           | P2    | Aucun fill                                        |
| `fillOpacity` sans `fillColor`            | P2    | Aucun fill (convention `resolveStyle`)            |
| `bissectrice(α)` sans `@euclide`          | P3    | Comportement builtin V1 inchangé                  |

---

## Fichiers à toucher (par phase)

### Phase 0 — Spec TDD + tests rouges

- `docs/wip/geometry/angle-v3a-progress.md` — **nouveau** (ce fichier).
- `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` — extension :
  - ~5 `.todo()` pour `fill` rendering (présence fillPath, couleur, opacity, ignored carre, marche arcs2).
  - ~15 `.todo()` pour `transporte` (cas canoniques, héritage style, erreurs dégénérées).
- `src/lib/geometry-core/dsl/__tests__/builtins-transporte.test.ts` — **nouveau** (~120 LoC, 15+ tests sémantiques `.todo()`).
- `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` — extension : 2-3 `.todo()` pour `bissectrice(α) @euclide`.

### Phase 1 — Builtin `transporte` + factory

- `src/lib/geometry-core/dsl/builtins.ts` :
  - Nouveau handler `handleTransporte` enregistré via `HANDLERS.set('transporte', ...)`.
  - Ajout à `BUILTIN_NAMES`.
  - Réutilisation de `requireElement`, `requireNumberNamed` (pour `angle=θ`), `resolveDirection`-like dispatch.
  - Erreurs structurées via `DslRuntimeError({summary, hint?, forms?}, line)`.
- `src/lib/geometry-core/graph/figure.ts` :
  - Aucune nouvelle factory critique attendue (réutilisation de `createAngle` + `createFreePoint({visible:false, draggable:false})`).
  - Vérifier la présence éventuelle d'un helper `rotatePoint(P, V, θ)` ; sinon, rotation inline dans le handler.

### Phase 2 — Rendu `fill` secteur sur 4 surfaces

- `src/lib/geometry-core/rendering/svg-primitives.ts` :
  - `AngleSVG` : champ optionnel `fillPath?: string`.
  - `angleToSVG` : construit `fillPath` quand `marque ∈ {arc, arcs2, arcs3}` ET `fillColor` défini.
- `src/lib/geometry-core/rendering/export-svg.ts` :
  - Branche angle : si `fillPath`, émettre `<path d=fillPath fill=color fill-opacity=op />` **avant** les arcs traits.
- `src/lib/geometry-core/rendering/export-tikz.ts` :
  - Branche angle : `\path[fill=color, fill opacity=op] (V) -- (p1) arc (...) -- cycle;` avant le `\draw` des arcs.
- `src/lib/geometry-core/rendering/export-typst.ts` :
  - Branche angle : équivalent CeTZ (`fill(color)` sur le path secteur).
- `src/lib/components/geometry/GeometryCanvas.svelte` :
  - Branche angle : appliquer `fillPath` côté canvas avec `ctx.fill()`.

### Phase 3 — Chorégraphie `bissectrice(angle)` extension

- `src/lib/constructions-v2/core/choreographies/bissectrice.ts` (~834 LoC actuels) :
  - Dispatch au début : si l'appel est `bissectrice(α)` avec α `GeoAngle`,
    extraire `(p1, vertex, p2)` via type guard `isAngle` et déléguer au flow
    existant `bissectrice(p1, vertex, p2)`.
  - Conservation 100% du comportement 3 points.

### Phase 4 — Tests intégration + doc + release

- `src/lib/geometry-core/rendering/__tests__/angle-canonical-cases.test.ts` :
  - 2 tests `transporte` (rotation d'angle 60° au point V' = (5,0)) — vérifier mesure égale, position vertex.
  - 2 tests `fill` rendering (path fill présent dans SVG export pour arc + arcs2).
- `docs/ref/geometry/dsl-builtins.md` :
  - Nouvelle section `transporte()` avec exemples DSL.
  - Section « Rendu » mise à jour pour `fill` (convention + ignored carre).
  - Section chorégraphies : ajout `bissectrice(GeoAngle)`.
- `CHANGELOG.md` : entrée `[0.9.3]` (ou `[0.10.1]`) listant les 3 features V3a + différés V3.5.
- `pnpm release` + `git push --follow-tags` (uniquement sur green light explicite utilisateur).

---

## Notes Phase 0

(à compléter en fin de P0)

- Spec V3a rédigée dans ce fichier (~250 LoC).
- Tests rouges :
  - `builtins-angle.test.ts` : ~20 `.todo()` ajoutés (~5 fill + ~15 transporte squelette).
  - `builtins-transporte.test.ts` : **nouveau** fichier (~120 LoC, 15+ tests sémantiques `.todo()`).
  - `choreographies-integration.test.ts` : 3 `.todo()` ajoutés.
- Tests compilent en TypeScript (imports valides) mais restent skipped à
  l'exécution.
- Aucune modification du code source (types/, dsl/, graph/, rendering/, constructions-v2/) en Phase 0.

---

## Notes Phase 1

### Implémentation

- Nouveau handler `handleTransporte` dans `src/lib/geometry-core/dsl/builtins.ts`
  (~330 LoC dont `TRANSPORTE_FORMS` + helper `resolveTransporteDirection`).
- Enregistré via `HANDLERS.set('transporte', handleTransporte)`.
- Ajouté `'transporte'` à `BUILTIN_NAMES` (juste après `'angle_polaire'`).
- Import ajouté : `GeoStyle` depuis `../types/elements` (déjà partiel).

### 4 signatures supportées (priorité directions)

1. `transporte(α, V')` → défaut axe Ox `(1, 0)`
2. `transporte(α, V', P)` → unit(P − V')
3. `transporte(α, V', vec=v)` → unit(v)
4. `transporte(α, V', angle=θ)` → `(cos θ, sin θ)` en mode courant

Exclusivité stricte : `P`, `vec=`, `angle=` ne peuvent pas se combiner
(détection via `sources[]` + erreur structurée listant les 3 sources en conflit).

### Cache mesure réutilisé

Le handler appelle `figure.findAngleByMeasureScalarId` (en réalité lit
directement `alphaEl.measureScalarIds?.rad`) puis fallback sur
`createScalarAngleMeasure` + `setAngleMeasureScalarId(...,'rad')`. La valeur est
lue via `figure.getScalarValue(scalarId)` — cohérent avec la sémantique V2.

### Héritage de style depuis α

Tous les champs angle (`marque`, `orientation`, `kind`, `showLabel`, `unite`,
`arcRadiusPx`, `arcSpacingPx`) hérités de α si non explicitement overridés.
Style fill : merge `{ ...alphaEl.style, ...styleOverride }` où `styleOverride`
provient des named `remplissage=` / `opacite_fond=`. Couleur trait : héritée
sauf si named `couleur=` (appliqué via `applyInlineStyle` final).

### Tests activés

- **`builtins-transporte.test.ts`** : 35/38 passent (3 todo : `α rentrant`
  preserve sens — comportement dépend du `kind` automatique du `GeoAngle`, à
  consolider quand la chorégraphie le requiert ; 2 tests `fill_color` héritage
  reposent sur la résolution `style.fillColor` rendue par V3a-P2).
- **`builtins-angle.test.ts`** : 13/15 todos `transporte` activés en tests
  passants. 2 todos restants : (1) `α rentrant → β rentrant`, (2)
  `fill_color="red"` héritage + override (V3a-P2 prerequisite).
- **`figure-angle.test.ts`** : 39/39 ✅ (aucune régression).
- **`angle-canonical-cases.test.ts`** : 18/18 ✅.
- **`builtins-angle-overloads.test.ts`** : 45/45 (2 todos préexistants V2 drag).

### Résultats globaux (4 suites)

```
builtins-transporte.test.ts        35 passed | 3 todo (38)
builtins-angle.test.ts             99 passed | 12 todo (111)
builtins-angle-overloads.test.ts   43 passed | 2 todo (45)
figure-angle.test.ts               39 passed (39)
angle-canonical-cases.test.ts      18 passed (18)
TOTAL                             234 passed | 17 todo (261)
```

### Limitations identifiées (différées)

- **Héritage `style.fillColor`** : nécessite `style.fillColor` réellement
  conservé dans `GeoAngle.style` (vérifié OK via `resolveStyle`) + rendu
  V3a-P2 pour produire effectivement un secteur fermé. La structure côté
  builtin est en place (merge style), 1 test V3a-P1 reste todo en attendant
  P2.
- **Préservation du sens pour `α` rentrant** : comportement par défaut
  hérite `kind='rentrant'`, mais la convention « la mesure réfléchie =
  2π − interior » nécessite confirmation lors du rendu V3a-P2.
- **Pas de chorégraphie animée** : `transporte @euclide` différé V3.5
  (confirmé hors scope V3a).

### Régressions existantes hors V3a

3 tests préexistants en échec, sans aucun lien avec la P1 :

- `parser.test.ts > complex expression: i * 360 / n` : `angle` est devenu
  KEYWORD en V2 (mot réservé pour la signature `point(A, angle=θ)`), donc
  `angle = i * 360 / n` n'est plus une LHS d'assignation valide.
- `parser.test.ts > macro with default parameter` : idem, `macro tri(A, B, angle=60)`
  utilise `angle` comme nom de paramètre.
- `trace-demos.test.ts > rose petals as slider sweeps` : utilise
  `angle(O, B)` (2 args points), forme retirée en V2.

Ces 3 cassures sont antérieures à P1 (commit P0). À traiter séparément
(probablement requalifier `angle` en CONTEXTUAL_KEYWORD).

---

## Notes Phase 2

(à compléter en fin de P2)

---

## Notes Phase 3

### Stratégie

Dispatch d'input pur : un helper `normalizeBissectriceCtx(ctx)` au top du fichier
`bissectrice.ts` détecte le cas `args.ids.length === 1` + élément `GeoAngle`,
extrait `(p1Id, vertexId, p2Id)` via `el.p1Id/el.vertexId/el.p2Id` (type guard
`isAngle`), reconstruit `ctx.args` avec les 3 ids + leurs `coords` (via
`figure.getPosition` + `geoToNumber`), et passe ce nouveau ctx au flow
existant `buildArcsEgaux` / `buildArcMilieu`. **Aucune nouvelle séquence
d'animation** — réutilisation 100 % du code V2 (834 LoC inchangés).

Les 2 entry points :

```ts
const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(normalizeBissectriceCtx(ctx));
const arcMilieuChoreography: ChoreographyFn = (ctx) => buildArcMilieu(normalizeBissectriceCtx(ctx));
```

Fallback silencieux quand l'input n'est pas un `GeoAngle` (ou ids vides, ou
positions introuvables) : on retourne le ctx d'origine, le flow V2 lève alors
son erreur structurée habituelle ou — si valide en 3-points — exécute la
chorégraphie normale. La validation d'input avait déjà été faite côté builtin
(`handleBissectrice` rejette les cas non angles à la ligne 5458 de
`builtins.ts`), donc le dispatch choré peut rester permissif.

### LoC ajoutées

- `bissectrice.ts` : +44 LoC (helper `normalizeBissectriceCtx` + 2 imports + 2
  appels dans les entry points).
- `choreographies-integration.test.ts` : +95 LoC (3 tests V3a).

Total : ~140 LoC dans la cible plan ~100.

### Tests activés

3/3 `.todo()` V3a convertis en tests passants :

- `bissectrice(α) @euclide produit le même totalSteps que bissectrice(A,V,B)`
  → `execAngle.totalSteps === execThreePoints.totalSteps + 1` (le +1 vient du
  statement `al = angle(A, V, B)` statique sans chorégraphie).
- `stepDurations identiques (même timing)` → comparaison `slice(3)` vs
  `slice(4)` des deux exécuteurs : tableau d'identique 7 entrées.
- `extrait correctement (p1, vertex, p2) depuis α` → vérification que la
  séquence des `currentSubStep.kind` après l'angle statique reproduit
  exactement les 7 sous-étapes du flow V2 (compass-draw × 2,
  point-fade-in × 2 pts, compass-draw × 2, point-fade-in × 1 pt,
  ruler-trace).

### Résultats

```
choreographies-integration.test.ts   23 passed (23)   [+3 nouveaux V3a, 0 régression]
builtins-angle.test.ts              104 passed | 7 todo (111)   [0 régression]
choreographies-resolve.test.ts       23 passed (23)   [0 régression]
stdlib.test.ts                       56 passed (56)   [0 régression]
```

### Limitations

- **Identifiants Unicode dans tests** : le tokenizer DSL refuse `α` comme
  identifiant (`Caractère inattendu : 'α'`). Tests utilisent `al` à la place.
  L'idiome `α = angle(...)` reste valide dans la documentation mais pas dans
  les scripts exécutables — limitation préexistante hors scope V3a.
- **Pas de validation d'erreur structurée côté choré** : si l'utilisateur
  appelle `bissectrice(non_angle)`, le builtin `handleBissectrice` rejette
  d'abord (avant la chorégraphie), donc le dispatch choré n'a pas besoin de
  dupliquer les `DslRuntimeError`. Comportement vérifié indirectement : le
  test `non-choreographed` continue de passer.

### Fichiers modifiés

- `src/lib/constructions-v2/core/choreographies/bissectrice.ts` (+44 LoC).
- `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` (+95 LoC).
- `docs/wip/geometry/angle-v3a-progress.md` (notes P3 ajoutées).

### Statut

P3 **terminée**. Prêt pour P4 (tests intégration + doc + release).

---

## Notes Phase 4

(à compléter en fin de P4)
