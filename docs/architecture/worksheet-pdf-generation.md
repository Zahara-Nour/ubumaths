# Worksheet PDF Generation Architecture

> **Last Updated**: 2025-01-23
> **Status**: Production

---

## Overview

The worksheet PDF generation system transforms worksheet data into professional PDF documents using Typst, a modern typesetting system. This architecture supports on-demand generation, parameterized variants, multiple templates, and batch processing.

---

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client/UI     │────>│   API Endpoint   │────>│ Instance Gen.   │
│  (PdfPreview)   │     │ /api/.../pdf     │     │  (variants)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                         │
                                │                         v
                                │               ┌─────────────────┐
                                │               │ Typst Generator │
                                │               │ (typst-generator)│
                                │               └─────────────────┘
                                │                         │
                                v                         v
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Typst.js       │<────│ Template Engine │
                        │  (PDF compile)   │     │ (default-templates)
                        └──────────────────┘     └─────────────────┘
                                │
                                v
                        ┌──────────────────┐
                        │   PDF Output     │
                        │   (base64)       │
                        └──────────────────┘
```

---

## Core Components

### 1. Typst Generator (`src/lib/worksheets/typst-generator.ts`)

Converts worksheet data into Typst markup:

```typescript
interface GenerateTypstParams {
	worksheet: WorksheetRow;
	instance: InstanceData; // Resolved exercises with parameters
	config: WorksheetConfig; // Display options
	mode: 'worksheet' | 'correction';
	studentName?: string;
	className?: string;
}

function generateWorksheetTypst(params: GenerateTypstParams): string {
	// 1. Generate document setup (page, fonts, styles)
	// 2. Generate header (title, student info)
	// 3. Generate exercises with numbering
	// 4. Generate footer (page numbers)
	return typstDocument;
}
```

**Key Responsibilities**:

- Page configuration (A4/Letter, margins, fonts)
- Header generation with student/class info
- Exercise rendering with proper formatting
- Solution boxes (correction mode only)
- Page numbering and footers

### 2. Instance Generator (`src/lib/server/worksheets/instance-generator.ts`)

Produces student-specific worksheet instances with resolved variables:

```typescript
interface GenerateInstanceParams {
	worksheetId: string;
	studentId: string;
	exercises: WorksheetExerciseWithExercise[];
	config: WorksheetConfig;
}

