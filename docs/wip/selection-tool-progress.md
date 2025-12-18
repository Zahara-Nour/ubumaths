# Selection Tool Implementation Progress

## Plan

See: `/Users/david/.claude/plans/luminous-riding-thimble.md`

## Status

| Etape | Description           | Status    | Commit   |
| ----- | --------------------- | --------- | -------- |
| 1     | Store Selection State | Completed | 5c8752ff |
| 2     | Module Hit-Testing    | Completed | Pending  |
| 3     | SelectionLayer Visuel | Pending   | -        |
| 4     | Click to Select       | Pending   | -        |
| 5     | Drag to Move          | Pending   | -        |
| 6     | Resize Handles        | Pending   | -        |
| 7     | Keyboard Shortcuts    | Pending   | -        |

---

## Etape 1: Store Selection State

**Status**: Completed
**Commit**: 5c8752ff

### Files Modified

- `src/lib/whiteboard/stores/whiteboard.svelte.ts` - Added selection state and methods

### Files Created

- `src/lib/whiteboard/tests/selection.svelte.test.ts` - 22 tests

### Implementation

- `selectedIds` Set to track selected element IDs
- `selectedElements` derived array with full element objects
- `hasSelection` derived boolean
- `selectElement(id, addToSelection?)` - select element, optionally add to existing
- `clearSelection()` - deselect all
- `deleteSelected()` - remove selected elements from page
- Auto-clear selection on page change

---

## Etape 2: Module Hit-Testing

**Status**: Completed
**Commit**: Pending

### Files Created

- `src/lib/whiteboard/core/hit-testing.ts` - Hit testing algorithms
- `src/lib/whiteboard/tests/hit-testing.test.ts` - 44 tests

### Implementation

- `pointToSegmentDistance()` - geometry utility for stroke hit testing
- `hitTestStroke(point, stroke, tolerance)` - test point-to-stroke-segments
- `hitTestShape(point, shape, tolerance)` - test using calculateShapeBounds
- `hitTestImage(point, image, tolerance)` - point-in-rect with tolerance
- `hitTestTextBlock(point, textblock, tolerance)` - point-in-rect with tolerance
- `hitTestElements(point, elements, tolerance)` - returns topmost hit (reverse z-order)
- `getElementBounds(element)` - bounding box calculation for all element types

### Notes

- Default tolerance: 5px
- Code review caught missing tolerance usage in hitTestImage/hitTestTextBlock - fixed
- All 44 tests passing

---

## Next Steps

### Etape 3: SelectionLayer Visuel

- Create `src/lib/whiteboard/components/SelectionLayer.svelte`
- Display selection rectangle (dashed blue stroke)
- Display 8 resize handles for shapes/images
- Integrate into WhiteboardCanvas as layer 5
