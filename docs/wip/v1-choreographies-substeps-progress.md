# V1 chorégraphies — Phase 4 sub-steps : MVP `mediatrice @euclide`

> Session : 2026-05-19
> Plan : `/Users/david/.claude/plans/elegant-meandering-dragonfly.md`
> Phase reprise après revert `379119eab` de la session précédente.

## Statut global

| Phase                                                                 | Statut   | Tests              |
| --------------------------------------------------------------------- | -------- | ------------------ |
| Phase A — Refactor pipeline sub-steps                                 | ✓ livrée | +0 (refactor only) |
| Phase B — MVP `mediatrice @euclide @arcs_egaux` + `@cercles_rayon_ab` | ✓ livrée | +5                 |
| Phase C — Visibilité finale (`@squelette`/`@epure`/`@complet`)        | ✓ livrée | +6                 |
| Phase D — Quality + docs + commit final                               | en cours | —                  |

**Suite complète constructions-v2** : 155/155 verts (vs 144 avant cette session). 0 régression sur les 144 tests existants.

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

## Validation visuelle (à confirmer manuellement)

**Pas encore exécutée dans cette session** — la commande recommandée :

```bash
pnpm dev -- --port 5175
```

Puis ouvrir `http://localhost:5175/construction-demo` et coller :

```dsl
A = point(-3, 0)
B = point(3, 0)
d = mediatrice(A, B) @euclide
```

Comportement attendu :

1. Slider affiche **6 steps** (2 pour A/B + 4 sub-steps pour la médiatrice).
2. Step 3 : compas se positionne en A (rotation = angleAB-60°), trace l'arc 1 (120°).
3. Step 4 : compas se déplace vers B, trace l'arc 2 (120°).
4. Step 5 : les 2 points d'intersection apparaissent (fade-in + bump).
5. Step 6 : règle + crayon se positionnent sur (I1, I2), le segment-trace I1→I2 se dessine, la ligne `d` fade-in.
6. Après step 6 + 1 step supplémentaire (ou drag du slider) : arcs et segment-trace disparaissent (visibilité finale `@squelette`).

Variantes à tester :

- `@euclide @epure` : tout disparaît sauf la ligne `d`.
- `@euclide @complet` : tout reste visible, arcs en `dashed` opacité 0.4.
- `@euclide @cercles_rayon_ab` : rayon = |AB|, arcs plus longs ; sinon comportement identique.
- Drag de A ou B après animation : arcs (si visibles) suivent grâce à `createScalarDistance`.

## Limitations connues V1 MVP

1. **Angles des arcs non réactifs** : `startAngle`/`endAngle` sont fixes (capturés à la création). Si l'utilisateur drag A ou B et change l'angle AB, les arcs gardent leur orientation initiale. Le rayon, en revanche, est réactif via `createScalarExpression(0.7 × distAB)`.
2. **Visibilité appliquée au step suivant** : la transition de visibilité ne se déclenche pas automatiquement à la fin de l'animation du dernier sub-step. L'utilisateur doit step une fois de plus (ou `executeAll` qui appelle `step()` jusqu'à `false` — qui draine la visibilité). Acceptable car pédagogiquement on veut souvent voir le résultat complet avant le nettoyage.
3. **Composition (`ctx.sub`) non implémentée** : `cercle_circonscrit @euclide` reste à `NOT_YET_IMPLEMENTED` (le stub renvoie `subSteps: []` → fallback legacy). La composition en chaîne (cercle_circonscrit → 2 mediatrices) est différée.
4. **Autres voies (bissectrice, parallele)** : stubs `NOT_YET_IMPLEMENTED`. Sessions ultérieures.

## Pour la session suivante (Phase 4 reste)

- Implémenter `bissectrice @euclide @arcs_egaux` + `@arc_milieu` (4-7 sub-steps).
- Implémenter `parallele @euclide @parallelogramme` (5 sub-steps environ).
- Implémenter `ctx.sub` pour la composition + `cercle_circonscrit @euclide` (compose 2 médiatrices + intersection + cercle).
- (V1.1) Rendre les angles des arcs réactifs via `createScalarExpression` sur des direction-scalars.
- Phase 6 plan original : documentation auto-générée à partir du registre.

## Acceptance criteria (mis à jour)

- [x] Plan rédigé et approuvé.
- [x] Phase A : refactor pipeline sub-steps + tests passent, 0 régression sur tests existants.
- [x] Phase B : `mediatrice @euclide @arcs_egaux` + `@cercles_rayon_ab` fonctionnent au niveau test (155/155 verts).
- [x] Phase C : 3 visibilités (`@squelette`, `@epure`, `@complet`) couvertes par tests.
- [ ] Phase D : doc de progression à jour (en cours), ESLint clean, `pnpm check:incremental` stable, commit final.
- [x] Aucune modification de `geometry-core/`.
- [x] Aucune régression sur les 144 tests constructions-v2 existants.
- [ ] **Validation visuelle dans `/construction-demo`** : à confirmer manuellement par l'utilisateur.
