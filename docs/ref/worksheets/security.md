# Worksheets Security

Security model for the worksheets system including Row Level Security (RLS) policies, validation, and access control.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│   Zod Validation + Role Middleware + Input Sanitization │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Database Layer                       │
│   RLS Policies + Triggers + Constraints                 │
└─────────────────────────────────────────────────────────┘
```

---

## Row Level Security (RLS)

All worksheet tables have RLS enabled:

```sql
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_assignments ENABLE ROW LEVEL SECURITY;
```

---

## Worksheets Policies

### View Worksheets

Teachers see their own, admins see school's, teachers in same school see published:

```sql
CREATE POLICY "Users can view worksheets"
  ON public.worksheets
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    -- Admins see all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- Teachers in same school see published
    (status = 'published' AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.id = auth.uid()
      AND p2.id = worksheets.created_by
      AND p1.school_id = p2.school_id
      AND p1.school_id IS NOT NULL
      AND p1.role = 'teacher'
    ))
  );
```

### Create Worksheets

Only teachers and admins:

```sql
CREATE POLICY "Teachers can create worksheets"
  ON public.worksheets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    ) AND created_by = auth.uid()
  );
```

### Update Worksheets

Owners and admins only:

```sql
CREATE POLICY "Users can update own worksheets"
  ON public.worksheets
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Delete Worksheets

Only draft worksheets by owners/admins:

```sql
CREATE POLICY "Users can delete own draft worksheets"
  ON public.worksheets
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'draft') OR
    (status = 'draft' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ))
  );
```

---

## Instance Security

### View Instances

Students see own, teachers see their worksheets:

```sql
-- Students see own instances
CREATE POLICY "Students can view own instances"
  ON public.worksheet_instances
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Teachers see instances of their worksheets
CREATE POLICY "Teachers can view worksheet instances"
  ON public.worksheet_instances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.worksheets
      WHERE id = worksheet_instances.worksheet_id
      AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Tampering Prevention

Database trigger prevents students from modifying critical instance data:

```sql
CREATE FUNCTION prevent_worksheet_instance_tampering()
RETURNS TRIGGER AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Check if current user is worksheet owner or admin
  SELECT EXISTS (
    SELECT 1 FROM public.worksheets w
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE w.id = OLD.worksheet_id
    AND (w.created_by = auth.uid() OR p.role = 'admin')
  ) INTO is_owner;

  -- Owners/admins can modify anything
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
  IF OLD.worksheet_id IS DISTINCT FROM NEW.worksheet_id THEN
    RAISE EXCEPTION 'Cannot modify worksheet_id';
  END IF;
  IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN
    RAISE EXCEPTION 'Cannot modify student_id';
  END IF;

  -- Allow legitimate updates
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_instance_tampering
  BEFORE UPDATE ON public.worksheet_instances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_worksheet_instance_tampering();
```

**Protected fields:**

- `instance_data` - Resolved exercises and parameters
- `variant_seed` - Seed used for generation
- `worksheet_id` - Reference to worksheet
- `student_id` - Reference to student

**Allowed student updates:**

- `status` - in_progress, submitted
- `time_spent_seconds` - Tracking
- `accessed_at`, `submitted_at` - Timestamps

---

## Assignment Policies

### Student Access

Students only see assignments for their active classes:

```sql
CREATE POLICY "Students can view class assignments"
  ON public.worksheet_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON c.id = cm.class_id
      WHERE cm.class_id = worksheet_assignments.class_id
      AND cm.student_id = auth.uid()
      AND c.is_active = TRUE
    )
  );
```

---

## Template Policies

### Public Templates

Anyone can view public templates:

```sql
CREATE POLICY "Users can view templates"
  ON public.worksheet_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## API Validation

### Input Validation with Zod

All API inputs are validated:

```typescript
// Example: Create worksheet validation
const validation = validateCreateWorksheet(await request.json());
if (!validation.success) {
	throw error(400, `Validation failed: ${validation.error.issues[0].message}`);
}
```

