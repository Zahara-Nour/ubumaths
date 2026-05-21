# V1 chorégraphies — Phase 4 sub-steps : MVP `mediatrice @euclide`

> Session initiale : 2026-05-19 — refactor pipeline + chorégraphie + tests
> Session de polish visuel : 2026-05-20 — corrections suite au test manuel dans `/construction-demo`
> Plan : `/Users/david/.claude/plans/elegant-meandering-dragonfly.md`
> Phase reprise après revert `379119eab` de la session précédente.

## Statut global

| Phase                                                                 | Statut   | Tests              |
| --------------------------------------------------------------------- | -------- | ------------------ |
| Phase A — Refactor pipeline sub-steps                                 | ✓ livrée | +0 (refactor only) |
| Phase B — MVP `mediatrice @euclide @arcs_egaux` + `@cercles_rayon_ab` | ✓ livrée | +5                 |
| Phase C — Visibilité finale (`@squelette`/`@epure`/`@complet`)        | ✓ livrée | +6                 |
| Phase D — Quality + docs + commit final                               | ✓ livrée | —                  |
| Phase E — Polish visuel (post-test manuel)                            | ✓ livrée | —                  |

**Suite complète constructions-v2** : 155/155 verts (vs 144 avant cette session). 0 régression sur les 144 tests existants.

**Validation visuelle dans `/construction-demo`** : ✓ confirmée par l'utilisateur après les corrections de Phase E.

## Architecture livrée

### Types — `SubStep` + `ChoreographyResult` refactor

`src/lib/constructions-v2/core/choreographies/types.ts` :

- Nouveau type `SubStepKind` : `'compass-draw' | 'ruler-trace' | 'point-fade-in' | 'line-fade-in'`.
- Nouvelle interface `SubStep` portant `kind`, `instrument`, `secondaryInstrument`, `instrumentTarget`, `compassRadius`, `geometricDistance`, `animateDrawableIds`, `animatePointIds`, `animateLineIds`, `instruction`.
- `ChoreographyResult.subSteps` remplace l'ancien `steps: ChoreographyStep[]`.
- `ChoreographyProduced.hiddenSupport` ajouté pour les éléments structurels (cercles cachés pour `createIntersectionCC`, scalaires) qui ne sont JAMAIS rendus visibles.

### Pipeline — `_plan: PlanEntry[]` parallèle à `_stepDurations`

`src/lib/constructions-v2/core/executor.ts` :

- Nouveau type `PlanEntry { statement, isStatementBoundary, isLastEntryOfStatement, decoratorTriple, voie, subStep }`.
- `_plan: PlanEntry[]` parallèle à `_stepDurations[]` et `_stepPhases[]` — 1 entrée par slot timeline (= position du slider).
- `_timelineIndex` indépendant de `stepper.currentIndex`. Pour les statements non-chorégraphiés ils coïncident. Pour les statements chorégraphiés, le stepper avance UNE fois mais le timeline avance N fois.
- `getter currentStepIndex` retourne désormais `_timelineIndex` (était `stepper.currentIndex`).
- `getter totalSteps` retourne `_plan.length` (était `stepper.totalSteps`).
- Nouveaux getters : `currentSubStep`, `plan`, `lastChoreographyResult`.

### Pré-pass — `calculateStepDurations` étendu

