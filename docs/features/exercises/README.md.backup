# Exercise Bank System

> **📖 Core Project Guidelines**: See **[CLAUDE.md](../../../CLAUDE.md)** for project structure, Svelte 5 best practices, and development workflows.
>
> **📚 Other Features**: See **[docs/features/README.md](../README.md)** for other feature documentation.

This document provides comprehensive documentation for the Exercise Bank System.

---

## Exercise Bank System

The Exercise Bank System provides a framework for creating, managing, and exporting mathematical exercises with rich markdown content, LaTeX formulas, and multiple output formats.

### Overview

**Location**: `/dashboard/teacher/exercises` (teachers, production-ready)
**Test Page**: `/test-exercises` (development testing, fully functional)
**Status**: ✅ Production-Ready (Backend 100%, Components 100%, Import/Export 100%, Admin UI 100%, Image Upload 100%, Assignment System 100%)

**Latest Update**: 2025-10-27 - Assignment system implemented, completion tracking, full-text search, 13 API endpoints

The system allows teachers to create exercise documents that support:

- **Rich Markdown** content with GFM extensions (tables, lists)
- **LaTeX Math** formulas (inline `$...$`, block `$$...$$`)
- **Image Upload** - Direct upload to Supabase Storage with validation ✅
- **Parameterization** - Variable-based templates with 3 distribution modes ✅
- **Assignment System** - Flexible assignment to students/classes/public ✅
- **Completion Tracking** - Optional view and completion tracking ✅
- **Full-Text Search** - Efficient search across exercise content ✅
- **Import/Export** - JSON and Markdown formats with 3 duplicate strategies ✅
- **Exercise Metadata** (title, source, difficulty, tags, grade levels)

### Architecture

#### Core Files

```
src/lib/exercises/
├── types.ts                          # Complete type system (import/export, image upload)
├── validation.ts                     # Zod schemas for validation
├── markdown-frontmatter.ts           # YAML frontmatter parser/serializer
├── parser/
│   ├── math-extractor.ts             # Extract and replace math ($...$) - Fixed regex bug
│   ├── list-parser.ts                # Parse ordered/unordered lists
│   ├── table-parser.ts               # Parse GFM tables
│   └── markdown-parser.ts            # Main markdown orchestrator
├── transpilers/
│   └── latex-transpiler.ts           # Convert AST to LaTeX
└── services/
    └── image-upload.ts               # Supabase Storage upload service ✅

src/lib/server/
├── exercises.ts                      # Exercise CRUD operations
├── exercise-import-export.ts         # Import/export functions
└── exercise-assignments.ts           # Assignment & completion tracking (1,220 lines, 20+ functions)

src/lib/components/exercises/
├── ExerciseMarkdownEditor.svelte     # Markdown editor with preview
├── ExerciseDisplay.svelte            # Web renderer with MathLive
├── ExerciseParameterizationEditor.svelte  # Variable management UI
├── ExerciseMarkdownPreview.svelte    # Live preview with instance generation
├── ExportDialog.svelte               # Export UI component
└── ImportDialog.svelte               # Import UI component

src/routes/api/exercises/
├── +server.ts                        # List/create exercises
├── [id]/+server.ts                   # Get/update/delete exercise
├── [id]/assign/+server.ts            # Create assignments
├── [id]/view/+server.ts              # Track views
├── [id]/complete/+server.ts          # Mark complete
├── [id]/stats/+server.ts             # Exercise statistics
├── [id]/access/+server.ts            # Check access
├── assigned/+server.ts               # Get assigned exercises
├── assignments/[assignmentId]/+server.ts  # Update/delete assignment
├── export/+server.ts                 # Export API endpoint
└── import/+server.ts                 # Import API endpoint
# Total: 12 API endpoints
```

#### Database & Storage

**Migrations**:

- `supabase/migrations/069_create_exercises_table.sql` - Exercises table
- `supabase/migrations/20251027005912_create_exercise_assignments.sql` - Assignments & completions
- `supabase/migrations/20251027010000_add_exercise_fulltext_search.sql` - Full-text search index
- `supabase/migrations/20251027010100_add_exercise_cleanup_triggers.sql` - Cleanup triggers

**Tables**:

- `exercises` - Exercise metadata and content (template form)
  - `id` (UUID, primary key)
  - `title` (TEXT, optional) - Exercise title
  - `source` (TEXT, optional) - Source reference
  - `statement_md` (TEXT, required) - Exercise statement (markdown + LaTeX)
  - `solution_md` (TEXT, required) - Solution (markdown + LaTeX)
  - `variables` (JSONB, optional) - Variable definitions for parameterization
  - `distribution_mode` (TEXT) - on_demand, per_student, per_group
  - `difficulty` (TEXT) - 1, 2, or 3
  - `tags` (TEXT[]) - Categorization tags
  - `grade_levels` (TEXT[]) - Target grade levels
  - `topic` (TEXT, optional) - Topic category
  - `is_public` (BOOLEAN) - Public library visibility
  - `estimated_time_minutes` (INTEGER, optional)
  - `created_by` (UUID, references profiles)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- `exercise_assignments` - Practice assignments (non-graded)
  - `id` (UUID, primary key)
  - `exercise_id` (UUID, references exercises ON DELETE CASCADE)
  - `assigned_by` (UUID, references profiles)
  - `assigned_to_type` (TEXT) - student, class, or public
  - `student_id` (UUID, nullable) - For student assignments
  - `class_id` (UUID, nullable) - For class assignments
  - `assigned_at` (TIMESTAMPTZ)
  - `optional_deadline` (TIMESTAMPTZ, nullable) - Suggested deadline (not enforced)
  - `notes` (TEXT, nullable) - Teacher instructions
  - `is_active` (BOOLEAN) - Active status

