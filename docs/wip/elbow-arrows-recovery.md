# Recovery Document: Elbow Arrows Migration

## Current Status: BLOCKED - Everything is broken

### What was attempted

Migration of arrows to Excalidraw-style behavior (Phases 1-4 in plan file).

### What is broken RIGHT NOW

1. **A\* Routing**: Paths go THROUGH rectangles, along sides incorrectly
2. **Hover highlight**: Shows L-shape instead of actual rendered path
3. **Hit-testing**: Doesn't match rendered path
4. **Bindings**: Anchor points not respected

### Root cause

The implementation was done by making assumptions instead of properly studying and adapting Excalidraw's code.

### What MUST be done

1. **Study Excalidraw's code thoroughly** in `extern/excalidraw/packages/element/src/`:

   - `elbowArrow.ts` (2,298 lines) - the complete A\* routing implementation
   - `linearElementEditor.ts` - point editing
   - `heading.ts` - direction system
   - How they handle bindings, obstacle avoidance, path storage

2. **Understand the data flow**:

   - How Excalidraw creates elbow arrows
   - How points[] is populated and updated
   - How bindings determine exit/entry headings
   - How obstacle AABBs are calculated

3. **Adapt properly** - don't guess, copy the logic

### Plan file location

`/Users/david/.claude/plans/imperative-jingling-moon.md`

### Key UbuMaths files

- `src/lib/whiteboard/core/elbow-routing.ts` - broken A\* implementation
- `src/lib/whiteboard/core/binding.ts` - arrow creation with bindings
- `src/lib/whiteboard/core/binding-updates.ts` - updates when shapes move
- `src/lib/whiteboard/core/heading.ts` - heading system
- `src/lib/whiteboard/core/aabb.ts` - bounding boxes
- `src/lib/whiteboard/components/SelectionLayer.svelte` - hover highlight
- `src/lib/whiteboard/core/hit-testing.ts` - click detection

### Git state

- Branch: main (16 commits ahead of origin)
- Modified files: SelectionLayer.svelte, hit-testing.ts (uncommitted changes with debug code)

### Recommendation

Start fresh context with instruction: "Study extern/excalidraw elbow arrow code and fix our broken implementation"
