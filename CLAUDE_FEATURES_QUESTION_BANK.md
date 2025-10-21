# CLAUDE_FEATURES_QUESTION_BANK.md

> **📖 Core Project Guidelines**: See **[CLAUDE.md](CLAUDE.md)** for project structure, Svelte 5 best practices, and development workflows.
>
> **📚 Other Features**: See **[CLAUDE_FEATURES.md](CLAUDE_FEATURES.md)** for other feature documentation.

This file contains detailed documentation for the Question Bank System.

---

## Question Bank System

The Question Bank System provides a comprehensive framework for creating mathematical flashcard questions with variables, random number generation, and mathematical evaluation.

### Overview

**Location**: `/dashboard/admin/questions` (admin only)
**Status**: Fully implemented (Backend + API + Admin Interface)

The system allows admins to create question templates that generate infinite variations using:

- **Variables** with dependency resolution
- **Random number generation** with exclusions
- **Mathematical evaluation** via MathLive Compute Engine
- **6 question types** (numerical, algebraic, fill-in-blanks, QCM)
- **Grade-level targeting** (CP → Tale + STMG)
- **Categorization system** (theme, domain, subdomain, difficulty level)

### Architecture

#### Core Files (17 backend files)

```
src/lib/questions/
├── types.ts                          # Complete type system (270+ lines)
├── parser/
│   ├── tokenizer.ts                  # Extract {@:}, {#:}, {eval:} tokens
│   ├── random-parser.ts              # Parse random expressions
│   ├── variable-parser.ts            # Extract variable references
│   └── eval-parser.ts                # Extract evaluation expressions
├── generator/
│   ├── instance-generator.ts         # Main orchestrator
│   ├── variable-resolver.ts          # Resolve variables in order
│   ├── random-generator.ts           # Generate random numbers
│   ├── content-resolver.ts           # Resolve content fields
│   └── choice-shuffler.ts            # Shuffle QCM choices
├── validators/
│   ├── template-validator.ts         # Validate template structure
│   └── circular-dependency.ts        # Detect circular references (DFS)
└── compute-engine/
    └── wrapper.ts                    # MathLive integration
```

#### Database & API

**Migration**: `supabase/migrations/070_create_question_templates.sql`
**Seed Data**: `supabase/migrations/071_seed_question_templates.sql` (10 examples)

**API Endpoints**:

- `GET /api/questions/templates` - List with filters (type, grades, pagination)
- `POST /api/questions/templates` - Create new template (admin only)
- `GET /api/questions/templates/[id]` - Get single template
- `PUT /api/questions/templates/[id]` - Update template (admin only)
- `DELETE /api/questions/templates/[id]` - Delete template (admin only)
- `POST /api/questions/generate/[id]` - Generate instance with optional seed

#### Admin Interface (10 frontend files)

**Pages**:

- `/dashboard/admin/questions` - List all templates
- `/dashboard/admin/questions/create` - Create new template
- `/dashboard/admin/questions/[id]/edit` - Edit existing template

**Components**:

- `QuestionTemplateForm.svelte` - Main form orchestrator with tabs
- `VariableEditor.svelte` - Variable management with syntax helpers
- `ContentFieldEditor.svelte` - Multi-field text/image editor
- `AnswerEditor.svelte` - Type-specific answer configuration
- `PrecisionEditor.svelte` - Numerical precision settings
- `QuestionPreview.svelte` - Live instance preview
- `JsonViewer.svelte` - JSON debug viewer

### Question Types

#### 1. Numerical (Exact, Decimal, Rounded)

**Example Template**:

```typescript
{
  type: 'numerical_exact',
  statement: [
    { type: 'text', content: 'Calculate $$\\frac{{@:num}}{{@:den}}$$' }
  ],
  variables: [
    { name: 'gcd', expression: '{#:2-5}' },
    { name: 'a', expression: '{#:2-9}' },
    { name: 'b', expression: '{#:2-9!{@:a}}' },
    { name: 'num', expression: '{eval:{@:a}*{@:gcd}}' },
    { name: 'den', expression: '{eval:{@:b}*{@:gcd}}' }
  ],
  answer: '{eval:{@:num}/{@:den}}',
  precision: { type: 'decimal', digits: 2 },
  grades: ['6', '5']
}
```

**Precision Types**:

- `none` - Exact match only
- `decimal` - Fixed decimal places (e.g., 2 decimals)
- `significant` - Significant figures (e.g., 3 sig figs)
- `magnitude` - Order of magnitude (e.g., nearest 10)
- `tolerance` - Absolute (±value) or relative (±percentage)

#### 2. Algebraic Transform

**Example**:

```typescript
{
  type: 'algebraic_transform',
  statement: [{ type: 'text', content: 'Factor: $$x^2 - {@:c}$$' }],
  variables: [
    { name: 'a', expression: '{#:2-9}' },
    { name: 'c', expression: '{eval:{@:a}^2}' }
  ],
  answer: '(x-{@:a})(x+{@:a})',
  transform_type: 'factor',
  grades: ['3', '2']
}
```

**Transform Types**: `simplify`, `expand`, `factor`, `solve`, `canonical`

#### 3. Fill-in-Blanks

**Example**:

```typescript
{
  type: 'fill_in_blanks',
  statement: [
    { type: 'text', content: 'If the sides are {@:a} and {@:b}, the hypotenuse is ____ using the ____ theorem.' }
  ],
  variables: [
    { name: 'a', expression: '{#:3-9}' },
    { name: 'b', expression: '{#:3-9!{@:a}}' },
    { name: 'c', expression: '{eval:sqrt({@:a}^2+{@:b}^2)}' }
  ],
  answer: ['{@:c}', 'Pythagorean'],
  blanks: [0, 1],
  grades: ['4', '3']
}
```

#### 4. Multiple Choice

**Example**:

```typescript
{
  type: 'multiple_choice',
  statement: [
    { type: 'text', content: 'Solve: $${@:a}x + {@:b} = {@:c}$$' }
  ],
  variables: [
    { name: 'a', expression: '{#:2-9}' },
    { name: 'b', expression: '{#:-20-20!0}' },
    { name: 'c', expression: '{#:-20-20!{@:b}}' },
    { name: 'solution', expression: '{eval:({@:c}-{@:b})/{@:a}}' },
    { name: 'wrong1', expression: '{eval:({@:c}+{@:b})/{@:a}}' }
  ],
  answer: '0',  // Index of correct choice
  choices: ['x = {@:solution}', 'x = {@:wrong1}', ...],
  multiple_answers: false,
  grades: ['3', '2']
}
```