- Décodeurs résolus AVANT exécution sur `tempStepper` (triple + voie capturés).
- Statement décoré : `invokeChoreographyOn(stmt, voie, triple, tempStepper)` invoque la chorégraphie sur le tempStepper, qui crée les éléments auxiliaires + retourne `subSteps`.
- Chaque sub-step est expansé en 1 entry dans `_stepDurations` + `_stepPhases` + `_plan`. Le timing par sub-step est calculé via le helper `computeSubStepTiming(subStep, speedFactor, instrumentPos)` qui réutilise les constantes `MS_PER_PIXEL`, `MS_PER_DEGREE`, `INSTRUMENT_RAMP_MS`, `COMPASS_RAISE_MS`, `COMPASS_LOWER_MS`, `AUTO_PAUSE_BETWEEN_STEPS`.
- Statement non-décoré : 1 entry, comportement legacy préservé via `computeLegacyStatementTiming` (mêmes calculs qu'avant).

### Runtime — `step()` consomme les entries du plan

- `step()` avance `_timelineIndex`, lit l'entry, applique la sub-step si présente.
- Au `isStatementBoundary` : `stepper.step()` exécute le statement DSL ; si décoré, `invokeChoreographyOn(stmt, voie, triple, this.stepper)` matérialise les éléments auxiliaires dans la figure runtime avec des IDs déterministes (matchent le tempStepper).
- `applySubStepToAnimationState(subStep)` populate `_lastStepNew*Ids`, `_autoInstruments`, `_instrumentMoves`, `_movePhaseEnd`, `_drawPhaseStart`, etc. — équivalent du `autoShowInstruments` mais piloté par les targets explicites du sub-step.
- Les éléments auxiliaires sont créés cachés (`hideElement` juste après création) ; révélés à leur sub-step via `applySubStepToAnimationState` (`fig.showElement(id)` sur chaque ID animé).

### Déterminisme des IDs entre pré-pass et runtime

`Figure.generateId(prefix)` utilise des compteurs internes par-figure. Pre-pass et runtime exécutent **exactement** la même séquence de `createX` (statement DSL → choreography → auxiliaires) sur des `Figure` neuves. Les IDs produits sont identiques (`pt-1`, `pt-2`, `arc-3`, etc.). Le sub-step pré-calculé contient des IDs qui matchent ce que crée la chorégraphie runtime. **Invariant non testé directement mais validé indirectement par les 5 tests `choreographies-integration` Phase 4.**

### Chorégraphie `mediatrice @euclide @arcs_egaux`

`src/lib/constructions-v2/core/choreographies/mediatrice.ts` :

**Éléments créés (réactifs)** :

- `distAB = createScalarDistance(A, B)` — distance AB réactive.
- `radiusScalar = createScalarExpression((vals) => 0.7 × vals.get(distAB), [distAB])` — rayon réactif.
- `arc1 = createArcByAngles(A, scalarRef(radiusScalar), angleAB-60°, angleAB+60°)` puis `hideElement`. Sweep 120°.
- `arc2 = createArcByAngles(B, scalarRef(radiusScalar), angleBA-60°, angleBA+60°)` puis `hideElement`.
- `circleA, circleB = createCircleByRadius(A/B, scalarRef(radiusScalar))` puis `hideElement` — supports cachés pour le calcul d'intersection (`createIntersectionCC` exige des cercles, pas des arcs).
- `I1, I2 = createIntersectionCC(circleA, circleB, 0|1)` puis `hideElement`.
- `segmentTrace = createSegment(I1, I2)` puis `hideElement`.

**Limitation V1** : les `startAngle`/`endAngle` des arcs sont fixés à la création (captures de `angleAB`). Au drag, les arcs ne suivent pas la rotation de l'axe AB. **Acceptable** car les arcs sont des traces éphémères généralement cachées par `@squelette` ; visible uniquement sous `@complet`.

**Sub-steps retournés** :

1. **SS1 — compass-draw** : compas à `A`, rotation initiale = `(angleAB-60°)`, rayon `r`, sweep 120° → trace `arc1`.
2. **SS2 — compass-draw** : compas à `B`, rotation initiale = `(angleBA-60°)`, même rayon, sweep 120° → trace `arc2`.
3. **SS3 — point-fade-in** : aucun instrument, `animatePointIds=[I1, I2]`.
4. **SS4 — ruler-trace** : règle + crayon, position cible = milieu de `I1I2`, rotation = angle `I1→I2`, distance = `|I1I2|`. `animateDrawableIds=[segmentTrace]` + `animateLineIds=[principalId]`.

**Produced** :

- `principal: d` (la droite renvoyée par le builtin).
- `charnieres: [I1, I2]`.
- `traces: [arc1, arc2, segmentTrace]`.
- `hiddenSupport: [circleA, circleB, distAB, radiusScalar]`.

**Variante `@cercles_rayon_ab`** : même structure, `radiusFactor=1.0` (au lieu de 0.7).

### Visibilité finale

`src/lib/constructions-v2/core/choreographies/visibility.ts` : `applyFinalVisibility(figure, produced, visibilite)`.

- `@epure` : `hide` traces, `hide` charnières, `show` principal.
- `@squelette` (défaut) : `hide` traces, `show` charnières, `show` principal.
- `@complet` : `show` traces avec style `{dash: 'dashed', opacity: 0.4}`, `show` charnières, `show` principal.
- `hiddenSupport` : toujours `hide` (cercles auxiliaires, scalaires) — purement structurel.

**Wiring executor** : la visibilité n'est PAS appliquée pendant le dernier sub-step (elle interfèrerait avec les éléments en cours d'animation). Au lieu de ça, l'executor stocke `_pendingVisibility` à la fin du dernier sub-step d'un statement chorégraphié, et `drainPendingVisibility()` l'applique au début du `step()` suivant. Pour le dernier statement de tout le script, l'appel à `step()` qui retourne `false` (après `executeAll()`) drainage la visibilité avant de retourner.

