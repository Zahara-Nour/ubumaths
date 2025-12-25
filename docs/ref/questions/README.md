# Questions System - Technical Reference

> Complete technical documentation for the UbuMaths Questions System.

## Overview

The Questions System is a template-based question bank for mathematical questions with support for:

- **Parameterized variables** with random generation
- **Multiple question types** (numerical, algebraic, QCM, fill-in-blanks)
- **Multi-variation templates** for question diversity
- **Interactive flashcard display** with answer validation
- **Integration with SRS** (Spaced Repetition System) and Automaths

### Questions vs Exercises

| Aspect      | Questions                          | Exercises                                 |
| ----------- | ---------------------------------- | ----------------------------------------- |
| **Purpose** | Single-answer quick practice       | Multi-step problem solving                |
| **Content** | `statement` + `solution` (strings) | `statement_md` + `solution_md` (markdown) |
| **Answer**  | Validated automatically            | Self-checked (no validation)              |
| **Display** | FlashCard component                | Exercise viewer with hints                |
| **Hints**   | Not supported                      | `{{hint:id}}` references                  |
| **Export**  | Not supported                      | PDF/Typst export                          |

---

## Architecture

```
src/lib/questions/
├── types.ts                    # Core type definitions
├── index.ts                    # Public API exports
├── category-validation.ts      # Category uniqueness checking
├── colors.ts                   # Color definitions for styling
├── constraint-validators.ts    # Answer form validation
├── validation-rule-evaluator.ts # Dynamic validation rules
├── feedback.ts                 # Feedback message generation
├── correction-placeholders.ts  # Correction content helpers
│
├── generator/
│   ├── instance-generator.ts   # Main generation orchestrator
│   ├── variable-resolver.ts    # Variable resolution
│   ├── random-generator.ts     # Random number generation
│   ├── content-resolver.ts     # Markdown content resolution
│   └── choice-shuffler.ts      # QCM choice shuffling
│
├── validators/
│   └── template-validator.ts   # Template structure validation
│
└── units/                      # Physical unit parsing
    └── ...
```

---

## Core Concepts

### 1. Question Template (Stored in Database)

Templates are the stored definition of a question, containing:

```typescript
interface QuestionTemplate {
	id: string; // UUID
	type: QuestionType; // Question type
	title: string; // Display title
	description?: string; // Internal documentation

	// Variations (at least 1 required)
	variations: QuestionVariation[];
	shared?: SharedVariationDefaults; // Shared defaults for all variations

	// Metadata
	grades: GradeLevel[]; // Applicable grade levels
	theme: string; // e.g., "Algebre"
	domain: string; // e.g., "Equations"
	subdomain?: string; // e.g., "Lineaires"
	level: number; // Difficulty (1 = easy)
	status: 'draft' | 'published';

	// Options
	precision?: PrecisionType; // For numerical answers
	options?: ValidationOptions; // Validation configuration
	delay?: number; // Time limit in seconds

	// Type-specific
	transformType?: AlgebraicTransformType;
	multipleAnswers?: boolean;
}
```

### 2. Question Variation

Each template can have multiple variations, one selected randomly during generation:

```typescript
interface QuestionVariation {
	statement: TemplateMarkdown; // Question text with placeholders
	variables?: QuestionVariable[]; // Variable definitions
	solution: string | string[]; // Expected answer(s)
	correction?: QuestionCorrection; // Explanation

	// Type-specific
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: TemplateMarkdown; isCorrect?: boolean }[];
	validationRules?: ValidationRule[]; // Dynamic validation
}
```

### 3. Question Instance (Generated)

Instances are generated on-demand from templates with all placeholders resolved:

```typescript
interface QuestionInstance {
	templateId: string;
	type: QuestionType;
	statement: ResolvedMarkdown; // All placeholders resolved
	resolvedVariables?: ResolvedVariable[];
	solution: string | string[];
	correction?: ResolvedCorrection;

	// For QCM
	shuffledChoices?: { content: ResolvedMarkdown; originalIndex: number }[];

	// Generation metadata
	generatedAt: string;
	seed?: number;
	selectedVariationIndex?: number;
}
```