### Template Metadata: Title and Description

#### Overview

Every question template now includes **title** and **description** fields to improve organization, searchability, and provide context for both teachers and students.

**Status**: ✅ Fully Implemented (Migration 078)
**Migration**: `supabase/migrations/078_add_title_description_to_templates.sql`
**Component**: `FormRichTextEditor.svelte` (rich text editor for forms)

#### Fields

**Title** (required):

- **Type**: TEXT (NOT NULL)
- **Purpose**: Short, descriptive name for the template
- **Support**: LaTeX syntax with `$$formula$$` delimiters
- **Display**: Shown in template list cards (replaces statement preview)
- **Validation**: Server-side validation ensures title is provided
- **Index**: Full-text search index (`idx_question_templates_title_search`)

**Description** (optional):

- **Type**: TEXT (NULL)
- **Purpose**: Detailed context, instructions, and documentation
- **Format**: Rich HTML from FormRichTextEditor
- **Support**: Full rich text + LaTeX formulas
- **Use Cases**:
  - **For teachers**: Internal notes, pedagogy goals, prerequisites
  - **For students**: Instructions, course reminders, tips

#### Title Examples

```
"Calcul de dérivées - Polynômes"
"Résolution d'équations du premier degré"
"Théorème de Pythagore - Application"
"Simplification de $$\frac{a}{b}$$"  // With LaTeX
```

#### Description Features (FormRichTextEditor)

The description field uses a rich text editor with comprehensive formatting:

**Text Formatting**:

- Bold, italic, underline, strikethrough
- Code inline
- Subscript/superscript (for chemical formulas, exponents)

**Structure**:

- Headings (H1, H2, H3)
- Bullet lists
- Numbered lists
- Task lists (checkboxes)
- Text alignment (left, center, right, justify)

**Visual Enhancements**:

- Text colors (8 preset colors)
- Text highlighting (6 preset colors + clear)
- Emojis (200+ organized in 8 categories)

**Math & Technical**:

- **LaTeX formulas** (inline and block)
  - Use "Formule" toolbar section
  - Templates: fractions, roots, exponents, indices
  - Full MathLive integration
- Links (with inline URL dialog)
- Code blocks (multi-line)
- Blockquotes
- Horizontal rules

**Toolbar Organization**:

- Collapsible sections: Texte, Paragraphe, Insertion, Formule
- Chevron icons indicate section state (▼ = open, ▶ = closed)
- "Plus" dropdown for additional features
- "Effacer" button to clear formatting

#### Implementation Details

**Form Component**:

```svelte
<!-- Title with LaTeX support -->
<Input id="title" type="text" bind:value={title} placeholder="Ex: Calcul de dérivées" />
<!-- Helper buttons: $$...$$, \frac{}{}, \sqrt{} -->

<!-- Description with rich text editor -->
<FormRichTextEditor bind:value={description} placeholder="Description ou contexte..." />
```

**FormRichTextEditor Features**:

- Bidirectional binding with `$bindable()`
- No "send" button (unlike chat RichTextEditor)
- Persistent content (auto-saves on change)
- Initial content loading for edit mode
- Returns HTML string (stored in database)

**Database Schema**:

```sql
ALTER TABLE question_templates
ADD COLUMN title TEXT NOT NULL;

ALTER TABLE question_templates
ADD COLUMN description TEXT;

-- Full-text search index
CREATE INDEX idx_question_templates_title_search
ON question_templates USING GIN(to_tsvector('french', title));
```

**API Validation**:

```typescript
// POST /api/questions/templates
if (!templateData.title || templateData.title.trim().length === 0) {
	return json({ success: false, errors: ['Title is required'] }, { status: 400 });
}
```

#### Migration Strategy

For existing templates without titles:

```sql
UPDATE question_templates
SET title = CASE type
  WHEN 'numerical_exact' THEN 'Question numérique (exact)'
  WHEN 'algebraic_transform' THEN 'Question algébrique'
  -- ...
END || ' - ' || theme || '/' || domain
WHERE title IS NULL;
```

#### Display in Template List

**Before**: Statement preview (150 chars truncated)

```svelte
<p class="text-sm text-muted-foreground">
	{getStatementPreview(template)}
	<!-- First text from statement -->
</p>
```

**After**: Title with fallback

```svelte
<h3 class="text-base font-semibold">
	{getDisplayTitle(template)}
	<!-- Title or fallback to statement -->
</h3>
```

#### Future Enhancements

- **LaTeX Rendering**: Use MathLive to render title LaTeX in cards
- **Description Display**: Create viewer component for rich HTML
- **Student View**: Show title/description during exercises
- **Export**: Include formatted description in worksheet exports
- **Search**: Enable full-text search on title + description

### Syntax Reference

#### Variable References: `{@:varName}`

```typescript
// Reference previously defined variables
{ name: 'a', expression: '{#:1-10}' },
{ name: 'b', expression: '{@:a} + 5' }  // b = a + 5
```

#### Random Numbers: `{#:...}`

**Integer Range**:

```typescript
{#:1-10}           // Random integer from 1 to 10
{#:{@:min}-{@:max}}  // Variable bounds
```

**Decimal by Range**:

```typescript
{#:0.5-9.99:0.01}  // Random decimal with step
{#:1.5-10.5:0.5}   // Step of 0.5
```

**Decimal by Digits**:

```typescript
{#:2.3}            // 2 digits before, 3 after decimal
{#:{@:before}.{@:after}}  // Variable digits
```

**With Exclusions**:

```typescript
{#:1-50!5}         // Exclude 5
{#:1-50!5,7-9}     // Exclude 5, 7, 8, 9
{#:1-100!{@:a},{@:b}-{@:c}}  // Exclude variables and ranges
```

#### Mathematical Evaluation: `{eval:expression}`

```typescript
{eval:2+3}         // Returns "5"
{eval:{@:a}^2}     // Square of variable a
{eval:sqrt({@:a}^2+{@:b}^2)}  // Pythagorean theorem
{eval:({@:c}-{@:b})/{@:a}}    // Complex expression
```

**Important:** All variable references (`{@:}`) and random expressions (`{#:}`) inside an `{eval:}` expression are **fully resolved BEFORE** being passed to MathLive's Compute Engine. The engine only receives a clean mathematical expression with actual numbers.

