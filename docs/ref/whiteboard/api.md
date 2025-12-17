# Whiteboard Store API

The `whiteboardStore` is the central state manager for all whiteboard operations.

## Import

```typescript
import { whiteboardStore } from '$lib/whiteboard';
```

## State (Reactive Getters)

All getters return reactive values that trigger re-renders when changed.

### Document State

```typescript
// Current document
whiteboardStore.document: WhiteboardDocument

// Current page (derived from document)
whiteboardStore.currentPage: Page

// Current page index
whiteboardStore.currentPageIndex: number

// Total page count
whiteboardStore.pageCount: number
```

### Tool State

```typescript
// Current selected tool
whiteboardStore.currentTool: Tool

// Tool settings (color, width, etc.)
whiteboardStore.toolSettings: ToolSettings

// Convenience getters
whiteboardStore.currentColor: string
whiteboardStore.currentStrokeWidth: number
```

### History State

```typescript
// Can undo?
whiteboardStore.canUndo: boolean

// Can redo?
whiteboardStore.canRedo: boolean
```

### Instrument State

```typescript
// All instrument states
whiteboardStore.instruments: Record<InstrumentType, InstrumentState>

// Single instrument state
whiteboardStore.getInstrumentState(type: InstrumentType): InstrumentState
```

### UI State

```typescript
// Sidebar visibility
whiteboardStore.sidebarVisible: boolean

// File modified since last save
whiteboardStore.hasUnsavedChanges: boolean
```

---

## Methods

### Tool Selection

```typescript
// Set current tool
whiteboardStore.setTool(tool: Tool): void

// Set stroke color
whiteboardStore.setColor(color: string): void

// Set stroke width (1-20)
whiteboardStore.setStrokeWidth(width: number): void
```

**Example:**

```typescript
whiteboardStore.setTool('pen');
whiteboardStore.setColor('#ff0000');
whiteboardStore.setStrokeWidth(3);
```

### Stroke Operations

```typescript
// Add a completed stroke
whiteboardStore.addStroke(stroke: StrokeElement): void

// Create stroke from points (convenience method)
whiteboardStore.createStroke(
  points: Point[],
  toolType: StrokeToolType,
  color: string,
  width: number,
  opacity: number
): StrokeElement
```

**Example:**

```typescript
const stroke = whiteboardStore.createStroke(
	[
		{ x: 0, y: 0 },
		{ x: 100, y: 100 }
	],
	'pen',
	'#000000',
	3,
	1
);
whiteboardStore.addStroke(stroke);
```

### Shape Operations

```typescript
// Add a shape
whiteboardStore.addShape(shape: ShapeElement): void

// Create shape from bounds
whiteboardStore.createShape(
  shapeType: ShapeType,
  start: Point,
  end: Point,
  color: string,
  strokeWidth: number,
  fill?: string
): ShapeElement
```

**Example:**

```typescript
const rect = whiteboardStore.createShape(
	'rectangle',
	{ x: 50, y: 50 },
	{ x: 200, y: 150 },
	'#0000ff',
	2,
	'#ffffff'
);
whiteboardStore.addShape(rect);
```

### Text Block Operations

```typescript
// Add text block
whiteboardStore.addTextBlock(textblock: TextBlockElement): void

// Update text block content
whiteboardStore.updateTextBlock(id: string, content: string): void

// Move text block
whiteboardStore.moveTextBlock(id: string, position: Point): void

// Resize text block
whiteboardStore.resizeTextBlock(id: string, width: number, height: number): void

// Combined move and resize (single history entry)
whiteboardStore.resizeAndMoveTextBlock(
  id: string,
  position: Point,
  width: number,
  height: number
): void

// Set editing state
whiteboardStore.setTextBlockEditing(id: string, isEditing: boolean): void
```

**Example:**

```typescript
whiteboardStore.addTextBlock({
	id: crypto.randomUUID(),
	type: 'textblock',
	position: { x: 100, y: 100 },
	width: 300,
	height: 150,
	markdownContent: '# Hello\n\nThis is **bold** text.'
});
```

### Image Operations

```typescript
// Add image
whiteboardStore.addImage(image: ImageElement): void

// Move image
whiteboardStore.moveImage(id: string, position: Point): void

// Resize image
whiteboardStore.resizeImage(id: string, width: number, height: number): void
```

**Example:**

```typescript
whiteboardStore.addImage({
	id: crypto.randomUUID(),
	type: 'image',
	position: { x: 200, y: 200 },
	width: 400,
	height: 300,
	src: 'data:image/png;base64,...'
});
```

### Element Operations

```typescript
// Delete element by ID
whiteboardStore.deleteElement(id: string): void

// Delete multiple elements
whiteboardStore.deleteElements(ids: string[]): void

// Clear all elements on current page
whiteboardStore.clearCurrentPage(): void
```

### Page Operations

```typescript
// Add new page
whiteboardStore.addPage(format?: PageFormatKey): void

// Delete page by index
whiteboardStore.deletePage(index: number): void

// Navigate to page
whiteboardStore.goToPage(index: number): void

// Navigate relative
whiteboardStore.nextPage(): void
whiteboardStore.previousPage(): void

// Reorder pages
whiteboardStore.reorderPages(fromIndex: number, toIndex: number): void
```

**Example:**

```typescript
// Add A4 landscape page
whiteboardStore.addPage('A4_LANDSCAPE');

// Go to page 3
whiteboardStore.goToPage(2); // 0-indexed

// Move page 0 to position 2
whiteboardStore.reorderPages(0, 2);
```

