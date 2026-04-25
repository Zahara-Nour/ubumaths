# Animation drawProgress — Progression

## Statut : Implementation complete, needs visual testing

## Ce qui a ete fait

### Phase 3a : Infrastructure

- `types.ts` : Ajoute `DrawAnimationState` interface et `DRAWABLE_TYPES` set
- `executor.ts` : Ajoute `lastStepNewElementIds` tracking (IDs des segments/arcs/circles crees a chaque step)
- `render-helpers.ts` : NOUVEAU fichier — helpers purs pour rendu partiel (segment, arc, circle, pencil tip)
- `GeometryCanvas.svelte` : Ajoute prop `hiddenElementIds` pour filtrer les elements pendant l'animation

### Phase 3b : Wiring

- `ConstructionPlayer.svelte` : Orchestre l'animation ��� track animatingIds, derive DrawAnimationState depuis stepProgress
- `ConstructionCanvas.svelte` : Overlay SVG pour elements partiels + pencil tracking

### Phase 3c : Tests

- `render-helpers.test.ts` : 15 tests unitaires couvrant segment/arc/circle partiel + pencil tip
- 113 tests total (98 existants + 15 nouveaux) — tous passent
- ESLint + check:incremental : 0 erreur
- Svelte autofixer : 0 issue

## Fichiers modifies

1. `src/lib/constructions-v2/types.ts`
2. `src/lib/constructions-v2/core/executor.ts`
3. `src/lib/constructions-v2/core/render-helpers.ts` (NEW)
4. `src/lib/constructions-v2/core/__tests__/render-helpers.test.ts` (NEW)
5. `src/lib/constructions-v2/components/ConstructionPlayer.svelte`
6. `src/lib/constructions-v2/components/ConstructionCanvas.svelte`
7. `src/lib/components/geometry/GeometryCanvas.svelte`

## Architecture

```
Timeline (RAF, stepProgress 0-1)
    |
ConstructionPlayer (animatingIds + drawProgress)
    |
ConstructionCanvas
    ├── GeometryCanvas: renders all elements EXCEPT those being animated
    ��── SVG overlay: renders animating elements partially + pencil tracking
```

## Prochaines etapes

- [ ] Test visuel sur /construction-demo
- [ ] Duree basee sur la distance (MS_PER_PIXEL \* distance) au lieu de 500ms fixe
- [ ] Animation 3D compas (raise/lower) pour les arcs
- [ ] Commit
