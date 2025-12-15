# Typst PDF Generation

Technical reference for PDF generation using Typst markup and the Typst.js WebAssembly compiler.

**Source files:**

- `src/lib/worksheets/typst-generator.ts` - Typst document generation
- `src/lib/worksheets/typst-compiler.ts` - WASM compiler wrapper

---

## Overview

The PDF generation system consists of two parts:

1. **Typst Generator** - Creates Typst markup from worksheet data
2. **Typst Compiler** - Compiles Typst to PDF/SVG (client-side WASM)

```
InstanceData + Config                 Typst Markup                  PDF
┌─────────────────────┐              ┌─────────────────┐          ┌─────────┐
│ exercises[]         │──Generator──▶│ #set page(...)  │──WASM───▶│ Binary  │
│ worksheet metadata  │              │ content...      │          │ PDF     │
│ template            │              └─────────────────┘          └─────────┘
└─────────────────────┘
```

---

## Typst Generator

### generateWorksheetTypst

Main function to generate Typst document.

```typescript
export function generateWorksheetTypst(params: GenerateTypstParams): string {
	const { worksheet, instance, config, mode, studentName, className, template } = params;

	// Try template-based generation first
	const templateContent = getTemplateContent(worksheet.template_id, template);
	if (templateContent) {
		return generateFromTemplate(params, templateContent);
	}

	// Fallback to procedural generation
	const setup = generateSetup(config, worksheet.type);
	const header = generateHeader(worksheet, config, studentName, className, mode);
	const exercises = generateExercises(instance, config, mode, worksheet.type);
	const footer = generateFooter(worksheet, config, mode);

	return [setup, header, exercises, footer].filter(Boolean).join('\n\n');
}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `worksheet` | WorksheetRow | Worksheet metadata |
| `instance` | InstanceData | Resolved exercise data |
| `config` | WorksheetConfig | Display configuration |
| `mode` | 'worksheet' \| 'correction' | Output mode |
| `studentName` | string? | Student's name for header |
| `className` | string? | Class name for header |
| `template` | WorksheetTemplateRow? | Custom template |

---

### Document Sections

#### Setup Section

Configures page layout and defines helper functions:

```typescript
function generateSetup(config: WorksheetConfig, type: WorksheetType): string {
	const pageLayout = config.page_layout || 'A4';
	const fontSize = config.font_size || 12;
	const margins = config.margins || { top: 20, bottom: 20, left: 15, right: 15 };

	return `// Document Setup
#set page(
  paper: "${pageLayout.toLowerCase()}",
  margin: (
    top: ${margins.top}mm,
    bottom: ${margins.bottom}mm,
    left: ${margins.left}mm,
    right: ${margins.right}mm,
  ),
  header-ascent: 20%,
  footer-descent: 20%,
)

#set text(
  font: "New Computer Modern",
  size: ${fontSize}pt,
  lang: "fr",
  region: "FR"
)

#set par(justify: true, leading: 0.65em)
#set heading(numbering: none)

// Custom styles
#let exercise-box(content) = {
  block(width: 100%, inset: 0pt, content)
}

#let solution-box(content) = {
  block(width: 100%, fill: rgb(240, 240, 240), inset: 10pt, radius: 4pt, content)
}

#let points-badge(pts) = {
  text(size: 0.9em, weight: "bold")[#box(
    fill: rgb(220, 220, 220),
    inset: (x: 6pt, y: 3pt),
    radius: 3pt,
    [#pts pts]
  )]
}`;
}
```

#### Header Section

Student info, title, metadata, and instructions:

```typescript
function generateHeader(
	worksheet: WorksheetRow,
	config: WorksheetConfig,
	studentName?: string,
	className?: string,
	mode: 'worksheet' | 'correction' = 'worksheet'
): string {
	let header = '';

	// Correction banner (correction mode only)
	if (mode === 'correction') {
		header += '#block(width: 100%, fill: rgb(34, 139, 34), inset: 10pt)[\n';
		header += '  #align(center)[\n';
		header += '    #text(size: 1.4em, weight: "bold", fill: white)[CORRECTION]\n';
		header += '  ]\n';
		header += ']\n\n';
	}

	// Student information box
	if (config.show_student_name || config.show_class) {
		header += '#block(width: 100%)[\n';
		header += '  #grid(columns: (1fr, 1fr), column-gutter: 2cm,\n';
		// Name and class fields...
		header += '  )\n';
		header += ']\n\n';
	}

	// Title
	if (config.show_title) {
		const typeLabel = getTypeLabel(worksheet.type);
		header += `#align(center)[\n`;
		header += `  #text(size: 1.5em, weight: "bold")[${escapeTypst(typeLabel)}]\n`;
		header += `  #text(size: 1.3em)[${escapeTypst(worksheet.title)}]\n`;
		header += `]\n\n`;
	}

	// Duration and points
	// Instructions for exams...

	return header;
}
```

#### Exercises Section

Renders all exercises with numbering and optional solutions:

```typescript
function generateExercises(
	instance: InstanceData,
	config: WorksheetConfig,
	mode: 'worksheet' | 'correction',
	worksheetType: WorksheetType
): string {
	const exercises = instance.exercises;
	const numberingStyle = config.numbering_style || 'numeric';

	// Apply exercise order if shuffled
	const orderedExercises = instance.exercise_order
		? instance.exercise_order.map((idx) => exercises[idx])
		: exercises;

	let content = '';
	orderedExercises.forEach((exercise, index) => {
		const number = formatExerciseNumber(index + 1, numberingStyle);
		content += generateSingleExercise(exercise, number, mode, worksheetType, config);
		content += '\n\n';
	});

	return content;
}
```

#### Single Exercise

```typescript
function generateSingleExercise(
  exercise: ResolvedExercise,
  number: string,
  mode: 'worksheet' | 'correction',
  worksheetType: WorksheetType,
  config: WorksheetConfig
): string {
  let content = '';

  // Exercise header
  content += '#exercise-box[\n';
  content += `  #text(size: 1.1em, weight: "bold")[Exercice ${number}]\n`;

  // Statement (converted from markdown to Typst)
  const statementAst = parseMarkdown(exercise.statement);
  const statementTypst = transpileToTypst(statementAst, {
    includeSetup: false,
    language: 'fr'
  });
  content += statementTypst + '\n';

  // Answer space for exams
  if (mode === 'worksheet' && (worksheetType === 'exam' || worksheetType === 'assessment')) {
    content += '  #answer-space(height: 5cm)\n';
  }

  content += ']\n';

  // Solution (correction mode only)
  if (mode === 'correction' && exercise.solution) {
    content += '\n#solution-box[\n';
    content += '  #text(weight: "bold", fill: rgb(0, 100, 0))[Solution :]\n';
    const solutionTypst = transpileToTypst(parseMarkdown(exercise.solution), {...});
    content += solutionTypst + '\n';
    content += ']\n';
  }

  return content;
}
```

---

### Exercise Numbering

```typescript
function formatExerciseNumber(num: number, style: NumberingStyle): string {
	switch (style) {
		case 'alphabetic':
			return String.fromCharCode(64 + num); // A, B, C...

		case 'roman':
			return toRoman(num); // I, II, III...

		case 'numeric':
		default:
			return num.toString(); // 1, 2, 3...
	}
}