### Variable Resolution Pipeline

Variables are resolved in **declaration order** through a **three-stage pipeline**:

1. **Replace `{@:}` references** with previously resolved values
2. **Generate `{#:}` random numbers** (using resolved variables in bounds)
3. **Evaluate `{eval:}` expressions** with MathLive Compute Engine

**Implementation Details** ([variable-resolver.ts](src/lib/questions/generator/variable-resolver.ts)):

**Stage 1 - Variable References:**

```typescript
// Replace all {@:varName} with their resolved values
expression = expression.replace(/@:(\w+)/g, (match, varName) => {
	return resolvedVariables[varName] || match;
});
```

**Stage 2 - Random Numbers:**

```typescript
// Generate random numbers and replace {#:...} expressions
expression = expression.replace(/#:([^}]+)/g, (match, randomExpr) => {
	return generateRandomNumber(randomExpr, resolvedVariables).toString();
});
```

**Stage 3 - Mathematical Evaluation:**

```typescript
// Extract content inside {eval:...}, evaluate with Compute Engine, replace with result
expression = expression.replace(/eval:([^}]+)/g, (match, evalExpr) => {
	try {
		const result = evaluateExpression(evalExpr); // MathLive Compute Engine
		return typeof result === 'number' ? result.toFixed(10) : result.toString();
	} catch (error) {
		console.error(`Error evaluating expression: ${evalExpr}`, error);
		return match; // Leave unchanged on error
	}
});
```

**Complete Example:**

Given this variable definition:

```typescript
{ name: 'sum', expression: '{eval:{@:a}+{@:b}}' }
```

If `a = 5` and `b = 7`, the resolution process is:

1. **Initial expression:** `{eval:{@:a}+{@:b}}`
2. **After Stage 1** (variable replacement): `{eval:5+7}`
3. **After Stage 3** (eval processing):
   - Extract `5+7` from `{eval:5+7}`
   - Pass `"5+7"` to MathLive's `evaluateExpression()`
   - Compute Engine returns `12`
   - Replace entire `{eval:5+7}` with `"12"`
4. **Final result:** `"12"`

**Pipeline Example:**

```typescript
[
	{ name: 'min', expression: '5' }, // Stage 1: min = 5
	{ name: 'max', expression: '10' }, // Stage 1: max = 10
	{ name: 'a', expression: '{#:{@:min}-{@:max}}' }, // Stage 2: a = random(5, 10)
	{ name: 'b', expression: '{#:1-20!{@:a}}' }, // Stage 2: b = random(1, 20) excluding a
	{ name: 'sum', expression: '{eval:{@:a}+{@:b}}' } // Stage 3: sum = a + b (evaluated)
];
```

### Validation

**Client-Side** (in admin form):

- Statement must have at least one non-empty text field
- At least one grade level selected
- Answer must not be empty
- Variable names must be alphanumeric + underscore
- No duplicate variable names

**Server-Side** (API + Generator):

- Template structure validation
- Circular dependency detection (DFS algorithm)
- min < max validation (after variable resolution)
- Type-specific field validation
- Exclusion list validation

**Circular Dependency Detection**:

```typescript
// ❌ ERROR: Circular reference
[
	{ name: 'a', expression: '{@:b}' },
	{ name: 'b', expression: '{@:a}' }
][
	// Error: "Circular reference detected: a -> b -> a"

	// ✅ OK: Sequential dependency
	({ name: 'a', expression: '{#:1-10}' },
	{ name: 'b', expression: '{@:a} + 5' },
	{ name: 'c', expression: '{@:b} * 2' })
];
```

### Admin Workflow

#### Question Templates: Drafts vs Published

Templates have two statuses:

- **Draft (Brouillon)** 🟠:
  - Work-in-progress templates
  - No validation enforced (can be incomplete)
  - Can have duplicate categories
  - Always visible in "Brouillons" tab
  - Not affected by filters

- **Published (Publié)** 🟢:
  - Complete, validated templates
  - Full validation enforced (required fields, circular dependencies)
  - Must have unique category (theme + domain + subdomain + level)
  - Visible in "Publiés" tab with filters
  - Used for generating question instances

#### Creating a Question

1. Navigate to `/dashboard/admin/questions`
2. Click "Créer une question"
3. **Status badge** appears at top (default: Brouillon 🟠)
4. Fill in form tabs:
   - **Type & Grades**: Select question type and target levels
   - **Categorization**: Theme, domain, subdomain, difficulty level
     - ⚠️ Real-time duplicate detection for published templates
     - If duplicate detected: Warning shows suggested level
   - **Statement**: Add text/image fields with LaTeX/variables
   - **Variables**: Define variables with syntax helpers
   - **Answer**: Configure answer (type-specific editor)
   - **Preview**: See generated instances with different seeds
   - **JSON**: Debug raw template structure
5. **Two save options**:
   - **"Enregistrer brouillon"** 🟠: Save as draft (no validation, always enabled)
   - **"Publier"** 🟢: Publish template (full validation required)
     - If category duplicate detected: Confirmation dialog appears
     - Auto-adjusts level to max+1 on confirmation

#### Editing a Question

**Draft Template**:

1. Click Edit button (pencil icon) from "Brouillons" tab
2. Form pre-populated with existing data
3. Make changes in any tab
4. Status: Brouillon (can stay draft or publish)
5. Two save options: "Enregistrer brouillon" or "Publier"

**Published Template**:

1. Click Edit button (pencil icon) from "Publiés" tab
2. Form pre-populated with existing data
3. Make changes in any tab (validation maintained)
4. Status: Publié (cannot change to existing category)
5. Save: Full validation + category uniqueness check

#### Admin Interface Tabs

**Brouillons Tab**:

- Lists all draft templates
- Sorted by modification date (newest first)
- Badge: Orange "Brouillon"
- No filters applied
- Always visible

**Publiés Tab**:

- Lists published templates only
- Filterable by: type, grades, theme, domain, subdomain, level range (collapsible filter section)
- Sortable by: type, creation date
- Badge colors: Type (secondary), Theme/Domain (neutral outline)
- Paginated (50 per page)

#### Duplicating a Question

1. Click Duplicate button (copy icon)
2. Creates copy with new ID (status: draft)
3. Edit duplicate as needed
4. Publish when ready

#### Category Cache System

To prevent duplicate API calls, a client-side cache tracks existing categories:

- **Store**: `questionCategories.svelte.ts`
- **API**: `GET /api/questions/categories/all`
- **Cache Duration**: 5 minutes
- **Auto-invalidation**: After create/update/delete operations
- **Usage**: Real-time duplicate detection in forms

### In-App Help System

The Question Bank Admin Interface includes a comprehensive **in-app help system** that provides context-sensitive guidance throughout the question creation/editing process.

#### Overview

**Status**: ✅ Fully Implemented
**Icon**: CircleQuestionMark (lucide-svelte)
**Implementation**: Modal dialogs with detailed documentation and examples

The help system provides guidance for:

- Title and Description (new)
- Exercise Instruction
- Categorization
- Question Variations
- Statement
- Variables
- Answer
- Correction

#### Features

**Help Icons**:

- CircleQuestionMark icon appears next to major section titles
- Consistent styling with muted foreground color
- Hover effect transitions to foreground color
- Accessible with aria-label attributes

**Modal Dialogs**:

- Max width: 2xl or 3xl depending on content complexity
- Max height: 85vh with vertical scrolling
- Responsive design for different screen sizes
- Structured content with headings, examples, and best practices

**Syntax Helper Buttons**:

- Quick-insert buttons for common syntax patterns
- Automatic cursor positioning after insertion
- Available in all text editing contexts (Statement, Variables, Answer, Correction)

#### Help Content

**Title and Description Help** (NEW):

- Purpose of title field (required, LaTeX support)
- Examples of good titles for different question types
- Purpose of description field (optional, rich text editor)
- Use cases for teachers (internal notes, pedagogy) vs students (instructions, reminders)
- Rich text editor features overview
- LaTeX support in both fields with syntax examples

**Exercise Instruction Help**:

- Purpose and use cases (optional shared instruction)
- Examples of individual questions vs worksheet titles
- Best practices for verb usage (Calculer, Résoudre, etc.)

**Categorization Help**:

- Explanation of theme, domain, subdomain, and difficulty level
- Visual examples with colored badges
- Relationship between categories and grades
- Tips for consistent categorization

**Variations Help**:

- What variations are and when to use them
- How variation selection works (seed-based)
- Per-variation vs shared fields
- Adding/removing variations
- Multi-variation examples

**Statement Help**:

- Purpose and content guidelines
- Text vs image fields
- LaTeX syntax examples
- Variable and evaluation syntax
- Best practices for clarity

**Variables Help**:

- Complete syntax reference with examples
- Variable references: `{@:varName}`
- Random numbers: `{#:1-10}`, `{#:1.5-9.99:0.01}`, `{#:2.3}`
- Exclusions: `{#:1-50!5}`, `{#:1-50!5,7-9}`, `{#:1-100!{@:a},{@:b}-{@:c}}`
- Evaluation: `{eval:expression}`
- Dependency order and circular reference warnings
- Interactive examples

**Answer Help**:

- Type-specific answer configuration
- Numerical: precision types (exact, decimal, rounded)
- Algebraic: transform types and equivalence checking
- Fill-in-blanks: multiple answers with blank positioning
- Multiple choice: single vs multiple correct answers
- Answer validation process

**Correction Help**:

- Purpose of correction field (optional)
- Step-by-step explanations
- Using variables in corrections
- LaTeX for mathematical notation
- Examples of good vs unclear corrections

#### Implementation Details

**QuestionTemplateForm.svelte** (Modified):

```typescript
// Modal states (lines 88-95)
let variableHelpOpen = $state(false);
let exerciseInstructionHelpOpen = $state(false);
let categorizationHelpOpen = $state(false);
let variationsHelpOpen = $state(false);
let statementHelpOpen = $state(false);
let answerHelpOpen = $state(false);
let correctionHelpOpen = $state(false);

// Help icon button pattern
<button
  type="button"
  onclick={() => (helpDialogOpen = true)}
  class="text-muted-foreground transition-colors hover:text-foreground"
  aria-label="Aide sur..."
>
  <CircleQuestionMark class="h-5 w-5" />
</button>
```

**VariableEditor.svelte** (Modified):

- Bindable `helpDialogOpen` prop for parent control
- Comprehensive variable syntax documentation modal
- Examples for all syntax types with proper HTML entity escaping

**ContentFieldEditor.svelte** (Modified):

```typescript
// Syntax insertion function (lines 79-96)
function insertSyntax(index: number, syntax: string) {
	const textarea = document.getElementById(`field-content-${index}`) as HTMLTextAreaElement;
	if (!textarea || !fields) return;
	const start = textarea.selectionStart || 0;
	const end = textarea.selectionEnd || 0;
	const content = fields[index].content;
	fields[index].content = content.substring(0, start) + syntax + content.substring(end);
	setTimeout(() => {
		textarea.focus();
		textarea.setSelectionRange(start + syntax.length, start + syntax.length);
	}, 0);
}
```

**Syntax Helper Buttons** (7 buttons in ContentFieldEditor):

- Variable: `{@:}`
- Aléatoire: `{#:1-10}`
- Évaluation: `{eval:}`
- LaTeX $$: `$$$$`
- Fraction: `\frac{}{}`
- Exposant: `^{}`
- Indice: `_{}`

**AnswerEditor.svelte** (Modified):

- Generic `insertSyntax` function with callback parameter
- Type-specific helper buttons:
  - **Numerical answers**: 3 buttons (Variable, Aléatoire, Évaluation)
  - **Algebraic answers**: 5 buttons (Variable, Évaluation, Fraction, Exposant, Indice)
  - **Fill-in-blanks**: 2 compact buttons per blank (Variable, Éval)
  - **Multiple choice**: 3 compact buttons per choice (Variable, Éval, Frac)

#### User Experience Benefits

**Discoverability**:

- Clear visual indicators (question mark icons) for help availability
- Icons placed consistently next to section titles
- No need to leave the form to access documentation

**Contextual Guidance**:

- Help content tailored to specific sections
- Examples directly relevant to the field being edited
- Best practices provided in context

**Productivity**:

- Quick syntax insertion with helper buttons
- Automatic cursor positioning reduces manual editing
- Comprehensive examples reduce trial-and-error

**Learning Curve**:

- New users can learn syntax without external documentation
- Examples demonstrate real-world usage patterns
- Best practices help avoid common mistakes

#### Best Practices

**DO**:

- Click help icons to learn about unfamiliar sections
- Use syntax helper buttons to avoid typos
- Read examples in help modals before creating complex templates
- Refer to help when encountering validation errors

**DON'T**:

- Manually type complex syntax when helper buttons exist
- Skip help content for sections you're unfamiliar with
- Guess syntax patterns (use examples from help instead)

#### Technical Notes

**HTML Entity Escaping**:

- All syntax examples with `{` and `}` use HTML entities (`&#123;`, `&#125;`)
- Prevents Svelte from parsing example code as actual Svelte syntax
- Ensures examples render correctly in documentation

**Dialog Component**:

- Uses shadcn-svelte Dialog components (bits-ui)
- Accessible with proper ARIA attributes
- Keyboard navigation support (ESC to close)
- Click outside to close

**Cursor Positioning**:

- `setTimeout()` ensures DOM update before cursor manipulation
- `setSelectionRange()` positions cursor after inserted text
- Works with both `<textarea>` and `<input>` elements

#### Files Modified

**Components**:

- `src/lib/components/QuestionTemplateForm.svelte` - 7 help modals added (lines 686-1246)
- `src/lib/components/VariableEditor.svelte` - Help modal integration
- `src/lib/components/ContentFieldEditor.svelte` - 7 syntax helper buttons
- `src/lib/components/AnswerEditor.svelte` - Type-specific syntax helpers

**Icons**:

- `lucide-svelte` - CircleQuestionMark icon used throughout

**Total Lines Added**: ~600 lines of help content and UI controls

### Example Templates

See `supabase/migrations/071_seed_question_templates.sql` for 10 complete examples demonstrating:

- Simple fraction addition (numerical exact)
- Decimal operations (numerical decimal)
- Area calculations (numerical rounded)
- Algebraic factorization (algebraic transform)
- Pythagorean theorem (fill-in-blanks)
- Equation solving (multiple choice)
- Quadratic formula with discriminant
- Percentage calculations
- Fraction simplification with GCD
- Multiple correct answers (QCM)

### Integration with MathLive

The Question Bank System uses **MathLive's Compute Engine** for:

- Evaluating `{eval:}` expressions
- Simplifying algebraic expressions
- Checking equivalence for algebraic transforms
- Numerical calculations with proper precision

**Wrapper Functions** ([compute-engine/wrapper.ts](src/lib/questions/compute-engine/wrapper.ts)):

**`evaluateExpression(latex: string): number | string`**

Evaluates a LaTeX mathematical expression after all variables and random values have been resolved.

```typescript
export function evaluateExpression(latex: string): number | string {
	try {
		const expr = ce.parse(latex);
		const result = expr.evaluate();

		if (result.isValid && result.numericValue !== null) {
			return result.numericValue;
		}

		return result.latex;
	} catch (error) {
		throw new Error(`Failed to evaluate expression: ${latex}`);
	}
}
```

**Usage in Variable Resolution:**

```typescript
// Input from variable expression: '{eval:{@:a}+{@:b}}'
// After Stage 1 (variable replacement): '{eval:5+7}'
// Extract '5+7', pass to evaluateExpression('5+7')
// Compute Engine returns: 12
// Final result: '12'
```

**`areEquivalent(latex1: string, latex2: string): boolean`**

Checks if two LaTeX expressions are algebraically equivalent (used for validating algebraic transform answers).

**`simplifyExpression(latex: string): string`**

Simplifies a LaTeX expression to its canonical form.

### Performance Considerations

**Random Generation**:

- Seeded random for reproducibility
- Exclusion list limited to 10,000 attempts
- Float precision: `toFixed(10)` to avoid errors

**Database**:

- JSONB fields for flexible template storage
- GIN index on `grades` array for fast filtering
- Pagination (default 50, max 100 per page)

**Frontend**:

- Preview auto-updates on template change
- Lazy-load components in tabs
- Client-side search for quick filtering

### Testing

**Unit Tests** (pending):

- Parser tests (tokenizer, random, variable, eval)
- Generator tests (random, variables, content, choices, instance)
- Validator tests (template, circular dependency)

**API Tests** (pending):

- Template CRUD operations
- Instance generation
- Validation error handling

**E2E Tests** (pending):

- Create question workflow
- Edit question workflow
- Generate and preview instances

### Troubleshooting

**Common Issues**:

1. **"Circular reference detected"**
   - **Cause**: Variable references itself directly or indirectly
   - **Fix**: Review variable dependency chain, ensure sequential resolution

2. **"Invalid range: min must be less than max"**
   - **Cause**: After variable resolution, min >= max
   - **Fix**: Check variable values, adjust expressions or exclusions

3. **"Variable not found or not yet resolved"**
   - **Cause**: Referencing variable that comes later in declaration order
   - **Fix**: Reorder variables (dependency must come before reference)

4. **Preview shows errors but form looks correct**
   - **Cause**: Syntax error in expression (e.g., unclosed braces)
   - **Fix**: Check for matching `{` and `}` in all expressions

5. **Generated instances are always the same**
   - **Cause**: Using same seed
   - **Fix**: Click "Régénérer" button to generate with new random seed

### Best Practices

**DO**:

- Define variables in dependency order (dependencies first)
- Use descriptive variable names (`radius`, `coefficient`, etc.)
- Add corrections to help students understand solutions
- Test templates with Preview before saving
- Use exclusions to avoid degenerate cases (e.g., division by zero)

**DON'T**:

- Create circular dependencies
- Use forward references (referencing variables defined later)
- Hardcode values that should be random
- Skip validation warnings
- Make exclusion lists too restrictive (may fail to generate)

### Question Categorization System

The Question Bank includes a comprehensive categorization system independent from grade levels, allowing fine-grained organization and filtering of questions.

#### Overview

**Database Fields**:

- `theme` (TEXT, required) - Broad subject area (e.g., "Algèbre", "Géométrie")
- `domain` (TEXT, required) - Specific topic within theme (e.g., "Équations", "Triangles")
- `subdomain` (TEXT, nullable) - Optional sub-topic (e.g., "Linéaires", "Quadratiques")
- `level` (INTEGER, required) - Difficulty level as positive integer (1=easy, higher=harder, no max)

**Migrations**:

- `072_add_question_categories.sql` - Adds category columns with indexes
- `073_update_seed_question_categories.sql` - Updates existing questions with placeholder values

#### Key Features

**Independent from Grades**:

