# Export Functionality

The whiteboard supports exporting to PNG, SVG, and PDF formats.

## Quick Start

### Using the Export Dialog

```svelte
<script>
	import { ExportDialog } from '$lib/whiteboard';

	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Export</Button>
<ExportDialog bind:open />
```

### Programmatic Export

```typescript
import { exportDocument, downloadExportResult } from '$lib/whiteboard';

// Export current document
const result = await exportDocument(document, {
	format: 'png',
	resolution: 2,
	pages: 'current'
});

if (result.success) {
	downloadExportResult(result);
}
```

---

## Export Formats

### PNG (Raster Image)

Best for sharing and viewing on screens.

| Option      | Values               | Default |
| ----------- | -------------------- | ------- |
| Resolution  | 1x, 2x, 3x           | 2x      |
| Pages       | current, all, custom | current |
| Instruments | include/exclude      | include |

**Output:**

- Single PNG file per page
- Transparent background
- High-quality anti-aliasing

**File naming:**

- Single page: `document-title.png`
- Multiple pages: `document-title-page-1.png`, `document-title-page-2.png`, etc.

### SVG (Vector Graphics)

Best for editing and printing at any scale.

| Option      | Values          | Default |
| ----------- | --------------- | ------- |
| Pages       | current only    | current |
| Instruments | include/exclude | include |

**Output:**

- Single SVG file
- Scalable to any size
- Editable in vector editors (Inkscape, Illustrator)

**File naming:** `document-title.svg`

### PDF (Document)

Best for multi-page documents and printing.

| Option      | Values               | Default |
| ----------- | -------------------- | ------- |
| Pages       | current, all, custom | all     |
| Instruments | include/exclude      | include |

**Output:**

- Single PDF file with all selected pages
- A4 or custom page size
- Print-ready quality

**File naming:** `document-title.pdf`

---

## API Reference

### exportDocument()

Main export function.

```typescript
async function exportDocument(
	document: WhiteboardDocument,
	options: ExportOptions
): Promise<ExportResult>;
```

**Options:**

```typescript
interface ExportOptions {
	format: 'png' | 'svg' | 'pdf';
	resolution?: 1 | 2 | 3; // PNG only, default: 2
	pages?: 'current' | 'all' | number[]; // Page selection
	includeInstruments?: boolean; // Default: true
	onProgress?: (percent: number) => void; // Progress callback
}
```

**Result:**

```typescript
interface ExportResult {
	success: boolean;
	blob?: Blob; // File data
	filename?: string; // Suggested filename
	mimeType?: string; // MIME type
	error?: string; // Error message if failed
}
```

### downloadExportResult()

Trigger browser download.

```typescript
function downloadExportResult(result: ExportResult): void;
```

### generateExportFilename()

Generate filename from document.

```typescript
function generateExportFilename(
	document: WhiteboardDocument,
	format: ExportFormat,
	pageIndex?: number
): string;
```

### getPagesToExport()

Resolve page selection to indices.

```typescript
function getPagesToExport(
	document: WhiteboardDocument,
	pages: 'current' | 'all' | number[]
): { indices: number[]; count: number };
```

### shouldShowProgressIndicator()

Check if export needs progress indicator.

```typescript
function shouldShowProgressIndicator(document: WhiteboardDocument, pageIndices: number[]): boolean;
// Returns true if > 5 pages or complex content
```

---

## Export Pipeline

### PNG Export

```
Document Page
     │
     ▼
renderPageToSvg()
     │
     │  Generate complete SVG string
     │  with all elements + instruments
     │
     ▼
SVG String
     │
     ▼
svgToPng()
     │
     │  1. Create Image from SVG data URL
     │  2. Create Canvas at target resolution
     │  3. Draw image to canvas
     │  4. Export as PNG blob
     │
     ▼
PNG Blob
```

### SVG Export

```
Document Page
     │
     ▼
renderPageToSvg()
     │
     │  Generate SVG with:
     │  - Background layer
     │  - Content layer (strokes, shapes)
     │  - Image layer
     │  - Text layer (native SVG text)
     │  - Instrument layer (optional)
     │
     ▼
SVG String
     │
     ▼
new Blob([svgString], { type: 'image/svg+xml' })
```

### PDF Export

```
Document Pages
     │
     ▼
For each page:
     │
     ├──► renderPageToSvg()
     │        │
     │        ▼
     │    svgToPng() at 2x resolution
     │        │
     │        ▼
     │    PNG Data URL
     │
     ▼
jsPDF.addImage() for each page
     │
     ▼
jsPDF.output('blob')
     │
     ▼
PDF Blob
```

---

## Security Considerations

### XSS Prevention

The export system prevents XSS attacks:

1. **No foreignObject**: Text is rendered using native SVG `<text>` elements, not HTML
2. **Image sanitization**: Only safe data URLs allowed
3. **Content escaping**: All text content is HTML-escaped