function toRoman(num: number): string {
	const romanNumerals: [number, string][] = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];

	let result = '';
	for (const [value, symbol] of romanNumerals) {
		while (num >= value) {
			result += symbol;
			num -= value;
		}
	}
	return result;
}
```

---

### Batch Generation

For generating multiple PDFs efficiently:

```typescript
export function generateBatchTypst(
	worksheet: WorksheetRow,
	instances: Array<{ instance: InstanceData; studentName: string; studentId: string }>,
	config: WorksheetConfig,
	mode: 'worksheet' | 'correction',
	className?: string
): string {
	const documents: string[] = [];

	instances.forEach((item, index) => {
		// Page break between documents
		if (index > 0) {
			documents.push('#pagebreak()');
		}

		const doc = generateWorksheetTypst({
			worksheet,
			instance: item.instance,
			config,
			mode,
			studentName: item.studentName,
			className
		});

		// Remove setup from subsequent documents
		documents.push(index === 0 ? doc : removeSetupSection(doc));
	});

	return documents.join('\n\n');
}
```

---

## Typst Compiler

### Singleton Pattern

The compiler is loaded once and reused:

```typescript
// State persists across HMR
const TYPST_INIT_KEY = '__typst_compiler_initialized__';
let compilerState: TypstCompilerState = {
	instance: null,
	isLoading: false,
	error: null,
	isInitialized: false
};
let loadPromise: Promise<TypstCompiler> | null = null;
```

### CDN Resources

```typescript
const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const TYPST_BUNDLE_URL = `${CDN_BASE}/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js`;
const COMPILER_WASM_URL = `${CDN_BASE}/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm`;
const RENDERER_WASM_URL = `${CDN_BASE}/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm`;
```

### API Functions

```typescript
// Get compiler instance (loads if needed)
export async function getTypstCompiler(): Promise<TypstCompiler> {
	if (compilerState.instance) return compilerState.instance;
	if (loadPromise) return loadPromise;
	loadPromise = loadTypstLibrary();
	return loadPromise;
}

