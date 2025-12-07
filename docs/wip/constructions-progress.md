# Constructions Module - Implementation Progress

**Status**: ACTIVE
**Date**: 2025-12-07

## Summary

Complete rewrite of InstrumenPoche (geometry animation player) into Svelte 5 + TypeScript for ubumaths.

## Completed Phases

### Phase 1: MVP Core

- `src/lib/constructions/types.ts` - TypeScript types (discriminated unions)
- `src/lib/constructions/schemas.ts` - Zod validation schemas
- `src/lib/constructions/constants.ts` - SVG namespace, default colors
- `src/lib/constructions/core/evaluator.ts` - Expression evaluator (uses mathAST)
- `src/lib/constructions/core/renderer.ts` - SVG utilities
- `src/lib/constructions/core/engine.svelte.ts` - Animation state machine
- `src/lib/constructions/objects/` - Point, Segment, Circle, Arc, Line, Ray, Polygon, Text, AngleMark
- `src/lib/constructions/instruments/ruler.ts` - Graduated ruler
- `src/lib/constructions/components/` - Player, Canvas, Controls, ParameterControls

### Phase 2: Advanced Timeline

- `src/lib/constructions/core/timeline.svelte.ts` - Timeline with seek/scrub
- `src/lib/constructions/utils/easing.ts` - Easing functions
- `src/lib/constructions/actions/translate.ts` - Translation animations
- `src/lib/constructions/actions/rotate.ts` - Rotation animations
- `src/lib/constructions/components/TimelineSlider.svelte` - Interactive slider
- `src/lib/constructions/components/SpeedControl.svelte` - Playback speed

### Phase 3: Registry + Actions

- `src/lib/constructions/core/registry.ts` - Extensible registry system
- `src/lib/constructions/actions/create.ts` - CreateActionExecutor
- `src/lib/constructions/actions/show-hide.ts` - Show/Hide executors
- `src/lib/constructions/actions/pause.ts` - PauseActionExecutor

### Phase 4: Advanced Instruments

- `src/lib/constructions/instruments/compass.ts` - Animated compass
- `src/lib/constructions/instruments/pencil.ts` - Drawing pencil
- `src/lib/constructions/actions/draw.ts` - DrawArc/DrawLine executors

### Phase 5: Supabase Integration + Routes

- `supabase/migrations/20251204100000_create_constructions_table.sql` - Database table with RLS
- `supabase/migrations/20251206184559_add_tags_to_constructions.sql` - Add tags column for categorization
- `src/routes/api/constructions/+server.ts` - API CRUD (GET/POST)
- `src/routes/api/constructions/[id]/+server.ts` - API individual (GET/PUT/DELETE)
- `src/routes/(protected)/constructions/+page.svelte` - List page
- `src/routes/(protected)/constructions/+page.server.ts` - List page server
- `src/routes/(protected)/constructions/[id]/+page.svelte` - Player page
- `src/routes/(protected)/constructions/[id]/+page.server.ts` - Player page server

### Phase 6: InstrumenPoche Conversion

- `src/lib/constructions/converter.ts` - Browser-compatible XML to JSON converter
- `src/lib/constructions/converter.test.ts` - 34 unit tests for converter
- `src/lib/constructions/components/JsonEditor.svelte` - CodeMirror-based JSON editor
- `src/routes/(protected)/constructions/conversion/+page.svelte` - Conversion UI (teachers/admins)
- `src/routes/(protected)/constructions/conversion/+page.server.ts` - Conversion page server
- `src/routes/api/constructions/convert/+server.ts` - Conversion API endpoint
- **Security Features**:
  - Step count limit (1000 max)
  - Array bounds validation (1000 items max)
  - XML parsing timeout (10s)
  - Input size limit (5MB)
  - Role-based access (teachers/admins only)

### Phase 7: Midpoints and Marks

- **Midpoint step**: `{"midpoint": "midpoint_AB"}` - Creates point at midpoint of A and B
  - Position auto-calculated from parent points
  - Recalculates when parent points move
  - Supports label, style, radius, color options
- **Midpoint as target**: `{"move": "pencil", "to": "midpoint_AB"}` - Move to calculated midpoint
  - Works for any target reference (move, place, line, circle center)
- **Mark step refactored**: `{"mark": "mark_AB"}` - Segment length mark
  - ID encodes endpoints (e.g., `mark_A1B1`, `mark_A'B'`)
  - Position calculated from segment midpoint
  - Angle calculated from segment direction
- **Point ID pattern**: `[A-Z][0-9]?'?` (letter, optional digit, optional apostrophe)
  - Examples: A, A1, A', A1'

## Architecture Decisions

1. **JSON Format Only** - No XML compatibility (cleaner, parameterizable)
2. **Parameterized Constructions** - Expressions using mathAST
3. **Keyframe-based Timeline** - Pre-calculated for instant seeking
4. **Registry Pattern** - Extensible for new objects/instruments/actions
5. **Svelte 5 Runes** - Modern reactive state management

## Next Steps

1. ~~Run migration: `pnpm db:migrate`~~ ✓
2. ~~Regenerate types: `pnpm supabase gen types typescript --local > src/lib/types/database.ts`~~ ✓
3. ~~Create sample constructions for testing~~ ✓ (8 InstrumenPoche examples converted)
4. ~~Add conversion UI for teachers/admins~~ ✓
5. Consider future visual editor (Phase 7)

## Files Modified/Created

Total new files: ~45 files in `src/lib/constructions/` + 7 route files + 1 migration