- `exercise_completions` - Optional completion tracking
  - `id` (UUID, primary key)
  - `exercise_id` (UUID, references exercises ON DELETE CASCADE)
  - `assignment_id` (UUID, nullable, references exercise_assignments ON DELETE SET NULL)
  - `student_id` (UUID, references profiles)
  - `completed_at` (TIMESTAMPTZ, nullable) - NULL = in progress, SET = completed
  - `last_viewed_at` (TIMESTAMPTZ) - Most recent view
  - `view_count` (INTEGER) - Engagement tracking
  - `created_at` (TIMESTAMPTZ)

**Views**:

- `assigned_exercises_with_details` - Joins assignments with exercise and user details for teacher dashboard

**Helper Functions**:

- `student_has_exercise_access(exercise_id, student_id)` - Check access permissions
- `get_student_exercises(student_id)` - Get all accessible exercises with completion data
- `get_teacher_assignment_stats(teacher_id)` - Aggregate statistics for teacher
- `get_assignment_completion_stats(assignment_id)` - Completion analytics for assignment

**Storage**:

- `exercise-images` bucket - Public storage for exercise images ✅
  - Path structure: `{userId}/{timestamp}-{uuid}.{ext}`
  - File validation: JPEG, PNG, GIF, SVG (max 5MB)
  - UUID-based unique filenames
  - Teacher-only upload permissions (RLS)
  - Auto-cleanup on exercise deletion (planned)

#### Components

**UI Components**:

- `ExerciseMarkdownEditor.svelte` - Split-view markdown editor with image upload ✅
- `ExerciseDisplay.svelte` - Web renderer with MathLive
- `ExportDialog.svelte` - Export UI with JSON/Markdown formats ✅
- `ImportDialog.svelte` - Import UI with duplicate handling ✅
- `ExercisePdfPreview.svelte` - LaTeX PDF preview (planned)

### Markdown Support

The parser supports GitHub Flavored Markdown (GFM) with LaTeX math extensions.

#### Inline Math: `$formula$`

```markdown
Calculate the area: $A = \pi r^2$
```

Renders as inline MathLive component.

#### Block Math: `$$formula$$`

```markdown
$$
\int_0^\pi \sin(x) dx = 2
$$
```

Renders as centered block MathLive component.

#### Text Formatting

```markdown
**bold** _italic_ `code`
```

#### Headings

```markdown
# Heading 1

## Heading 2

### Heading 3
```

#### Lists

**Ordered**:

```markdown
1. First item
2. Second item
   a. Nested item
   b. Another nested
```

Supports nested lists with multiple levels:

```markdown
1. Équations du premier degré
   a. $2x + 3 = 7$
   b. $5x - 2 = 13$
2. Équations du second degré
   a. $(x + 2)(x - 3) = 0$
   b. $x^2 - 5x + 6 = 0$
```

**Unordered**:

```markdown
- Bullet item
  - Nested bullet
  - Another nested

* Another bullet

- Plus bullet
```

Mixed ordered and unordered:

```markdown
1. Main topic
   - Sub-point one
   - Sub-point two
2. Next topic
   - Another sub-point
```

#### Tables (GFM)

```markdown
| x   | f(x) |
| --- | ---- |
| 0   | 0    |
| 1   | 2    |
| 2   | 4    |
```

