# Whiteboard Components

## Component Hierarchy

```
Whiteboard.svelte
├── PageThumbnails.svelte (sidebar)
├── WhiteboardCanvas.svelte
│   ├── Background rendering
│   ├── Content rendering (strokes, shapes)
│   ├── ImageLayer.svelte
│   ├── TextBlockLayer.svelte
│   │   └── TextBlock.svelte (multiple)
│   └── InstrumentLayer.svelte
│       ├── Ruler.svelte
│       ├── Protractor.svelte
│       └── SetSquare.svelte
├── WhiteboardToolbar.svelte
└── ExportDialog.svelte
```

---

## Whiteboard.svelte

Main container component that orchestrates the entire whiteboard.

### Usage

```svelte
<script lang="ts">
	import { Whiteboard } from '$lib/whiteboard';
</script>

<Whiteboard />
```

### Features

- Keyboard shortcuts (P, H, E, L, R, C, A, T, Ctrl+Z, Ctrl+Y, PageUp/Down)
- Layout management (canvas + sidebar)
- Focus handling for keyboard events
- Responsive design

### Keyboard Shortcuts

| Key                   | Action                  |
| --------------------- | ----------------------- |
| P                     | Pen tool                |
| H                     | Highlighter tool        |
| E                     | Eraser tool             |
| L                     | Line shape              |
| R                     | Rectangle shape         |
| C                     | Circle shape            |
| A                     | Arrow shape             |
| T                     | Text tool               |
| Ctrl+Z                | Undo                    |
| Ctrl+Y / Ctrl+Shift+Z | Redo                    |
| PageUp                | Previous page           |
| PageDown              | Next page               |
| Delete/Backspace      | Delete selected element |

---

## WhiteboardCanvas.svelte

SVG-based drawing canvas with multi-layer rendering.

### Props

```typescript
interface Props {
	// No external props - uses whiteboardStore directly
}
```

### Internal State

```typescript
let isDrawing = $state(false);
let currentPoints = $state<Point[]>([]);
let shapeStart = $state<Point | null>(null);
let shapeEnd = $state<Point | null>(null);
```

### Pointer Event Handling

```typescript
function handlePointerDown(e: PointerEvent) {
	const point = getPointerPosition(e);

	if (isDrawingTool(currentTool)) {
		isDrawing = true;
		currentPoints = [point];
		svgElement.setPointerCapture(e.pointerId);
	} else if (isShapeTool(currentTool)) {
		shapeStart = point;
	}
}

function handlePointerMove(e: PointerEvent) {
	if (!isDrawing && !shapeStart) return;

	const point = getPointerPosition(e);

	if (isDrawing) {
		currentPoints = [...currentPoints, point];
	} else if (shapeStart) {
		shapeEnd = point;
	}
}

function handlePointerUp(e: PointerEvent) {
	if (isDrawing) {
		finalizeStroke();
	} else if (shapeStart && shapeEnd) {
		finalizeShape();
	}

	isDrawing = false;
	shapeStart = null;
	shapeEnd = null;
}
```

### SVG Structure

```svelte
<svg
	bind:this={svgElement}
	viewBox="0 0 {page.width} {page.height}"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
>
	<!-- Background layer -->
	{#if page.background}
		<BackgroundRenderer background={page.background} />
	{:else}
		<GridPattern type={backgroundStyle} />
	{/if}

	<!-- Content layer (strokes + shapes) -->
	{#each page.elements as element (element.id)}
		<ElementRenderer {element} />
	{/each}

	<!-- Image layer -->
	<ImageLayer />

	<!-- Active stroke preview -->
	{#if isDrawing && currentPoints.length > 0}
		<path d={getStrokePath(currentPoints)} class="active-stroke" />
	{/if}

	<!-- Shape preview (dashed) -->
	{#if shapeStart && shapeEnd}
		<ShapePreview start={shapeStart} end={shapeEnd} tool={currentTool} />
	{/if}

	<!-- Instruments -->
	<InstrumentLayer />
</svg>

<!-- Text blocks (HTML overlay) -->
<TextBlockLayer />
```

---

## WhiteboardToolbar.svelte

Horizontal toolbar at the bottom with collapsible sections.

### Sections

1. **Drawing**: Pen, Highlighter, Eraser
2. **Shapes**: Line, Rectangle, Circle, Arrow
3. **Instruments**: Ruler, Protractor, Set Square
4. **Options**: Color picker, Stroke width slider
5. **Actions**: Undo, Redo, Clear, Export
6. **File**: New, Save, Open

### Props

```typescript
interface Props {
	// No external props - uses whiteboardStore directly
}
```

### Internal State

```typescript
let expandedSection = $state<string | null>(null);
let exportDialogOpen = $state(false);
```

### Section Toggle Pattern

```svelte
<button onclick={() => toggleSection('drawing')} aria-expanded={expandedSection === 'drawing'}>
	<ChevronDown class={expandedSection === 'drawing' ? 'rotate-180' : ''} />
	Drawing
</button>

{#if expandedSection === 'drawing'}
	<div class="section-content" transition:slide>
		<ToolButton tool="pen" />
		<ToolButton tool="highlighter" />
		<ToolButton tool="eraser" />
	</div>
{/if}
```

