# Animation drawProgress — Progression

## Statut : ✅ COMPLET (Phase 3 + 4 livrées, prompt fix instruments résolu)

> Dernière mise à jour : 2026-05-20. Le document précédent était obsolète d'environ 1 mois ; vérification du code source effectuée pour mettre à jour le statut.

## Phase 3 — Infrastructure draw progress (commit `65b634fce`, 2026-04-25)

### 3a. Infrastructure

- `types.ts` : `DrawAnimationState` interface + `DRAWABLE_TYPES` set
- `executor.ts` : `lastStepNewElementIds` tracking (IDs des segments/arcs/circles créés à chaque step)
- `render-helpers.ts` : helpers purs pour rendu partiel (segment, arc, circle, pencil tip)
- `GeometryCanvas.svelte` : prop `hiddenElementIds` pour filtrer les éléments pendant l'animation

### 3b. Wiring

- `ConstructionPlayer.svelte` : orchestration — `animatingIds`, `DrawAnimationState` dérivé du `stepProgress`
- `ConstructionCanvas.svelte` : overlay SVG pour éléments partiels + pencil tracking

### 3c. Tests

- `render-helpers.test.ts` : 15 tests unitaires (segment/arc/circle partiel + pencil tip)
- `pnpm test:server src/lib/constructions-v2/` : 172 tests verts au 2026-05-20

## Phase 4 — Fix instruments (résolu dans des commits postérieurs à `65b634fce`)

Le prompt `prompt-fix-instrument-animation.md` listait Bug 1 (« la règle ne se déplace pas à la même vitesse entre deux segments »). **Ce bug est corrigé** :

- `executor.ts:119` : nouveau champ `_lastInstrumentPositions: Map<InstrumentType, {x, y, rotation}>` indépendant de `visible`
- `executor.ts:760` (`recordMove`) : lit depuis `_lastInstrumentPositions` au lieu de `current.visible`
- Fallback `(-8, 6)` utilisé uniquement à la première apparition de l'instrument
- `calculateStepDurations` et `autoShowInstruments` cohérents (utilisent le même tracker)

Bug 2 du prompt (« easing pas pris en compte ») était explicitement marqué « PAS un bug » dans le prompt même.

Le prompt a été **supprimé** (devenu obsolète).

## Fichiers concernés

1. `src/lib/constructions-v2/types.ts`
2. `src/lib/constructions-v2/core/executor.ts` (notamment `_lastInstrumentPositions`, `recordMove`, `calculateStepDurations`, `autoShowInstruments`)
3. `src/lib/constructions-v2/core/render-helpers.ts`
4. `src/lib/constructions-v2/core/__tests__/render-helpers.test.ts`
5. `src/lib/constructions-v2/components/ConstructionPlayer.svelte`
6. `src/lib/constructions-v2/components/ConstructionCanvas.svelte`
7. `src/lib/components/geometry/GeometryCanvas.svelte`

## Architecture

```
Timeline (RAF, stepProgress 0-1)
    │
ConstructionPlayer (animatingIds + drawProgress + autoInstruments)
    │
ConstructionCanvas
    ├── GeometryCanvas : rend tous les éléments SAUF ceux en cours d'animation
    └── SVG overlay : rend les éléments animés partiellement + pencil tracking + instruments
```

## Comportement vérifié

- Tracé progressif segments/arcs/cercles avec `drawProgress 0→1` et easing
- Crayon suit le tracé avec rotation -45°
- Points apparaissent avec effet fade+bump
- Durée proportionnelle à la distance (`MS_PER_PIXEL * PPU * distance_math`), clampée
- Seek/scrub fonctionne
- Boutons step forward/backward fonctionnent
- `seekToEnd` affiche la figure finale sans instruments
- Règle/compas glissent depuis leur dernière position (Bug 1 fixé)
- Compass raise/lower 3D pour arcs
- Durée mouvement instruments basée sur distance (pas durée fixe)