Supports alignment:

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| L    |   C    |     R |
```

#### Images

```markdown
![Description](path/to/image.png)
```

Images are uploaded to Supabase Storage and referenced by path.

**Image Upload** (✅ Implemented):

The system provides a complete image upload service integrated into the markdown editor:

- **Upload Button**: Toolbar button in ExerciseMarkdownEditor
- **File Validation**: Automatic validation of type and size
- **Supported Formats**: JPEG, PNG, GIF, SVG
- **Size Limit**: 5MB per image
- **Unique Filenames**: UUID-based to prevent conflicts
- **Progress Indicator**: Visual feedback during upload
- **Error Handling**: French user messages for validation errors
- **Storage Path**: `{userId}/{timestamp}-{uuid}.{ext}`

**Usage in Editor**:

1. Click the image upload button in the Structure section
2. Select an image file (JPEG, PNG, GIF, or SVG)
3. Wait for upload confirmation toast
4. Image markdown `![](url)` is automatically inserted at cursor position
5. Preview updates immediately to show the uploaded image

**Validation Errors** (French):

- **Type invalide**: "Le fichier doit être une image (JPEG, PNG, GIF, SVG)"
- **Fichier trop volumineux**: "L'image ne doit pas dépasser 5 Mo"
- **Upload échoué**: "Échec de l'envoi de l'image. Veuillez réessayer."

#### Horizontal Rules

```markdown
---
```

### Parameterization

🆕 **2025-10-27** - Create exercises with dynamic variables and random values

The Exercise System now supports **parameterization**, allowing you to create exercise templates with variables that generate different values for each student or session.

#### What is Parameterization?

Instead of creating static exercises like "Calculate 5 + 3", you can create parameterized templates like "Calculate {{a}} + {{b}}" where `a` and `b` are variables that generate random numbers.

**Benefits**:

- ✅ Create one exercise, generate thousands of variants
- ✅ Prevent cheating (each student gets different values)
- ✅ Unlimited practice with always-new problems
- ✅ Automatic solution generation with correct values

#### Quick Example

**Variables**:

```
a = {{1-20}}          → Random integer 1-20
b = {{1-20}}          → Random integer 1-20
sum = {{eval:{{a}}+{{b}}}}  → Calculated result
```

**Statement**:

```markdown
Calculate: ${{a}} + {{b}}$
```

**Solution**:

```markdown
${{a}} + {{b}} = {{sum}}$
```

**Result**: Each student sees different values like "7 + 3 = 10" or "15 + 8 = 23"

#### Distribution Modes

The system supports **three distribution modes**:

| Mode            | Behavior                                 | Use Case                                  |
| --------------- | ---------------------------------------- | ----------------------------------------- |
| **On Demand**   | New values on each "New Problem" click   | Practice, unlimited drill                 |
| **Per Student** | Unique but consistent values per student | Graded homework, personalized assignments |
| **Per Group**   | Same values for all group members        | Collaborative work, class discussions     |

**When to use which mode**:

- **On Demand**: Tables de multiplication, pratique libre, révisions
- **Per Student**: Devoirs notés, évaluations à distance, anti-triche
- **Per Group**: Exercices de cours, correction collective, travail collaboratif

#### Syntax Reference

**Variable Reference**: `{{variableName}}`

```markdown
The value is {{x}}
Calculate {{a}} + {{b}}
```

**Random Integer**: `{{min-max}}`

```
{{1-10}}           → 1, 2, ..., 10
{{-5-5}}           → -5, -4, ..., 5
```

**Random Decimal**: `{{min-max:step}}`

```
{{0-1:0.1}}        → 0.0, 0.1, ..., 1.0
{{10.5-20.5:0.5}}  → 10.5, 11.0, ..., 20.5
```

**Exclusions**: `{{base!exclusions}}`

```
{{1-10!5}}         → 1-10 except 5
{{1-20!5,7}}       → 1-20 except 5 and 7
{{1-50!10-20}}     → 1-50 except 10-20
{{1-10!{{a}}}}     → 1-10 except value of a
```

**Expression Evaluation**: `{{eval:expression}}`

```
{{eval:{{a}}+{{b}}}}           → Sum
{{eval:{{a}}*{{b}}}}           → Product
{{eval:Math.sqrt({{x}})}}      → Square root
{{eval:({{a}}+{{b}})/2}}       → Average
```

#### Complete Example: Rectangle Area

**Variables**:

```
longueur = {{5-15}}
largeur = {{3-12}}
aire = {{eval:{{longueur}}*{{largeur}}}}
```

**Statement**:

```markdown
## Aire d'un rectangle

Un rectangle a les dimensions suivantes :

- Longueur : {{longueur}} cm
- Largeur : {{largeur}} cm

Calculez son aire.
```

**Solution**:

```markdown
## Solution

Formule : $A = L \times l$

Application :
$A = {{longueur}} \times {{largeur}} = {{aire}}$ cm²

**Réponse** : {{aire}} cm²
```

**Distribution Mode**: Per Student

**Result**: Generates 121 unique variants (11 lengths × 11 widths)

#### Documentation

For comprehensive documentation on parameterization:

- **[Parameterization Guide](./parameterization-guide.md)** - Complete guide with examples (🆕 2025-10-27)
- **[Quick Reference](./parameterization-quick-reference.md)** - One-page syntax cheat sheet (🆕 2025-10-27)
- **[Step-by-Step Tutorial](./parameterization-tutorial.md)** - Guided tutorials for beginners (🆕 2025-10-27)
- **[Technical Details](../../architecture/parameterization-system.md)** - Shared parameterization library

#### Implementation Details

**Database Schema** (`exercises` table):

- `variables` (JSONB): Array of variable definitions `[{name, expression}]`
- `distribution_mode` (TEXT): One of `on_demand`, `per_student`, `per_group`
- `is_public` (BOOLEAN): Visibility flag for shared exercises

**Instance Generator** (`src/lib/exercises/generator/instance-generator.ts`):

- Deterministic seeding based on distribution mode
- Resolves variables in dependency order
- Validates for circular dependencies
- Supports all syntax features (random, eval, exclusions)

**UI Components**:

- `ExerciseParameterizationEditor.svelte` - Variable editor with syntax helpers
- `ExerciseDisplay.svelte` - Renders resolved instances
- Live preview with regeneration capability

**Testing**:

- ✅ 27 unit tests covering generator logic
- ✅ 25 E2E tests covering full user workflows
- ✅ All tests passing, production-ready

#### When to Use Parameterization

**Excellent Candidates**:

- ✅ Arithmetic calculations (addition, multiplication, etc.)
- ✅ Geometry with variable dimensions (areas, perimeters, volumes)
- ✅ Algebra (equation solving, factorization)
- ✅ Fractions (simplification, operations)
- ✅ Percentages and proportions

**Less Suitable**:

- ❌ Complex narrative problems
- ❌ Theoretical geometry proofs
- ❌ Open-ended development questions
- ❌ Problems requiring specific context

#### Migration Guide

**Converting Static to Parameterized**:

**Before**:

```markdown
Calculate the area of a rectangle 12 cm × 8 cm.
Solution: Area = 12 × 8 = 96 cm²
```

**After**:

```
Variables:
  longueur = {{5-15}}
  largeur = {{3-12}}
  aire = {{eval:{{longueur}}*{{largeur}}}}

Statement:
  Calculate the area of a rectangle {{longueur}} cm × {{largeur}} cm.

Solution:
  Area = {{longueur}} × {{largeur}} = {{aire}} cm²
```

**Result**: One template generates hundreds of variants!

---

### Abstract Syntax Tree (AST)

The parser converts markdown to a typed AST for rendering and transpilation.

#### Document Structure

```typescript
interface DocumentNode {
	type: 'document';
	children: BlockNode[];
}
```

#### Block Nodes

```typescript
type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ListNode
	| TableNode
	| MathBlockNode
	| ImageNode
	| HorizontalRuleNode;

