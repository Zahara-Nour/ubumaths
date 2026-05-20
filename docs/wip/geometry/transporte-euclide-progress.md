# Chorégraphie `transporte @euclide` — Progression

> Plan source : `/Users/david/.claude/plans/lucky-watching-fairy.md`
> Builtin source : V3a `transporte(α, V', dir)` (déjà livré, voir `angle-v3a-progress.md`)
> Référence chorégraphique : `bissectrice.ts` (874 LoC, pattern le plus proche)

## Statut

| Phase                            | Statut     |
| -------------------------------- | ---------- |
| P0 — Spec TDD + tests rouges     | ✅ livrée  |
| P1 — `transporte.ts` (cœur)      | ✅ livrée  |
| P2 — Registry + activation tests | ⚪ à faire |
| P3 — Tests intégration + doc     | ⚪ à faire |

## P1 — résumé livraison

- **Fichier créé** : `src/lib/constructions-v2/core/choreographies/transporte.ts` (~430 LoC).
- **Une seule voie exportée** : `VOIES_TRANSPORTE_EUCLIDE` = `[{ id: 'compas_report', defaut: true, ... }]`.
- **Pattern repris** :
  - Type guards `isAngle` + `isPointElement` (zéro cast, zéro `any`).
  - `setupTransporteGeometry(ctx)` → `TransporteSetup | null` (défensif, retourne `null` si β ou α manquent).
  - `buildTransporteEuclide(ctx)` produit 6 sub-steps + classifie `produced` (principal/charnieres/traces/hiddenSupport).
- **Stratégie A''/B''** :
  - A'' = `β.p1Id` (déjà = V' + dir puisque r = 1 forcé).
  - B'' = `β.p2Id` (déjà rotation de A'' autour V' d'angle mesure(α), créé par le builtin V3a).
  - Donc aucune intersection arc-arc à recalculer côté chorégraphie ; on réutilise les deux `FreePoint` invisibles déjà posés par `handleTransporte`. β est `hideElement`-é immédiatement et révélé par `applyFinalVisibility` à la fin de SS6.
- **A'/B'** : intersections `createIntersectionLC(rayVA, circleVHidden, k)` avec sélection d'index par probe (compare avec la position attendue analytiquement → choisit l'index correct).
- **Réactivité** : 11 scalaires + 7 expressions scalaires pour les angles d'arc, le chord |A'B'|, les directions. Tout suit α et V' en cas de drag.
- **Arcs animés** :
  - `arcV` : arc spanning A'→B' centré V (sweep réactif).
  - `arcVp` : petit arc 60° centré V', orienté vers A''.
  - `arcApp` : petit arc 60° centré A'', rayon = |A'B'| réactif, orienté vers B''.
- **Segment-trace** : `figure.createSegment(V', B'')` puis `hideElement` → seule animation visible pendant SS6 ; classé en `hiddenSupport` pour éviter le doublonnage avec le 2ᵉ côté de β (révélé par `applyFinalVisibility`).
- **Sub-steps** : `compass-draw × 3`, `point-fade-in × 2`, `ruler-trace × 1`, ordre conforme au spec ligne 47-54 du présent doc.

### Vérifications

