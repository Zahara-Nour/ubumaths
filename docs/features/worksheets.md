# Worksheets Feature

> **Version**: 1.0.0
> **Status**: Production
> **Last Updated**: 2025-01-23

---

## Overview

The Worksheets feature provides teachers with a comprehensive system to create, manage, and distribute mathematical worksheets, assessments, exams, quizzes, and homework. It includes advanced features like parameterized exercises (variants), PDF generation via Typst, correction management, and customizable templates.

### Key Capabilities

- **Multiple Document Types**: Worksheets, assessments, exams, quizzes, homework
- **Variant System**: Generate unique versions for each student with parameterized exercises
- **PDF Generation**: Professional documents via Typst with customizable templates
- **Section Organization**: Group exercises into logical sections
- **Correction Management**: Multiple release modes (manual, immediate, scheduled, after due date)
- **Assignment System**: Distribute to classes with timing controls

---

## User Workflows

### Creating a Worksheet

1. **Navigate** to Dashboard > Teacher > Worksheets
2. **Click** "Nouvelle feuille" (New worksheet)
3. **Fill in** basic information:
   - Title (required)
   - Description (optional)
   - Type (worksheet, assessment, exam, quiz, homework)
   - Duration estimate
   - Grade levels
   - Tags
4. **Configure** display options (collapsible panel):
   - Show/hide title, date, student name, class, points
   - Numbering style (1,2,3 / A,B,C / I,II,III)
   - Page layout (A4 or Letter)
   - Exercise shuffling options
5. **Save** to create the worksheet in draft status

### Adding Exercises

1. **Open** the worksheet detail page
2. **Click** "Ajouter des exercices"
3. **Search** exercises by title, filter by difficulty/grade/tags
4. **Select** exercises to add (preview available)
5. **Configure** each exercise:
   - Position/order (drag-and-drop)
   - Points allocation
   - Variant mode
   - Custom instructions

### Organizing with Sections

Sections help organize exercises into logical groups:

1. **Click** "Ajouter une section"
2. **Name** the section (e.g., "Partie A: Calcul mental")
3. **Add** instructions for the section
4. **Drag** exercises into sections
5. **Enable** "Shuffle within sections" to randomize order per section

### Configuring Variants

Each exercise can have its own variant configuration:

| Mode         | Description                           | Use Case                             |
| ------------ | ------------------------------------- | ------------------------------------ |
| `none`       | All students get identical worksheets | Reference exams, practice            |
| `individual` | Unique variant per student            | Homework, reduce cheating            |
| `n_versions` | Limited versions (A, B, C...)         | Formal exams with alternate versions |
| `group`      | Groups share the same variant         | Group work, differentiation          |

To configure:

1. Click the variant icon on an exercise
2. Select variant mode
3. Set options (number of versions or group size)
4. Preview different variants before publishing

### Generating PDFs

1. **Open** worksheet detail page
2. **Click** "Generer PDF"
3. **Choose** mode:
   - Worksheet (student version, no solutions)
   - Correction (teacher version with solutions)
4. **Select** recipient:
   - Generic preview
   - Specific student (shows their variant)
5. **Download** or print the PDF

For batch generation:

1. Click "Generer pour la classe"
2. Select the target class
3. PDFs are generated with each student's unique variant

### Assigning to Classes

1. **Open** worksheet detail page
2. **Click** "Assigner a une classe"
3. **Configure** assignment:
   - Target class
   - Custom title/instructions
   - Availability dates (from/to)
   - Due date
   - Correction release settings
   - Late submission policy
   - Time limit (optional)
4. **Activate** the assignment

### Managing Corrections

Correction release modes:

| Mode        | Behavior                                    |
| ----------- | ------------------------------------------- |
| `manual`    | Teacher releases corrections manually       |
| `immediate` | Students see corrections instantly          |
| `scheduled` | Automatic release at specified date/time    |
| `after_due` | Corrections available after due date passes |

To release corrections manually:

1. Go to assignment detail
2. Click "Publier les corrections"
3. Students gain access immediately

---