- Categories are completely separate from the `grades` field
- A question can be "Algèbre/Équations/Linéaires/Level 2" and applicable to grades ["6", "5", "4"]
- Grades = _who_ should see it; Categories = _what_ it teaches and _how hard_ it is

**Hybrid Category Management**:

- Categories start empty (admins add as needed)
- "Add new" option in form dropdowns creates categories on-the-fly
- Categories extracted dynamically from existing questions for filter dropdowns
- No separate category management UI needed

**Filtering System**:

- Filter by theme, domain, subdomain (exact match)
- Filter by level range (min/max)
- Filters work alongside type, grades, and search
- All filters stored in URL params (shareable, bookmarkable)

#### Admin Interface

**Category Selector Component** ([src/lib/components/CategorySelector.svelte](src/lib/components/CategorySelector.svelte)):

- Native `<select>` with Shadcn styling
- "➕ Ajouter..." option opens modal dialog
- Modal validates against duplicates
- Keyboard support (Enter to submit)
- Used for theme, domain, and subdomain fields

**Question Form** ([src/lib/components/QuestionTemplateForm.svelte](src/lib/components/QuestionTemplateForm.svelte:205-270)):

```svelte
<!-- Categorization Card -->
<Card.Root>
	<Card.Header>
		<Card.Title>Catégorisation</Card.Title>
	</Card.Header>
	<Card.Content>
		<CategorySelector
			label="Thème"
			bind:value={theme}
			options={themeOptions}
			required={true}
			onValueChange={(val) => (theme = val)}
			onAddNew={handleAddTheme}
		/>

		<CategorySelector label="Domaine" ... />
		<CategorySelector label="Sous-domaine (optionnel)" ... />

		<Input type="number" min="1" bind:value={level} placeholder="1, 2, 3..." />
	</Card.Content>
</Card.Root>
```

**Questions List Page** ([src/routes/(protected)/dashboard/admin/questions/+page.svelte]):

- **Collapsible Filters Section** (open by default):
  - Filter row with 4 category dropdowns
  - Theme, Domain, Subdomain filters (populated from existing questions)
  - Level range filter (min/max number inputs)
- **Table View**:
  - Columns: Type (with badges), Titre, Niveaux, Créé le, Actions
  - Type column displays: Type badge + Theme badge + Domain badge (all in same column)
  - Theme/Domain badges use neutral outline variant
  - No separate Catégories column
- **Card View**: Categories displayed with dedicated labels

#### API Integration

**Server-Side Filtering** ([+page.server.ts](<src/routes/(protected)/dashboard/admin/questions/+page.server.ts:50-142>)):

```typescript
// Parse category filters from URL params
const themeFilter = url.searchParams.get('theme');
const domainFilter = url.searchParams.get('domain');
const subdomainFilter = url.searchParams.get('subdomain');
const minLevelFilter = url.searchParams.get('minLevel');
const maxLevelFilter = url.searchParams.get('maxLevel');

// Apply filters
if (themeFilter) query = query.eq('theme', themeFilter);
if (domainFilter) query = query.eq('domain', domainFilter);
if (subdomainFilter) query = query.eq('subdomain', subdomainFilter);
if (minLevel) query = query.gte('level', minLevel);
if (maxLevel) query = query.lte('level', maxLevel);

// Extract unique categories for dropdowns
const { data: allTemplates } = await supabase
	.from('question_templates')
	.select('theme, domain, subdomain');

const themes = new Set<string>();
// ... populate sets from templates
return { templates, categories: { themes, domains, subdomains } };
```

**API Endpoints** ([src/routes/api/questions/templates/](src/routes/api/questions/templates/)):

POST `/api/questions/templates` - Create template:

```typescript
.insert({
  type: templateData.type,
  statement: templateData.statement,
  // ... other fields
  theme: templateData.theme,
  domain: templateData.domain,
  subdomain: templateData.subdomain || null,
  level: templateData.level,
  created_by: user.id
})
```

PUT `/api/questions/templates/[id]` - Update template:

```typescript
.update({
  // ... all fields including:
  theme: templateData.theme,
  domain: templateData.domain,
  subdomain: templateData.subdomain || null,
  level: templateData.level
})
```

#### Validation

**Required Fields** ([src/lib/questions/validators/template-validator.ts](src/lib/questions/validators/template-validator.ts:44-56)):

```typescript
if (!template.theme || template.theme.trim() === '') {
	errors.push('Missing required field: theme');
}

if (!template.domain || template.domain.trim() === '') {
	errors.push('Missing required field: domain');
}

if (!template.level || template.level <= 0) {
	errors.push('level must be a positive integer');
}

// subdomain is optional (no validation)
```

#### Display

**Card View** ([QuestionTemplateCard.svelte](src/lib/components/QuestionTemplateCard.svelte:108-128)):

```svelte
<div class="space-y-1">
	<div><span class="font-medium">Thème:</span> {template.theme}</div>
	<div><span class="font-medium">Domaine:</span> {template.domain}</div>
	{#if template.subdomain}
		<div><span class="font-medium">Sous-domaine:</span> {template.subdomain}</div>
	{/if}
	<div>
		<span class="font-medium">Niveau:</span>
		<Badge variant="secondary">{template.level}</Badge>
	</div>
</div>
```

**Table View** (Questions list page):

```svelte
<!-- Type column with badges -->
<td class="px-4 py-3">
	<div class="flex flex-col gap-1">
		<Badge class="bg-secondary text-secondary-foreground">
			{getTypeLabel(template.type)}
		</Badge>
		<Badge variant="outline" class="text-xs">{template.theme}</Badge>
		<Badge variant="outline" class="text-xs">{template.domain}</Badge>
	</div>
</td>
```

#### Best Practices

**DO**:

- Use descriptive category names (e.g., "Algèbre" not "A", "Équations linéaires" not "EL")
- Add categories during question creation (easier than bulk editing later)
- Use subdomain for fine-grained organization (optional but helpful)
- Use consistent level scaling (e.g., 1-3 for basics, 4-6 for intermediate, 7-10 for advanced)
- Filter by categories when searching for specific question types

**DON'T**:

- Create duplicate categories with different capitalization
- Use categories as a replacement for grades (they're complementary)
- Leave theme/domain empty (required fields, form validation prevents this)
- Use negative or zero levels (validation prevents this)

#### Migration Notes

**Existing Questions**:

- All questions created before categorization have default values:
  - `theme: "Non catégorisé"`
  - `domain: "Non catégorisé"`
  - `subdomain: NULL`
  - `level: 1`
- Admins should manually categorize these questions for better organization

**Performance**:

- Indexed columns for fast filtering
- Category extraction query is separate from main template query
- Dropdown options cached client-side during page session

### Question Variations System

The Question Variations System allows question templates to have **multiple variations**, providing diverse problem sets from a single template. When generating a question instance, one variation is selected either randomly or deterministically based on a seed value.

#### Overview

**Status**: ✅ **Fully Implemented** (Backend 100%, Frontend 100%)
**Migrations**:

- `074_add_template_variations.sql` - Adds `variations` JSONB column, migrates existing data
- `075_enhance_seed_with_variations.sql` - Adds multi-variation examples to seed data

**Key Features**:

- Templates can have 1 to unlimited variations
- Each variation has its own statement, variables, answer, correction, blanks, and choices
- Shared fields remain at template level (type, grades, theme, domain, precision, etc.)
- Deterministic variation selection using seed: `Math.abs(seed) % variations.length`
- Backward compatible: Migration 074 automatically wraps old single-field structure into variations array

#### Data Structure

**Before Variations** (Old Structure):

```typescript
{
  id: 'template-1',
  type: 'numerical_exact',
  statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
  variables: [
    { name: 'a', expression: '{#:1-10}' },
    { name: 'b', expression: '{#:1-10}' }
  ],
  answer: '{eval:{@:a}+{@:b}}',
  grades: ['6'],
  theme: 'Arithmétique',
  // ...
}
```

**After Variations** (New Structure):

```typescript
{
  id: 'template-1',
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate {@:a} + {@:b}' }],
      variables: [
        { name: 'a', expression: '{#:1-10}' },
        { name: 'b', expression: '{#:1-10}' }
      ],
      answer: '{eval:{@:a}+{@:b}}',
      correction: [{ type: 'text', content: 'Add the numbers...' }]
    },
    {
      statement: [{ type: 'text', content: 'Calculate {@:a} - {@:b}' }],
      variables: [
        { name: 'a', expression: '{#:10-20}' },
        { name: 'b', expression: '{#:1-{@:a}}' }
      ],
      answer: '{eval:{@:a}-{@:b}}',
      correction: [{ type: 'text', content: 'Subtract the numbers...' }]
    }
  ],
  grades: ['6'],
  theme: 'Arithmétique',
  // ... shared fields
}
```

#### Per-Variation Fields

These fields are **inside each variation**:

- `statement: ContentField[]` - Question text/images
- `variables: QuestionVariable[]` - Variable definitions
- `answer: string | string[]` - Expected answer(s)
- `correction?: ContentField[]` - Optional correction steps
- `blanks?: { position: number; expectedAnswer: string }[]` - For fill-in-blanks
- `choices?: { content: ContentField; isCorrect: boolean }[]` - For multiple choice

#### Shared Template Fields

These fields remain **at the template level** (same for all variations):

- `type: QuestionType` - Question type
- `exerciseInstruction?: string` - Optional shared instruction for all variations (see below)
- `grades: Grade[]` - Target grade levels
- `theme: string` - Categorization theme
- `domain: string` - Categorization domain
- `subdomain?: string` - Optional sub-domain
- `level: number` - Difficulty level
- `precision?: PrecisionType` - Numerical precision (numerical questions)
- `transformType?: AlgebraicTransformType` - Transform type (algebraic questions)
- `multipleAnswers?: boolean` - Allow multiple correct answers (QCM)
- `delay?: number` - Time limit in seconds

#### Exercise Instruction (Optional)

The `exerciseInstruction` field is an **optional shared instruction** that applies to all variations of a template. It serves two purposes depending on the context:

**In normal display** (flashcards, preview, individual questions):

- The instruction appears **before** the statement
- Example: "**Calculer** $$3 + 5$$"

**In worksheet generation** (future feature):

- The instruction becomes the **exercise title** (not repeated in each question)
- Example:
  ```
  Exercice 1 : Calculer
    1. 3 + 5
    2. 12 - 7
    3. 8 × 4
  ```

**Use Cases**:

- Avoid repeating common verbs like "Calculer", "Résoudre", "Factoriser"
- Provide context for the entire exercise without cluttering individual questions
- Maintain flexibility for different display contexts

**Example Template**:

```typescript
{
  type: 'numerical_exact',
  exerciseInstruction: "Calculer",  // ← Shared instruction
  variations: [
    {
      statement: [{ type: 'text', content: '$$3 + 5$$' }],
      answer: '8'
    },
    {
      statement: [{ type: 'text', content: '$$12 - 7$$' }],
      answer: '5'
    }
  ],
  grades: ['CP', 'CE1'],
  theme: 'Arithmétique',
  domain: 'Opérations',
  level: 1
}
```

#### Variation Selection Algorithm

**Deterministic Selection (with seed)**:

```typescript
const selectedIndex = Math.abs(seed) % template.variations.length;
const variation = template.variations[selectedIndex];
```

**Random Selection (without seed)**:

```typescript
const randomSeed = Math.floor(Math.random() * 1000000);
const selectedIndex = randomSeed % template.variations.length;
```

**Example**:

- Template with 3 variations
- Seed 0 → Variation 1 (index 0)
- Seed 1 → Variation 2 (index 1)
- Seed 2 → Variation 3 (index 2)
- Seed 3 → Variation 1 (index 0)
- Seed 100 → Variation 2 (100 % 3 = 1)

#### Admin Interface

**Creating/Editing Variations**:

The QuestionTemplateForm component provides full variation management:

1. **Variation Tabs** - Each variation has its own tab with all editors
2. **Add Variation** - "+" button to add new variations
3. **Delete Variation** - Delete button on each tab (disabled if only 1 variation)
4. **Per-Variation Editors**:
   - Statement editor (text/images)
   - Variables editor (with syntax helpers)
   - Answer editor (type-specific)
   - Correction editor (optional)

**Preview with Variation Selection**:

The QuestionPreview component allows testing specific variations:

- **Variation Selector** - Dropdown to choose which variation to preview
- **Smart Seed Calculation** - Automatically adjusts seed to force selected variation
- **Visual Feedback** - Badge showing which variation was selected

```svelte
<!-- Variation selector in preview -->
<select bind:value={selectedVariationIndex}>
	<option value="random">Aléatoire (selon la graine)</option>
	<option value="0">Variation 1</option>
	<option value="1">Variation 2</option>
	<!-- ... -->
</select>
```

#### Validation

**Template Validation**:

- At least 1 variation required (enforced by DB and validator)
- Each variation validated independently
- Error messages include variation index (e.g., "Variation 2: Missing answer")

**Circular Dependency Check**:

- Performed per-variation (variables scoped to their variation)
- Error format: `"Variation 3: Circular reference detected: a -> b -> a"`

#### API Usage

**Generate Instance**:

```typescript
// Generate with specific seed (deterministic)
POST /api/questions/generate/[templateId]
Body: { seed: 42 }
Response: {
  success: true,
  instance: {
    selectedVariationIndex: 0,  // Which variation was used
    statement: [...],
    answer: "...",
    // ...
  }
}

// Generate without seed (random)
POST /api/questions/generate/[templateId]
Body: {}
Response: {
  success: true,
  instance: {
    selectedVariationIndex: 2,  // Random selection
    // ...
  }
}
```

#### Database Migration

**Migration 074** (`add_template_variations.sql`):

- Adds `variations` JSONB column
- **Automatically migrates existing data** (wraps old fields into single-variation array)
- Drops old per-variation columns
- Status: ✅ Applied

**Migration 075** (`enhance_seed_with_variations.sql`):

- Updates 8 existing seed templates with proper categorization
- Adds 2nd variations to 2 templates (Fraction Addition/Subtraction, Factorization)
- Adds 2 new multi-variation templates (Simple Operations with 4 variations, Quadratic Equations with 3 variations)
- Total: 10 templates, 15 variations
- Status: ✅ Applied

#### Multi-Variation Example

**Simple Operations Template** (4 variations):

```typescript
{
  type: 'numerical_exact',
  variations: [
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} + {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:10-50}' },
        { name: 'b', expression: '{#:10-50}' }
      ],
      answer: '{eval:{@:a}+{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} - {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:20-99}' },
        { name: 'b', expression: '{#:10-{@:a}}' }
      ],
      answer: '{eval:{@:a}-{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:a} \\times {@:b}$$' }],
      variables: [
        { name: 'a', expression: '{#:2-12}' },
        { name: 'b', expression: '{#:2-12}' }
      ],
      answer: '{eval:{@:a}*{@:b}}'
    },
    {
      statement: [{ type: 'text', content: 'Calculate: $${@:dividend} \\div {@:divisor}$$' }],
      variables: [
        { name: 'divisor', expression: '{#:2-9}' },
        { name: 'quotient', expression: '{#:2-12}' },
        { name: 'dividend', expression: '{eval:{@:divisor}*{@:quotient}}' }
      ],
      answer: '{@:quotient}'
    }
  ],
  precision: { type: 'none' },
  grades: ['CM1', 'CM2', '6'],
  theme: 'Arithmétique',
  domain: 'Opérations',
  level: 1
}
```

#### Best Practices

**DO**:

- Create multiple variations when you want diverse problem types from one template
- Use variations for related concepts (addition/subtraction, different geometric shapes, etc.)
- Test each variation in preview before saving
- Add corrections to help students understand each variation
- Use descriptive variation tab labels (automatically "Variation 1", "Variation 2", etc.)

**DON'T**:

- Create variations with completely unrelated concepts (make separate templates instead)
- Leave a template with 0 variations (minimum 1 required)
- Forget to test variation selection with different seeds
- Mix per-variation fields (statement, variables) at template level

#### Implementation Files

**Backend (Complete)**:

- `src/lib/questions/types.ts` - QuestionVariation interface
- `src/lib/questions/validators/template-validator.ts` - Variation validation
- `src/lib/questions/generator/instance-generator.ts` - Variation selection logic
- `src/routes/api/questions/templates/+server.ts` - API endpoints
- `supabase/migrations/074_add_template_variations.sql` - Schema + migration
- `supabase/migrations/075_enhance_seed_with_variations.sql` - Seed examples

**Frontend (Complete)**:

- `src/lib/components/QuestionTemplateForm.svelte` - Variation management UI
- `src/lib/components/AnswerEditor.svelte` - Per-variation answer editing
- `src/lib/components/QuestionPreview.svelte` - Variation selector + preview
- `src/lib/components/VariableEditor.svelte` - Per-variation variables

**Documentation**:

- `QUESTION_VARIATIONS_HANDOFF.md` - Implementation handoff document
- `QUESTION_VARIATIONS_STATUS.md` - Current status (98% complete)
- `QUESTION_VARIATIONS_TEST_UPDATE_GUIDE.md` - Guide for updating tests

#### Testing Status

**Backend**: ✅ Fully validated (migrations applied, API tested)
**Frontend**: ✅ Fully implemented (form, preview, all editors working)
**Unit Tests**: ⏳ Pending update (guide created in `QUESTION_VARIATIONS_TEST_UPDATE_GUIDE.md`)

The existing test files (`template-validator.test.ts`, `instance-generator.test.ts`) need to be updated from the old single-field structure to the new variations array structure. A comprehensive guide has been created with examples and estimated 4-6 hours for complete test coverage update.

### Future Enhancements

Potential improvements for the Question Bank System:

- **Student Interface**: Display and answer questions (not just admin creation)
- **Flashcard Mode**: Spaced repetition algorithm
- **Statistics**: Track question difficulty, answer rates
- **Image Upload**: Supabase Storage integration for diagrams
- **LaTeX Rendering**: MathLive rendering in preview (currently raw LaTeX)
- **Export/Import**: JSON export for sharing templates
- **Bulk Operations**: Multi-select delete, duplicate
- **Question Sets**: Group related questions into assignments
- **Auto-grading**: Automatic evaluation of student responses

### Documentation Files

- **[QUESTIONS_IMPLEMENTATION_STATUS.md](QUESTIONS_IMPLEMENTATION_STATUS.md)** - Implementation progress and file inventory
- **[QUESTIONS_ADMIN_INTERFACE.md](QUESTIONS_ADMIN_INTERFACE.md)** - Admin interface documentation
- **[QUESTIONS_SYNTAX_GUIDE.md](QUESTIONS_SYNTAX_GUIDE.md)** - Complete syntax reference
- **[src/lib/questions/README.md](src/lib/questions/README.md)** - Developer documentation

---

**Remember:** Svelte 5 and SvelteKit 2 are designed to be simpler and more intuitive. When in doubt, prefer explicit, straightforward code over clever tricks.
