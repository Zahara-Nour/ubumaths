# Whiteboard Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Whiteboard.svelte                        │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │ PageThumbnails  │  │      WhiteboardCanvas.svelte     │ │
│  │   (sidebar)     │  │  ┌────────────────────────────┐  │ │
│  │                 │  │  │   InstrumentLayer          │  │ │
│  │  ┌───────────┐  │  │  ├────────────────────────────┤  │ │
│  │  │ Thumbnail │  │  │  │   Active Stroke Layer      │  │ │
│  │  ├───────────┤  │  │  ├────────────────────────────┤  │ │
│  │  │ Thumbnail │  │  │  │   TextBlockLayer           │  │ │
│  │  ├───────────┤  │  │  │   ImageLayer               │  │ │
│  │  │ Thumbnail │  │  │  │   Content Layer (strokes)  │  │ │
│  │  └───────────┘  │  │  ├────────────────────────────┤  │ │
│  │                 │  │  │   Background Layer         │  │ │
│  └─────────────────┘  │  └────────────────────────────┘  │ │
│  ┌─────────────────────────────────────────────────────┐  │ │
│  │              WhiteboardToolbar.svelte               │  │ │
│  └─────────────────────────────────────────────────────┘  │ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │   whiteboardStore      │
                 │   (Svelte 5 runes)     │
                 └────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   History    │  │ Serialization│  │  PDF Export  │
    │   Manager    │  │   (JSON)     │  │   (jspdf)    │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Data Flow

### 1. User Input → State Update

```
User Action (pointer event, keyboard, UI click)
         │
         ▼
WhiteboardCanvas / WhiteboardToolbar (event handler)
         │
         ▼
whiteboardStore method (setTool, addStroke, etc.)
         │
         ├──► Update internal $state
         │
         └──► Push to history (if state-changing)
         │
         ▼
Svelte reactivity triggers re-render
```

### 2. State → Rendering

```
whiteboardStore.currentPage
         │
         ▼
$derived in WhiteboardCanvas
         │
         ├──► Background (grid/ruled/image/PDF)
         ├──► Content elements (strokes, shapes)
         ├──► Image elements
         ├──► Text blocks
         └──► Instruments (ruler, protractor)
         │
         ▼
SVG DOM updated
```

### 3. Save/Load Flow

```
Save:
  whiteboardStore.document
         │
         ▼
  serialize() → JSON string
         │
         ▼
  Blob creation → Download or Google Drive

Load:
  File/Blob
         │
         ▼
  deserialize() → Parse JSON
         │
         ▼
  validateDocument() → Zod validation
         │
         ▼
  whiteboardStore.loadDocument()
```

## Canvas Layer System

The canvas uses SVG with multiple layers for proper z-ordering:

```svg
<svg class="whiteboard-canvas">
  <!-- Layer 1: Background (lowest) -->
  <g class="background-layer">
    <!-- Grid/ruled/dotted patterns OR imported PDF/image -->
  </g>

  <!-- Layer 2: Content (persisted elements) -->
  <g class="content-layer">
    <!-- Strokes -->
    <path d="..." fill="..." />

    <!-- Shapes -->
    <line x1="..." y1="..." x2="..." y2="..." />
    <rect x="..." y="..." width="..." height="..." />
    <ellipse cx="..." cy="..." rx="..." ry="..." />
  </g>

  <!-- Layer 3: Images -->
  <g class="image-layer">
    <image href="data:..." x="..." y="..." />
  </g>

  <!-- Layer 4: Text Blocks (HTML overlay) -->
  <!-- Rendered outside SVG as positioned divs -->

  <!-- Layer 5: Active stroke (drawing in progress) -->
  <g class="active-stroke-layer">
    <path d="..." class="preview" />
  </g>

  <!-- Layer 6: Instruments (highest, interactive) -->
  <g class="instruments-layer">
    <Ruler />
    <Protractor />
    <SetSquare />
  </g>
</svg>
```

## Store Architecture

The store uses Svelte 5 runes for reactivity:

