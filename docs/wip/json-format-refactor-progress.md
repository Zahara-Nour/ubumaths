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

## Validation

- TypeScript: 0 errors in constructions module
- Lint: 0 errors (warnings are pre-existing, not in constructions)
- Tests: 44/44 passing