// Convenience functions
export async function compileToSvg(typstContent: string): Promise<string> {
	const typst = await getTypstCompiler();
	return typst.svg({ mainContent: typstContent });
}

export async function compileToPdf(typstContent: string): Promise<Uint8Array> {
	const typst = await getTypstCompiler();
	return typst.pdf({ mainContent: typstContent });
}

// State checks
export function isCompilerReady(): boolean {
	return compilerState.instance !== null && compilerState.isInitialized;
}

export function isCompilerLoading(): boolean {
	return compilerState.isLoading;
}

export function getCompilerError(): string | null {
	return compilerState.error;
}

// Recovery
export function resetCompilerState(): void {
	compilerState = { instance: null, isLoading: false, error: null, isInitialized: false };
	loadPromise = null;
}
```

### Loading Process

```typescript
async function loadTypstLibrary(): Promise<TypstCompiler> {
	compilerState = { ...compilerState, isLoading: true, error: null };

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.type = 'module';
		script.src = TYPST_BUNDLE_URL;
		script.id = 'typst-compiler-script';

		script.addEventListener('load', () => {
			waitForTypst(resolve, reject);
		});

		script.addEventListener('error', () => {
			reject(new Error('Failed to load Typst library'));
		});

		document.head.appendChild(script);
	});
}

function initializeCompiler(typst: TypstCompiler): void {
	if (!isTypstInitialized()) {
		typst.setCompilerInitOptions({
			getModule: () => COMPILER_WASM_URL
		});
		typst.setRendererInitOptions({
			getModule: () => RENDERER_WASM_URL
		});
		markTypstInitialized();
	}

	compilerState = {
		instance: typst,
		isLoading: false,
		error: null,
		isInitialized: true
	};
}
```

---

## Typst Character Escaping

Special characters must be escaped in user content:

```typescript
import { escapeTypst } from '$lib/custom-markdown';

// Escapes: \ # $ [ ]
const safe = escapeTypst(userInput);
```

---

## Usage in Components

### PdfPreview Component

```typescript
import { getTypstCompiler, type TypstCompiler } from '$lib/worksheets/typst-compiler';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';

let typst = $state<TypstCompiler | null>(null);

onMount(async () => {
	try {
		typst = await getTypstCompiler();
		generatePreview();
	} catch (err) {
		console.error('Failed to load Typst:', err);
	}
});

async function generatePreview() {
	if (!typst || !worksheet) return;

	const instance = generateSimpleInstance(worksheet, studentId);
	const typstContent = generateWorksheetTypst({
		worksheet,
		instance,
		config: worksheet.config,
		mode,
		studentName,
		className
	});

	// Preview as SVG
	const svg = await typst.svg({ mainContent: typstContent });

	// Generate PDF
	const pdfData = await typst.pdf({ mainContent: typstContent });
	const blob = new Blob([pdfData], { type: 'application/pdf' });
	pdfUrl = URL.createObjectURL(blob);
}
```

### Batch PDF with ZIP

```typescript
import JSZip from 'jszip';

async function generateBatchPdfs() {
  const zip = new JSZip();
  const folder = zip.folder('worksheets');

  for (const student of students) {
    const instance = generateSimpleInstance(worksheet, student.id);
    const typstContent = generateWorksheetTypst({...});
    const pdfData = await typst.pdf({ mainContent: typstContent });
    folder.file(`${student.name}.pdf`, pdfData);
  }

  const zipData = await zip.generateAsync({ type: 'blob' });
  // Download ZIP...
}
```

---

## Type Labels

French labels for worksheet types:

```typescript
function getTypeLabel(type: WorksheetType): string {
	const labels: Record<WorksheetType, string> = {
		worksheet: "Feuille d'exercices",
		assessment: 'Evaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoirs'
	};
	return labels[type] || "Feuille d'exercices";
}
```

---

## Performance Tips

1. **Reuse compiler instance** - Don't reload Typst for each PDF
2. **Batch generation** - Use `generateBatchTypst` for multiple students
3. **Remove duplicate setup** - Subsequent pages share Typst configuration
4. **Client-side generation** - Reduces server load

---

## Error Handling

```typescript
try {
	const pdf = await typst.pdf({ mainContent: typstContent });
} catch (err) {
	if (err.message.includes('undefined function')) {
		// Missing Typst function - check template
	} else if (err.message.includes('unexpected token')) {
		// Syntax error in Typst - check escaping
	}
	console.error('Typst compilation error:', err);
}
```