UX résultant :

- L'utilisateur voit la séquence complète (arcs, intersections, règle, droite).
- À la transition vers le statement suivant (ou à la fin du script via un step supplémentaire), les arcs disparaissent (`@squelette`) ou se grisent (`@complet`).

## Tests ajoutés

### `choreographies-integration.test.ts` — 5 nouveaux tests Phase 4

1. `mediatrice @euclide expands into 4 sub-step entries` : `totalSteps === 6` pour un script de 2 points + 1 mediatrice décorée.
2. `mediatrice @euclide creates auxiliary elements` : `figure.size` augmente vs version non décorée.
3. `currentSubStep is populated during each sub-step` : vérifie `kind` et `instrument` sur chaque sub-step.
4. `currentDecoratorTriple stays populated across all sub-steps` : `@euclide` et `arcs_egaux` exposés pendant les 4 sub-steps.
5. `non-decorated statements still produce 1 entry each` : compatibilité descendante.
6. `cercles_rayon_ab voie also produces 4 sub-steps` : variante fonctionne.

### `visibility.test.ts` — 6 nouveaux tests Phase C

Pure function (3 tests) :

1. `@epure` cache tout sauf principal.
2. `@squelette` cache traces, garde charnières + principal.
3. `@complet` montre tout, applique `{dash: 'dashed', opacity: 0.4}` aux traces.

Wiring executor (3 tests) : 4. `mediatrice @euclide` (defaut squelette) après `executeAll() + step()` : arcs/segment-trace cachés, intersections + ligne visibles. 5. `mediatrice @euclide @epure` : tout caché sauf la ligne. 6. `mediatrice @euclide @complet` : tout visible avec style dashed sur les traces.

## Fichiers modifiés