- `pnpm test:server src/lib/constructions-v2/ --run` → **172 passed, 6 todo** (les 6 todos P0 restent en attente d'activation P2).
- `pnpm check:incremental` → **9 errors / 46 warnings** (baseline préexistante, 0 régression).
- Pas d'import circulaire `graph` ↔ `dsl` (uniquement `types/elements` + `compute/to-number` + `types/geo-value`).
- Pas de cast `as Geo*`, pas d'`any`.

### Difficultés rencontrées

- Selection d'index dans `createIntersectionLC` : le ray V→alphaP1 produit toujours 2 candidats algébriques (cercle ∩ droite supportée). Mis en place un probe transparent + comparaison avec la position attendue analytiquement pour choisir `0` ou `1`. Stable tant que le drag ne traverse pas une singularité topologique.
- `numeric()` (depuis `types/geo-value`) requis pour passer `R_TRANSPORT = 1` à `createCircleByRadius` qui attend un `ScalarParam` ; les `number` purs ne sont pas acceptés.
- Pas de réutilisation directe possible de `setupCommonGeometry` de bissectrice (signatures et besoins divergent), mais le pattern « scalaires réactifs → expression chain → arc/segment » est calqué fidèlement.

### Prêt pour P2

- Activer les 6 `it.todo()` du fichier `choreographies-integration.test.ts:493-502`.
- Ajouter une entrée `transporte: { direct: undefined, euclide: VOIES_TRANSPORTE_EUCLIDE, equerre: undefined, mesure: undefined }` dans `registry.ts`.
- Importer `VOIES_TRANSPORTE_EUCLIDE` en tête de `registry.ts`.

## Construction au compas (Euclide I.23)

Données :

- `α` : un `GeoAngle` au sommet **V**, côtés **VA** et **VB**.
- `V'` : un point cible.
- `dir` : direction depuis V' (par défaut axe Ox, ou via point P, ou via vecteur, ou via angle scalaire — cf. V3a).

Étapes pédagogiques :

1. **Ouvrir le compas** d'un écartement `r` (libre). **Placer en V**. Tracer l'arc qui coupe `VA` en **A'** et `VB` en **B'**.
2. **Garder l'écartement r**. **Glisser le compas vers V'**. Tracer l'arc qui coupe le rayon `(V', dir)` en **A''**.
3. **Mesurer la corde |A'B'|** avec le compas (l'ouvrir à cette nouvelle ouverture).
4. **Placer le compas en A''**. Tracer l'arc de rayon `|A'B'|`.
5. **B''** = intersection de l'arc(V', r) avec l'arc(A'', |A'B'|).
6. **Règle** : tracer la droite (V', B''). C'est le 2ᵉ côté de β.

## Décisions tranchées

| #   | Décision                                                                                      |
| --- | --------------------------------------------------------------------------------------------- |
| Q1  | `r` = 1 unité math (constante). Pas de heuristique adaptative en V1.                          |
| Q2  | Côté 1 de β = rayon de direction `(V', dir)` (réutilisé du builtin V3a) ; côté 2 = (V', B''). |
| Q3  | 6 sub-steps au total (compass-draw × 3, point-fade-in × 2, ruler-trace × 1).                  |
| Q4  | Réutiliser `figure.createIntersectionCC` (pattern mediatrice) pour B''.                       |
| Q5  | Pas de release / push automatique.                                                            |
| Q6  | Une seule voie `compas_report` (default). Pas de variantes V1.                                |

## Spec des 6 sub-steps

| #   | Kind            | Instrument     | Cible                  | Animation                              |
| --- | --------------- | -------------- | ---------------------- | -------------------------------------- | --- | ---------------- |
| 1   | `compass-draw`  | compass        | V (rayon r)            | arc à V, animé progressivement         |
| 2   | `compass-draw`  | compass        | V' (rayon r, conservé) | arc à V', animé                        |
| 3   | `point-fade-in` | —              | —                      | A', B', A'' apparaissent simultanément |
| 4   | `compass-draw`  | compass        | A'' (rayon `           | A'B'                                   | `)  | arc à A'', animé |
| 5   | `point-fade-in` | —              | —                      | B'' apparaît                           |
| 6   | `ruler-trace`   | ruler + pencil | V' → B''               | segment tracé progressivement          |

## Fichiers à toucher

### Nouveaux

- `src/lib/constructions-v2/core/choreographies/transporte.ts` (~350 LoC)

### Modifiés

- `src/lib/constructions-v2/core/choreographies/registry.ts` (+1 entrée REGISTRY + 1 import)
- `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` (+~8 tests : 6 todos + 2 actifs)
- `src/lib/geometry-core/rendering/__tests__/angle-canonical-cases.test.ts` (+2 tests post-anim)
- `docs/ref/geometry/dsl-builtins.md` (section `transporte` : ajouter sous-section chorégraphie)

## Cas dégénérés

- **α plat** (mesure = π) : A' et B' se confondent → `|A'B'| = 0` → arc à A'' dégénéré. **Décision** : laisser passer (β plat cohérent).
- **V' = V** : V3a builtin rejette déjà avec `DslRuntimeError`. La chorégraphie ne sera donc pas appelée.
- **Direction nulle** : V3a builtin rejette aussi.
- **α nul** (mesure = 0) : A' et B' confondus, |A'B'| = 0, B'' = A''. Cas dégénéré, animation cohérente.

## Risques connus

| Risque                                                                  | Mitigation                                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `createIntersectionCC` retourne 2 solutions pour B'' — choisir la bonne | `k` (0 ou 1) selon signe du produit vectoriel : B'' du même côté que B' par rapport au rayon de direction. |
| Animation timing compass slide V→V'                                     | Réutiliser `INSTRUMENT_MOVE_SPEED` du projet (cohérent bissectrice/mediatrice).                            |
| Cas dégénéré α plat fait planter le calcul intersection                 | Tests P0 couvrent. Si null, laisser l'animation se dérouler avec arc dégénéré (visuel cohérent).           |

## Liens

- Plan : `/Users/david/.claude/plans/lucky-watching-fairy.md`
- Builtin source : `src/lib/geometry-core/dsl/builtins.ts:3605` (`handleTransporte`)
- Référence chore : `src/lib/constructions-v2/core/choreographies/bissectrice.ts` (874 LoC)
- Tests pattern : `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts:229-277` (bissectrice tests)
- Code-review V1 angle : finding A1 différé jusqu'à présent.
