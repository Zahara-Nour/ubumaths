# Whiteboard - Technical Guide

Interactive educational whiteboard for writing math courses on touch devices.

## Overview

The whiteboard module provides a complete drawing and annotation solution with:

- **Drawing tools**: Pen, highlighter, eraser with smooth stroke rendering
- **Geometric shapes**: Lines, rectangles, circles, arrows
- **Educational instruments**: Ruler, protractor, set square (draggable + rotatable)
- **Rich text blocks**: Markdown + LaTeX support via MathLive
- **Multi-page documents**: Sidebar thumbnails, drag-to-reorder
- **Import**: Images (PNG, JPG, SVG, WebP) and PDF as page background
- **Export**: PNG (1x/2x/3x), SVG (vector), PDF (multi-page)
- **Storage**: `.ubw` files (JSON with Zod validation)

## Quick Start

### Using the Whiteboard

```svelte
<script lang="ts">
	import { Whiteboard } from '$lib/whiteboard';
</script>

<Whiteboard />
```

### Accessing the Store

```typescript
import { whiteboardStore } from '$lib/whiteboard';

// Get current document
const doc = whiteboardStore.document;

// Get current page
const page = whiteboardStore.currentPage;

// Change tool
whiteboardStore.setTool('pen');
whiteboardStore.setColor('#ff0000');
whiteboardStore.setStrokeWidth(3);

// Undo/Redo
whiteboardStore.undo();
whiteboardStore.redo();
```

### Route

The whiteboard is available at `/whiteboard` (protected route, requires authentication).

## Documentation Index

| Document                          | Description                          |
| --------------------------------- | ------------------------------------ |
| [Architecture](./architecture.md) | System design, layers, data flow     |
| [Components](./components.md)     | Svelte component reference           |
| [Store API](./api.md)             | WhiteboardStore methods and state    |
| [File Format](./file-format.md)   | `.ubw` file specification            |
| [Instruments](./instruments.md)   | Educational instruments guide        |
| [Export](./export.md)             | Export functionality (PNG, SVG, PDF) |

## Module Structure

```
src/lib/whiteboard/
├── components/
│   ├── Whiteboard.svelte           # Main container
│   ├── WhiteboardCanvas.svelte     # SVG canvas with layers
│   ├── WhiteboardToolbar.svelte    # Tool selection UI
│   ├── ExportDialog.svelte         # Export options dialog
│   ├── InstrumentLayer.svelte      # Educational instruments
│   ├── ImageLayer.svelte           # Image elements
│   ├── PageThumbnails.svelte       # Multi-page sidebar
│   ├── TextBlock.svelte            # Rich text block
│   └── TextBlockLayer.svelte       # Text blocks container
├── core/
│   ├── history.svelte.ts           # Undo/redo (50 states max)
│   ├── pdf-export.ts               # Export to PNG/SVG/PDF
│   ├── serialization.ts            # JSON serialization
│   ├── shapes.ts                   # Shape creation/rendering
│   └── stroke-smoothing.ts         # perfect-freehand integration
├── stores/
│   └── whiteboard.svelte.ts        # Main reactive store
├── tests/                          # 474 unit tests
├── types/
│   ├── document.ts                 # Type definitions
│   └── file-format.ts              # Zod validation schemas
├── utils/
│   ├── file-operations.ts          # File save/load
│   ├── image-loader.ts             # Image import + compression
│   ├── pdf-loader.ts               # PDF import (pdfjs-dist)
│   └── sync-state.ts               # Google Drive sync state
└── index.ts                        # Public exports
```

## Dependencies

| Package            | Version  | Purpose                  |
| ------------------ | -------- | ------------------------ |
| `perfect-freehand` | ^1.2.2   | Smooth stroke rendering  |
| `jspdf`            | ^3.0.4   | PDF export (lazy loaded) |
| `pdfjs-dist`       | ^4.10.39 | PDF import (lazy loaded) |

## Key Concepts

### Canvas Layers

The SVG canvas uses 4 layers (bottom to top):

1. **Background**: Grid/ruled/dotted patterns or imported PDF
2. **Content**: Strokes, shapes, images (persisted elements)
3. **Active Stroke**: Current drawing in progress
4. **Instruments**: Ruler, protractor, set square (interactive)

### Element Types

```typescript
type WhiteboardElement =
	| StrokeElement // Pen, highlighter, eraser strokes
	| ShapeElement // Line, rectangle, circle, arrow
	| TextBlockElement // Rich text with Markdown/LaTeX
	| ImageElement; // Imported images
```

### Tool Types

```typescript
type DrawingTool = 'pen' | 'highlighter' | 'eraser';
type ShapeTool = 'line' | 'rectangle' | 'circle' | 'arrow';
type ActionTool = 'select' | 'pan' | 'text';
type InstrumentTool = 'ruler' | 'protractor' | 'setSquare';
```

## Security Considerations

- **XSS Prevention**: SVG export uses native text elements (no foreignObject)
- **Image Validation**: Only safe data URLs allowed (no javascript:, http:)
- **File Validation**: All `.ubw` imports validated with Zod schemas
- **Memory Management**: Canvas cleanup in error handlers

## Testing

```bash
# Run all whiteboard tests
pnpm test:server src/lib/whiteboard/tests/ --run

# Run specific test file
pnpm test:server src/lib/whiteboard/tests/export.test.ts --run

# Run Svelte component tests
pnpm test:client src/lib/whiteboard --run
```

**Test Coverage**: 532 tests (474 server + 58 client)
