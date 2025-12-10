# Worksheets TypeScript Types

Complete reference for TypeScript types and interfaces in the worksheets system.

**Source file:** `src/lib/types/worksheets.ts`

---

## Enums and Constants

### Worksheet Type

```typescript
export const WORKSHEET_TYPES = ['worksheet', 'assessment', 'exam', 'quiz', 'homework'] as const;
export type WorksheetType = (typeof WORKSHEET_TYPES)[number];
```

| Value        | French Label        | Description        |
| ------------ | ------------------- | ------------------ |
| `worksheet`  | Feuille d'exercices | General practice   |
| `assessment` | Evaluation          | Graded assessment  |
| `exam`       | Examen              | Formal examination |
| `quiz`       | Quiz                | Quick assessment   |
| `homework`   | Devoirs             | Take-home work     |

### Worksheet Status

```typescript
export const WORKSHEET_STATUSES = ['draft', 'published', 'archived'] as const;
export type WorksheetStatus = (typeof WORKSHEET_STATUSES)[number];
```

### Variant Mode

```typescript
export const VARIANT_MODES = ['none', 'individual', 'n_versions', 'group'] as const;
export type VariantMode = (typeof VARIANT_MODES)[number];
```

| Mode         | Description                   |
| ------------ | ----------------------------- |
| `none`       | Same content for all students |
| `individual` | Unique seed per student       |
| `n_versions` | Limited versions (A, B, C...) |
| `group`      | Shared by student groups      |

### Instance Status

```typescript
export const INSTANCE_STATUSES = ['generated', 'in_progress', 'submitted', 'graded'] as const;
export type InstanceStatus = (typeof INSTANCE_STATUSES)[number];
```

### Assignment Status

```typescript
export const ASSIGNMENT_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
```

### Correction Release Mode

```typescript
export const CORRECTION_RELEASE_MODES = ['manual', 'immediate', 'scheduled', 'after_due'] as const;
export type CorrectionReleaseMode = (typeof CORRECTION_RELEASE_MODES)[number];
```

### Numbering Style

```typescript
export const NUMBERING_STYLES = ['numeric', 'alphabetic', 'roman'] as const;
export type NumberingStyle = (typeof NUMBERING_STYLES)[number];
```

---

## Configuration Types

### WorksheetConfig

Configuration for worksheet display and layout (stored as JSONB):

```typescript
export interface WorksheetConfig {
	show_title?: boolean; // Show title in PDF (default: true)
	show_date?: boolean; // Show date in PDF (default: true)
	show_student_name?: boolean; // Show student name field (default: true)
	show_class?: boolean; // Show class name (default: true)
	show_points?: boolean; // Show point values (default: true)
	numbering_style?: NumberingStyle; // Exercise numbering (default: 'numeric')
	shuffle_exercises?: boolean; // Randomize exercise order (default: false)
	shuffle_within_sections?: boolean; // Shuffle per section (default: false)
	page_layout?: 'A4' | 'Letter'; // Page size (default: 'A4')
	font_size?: number; // Font size in pt (default: 12)
	margins?: {
		// Page margins in mm
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
}

export const DEFAULT_WORKSHEET_CONFIG: WorksheetConfig = {
	show_title: true,
	show_date: true,
	show_student_name: true,
	show_class: true,
	show_points: true,
	numbering_style: 'numeric',
	shuffle_exercises: false,
	shuffle_within_sections: false,
	page_layout: 'A4',
	font_size: 12,
	margins: { top: 20, bottom: 20, left: 15, right: 15 }
};
```

### VariantConfig

Configuration for exercise variant generation:

```typescript
export interface VariantConfig {
	mode?: VariantMode; // Variant mode
	n_versions?: number; // Number of versions for n_versions mode
	group_size?: number; // Students per group for group mode
	seed_base?: number; // Override base seed
	parameter_overrides?: Record<string, unknown>; // Force specific parameter values
}

export const DEFAULT_VARIANT_CONFIG: VariantConfig = {
	mode: 'none'
};
```

