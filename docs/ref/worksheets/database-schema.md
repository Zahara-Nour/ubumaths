# Worksheets Database Schema

Complete database schema reference for the worksheets system.

**Migration file:** `supabase/migrations/20250123000000_worksheets.sql`

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│ profiles        │       │ worksheets       │       │ exercises       │
│ (teachers)      │◀──────│                  │───────│                 │
└─────────────────┘       └────────┬─────────┘       └─────────────────┘
                                   │                          │
        ┌──────────────────────────┼──────────────────────────┤
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│ worksheet_        │    │ worksheet_       │    │ worksheet_           │
│ templates         │    │ sections         │    │ exercises            │
└───────────────────┘    └──────────────────┘    │ (junction table)     │
                                                  └──────────┬───────────┘
                                                             │
        ┌────────────────────────────────────────────────────┤
        │                                                    │
        ▼                                                    ▼
┌───────────────────┐                              ┌──────────────────────┐
│ worksheet_        │                              │ worksheet_           │
│ assignments       │                              │ instances            │
└───────────────────┘                              └──────────────────────┘
        │
        ▼
┌───────────────────┐
│ classes           │
└───────────────────┘
```

---

## Tables

### 1. worksheet_templates

Reusable Typst templates for PDF generation.

```sql
CREATE TABLE worksheet_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,          -- Typst template code
  placeholders JSONB DEFAULT '[]'::JSONB,  -- Array of placeholder definitions
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_templates_name_check
    CHECK (char_length(name) BETWEEN 1 AND 255),
  CONSTRAINT worksheet_templates_content_check
    CHECK (char_length(template_content) > 0)
);
```

**Indexes:**

```sql
CREATE INDEX idx_worksheet_templates_created_by ON worksheet_templates(created_by);
CREATE INDEX idx_worksheet_templates_is_public ON worksheet_templates(is_public)
  WHERE is_public = true;
```

**Placeholder structure:**

```typescript
interface TemplatePlaceholder {
	key: string; // e.g., "title", "student_name"
	type: 'text' | 'date' | 'dynamic';
	label?: string; // French display label
	default_value?: string;
}
```

---

### 2. worksheets

Main worksheet container storing metadata and configuration.

```sql
CREATE TABLE worksheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'worksheet',

  -- Configuration (JSONB for flexibility)
  config JSONB DEFAULT '{}'::JSONB,

  -- Status and versioning
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Template reference
  template_id UUID REFERENCES worksheet_templates(id) ON DELETE SET NULL,

  -- Metadata
  estimated_duration_minutes INTEGER,
  total_points NUMERIC(10, 2),
  grade_levels INTEGER[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Ownership
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT worksheets_title_check
    CHECK (char_length(title) BETWEEN 1 AND 255),
  CONSTRAINT worksheets_type_check
    CHECK (type IN ('worksheet', 'assessment', 'exam', 'quiz', 'homework')),
  CONSTRAINT worksheets_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT worksheets_duration_check
    CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  CONSTRAINT worksheets_points_check
    CHECK (total_points IS NULL OR total_points >= 0),
  CONSTRAINT worksheets_version_check
    CHECK (version > 0)
);
```

**Indexes:**

```sql
CREATE INDEX idx_worksheets_created_by ON worksheets(created_by);
CREATE INDEX idx_worksheets_status ON worksheets(status);
CREATE INDEX idx_worksheets_type ON worksheets(type);
CREATE INDEX idx_worksheets_school_id ON worksheets(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_worksheets_template_id ON worksheets(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_worksheets_created_at ON worksheets(created_at DESC);
CREATE INDEX idx_worksheets_grade_levels ON worksheets USING GIN(grade_levels);
CREATE INDEX idx_worksheets_tags ON worksheets USING GIN(tags);

-- Full-text search
CREATE INDEX idx_worksheets_search ON worksheets
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '')));
```

**Config structure:**

```typescript
interface WorksheetConfig {
	show_title?: boolean;
	show_date?: boolean;
	show_student_name?: boolean;
	show_class?: boolean;
	show_points?: boolean;
	numbering_style?: 'numeric' | 'alphabetic' | 'roman';
	shuffle_exercises?: boolean;
	shuffle_within_sections?: boolean;
	page_layout?: 'A4' | 'Letter';
	font_size?: number; // 8-24
	margins?: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
}
```

---

### 3. worksheet_sections

Optional sections to organize exercises within a worksheet.

```sql
CREATE TABLE worksheet_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  position INTEGER NOT NULL,
  points_total NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_sections_title_check
    CHECK (char_length(title) BETWEEN 1 AND 255),
  CONSTRAINT worksheet_sections_position_check
    CHECK (position >= 0),
  CONSTRAINT worksheet_sections_points_check
    CHECK (points_total IS NULL OR points_total >= 0),
  CONSTRAINT worksheet_sections_unique_position
    UNIQUE (worksheet_id, position)
);
```

**Index:**

```sql
CREATE INDEX idx_worksheet_sections_position ON worksheet_sections(worksheet_id, position);
```

---

### 4. worksheet_exercises

Junction table linking exercises to worksheets with variant configuration.

```sql
CREATE TABLE worksheet_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  section_id UUID REFERENCES worksheet_sections(id) ON DELETE SET NULL,

  position INTEGER NOT NULL,
  points NUMERIC(10, 2),

  -- Variant configuration
  variant_mode TEXT DEFAULT 'none',
  variant_config JSONB DEFAULT '{}'::JSONB,

  custom_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_exercises_position_check
    CHECK (position >= 0),
  CONSTRAINT worksheet_exercises_points_check
    CHECK (points IS NULL OR points >= 0),
  CONSTRAINT worksheet_exercises_variant_mode_check
    CHECK (variant_mode IN ('none', 'individual', 'n_versions', 'group'))
);
```

**Indexes:**

```sql
CREATE INDEX idx_worksheet_exercises_worksheet_id ON worksheet_exercises(worksheet_id);
CREATE INDEX idx_worksheet_exercises_exercise_id ON worksheet_exercises(exercise_id);
CREATE INDEX idx_worksheet_exercises_section_id ON worksheet_exercises(section_id)
  WHERE section_id IS NOT NULL;
