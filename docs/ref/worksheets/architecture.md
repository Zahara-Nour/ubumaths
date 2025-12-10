# Worksheets Architecture

Technical architecture of the worksheets system including data flow, design patterns, and component interactions.

---

## System Layers

```
┌────────────────────────────────────────────────────────────────┐
│                       Presentation Layer                        │
│   Svelte Components (13 components in /components/worksheets/) │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
│   SvelteKit Routes (/api/worksheets/*) + Zod Validation        │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                       │
│   Instance Generator + Typst Generator + Custom Markdown       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│   Supabase PostgreSQL + RLS Policies                           │
└────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Instance Generator (`src/lib/server/worksheets/instance-generator.ts`)

Generates unique worksheet instances for students with resolved parameters.

**Responsibilities:**

- Deterministic seed generation based on variant mode
- Parameter resolution using custom markdown system
- Exercise shuffling (global or per-section)
- Section-aware processing

**Key Function:**

```typescript
generateWorksheetInstance(params: {
  worksheetId: string;
  studentId: string;
  exercises: WorksheetExerciseWithExercise[];
  config: WorksheetConfig;
}): InstanceData
```

### 2. Typst Generator (`src/lib/worksheets/typst-generator.ts`)

Converts worksheet data into Typst markup for PDF generation.

**Responsibilities:**

- Document structure (setup, header, exercises, footer)
- Template rendering with placeholder substitution
- Mode switching (worksheet vs correction)
- Batch document generation

**Key Functions:**

```typescript
generateWorksheetTypst(params: GenerateTypstParams): string
generateBatchTypst(worksheet, instances, config, mode, className): string
```

### 3. Typst Compiler (`src/lib/worksheets/typst-compiler.ts`)

Singleton wrapper for client-side Typst.js WASM compilation.

**Responsibilities:**

- Lazy loading from CDN
- Singleton management (survives HMR)
- SVG and PDF compilation

**Key Functions:**

```typescript
getTypstCompiler(): Promise<TypstCompiler>
compileToSvg(typstContent: string): Promise<string>
compileToPdf(typstContent: string): Promise<Uint8Array>
```

---

## Data Flow

### Creating a Worksheet

```
Teacher UI                 API                    Database
    │                       │                        │
    │  POST /worksheets     │                        │
    │──────────────────────▶│                        │
    │                       │  Zod validation        │
    │                       │  INSERT worksheets     │
    │                       │───────────────────────▶│
    │                       │◀───────────────────────│
    │◀──────────────────────│  Return worksheet      │
    │                       │                        │
```

### Adding Exercises

```
Teacher UI                 API                    Database
    │                       │                        │
    │  POST exercises       │                        │
    │──────────────────────▶│                        │
    │                       │  Validate exercise_id  │
    │                       │  Check permissions     │
    │                       │  INSERT worksheet_exercises
    │                       │───────────────────────▶│
    │                       │◀───────────────────────│
    │◀──────────────────────│                        │
    │                       │                        │
```

### Generating PDF (Client-Side)

```
PdfPreview Component       Generators              Typst.js WASM
    │                         │                        │
    │  Load worksheet data    │                        │
    │  Generate instance      │                        │
    │────────────────────────▶│                        │
    │  InstanceData           │                        │
    │◀────────────────────────│                        │
    │                         │                        │
    │  Generate Typst         │                        │
    │────────────────────────▶│                        │
    │  Typst markup           │                        │
    │◀────────────────────────│                        │
    │                         │                        │
    │  Compile to PDF         │                        │
    │─────────────────────────────────────────────────▶│
    │  PDF Uint8Array         │                        │
    │◀─────────────────────────────────────────────────│
    │                         │                        │
```

### Batch PDF Generation

```
PdfPreview Component       Typst Generator       JSZip
    │                         │                    │
    │  For each student:      │                    │
    │  ├─ generateInstance    │                    │
    │  ├─ generateTypst       │                    │
    │  ├─ compileToPdf        │                    │
    │  └─ zip.file(pdf)       │                    │
    │──────────────────────────────────────────────▶│
    │                         │                    │
    │  Generate ZIP           │                    │
    │◀──────────────────────────────────────────────│
    │  Download               │                    │
    │                         │                    │
```

---

## Design Patterns

### 1. Singleton Pattern (Typst Compiler)

The Typst compiler is loaded once and reused across the application:

```typescript
// Window-level state survives HMR
const TYPST_INIT_KEY = '__typst_compiler_initialized__';

let loadPromise: Promise<TypstCompiler> | null = null;