---

## Question Types

| Type                  | Description               | Example                      |
| --------------------- | ------------------------- | ---------------------------- |
| `numerical_exact`     | Exact numerical value     | `5`, `42`                    |
| `numerical_decimal`   | Decimal approximation     | `3.14`                       |
| `numerical_rounded`   | Rounded value             | `2.7` (rounded to 1 decimal) |
| `numerical_with_unit` | Number with physical unit | `5 m`, `3.2 kg`              |
| `algebraic_transform` | Factor/expand/simplify    | `x^2 + 2x + 1` -> `(x+1)^2`  |
| `fill_in_blanks`      | Fill missing parts        | `2 + ___ = 5`                |
| `multiple_choice`     | Single or multiple choice | Select correct option(s)     |

---

## Variable System

### Syntax

Variables use the `{{...}}` markdown syntax:

```markdown
{{variableName}} # Reference to variable
{{random:1..10}} # Random integer 1-10
{{random:1..10!5,7}} # Random excluding 5 and 7
{{random:{{min}}..{{max}}}} # Variable bounds
{{random:2.3}} # Random decimal (2 before, 3 after point)
{{random:0.5..9.99:0.01}} # Decimal range with step
{{eval:a+b}} # Evaluate expression
```

### Resolution Pipeline

1. **Variable resolution**: Variables resolved in declaration order
2. **Random generation**: `{{random:...}}` expressions evaluated
3. **Expression evaluation**: `{{eval:...}}` computed via Compute Engine
4. **Content resolution**: Placeholders replaced in statement/correction

### Example

```typescript
const variation: QuestionVariation = {
	variables: [
		{ name: 'a', expression: '{{random:1..10}}' },
		{ name: 'b', expression: '{{random:1..10!{{a}}}}' }, // Exclude a
		{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
	],
	statement: 'Calculer $${{a}} + {{b}}$$',
	solution: '{{sum}}'
};
```

---

## Precision Types

For numerical answers:

```typescript
type PrecisionType =
	| { type: 'none' } // Exact value required
	| { type: 'decimal'; digits: number } // Decimal places
	| { type: 'significant'; digits: number } // Significant figures
	| { type: 'magnitude'; digits: number } // Order of magnitude
	| { type: 'tolerance'; tolerance: number; mode: 'absolute' | 'relative' };
```

---

## Validation Rules

For dynamic answer validation (when correct answer depends on generated values):

```typescript
type ValidationRule =
  | { type: 'divisor'; dividend: string }      // Answer divides dividend
  | { type: 'multiple'; base: string }         // Answer is multiple of base
  | { type: 'range'; min: string; max: string; inclusive?: boolean }
  | { type: 'equation_root'; equation: string; variable?: string }
  | { type: 'equivalent'; expression: string }
  | { type: 'predicate'; predicate: 'isPrime' | 'isEven' | ... }
  | { type: 'custom'; expression: string; description?: string };
```

### Example

```typescript
// Question: "Find a divisor of {{n}} other than 1"
const variation: QuestionVariation = {
	variables: [{ name: 'n', expression: '{{random:10..50}}' }],
	statement: 'Donner un diviseur de $${{n}}$$ autre que 1',
	solution: '', // Not used for dynamic validation
	validationRules: [
		{ type: 'divisor', dividend: '{{n}}' },
		{ type: 'range', min: '2', max: '{{n}}' }
	]
};
```

---

## Database Schema

### Table: `question_templates`