---

## PageThumbnails.svelte

Right sidebar showing page thumbnails with drag-to-reorder.

### Props

```typescript
interface Props {
	// No external props - uses whiteboardStore directly
}
```

### Features

- Click to navigate to page
- Drag-and-drop reordering
- Add/delete page buttons
- Current page indicator
- Simplified SVG preview

### Drag-and-Drop Implementation

```typescript
let draggedIndex = $state<number | null>(null);
let dragOverIndex = $state<number | null>(null);

function handleDragStart(e: DragEvent, index: number) {
	draggedIndex = index;
	e.dataTransfer?.setData('text/plain', String(index));
}

function handleDragOver(e: DragEvent, index: number) {
	e.preventDefault();
	dragOverIndex = index;
}

function handleDrop(e: DragEvent, toIndex: number) {
	e.preventDefault();
	if (draggedIndex !== null && draggedIndex !== toIndex) {
		whiteboardStore.reorderPages(draggedIndex, toIndex);
	}
	draggedIndex = null;
	dragOverIndex = null;
}
```

### Keyboard Navigation

| Key              | Action         |
| ---------------- | -------------- |
| Enter / Space    | Select page    |
| Ctrl + ArrowUp   | Move page up   |
| Ctrl + ArrowDown | Move page down |

---

## TextBlock.svelte

Rich text block with edit/view modes.

### Props

```typescript
interface Props {
	element: TextBlockElement;
}
```

### Modes

1. **View Mode**: Renders Markdown via `MarkdownRenderer`
2. **Edit Mode**: Uses `RichTextEditor` with MathLive integration

### State Transitions

```
View Mode ──[double-click]──► Edit Mode
              │
Edit Mode ──[Escape]──────────► View Mode
          ──[click outside]───► View Mode
```

### Resize Handles

```svelte
<div class="textblock" style="left: {x}px; top: {y}px; width: {w}px; height: {h}px;">
	<!-- Content -->
	{#if isEditing}
		<RichTextEditor bind:content={markdownContent} />
	{:else}
		<MarkdownRenderer content={markdownContent} />
	{/if}

	<!-- 8 resize handles -->
	{#each ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as handle}
		<div class="resize-handle {handle}" onpointerdown={(e) => startResize(e, handle)} />
	{/each}
</div>
```

---

## InstrumentLayer.svelte

Container for educational instruments with drag and rotation.

### Features

- Drag to reposition
- Rotation handle
- Per-instrument visibility toggle
- Position persistence in document

### Instrument Components (reused from constructions/)

| Component           | Description                          |
| ------------------- | ------------------------------------ |
| `Ruler.svelte`      | Graduated ruler with cm/mm markings  |
| `Protractor.svelte` | 180° protractor with degree markings |
| `SetSquare.svelte`  | 45° or 30/60° set square             |

### Drag Implementation

```typescript
interface DragState {
	isDragging: boolean;
	startPointerX: number;
	startPointerY: number;
	startElementX: number;
	startElementY: number;
}

function handlePointerDown(e: PointerEvent, instrument: InstrumentType) {
	dragState = {
		isDragging: true,
		startPointerX: e.clientX,
		startPointerY: e.clientY,
		startElementX: state.x,
		startElementY: state.y
	};
	e.currentTarget.setPointerCapture(e.pointerId);
}

function handlePointerMove(e: PointerEvent) {
	if (!dragState.isDragging) return;

	const dx = e.clientX - dragState.startPointerX;
	const dy = e.clientY - dragState.startPointerY;

	whiteboardStore.updateInstrumentPosition(instrument, {
		x: dragState.startElementX + dx,
		y: dragState.startElementY + dy
	});
}
```

### Rotation Handle

```typescript
function handleRotation(e: PointerEvent) {
	const rect = instrumentElement.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

	whiteboardStore.updateInstrumentRotation(instrument, angle);
}
```

---

## ImageLayer.svelte

Renders and manages image elements with drag and resize.

### Features

- Drag to reposition
- 8-handle resize (corners + edges)
- Aspect ratio preservation (optional)
- Selection highlight

### Props

```typescript
interface Props {
	// No external props - uses whiteboardStore directly
}
```

---

## ExportDialog.svelte

Modal dialog for export options.

### Options

| Option              | Formats  | Values               |
| ------------------- | -------- | -------------------- |
| Format              | All      | PNG, SVG, PDF        |
| Resolution          | PNG only | 1x, 2x, 3x           |
| Pages               | PNG, PDF | Current, All, Custom |
| Include Instruments | All      | Yes/No               |

### Usage

```svelte
<script>
	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Export</Button>

<ExportDialog bind:open />
```

### Custom Page Selection

```typescript
function parseCustomPages(input: string): number[] | null {
	// Supports: "1, 3, 5-10"
	const parts = input.split(',');
	const indices: number[] = [];

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map(Number);
			for (let i = start; i <= end; i++) {
				indices.push(i - 1); // Convert to 0-based
			}
		} else {
			indices.push(Number(part) - 1);
		}
	}

	return [...new Set(indices)].sort((a, b) => a - b);
}
```