## Variant System (Deep Dive)

### How It Works

Exercises with variables become parameterized. The system:

1. Generates a deterministic seed from worksheet ID + student ID
2. Uses the seed to resolve variable expressions
3. Produces consistent results (same student always sees same variant)

### Parameterization Syntax

In exercise content:

```markdown
Variables:

- a: {{random:1-10}}
- b: {{random:1-10}}
- sum: {{eval:a+b}}

Calculate {{a}} + {{b}}

**Solution**: {{a}} + {{b}} = {{sum}}
```

### Seed Generation

```typescript
// Deterministic seed based on worksheet + student
function generateSeed(worksheetId: string, studentId: string): number {
	const baseString = `${worksheetId}-${studentId}`;
	// Hash to 32-bit integer
	return hashString(baseString);
}
```

### Previewing Variants

The VariantPreview component allows teachers to:

- Preview any student's variant
- Compare two variants side-by-side
- Use custom seeds for testing
- View generated parameter values

---

## PDF Generation

### Typst Integration

PDFs are generated using [Typst](https://typst.app/), a modern typesetting system. The process:

1. **Build** Typst document from worksheet data
2. **Resolve** exercise variables with student-specific seeds
3. **Apply** template (layout, styles, header/footer)
4. **Compile** to PDF via Typst.js

### Document Structure

```typst
// Setup (page, fonts, styles)
#set page(paper: "a4", margin: ...)
#set text(font: "New Computer Modern", lang: "fr")

// Header (title, student info, date)
#align(center)[*Evaluation*]
Nom: ___________  Classe: 3eme B

// Exercises
#exercise-box[
  *Exercice 1*
  Resoudre: 2x + 5 = 11
]

// Footer (page numbers)
```

### Available Templates

| Template   | Use Case                            |
| ---------- | ----------------------------------- |
| Standard   | Basic worksheets                    |
| Assessment | Formal evaluations with grade box   |
| Exam       | Official exams with signature line  |
| Quiz       | Quick quizzes, compact layout       |
| Homework   | Take-home assignments with due date |
| Minimal    | Clean, simple layout                |

### Custom Templates

Teachers can create custom Typst templates with placeholders:

- `{{title}}` - Document title
- `{{date}}` - Current or assignment date
- `{{student_name}}` - Student's full name
- `{{class}}` - Class name
- `{{exercises}}` - Rendered exercises
- `{{total_points}}` - Total points
- `{{duration}}` - Estimated duration

---

## API Reference

### Worksheets

| Method | Endpoint               | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| GET    | `/api/worksheets`      | List worksheets with filters/pagination |
| POST   | `/api/worksheets`      | Create new worksheet                    |
| GET    | `/api/worksheets/{id}` | Get worksheet details                   |
| PUT    | `/api/worksheets/{id}` | Update worksheet                        |
| DELETE | `/api/worksheets/{id}` | Delete worksheet (draft only)           |

### Sections

| Method | Endpoint                                    | Description    |
| ------ | ------------------------------------------- | -------------- |
| GET    | `/api/worksheets/{id}/sections`             | List sections  |
| POST   | `/api/worksheets/{id}/sections`             | Create section |
| PUT    | `/api/worksheets/{id}/sections/{sectionId}` | Update section |
| DELETE | `/api/worksheets/{id}/sections/{sectionId}` | Delete section |

### Exercises

| Method | Endpoint                                      | Description               |
| ------ | --------------------------------------------- | ------------------------- |
| GET    | `/api/worksheets/{id}/exercises`              | List worksheet exercises  |
| POST   | `/api/worksheets/{id}/exercises`              | Add exercise to worksheet |
| PUT    | `/api/worksheets/{id}/exercises/{exerciseId}` | Update exercise config    |
| DELETE | `/api/worksheets/{id}/exercises/{exerciseId}` | Remove exercise           |

### Instances & Variants

| Method | Endpoint                         | Description                  |
| ------ | -------------------------------- | ---------------------------- |
| POST   | `/api/worksheets/{id}/preview`   | Generate variant preview     |
| POST   | `/api/worksheets/{id}/instances` | Generate instances for class |
| GET    | `/api/worksheets/{id}/instances` | List generated instances     |

### PDF Generation

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| POST   | `/api/worksheets/{id}/pdf`       | Generate single PDF     |
| POST   | `/api/worksheets/{id}/pdf/batch` | Generate PDFs for class |

### Assignments & Corrections

| Method | Endpoint                                                | Description         |
| ------ | ------------------------------------------------------- | ------------------- |
| GET    | `/api/worksheets/{id}/assignments`                      | List assignments    |
| POST   | `/api/worksheets/{id}/assignments`                      | Create assignment   |
| PUT    | `/api/worksheets/assignments/{assignmentId}`            | Update assignment   |
| POST   | `/api/worksheets/assignments/{assignmentId}/correction` | Release corrections |

### Templates

| Method | Endpoint                         | Description     |
| ------ | -------------------------------- | --------------- |
| GET    | `/api/worksheets/templates`      | List templates  |
| POST   | `/api/worksheets/templates`      | Create template |
| GET    | `/api/worksheets/templates/{id}` | Get template    |
| PUT    | `/api/worksheets/templates/{id}` | Update template |
| DELETE | `/api/worksheets/templates/{id}` | Delete template |

---

## Database Schema

### Core Tables

```
worksheet_templates    - Typst PDF templates
worksheets            - Main worksheets table
worksheet_sections    - Section organization
worksheet_exercises   - Exercise-worksheet junction
worksheet_instances   - Student-specific instances
worksheet_assignments - Class assignments
```

### Entity Relationships

```
worksheets
    |-- worksheet_sections (1:N)
    |-- worksheet_exercises (1:N)
    |       |-- exercises (N:1)
    |-- worksheet_instances (1:N)
    |       |-- profiles/students (N:1)
    |-- worksheet_assignments (1:N)
    |       |-- classes (N:1)
    |-- worksheet_templates (N:1, optional)
```

### Key Constraints

- Unique position per exercise within worksheet/section
- Unique instance per student per worksheet
- Anti-tampering trigger on instances (students cannot modify seed/data)
- Cascade deletes from worksheets to children

---

## Security

### Row Level Security (RLS)

| Table              | Policy                                                            |
| ------------------ | ----------------------------------------------------------------- |
| worksheets         | Creators + admins can modify; same-school teachers view published |
| sections/exercises | Same as parent worksheet                                          |
| instances          | Students see own; teachers see their worksheets' instances        |
| assignments        | Creators + admins modify; students see class assignments          |
| templates          | Public templates visible to all; private to creators              |

### Input Validation

All inputs are validated with Zod schemas:

- UUID validation on IDs
- String length limits
- Enum validation for types/statuses
- Numeric bounds on points, duration, etc.

### Instance Integrity

Database trigger prevents students from modifying:

- `instance_data` (resolved exercises)
- `variant_seed`
- `worksheet_id`
- `student_id`

---

## Components

### UI Components

| Component               | Location                                    | Purpose                    |
| ----------------------- | ------------------------------------------- | -------------------------- |
| ExerciseSelector        | `worksheets/ExerciseSelector.svelte`        | Search and add exercises   |
| ExerciseList            | `worksheets/ExerciseList.svelte`            | Display/reorder exercises  |
| ExercisePreview         | `worksheets/ExercisePreview.svelte`         | Preview exercise content   |
| ExerciseConfigModal     | `worksheets/ExerciseConfigModal.svelte`     | Configure variant settings |
| SectionManager          | `worksheets/SectionManager.svelte`          | Manage sections            |
| VariantPreview          | `worksheets/VariantPreview.svelte`          | Preview student variants   |
| PdfPreview              | `worksheets/PdfPreview.svelte`              | Preview generated PDF      |
| CorrectionManager       | `worksheets/CorrectionManager.svelte`       | Manage correction release  |
| CorrectionSettings      | `worksheets/CorrectionSettings.svelte`      | Configure correction mode  |
| WorksheetAssignmentForm | `worksheets/WorksheetAssignmentForm.svelte` | Assign to class            |
| TemplateSelector        | `worksheets/TemplateSelector.svelte`        | Choose PDF template        |
| TypstEditor             | `worksheets/TypstEditor.svelte`             | Edit Typst templates       |

### Server Modules

| Module             | Location                                  | Purpose                    |
| ------------------ | ----------------------------------------- | -------------------------- |
| instance-generator | `server/worksheets/instance-generator.ts` | Generate variant instances |
| correction-release | `server/worksheets/correction-release.ts` | Manage correction access   |
| typst-generator    | `worksheets/typst-generator.ts`           | Generate Typst documents   |
| default-templates  | `worksheets/default-templates.ts`         | Built-in PDF templates     |

---

## Configuration Options

### Worksheet Config

```typescript
interface WorksheetConfig {
	show_title?: boolean; // Display title on PDF
	show_date?: boolean; // Display date
	show_student_name?: boolean; // Display student name
	show_class?: boolean; // Display class name
	show_points?: boolean; // Display points per exercise
	numbering_style?: 'numeric' | 'alphabetic' | 'roman';
	shuffle_exercises?: boolean; // Randomize all exercise order
	shuffle_within_sections?: boolean; // Randomize within sections
	page_layout?: 'A4' | 'Letter';
	font_size?: number; // Default: 12pt
	margins?: { top; bottom; left; right }; // In mm
}
```

### Variant Config

```typescript
interface VariantConfig {
	mode?: 'none' | 'individual' | 'n_versions' | 'group';
	n_versions?: number; // For n_versions mode
	group_size?: number; // For group mode
	seed_base?: number; // Custom seed override
	parameter_overrides?: Record<string, unknown>;
}
```

---

## Routes

### Teacher Dashboard

| Route                                          | Description      |
| ---------------------------------------------- | ---------------- |
| `/dashboard/teacher/worksheets`                | Worksheet list   |
| `/dashboard/teacher/worksheets/new`            | Create worksheet |
| `/dashboard/teacher/worksheets/[id]`           | Worksheet detail |
| `/dashboard/teacher/worksheets/[id]/edit`      | Edit worksheet   |
| `/dashboard/teacher/worksheets/templates`      | Template list    |
| `/dashboard/teacher/worksheets/templates/[id]` | Edit template    |

---

## Best Practices

### Creating Effective Worksheets

1. **Use descriptive titles** - Help students understand the topic
2. **Add estimated duration** - Helps with time management
3. **Organize with sections** - Group related exercises
4. **Use appropriate variant modes**:
   - Homework: `individual` (reduces copying)
   - Exams: `n_versions` (manageable grading)
   - Practice: `none` (discuss together)

### Parameterized Exercises

1. **Use meaningful variable names** - `numerator` not `a`
2. **Set reasonable ranges** - Avoid edge cases (division by zero)
3. **Test variants** - Preview multiple seeds before publishing
4. **Keep expressions simple** - Complex evals may slow generation

### PDF Generation

1. **Preview before printing** - Check layout and formatting
2. **Use appropriate templates** - Match document type
3. **Include instructions** - Especially for exams
4. **Set reasonable margins** - For hole-punching if needed

---

## Troubleshooting

### Common Issues

**Variant not changing between students**

- Check variant mode is not `none`
- Verify exercise has variables defined
- Ensure different student IDs are used

**PDF generation fails**

- Check Typst syntax in custom templates
- Verify all exercises have valid content
- Check for special characters in text

**Correction not visible to students**

- Verify correction release mode
- Check scheduled release date has passed
- Ensure assignment is active, not draft

**Exercise order not persisting**

- Save after drag-and-drop
- Check for position conflicts
- Refresh page to verify

---

## Related Documentation

- [Worksheet Variants](worksheet-variants.md) - Detailed variant system docs
- [Exercises Feature](exercises/README.md) - Exercise creation
- [Database Schema](../architecture/database-schema.md) - Full schema reference
- [Quality Standards](../claude/quality-standards.md) - API validation patterns

---

[Back to Features Index](README.md)