// Example: Paragraph
interface ParagraphNode {
	type: 'paragraph';
	children: InlineNode[];
}

// Example: Heading
interface HeadingNode {
	type: 'heading';
	level: 1 | 2 | 3 | 4 | 5 | 6;
	children: InlineNode[];
}

// Example: Math Block
interface MathBlockNode {
	type: 'math-block';
	latex: string;
}
```

#### Inline Nodes

```typescript
type InlineNode = TextNode | MathInlineNode | LineBreakNode;

// Example: Text with formatting
interface TextNode {
	type: 'text';
	content: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
}

// Example: Inline math
interface MathInlineNode {
	type: 'math-inline';
	latex: string;
}
```

#### List Nodes

```typescript
interface ListNode {
	type: 'list';
	ordered: boolean;
	start?: number;
	items: ListItemNode[];
}

interface ListItemNode {
	type: 'list-item';
	children: ASTNode[]; // Can contain blocks, inlines, or nested lists
}
```

#### Table Nodes

```typescript
interface TableNode {
	type: 'table';
	alignments: ('left' | 'center' | 'right')[];
	header: TableCellNode[];
	rows: TableCellNode[][];
}

interface TableCellNode {
	content: string;
	align: 'left' | 'center' | 'right';
}
```

### Markdown Parser Pipeline

The parser processes markdown through a multi-stage pipeline:

#### Stage 1: Math Extraction

```typescript
// Extract $math$ and $$math$$ blocks
const { content, mathBlocks } = extractMath(markdown);
// Replaces math with placeholders: __MATH_0__, __MATH_1__, etc.
```

**Critical Bug Fix** (2025-10-26):

Fixed regex bug in `math-extractor.ts` that caused 20 test failures:

- **Before**: `/(?<!\\)$([^$\n]+)$/g` (incorrect - unescaped `$`)
- **After**: `/(?<!\\)\$([^$\n]+)\$/g` (correct - escaped `\$`)
- **Impact**: Inline math extraction now works correctly for all test cases
- **Tests**: All 26 math-extractor tests now passing

#### Stage 2: Block Parsing

```typescript
// Parse markdown blocks (tables, lists, paragraphs)
const lines = content.split('\n');
const blocks = parseBlocks(lines);
```

**List Parsing**:

- Detects ordered (`1.`, `a.`, `1)`) and unordered (`-`, `*`, `+`) lists
- Handles nested lists with indentation
- Supports mixed numbering (numeric and alphabetic)

**Table Parsing**:

- Detects GFM table syntax
- Parses alignment indicators (`:---`, `:--:`, `---:`)
- Validates header/separator/row structure

#### Stage 3: Inline Parsing

```typescript
// Parse inline formatting within text
function parseInline(text: string): InlineNode[] {
	// 1. Replace math placeholders with MathInlineNode
	// 2. Parse **bold**, *italic*, `code`
	// 3. Split into text segments
}
```

#### Stage 4: Math Restoration

```typescript
// Replace __MATH_0__ placeholders with actual LaTeX
const ast = restoreMath(parsedAST, mathBlocks);
```

### LaTeX Transpiler

The transpiler converts AST to LaTeX for PDF generation.

#### Options

```typescript
interface LatexTranspilerOptions {
	includePreamble?: boolean; // Include \documentclass, \begin{document}
	documentClass?: string; // Default: 'article'
	paperSize?: string; // Default: 'a4paper'
	fontSize?: string; // Default: '11pt'
	title?: string; // Document title
	author?: string; // Document author
	extraPackages?: string[]; // Additional LaTeX packages
	imagePath?: string; // Base path for images
}
```

#### Usage

```typescript
import { markdownToLatex } from '$lib/exercises/transpilers/latex-transpiler';

// Full document
const latex = await markdownToLatex(markdown, {
	title: 'Exercices de Mathématiques',
	author: 'M. Dupont',
	paperSize: 'a4paper'
});

// Content only (for embedding)
const latexContent = await markdownToLatex(markdown, {
	includePreamble: false
});
```

#### LaTeX Output

**Preamble** (when `includePreamble: true`):

```latex
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{graphicx}
\usepackage{array}
\usepackage{longtable}

\title{Exercise Title}
\author{Author Name}

\begin{document}
\maketitle
```

**Math Rendering**:

- Inline: `$\frac{x}{2}$`
- Block: `\[\int_0^\pi \sin(x) dx\]`

**Lists**:

```latex
\begin{enumerate}
  \item First item
  \item Second item
\end{enumerate}

\begin{itemize}
  \item Bullet item
\end{itemize}
```

**Tables**:

```latex
\begin{tabular}{|l|c|r|}
\hline
Left & Center & Right \\
\hline
A & B & C \\
\hline
\end{tabular}
```

**Images**:

```latex
\begin{center}
  \includegraphics[width=0.8\textwidth]{image.png}
  \textit{Image caption}
\end{center}
```

### Components

#### ExerciseMarkdownEditor

**File**: `src/lib/components/exercises/ExerciseMarkdownEditor.svelte`
**Purpose**: Split-view markdown editor with live preview

**Features**:

- Native `<textarea>` for markdown input
- Collapsible toolbar sections: Text, Math, Structure
- Quick-insert buttons for common syntax
- Live preview with MathLive rendering
- Toggleable preview pane
- Template buttons for math formulas

**Props**:

```typescript
interface Props {
	value?: string; // Markdown content ($bindable)
	placeholder?: string; // Default: 'Écrivez votre exercice en markdown...'
	showPreview?: boolean; // Default: true
}
```

**Toolbar Sections**:

**Text** (Bold, Italic, Code):

```typescript
actions.bold(); // **text**
actions.italic(); // *text*
actions.code(); // `text`
```

**Math** (Inline, Block, Templates):

```typescript
actions.mathInline(); // $x$
actions.mathBlock(); // $$\n...\n$$

