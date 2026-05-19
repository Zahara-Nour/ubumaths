# V1 chorégraphies — Progression

> Session : 2026-05-19
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Spec : `docs/wip/v1-choreographies-phase0-tdd.md`

## Statut global

| Phase                                   | Statut                                 | Commit                                                                       | Tests ajoutés |
| --------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- | ------------- |
| Phase 0 — Spécification TDD             | ✓ livrée                               | `e29b7938b` (inclus avec P1)                                                 | —             |
| Phase 1 — Parser décorateurs en suffixe | ✓ livrée                               | `e29b7938b`                                                                  | 22            |
| Phase 2 — Registre + résolveur          | ✓ livrée                               | `e4daaca76`                                                                  | 23            |
| Phase 3 — Wiring ConstructionExecutor   | ✓ livrée                               | `2ae801cac`                                                                  | 8             |
| Améliorations animation (lines/rays)    | ✓ livrées                              | `259a09154`, `4b5f57913`, `00adc9f68`, `76a162b7d`, `97b5b52f0`, `20400837c` | 0 (UX only)   |
| Phase 4 — Chorégraphies concrètes       | ⏸ à reprendre (sub-steps nécessaires) | reverted                                                                     | —             |
| Phase 5 — Gestion visibilité finale     | ⏸ à reprendre (couplée à P4)          | reverted                                                                     | —             |
| Phase 6 — Documentation auto-générée    | ⏸ à démarrer                          | —                                                                            | —             |
| Phase 7 — Validation finale             | ⏸ à démarrer                          | —                                                                            | —             |

**Total tests V1 ajoutés à ce stade** : 53.
**Suite complète geometry-core + constructions-v2** : 3477/3479 (2 skipped) verts, 0 régression.

## Pourquoi le revert de Phase 4/5

Test manuel dans `/construction-demo` a révélé que l'approche « tout-en-1-step » des chorégraphies V1 produit une animation parallèle (les 2 arcs + la droite tracés ensemble) sans la séquence pédagogique attendue. Pour avoir :

1. Compas en A trace l'arc 1
2. Compas en B trace l'arc 2
3. Points d'intersection apparaissent
4. Règle + crayon tracent la droite

il faut le mécanisme **sub-steps** : un step DSL chorégraphié produit N sous-étapes d'animation distinctes (chacune avec son instrument, durée, phases). C'est un refactor du pipeline `_stepPhases` / timeline / canvas — environ 200-400 lignes — qui n'a pas été fait dans cette session.

Décision : **conserver l'infrastructure** (Phases 0-3 + améliorations animation indépendantes) et **différer Phase 4** à une session dédiée. Le code de chorégraphie active a été retiré ; les voies sont déclarées avec des stubs `NOT_YET_IMPLEMENTED`. Le wiring reste actif (les décorateurs sont parsés, validés, résolus, exposés à l'executor — juste pas consommés visuellement).

## Architecture livrée (Phases 0-3)

### Décorateurs DSL en suffixe d'assignation

Le parser DSL reconnaît `d = mediatrice(A, B) @euclide @arcs_egaux @epure` et capture les décorateurs sur `DslAssignment.decorators`. Token `AT_DIRECTIVE` déjà existant, juste consommé en suffixe d'expression. Aucun impact sur la sémantique géométrique de `geometry-core`.

### Registre modulaire

Structure créée : `src/lib/constructions-v2/core/choreographies/` avec un fichier par builtin (`mediatrice.ts`, `bissectrice.ts`, `parallele.ts`, `cercle_circonscrit.ts`). Le `registry.ts` centralise. Les types (`Voie`, `ChoreographyFn`, `ChoreographyResult`, `ChoreographyCtx`, `DecoratorTriple`) sont dans `types.ts`.

7 voies déclarées (chorégraphies actuellement NOT_YET_IMPLEMENTED — stubs vides) :

| Builtin            | Voie                       | Contrainte | Source                |
| ------------------ | -------------------------- | ---------- | --------------------- |
| mediatrice         | `arcs_egaux` (défaut)      | euclide    | Euclide I.10          |
| mediatrice         | `cercles_rayon_ab`         | euclide    | Variante visuelle     |
| bissectrice        | `arcs_egaux` (défaut)      | euclide    | Euclide I.9           |
| bissectrice        | `arc_milieu`               | euclide    | Variante par milieu   |
| parallele          | `parallelogramme` (défaut) | euclide    | Euclide I.31          |
| parallele          | `double_perpendiculaire`   | euclide    | Variante moderne      |
| cercle_circonscrit | `mediatrices` (défaut)     | euclide    | Composition canonique |

