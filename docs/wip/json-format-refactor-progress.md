# JSON Format Refactorization - Completed

## Status: COMPLETED

Date: 2025-12-07

## Objective

Simplify the JSON format for geometric constructions by eliminating redundancies and double nesting.

## Changes Summary

### Old Format (Verbose)

```json
{ "type": "action", "action": { "kind": "moveTo", "target": "pencil", "x": 100, "y": 200 } }
{ "type": "create", "object": { "kind": "point", "id": "A", "x": 100, "y": 200 } }
```

### New Format (Simplified)

```json
{ "move": "pencil", "to": [100, 200] }
{ "point": "A", "at": [100, 200], "label": "A" }
```

## Step Types

### Objects (first key = type, value = id)

| Step   | Example                                                                   |
| ------ | ------------------------------------------------------------------------- |
| Point  | `{ "point": "A", "at": [100, 200], "label": "A" }`                        |
| Line   | `{ "line": "seg1", "to": "B" }` or `{ "line": "seg1", "to": [300, 400] }` |
| Arc    | `{ "arc": "c1", "sweep": 90 }`                                            |
| Circle | `{ "circle": "c1", "center": "O", "radius": 100 }`                        |
| Text   | `{ "text": "t1", "at": [100, 200], "content": "Hello" }`                  |
| Mark   | `{ "mark": "m1", "at": [100, 200], "angle": 45 }`                         |

### Instruments (first key = action, value = instrument)

| Step   | Example                                  |
| ------ | ---------------------------------------- |
| Move   | `{ "move": "pencil", "to": [100, 200] }` |
| Show   | `{ "show": "ruler" }`                    |
| Hide   | `{ "hide": "compass" }`                  |
| Rotate | `{ "rotate": "compass", "to": 155 }`     |
| Spread | `{ "spread": "compass", "radius": 100 }` |
| Raise  | `{ "raise": "compass" }`                 |
| Lower  | `{ "lower": "compass" }`                 |

### Control

| Step     | Example                              |
| -------- | ------------------------------------ |
| Pause    | `{ "pause": 1000 }`                  |
| Parallel | `{ "parallel": [...steps...] }`      |
| Style    | `{ "style": "t1", "color": "gray" }` |

## Files Modified

1. `src/lib/constructions/schemas.ts` - Refactored Zod schemas for flat format
2. `src/lib/constructions/types.ts` - Aligned TypeScript types with schemas
3. `src/lib/constructions/converter.ts` - Emits new flat format with validation
4. `src/lib/constructions/core/engine.svelte.ts` - Consumes new format
5. `src/lib/constructions/converter.test.ts` - Updated tests (44 passing)
6. `src/routes/(protected)/constructions/+page.server.ts` - Fixed type mismatch

## Files Deleted (Obsolete)

- `src/lib/constructions/actions/` (entire directory)
- `src/lib/constructions/objects/` (entire directory)
- `src/lib/constructions/core/registry.ts`

## Key Decisions

1. **No backward compatibility** - Old format not supported
2. **Implicit positions** - Line `from` uses current pencil position, arc `center` uses compass position
3. **Integrated labels** - Labels merged into point creation when `nommer` precedes `creer`
4. **Coordinate tuples** - `[x, y]` instead of `{x, y}` for compactness
5. **Zod validation on output** - Converter validates generated scripts

## Duration Calculation Architecture (2025-12-07)

### Problem

Animation durations were being calculated in the converter and emitted in JSON. This meant:

- JSON was verbose with `duration` fields everywhere
- Users creating constructions manually had to calculate speeds themselves
- The converter needed to track positions (duplicating engine logic)

### Solution

Moved duration calculation to the Engine:

1. **Timeline** (`timeline.svelte.ts`):
   - Added `LoadOptions` interface with optional `stepDurations: number[]`
   - `load()` method accepts options parameter
   - `#calculateStepTimings()` uses pre-calculated durations when provided

2. **Engine** (`engine.svelte.ts`):
   - Added `#calculateStepDurations()` method that simulates step execution
   - Tracks instrument positions and rotations during simulation
   - Calculates durations based on distances (1.5ms/pixel) and angles (5ms/degree)
   - Passes calculated durations to Timeline via `LoadOptions`

3. **Converter** (`converter.ts`):
   - Removed duration calculation functions
   - Only emits `duration` when XML specifies `vitesse` attribute
   - Most steps have no `duration` field - Engine calculates at runtime

### Duration Formulas

| Movement Type       | Formula             | Min   | Max    |
| ------------------- | ------------------- | ----- | ------ |
| Translation         | 1.5 × distance (px) | 300ms | 2000ms |
| Rotation            | 5 × angle (degrees) | 200ms | 1500ms |
| Object creation     | 100ms (instant)     | -     | -      |
| Drawing (line, arc) | 500ms               | -     | -      |
| Spread (compass)    | 300ms               | -     | -      |

### Benefits

- JSON is cleaner without `duration` everywhere
- Users can write constructions without calculating speeds
- Duration calculation is centralized in Engine
- XML `vitesse` attribute still respected when specified

## Converter Cleanup (2025-12-07)

### Problem

After moving duration calculation to Engine, the Converter still tracked instrument positions and rotations internally - this was now dead code.

### Cleanup

Removed the following from `converter.ts`:

**Context fields removed:**

- `instrumentPositions: Map<string, Position>` - tracked instrument positions
- `instrumentRotations: Map<string, number>` - tracked instrument angles
- `compassRadius: number` - tracked compass opening

**Helper functions removed:**

- `calculateAngleToTarget()` - calculated angle from one position to another
- `getInstrumentPosition()` / `setInstrumentPosition()` - position getters/setters
- `getInstrumentRotation()` / `setInstrumentRotation()` - rotation getters/setters
- `_normalizeAngleDelta()` - angle normalization helper

**Action handlers cleaned:**

- `convertPencilAction`: removed `setInstrumentPosition` calls
- `convertRulerAction`: removed all position/rotation tracking
- `convertCompassAction`: removed all position/rotation/radius tracking
- `convertSetSquareAction`: removed `setInstrumentPosition` call

### Result

The Converter now emits purely declarative JSON:

- `{ "move": "pencil", "to": "T" }` - reference to point T (Engine resolves position)
- `{ "rotate": "compass", "toward": "A" }` - reference to point A (Engine calculates angle)
- `{ "spread": "compass", "to": "B" }` - reference to point B (Engine calculates distance)

No more absolute positions computed during conversion - all resolution happens at runtime in the Engine.

## Validation

- TypeScript: 0 errors in constructions module
- Lint: 0 errors (warnings are pre-existing, not in constructions)
- Tests: 87/87 passing (44 converter + 43 evaluator)