export async function getTypstCompiler(): Promise<TypstCompiler> {
	if (compilerState.instance) return compilerState.instance;
	if (loadPromise) return loadPromise;
	loadPromise = loadTypstLibrary();
	return loadPromise;
}
```

### 2. Deterministic Seeding

Same inputs always produce same outputs:

```typescript
function generateSeed(worksheetId: string, studentId: string, mode: VariantMode): number {
	const baseString = `${worksheetId}-${studentId}`;
	let hash = 0;
	for (let i = 0; i < baseString.length; i++) {
		hash = (hash << 5) - hash + baseString.charCodeAt(i);
		hash = hash & hash; // 32-bit integer
	}
	return Math.abs(hash);
}
```

### 3. Template Placeholder System

Templates use `{{placeholder}}` syntax:

```typescript
function renderTemplate(templateContent: string, data: Record<string, string>): string {
	let result = templateContent;
	for (const [key, value] of Object.entries(data)) {
		result = result.split(`{{${key}}}`).join(value);
	}
	return result;
}
```

### 4. Junction Table Pattern

Exercises linked to worksheets with configuration:

```
worksheets ──┐
             │
             ▼
    worksheet_exercises  ◀── exercises
       - position
       - points
       - variant_mode
       - variant_config
```

### 5. JSONB Configuration

Flexible schema evolution without migrations:

```typescript
interface WorksheetConfig {
	show_title?: boolean;
	show_date?: boolean;
	numbering_style?: 'numeric' | 'alphabetic' | 'roman';
	shuffle_exercises?: boolean;
	// Can add new fields without migration
}
```

---

## State Management

### Server State (Database)

| Table                   | State                       |
| ----------------------- | --------------------------- |
| `worksheets`            | Document metadata, status   |
| `worksheet_exercises`   | Exercise configurations     |
| `worksheet_instances`   | Generated student instances |
| `worksheet_assignments` | Class distributions         |

### Client State (Svelte)

| Component        | State                                          |
| ---------------- | ---------------------------------------------- |
| `PdfPreview`     | Typst compiler, preview mode, selected student |
| `ExerciseList`   | Drag-drop state, editing modal                 |
| `SectionManager` | Section CRUD state                             |

---

## Error Handling

### API Layer

```typescript
// Zod validation with detailed errors
const validation = validateCreateWorksheet(body);
if (!validation.success) {
	const errorMsg = validation.error.issues
		.map((e) => `${e.path.join('.')}: ${e.message}`)
		.join('; ');
	throw error(400, `Validation failed: ${errorMsg}`);
}
```

### Typst Compilation

```typescript
try {
	const pdf = await typst.pdf({ mainContent: typstContent });
} catch (err) {
	typstError = `Compilation error: ${err}`;
	toaster.error('Erreur lors de la generation du PDF');
}
```

### Database Trigger (Tampering Prevention)

```sql
CREATE FUNCTION prevent_worksheet_instance_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- Students cannot modify instance_data
  IF OLD.instance_data IS DISTINCT FROM NEW.instance_data THEN
    RAISE EXCEPTION 'Cannot modify instance_data after generation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Performance Considerations

### Client-Side PDF Generation

**Advantages:**

- No server load for PDF compilation
- Faster iteration during preview
- Works offline after initial load

**Trade-offs:**

- Initial WASM load time (~2-3s)
- Browser memory usage for large batches

### Batch Generation Optimization

```typescript
// Single Typst compile for batch (shared setup)
function generateBatchTypst(instances): string {
  const documents = instances.map((item, index) => {
    // Remove setup from subsequent documents
    const doc = generateWorksheetTypst({...});
    return index === 0 ? doc : removeSetupSection(doc);
  });
  return documents.join('\n\n#pagebreak()\n\n');
}
```

### Database Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_worksheets_created_by ON worksheets(created_by);
CREATE INDEX idx_worksheets_status ON worksheets(status);
CREATE INDEX idx_worksheet_exercises_worksheet_id ON worksheet_exercises(worksheet_id);
CREATE INDEX idx_worksheets_search ON worksheets
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));
```

---

## Integration Points

### Custom Markdown System

```typescript
import { parseMarkdown, resolveVariables, resolveText } from '$lib/custom-markdown';

// Resolve variables with seed
const resolvedVars = resolveVariables(variables, seed);

// Substitute into text
const statement = resolveText(exercise.statement_md, resolvedVars);
```

### Typst Transpiler

```typescript
import { transpileToTypst, escapeTypst } from '$lib/exercises/transpilers/typst-transpiler';

// Convert markdown AST to Typst
const statementAst = parseMarkdown(exercise.statement);
const typstContent = transpileToTypst(statementAst, { includeSetup: false });
```

### Class System

```sql
-- Assignment to class
worksheet_assignments.class_id REFERENCES classes(id)

-- Students see assignments for their classes
CREATE POLICY "Students can view class assignments"
  ON worksheet_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM class_members
    WHERE class_id = worksheet_assignments.class_id
    AND student_id = auth.uid()
  ));
```