### TemplatePlaceholder

Definition for template placeholders:

```typescript
export interface TemplatePlaceholder {
	key: string; // Placeholder key (e.g., "title")
	type: 'text' | 'date' | 'dynamic';
	label?: string; // Display label
	default_value?: string; // Default value if not provided
}
```

---

## Instance Data Types

### ResolvedExercise

Exercise with resolved parameters:

```typescript
export interface ResolvedExercise {
	exercise_id: string; // Reference to original exercise
	position: number; // Order in worksheet
	parameters: Record<string, number | string>; // Resolved variable values
	statement: string; // Resolved statement markdown
	solution: string; // Resolved solution markdown
}
```

### InstanceData

Complete instance data stored for each student:

```typescript
export interface InstanceData {
	exercises: ResolvedExercise[]; // All resolved exercises
	exercise_order?: number[]; // Original positions if shuffled
	variant_info?: {
		seed: number; // Seed used for generation
		version?: string; // "A", "B", etc. for n_versions
		group_id?: string; // "G1", "G2", etc. for groups
	};
}
```

---

## Database Row Types

These types mirror the database schema:

### WorksheetTemplateRow

```typescript
export interface WorksheetTemplateRow {
	id: string;
	name: string;
	description: string | null;
	template_content: string;
	placeholders: TemplatePlaceholder[];
	is_public: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}
```

### WorksheetRow

```typescript
export interface WorksheetRow {
	id: string;
	title: string;
	description: string | null;
	type: WorksheetType;
	config: WorksheetConfig;
	status: WorksheetStatus;
	version: number;
	published_at: string | null;
	archived_at: string | null;
	template_id: string | null;
	estimated_duration_minutes: number | null;
	total_points: number | null;
	grade_levels: string[];
	tags: string[];
	created_by: string;
	school_id: string | null;
	created_at: string;
	updated_at: string;
}
```

### WorksheetSectionRow

```typescript
export interface WorksheetSectionRow {
	id: string;
	worksheet_id: string;
	title: string;
	instructions: string | null;
	position: number;
	points_total: number | null;
	created_at: string;
	updated_at: string;
}
```

### WorksheetExerciseRow

```typescript
export interface WorksheetExerciseRow {
	id: string;
	worksheet_id: string;
	exercise_id: string;
	section_id: string | null;
	position: number;
	points: number | null;
	variant_mode: VariantMode;
	variant_config: VariantConfig;
	custom_instructions: string | null;
	created_at: string;
	updated_at: string;
}
```

### WorksheetInstanceRow

```typescript
export interface WorksheetInstanceRow {
	id: string;
	worksheet_id: string;
	student_id: string;
	instance_data: InstanceData;
	variant_seed: number;
	variant_version: string | null;
	status: InstanceStatus;
	generated_at: string;
	accessed_at: string | null;
	submitted_at: string | null;
	time_spent_seconds: number;
	created_at: string;
	updated_at: string;
}
```

### WorksheetAssignmentRow

```typescript
export interface WorksheetAssignmentRow {
	id: string;
	worksheet_id: string;
	class_id: string | null;
	title: string | null;
	instructions: string | null;
	individualized: boolean;
	assigned_at: string;
	available_from: string;
	due_at: string | null;
	closes_at: string | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: string | null;
	show_solutions_before_due: boolean;
	allow_late_submission: boolean;
	max_attempts: number;
	time_limit_minutes: number | null;
	status: AssignmentStatus;
	created_by: string;
	created_at: string;
	updated_at: string;
}
```

---

## Insert Types

For creating new records (without auto-generated fields):

```typescript
export interface WorksheetInsert {
	title: string;
	description?: string | null;
	type?: WorksheetType;
	config?: WorksheetConfig;
	status?: WorksheetStatus;
	version?: number;
	template_id?: string | null;
	estimated_duration_minutes?: number | null;
	total_points?: number | null;
	grade_levels?: number[];
	tags?: string[];
	created_by: string;
	school_id?: string | null;
}

export interface WorksheetExerciseInsert {
	worksheet_id: string;
	exercise_id: string;
	section_id?: string | null;
	position: number;
	points?: number | null;
	variant_mode?: VariantMode;
	variant_config?: VariantConfig;
	custom_instructions?: string | null;
}

// Similar patterns for other Insert types...
```