| Fichier                                                                      | Phase | Type                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/constructions-v2/core/choreographies/types.ts`                      | A     | edit (ajout SubStep, SubStepKind, refactor ChoreographyResult, hiddenSupport)                                                                                          |
| `src/lib/constructions-v2/core/choreographies/mediatrice.ts`                 | B     | edit (NOT_YET_IMPLEMENTED → vraie chorégraphie 4 sub-steps)                                                                                                            |
| `src/lib/constructions-v2/core/choreographies/bissectrice.ts`                | A     | edit (stub steps→subSteps)                                                                                                                                             |
| `src/lib/constructions-v2/core/choreographies/parallele.ts`                  | A     | edit (stub steps→subSteps)                                                                                                                                             |
| `src/lib/constructions-v2/core/choreographies/cercle_circonscrit.ts`         | A     | edit (stub steps→subSteps)                                                                                                                                             |
| `src/lib/constructions-v2/core/choreographies/visibility.ts`                 | C     | new (applyFinalVisibility + applyTraceStyle)                                                                                                                           |
| `src/lib/constructions-v2/core/executor.ts`                                  | A,B,C | edit (refactor majeur : \_plan, \_timelineIndex, calculateStepDurations expansion, applySubStepToAnimationState, drainPendingVisibility, computeLegacyStatementTiming) |
| `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` | B     | edit (remplace test "stubs" par 5 tests Phase 4 sub-steps)                                                                                                             |
| `src/lib/constructions-v2/core/__tests__/visibility.test.ts`                 | C     | new (6 tests visibilité)                                                                                                                                               |
| `docs/wip/v1-choreographies-substeps-progress.md`                            | D     | new (ce fichier)                                                                                                                                                       |
| `src/lib/constructions-v2/components/ConstructionCanvas.svelte`              | E     | edit (fix bug `PPU` undefined dans `compassOpeningPx`)                                                                                                                 |
| `src/lib/constructions-v2/components/ConstructionPlayer.svelte`              | E     | edit (drain `applyFinalVisibility` à la fin du timeline / au scrub / au seekToEnd)                                                                                     |

## Phase E — Polish visuel (post-test manuel, 2026-05-20)

Après livraison des Phases A-D et test manuel par l'utilisateur dans `/construction-demo`, plusieurs bugs visuels ont été détectés et corrigés :

### 1. Bug latent `PPU is not defined` (`a95daa2be`)

`ConstructionCanvas.svelte` utilisait la variable `PPU` (non définie) dans la dérivée `compassOpeningPx`. Bug latent qui ne se manifestait pas tant que les anciennes voies V1 étaient des stubs (n'invoquaient pas le compas). La nouvelle chorégraphie `mediatrice @euclide @arcs_egaux` invoque le compas, exposant l'exception et :

- empêchant le rendu du compas (l'overlay `<g>` n'était jamais émis car la dérivée throw avant) ;
- gelant le slider de la timeline (l'exception interrompt le pipeline de rendu Svelte pendant l'animation des arcs) ;
- créant l'illusion d'un saut "2/6 → 5/6" car le slider ne reprenait que sur les étapes sans compas.

Fix : remplacer `PPU` par `pixelsPerUnit` (la `$state` réactive du viewport).

### 2. Ligne `d` visible avant le tracé (`07aac16f4`)

La droite principale créée par le builtin `mediatrice` restait visible pendant SS1–SS3, masquant l'effet "construction progressive". Fix : la chorégraphie appelle `figure.hideElement(principalId)` en début, et la ligne n'est révélée qu'à la fin de SS4 par `applyFinalVisibility`.

### 3. Position de la règle (`07aac16f4` + `fd739521a`)

- Premier fix : règle au point I1 (extrémité) au lieu du milieu du segment, suivant la convention de `rulerPosition` (`instruments/positioning.ts`).
- Deuxième fix : centrage du segment-trace sur le midpoint de I1/I2, longueur fixée à 15 unités math (= longueur par défaut du composant `Ruler`). La règle posée à `Iext1` (extrémité du segment) encadre maintenant exactement le tracé visuel. Sur un canvas par défaut, le segment couvre toute la portion visible de la médiatrice.

### 4. Rotation post-tracé du compas (`07aac16f4`)

`_lastInstrumentPositions` stockait l'angle de DÉBUT du compas au lieu de l'angle de FIN (après le sweep de l'arc). Conséquence : le déplacement du compas entre SS1 et SS2 partait d'un mauvais angle. Maintenant `endRotation = rotation + sweepDeg` est tracké pour les `compass-draw`, comme `autoShowInstruments` legacy.

### 5. Segment-trace = surrogate visuel de la ligne (`da452898f`)

Le segment-trace I1→I2 court ne correspondait pas visuellement à la droite finale (qui s'étend au viewport). La ligne `d` bumpait dès le début de SS4 (le fade-in démarre à `stepProgress=0`, donc pendant le move phase de la règle).

Fix :

- Le segment-trace est étendu pour couvrir 15 unités math (visible portion du viewport par défaut).
- `principalId` retiré de `animateLineIds` → la ligne reste cachée pendant SS4.
- `applyFinalVisibility` révèle la ligne à la fin du dernier sub-step ; le swap segment→ligne est imperceptible car les deux sont géométriquement alignés et de même style.

### 6. Drain auto de la visibilité en fin de timeline (`da452898f`)

`_pendingVisibility` se drainait uniquement au `step()` suivant. En autoplay ou scrub vers la fin, plus aucun `step()` n'était appelé donc la ligne ne se révélait jamais. Drain ajouté dans 3 endroits du `ConstructionPlayer` :

- `handleTimelineUpdate` : détecte la transition play→stop à progress=1.
- `handleScrub(1)` : drain explicite quand on scrub à la fin.
- `seekToEnd` au load : drain après le `scrubByProgress(1)`.

### Script de validation utilisé

```dsl
A = point(-3, 0)
B = point(3, 0)
d = mediatrice(A, B) @euclide
```

Comportement attendu (✓ confirmé visuellement) :

1. Slider affiche **6 étapes** (A, B, SS1, SS2, SS3, SS4) avec durées proportionnelles.
2. SS1 : compas se positionne en A (rotation = angleAB−60°), trace l'arc 1 (120°).
3. SS2 : compas se déplace vers B, trace l'arc 2.
4. SS3 : les 2 points d'intersection apparaissent (fade-in + bump).
5. SS4 : règle + crayon se positionnent et tracent un segment couvrant la portion visible de la droite ; la ligne `d` apparaît à la fin (révélée par `applyFinalVisibility`).
6. Visibilité finale : arcs + segment-trace cachés en `@squelette` (défaut), tout caché sauf `d` en `@epure`, tout visible avec traces dashed/opacité réduite en `@complet`.

Variantes confirmées :

- `@euclide @cercles_rayon_ab` : rayon = |AB|, sinon identique.
- Drag de A ou B après animation : rayon et droite réactifs ; angles des arcs et segment-trace non réactifs (limitation V1, voir ci-dessous).

## Limitations connues V1 MVP

1. ~~**Angles des arcs non réactifs**~~ — **résolu (2026-05-20, session bissectrice + A2)** : tous les angles d'arc des chorégraphies `mediatrice` et `bissectrice` sont maintenant entièrement réactifs via `createScalarExpression` sur les coordonnées de A, V, B. Cf. commits série `*-arcs-reactive*` + `c6614af89` (free vector).
2. **Visibilité appliquée au step suivant** : la transition de visibilité ne se déclenche pas automatiquement à la fin de l'animation du dernier sub-step. L'utilisateur doit step une fois de plus (ou `executeAll` qui appelle `step()` jusqu'à `false` — qui draine la visibilité). Acceptable car pédagogiquement on veut souvent voir le résultat complet avant le nettoyage.
3. **Composition (`ctx.sub`) non implémentée** : `cercle_circonscrit @euclide` reste à `NOT_YET_IMPLEMENTED` (le stub renvoie `subSteps: []` → fallback legacy). La composition en chaîne (cercle_circonscrit → 2 mediatrices) est différée.
4. ~~**Autres voies (bissectrice, parallele)** : stubs~~ — **bissectrice livrée** (2026-05-20) avec `arcs_egaux` (7 sub-steps) et `arc_milieu` (5 sub-steps), entièrement réactives. `parallele` reste `NOT_YET_IMPLEMENTED`.
5. **Nouveau : `transporte @euclide`** (chorégraphie A1, 2026-05-20) livrée — 6 sub-steps (3 compass-draw + 2 point-fade-in + 1 ruler-trace). Cf. `docs/wip/geometry/transporte-euclide-progress.md`.
6. **Nouveau : `perpendiculaire @euclide`** (2026-05-21) livrée — 7 sub-steps « arcs égaux d'Euclide » optimisée : `compass-measure |PA|` → petit arc en P (même ouverture) coupe `(AB)` en `B'` → petits arcs en `A` et `B'` (toujours `|PA|`) se croisent en `Q` = symétrique de `P` par rapport à `(AB)` → règle `P→Q` trace la perpendiculaire. Réutilise l'ouverture du compas partout (pas de second réglage). `Q` = charnière (donné en plus de `P`), arcs + `B'` = traces. Cas dégénéré `P ∈ (AB)` (`d = 0`) : `Q = P` — la construction reste cohérente mais visuellement déficiente.