### Résolveur strict

`resolveDecorators(decorators, builtinName)` : valide et retourne `{ contrainte, methode, visibilite }`. Erreurs explicites avec hints sur :

- Décorateur inconnu (`@invalid`)
- Contraintes mutuellement exclusives (`@euclide @mesure`)
- Visibilités mutuellement exclusives (`@epure @squelette`)
- Méthode non disponible pour ce (builtin, contrainte)
- Plusieurs méthodes simultanées
- Builtin sans chorégraphie déclarée
- Contrainte non disponible pour ce builtin

### Wiring executor

`ConstructionExecutor` :

- **Au load** : `calculateStepDurations` valide les décorateurs de chaque assignment décoré ; en cas d'erreur, propage via `_loadError` (figure partielle préservée).
- **À chaque step** : `resolveCurrentDecorators` lit `stepper.nextStatement`, résout les décorateurs et expose `currentDecoratorTriple` + `currentVoie` aux consommateurs (canvas, animator).
- **`reset()`** : nettoie les états décorateurs.

### Comportement actuel après Phase 3

- Les scripts existants (sans décorateur) fonctionnent **exactement** comme avant. 0 régression.
- Les scripts avec décorateurs validés (`@euclide`, etc.) sont acceptés au parse + au load. `currentVoie` est résolue.
- L'animation se déroule encore avec le pipeline par défaut (les chorégraphies retournent `steps: []`). **Pas encore de différence visuelle entre `@direct` et `@euclide`**.

## Phase 4 MVP livré (1 voie) — `mediatrice @euclide`

Le wiring complet de la chorégraphie `arcs_egaux` (et sa variante `cercles_rayon_ab`) est livré. Quand le script DSL contient `d = mediatrice(A, B) @euclide` :

1. Le builtin `mediatrice` s'exécute et crée la droite + ses helpers internes hidden.
2. La chorégraphie `arcs_egaux` est invoquée via `runChoreographyIfAny` dans l'`executor.step()`. Elle crée :
   - **2 cercles** (compas en A et en B, rayon `0.7 × |AB|` ou `|AB|` selon `@cercles_rayon_ab`).
   - **2 points d'intersection** (où les cercles se coupent — ils sont sur la médiatrice).
3. Le pipeline d'animation existant (`_lastStepNewElementIds`, `autoShowInstruments`) prend en charge ces nouveaux drawables : les 2 cercles sont animés progressivement avec le compas.

### Mécanisme implémenté

- `runChoreographyIfAny(stmt)` (executor.ts) : récupère le builtin, construit le `ChoreographyCtx` avec `figure`, `args (ids+coords)`, `principalId`, `visibilite`, et un `sub` stub.
- `resolveCallArgs(callArgs)` : résout les arguments du builtin (identifiers → figureIds + coords).
- `_lastChoreographyResult` : stockée pour usage Phase 5.

### Limitations connues (à adresser plus tard)

- **`'line'` n'est pas dans `DRAWABLE_TYPES`** : la médiatrice elle-même apparaît sans animation progressive. Les 2 cercles sont animés mais la droite finale apparaît instantanément. Fix : ajouter `'line'` à `DRAWABLE_TYPES` en V1.1.
- **Animation parallèle** : les 2 cercles sont animés EN PARALLÈLE (pas séquentiellement A puis B). Pour la séquentialité (vrai pédagogique), il faut le mécanisme de sub-steps (Phase 4 future).
- **Visibilité finale non appliquée** : les éléments restent visibles à la fin du step, indépendamment de `@epure`/`@squelette`/`@complet`. Phase 5 implémentera `applyFinalVisibility(figure, produced, visibilite)`.
- **Pas de pre-pass dans `calculateStepDurations`** : les chorégraphies sont appelées uniquement dans `step()`, pas dans le pré-pass qui calcule les durées. Conséquence : la durée du step n'inclut pas le temps d'animation des cercles. C'est imprécis mais fonctionnel pour V1 MVP.