---

## Update Types

For partial updates (all fields optional):

```typescript
export interface WorksheetUpdate {
	title?: string;
	description?: string | null;
	type?: WorksheetType;
	config?: WorksheetConfig;
	status?: WorksheetStatus;
	version?: number;
	published_at?: string | null;
	archived_at?: string | null;
	template_id?: string | null;
	estimated_duration_minutes?: number | null;
	total_points?: number | null;
	grade_levels?: number[];
	tags?: string[];
	school_id?: string | null;
}

// Similar patterns for other Update types...
```

---

## Extended Types (with Relations)

Types that include joined data:

### WorksheetWithRelations

```typescript
export interface WorksheetWithRelations extends WorksheetRow {
	template?: WorksheetTemplateRow | null;
	sections?: WorksheetSectionRow[];
	exercises?: WorksheetExerciseWithExercise[];
	creator?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
}
```

### WorksheetExerciseWithExercise

```typescript
export interface WorksheetExerciseWithExercise extends WorksheetExerciseRow {
	exercise?: {
		id: string;
		title: string;
		statement_md: string;
		solution_md: string | null;
		difficulty: number | null;
		variables: unknown[] | null;
	};
}
```

### WorksheetInstanceWithStudent

```typescript
export interface WorksheetInstanceWithStudent extends WorksheetInstanceRow {
	student?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
	worksheet?: {
		id: string;
		title: string;
	};
}
```

### WorksheetAssignmentWithRelations

```typescript
export interface WorksheetAssignmentWithRelations extends WorksheetAssignmentRow {
	worksheet?: {
		id: string;
		title: string;
		type: WorksheetType;
	};
	class?: {
		id: string;
		name: string;
	};
	creator?: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
}
```

---

## Form Types (for UI)

Types for form handling:

```typescript
export interface WorksheetFormData {
	title: string;
	description: string;
	type: WorksheetType;
	config: WorksheetConfig;
	estimated_duration_minutes: number | null;
	grade_levels: string[];
	tags: string[];
	template_id: string | null;
}

export interface WorksheetExerciseFormData {
	exercise_id: string;
	section_id: string | null;
	position: number;
	points: number | null;
	variant_mode: VariantMode;
	variant_config: VariantConfig;
	custom_instructions: string;
}

export interface WorksheetAssignmentFormData {
	class_id: string;
	title: string;
	instructions: string;
	individualized: boolean;
	available_from: Date;
	due_at: Date | null;
	closes_at: Date | null;
	correction_release_mode: CorrectionReleaseMode;
	correction_release_at: Date | null;
	allow_late_submission: boolean;
	max_attempts: number;
	time_limit_minutes: number | null;
}
```

---

## Generator Types

Types used by the instance generator:

```typescript
// From src/lib/server/worksheets/instance-generator.ts

export interface GenerateInstanceParams {
	worksheetId: string;
	studentId: string;
	exercises: WorksheetExerciseWithExercise[];
	config: WorksheetConfig;
}
```

---

## Typst Generator Types

Types used by the Typst generator:

```typescript
// From src/lib/worksheets/typst-generator.ts

export interface GenerateTypstParams {
	worksheet: WorksheetRow;
	instance: InstanceData;
	config: WorksheetConfig;
	mode: 'worksheet' | 'correction';
	studentName?: string;
	className?: string;
	template?: WorksheetTemplateRow | null;
}
```

---

## Type Guards

Useful type guards for runtime checking:

```typescript
function isValidVariantMode(value: string): value is VariantMode {
	return VARIANT_MODES.includes(value as VariantMode);
}

function isValidWorksheetType(value: string): value is WorksheetType {
	return WORKSHEET_TYPES.includes(value as WorksheetType);
}
```