```typescript
// stores/whiteboard.svelte.ts

class WhiteboardStore {
	// === Primary State ===
	private _document = $state<WhiteboardDocument>(createEmptyDocument());
	private _currentTool = $state<Tool>('pen');
	private _toolSettings = $state<ToolSettings>({
		/* ... */
	});

	// === History ===
	private historyManager = createHistoryManager<WhiteboardDocument>();

	// === Derived State ===
	document = $derived(this._document);
	currentPage = $derived(this._document.pages[this._document.currentPageIndex]);
	pageCount = $derived(this._document.pages.length);
	canUndo = $derived(this.historyManager.canUndo);
	canRedo = $derived(this.historyManager.canRedo);

	// === Methods ===
	setTool(tool: Tool) {
		/* ... */
	}
	addStroke(stroke: StrokeElement) {
		/* ... */
	}
	undo() {
		/* ... */
	}
	redo() {
		/* ... */
	}
	// ... 40+ methods
}

export const whiteboardStore = new WhiteboardStore();
```

## History Management

The history system maintains undo/redo with snapshot-based state:

```typescript
// core/history.svelte.ts

interface HistoryManager<T> {
	current: T;
	canUndo: boolean;
	canRedo: boolean;

	push(state: T): void; // Add new state
	undo(): T | null; // Go back
	redo(): T | null; // Go forward
	clear(): void; // Reset history
}

// Configuration
const MAX_HISTORY_SIZE = 50; // Limit memory usage
```

### History-Tracked Operations

| Operation         | Creates History Entry |
| ----------------- | --------------------- |
| Add stroke        | Yes                   |
| Add shape         | Yes                   |
| Delete element    | Yes                   |
| Move element      | Yes                   |
| Add/delete page   | Yes                   |
| Change tool       | No                    |
| Change color      | No                    |
| Toggle instrument | No                    |

## Coordinate System

```
(0,0) ────────────────────────────► X (width)
  │
  │   A4 Portrait: 794 x 1123 px (96 DPI)
  │   A4 Landscape: 1123 x 794 px
  │
  │   All coordinates are absolute
  │   (no viewport transformation)
  │
  ▼
  Y (height)
```

### Page Formats

| Format          | Width | Height | Aspect Ratio |
| --------------- | ----- | ------ | ------------ |
| A4              | 794   | 1123   | 1:√2         |
| A4_LANDSCAPE    | 1123  | 794    | √2:1         |
| A3              | 1123  | 1587   | 1:√2         |
| A3_LANDSCAPE    | 1587  | 1123   | √2:1         |
| WIDESCREEN_16_9 | 1280  | 720    | 16:9         |
| STANDARD_4_3    | 1024  | 768    | 4:3          |

## Stroke Smoothing Pipeline

```
Raw Pointer Events
  │
  │  [{ x, y, pressure? }, ...]
  │
  ▼
perfect-freehand library
  │
  │  Bezier curve fitting
  │  Pressure sensitivity
  │  Taper effects
  │
  ▼
Outline Points
  │
  │  [[x, y], [x, y], ...]
  │
  ▼
SVG Path Generation
  │
  │  pointsToSvgPath()
  │
  ▼
<path d="M ... C ... Z" />
```

### Tool-Specific Options

```typescript
const toolOptions = {
	pen: {
		size: 3,
		thinning: 0.5,
		smoothing: 0.5,
		streamline: 0.5
	},
	highlighter: {
		size: 20,
		thinning: 0,
		smoothing: 0.7,
		streamline: 0.5
	},
	eraser: {
		size: 10,
		thinning: 0,
		smoothing: 0.3,
		streamline: 0.3
	}
};
```

## Eraser Mechanics

The eraser uses intersection detection rather than white overlay:

```typescript
// Intersection check algorithm
function doStrokesIntersect(strokeA, strokeB): boolean {
	// 1. Quick bounding box check
	if (!boundingBoxesOverlap(strokeA, strokeB)) {
		return false;
	}

	// 2. Segment-to-segment intersection
	for (const segA of strokeA.segments) {
		for (const segB of strokeB.segments) {
			if (segmentsIntersect(segA, segB)) {
				return true;
			}
		}
	}

	return false;
}
```

## Performance Considerations

### Rendering Optimization

1. **Layer Separation**: Static content vs. active drawing
2. **Minimal Re-renders**: Only affected layers update
3. **Lazy Loading**: pdfjs-dist and jspdf loaded on demand
4. **Image Compression**: Large images compressed before storage

### Memory Management

1. **History Limit**: Max 50 undo states
2. **Canvas Cleanup**: Explicit cleanup on errors
3. **URL Revocation**: Blob URLs revoked after use
4. **Autosave Debounce**: 2-second delay prevents excessive writes

### Bundle Impact

```
Without whiteboard:   ~850 KB
With whiteboard:      ~950 KB (+100 KB)

Lazy-loaded (on use):
  - pdfjs-dist:       ~300 KB (PDF import)
  - jspdf:            ~200 KB (PDF export)
```
