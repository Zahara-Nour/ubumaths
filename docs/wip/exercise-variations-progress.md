# Exercise Variations Implementation Progress

**Feature**: Systeme de variations pour les exercices
**Started**: 2025-12-18
**Last Updated**: 2025-12-18

## Status

| Phase                                    | Status       | Commit   |
| ---------------------------------------- | ------------ | -------- |
| Phase 1 : Types et Helpers               | ✅ Completed | d1e77d90 |
| Phase 2 : Migration DB                   | ✅ Completed | d1e77d90 |
| Phase 3 : Parser {{hint:id}}             | ✅ Completed | d1e77d90 |
| Phase 4 : Instance Generator             | ✅ Completed | d1e77d90 |
| Phase 5 : Validation Zod                 | ✅ Completed | d1e77d90 |
| Phase 6.1-6.2 : HintReference + Renderer | ✅ Completed | d1e77d90 |
| Phase 6.3-6.5 : Editors                  | ✅ Completed | 186f2175 |
| Phase 6.6 : ExerciseDisplay              | ✅ Completed | 18d171c3 |
| Phase 7 : Server & API                   | ✅ Completed | e4408a7f |
| Phase 8 : Tests                          | ⏳ Pending   | -        |

## Files Modified (Committed)

### Types

- `src/lib/exercises/types.ts` - Added ExerciseVariation, ExerciseHint, SharedExerciseDefaults, helpers

### Database

- `supabase/migrations/20251218120000_add_exercise_variations.sql` - JSONB columns + data migration

### Parser

- `src/lib/custom-markdown/types/ast.ts` - HintReferenceNode
- `src/lib/custom-markdown/types/index.ts` - Export
- `src/lib/custom-markdown/parser/markdown-parser.ts` - {{hint:id}} parsing

### Instance Generator

- `src/lib/exercises/generator/instance-generator.ts` - Variation selection + merging

### Validation

- `src/lib/server/validation/exercises.ts` - Zod schemas for variations

### Components

- `src/lib/components/markdown/nodes/HintReference.svelte` - NEW
- `src/lib/components/markdown/MarkdownRenderer.svelte` - hints prop
- `src/lib/components/markdown/nodes/ParagraphNode.svelte` - hint rendering
- `src/lib/components/markdown/nodes/HeadingNode.svelte` - hint rendering
- `src/lib/components/markdown/nodes/ListNode.svelte` - hint rendering

## Files Committed (Phase 6.3-6.5)

### Editors

- `src/lib/components/exercises/HintEditor.svelte` - NEW
- `src/lib/components/exercises/VariationEditor.svelte` - NEW
- `src/lib/components/exercises/ExerciseForm.svelte` - Modified with tabs UI

## Decisions Made

1. **Migration**: Auto-conversion des exercices existants vers variations[0] avec label 'default'
2. **Shared defaults**: Variables partagees entre toutes les variations
3. **DB Storage**: Colonnes JSONB `variations` et `shared`
4. **Solution**: Par variation (peut s'adapter au niveau de guidage)
5. **Labels**: Explicites ('guided', 'intermediate', 'autonomous', ou custom)
6. **Hints**: Modele hybride - champ `hints[]` par variation + references `{{hint:id}}` dans markdown

## Next Steps

1. Phase 6.6: Update ExerciseDisplay.svelte
2. Phase 7: Server & API updates
3. Phase 8: Tests

## Plan File

See `/Users/david/.claude/plans/partitioned-mapping-fox.md` for full implementation plan.
