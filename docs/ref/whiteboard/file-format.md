# Whiteboard File Format (.ubw)

## Overview

The `.ubw` (UbuMaths Whiteboard) format is a JSON-based file format for storing whiteboard documents.

| Property   | Value                                      |
| ---------- | ------------------------------------------ |
| Extension  | `.ubw`                                     |
| MIME Type  | `application/vnd.ubumaths.whiteboard+json` |
| Encoding   | UTF-8                                      |
| Validation | Zod schema                                 |

## File Structure

```json
{
	"id": "uuid",
	"version": 1,
	"title": "Document Title",
	"createdAt": "2024-01-01T00:00:00.000Z",
	"updatedAt": "2024-01-01T12:00:00.000Z",
	"currentPageIndex": 0,
	"pages": [
		{
			"id": "uuid",
			"width": 794,
			"height": 1123,
			"elements": [],
			"background": null,
			"instruments": {}
		}
	]
}
```

## Schema Definition

### WhiteboardDocument

```typescript
interface WhiteboardDocument {
	readonly id: string; // UUID
	readonly version: 1; // Schema version
	readonly title: string; // Document title
	readonly createdAt: string; // ISO 8601 timestamp
	readonly updatedAt: string; // ISO 8601 timestamp
	readonly currentPageIndex: number; // Active page (0-indexed)
	readonly pages: readonly Page[]; // Array of pages
}
```

### Page

```typescript
interface Page {
	readonly id: string; // UUID
	readonly width: number; // Page width in pixels
	readonly height: number; // Page height in pixels
	readonly elements: readonly WhiteboardElement[]; // Drawing elements
	readonly background: PageBackground | null; // Background image/PDF
	readonly instruments: Record<InstrumentType, InstrumentState>; // Instrument states
}
```

### Page Dimensions (96 DPI)

| Format          | Width | Height |
| --------------- | ----- | ------ |
| A4              | 794   | 1123   |
| A4_LANDSCAPE    | 1123  | 794    |
| A3              | 1123  | 1587   |
| A3_LANDSCAPE    | 1587  | 1123   |
| WIDESCREEN_16_9 | 1280  | 720    |
| STANDARD_4_3    | 1024  | 768    |

---

## Element Types

### StrokeElement

Free-form drawing strokes (pen, highlighter, eraser marks).

```typescript
interface StrokeElement {
	readonly id: string;
	readonly type: 'stroke';
	readonly toolType: 'pen' | 'highlighter' | 'eraser';
	readonly points: readonly Point[];
	readonly color: string; // Hex color (#rrggbb)
	readonly width: number; // Stroke width in pixels
	readonly opacity: number; // 0-1
}

interface Point {
	readonly x: number;
	readonly y: number;
	readonly pressure?: number; // 0-1, optional
}
```

**Example:**

```json
{
	"id": "stroke-123",
	"type": "stroke",
	"toolType": "pen",
	"points": [
		{ "x": 100, "y": 100 },
		{ "x": 150, "y": 120 },
		{ "x": 200, "y": 100 }
	],
	"color": "#000000",
	"width": 3,
	"opacity": 1
}
```

### ShapeElement

Geometric shapes (line, rectangle, circle, arrow).

```typescript
interface ShapeElement {
	readonly id: string;
	readonly type: 'shape';
	readonly shapeType: 'line' | 'rectangle' | 'circle' | 'arrow';
	readonly start: Point; // Starting point
	readonly end: Point; // Ending point
	readonly color: string; // Stroke color
	readonly strokeWidth: number; // Stroke width
	readonly fill?: string; // Fill color (optional)
	readonly fillOpacity?: number; // Fill opacity (optional)
}
```

**Example:**

```json
{
	"id": "shape-456",
	"type": "shape",
	"shapeType": "rectangle",
	"start": { "x": 50, "y": 50 },
	"end": { "x": 200, "y": 150 },
	"color": "#0000ff",
	"strokeWidth": 2,
	"fill": "#ffffff",
	"fillOpacity": 0.5
}
```

### TextBlockElement

Rich text blocks with Markdown content.

```typescript
interface TextBlockElement {
	readonly id: string;
	readonly type: 'textblock';
	readonly position: Point; // Top-left corner
	readonly width: number; // Block width
	readonly height: number; // Block height
	readonly markdownContent: string; // Markdown text (may include LaTeX)
}
```

**Example:**