CREATE INDEX idx_worksheet_exercises_position ON worksheet_exercises(worksheet_id, position);

-- Unique position within worksheet/section
CREATE UNIQUE INDEX idx_worksheet_exercises_unique_position
  ON worksheet_exercises(
    worksheet_id,
    COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::UUID),
    position
  );
```

**Variant config structure:**

```typescript
interface VariantConfig {
	mode?: 'none' | 'individual' | 'n_versions' | 'group';
	n_versions?: number; // For n_versions mode (max 50)
	group_size?: number; // For group mode (max 100)
	seed_base?: number; // Override seed
	parameter_overrides?: Record<string, unknown>; // Force specific values
}
```

---

### 5. worksheet_instances

Generated worksheet instances for specific students with resolved parameters.

```sql
CREATE TABLE worksheet_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Resolved data
  instance_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  variant_seed INTEGER NOT NULL,
  variant_version TEXT,

  -- Status tracking
  status TEXT DEFAULT 'generated',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_instances_seed_check
    CHECK (variant_seed >= 0),
  CONSTRAINT worksheet_instances_status_check
    CHECK (status IN ('generated', 'in_progress', 'submitted', 'graded')),
  CONSTRAINT worksheet_instances_time_check
    CHECK (time_spent_seconds >= 0),
  CONSTRAINT worksheet_instances_unique_student
    UNIQUE (worksheet_id, student_id)
);
```

**Indexes:**

```sql
CREATE INDEX idx_worksheet_instances_worksheet_id ON worksheet_instances(worksheet_id);
CREATE INDEX idx_worksheet_instances_student_id ON worksheet_instances(student_id);
CREATE INDEX idx_worksheet_instances_status ON worksheet_instances(status);
CREATE INDEX idx_worksheet_instances_generated_at ON worksheet_instances(generated_at DESC);
CREATE INDEX idx_worksheet_instances_variant_version ON worksheet_instances(variant_version)
  WHERE variant_version IS NOT NULL;
```

**Instance data structure:**

```typescript
interface InstanceData {
	exercises: ResolvedExercise[];
	exercise_order?: number[]; // If shuffled
	variant_info?: {
		seed: number;
		version?: string; // "A", "B", etc. for n_versions
		group_id?: string; // "G1", "G2", etc. for groups
	};
}

