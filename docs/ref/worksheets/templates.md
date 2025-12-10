# Worksheet Templates

Technical reference for the Typst template system including default templates and customization.

**Source file:** `src/lib/worksheets/default-templates.ts`

---

## Overview

Templates define the visual layout of generated PDFs using Typst markup with placeholders.

```
Template Content                    Placeholder Data                 Final Typst
┌─────────────────────────┐        ┌─────────────────┐             ┌─────────────────────┐
│ *Nom:* {{student_name}} │   +    │ student_name:   │      =      │ *Nom:* Jean DUPONT  │
│ {{exercises}}           │        │   "Jean DUPONT" │             │ #block[Exercice 1]  │
└─────────────────────────┘        │ exercises: ...  │             └─────────────────────┘
                                   └─────────────────┘
```

---

## Placeholder System

### Available Placeholders

| Placeholder         | Type    | Description                   |
| ------------------- | ------- | ----------------------------- |
| `{{title}}`         | text    | Worksheet title               |
| `{{date}}`          | date    | Current or assignment date    |
| `{{class}}`         | text    | Class name                    |
| `{{student_name}}`  | text    | Student's full name           |
| `{{exercises}}`     | dynamic | Rendered exercises content    |
| `{{total_points}}`  | text    | Total points                  |
| `{{duration}}`      | text    | Estimated duration in minutes |
| `{{instructions}}`  | text    | General instructions          |
| `{{school_name}}`   | text    | School name                   |
| `{{teacher_name}}`  | text    | Teacher's name                |
| `{{due_date}}`      | date    | Assignment due date           |
| `{{exam_session}}`  | text    | Exam session identifier       |
| `{{subject}}`       | text    | Subject name                  |
| `{{coefficient}}`   | text    | Grade coefficient             |
| `{{competences}}`   | text    | Evaluated competencies        |
| `{{theme_color}}`   | text    | Theme accent color (hex)      |
| `{{academic_year}}` | text    | Academic year                 |
| `{{semester}}`      | text    | Semester number               |

### Placeholder Types

```typescript
interface TemplatePlaceholder {
	key: string; // e.g., "title"
	type: 'text' | 'date' | 'dynamic';
	label?: string; // French display label
	default_value?: string; // Fallback value
}
```

- **text**: Static string value
- **date**: Date formatted for display
- **dynamic**: Content generated at runtime (e.g., exercises)

---

## Default Templates

### Well-Known UUIDs

Templates have deterministic UUIDs for consistency across environments:

```typescript
export const DEFAULT_TEMPLATE_IDS = {
	standard: '00000000-0000-4000-8000-000000000001',
	assessment: '00000000-0000-4000-8000-000000000002',
	exam: '00000000-0000-4000-8000-000000000003',
	homework: '00000000-0000-4000-8000-000000000004',
	quiz: '00000000-0000-4000-8000-000000000005',
	minimal: '00000000-0000-4000-8000-000000000006',
	modern: '00000000-0000-4000-8000-000000000007',
	twoColumns: '00000000-0000-4000-8000-000000000008',
	landscape: '00000000-0000-4000-8000-000000000009',
	magazine: '00000000-0000-4000-8000-000000000010',
	scientific: '00000000-0000-4000-8000-000000000011'
} as const;
```

### Template Summary

| Template        | Type       | Description                                        |
| --------------- | ---------- | -------------------------------------------------- |
| **Standard**    | worksheet  | Basic layout with title, student info, exercises   |
| **Assessment**  | assessment | Formal evaluation with grading section             |
| **Exam**        | exam       | Official exam with header, instructions, signature |
| **Homework**    | homework   | Simple homework with due date                      |
| **Quiz**        | quiz       | Compact quiz format                                |
| **Minimal**     | worksheet  | Clean, minimalist layout                           |
| **Modern**      | worksheet  | Contemporary design with styled exercise numbers   |
| **Two Columns** | worksheet  | Two-column layout for space efficiency             |
| **Landscape**   | worksheet  | A4 landscape with 3-column exercises               |
| **Magazine**    | worksheet  | Editorial style with sidebar                       |
| **Scientific**  | assessment | Academic bulletin style with grading grid          |

---

## Template Examples

### Standard Template

Basic layout suitable for most worksheets:

```typst
#set page(paper: "a4", margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm))
#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

#align(center)[
  #text(size: 18pt, weight: "bold")[{{title}}]
]

#grid(
  columns: (1fr, 1fr),
  [*Nom :* #underline[{{student_name}}]],
  [*Classe :* {{class}}]
)

#grid(
  columns: (1fr, 1fr),
  [*Date :* {{date}}],
  [*Total :* {{total_points}} points]
)

#line(length: 100%, stroke: 0.5pt)

#block(fill: rgb("#f0f0f0"), inset: 10pt, radius: 4pt)[
  *Consignes :* {{instructions}}
]

{{exercises}}
```

### Modern Template

Contemporary design with gradient header and styled badges:

```typst
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
  background: place(top + right, dx: -1cm, dy: 1cm,
    rotate(45deg, text(120pt, fill: rgb(240, 240, 240), "MATHS"))
  )
)

// Styled exercise badge
#let exercise-badge(n) = {
  box(
    fill: rgb("#dc2626"),
    inset: (x: 10pt, y: 5pt),
    radius: 4pt,
    text(fill: white, weight: "bold", [#n])
  )
}

// Gradient header
#rect(
  width: 100%,
  fill: gradient.linear(rgb("#1e40af"), rgb("#3b82f6"), angle: 135deg),
  radius: (bottom: 15pt)
)[
  #block(inset: 25pt)[
    #text(size: 28pt, fill: white, weight: "bold")[{{title}}]
  ]
]

// Info badges
#grid(
  columns: (auto, auto, 1fr, auto),
  box(fill: rgb("#dbeafe"), inset: 12pt, radius: 15pt)[⏱ {{duration}} min],
  box(fill: rgb("#fce7f3"), inset: 12pt, radius: 15pt)[👤 {{teacher_name}}],
  [],
  rect(stroke: 2pt + rgb("#dc2626"), radius: 8pt)[Score: ___ / {{total_points}}]
)

{{exercises}}
```