```sql
CREATE TABLE question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  type TEXT NOT NULL CHECK (type IN (
    'numerical_exact', 'numerical_decimal', 'numerical_rounded',
    'algebraic_transform', 'fill_in_blanks', 'multiple_choice'
  )),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  variations JSONB NOT NULL,
  exercise_instruction TEXT,

  -- Validation
  options JSONB,
  precision JSONB,

  -- Metadata
  grades TEXT[] NOT NULL,
  theme TEXT NOT NULL,
  domain TEXT NOT NULL,
  subdomain TEXT,
  level INTEGER NOT NULL CHECK (level > 0),
  status TEXT DEFAULT 'published',
  delay INTEGER,

  -- Type-specific
  transform_type TEXT,
  multiple_answers BOOLEAN,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

### Indexes

```sql
CREATE INDEX idx_question_templates_type ON question_templates(type);
CREATE INDEX idx_question_templates_grades ON question_templates USING GIN(grades);
CREATE INDEX idx_question_templates_categories ON question_templates(theme, domain, level);
CREATE INDEX idx_question_templates_status ON question_templates(status);
```

### RLS Policies

- **Admins**: Full CRUD access
- **Teachers**: Read all templates
- **Public**: Read published templates via `/api/questions/templates/all`

---

## API Endpoints

### Templates CRUD

| Endpoint                        | Method | Auth          | Description             |
| ------------------------------- | ------ | ------------- | ----------------------- |
| `/api/questions/templates`      | GET    | Teacher/Admin | List with filters       |
| `/api/questions/templates`      | POST   | Admin         | Create template         |
| `/api/questions/templates/all`  | GET    | Public        | All published templates |
| `/api/questions/templates/[id]` | GET    | Teacher/Admin | Get by ID               |
| `/api/questions/templates/[id]` | PUT    | Admin         | Update template         |
| `/api/questions/templates/[id]` | DELETE | Admin         | Delete template         |

### Instance Generation

| Endpoint                       | Method | Auth    | Description       |
| ------------------------------ | ------ | ------- | ----------------- |
| `/api/questions/generate/[id]` | POST   | Teacher | Generate instance |

### Categories

| Endpoint                        | Method | Auth    | Description                  |
| ------------------------------- | ------ | ------- | ---------------------------- |
| `/api/questions/categories`     | GET    | Teacher | Get distinct categories      |
| `/api/questions/categories/all` | GET    | Public  | Categories with template IDs |

### Request/Response Examples

**POST /api/questions/templates**

```json
{
	"type": "numerical_exact",
	"title": "Addition simple",
	"variations": [
		{
			"statement": "Calculer $${{a}} + {{b}}$$",
			"variables": [
				{ "name": "a", "expression": "{{random:1..10}}" },
				{ "name": "b", "expression": "{{random:1..10}}" }
			],
			"solution": "{{eval:{{a}}+{{b}}}}"
		}
	],
	"grades": ["6", "5"],
	"theme": "Calcul",
	"domain": "Addition",
	"level": 1,
	"status": "published"
}
```

**POST /api/questions/generate/[id]**

```json
{ "seed": 42 }
```

Response:

```json
{
	"success": true,
	"instance": {
		"templateId": "uuid",
		"type": "numerical_exact",
		"statement": "Calculer $$7 + 3$$",
		"solution": "10",
		"resolvedVariables": [
			{ "name": "a", "value": "7" },
			{ "name": "b", "value": "3" }
		],
		"generatedAt": "2024-01-15T10:30:00Z",
		"seed": 42
	}
}
```

---

## Client-Side Stores

### questionTemplatesCache

Caches all published templates for instant lookup.

```typescript
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

// Initialize from server (SSR)
questionTemplatesCache.initializeFromServer(data.templates);

// Get template by ID
const template = questionTemplatesCache.getTemplateById('abc-123');

// Filter by category
const filtered = questionTemplatesCache.getTemplatesByCategory({
	theme: 'Algebre',
	domain: 'Equations',
	subdomain: null,
	level: 1
});

// Invalidate after admin changes
questionTemplatesCache.invalidate();
```

### questionCategoriesCache

Caches category metadata for uniqueness validation.

```typescript
import { questionCategoriesCache } from '$lib/stores/questionCategories.svelte';

// Check if category exists
const exists = questionCategoriesCache.categoryExists(category, excludeId);

// Get next available level
const nextLevel = questionCategoriesCache.getNextAvailableLevel({
	theme: 'Algebre',
	domain: 'Equations',
	subdomain: null
});
```

### questionCart

Manages question selection for Automaths practice.

```typescript
import { questionCart } from '$lib/stores/questionCart.svelte';