### Background Operations

```typescript
// Set page background (image or PDF)
whiteboardStore.setBackground(background: PageBackground | null): void

// Set background style (plain, grid, ruled, dotted)
whiteboardStore.setBackgroundStyle(style: BackgroundStyle): void
```

**Example:**

```typescript
// Set grid background
whiteboardStore.setBackgroundStyle('grid');

// Set image background
whiteboardStore.setBackground({
	type: 'image',
	src: 'data:image/png;base64,...',
	width: 794,
	height: 1123,
	fit: 'contain'
});

// Set PDF background
whiteboardStore.setBackground({
	type: 'pdf',
	src: 'data:image/png;base64,...', // Rendered page
	width: 794,
	height: 1123,
	fit: 'contain',
	pdfPageIndex: 0,
	originalPdfData: 'data:application/pdf;base64,...'
});
```

### Instrument Operations

```typescript
// Toggle instrument visibility
whiteboardStore.toggleInstrument(type: InstrumentType): void

// Show instrument
whiteboardStore.showInstrument(type: InstrumentType): void

// Hide instrument
whiteboardStore.hideInstrument(type: InstrumentType): void

// Update position
whiteboardStore.updateInstrumentPosition(
  type: InstrumentType,
  position: Point
): void

// Update rotation
whiteboardStore.updateInstrumentRotation(
  type: InstrumentType,
  rotation: number
): void

// Update any property
whiteboardStore.updateInstrument(
  type: InstrumentType,
  updates: Partial<InstrumentState>
): void

// Reset all instruments to default
whiteboardStore.resetInstruments(): void
```

**Example:**

```typescript
// Show ruler
whiteboardStore.showInstrument('ruler');

// Position ruler
whiteboardStore.updateInstrumentPosition('ruler', { x: 100, y: 200 });

// Rotate protractor
whiteboardStore.updateInstrumentRotation('protractor', 45);
```

### History Operations

```typescript
// Undo last action
whiteboardStore.undo(): void

// Redo last undone action
whiteboardStore.redo(): void

// Clear history
whiteboardStore.clearHistory(): void
```

### Document Operations

```typescript
// Create new document
whiteboardStore.newDocument(title?: string, format?: PageFormatKey): void

// Load document
whiteboardStore.loadDocument(document: WhiteboardDocument): void

// Update document title
whiteboardStore.setTitle(title: string): void
```

**Example:**

```typescript
// New A4 document
whiteboardStore.newDocument('My Notes', 'A4');

// Load from file
const doc = await deserializeFromFile(file);
if (doc) {
	whiteboardStore.loadDocument(doc);
}
```

### UI Operations

```typescript
// Toggle sidebar
whiteboardStore.toggleSidebar(): void

// Set sidebar visibility
whiteboardStore.setSidebarVisible(visible: boolean): void

// Mark document as saved
whiteboardStore.markAsSaved(): void
```

---

## Types

### Tool Types

```typescript
type DrawingTool = 'pen' | 'highlighter' | 'eraser';
type ShapeTool = 'line' | 'rectangle' | 'circle' | 'arrow';
type ActionTool = 'select' | 'pan' | 'text';
type InstrumentTool = 'ruler' | 'protractor' | 'setSquare';
type Tool = DrawingTool | ShapeTool | ActionTool | InstrumentTool;
```

### Tool Settings

```typescript
interface ToolSettings {
	pen: { color: string; width: number };
	highlighter: { color: string; width: number; opacity: number };
	eraser: { width: number };
	shape: { color: string; strokeWidth: number; fill?: string };
}
```

### Instrument Types

```typescript
type InstrumentType = 'ruler' | 'protractor' | 'setSquare';

interface InstrumentState {
	visible: boolean;
	x: number;
	y: number;
	rotation: number;
	scale: number;
}
```

---

## Exported Utilities

### Stroke Smoothing

```typescript
import { smoothStroke, pointsToSvgPath, getToolOptions } from '$lib/whiteboard';

// Smooth raw points
const smoothedPoints = smoothStroke(rawPoints, options);

// Convert to SVG path
const pathD = pointsToSvgPath(smoothedPoints);

// Get tool-specific options
const options = getToolOptions('pen', { size: 3 });
```

### Shape Utilities

```typescript
import { createShapeElement, getShapeSvgProps } from '$lib/whiteboard';

// Create shape element
const shape = createShapeElement('rectangle', start, end, color, width);

// Get SVG rendering props
const props = getShapeSvgProps(shape);
// Returns: { x, y, width, height } for rect
// Returns: { x1, y1, x2, y2 } for line
// Returns: { cx, cy, rx, ry } for ellipse
```

### Serialization

```typescript
import {
	serialize,
	deserialize,
	serializeToBlob,
	deserializeFromFile,
	downloadDocument
} from '$lib/whiteboard';

// To JSON string
const json = serialize(document);

// From JSON string
const doc = deserialize(json);

// To downloadable Blob
const blob = serializeToBlob(document);

// From File object
const doc = await deserializeFromFile(file);

// Trigger download
downloadDocument(document, 'my-notes.ubw');
```

### Validation

```typescript
import { validateDocument, isVersionCompatible } from '$lib/whiteboard';

// Validate document structure
const result = validateDocument(unknownData);
if (result.valid) {
	const document = result.document;
} else {
	console.error(result.error);
}

// Check version compatibility
if (isVersionCompatible(document.version)) {
	// Safe to load
}
```