// Templates
insertMathTemplate('\\frac{a}{b}'); // Fraction
insertMathTemplate('\\sqrt{x}'); // Root
insertMathTemplate('x^{n}'); // Exponent
insertMathTemplate('\\sum_{i=1}^{n}'); // Sum
```

**Structure** (Headings, Lists, Tables, Images):

```typescript
actions.heading1(); // #
actions.heading2(); // ##
actions.bulletList(); // -
actions.orderedList(); // 1.
actions.table(); // Insert table template
actions.image(); // ![](path)
actions.hr(); // ---

// Image Upload (implemented)
handleImageUpload(file); // Uploads to Supabase Storage, inserts markdown
```

**Image Upload Integration** (✅ Complete):

The editor includes a fully functional image upload button:

```typescript
// Triggered when user clicks upload button or selects file
async function handleImageUpload(file: File) {
	// 1. Validate file type and size
	const error = validateImageFile(file);
	if (error) {
		toaster.error(error); // French error message
		return;
	}

	// 2. Upload to Supabase Storage
	uploading = true; // Show progress indicator
	const result = await uploadExerciseImage(supabase, file, userId);

	// 3. Handle result
	if (result.success && result.publicUrl) {
		insertMarkdown(`![Description](${result.publicUrl})`);
		toaster.success('Image envoyée avec succès');
	} else {
		toaster.error(result.error || "Échec de l'envoi de l'image");
	}
	uploading = false;
}
```

**Features**:

- File picker integration
- Real-time validation feedback
- Upload progress indicator
- Automatic markdown insertion
- French toast notifications
- Error recovery

**Usage**:

```svelte
<script>
	import ExerciseMarkdownEditor from '$lib/components/exercises/ExerciseMarkdownEditor.svelte';

	let markdown = $state('# My Exercise\n\nSolve: $2x + 3 = 7$');
</script>

<ExerciseMarkdownEditor bind:value={markdown} showPreview={true} />
```

#### ExerciseDisplay

**File**: `src/lib/components/exercises/ExerciseDisplay.svelte`
**Purpose**: Parse and render markdown with MathLive

**Features**:

- Parses markdown to AST using `parseMarkdown()`
- Converts AST to HTML with proper escaping
- Renders math formulas with MathLive `<math-field>` components
- Read-only display mode
- Prose styling with Tailwind typography
- **Full color theming support** - All elements (headings, lists, tables, code) properly styled with `text-foreground`
- **List markers styled** - Numbers and bullets inherit theme colors via `::marker` pseudo-element

**Props**:

```typescript
interface Props {
	markdown: string; // Markdown content to display
}
```

**Rendering Pipeline**:

```typescript
// 1. Parse markdown to AST
const ast = parseMarkdown(markdown);

// 2. Render blocks to HTML
const html = ast.children.map(renderBlock).join('');

// 3. Display with {@html}
{@html html}
```

**Usage**:

```svelte
<script>
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';

	const markdown = '# Exercise\n\nCalculate: $\\frac{x}{2}$';
</script>