```typescript
// Safe image sources
function sanitizeImageSrc(src: string): string {
	// Allow blob: URLs (internal)
	if (src.startsWith('blob:')) return src;

	// Allow safe data: URLs (not SVG)
	if (src.startsWith('data:image/')) {
		if (src.startsWith('data:image/svg+xml')) {
			console.warn('SVG data URLs rejected for security');
			return '';
		}
		return src;
	}

	// Reject everything else (javascript:, http:, etc.)
	console.warn('Unsafe image source rejected');
	return '';
}
```

### Memory Management

```typescript
// Canvas cleanup in error handlers
img.onerror = () => {
	URL.revokeObjectURL(url);
	canvas.width = 0;
	canvas.height = 0;
	resolve({ success: false, error: 'Render failed' });
};

// URL revocation with delay
setTimeout(() => {
	URL.revokeObjectURL(url);
}, 1000);
```

---

## Progress Indicator

For large exports, show progress:

```svelte
<script>
	let progress = $state(0);
	let isExporting = $state(false);

	async function handleExport() {
		isExporting = true;
		progress = 0;

		const result = await exportDocument(document, {
			format: 'pdf',
			pages: 'all',
			onProgress: (p) => (progress = p)
		});

		isExporting = false;

		if (result.success) {
			downloadExportResult(result);
		}
	}
</script>

{#if isExporting}
	<div class="progress-bar">
		<div class="progress" style="width: {progress}%"></div>
	</div>
	<span>{progress}%</span>
{/if}
```

---

## jsPDF Integration

The PDF export uses jsPDF (lazy-loaded):

```typescript
async function exportToPdf(
	document: WhiteboardDocument,
	options: ExportOptions
): Promise<ExportResult> {
	// Lazy load jsPDF
	const { default: jsPDF } = await import('jspdf');

	const { indices } = getPagesToExport(document, options.pages ?? 'all');
	const firstPage = document.pages[indices[0]];

	// Create PDF with page dimensions
	const pdf = new jsPDF({
		orientation: firstPage.width > firstPage.height ? 'landscape' : 'portrait',
		unit: 'px',
		format: [firstPage.width, firstPage.height]
	});

	for (let i = 0; i < indices.length; i++) {
		const pageIndex = indices[i];
		const page = document.pages[pageIndex];

		// Render page to PNG
		const pngResult = await exportPageToPng(document, pageIndex, options);
		if (!pngResult.success || !pngResult.blob) continue;

		// Add page to PDF
		if (i > 0) {
			pdf.addPage([page.width, page.height]);
		}

		const dataUrl = await blobToDataUrl(pngResult.blob);
		pdf.addImage(dataUrl, 'PNG', 0, 0, page.width, page.height);

		// Report progress
		options.onProgress?.(((i + 1) / indices.length) * 100);
	}

	return {
		success: true,
		blob: pdf.output('blob'),
		filename: generateExportFilename(document, 'pdf'),
		mimeType: 'application/pdf'
	};
}
```

---

## Custom Page Selection

The export dialog supports custom page ranges:

```typescript
// Parse "1, 3, 5-10" to [0, 2, 4, 5, 6, 7, 8, 9]
function parseCustomPages(input: string): number[] | null {
	if (!input.trim()) return null;

	const indices: number[] = [];
	const parts = input.split(',');

	for (const part of parts) {
		const trimmed = part.trim();

		if (trimmed.includes('-')) {
			// Range: "5-10"
			const [start, end] = trimmed.split('-').map((s) => parseInt(s.trim(), 10));
			if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
				return null; // Invalid range
			}
			for (let i = start; i <= end; i++) {
				indices.push(i - 1); // Convert to 0-based
			}
		} else {
			// Single page: "3"
			const num = parseInt(trimmed, 10);
			if (isNaN(num) || num < 1) {
				return null; // Invalid page
			}
			indices.push(num - 1);
		}
	}

	// Remove duplicates and sort
	return [...new Set(indices)].sort((a, b) => a - b);
}
```

---

## Error Handling

```typescript
try {
	const result = await exportDocument(document, options);

	if (result.success) {
		downloadExportResult(result);
		toaster.success('Export réussi');
	} else {
		toaster.error(result.error || 'Export échoué');
	}
} catch (error) {
	console.error('Export error:', error);
	toaster.error("Erreur inattendue lors de l'export");
}
```

Common errors:

| Error                    | Cause             | Solution                   |
| ------------------------ | ----------------- | -------------------------- |
| "Format invalide"        | Unknown format    | Use 'png', 'svg', or 'pdf' |
| "Document vide"          | No pages          | Create at least one page   |
| "Pages invalides"        | Bad page indices  | Check page count           |
| "Échec du rendu SVG"     | Image load failed | Check image sources        |
| "Génération PDF échouée" | jsPDF error       | Check console for details  |
