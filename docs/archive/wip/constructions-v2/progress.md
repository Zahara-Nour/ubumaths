# Constructions-v2 — Progression

> Derniere mise a jour : 2026-05-18

## Etat : 7 phases terminees + element Arc + phase 9 erreurs runtime

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

## Phase 8 : Element Arc (TERMINEE)

- `GeoArcByAngles` et `GeoArcByPoints` dans `types/elements.ts`
- Factory methods `createArcByAngles()` et `createArcByPoints()` dans `figure.ts`
- `arcToSVG()` dans `svg-primitives.ts` (path SVG avec commande A)
- DSL builtin `arc` avec 2 variantes :
  - `arc(O, rayon=3, debut=0, fin=90)` — angles en degres
  - `arc(A, O, B)` — arc par 3 points (trace d'angle)
- Serialisation/deserialisation round-trip
- Schemas Zod (`arcByAnglesSchema`, `arcByPointsSchema`)
- Rendu dans GeometryCanvas.svelte
- Export TikZ, Typst, SVG
- Convertisseurs mis a jour (cercle → arc quand angles disponibles)
- Tests : 23 (figure, SVG, DSL)

## Phase 9 : Feedback runtime errors (TERMINEE — 2026-05-18)

Surfacage des erreurs DSL d'execution dans `/construction-demo` et `ScriptEditor`. Avant : l'editeur affichait "Script valide" tandis que l'apercu restait vide ou figé en silence quand un builtin throw. Maintenant : panneau rouge enrichi sous l'editeur avec ligne source, message structure et liste de formes acceptees + badge `⚠ Execution interrompue` sur le canvas + figure partielle preservee.

3 changements bundles :

1. **`DslRuntimeError` structurée** (`geometry-core/dsl/errors.ts`) : nouveau type `DslRuntimeErrorDetails { summary, hint?, forms? }`. Constructeur a 2 overloads (string OU objet), retro-compatible avec ~150 sites legacy. ~50 builtins migres (cercle, point, intersection, courbe, tangente, transformations, calculus, coniques, etc.) avec hints et listes de formes contextuelles.

2. **`ConstructionExecutor.load()` resilient** : `calculateStepDurations()` capture les erreurs par iteration, rollback les entrees partielles et stocke `_loadError = { message, line, stepIndex, details }`. La timeline est construite avec les durations des steps valides uniquement. Permet au player de scruber jusqu'au dernier step valide et d'afficher la figure partielle. **Breaking interne** : `executor.load()` ne throw plus pour les `DslRuntimeError`, le caller doit lire `executor.loadError`.

3. **UI** :
   - `ConstructionPlayer.svelte` : nouveau callback `onRuntimeError`, badge non intrusif sur le canvas, canvas + controles preserves quand erreur runtime.
   - `ScriptEditor.svelte` : panneau d'erreur unifie sous l'editeur (parse + runtime), titre rouge mais corps texte normal, source line excerpt, surlignage gutter persistant.
   - Nouveau composant `InlineFormatted.svelte` (50 LOC) : mini-parseur backticks + bold pour le rendu inline-code des messages d'erreur (eviter de charger le full markdown renderer).

Commits : `b157885f2` (UX + executor), `8bcff578b` (30 builtins de base), `e0e4db674` (calculus + coniques), `0ca030d10` (trace + courbe + texte). Tests : 1737/1737 (1617 DSL + 120 v2), 0 regression.

**Reste** : ~150 throws plats dans `builtins.ts` (helpers internes, compile failures profondes) migrables au cas par cas selon les usages reels.

## Resume des tests

| Module                     | Tests   |
| -------------------------- | ------- |
| DSL directives             | 21      |
| DSL stepper                | 16      |
| Executor                   | 16      |
| Timeline                   | 18      |
| Animator                   | 23      |
| Positioning                | 8       |
| Converter                  | 40      |
| Render-helpers             | 15      |
| Arc (figure+SVG+DSL)       | 23      |
| **Total constructions-v2** | **120** |
| geometry-core/dsl total    | 1617    |

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