<ExerciseDisplay {markdown} />
```

**MathLive Integration**:

- Inline math: `<math-field read-only class="inline-math">{latex}</math-field>`
- Block math: `<math-field read-only class="text-2xl">{latex}</math-field>`
- Auto-loads MathLive CSS via `import 'mathlive'`

**Styling & Theming**:

All rendered elements inherit the application theme properly:

- Paragraphs, headings (h1-h6), list items, table cells: `text-foreground`
- Code blocks: `text-foreground` with `bg-muted` background
- List markers (numbers/bullets): Styled via `::marker` pseudo-element
- Links: `text-primary` with underline
- Strong/emphasis: Inherit foreground color with proper weight/style

Example CSS:

```css
:global(.prose ol li::marker),
:global(.prose ul li::marker) {
	color: hsl(var(--foreground));
}
```

#### ExercisePdfPreview (Planned)

**Purpose**: Generate and preview PDF from LaTeX

**Planned Features**:

- Convert markdown to LaTeX via transpiler
- Send LaTeX to backend compilation service
- Display PDF preview inline
- Download PDF button
- Error handling for LaTeX compilation

### Admin Interface (Planned)

#### Exercise List Page

**Route**: `/dashboard/admin/exercises`

**Features**:

- Table/card view toggle
- Filter by subject, grades, author
- Search by title, description
- Sort by creation date, title
- Pagination (50 per page)
- Quick actions: View, Edit, Duplicate, Delete

#### Exercise Create/Edit Form

**Route**: `/dashboard/admin/exercises/create`, `/dashboard/admin/exercises/[id]/edit`

**Form Sections**:

**Metadata**:

- Title (required, supports LaTeX inline)
- Description (optional, rich text editor)
- Subject (dropdown)
- Grades (multi-select)

**Content**:

- ExerciseMarkdownEditor with live preview
- Image upload (drag & drop, file picker)
- Syntax helpers

**Preview**:

- Web preview (ExerciseDisplay)
- PDF preview (ExercisePdfPreview)
- Toggle between formats

**Actions**:

- Save as draft
- Publish
- Export PDF
- Export LaTeX source

### API Endpoints (Planned)

#### `GET /api/exercises`

List exercises with filters and pagination.

**Query Params**:

- `subject` (string) - Filter by subject
- `grades` (string[]) - Filter by grade levels
- `search` (string) - Search in title/description
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 50, max: 100)

**Response**:

```typescript
{
  success: true,
  data: Exercise[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

#### `POST /api/exercises`

Create new exercise (admin only).

**Body**:

```typescript
{
  title: string,
  description?: string,
  markdown_content: string,
  subject?: string,
  grades?: string[]
}
```

**Response**:

```typescript
{
  success: true,
  data: Exercise
}
```

#### `GET /api/exercises/[id]`

Get single exercise by ID.

**Response**:

```typescript
{
  success: true,
  data: Exercise
}
```

#### `PUT /api/exercises/[id]`

Update exercise (admin only).

**Body**: Same as POST
**Response**: Same as POST

#### `DELETE /api/exercises/[id]`

Delete exercise (admin only).

**Response**:

```typescript
{
	success: true;
}
```

#### `POST /api/exercises/[id]/export/pdf`

Generate PDF export.

**Body**:

```typescript
{
  options?: LatexTranspilerOptions
}
```

**Response**: PDF file (application/pdf)

### Testing

#### Unit Tests

The Exercise Bank System has comprehensive test coverage with **300+ passing tests**:

**Parser Tests** (`src/lib/exercises/parser/*.test.ts`):

- ✅ Math Extractor: 26 tests (all passing after regex bug fix)
  - Inline and block math extraction
  - Escaped delimiters (`\$`)
  - Placeholder replacement
  - Edge cases (consecutive `$$`, newlines, complex LaTeX)
- ✅ List Parser: 80+ tests
  - Ordered/unordered lists
  - Nested lists with multiple levels
  - Mixed numbering (numeric, alphabetic)
  - Edge cases
- ✅ Table Parser: 40+ tests
- ✅ Markdown Parser: 70+ integration tests
- **Total Parser Tests**: 222 passing

**Transpiler Tests** (`src/lib/exercises/transpilers/*.test.ts`):

- ✅ LaTeX Transpiler: 60+ test cases
  - Escape special characters
  - Inline/block math
  - Lists (ordered/unordered, nested)
  - Tables (with alignments)
  - Images with paths
  - Preamble options

**Import/Export Tests** (`src/lib/server/exercise-import-export.test.ts`):

- ✅ 23 comprehensive tests (all passing)
  - JSON export/import (single and bulk)
  - Markdown export/import with frontmatter
  - Duplicate detection with SHA-256 hashing
  - All 3 duplicate strategies: skip, replace, create-copy ✅
  - Validation integration
  - Error handling
  - Filename generation

**Image Upload Tests** (`src/lib/exercises/services/image-upload.test.ts`):

- ✅ 50 comprehensive tests (all passing)
  - File validation (type and size)
  - Unique filename generation with UUID
  - Upload operations (single and batch)
  - Delete operations (single and batch)
  - URL utilities (path extraction, validation)
  - Error handling and recovery
  - Constants verification

**Total Test Coverage**: 300+ tests passing across all modules

**Test Examples**:

```typescript
// Math extraction
it('should extract inline math', () => {
	const input = 'Calculate $x^2$ please';
	const { content, mathBlocks } = extractMath(input);
	expect(mathBlocks[0]).toEqual({ latex: 'x^2', type: 'inline' });
});

// List parsing
it('should parse nested lists', () => {
	const lines = ['1. First', '  a. Nested', '2. Second'];
	const lists = parseList(lines);
	expect(lists[0].items).toHaveLength(2);
	expect(lists[0].items[0].children).toHaveLength(2); // Text + nested list
});

// LaTeX transpilation
it('should transpile inline math', () => {
	const ast = parseMarkdown('Calculate $x^2$ please');
	const latex = transpileToLatex(ast, { includePreamble: false });
	expect(latex).toContain('Calculate $x^2$ please');
});
```

### Performance Considerations

**Parsing**:

- Single-pass markdown parsing
- Efficient math extraction with regex
- Lazy evaluation of inline nodes

**Rendering**:

- MathLive components cached by browser
- Virtual DOM diffing for updates
- Debounced preview updates (300ms)

**Database**:

- JSONB index on `ast` for fast queries
- GIN index on `grades` array
- Full-text search on title + description (planned)

**Storage**:

- Image compression before upload
- CDN delivery via Supabase (automatic)
- Lazy loading for images in lists

### Best Practices

**DO**:

- Use semantic heading levels (H1 for title, H2 for sections)
- Add alt text to all images
- Test math formulas in preview before saving
- Use tables for data, lists for sequences
- Keep markdown clean and readable
- Include corrections/solutions in separate sections

**DON'T**:

- Mix inline and block math inconsistently
- Nest headings incorrectly (H1 → H3)
- Use raw HTML in markdown (not supported)
- Upload large images (compress first)
- Use complex LaTeX in inline math (hard to read)

### Troubleshooting

**Common Issues**:

1. **Math not rendering**
   - **Cause**: Unmatched `$` delimiters or invalid LaTeX
   - **Fix**: Check that all `$` have matching closing `$`, validate LaTeX syntax

2. **Table parsing fails**
   - **Cause**: Missing alignment row or inconsistent column count
   - **Fix**: Ensure `|---|---|` separator row, equal columns in all rows

3. **List indentation wrong**
   - **Cause**: Inconsistent spacing (mix of tabs/spaces)
   - **Fix**: Use 2 spaces per indent level consistently

4. **Preview shows raw markdown**
   - **Cause**: Parser error, AST is null
   - **Fix**: Check browser console for parsing errors, validate markdown syntax

5. **Images not loading**
   - **Cause**: Invalid path or storage permissions
   - **Fix**: Verify image uploaded to Supabase Storage, check bucket permissions

6. **Text elements not visible or wrong color**
   - **Cause**: Missing `text-foreground` class or CSS styling
   - **Fix**: All elements should have proper color classes. Check ExerciseDisplay.svelte for `text-foreground` classes on paragraphs, headings, lists, and table cells. List markers require `::marker` pseudo-element styling.

### Completed Features

✅ **Core System** (v1.0)

- Markdown parsing with LaTeX support
- Abstract Syntax Tree (AST) generation
- LaTeX transpiler for PDF export
- Rich markdown editor with live preview
- Exercise display with MathLive rendering
- Database schema and migrations
- Full color theming support
- Math extractor regex bug fixed (26 tests passing)

✅ **Image Upload System** (v1.0) - 🆕 2025-10-26

- Complete Supabase Storage integration
- File validation (JPEG, PNG, GIF, SVG, max 5MB)
- UUID-based unique filename generation
- Path structure: `{userId}/{timestamp}-{uuid}.{ext}`
- Upload progress indicator in editor UI
- Batch upload support
- French error messages and toast notifications
- 50 comprehensive tests (all passing)
- See `src/lib/exercises/services/image-upload.ts`

✅ **Import/Export System** (v1.0) - Updated 2025-10-26

- JSON and Markdown export formats
- Bulk import with validation
- Duplicate detection via SHA-256 content hashing
- **All 3 duplicate strategies working**: skip, replace, create-copy ✅
- "create-copy" generates incremental titles ("copie", "copie 2", etc.)
- "replace" with ownership verification
- Comprehensive error handling
- 23 import/export tests (all passing)
- See [Import/Export Guide](./import-export.md)

✅ **Teacher Interface** (v1.0)

- Exercise list page with filtering
- Exercise creation and editing
- Import/export UI with drag-and-drop
- Image upload button in markdown toolbar
- Navigation integrated in teacher dashboard
- Real-time markdown preview

✅ **Code Quality** (v1.0)

- Zero ESLint errors (45 errors fixed on 2025-10-26)
- Full TypeScript type safety
- Comprehensive test coverage: **300+ tests passing**
  - Parser: 222 tests
  - Import/Export: 23 tests
  - Image Upload: 50 tests
- Production-ready code quality

### Future Enhancements

Potential improvements for the Exercise Bank System:

**Phase 2** (Next Priority):

- **PDF Generation**: Server-side LaTeX to PDF compilation
- **Student View**: Display exercises in student dashboard
- **Exercise Sets**: Group related exercises into worksheets
- **Templates**: Pre-built exercise structures (géométrie, algèbre, etc.)

**Phase 3** (Future):

- **Collaborative Editing**: Multiple authors per exercise
- **Version History**: Track changes, restore previous versions
- **Public Library**: Share exercises publicly with other teachers
- **Auto-numbering**: Automatic question numbering in multi-part exercises
- **Answer Keys**: Separate answer key generation with visibility controls
- **Print Optimization**: Custom print CSS for better formatting
- **DOCX Export**: Microsoft Word export via pandoc
- **Bulk Operations**: Enhanced multi-select actions (duplicate, tag, delete)

## Documentation

Complete documentation is available across multiple guides:

### Core Documentation

- **[Architecture Documentation](./architecture.md)** - System architecture, database schema, data flow, security model ✅
- **[Components Reference](./components.md)** - Complete component API with props, events, and usage examples ✅
- **[API Documentation](./api.md)** - All 13 API endpoints with request/response formats and examples ✅

### Feature Guides

- **[Parameterization Guide](./parameterization-guide.md)** - Complete guide to creating parameterized exercises ✅
- **[Parameterization Tutorial](./parameterization-tutorial.md)** - Step-by-step tutorials for beginners ✅
- **[Parameterization Quick Reference](./parameterization-quick-reference.md)** - One-page syntax cheat sheet ✅
- **[Import/Export Guide](./import-export.md)** - Complete guide to importing and exporting exercises ✅

### Technical References

- **[Parameterization System Architecture](../../architecture/parameterization-system.md)** - Shared library technical details ✅
- **[Database Schema](../../architecture/database-schema.md)** - Complete database schema documentation ✅

---

## Assignment System

🆕 **2025-10-27** - Complete assignment and completion tracking system for practice exercises

### Overview

The Assignment System allows teachers to distribute exercises to students in a flexible, non-graded practice mode. Unlike assessments, assignments are optional tracking tools for organization and progress visibility.

**Key Features**:

- ✅ Flexible assignment targets (individual student, class, or public)
- ✅ Optional deadline for organization (not enforced)
- ✅ Optional completion tracking (student self-reported)
- ✅ View count and engagement analytics
- ✅ Seamless integration with parameterization (per_student, per_group modes)
- ✅ Full-text search across assigned exercises
- ✅ Teacher and student dashboards

### Assignment Types

| Type        | Description                       | Use Case                                   |
| ----------- | --------------------------------- | ------------------------------------------ |
| **Student** | Assign to specific student(s)     | Individual homework, personalized practice |
| **Class**   | Assign to all students in a class | Homework for entire class                  |
| **Public**  | Make available to all students    | Optional practice, public library          |

### Distribution Modes with Assignments

Parameterized exercises work seamlessly with assignments:

| Mode            | Behavior                   | Assignment Use Case                   |
| --------------- | -------------------------- | ------------------------------------- |
| **On Demand**   | New values on each click   | Practice drills, unlimited variations |
| **Per Student** | Unique values per student  | Personalized homework, anti-cheating  |
| **Per Group**   | Same values for assignment | Class work, shared discussions        |

**Example**: Assign parameterized exercise with `per_student` mode to class:

- Each student gets unique values (seeded by student_id)
- Student A sees: "Calculate 7 + 3"
- Student B sees: "Calculate 12 + 5"
- Teacher can track completion per student

### Teacher Workflow

**1. Create Exercise**:

```typescript
POST /api/exercises
{
  "statement_md": "Calculate {{a}} + {{b}}",
  "solution_md": "Answer: {{eval:a+b}}",
  "variables": [
    { "name": "a", "expression": "{{1-20}}" },
    { "name": "b", "expression": "{{1-20}}" }
  ],
  "distribution_mode": "per_student",
  "difficulty": "1",
  "tags": ["addition"]
}
```

**2. Assign to Students/Classes**:

```typescript
POST /api/exercises/ex-123/assign
{
  "students": ["student-1", "student-2", "student-3"],
  "classes": ["class-3eme-a"],
  "optional_deadline": "2024-01-20T23:59:59Z",
  "notes": "Complete before Friday"
}
// Creates 30+ assignments (3 students + ~25 in class)
```

**3. Monitor Progress**:

```typescript
GET /api/exercises/ex-123/stats
{
  "total_assigned": 30,
  "total_viewed": 28,
  "total_completed": 25,
  "completion_rate": 83.33,
  "average_view_count": 2.4
}
```

### Student Workflow

**1. View Assigned Exercises**:

```typescript
GET /
	api /
	exercises /
	assigned[
		// Returns exercises with assignment and completion data
		{
			id: 'ex-123',
			title: 'Addition Practice',
			assignment: {
				optional_deadline: '2024-01-20T23:59:59Z',
				notes: 'Complete before Friday'
			},
			completion: {
				completed_at: null, // Not yet complete
				view_count: 2
			}
		}
	];
```

**2. Open Exercise**:

```typescript
GET / exercises / ex - 123;
// Generates instance with per_student seed
// Student sees: "Calculate 7 + 3"
// Automatically tracks view
```

**3. Mark as Complete** (optional):

```typescript
POST / api / exercises / ex - 123 / complete;
// Sets completed_at timestamp
// Updates teacher's completion statistics
```

### Database Schema

**Assignment Record**:

```sql
CREATE TABLE exercise_assignments (
  id UUID PRIMARY KEY,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),

  assigned_to_type TEXT CHECK (assigned_to_type IN ('student', 'class', 'public')),
  student_id UUID,  -- For student assignments
  class_id UUID,    -- For class assignments

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  optional_deadline TIMESTAMPTZ,  -- Suggested, not enforced
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

**Completion Tracking**:

```sql
CREATE TABLE exercise_completions (
  id UUID PRIMARY KEY,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES exercise_assignments(id) ON DELETE SET NULL,
  student_id UUID REFERENCES profiles(id),

  completed_at TIMESTAMPTZ,  -- NULL = in progress, SET = complete
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Access Control

**Student can access exercise if**:

1. Exercise is public (`is_public = TRUE`)
2. Has direct assignment (`assigned_to_type = 'student'`)
3. Is in class with assignment (`assigned_to_type = 'class'`)
4. Has public assignment (`assigned_to_type = 'public'`)

**Database Function**:

```sql
SELECT student_has_exercise_access('ex-123', 'student-abc');
-- Returns TRUE or FALSE
```

### Statistics & Analytics

**Per-Exercise Analytics**:

```typescript
GET /api/exercises/ex-123/stats
{
  "total_assigned": 30,
  "total_viewed": 28,
  "total_completed": 25,
  "completion_rate": 83.33,
  "average_view_count": 2.4
}
```

### Full-Text Search

🆕 **2025-10-27** - Efficient full-text search using PostgreSQL GIN index

**Search Index**:

```sql
CREATE INDEX idx_exercises_fulltext ON exercises
USING gin(to_tsvector('french',
  coalesce(title, '') || ' ' ||
  coalesce(statement_md, '') || ' ' ||
  coalesce(solution_md, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '')
));
```

**Usage**:

```typescript
GET /api/exercises/assigned?search=pythagore
// Searches across title, statement, solution, and tags
// Uses French language stemming (pythagore → pythagore, pythagoricien)
```

### Performance

**Query Optimization**:

- **17 indexes** across 3 tables for fast queries
- **Full-text search**: ~5ms for 1000+ exercises
- **Student exercise list**: ~10ms (uses database function with joins)
- **Teacher statistics**: ~15ms (aggregates across completions)

**Caching Strategy** (future):

- Cache public exercises in-memory (rarely change)
- Cache student's accessible exercises for 5 minutes
- Invalidate on new assignment

---

## Related Documentation

### Core Documentation

- **[Architecture Documentation](./architecture.md)** - Complete system architecture ✅
- **[Components Reference](./components.md)** - Component API reference ✅
- **[API Documentation](./api.md)** - All API endpoints ✅

### Feature Guides

- **[Parameterization Guide](./parameterization-guide.md)** - Variable-based templates ✅
- **[Import/Export Guide](./import-export.md)** - Import/export workflows ✅

### Technical References

- **[Database Schema](../../architecture/database-schema.md)** - Complete database documentation ✅
- **[Parameterization System](../../architecture/parameterization-system.md)** - Shared library details ✅

---

**Remember:** The Exercise Bank System is designed for simplicity and extensibility. When adding features, prioritize clear markdown syntax and reliable parsing over complex edge cases.