### Test manuel recommandé

Dans `/construction-demo`, taper :

```dsl
A = point(-3, 0)
B = point(3, 0)
d = mediatrice(A, B) @euclide
```

Comportement attendu : après le step pour `d`, les 2 cercles de compas + la droite + 2 points d'intersection apparaissent. Confirmation visuelle nécessaire avant de continuer aux 6 voies restantes.

## Phase 4 — Voies restantes

La Phase 4 nécessite des décisions architecturales sur **comment intégrer les `ChoreographyStep[]` dans le pipeline d'animation existant**. Deux options identifiées :

**Option A** : Garder le pipeline actuel (1 step DSL = 1 step d'animation) et override les targets d'instruments / ids à animer. Limité : ne supporte pas la composition `cercle_circonscrit → 2 médiatrices`.

**Option B** : Permettre aux chorégraphies de générer des **sub-steps** injectés dans la timeline globale. L'executor traite ces sub-steps comme des steps normaux. Nécessaire pour la composition en chaîne.

**Recommandation** : Option B, mais introduire d'abord un **mini-MVP** sur une seule voie (par exemple `mediatrice @euclide @arcs_egaux`) pour valider visuellement le mécanisme dans `/construction-demo` AVANT de scaler aux 7 voies.

**Difficulté estimée** : Phase 4 est environ 5-8x plus longue que Phases 1-3 combinées. Plusieurs commits attendus, avec validation visuelle entre chacun.

## Fichiers livrés (Phases 0-3)

| Fichier                                                                      | Phase | Type                               |
| ---------------------------------------------------------------------------- | ----- | ---------------------------------- |
| `docs/wip/v1-choreographies-phase0-tdd.md`                                   | 0     | spec                               |
| `src/lib/geometry-core/dsl/types.ts`                                         | 1     | edit (`DslAssignment.decorators?`) |
| `src/lib/geometry-core/dsl/parser.ts`                                        | 1     | edit (`parseTrailingDecorators`)   |
| `src/lib/geometry-core/dsl/__tests__/parser-decorators.test.ts`              | 1     | new (22 tests)                     |
| `src/lib/constructions-v2/core/choreographies/types.ts`                      | 2     | new                                |
| `src/lib/constructions-v2/core/choreographies/registry.ts`                   | 2     | new                                |
| `src/lib/constructions-v2/core/choreographies/resolve.ts`                    | 2     | new                                |
| `src/lib/constructions-v2/core/choreographies/mediatrice.ts`                 | 2     | new (stubs)                        |
| `src/lib/constructions-v2/core/choreographies/bissectrice.ts`                | 2     | new (stubs)                        |
| `src/lib/constructions-v2/core/choreographies/parallele.ts`                  | 2     | new (stubs)                        |
| `src/lib/constructions-v2/core/choreographies/cercle_circonscrit.ts`         | 2     | new (stubs)                        |
| `src/lib/constructions-v2/core/__tests__/choreographies-resolve.test.ts`     | 2     | new (23 tests)                     |
| `src/lib/constructions-v2/core/executor.ts`                                  | 3     | edit (wiring)                      |
| `src/lib/constructions-v2/core/__tests__/choreographies-integration.test.ts` | 3     | new (8 tests)                      |
| `docs/wip/v1-choreographies-progress.md`                                     | 3     | new (ce fichier)                   |

## Pour reprendre la Phase 4

Lire dans l'ordre :

1. Ce fichier (état actuel).
2. `docs/wip/v1-choreographies-phase0-tdd.md` section P0.4 et P0.5 (specs animations + visibilité).
3. `/Users/david/.claude/plans/reflective-munching-catmull.md` section "Phase 4" (détails par builtin + voie + mécanisme `ctx.sub`).
4. Code existant : `constructions-v2/core/executor.ts:autoShowInstruments` et `calculateStepDurations` (le pipeline qu'il faut étendre).
5. `constructions-v2/components/ConstructionCanvas.svelte` (rendu overlay actuel).

Validation utilisateur recommandée avant de démarrer Phase 4 : valider le choix Option A vs B + décider du périmètre du mini-MVP (1 voie ou plusieurs en lot).