### Key Validation Rules

**String Lengths:**

- Title: 1-200 characters
- Description: max 5000 characters
- Instructions: max 5000 characters
- Template content: max 50000 characters

**Numeric Bounds:**

- Duration: 1-600 minutes
- Points: 0-10000
- Position: 0-1000
- n_versions: 1-50
- group_size: 1-100

**UUID Validation:**

```typescript
const uuidSchema = z.string().uuid('Invalid UUID format');
```

**Array Limits:**

- Grade levels: max 20
- Tags: max 30
- Exercises per batch: max 200
- Placeholders: max 50

---

## Role-Based Access

### API Middleware

```typescript
import { requireRoles } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	// Only teachers and admins reach here
};
```

### Role Permissions Matrix

| Action             | Student | Teacher        | Admin     |
| ------------------ | ------- | -------------- | --------- |
| View own instances | ✓       | -              | -         |
| View worksheets    | -       | Own            | School    |
| Create worksheets  | -       | ✓              | ✓         |
| Edit worksheets    | -       | Own            | Any       |
| Delete worksheets  | -       | Own draft      | Any draft |
| Create templates   | -       | ✓              | ✓         |
| Edit templates     | -       | Own            | Any       |
| Assign worksheets  | -       | ✓              | ✓         |
| View all instances | -       | Own worksheets | School    |

---

## Typst Security

### Content Escaping

User content is escaped before Typst rendering:

```typescript
import { escapeTypst } from '$lib/custom-markdown';

// Escapes: \ # $ [ ]
const safeContent = escapeTypst(userInput);
```

### Template Validation

Templates are validated for:

- Maximum length (50000 chars)
- No executable code injection
- Valid placeholder syntax

---

## Database Constraints

### Foreign Key Constraints

```sql
-- Cascade delete for related data
worksheet_id UUID NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE

-- Set null for optional references
template_id UUID REFERENCES public.worksheet_templates(id) ON DELETE SET NULL
```

### Check Constraints

```sql
-- Status must be valid enum
CONSTRAINT worksheets_status_check
  CHECK (status IN ('draft', 'published', 'archived'))

-- Duration must be positive
CONSTRAINT worksheets_duration_check
  CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0)

-- Position must be non-negative
CONSTRAINT worksheet_sections_position_check
  CHECK (position >= 0)
```

### Unique Constraints

```sql
-- One instance per student per worksheet
CONSTRAINT worksheet_instances_unique_student
  UNIQUE (worksheet_id, student_id)

-- Unique position within section
CREATE UNIQUE INDEX idx_worksheet_exercises_unique_position
  ON worksheet_exercises(
    worksheet_id,
    COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::UUID),
    position
  );
```

---

## Audit Trail

### Timestamps

All tables track:

- `created_at` - Creation timestamp
- `updated_at` - Last modification (auto-updated by trigger)

### Instance Tracking

Instances track student interaction:

- `generated_at` - When instance was created
- `accessed_at` - First access timestamp
- `submitted_at` - Submission timestamp
- `time_spent_seconds` - Total time spent

---

## Security Checklist

### For New Features

- [ ] RLS policy covers all CRUD operations
- [ ] API endpoint validates all inputs with Zod
- [ ] Role-based middleware checks permissions
- [ ] User content is properly escaped
- [ ] Foreign keys have appropriate ON DELETE
- [ ] Sensitive fields protected from modification

### Vulnerability Prevention

| Threat               | Mitigation                         |
| -------------------- | ---------------------------------- |
| SQL Injection        | Parameterized queries via Supabase |
| XSS                  | Escape user content in Typst       |
| CSRF                 | SvelteKit CSRF protection          |
| Privilege Escalation | RLS + API middleware               |
| Data Tampering       | Database triggers                  |
| Enumeration          | UUID primary keys                  |