// Add to cart
questionCart.addToCart(category, quantity, delay);

// Get all items
const items = questionCart.allItems;

// Update quantity/delay
questionCart.updateQuantity(category, 5);
questionCart.updateDelay(category, 30);

// Clear cart
questionCart.clearCart();
```

---

## Components

### Display Components

| Component                        | Location     | Purpose                                      |
| -------------------------------- | ------------ | -------------------------------------------- |
| `FlashCard.svelte`               | `questions/` | Interactive flashcard with answer validation |
| `CorrectionCard.svelte`          | `questions/` | Correction display                           |
| `QuestionCard.svelte`            | `questions/` | Static question display                      |
| `QuestionPreviewBaseCard.svelte` | `questions/` | Base preview card                            |

### Input Components

| Component                    | Location           | Purpose                        |
| ---------------------------- | ------------------ | ------------------------------ |
| `NumericalInput.svelte`      | `question-inputs/` | Numerical answer input         |
| `AlgebraicInput.svelte`      | `question-inputs/` | MathLive-based algebraic input |
| `FillBlanksInput.svelte`     | `question-inputs/` | Fill-in-blanks input           |
| `MultipleChoiceInput.svelte` | `question-inputs/` | QCM selection                  |

### FlashCard Component

```svelte
<FlashCard
	instance={questionInstance}
	interactive={true}
	size="md"
	showCorrectionOnWrong={true}
	maxAttempts={3}
	onAnswerSubmit={(answer) => handleAnswer(answer)}
	onComplete={(stats) => handleComplete(stats)}
/>
```

---

## Admin Interface

### Routes

| Route                                     | Purpose                     |
| ----------------------------------------- | --------------------------- |
| `/dashboard/admin/questions`              | List all templates          |
| `/dashboard/admin/questions/create`       | Create new template         |
| `/dashboard/admin/questions/[id]/edit`    | Edit template               |
| `/dashboard/admin/questions/[id]/preview` | Preview generated instances |

### Category Uniqueness

Categories (theme + domain + subdomain + level) must be unique:

- **On create**: Level is auto-adjusted to next available if collision
- **On update**: Request is rejected if collision (user must choose different level)

---

## Usage Contexts

### 1. Automaths (Public Practice)

- **Route**: `/automaths`
- **Flow**: Browse categories -> Add to cart -> Start test session
- Questions generated on-demand with random seeds

### 2. SRS Integration

Questions used in spaced repetition flashcard reviews:

```typescript
// src/lib/srs/generator.ts
import { generateInstance } from '$lib/questions';

// Generate new instance for each review
const result = generateInstance(template, Date.now());
```

### 3. Admin Management

Full CRUD via `/dashboard/admin/questions`:

- Draft/Published status workflow
- Preview with multiple generations
- Category validation

---

## Zod Validation Schemas

Located in `src/lib/server/validation/questions.ts`:

```typescript
// Create template
export const createQuestionTemplateSchema = z.object({
	type: questionTypeSchema,
	title: z.string().trim().min(1).max(200),
	variations: z.array(variationSchema).min(1).max(50),
	grades: z.array(gradeSchema).min(1),
	theme: z.string().min(1).max(100),
	domain: z.string().min(1).max(100),
	subdomain: z.string().max(100).optional().nullable(),
	level: z.number().int().positive(),
	status: z.enum(['draft', 'published']).default('published')
	// ...
});

// Generate instance
export const generateQuestionSchema = z.object({
	seed: z.number().int().nonnegative().optional(),
	variationIndex: z.number().int().nonnegative().optional()
});
```

---

## Related Documentation

- [Variable Syntax](../ubumark/variables.md) - Full variable syntax reference
- [Compute Engine](../math/compute-engine.md) - Expression evaluation
- [SRS System](../srs/README.md) - Spaced repetition integration
- [Answer Validation](../utils/answer-validator.md) - Validation logic