function generateWorksheetInstance(params): InstanceData {
	// 1. Generate deterministic seed
	// 2. Resolve variables for each exercise
	// 3. Apply shuffling if configured
	// 4. Return instance data
}
```

**Seed Generation Algorithm**:

```typescript
function generateSeed(worksheetId: string, studentId: string): number {
	const baseString = `${worksheetId}-${studentId}`;
	let hash = 0;
	for (let i = 0; i < baseString.length; i++) {
		const char = baseString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}
```

### 3. Template Engine (`src/lib/worksheets/default-templates.ts`)

Provides pre-built Typst templates with placeholder support:

```typescript
interface DefaultTemplate {
	id: string;
	name: string;
	description: string;
	type: WorksheetType;
	template_content: string; // Typst code
	placeholders: TemplatePlaceholder[];
	is_system: boolean;
}

// Placeholder format: {{placeholder_name}}
const PLACEHOLDERS = [
	'title',
	'date',
	'class',
	'student_name',
	'exercises',
	'total_points',
	'duration',
	'instructions'
];
```

### 4. PDF Compilation (Typst.js)

Server-side PDF compilation using `@myriaddreamin/typst.ts`:

```typescript
async function initializeTypst(): Promise<TypstLibrary> {
	const { $typst } = await import('@myriaddreamin/typst.ts');

	$typst.setCompilerInitOptions({
		getModule: () => COMPILER_WASM_URL
	});

	$typst.setRendererInitOptions({
		getModule: () => RENDERER_WASM_URL
	});

	return $typst;
}

// Compile to PDF
const pdfData = await typst.pdf({ mainContent: typstDocument });
```

---

## Data Flow

### Single PDF Generation

```
1. Client Request
   POST /api/worksheets/{id}/pdf
   Body: { mode: 'worksheet', studentId?: string }

2. Fetch Worksheet
   - Load worksheet with exercises
   - Load related exercise content

3. Generate Instance
   - If studentId provided, generate/fetch instance
   - Otherwise, generate preview instance
   - Resolve all variables with seed

4. Build Typst Document
   - Apply template
   - Insert resolved exercises
   - Format according to config

5. Compile PDF
   - Initialize Typst.js
   - Compile typst -> PDF bytes

6. Return Response
   { pdf: base64String, filename: '...' }
```

### Batch PDF Generation

```
1. Client Request
   POST /api/worksheets/{id}/pdf/batch
   Body: { classId: string, mode: 'worksheet' | 'correction' }

2. Fetch Class Students
   - Load all students in class

3. Generate All Instances
   - For each student, generate/fetch instance
   - Each has unique seed based on student ID

4. Build Combined Document
   - Generate document for each student
   - Insert page breaks between documents
   - Share setup section (once)

5. Compile Single PDF
   - All student copies in one PDF

6. Return Response
   { pdf: base64String, count: N }
```

---

## Variant System Integration

### Variant Modes

| Mode         | Seed Calculation                            | Use Case             |
| ------------ | ------------------------------------------- | -------------------- |
| `none`       | `hash(worksheetId)`                         | Same for everyone    |
| `individual` | `hash(worksheetId + studentId)`             | Unique per student   |
| `n_versions` | `hash(worksheetId + (hash(studentId) % N))` | Limited versions     |
| `group`      | `hash(worksheetId + groupIndex)`            | Shared within groups |

### Parameter Resolution

```typescript
// Exercise with variables
const exercise = {
	statement_md: 'Calculate {{a}} + {{b}}',
	variables: [
		{ name: 'a', expression: '{{random:1-10}}' },
		{ name: 'b', expression: '{{random:1-10}}' },
		{ name: 'sum', expression: '{{eval:a+b}}' }
	]
};

// Resolution with seed=12345
const resolved = resolveVariables(exercise.variables, 12345);
// Result: { a: 7, b: 3, sum: 10 }

// Resolved statement
const statement = resolveText(exercise.statement_md, resolved);
// Result: "Calculate 7 + 3"
```

---

## Typst Document Structure

### Page Setup

```typst
#set page(
  paper: "a4",
  margin: (top: 20mm, bottom: 20mm, left: 15mm, right: 15mm),
  header-ascent: 20%,
  footer-descent: 20%,
)

#set text(
  font: ("New Computer Modern", "Noto Sans"),
  size: 12pt,
  lang: "fr",
  region: "FR"
)
```

### Custom Functions

```typst
// Exercise container
#let exercise-box(content) = {
  block(width: 100%, inset: 0pt, content)
}

// Solution highlight (correction mode)
#let solution-box(content) = {
  block(
    width: 100%,
    fill: rgb(240, 240, 240),
    inset: 10pt,
    radius: 4pt,
    content
  )
}

// Points badge
#let points-badge(pts) = {
  text(size: 0.9em, weight: "bold")[
    #box(fill: rgb(220, 220, 220), inset: (x: 6pt, y: 3pt), radius: 3pt)[
      #pts pts
    ]
  ]
}
```

### Exercise Rendering

```typst
#exercise-box[
  #grid(
    columns: (auto, 1fr, auto),
    [#text(size: 1.1em, weight: "bold")[Exercice 1]],
    [],
    points-badge(5)
  )
  #v(0.3em)

  // Exercise statement (rendered from markdown)
  Resoudre l'equation: $2x + 5 = 11$
]