### Scientific Template

Academic style with formal grading grid:

```typst
// Institutional header
#align(center)[
  #text(size: 14pt, weight: "bold")[{{school_name}}]
  #text(size: 10pt)[Departement de Mathematiques]
  #text(size: 9pt, style: "italic")[Annee academique {{academic_year}}]
]

// Identification table
#table(
  columns: (1fr, 2fr, 1fr, 2fr),
  inset: 10pt,
  stroke: 0.5pt,
  fill: (col, row) => if row == 0 { rgb("#f3f4f6") },
  [*Champ*], [*Valeur*], [*Champ*], [*Valeur*],
  [Nom], [{{student_name}}], [Classe], [{{class}}],
  [Date], [{{date}}], [Duree], [{{duration}} minutes],
)

{{exercises}}

// Grading grid
#table(
  columns: (0.8fr, 2fr, 0.8fr, 0.8fr, 2fr),
  [*Ex.*], [*Competence*], [*Bareme*], [*Note*], [*Observations*],
  [1], [Calcul algebrique], [/5], [], [],
  [2], [Resolution d'equations], [/5], [], [],
)
```

---

## Template API

### getDefaultTemplate

Retrieve a default template by ID:

```typescript
export function getDefaultTemplate(id: string): DefaultTemplate | undefined {
	return DEFAULT_TEMPLATES.find((t) => t.id === id);
}
```

### getDefaultTemplatesByType

Get templates matching a worksheet type:

```typescript
export function getDefaultTemplatesByType(type: string): DefaultTemplate[] {
	return DEFAULT_TEMPLATES.filter((t) => t.type === type);
}
```

### renderTemplate

Substitute placeholders with values:

```typescript
export function renderTemplate(templateContent: string, data: Record<string, string>): string {
	let result = templateContent;
	for (const [key, value] of Object.entries(data)) {
		result = result.split(`{{${key}}}`).join(value);
	}
	return result;
}
```

**Usage:**

```typescript
const rendered = renderTemplate(template.template_content, {
	title: 'Equations du premier degre',
	student_name: 'Jean DUPONT',
	class: '3eme B',
	date: '15 janvier 2025',
	exercises: exercisesTypst,
	total_points: '20'
});
```

---

## Custom Templates

### Creating a Custom Template

```typescript
// API request
POST /api/worksheets/templates
{
  "name": "Mon template",
  "description": "Template personnalise",
  "template_content": "#set page(paper: \"a4\")\n{{title}}\n{{exercises}}",
  "placeholders": [
    { "key": "title", "type": "text", "label": "Titre" },
    { "key": "exercises", "type": "dynamic", "label": "Exercices" }
  ],
  "is_public": false
}
```

### Template Structure

```typescript
interface DefaultTemplate {
	id: string; // UUID
	name: string; // Display name
	description: string; // Description
	type: WorksheetType; // Target worksheet type
	template_content: string; // Typst markup
	placeholders: TemplatePlaceholder[]; // Placeholder definitions
	is_system: boolean; // Cannot delete system templates
}
```

---

## Using Templates

### In Worksheet Creation

```typescript
// Set template when creating worksheet
POST /api/worksheets
{
  "title": "My Worksheet",
  "template_id": "00000000-0000-4000-8000-000000000007"  // Modern template
}
```

### In PDF Generation

```typescript
const typstContent = generateWorksheetTypst({
	worksheet,
	instance,
	config,
	mode: 'worksheet',
	template: worksheet.template // Template row from database
});
```

---

## Typst Tips for Templates

### Page Setup

```typst
#set page(
  paper: "a4",          // or "letter"
  flipped: true,        // landscape mode
  margin: (top: 2cm, bottom: 2cm, left: 1.5cm, right: 1.5cm),
  header: [...],
  footer: [...]
)
```

### Grids and Columns

```typst
// Two-column layout
#columns(2, gutter: 20pt)[
  {{exercises}}
]

// Grid for student info
#grid(
  columns: (1fr, 1fr, 1fr),
  column-gutter: 1cm,
  [...], [...], [...]
)
```

### Styling

```typst
// Colored box
#rect(fill: rgb("#f0f0f0"), inset: 10pt, radius: 4pt)[
  Content here
]

// Gradient
#rect(fill: gradient.linear(rgb("#1e40af"), rgb("#3b82f6")))[...]

// Bordered block
#block(stroke: (left: 3pt + rgb("#6366f1")), inset: 12pt)[...]
```

### Page Numbers

```typst
#set page(footer: [
  Page #context(counter(page).display()) sur #context(counter(page).final().first())
])
```

---

## Preview Data

Sample data for template preview:

```typescript
export const SAMPLE_PREVIEW_DATA = {
	title: 'Equations du premier degre',
	date: new Date().toLocaleDateString('fr-FR'),
	class: '3eme B',
	student_name: 'Jean DUPONT',
	total_points: '20',
	duration: '45',
	instructions: 'Repondez a toutes les questions.',
	school_name: 'College Victor Hugo',
	teacher_name: 'Mme Martin',
	exercises: `*Exercice 1* (5 points)
Resoudre: 2x + 5 = 11

*Exercice 2* (5 points)
Un rectangle a un perimetre de 36 cm...`
};
```
