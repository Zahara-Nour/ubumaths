# Constructions-v2 — Progression

> Derniere mise a jour : 2026-04-24

## Etat : 7 phases terminees (module complet)

## Phase 1 : Directives DSL (TERMINEE)

- Token `AT_DIRECTIVE`, node `DslDirective`, parsing, interpretation, serialisation
- `DirectiveHandler` callback optionnel, directives ignorees sans handler
- Bug corrige : strings dans `ResolvedValue` etaient perdues
- Tests : 21

## Phase 2 : Stepper API + Executor (TERMINEE)

- `DslStepper` : execution pas-a-pas du DSL (createStepper)
- `ConstructionExecutor` : orchestre stepper + directives (@instrument, @pause, etc.)
- Pre-calcul des durees par step
- `pnpm check:incremental` ajoute (svelte-check --incremental)
- Tests : 30

## Phase 3 : Animation & Instruments (TERMINEE)

- `animator.ts` : partialSegment, partialCircle, partialArc
- `positioning.ts` : rulerPosition, compassPosition
- 6 composants instruments Svelte recycles
- Tests : 26

## Phase 4 : Composants UI (TERMINEE)

- `Timeline` : classe plain JS (pas de $state), callback onUpdate
- `ConstructionCanvas` : GeometryCanvas + overlay instruments
- `ConstructionPlayer` : orchestre executor + canvas + controles
- `PlayerControls`, `TimelineSlider`, `SpeedControl` : props tl + callbacks
- Page demo `/construction-demo`
- Fixes reactivite : figureVersion, currentInstruction, instrumentStates
- Tests : 18

## Phase 5 : ScriptEditor (TERMINEE)

- CodeMirror 6 lazy-loaded avec DSL syntax highlighting
- Validation live via parseDsl() avec error line highlighting
- Split panel : editeur (gauche) + apercu/player (droite)
- Mode edit/play

## Phase 6 : Pages & API (TERMINEE)

- Migration DB : colonnes `format` et `dsl_script`
- API : POST/PUT acceptent dsl_script + format='dsl'
- Pages adaptees : liste (badge format), player (dual JSON/DSL)
- Pages creees : `/constructions/new`, `/constructions/[id]/edit`
- Auth corrige : parent() au lieu de safeGetSession()

## Phase 7 : Convertisseur XML → DSL (TERMINEE)

- `convertXmlToDsl()` : InstrumenPoche XML → DSL text
- Support : points, instruments, tempo, cercle, texte
- Dual parsing : DOMParser (browser) + xml2js (Node.js)
- Tests : 13

## Resume des tests

| Module                     | Tests  |
| -------------------------- | ------ |
| DSL directives             | 21     |
| DSL stepper                | 16     |
| Executor                   | 14     |
| Timeline                   | 18     |
| Animator                   | 18     |
| Positioning                | 8      |
| Converter                  | 13     |
| **Total constructions-v2** | **71** |
| geometry-core (total)      | 1208+  |

## Structure finale

```
src/lib/constructions-v2/
├── types.ts, constants.ts, index.ts
├── converter.ts              # XML → DSL
├── core/
│   ├── executor.ts           # ConstructionExecutor
│   ├── timeline.svelte.ts    # Timeline (plain JS + callback)
│   ├── animator.ts           # Rendu progressif
│   └── __tests__/            # 63 tests
├── instruments/
│   ├── positioning.ts        # Auto-positionnement
│   ├── components/           # 6 Svelte instruments
│   └── __tests__/            # 8 tests
└── components/
    ├── ConstructionPlayer.svelte
    ├── ConstructionCanvas.svelte
    ├── ScriptEditor.svelte
    ├── PlayerControls.svelte
    ├── TimelineSlider.svelte
    ├── SpeedControl.svelte
    └── index.ts

Routes:
├── (public)/construction-demo/    # Demo page
└── (protected)/constructions/
    ├── +page (liste)
    ├── new/ (creation DSL)
    ├── [id]/ (player dual)
    ├── [id]/edit/ (edition DSL)
    └── conversion/ (XML import, existant)
```

## Decisions architecturales

- **Couche au-dessus** de geometry-core (pas d'integration)
- **DSL etendu avec directives @** pour l'animation
- **Timeline plain JS** (pas de $state) — le composant possede l'etat reactif
- **Reactivite CLAUDE.md** : UI event → handler → $state → DOM
- **Retro-compatible** : les constructions JSON existantes fonctionnent toujours
- **Client-only** pour les composants avec $state (evite SSR)