// In correction mode, add solution
#solution-box[
  #text(weight: "bold", fill: rgb(0, 100, 0))[Solution :]
  #v(0.3em)
  $2x + 5 = 11$
  $2x = 6$
  $x = 3$
]
```

---

## Template System

### Available Templates

| ID           | Name        | Type       | Features                   |
| ------------ | ----------- | ---------- | -------------------------- |
| `standard`   | Standard    | worksheet  | Basic layout               |
| `assessment` | Evaluation  | assessment | Grade box, competencies    |
| `exam`       | Examen      | exam       | Official header, signature |
| `homework`   | Devoirs     | homework   | Due date, instructions     |
| `quiz`       | Quiz        | quiz       | Compact, quick format      |
| `minimal`    | Minimaliste | worksheet  | Clean, no frills           |

### Placeholder System

Templates use `{{placeholder}}` syntax:

```typst
// Template excerpt
#align(center)[
  #text(size: 18pt, weight: "bold")[{{title}}]
]

*Nom :* {{student_name}}
*Classe :* {{class}}
*Date :* {{date}}

{{exercises}}
```

### Custom Template Creation

Teachers can create custom templates via the Typst editor:

1. Start from a base template
2. Edit Typst code directly
3. Preview with sample data
4. Save as personal template

---

## Performance Considerations

### Compilation Caching

- Typst.js is initialized once per request
- WASM modules are loaded from CDN
- Consider local WASM hosting for production

### Batch Optimization

- Single document for multiple students
- Shared setup section (not repeated)
- Page breaks between instances
- One compilation operation

### Memory Management

```typescript
// For large batches, process in chunks
const BATCH_SIZE = 50;
for (let i = 0; i < students.length; i += BATCH_SIZE) {
	const chunk = students.slice(i, i + BATCH_SIZE);
	// Process chunk
}
```

---

## Error Handling

### Common Errors

| Error                        | Cause              | Solution                  |
| ---------------------------- | ------------------ | ------------------------- |
| "Failed to load Typst"       | WASM not available | Check network/CDN         |
| "Invalid Typst syntax"       | Template error     | Validate template         |
| "Exercise not found"         | Missing data       | Check exercise references |
| "Variable resolution failed" | Invalid expression | Check variable syntax     |

### Validation

```typescript
// Pre-compilation validation
function validateTypstDocument(content: string): ValidationResult {
	// Check for unclosed brackets
	// Verify placeholder syntax
	// Validate function calls
}
```

---

## Security

### Input Sanitization

```typescript
// Escape special Typst characters in user content
export function escapeTypst(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/#/g, '\\#')
		.replace(/\$/g, '\\$')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]');
}
```

### Template Validation

- Custom templates are stored in database
- Only authenticated teachers can create
- Templates are sandboxed (no file access)
- Content is escaped before insertion

---

## API Endpoints

### Generate Single PDF

```
POST /api/worksheets/{id}/pdf
Authorization: Required (teacher/admin)

Request:
{
  "mode": "worksheet" | "correction",
  "studentId": "uuid",        // Optional
  "variantSeed": number,      // Optional
  "studentName": "string",    // Optional
  "className": "string"       // Optional
}

Response:
{
  "success": true,
  "pdf": "base64...",
  "filename": "Worksheet_Title_worksheet.pdf"
}
```

### Generate Batch PDF

```
POST /api/worksheets/{id}/pdf/batch
Authorization: Required (teacher/admin)

Request:
{
  "classId": "uuid",
  "mode": "worksheet" | "correction"
}

Response:
{
  "success": true,
  "pdf": "base64...",
  "count": 25,
  "filename": "Worksheet_Title_batch.pdf"
}
```

---

## Future Enhancements

- [ ] Local WASM hosting for better performance
- [ ] PDF caching for frequently accessed worksheets
- [ ] Async generation with progress tracking
- [ ] Custom fonts support
- [ ] Image embedding in exercises
- [ ] Multi-language template support
- [ ] Accessibility improvements (tagged PDF)

---

## Related Documentation

- [Worksheets Feature](../features/worksheets.md) - Full feature overview
- [Worksheet Variants](../features/worksheet-variants.md) - Variant system details
- [Parameterization System](parameterization-system.md) - Variable resolution

---

[Back to Architecture Index](README.md)
