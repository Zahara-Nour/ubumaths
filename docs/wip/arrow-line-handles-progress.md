# Arrow/Line Endpoint Handles - Progress Document

## Context

Date: 2025-01-17
Branch: main
Last commit: `15fb1fb9` - fix(whiteboard): allow binding from inside shapes

## Objective

Replace bounding box selection for arrows/lines with endpoint handles only.

### Current Behavior (BEFORE)

- Arrows and lines have a bounding box with 8 resize handles (like rectangles)
- Dragging moves the whole element
- No way to adjust individual endpoints after creation

### Desired Behavior (IMPLEMENTED)

- Arrows and lines show only 2 endpoint handles (start and end)
- Dragging an endpoint handle moves just that endpoint
- Dragging the line itself (not on a handle) moves the whole element
- When an endpoint is dragged near a shape, binding detection triggers

## Implementation Status - COMPLETE

- [x] Phase 1: Selection Layer Changes
- [x] Phase 2: Canvas Interaction Changes
- [x] Phase 3: Store Changes
- [x] Testing (84 binding tests passing)
- [x] Commit

## Files Modified

| File                      | Changes                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `SelectionLayer.svelte`   | Added endpoint handles for lines/arrows, removed bounding box for these types                 |
| `WhiteboardCanvas.svelte` | Added `onEndpointDrag` and `onEndpointDragEnd` callbacks, live endpoint rendering             |
| `whiteboard.svelte.ts`    | Added `liveEndpoints` state, `setLiveEndpoint`, `commitLiveEndpoint`, `updateElementEndpoint` |

## Technical Implementation

### SelectionLayer.svelte

- Added `isLineOrArrow()` helper function
- Added `EndpointPosition` type ('start' | 'end')
- Added endpoint drag handlers: `handleEndpointPointerDown`, `handleEndpointPointerMove`, `handleEndpointPointerUp`
- Renders circular handles at start/end positions instead of 8-handle bounding box
- No rotation handle for lines/arrows

### WhiteboardCanvas.svelte

- Added `liveEndpoint` check for shape rendering
- Priority for adjustedStart/adjustedEnd: liveEndpoint > bindingLivePos > original position
- Connected endpoint callbacks to store methods

### whiteboard.svelte.ts

- Added `liveEndpoints` Map state
- `setLiveEndpoint(elementId, endpoint, x, y)` - set live preview position
- `getLiveEndpoint(elementId)` - get live endpoint (if any)
- `commitLiveEndpoint(elementId, endpoint, x, y)` - commit and clear live state
- `clearLiveEndpoint(elementId)` - cancel without committing
- `updateElementEndpoint(elementId, endpoint, position)` - update element and handle bindings

## Binding Integration

The endpoint drag system integrates with the existing binding system:

- When an arrow endpoint is dragged near a shape, `findBindingCandidate` detects it
- `createBindingAnchor` creates the binding
- `calculateBoundEndpoint` snaps the arrow to the shape perimeter
- Bindings are updated/cleared appropriately when endpoints move