## Pour la session suivante (Phase 4 reste)

- ~~Implémenter `bissectrice @euclide @arcs_egaux` + `@arc_milieu`~~ — **livré**.
- Implémenter `parallele @euclide @parallelogramme` (5 sub-steps environ).
- Implémenter `ctx.sub` pour la composition + `cercle_circonscrit @euclide` (compose 2 médiatrices + intersection + cercle).
- ~~(V1.1) Rendre les angles des arcs réactifs~~ — **livré** (mediatrice + bissectrice).
- Phase 6 plan original : documentation auto-générée à partir du registre.

## Acceptance criteria (final)

- [x] Plan rédigé et approuvé.
- [x] Phase A : refactor pipeline sub-steps + tests passent, 0 régression sur tests existants.
- [x] Phase B : `mediatrice @euclide @arcs_egaux` + `@cercles_rayon_ab` fonctionnent au niveau test (155/155 verts).
- [x] Phase C : 3 visibilités (`@squelette`, `@epure`, `@complet`) couvertes par tests.
- [x] Phase D : doc de progression à jour, ESLint clean, `pnpm check:incremental` stable, commit final.
- [x] Phase E : polish visuel post-test manuel (PPU fix, ruler centering, line reveal timing).
- [x] Aucune modification de `geometry-core/`.
- [x] Aucune régression sur les 144 tests constructions-v2 existants.
- [x] **Validation visuelle dans `/construction-demo`** : ✓ confirmée par l'utilisateur.

## Commits livrés

| Commit      | Description                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `3c7aa285f` | feat — sub-steps mechanism + mediatrice @euclide MVP (Phases A+B+C+D)                                  |
| `07aac16f4` | fix — masquage initial de `d`, règle au point I1, rotation post-tracé du compas                        |
| `a95daa2be` | fix — `PPU` undefined dans `compassOpeningPx` (bug latent qui bloquait compas + gel slider)            |
| `da452898f` | fix — segment-trace étendu pour couvrir la portion visible de la ligne + drain visibility en fin de TL |
| `fd739521a` | fix — centrage du segment-trace sur midpoint I1/I2, longueur alignée avec le composant Ruler           |
