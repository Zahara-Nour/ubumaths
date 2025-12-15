# Multi-Format Image System - Final Documentation

> **DEPRECATED**: This is historical documentation from 2025-11-22.
> The transpilers mentioned in this document have been moved:
>
> - LaTeX transpiler: `src/lib/custom-markdown/generators/latex-generator.ts`
> - Typst transpiler: `src/lib/custom-markdown/generators/typst-generator.ts`
>   See [docs/claude/latex-to-markdown.md](../../claude/latex-to-markdown.md) for current documentation.

**Version**: 1.0.0
**Last Updated**: 2025-11-22
**Status**: Complete (Historical)

This documentation provides a complete reference for the multi-format image system in UbuMaths exercises. The system enables teachers to embed images in exercise content with consistent rendering across HTML (web), LaTeX (PDF), and Typst (modern typesetting) formats.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Markdown Syntax](#markdown-syntax)
5. [API Reference](#api-reference)
6. [Components Reference](#components-reference)
7. [Services Reference](#services-reference)
8. [Format Output Examples](#format-output-examples)
9. [Testing](#testing)
10. [Security and Accessibility](#security-and-accessibility)

---

## Overview

### What the System Does

The multi-format image system provides:

- **Semantic sizing**: 5 size classes (inline, small, medium, large, full) that map consistently across formats
- **Flexible alignment**: Left, center, and right positioning
- **Automatic metadata extraction**: Dimensions extracted without external dependencies
- **Secure uploads**: File signature validation, size limits, and type restrictions
- **WCAG 2.1 Level AA accessibility**: Proper alt text, ARIA attributes, and keyboard navigation
- **Teacher-friendly UI**: Drag-drop upload, visual previews, and markdown generation

### Key Features

- Pure TypeScript dimension extraction (PNG, JPEG, GIF, WebP, SVG)
- XSS protection through input sanitization and output escaping
- Consistent rendering in HTML, LaTeX, and Typst
- Cumulative Layout Shift (CLS) prevention with aspect-ratio CSS
- Responsive design with max-width constraints
- Caption support with semantic HTML/LaTeX figure environments

---

## Architecture

### File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── exercises/
│   │       ├── ImageUploader.svelte          # Drag-drop upload component
│   │       ├── ImageSizeSelector.svelte      # Size class selector
│   │       ├── ImageAlignmentSelector.svelte # Alignment toggle
│   │       ├── ImageCaptionInput.svelte      # Caption text input
│   │       └── ImageAttributePanel.svelte    # Combined control panel
│   │
│   ├── exercises/
│   │   ├── types.ts                          # ImageNode, ImageSizeClass, etc.
│   │   ├── parser/
│   │   │   └── markdown-parser.ts            # Parses image syntax
│   │   ├── services/
│   │   │   ├── image-dimensions.ts           # Size class to dimensions
│   │   │   ├── image-dimension-extractor.ts  # Extract from file buffer
│   │   │   └── image-upload.ts               # Supabase storage upload
│   │   └── transpilers/
│   │       ├── latex-transpiler.ts           # ImageNode to LaTeX
│   │       └── typst-transpiler.ts           # ImageNode to Typst
│   │
│   └── server/
│       └── validation/
│           └── image-upload.ts               # Zod schemas for upload
│
├── routes/
│   └── api/
│       └── exercises/
│           └── images/
│               └── +server.ts                # POST upload endpoint
│
└── tests/
    └── e2e/
        └── exercises/
            ├── image-upload.spec.ts          # Upload E2E tests
            └── image-attributes.spec.ts      # Attributes E2E tests
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Markdown      │     │    ImageNode     │     │  Format Output  │
│   Input         │────▶│    (AST Node)    │────▶│  HTML/LaTeX/    │
│                 │     │                  │     │  Typst          │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ parseMarkdown() │     │ getDimensions-   │     │ renderImage()   │
│ parseImage-     │     │ ForFormat()      │     │ transpileImage()│
│ Attributes()    │     │ autoDetect-      │     │                 │
│                 │     │ SizeClass()      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Component Relationships

```
ImageAttributePanel
├── ImageUploader (drag-drop, file validation)
├── ImageSizeSelector (radio buttons, custom width)
├── ImageAlignmentSelector (toggle buttons)
└── ImageCaptionInput (text input with preview)
    │
    ▼
Generated Markdown: ![alt](url){size=large align=center caption="..."}
    │
    ▼
API Endpoint: POST /api/exercises/images
    │
    ▼
Supabase Storage: exercise-images/{userId}/{timestamp}_{filename}
```

---

## Core Concepts

### Size Classes

The system defines 5 semantic size classes that map to specific dimensions in each format:

| Class    | Description             | HTML Width | HTML Max-Width | LaTeX            | Typst  |
| -------- | ----------------------- | ---------- | -------------- | ---------------- | ------ |
| `inline` | Within text flow        | `1.5em`    | -              | `height=1em`     | `1em`  |
| `small`  | Thumbnails, icons       | `25%`      | `300px`        | `0.25\textwidth` | `25%`  |
| `medium` | Standard content images | `50%`      | `600px`        | `0.5\textwidth`  | `50%`  |
| `large`  | Featured images         | `75%`      | `900px`        | `0.75\textwidth` | `75%`  |
| `full`   | Full-width displays     | `100%`     | `1200px`       | `\textwidth`     | `100%` |

**Default**: If no size is specified, `medium` is used.

### Alignments

Three alignment options control image positioning:

| Alignment | HTML CSS                                 | LaTeX          | Typst           |
| --------- | ---------------------------------------- | -------------- | --------------- |
| `left`    | `margin-right: auto;`                    | `\raggedright` | `align: left`   |
| `center`  | `margin-left: auto; margin-right: auto;` | `\centering`   | `align: center` |
| `right`   | `margin-left: auto;`                     | `\raggedleft`  | `align: right`  |

**Default**: If no alignment is specified, `center` is used.

### Image Metadata

The `ImageNode` type stores complete image information:

```typescript
interface ImageNode {
	type: 'image';
	src: string; // URL (relative or absolute)
	alt?: string; // Alt text for accessibility
	title?: string; // Optional tooltip title
	sizeClass?: ImageSizeClass; // 'inline' | 'small' | 'medium' | 'large' | 'full'
	widthPercent?: number; // 0-100, overrides sizeClass
	alignment?: ImageAlignment; // 'left' | 'center' | 'right'
	caption?: string; // Figure caption text
	originalWidth?: number; // Original width in pixels
	originalHeight?: number; // Original height in pixels
}
```

The `aspectRatio` is calculated as `originalWidth / originalHeight` when dimensions are available.

---

## Markdown Syntax

### Basic Syntax

```markdown
![alt text](image-url)
```

### With Title

```markdown
![alt text](image-url 'Title shown on hover')
```

### With Attributes

Attributes are specified in curly braces after the URL:

```markdown
![alt](url){attribute=value}
![alt](url){attr1=value1 attr2=value2}
```

### Supported Attributes

| Attribute | Values                                       | Example                       |
| --------- | -------------------------------------------- | ----------------------------- |
| `size`    | `inline`, `small`, `medium`, `large`, `full` | `size=large`                  |
| `width`   | `0-100` (percentage)                         | `width=60%` or `width=60`     |
| `align`   | `left`, `center`, `right`                    | `align=right`                 |
| `caption` | Quoted string                                | `caption="Figure 1: Results"` |

### Complete Examples

```markdown
# Simple image (defaults to medium, center)

![Diagram](diagram.png)

# With title (hover text)

![Graph](graph.png 'Sales data for Q4')

# Specific size class

![Icon](icon.png){size=small}

# Custom width percentage

![Chart](chart.png){width=60%}

# Right-aligned

![Photo](photo.jpg){align=right}

# With caption (creates figure environment)

![Theorem](pythagoras.png){caption="Figure 1: Pythagorean theorem"}

# All attributes combined

![Complex](figure.png 'Full options'){size=large align=center caption="Figure 2: Complete example"}

# Inline in text (same height as text)

The symbol ![root](sqrt.png){size=inline} represents square root.
```

### Attribute Parsing Rules

1. **Whitelist validation**: Only valid size/alignment values are accepted
2. **Width clamping**: Values outside 0-100 are ignored
3. **Priority**: `widthPercent` overrides `sizeClass` when both present
4. **Quote styles**: Both `"double"` and `'single'` quotes work for captions
5. **Invalid attributes**: Silently ignored (no errors thrown)

---

## API Reference

### Upload Endpoint

**Endpoint**: `POST /api/exercises/images`

**Authentication**: Required (teacher or admin role)

**Content-Type**: `multipart/form-data`

**Request Body**:

| Field   | Type | Required | Description          |
| ------- | ---- | -------- | -------------------- |
| `image` | File | Yes      | Image file to upload |

**Supported Formats**: JPEG, PNG, GIF, WebP, SVG

**Limits**:

- Maximum file size: 5 MB
- Maximum dimensions: 10,000 x 10,000 pixels

#### Success Response (201 Created)

```json
{
	"success": true,
	"data": {
		"url": "https://xxx.supabase.co/storage/v1/object/public/exercise-images/userId/timestamp_filename.png",
		"width": 800,
		"height": 600,
		"aspectRatio": 1.333333,
		"filename": "diagram.png",
		"size": 45678,
		"mimeType": "image/png"
	}
}
```

#### Error Response (4xx/5xx)

```json
{
	"success": false,
	"error": "File size (6.5MB) exceeds maximum of 5MB"
}
```

#### Error Codes

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| 400    | Invalid file type, size, dimensions, or signature |
| 401    | Not authenticated                                 |
| 403    | Not a teacher or admin                            |
| 500    | Storage upload failed                             |

#### Usage Example

```typescript
async function uploadImage(file: File) {
	const formData = new FormData();
	formData.append('image', file);

	const response = await fetch('/api/exercises/images', {
		method: 'POST',
		body: formData
	});

	const result = await response.json();

	if (result.success) {
		console.log('Uploaded:', result.data.url);
		console.log('Dimensions:', result.data.width, 'x', result.data.height);
	} else {
		console.error('Error:', result.error);
	}
}
```

---

## Components Reference

### ImageUploader

Drag-and-drop image upload component with progress indication.

**File**: `src/lib/components/exercises/ImageUploader.svelte`

#### Props

| Prop               | Type                            | Default                                                     | Description                   |
| ------------------ | ------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| `onUploadComplete` | `(data: UploadedImage) => void` | -                                                           | Callback on successful upload |
| `accept`           | `string`                        | `'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'` | Accepted MIME types           |
| `maxSize`          | `number`                        | `5`                                                         | Maximum file size in MB       |

#### Events

- **Upload complete**: Callback receives `{ url, width, height, aspectRatio, filename, size, mimeType }`

#### Usage

```svelte
<script lang="ts">
	import ImageUploader from '$lib/components/exercises/ImageUploader.svelte';

	function handleUpload(data) {
		console.log('Uploaded to:', data.url);
	}
</script>

<ImageUploader onUploadComplete={handleUpload} />
```

---

### ImageSizeSelector

Radio button selector for size classes with visual preview bars.

**File**: `src/lib/components/exercises/ImageSizeSelector.svelte`

#### Props

| Prop                  | Type                                   | Default     | Description                        |
| --------------------- | -------------------------------------- | ----------- | ---------------------------------- |
| `value`               | `ImageSizeClass`                       | `'medium'`  | Selected size class (bindable)     |
| `customWidth`         | `number \| undefined`                  | `undefined` | Custom width percentage (bindable) |
| `onValueChange`       | `(value: ImageSizeClass) => void`      | -           | Callback on size change            |
| `onCustomWidthChange` | `(width: number \| undefined) => void` | -           | Callback on custom width change    |

#### Usage

```svelte
<script lang="ts">
	import ImageSizeSelector from '$lib/components/exercises/ImageSizeSelector.svelte';

	let sizeClass = $state('medium');
	let customWidth = $state(undefined);
</script>

<ImageSizeSelector bind:value={sizeClass} bind:customWidth />
```

---

### ImageAlignmentSelector

Toggle button group for alignment selection with icons.

**File**: `src/lib/components/exercises/ImageAlignmentSelector.svelte`

#### Props

| Prop            | Type                              | Default    | Description                   |
| --------------- | --------------------------------- | ---------- | ----------------------------- |
| `value`         | `ImageAlignment`                  | `'center'` | Selected alignment (bindable) |
| `onValueChange` | `(value: ImageAlignment) => void` | -          | Callback on alignment change  |

#### Usage

```svelte
<script lang="ts">
	import ImageAlignmentSelector from '$lib/components/exercises/ImageAlignmentSelector.svelte';

	let alignment = $state('center');
</script>

<ImageAlignmentSelector bind:value={alignment} />
```

---

### ImageCaptionInput

Text input for image captions with character counter and preview.

**File**: `src/lib/components/exercises/ImageCaptionInput.svelte`

#### Props

| Prop            | Type                      | Default                      | Description                |
| --------------- | ------------------------- | ---------------------------- | -------------------------- |
| `value`         | `string`                  | `''`                         | Caption text (bindable)    |
| `maxLength`     | `number`                  | `200`                        | Maximum character length   |
| `placeholder`   | `string`                  | `'Ex: Figure 1 - Schema...'` | Input placeholder text     |
| `onValueChange` | `(value: string) => void` | -                            | Callback on caption change |

#### Usage

```svelte
<script lang="ts">
	import ImageCaptionInput from '$lib/components/exercises/ImageCaptionInput.svelte';

	let caption = $state('');
</script>

<ImageCaptionInput bind:value={caption} maxLength={200} />
```

---

### ImageAttributePanel

Combined panel integrating all image attribute controls.

**File**: `src/lib/components/exercises/ImageAttributePanel.svelte`

#### Props

| Prop         | Type                         | Default | Description                           |
| ------------ | ---------------------------- | ------- | ------------------------------------- |
| `onInsert`   | `(markdown: string) => void` | -       | Callback to insert generated markdown |
| `initialUrl` | `string`                     | `''`    | Pre-filled image URL                  |
| `initialAlt` | `string`                     | `''`    | Pre-filled alt text                   |

#### Features

- Complete image upload workflow
- Alt text input (required for accessibility)
- Size class selection with custom width option
- Alignment toggle
- Caption input
- Live markdown preview
- Copy to clipboard button
- Insert into editor button
- Reset functionality

#### Usage

```svelte
<script lang="ts">
	import ImageAttributePanel from '$lib/components/exercises/ImageAttributePanel.svelte';

	function handleInsert(markdown: string) {
		editor.insertText(markdown);
	}
</script>

<ImageAttributePanel onInsert={handleInsert} />
```

---

## Services Reference

### image-dimensions.ts

Functions for converting size classes to format-specific dimensions.

**File**: `src/lib/exercises/services/image-dimensions.ts`

#### getDimensionsForFormat

Converts an ImageNode to dimensions for a specific output format.

```typescript
function getDimensionsForFormat(node: ImageNode, format: OutputFormat): ImageDimensions;

type OutputFormat = 'html' | 'latex' | 'typst';

interface ImageDimensions {
	width: string;
	maxWidth?: string;
	maxHeight?: string;
	height?: string;
}
```

**Example**:

```typescript
import { getDimensionsForFormat } from '$lib/exercises/services/image-dimensions';

const node = { type: 'image', src: 'img.png', sizeClass: 'large' };

getDimensionsForFormat(node, 'html');
// { width: '75%', maxWidth: '900px' }

getDimensionsForFormat(node, 'latex');
// { width: '0.75\\textwidth' }

getDimensionsForFormat(node, 'typst');
// { width: '75%' }
```

#### autoDetectSizeClass

Automatically determines the best size class based on image dimensions.

```typescript
function autoDetectSizeClass(width: number, height: number): ImageSizeClass;
```

**Heuristics**:

| Condition                       | Result     |
| ------------------------------- | ---------- |
| Aspect ratio > 3 (panoramic)    | `'full'`   |
| Aspect ratio < 0.4 (portrait)   | `'small'`  |
| Both dimensions < 200px         | `'small'`  |
| Width > 800px or height > 600px | `'large'`  |
| Aspect ratio > 2                | `'large'`  |
| Default                         | `'medium'` |

#### getAlignmentStyles

Generates format-specific alignment CSS/commands.

```typescript
function getAlignmentStyles(alignment: ImageAlignment | undefined, format: OutputFormat): string;
```

#### shouldUseFigureEnvironment

Determines if image should be wrapped in a figure element.

```typescript
function shouldUseFigureEnvironment(node: ImageNode): boolean;
```

Returns `true` if:

- Node has a caption, OR
- Node has a sizeClass that is not `'inline'`

---

### image-dimension-extractor.ts

Pure TypeScript dimension extraction from image buffers.

**File**: `src/lib/exercises/services/image-dimension-extractor.ts`

#### extractDimensionsFromBuffer

Extracts dimensions from a raw image buffer.

```typescript
function extractDimensionsFromBuffer(
	buffer: Uint8Array,
	mimeType: string
): DimensionExtractionResult;

interface DimensionExtractionResult {
	success: boolean;
	dimensions?: ExtractedDimensions;
	error?: string;
}

interface ExtractedDimensions {
	width: number;
	height: number;
	aspectRatio: number;
}
```

**Supported formats**:

| Format | Extraction Method                  |
| ------ | ---------------------------------- |
| PNG    | IHDR chunk (bytes 16-23)           |
| JPEG   | SOF0/SOF2 markers                  |
| GIF    | Logical screen descriptor          |
| WebP   | VP8/VP8L/VP8X chunks               |
| SVG    | viewBox or width/height attributes |

#### extractDimensionsFromFile

Async wrapper for File objects.

```typescript
async function extractDimensionsFromFile(file: File): Promise<DimensionExtractionResult>;
```

---

## Format Output Examples

### Same Image in All Formats

**Markdown Input**:

```markdown
![Pythagorean theorem](theorem.png){size=large align=center caption="Figure 1: The famous theorem"}
```

### HTML Output

```html
<figure class="exercise-figure exercise-image-center">
	<img
		src="theorem.png"
		alt="Pythagorean theorem"
		aria-describedby="fig-caption-abc123"
		class="exercise-image"
		style="width: 75%; max-width: 900px; aspect-ratio: 800 / 600;"
		loading="lazy"
		decoding="async"
	/>
	<figcaption id="fig-caption-abc123" class="exercise-figcaption">
		Figure 1: The famous theorem
	</figcaption>
</figure>
```

### LaTeX Output

```latex
\begin{figure}[htbp]
\centering
\includegraphics[width=0.75\textwidth]{theorem.png}
\caption{Figure 1: The famous theorem}
\end{figure}
```

### Typst Output

```typst
#figure(
  image("theorem.png", width: 75%),
  caption: [Figure 1: The famous theorem]
)
```

---

## Testing

### Running Tests

```bash
# All unit tests
pnpm test:unit

# Image-specific unit tests
pnpm test:unit -- src/lib/exercises/services/__tests__/image-dimensions.test.ts
pnpm test:unit -- src/lib/exercises/parser/__tests__/image-parser.test.ts
pnpm test:unit -- src/lib/exercises/services/image-dimension-extractor.test.ts
pnpm test:unit -- src/lib/exercises/services/image-upload.test.ts
pnpm test:unit -- src/lib/server/validation/image-upload.test.ts

# Transpiler tests (includes image tests)
pnpm test:unit -- src/lib/exercises/transpilers/latex-transpiler.test.ts
pnpm test:unit -- src/lib/exercises/transpilers/typst-transpiler.test.ts

# E2E tests
pnpm test:e2e exercises/image-upload
pnpm test:e2e exercises/image-attributes
```

### Test Coverage Summary

| Test File                           | Test Cases  | Coverage Area                            |
| ----------------------------------- | ----------- | ---------------------------------------- |
| `image-dimensions.test.ts`          | 90          | Size mappings, auto-detection, alignment |
| `image-parser.test.ts`              | 58          | Markdown syntax parsing                  |
| `image-dimension-extractor.test.ts` | 26          | PNG, JPEG, GIF, WebP, SVG extraction     |
| `image-upload.test.ts`              | 50          | Validation, upload, delete functions     |
| `image-upload.test.ts` (validation) | 46          | Zod schemas, file signature              |
| `latex-transpiler.test.ts`          | ~30 (image) | LaTeX generation                         |
| `typst-transpiler.test.ts`          | ~50 (image) | Typst generation                         |
| **Total Unit Tests**                | **~350**    |                                          |

### E2E Test Coverage

| Test Suite          | Tests   | Coverage                             |
| ------------------- | ------- | ------------------------------------ |
| Image Upload        | 38      | Drop zone, progress, errors, formats |
| Image Attributes    | 86      | Size, alignment, caption, workflow   |
| **Total E2E Tests** | **124** | (372 with browser variants)          |

---

## Security and Accessibility

### Security Measures

#### XSS Protection

- **HTML escaping**: All user values (alt, caption, title) escaped via `escapeHtml()`
- **URL validation**: Image URLs validated in renderer
- **Caption escaping**: Double quotes escaped for markdown generation

#### File Validation

| Check          | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| MIME type      | Whitelist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` |
| File signature | Magic bytes validation prevents disguised files                                  |
| File size      | Maximum 5 MB                                                                     |
| Dimensions     | Maximum 10,000 x 10,000 pixels                                                   |
| Content-Type   | Must be `multipart/form-data`                                                    |

#### Magic Bytes Validation

| Format | Signature                                 |
| ------ | ----------------------------------------- |
| PNG    | `89 50 4E 47 0D 0A 1A 0A`                 |
| JPEG   | `FF D8 FF`                                |
| GIF87a | `47 49 46 38 37 61`                       |
| GIF89a | `47 49 46 38 39 61`                       |
| WebP   | `52 49 46 46...57 45 42 50` (RIFF...WEBP) |
| SVG    | Contains `<svg` or `<?xml`                |

### Accessibility Features (WCAG 2.1 Level AA)

#### Images

| Feature          | Implementation                                      |
| ---------------- | --------------------------------------------------- |
| Alt text         | Always required, validated in UI                    |
| Figure semantics | `<figure>` + `<figcaption>` with `aria-describedby` |
| Lazy loading     | `loading="lazy"`, `decoding="async"`                |
| Aspect ratio     | CLS prevention with `aspect-ratio` CSS              |

#### UI Components

| Feature             | Implementation                           |
| ------------------- | ---------------------------------------- |
| Keyboard navigation | Arrow keys, Enter/Space support          |
| Focus indicators    | `focus-visible` outlines                 |
| ARIA labels         | All interactive elements labeled         |
| Live regions        | `aria-live="polite"` for dynamic content |
| Screen reader       | Progress announcements, error alerts     |
| Color contrast      | Minimum 4.5:1 ratio                      |

#### Upload Component

- Drop zone: `role="button"`, `tabindex="0"`, `aria-label`
- Progress: `role="status"`, `aria-live="polite"`
- Errors: `role="alert"`, `aria-live="assertive"`
- File input: Hidden with accessible label

---

## Migration Notes

### From Basic Image Syntax

If existing exercises use basic markdown images:

```markdown
![Old syntax](image.png)
```

No changes required. The parser fully supports the basic syntax with default `medium` size and `center` alignment.

### Adding Attributes to Existing Images

Add attributes block after the URL:

```markdown
# Before

![Diagram](diagram.png)

# After (with size)

![Diagram](diagram.png){size=large}

# After (with all attributes)

![Diagram](diagram.png){size=large align=center caption="Figure 1"}
```

---

## Troubleshooting

### Common Issues

| Issue                                           | Cause                             | Solution                                 |
| ----------------------------------------------- | --------------------------------- | ---------------------------------------- |
| Upload fails with "File content does not match" | File renamed with wrong extension | Use correct file extension               |
| Image too small/large                           | Wrong size class                  | Use `size=` attribute or custom `width=` |
| Caption not showing                             | Missing caption attribute         | Add `{caption="..."}`                    |
| LaTeX compilation fails                         | Special characters in caption     | Characters auto-escaped in transpiler    |
| Image not centered                              | Default alignment changed         | Add `align=center` explicitly            |

### Debug Checklist

1. Check browser console for upload errors
2. Verify file is under 5 MB
3. Verify file is correct format (PNG, JPEG, GIF, WebP, SVG)
4. Check network tab for API response
5. Verify authentication (teacher role required)

---

## Related Documentation

- [Phase 1: Types and Data Model](./phase-1-types.md)
- [Phase 2: Dimension Service](./phase-2-dimensions.md)
- [Phase 3: Parser](./phase-3-parser.md)
- [Phase 4: HTML Renderer](./phase-4-html-renderer.md)
- [Phase 5: LaTeX Transpiler](./phase-5-latex-transpiler.md)
- [Phase 6: Typst Transpiler](./phase-6-typst-transpiler.md)
- [Phase 7: Upload System](./phase-7-image-upload.md)
- [Phase 8: Teacher UI](./phase-8-teacher-ui.md)
- [Phase 9: E2E Tests](./phase-9-e2e-tests.md)

---

**Documentation Status**: Complete
**Implementation Status**: Complete
**Test Coverage**: Comprehensive (350+ unit tests, 124 E2E tests)