interface ResolvedExercise {
	exercise_id: string;
	position: number;
	parameters: Record<string, number | string>; // Resolved values
	statement: string; // Resolved markdown
	solution: string; // Resolved markdown
}
```

---

### 6. worksheet_assignments

Assigns worksheets to classes with timing and correction settings.

```sql
CREATE TABLE worksheet_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- Override settings
  title TEXT,
  instructions TEXT,
  individualized BOOLEAN DEFAULT true,

  -- Timing
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  available_from TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,

  -- Correction settings
  correction_release_mode TEXT DEFAULT 'manual',
  correction_release_at TIMESTAMPTZ,
  show_solutions_before_due BOOLEAN DEFAULT false,

  -- Submission settings
  allow_late_submission BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  time_limit_minutes INTEGER,

  status TEXT DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_assignments_attempts_check
    CHECK (max_attempts > 0),
  CONSTRAINT worksheet_assignments_time_limit_check
    CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT worksheet_assignments_release_mode_check
    CHECK (correction_release_mode IN ('manual', 'immediate', 'scheduled', 'after_due')),
  CONSTRAINT worksheet_assignments_status_check
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  CONSTRAINT worksheet_assignments_dates_check
    CHECK (
      (due_at IS NULL OR available_from <= due_at) AND
      (closes_at IS NULL OR due_at IS NULL OR due_at <= closes_at)
    )
);
```

**Indexes:**

```sql
CREATE INDEX idx_worksheet_assignments_worksheet_id ON worksheet_assignments(worksheet_id);
CREATE INDEX idx_worksheet_assignments_class_id ON worksheet_assignments(class_id)
  WHERE class_id IS NOT NULL;
CREATE INDEX idx_worksheet_assignments_created_by ON worksheet_assignments(created_by);
CREATE INDEX idx_worksheet_assignments_status ON worksheet_assignments(status);
CREATE INDEX idx_worksheet_assignments_due_at ON worksheet_assignments(due_at)
  WHERE due_at IS NOT NULL;
```

---

## Helper Functions

### Calculate Total Points

```sql
CREATE FUNCTION calculate_worksheet_total_points(p_worksheet_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(points)
     FROM worksheet_exercises
     WHERE worksheet_id = p_worksheet_id),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

### Generate Variant Seed

```sql
CREATE FUNCTION generate_variant_seed(
  p_worksheet_id UUID,
  p_student_id UUID,
  p_base_seed INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  seed_value INTEGER;
BEGIN
  IF p_base_seed IS NOT NULL THEN
    seed_value := p_base_seed + hashtext(p_student_id::TEXT) % 10000;
  ELSE
    seed_value := abs(hashtext(p_worksheet_id::TEXT || p_student_id::TEXT));
  END IF;
  RETURN seed_value % 2147483647;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## Triggers

### Updated At Trigger

All tables have automatic `updated_at` timestamps:

```sql
CREATE TRIGGER update_worksheets_updated_at
  BEFORE UPDATE ON worksheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Tampering Prevention Trigger

Prevents students from modifying their instance data:

```sql
CREATE FUNCTION prevent_worksheet_instance_tampering()
RETURNS TRIGGER AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Check if current user is worksheet owner or admin
  SELECT EXISTS (
    SELECT 1 FROM worksheets w
    JOIN profiles p ON p.id = auth.uid()
    WHERE w.id = OLD.worksheet_id
    AND (w.created_by = auth.uid() OR p.role = 'admin')
  ) INTO is_owner;

  IF is_owner THEN
    RETURN NEW;
  END IF;

  -- Students cannot modify critical fields
  IF OLD.instance_data IS DISTINCT FROM NEW.instance_data THEN
    RAISE EXCEPTION 'Cannot modify instance_data after generation';
  END IF;
  IF OLD.variant_seed IS DISTINCT FROM NEW.variant_seed THEN
    RAISE EXCEPTION 'Cannot modify variant_seed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_instance_tampering
  BEFORE UPDATE ON worksheet_instances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_worksheet_instance_tampering();
```

---

## Type Enums Reference

| Column                                          | Valid Values                                |
| ----------------------------------------------- | ------------------------------------------- |
| `worksheets.type`                               | worksheet, assessment, exam, quiz, homework |
| `worksheets.status`                             | draft, published, archived                  |
| `worksheet_exercises.variant_mode`              | none, individual, n_versions, group         |
| `worksheet_instances.status`                    | generated, in_progress, submitted, graded   |
| `worksheet_assignments.status`                  | draft, active, completed, cancelled         |
| `worksheet_assignments.correction_release_mode` | manual, immediate, scheduled, after_due     |