```json
{
	"id": "text-789",
	"type": "textblock",
	"position": { "x": 300, "y": 100 },
	"width": 400,
	"height": 200,
	"markdownContent": "# Theorem\n\nFor all $x \\in \\mathbb{R}$:\n\n$$x^2 \\geq 0$$"
}
```

### ImageElement

Imported images stored as data URLs.

```typescript
interface ImageElement {
	readonly id: string;
	readonly type: 'image';
	readonly position: Point; // Top-left corner
	readonly width: number; // Display width
	readonly height: number; // Display height
	readonly src: string; // Data URL (data:image/...)
}
```

**Example:**

```json
{
	"id": "image-abc",
	"type": "image",
	"position": { "x": 400, "y": 300 },
	"width": 300,
	"height": 200,
	"src": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

## Background Types

### Plain Background

No background or simple color.

```typescript
interface BackgroundPlain {
	readonly type: 'plain';
	readonly style: 'plain' | 'grid' | 'ruled' | 'dotted';
}
```

### Image Background

Imported image as page background.

```typescript
interface BackgroundImage {
	readonly type: 'image';
	readonly src: string; // Data URL
	readonly width: number; // Original width
	readonly height: number; // Original height
	readonly fit: 'contain' | 'cover' | 'fill' | 'none';
}
```

### PDF Background

Rendered PDF page as background.

```typescript
interface BackgroundPdf {
	readonly type: 'pdf';
	readonly src: string; // Rendered page as data URL
	readonly width: number; // Page width
	readonly height: number; // Page height
	readonly fit: 'contain' | 'cover' | 'fill' | 'none';
	readonly pdfPageIndex: number; // Source page index (0-based)
	readonly originalPdfData?: string; // Original PDF data (for re-rendering)
}
```

---

## Instrument State

```typescript
type InstrumentType = 'ruler' | 'protractor' | 'setSquare';

interface InstrumentState {
	readonly visible: boolean;
	readonly x: number; // X position
	readonly y: number; // Y position
	readonly rotation: number; // Rotation in degrees
	readonly scale: number; // Scale factor
}
```

**Example:**

```json
{
	"instruments": {
		"ruler": {
			"visible": true,
			"x": 100,
			"y": 200,
			"rotation": 0,
			"scale": 1
		},
		"protractor": {
			"visible": false,
			"x": 300,
			"y": 400,
			"rotation": 45,
			"scale": 1
		}
	}
}
```

---

## Zod Validation Schema

The file is validated using Zod before loading:

```typescript
import { z } from 'zod';

const PointSchema = z.object({
	x: z.number(),
	y: z.number(),
	pressure: z.number().min(0).max(1).optional()
});

const StrokeElementSchema = z.object({
	id: z.string(),
	type: z.literal('stroke'),
	toolType: z.enum(['pen', 'highlighter', 'eraser']),
	points: z.array(PointSchema),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	width: z.number().positive(),
	opacity: z.number().min(0).max(1)
});

// ... other schemas

const WhiteboardDocumentSchema = z.object({
	id: z.string().uuid(),
	version: z.literal(1),
	title: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	currentPageIndex: z.number().int().min(0),
	pages: z.array(PageSchema).min(1)
});
```

---

## Validation Function

```typescript
import { validateDocument } from '$lib/whiteboard';

const result = validateDocument(jsonData);

if (result.valid) {
	// result.document is typed as WhiteboardDocument
	console.log(result.document.title);
} else {
	// result.error contains validation error message
	console.error(result.error);
}
```

---

## Version Compatibility

| File Version | App Version | Notes           |
| ------------ | ----------- | --------------- |
| 1            | 0.4.x       | Initial release |

Future versions will maintain backwards compatibility when possible.

```typescript
import { isVersionCompatible, UBW_FILE_VERSION } from '$lib/whiteboard';

if (!isVersionCompatible(document.version)) {
	console.warn(`File version ${document.version} may not be fully compatible`);
}
```

---

## File Size Considerations

| Content              | Approximate Size |
| -------------------- | ---------------- |
| Empty document       | ~500 bytes       |
| 100 strokes          | ~50 KB           |
| 1 image (compressed) | ~100-500 KB      |
| 1 PDF page           | ~200-500 KB      |

**Recommendations:**

- Images are compressed to JPEG 80% quality, max 2000px
- Large PDFs should be split into individual pages
- Consider periodic cleanup of unused elements
