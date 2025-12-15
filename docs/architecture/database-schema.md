# Database Schema Documentation

This document describes the database schema for the UbuMaths educational math application.

## Overview

The database is designed to support a complete math learning platform with:

- **User Management**: Students, teachers, and admins
- **School Management**: Multi-school support with school profiles
- **Academic Calendar**: School years, academic periods (trimesters/semesters), holidays
- **Student Management**: Behavioral warnings and monitoring
- **Classroom Management**: Classes and class memberships
- **Friend System**: Mutual friendships with request/accept workflow
- **Real-Time Presence**: WebSocket-based online/offline status
- **Chat Moderation**: User restrictions and moderation audit trail (NEW: 2025-11-10)
- **Error Monitoring**: Comprehensive error logging and tracking system
- **Achievements System**: Universal achievement tracking across all features (NEW: 2025-11-21)
- **Chapter Templates**: Reusable chapter templates with versioning and sharing (NEW: 2025-12-10)
- **View Security**: All views use `security_invoker = true` to respect RLS policies (NEW: 2025-12-14)
- **Secure RPC Functions**: Role-based data access via `get_assessment_results_for_*` and `get_*_exercise_assignments` (NEW: 2025-12-14)

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    ↓
profiles (user_role: student/teacher/admin) ← pending_students (pre-populated)
    ↓
    ├─→ schools (school_id FK)
    │       ├─ name, city, country (unique)
    │       ├─ address, logo_url, is_active
    │       └─→ school_years (school_id FK)
    │               └─→ academic_periods (school_year_id FK)
    │                       └─→ student_warnings (academic_period_id FK) [NEW]
    │                               ├─ student_id → profiles
    │                               ├─ class_id → classes
    │                               ├─ created_by → profiles (teacher)
    │                               └─ warning_type: C/M/R/T
    │
    ├─→ classes (teacher_id, school_id FK) → class_members (students)
    │
    ├─→ friendships (requester_id, addressee_id FK) [mutual friend system]
    │       └─ status: pending/accepted/rejected
    │       └─ friendship_type: classmate/mentor
    │
    ├─→ user_restrictions (user_id FK) [chat moderation - NEW: 2025-11-10]
    │       ├─ scope: conversation/global
    │       ├─ restriction_type: mute/timeout/ban
    │       ├─ restricted_by → profiles (teacher/admin)
    │       └─ expires_at (NULL = permanent)
    │
    ├─→ moderation_logs (moderator_id FK) [audit trail - NEW: 2025-11-10]
    │       ├─ action: delete_message/mute_user/ban_user/etc
    │       ├─ target_type: message/user/conversation
    │       └─ metadata (JSONB, NO message content)
    │
    └─→ user_presence (user_id FK) [real-time online/offline status]
            └─ WebSocket heartbeat (60s interval)
```

## Tables

### Core User Tables

#### `schools`

Educational institutions where students and teachers belong.

| Column     | Type        | Description                                                                        |
| ---------- | ----------- | ---------------------------------------------------------------------------------- |
| id         | UUID (PK)   | School ID                                                                          |
| name       | TEXT        | School name                                                                        |
| city       | TEXT        | City location                                                                      |
| country    | TEXT        | Country location                                                                   |
| address    | TEXT        | Optional full address                                                              |
| logo_url   | TEXT        | Optional school logo                                                               |
| is_active  | BOOLEAN     | Whether school is active                                                           |
| timezone   | TEXT        | IANA timezone (e.g., 'Europe/Paris', 'America/New_York') [NEW: 2025-11-13]         |
| timetable  | JSONB       | School-level timetable configuration (periods + week config) [UPDATED: 2025-11-13] |
| created_at | TIMESTAMPTZ | Creation time                                                                      |
| updated_at | TIMESTAMPTZ | Last update time                                                                   |

**Unique Constraint**: (name, city, country) combination must be unique.

**Timetable Structure**:

```json
{
	"periods": [
		{
			"number": 1,
			"name": "Period 1", // Optional custom name
			"start_time": "07:00:00",
			"end_time": "08:00:00"
		},
		{
			"number": 2,
			"start_time": "08:00:00",
			"end_time": "09:00:00"
		}
	],
	"week_config": {
		"first_day": 0, // 0=Sunday, 1=Monday, ..., 6=Saturday
		"last_day": 6, // Last day of the school week
		"school_days": [0, 1, 2, 3, 4], // Array of school days (Israeli: Sun-Thu)
		"weekend_days": [5, 6] // Array of weekend days (Israeli: Fri-Sat)
	}
}
```

**Week Configuration Examples**:

```json
// Israeli school week (Sunday-Thursday)
{
	"first_day": 0,
	"last_day": 6,
	"school_days": [0,1,2,3,4],
	"weekend_days": [5,6]
}

// Western school week (Monday-Friday)
{
	"first_day": 1,
	"last_day": 0,
	"school_days": [1,2,3,4,5],
	"weekend_days": [6,0]
}

// Middle Eastern school week (Saturday-Wednesday)
{
	"first_day": 6,
	"last_day": 5,
	"school_days": [6,0,1,2,3],
	"weekend_days": [4,5]
}
```

**Notes**:

- The `timezone` field determines when daily summaries and weekly rewards are calculated
- The `week_config` defines the school week structure for weekly reward calculations
- Default timezone: 'Europe/Paris'
- Default week_config: Israeli calendar (Sunday-Thursday school week)

The timetable defines standardized periods that teachers must use when creating class schedules. All periods are identical across all days of the week (Sunday-Thursday).

**RLS Policies**:

- Anyone can view schools (needed for registration/selection)
- Only admins can insert, update, or delete schools

**Caching** (NEW: 2025-10-29):

School data is cached using Redis (Tier 2 cache):

- **Module**: `src/lib/server/cache/schools.ts`
- **Cache Key**: `school:{schoolId}:data`
- **TTL**: 1 hour
- **Purpose**: Multiple teachers at same school share cached timetable data
- **Invalidation**: Manual after timetable updates via admin API
- **Performance**: 98% reduction in DB queries for schools with multiple teachers

See [Hybrid Cache System](hybrid-cache-system.md) for full architecture.

#### `profiles`

Extends Supabase's `auth.users` with application-specific data.

| Column          | Type        | Description                                                                      |
| --------------- | ----------- | -------------------------------------------------------------------------------- |
| id              | UUID (PK)   | References auth.users(id)                                                        |
| email           | TEXT        | User's email                                                                     |
| full_name       | TEXT        | User's full name (deprecated)                                                    |
| firstname       | TEXT        | User's first name                                                                |
| lastname        | TEXT        | User's last name                                                                 |
| role            | user_role   | 'student', 'teacher', or 'admin'                                                 |
| school_id       | UUID (FK)   | References schools(id)                                                           |
| avatar_url      | TEXT        | URL to user's avatar image                                                       |
| class_ids       | UUID[]      | Array of class IDs (automatically synced from `class_members` table via trigger) |
| grade           | TEXT        | Student's grade level (e.g., "6ème", "5ème", "4ème", "3ème")                     |
| gender          | TEXT        | User's gender ('boy' or 'girl') for avatar fallback purposes                     |
| gidouilles      | INTEGER     | Student currency/points for rewards system (default: 0)                          |
| bonus           | INTEGER     | Student bonus points for special achievements (default: 0)                       |
| vip_cards       | JSONB       | JSON object storing student VIP cards and their properties                       |
| python_settings | JSONB       | Python playground preferences (editorTheme, fontSize, showPedagogicErrors) [NEW] |
| created_at      | TIMESTAMPTZ | Account creation time                                                            |
| updated_at      | TIMESTAMPTZ | Last update time                                                                 |

**Note on Student-Teacher Relationship**:
Students don't have a single `teacher_id` because they have different teachers for each class. To find a student's teacher for a specific class, query: `class_members` → `classes.teacher_id`.

**Note on class_ids Column**:
The `class_ids` array is maintained for backward compatibility but is NOT the source of truth. The `class_members` table is the authoritative source for class memberships. A trigger automatically syncs changes from `class_members` to `class_ids` to keep them in sync. Always use `class_members` table when querying or modifying class memberships.

**Automatic Creation**: A trigger automatically creates a profile when a user signs up.

**RLS Policies**:

- Users can view and update their own profile (limited fields)
- Admins can view and update all profiles (including role, school, classes)
- Profile creation allowed (for signup trigger)

**Caching** (NEW: 2025-10-29):

Profile role data is cached using in-memory cache (Tier 1):

- **Module**: `src/lib/server/cache/profile.ts`
- **Cache Key**: `profile:{userId}:role`
- **TTL**: 15 minutes
- **Purpose**: Eliminate redundant role checks during dashboard navigation and API requests
- **Invalidation**: Manual after admin role changes
- **Performance**: 99% reduction in profile queries (20+ queries per dashboard visit → 1 per 15 min)
- **Latency**: <1ms (memory lookup, no network roundtrip)

See [Hybrid Cache System](hybrid-cache-system.md) for full architecture.

### Academic Calendar Tables

> 🆕 2025-10-28

The academic calendar system manages school years, teaching periods (trimesters/semesters), and vacation schedules. See [Academic Periods Feature Documentation](../features/academic-periods/README.md) for complete details.

#### `school_years`

Academic year definitions (e.g., "2024-2025") with one active year per school.

| Column     | Type        | Description                                 |
| ---------- | ----------- | ------------------------------------------- |
| id         | UUID (PK)   | School year ID                              |
| school_id  | UUID (FK)   | References schools(id)                      |
| name       | TEXT        | Year name (format: "YYYY-YYYY")             |
| start_date | DATE        | Academic year start date                    |
| end_date   | DATE        | Academic year end date                      |
| is_active  | BOOLEAN     | Active year flag (only one per school)      |
| metadata   | JSONB       | Extensible metadata (region, custom fields) |
| created_at | TIMESTAMPTZ | Creation time                               |
| updated_at | TIMESTAMPTZ | Last update time                            |

**Constraints**:

- `UNIQUE (school_id, name)` - Unique year name per school
- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)` - Only one active year per school

**Indexes**:

- `idx_school_years_school` ON (school_id)
- `idx_school_years_active` ON (school_id, is_active) WHERE is_active = true

**RLS Policies**:

- Admins: Full CRUD access for their school
- Teachers: Read-only access for their school

**Migration**: `20251028120000_create_school_years.sql`

---

#### `academic_periods`

Teaching periods (trimesters, semesters, quarters) within school years.

| Column         | Type        | Description                                               |
| -------------- | ----------- | --------------------------------------------------------- |
| id             | UUID (PK)   | Period ID                                                 |
| school_year_id | UUID (FK)   | References school_years(id)                               |
| type           | TEXT        | Period type: 'trimester', 'semester', 'quarter', 'custom' |
| name           | TEXT        | Period name (e.g., "Trimestre 1")                         |
| start_date     | DATE        | Period start date                                         |
| end_date       | DATE        | Period end date                                           |
| period_order   | INTEGER     | Sequential order (1-10)                                   |
| color          | TEXT        | Hex color for UI (#RRGGBB, default: #3b82f6)              |
| metadata       | JSONB       | Extensible metadata                                       |
| created_at     | TIMESTAMPTZ | Creation time                                             |
| updated_at     | TIMESTAMPTZ | Last update time                                          |

**Constraints**:

- `CHECK (end_date > start_date)` - Valid date range
- `UNIQUE (school_year_id, period_order)` - Unique order per year
- `CHECK (type IN ('trimester', 'semester', 'quarter', 'custom'))` - Valid period type
- `CHECK (period_order > 0)` - Positive order

**Indexes**:

- `idx_academic_periods_year` ON (school_year_id)
- `idx_academic_periods_order` ON (school_year_id, period_order)

**RLS Policies**:

- Admins: Full CRUD access for their school's years
- Teachers: Read-only access for their school's years

**Migration**: `20251028120100_create_academic_periods.sql`

---

#### `school_holidays`

School vacation periods within academic years.

| Column         | Type        | Description                             |
| -------------- | ----------- | --------------------------------------- |
| id             | UUID (PK)   | Holiday ID                              |
| school_year_id | UUID (FK)   | References school_years(id)             |
| name           | TEXT        | Holiday name (e.g., "Vacances de Noël") |
| start_date     | DATE        | Holiday start date                      |
| end_date       | DATE        | Holiday end date                        |
| created_at     | TIMESTAMPTZ | Creation time                           |
| updated_at     | TIMESTAMPTZ | Last update time                        |

**Constraints**:

- `CHECK (end_date > start_date)` - Valid date range

**Indexes**:

- `idx_school_holidays_year` ON (school_year_id)
- `idx_school_holidays_dates` ON (start_date, end_date)

**RLS Policies**:

- Admins: Full CRUD access for their school's years
- Teachers: Read-only access for their school's years

**Migration**: `20251028120200_create_school_holidays.sql`

---

#### `assessments` (Extended)

**Added Column** (2025-10-28):

| Column             | Type                | Description                     |
| ------------------ | ------------------- | ------------------------------- |
| academic_period_id | UUID (FK, nullable) | References academic_periods(id) |

**Purpose**: Links assessments to academic periods for report card generation and statistics. Auto-assigned by trigger based on assessment creation date.

**Index**:

- `idx_assessments_period` ON (academic_period_id)

**Trigger**: `auto_assign_assessment_period` - Automatically links new assessments to matching period based on created_at date and active school year.

**Migration**: `20251028120300_link_assessments_to_periods.sql`

**Related Documentation**: See [Assessment System](../features/assessments/) for full details.

---

### Student Management Tables

> 🆕 2025-10-29

#### `student_warnings`

Tracks student behavioral warnings issued by teachers during academic periods. Used for student monitoring, behavior reports, and calculating student behavior scores.

| Column             | Type        | Description                                              |
| ------------------ | ----------- | -------------------------------------------------------- |
| id                 | UUID (PK)   | Warning ID                                               |
| student_id         | UUID (FK)   | References profiles(id) ON DELETE CASCADE                |
| class_id           | UUID (FK)   | References classes(id) ON DELETE CASCADE                 |
| academic_period_id | UUID (FK)   | References academic_periods(id) ON DELETE CASCADE        |
| warning_type       | TEXT        | Warning type: 'C', 'M', 'R', or 'T' (see types below)    |
| created_by         | UUID (FK)   | Teacher who issued the warning (references profiles(id)) |
| created_at         | TIMESTAMPTZ | Warning issue time                                       |
| updated_at         | TIMESTAMPTZ | Last update time                                         |

**Warning Types**:

- **C** (Conduite): Behavioral issues (conduct)
- **M** (Manque de Travail): Lack of work/homework not completed
- **R** (Retard): Tardiness
- **T** (Tricherie): Cheating

**Constraints**:

- `CHECK (warning_type IN ('C', 'M', 'R', 'T'))` - Valid warning types only

**Indexes**:

- `idx_warnings_student_period` ON (student_id, academic_period_id) - Fast lookup of student warnings per period
- `idx_warnings_class_period` ON (class_id, academic_period_id) - Fast lookup of class warnings per period
- `idx_warnings_created_by` ON (created_by) - Fast lookup of warnings by teacher

**RLS Policies**:

- **SELECT**: Teachers can view all warnings for students in their classes
  - Policy: `teachers_select_own_class_warnings`
  - Uses: `is_class_teacher(class_id)` function
- **INSERT**: Teachers can create warnings for students in their classes
  - Policy: `teachers_insert_own_class_warnings`
  - Ensures: `created_by = auth.uid()` (teacher can only create warnings as themselves)
- **DELETE**: Teachers can delete warnings they personally created
  - Policy: `teachers_delete_own_warnings`
  - Ensures: `created_by = auth.uid()` AND `is_class_teacher(class_id)`

**Triggers**:

- `update_student_warnings_updated_at` - Automatically updates `updated_at` timestamp on row modifications

**Behavior Score Calculation**:

Student behavior scores are calculated using the formula:

```
Score = 20 - (total_warnings)
```

For example:

- 0 warnings = 20/20 (perfect score)
- 3 warnings = 17/20
- 20+ warnings = 0/20 (minimum)

**Common Query Patterns**:

```sql
-- Get all warnings for a student in current period
SELECT w.*, p.firstname, p.lastname, p.email as teacher_email
FROM student_warnings w
JOIN profiles p ON p.id = w.created_by
WHERE w.student_id = $1
  AND w.academic_period_id = $2
ORDER BY w.created_at DESC;

-- Calculate student behavior score for current period
SELECT
  student_id,
  20 - COUNT(*) as behavior_score
FROM student_warnings
WHERE student_id = $1
  AND academic_period_id = $2
GROUP BY student_id;

-- Get warning breakdown by type for a student
SELECT
  warning_type,
  COUNT(*) as count
FROM student_warnings
WHERE student_id = $1
  AND academic_period_id = $2
GROUP BY warning_type
ORDER BY warning_type;

-- Get all warnings issued by a teacher
SELECT w.*, s.firstname as student_firstname, s.lastname as student_lastname
FROM student_warnings w
JOIN profiles s ON s.id = w.student_id
WHERE w.created_by = $1
  AND w.academic_period_id = $2
ORDER BY w.created_at DESC;

-- Get class-wide warning statistics
SELECT
  w.warning_type,
  COUNT(*) as total_warnings,
  COUNT(DISTINCT w.student_id) as students_affected
FROM student_warnings w
WHERE w.class_id = $1
  AND w.academic_period_id = $2
GROUP BY w.warning_type;
```

**Test Mode Filtering** (2025-10-29):

**Note**: The `student_warnings` table does not include an `is_test` column. To filter warnings by test mode (real vs test students), queries must join with the `profiles` table through `class_members`:

```sql
-- Get warnings filtered by test mode
SELECT w.*
FROM student_warnings w
JOIN class_members cm ON cm.student_id = w.student_id AND cm.class_id = w.class_id
JOIN profiles p ON p.id = cm.student_id
WHERE w.class_id = $1
  AND w.academic_period_id = $2
  AND p.is_test = $3  -- Filter by test mode (true/false)
ORDER BY w.created_at DESC;
```

This filtering is implemented in `getClassWarnings()` (`src/lib/server/cache/warnings.ts`) to prevent warnings for test students from appearing when viewing real students, and vice versa.

**Use Cases**:

1. **Teacher Dashboard**: Teachers can view, add, and remove warnings for students in their classes
2. **Student Reports**: Generate behavior reports showing warning counts by type per period
3. **Parent Communication**: Export warning history for parent-teacher conferences
4. **Behavior Trends**: Analyze warning patterns across periods, classes, or students
5. **Report Cards**: Automatically calculate behavior scores for inclusion in academic reports

**Migration**: `20251029013121_create_student_warnings.sql`

---

### VIP Card System Tables

#### `vip_card_templates`

Stores all VIP card definitions with rarity, category, and enabled status. This is the **source of truth** for card drawing. The TypeScript `VIP_CARDS` array (`src/lib/types/vip-card.ts`) is used for UI display only.

| Column        | Type        | Description                                                    |
| ------------- | ----------- | -------------------------------------------------------------- |
| `id`          | TEXT (PK)   | Card ID (matches TypeScript VipCard.id)                        |
| `name`        | TEXT        | French display name                                            |
| `description` | TEXT        | French description of privilege                                |
| `image_path`  | TEXT        | Path to card image (WebP format)                               |
| `category`    | TEXT        | bonus, privilege, social, power (nullable)                     |
| `rarity`      | TEXT        | common, rare, epic, legendary (**required**)                   |
| `is_enabled`  | BOOLEAN     | Whether card can be drawn (default: TRUE)                      |
| `action`      | JSONB       | Optional action definition (draw_cards, remove_warnings, etc.) |
| `sort_order`  | INTEGER     | Sorting order for UI display (default: 0)                      |
| `created_at`  | TIMESTAMPTZ | Creation timestamp                                             |
| `updated_at`  | TIMESTAMPTZ | Last update timestamp                                          |

**Card Distribution** (26 total):

- **Common** (8): 6 enabled, 2 disabled (candy, captain)
- **Rare** (10): 9 enabled, 1 disabled (team)
- **Epic** (6): All enabled
- **Legendary** (2): All enabled

**Enabled Cards** (23 total): Available for drawing
**Disabled Cards** (3): candy, captain, team (commented out in TypeScript)

**Indexes**:

- `idx_vip_card_templates_rarity` on `rarity`
- `idx_vip_card_templates_enabled` on `is_enabled`
- `idx_vip_card_templates_category` on `category`

**RLS Policies**:

- Authenticated users: `SELECT` (read-only)
- Admins: `INSERT`, `UPDATE`, `DELETE` (via `is_admin()` function)

**Trigger**: `set_updated_at_vip_card_templates` updates `updated_at` column

---

#### `vip_card_config`

Stores rarity probability configurations. Only one config can be active at a time. Used by `draw_multiple_vip_cards()` to determine card rarity distribution.

| Column                  | Type        | Description                                     |
| ----------------------- | ----------- | ----------------------------------------------- |
| `id`                    | UUID (PK)   | Config ID                                       |
| `config_name`           | TEXT        | Unique name (e.g., 'default', 'halloween_2025') |
| `common_probability`    | INTEGER     | Probability for common cards (0-100)            |
| `rare_probability`      | INTEGER     | Probability for rare cards (0-100)              |
| `epic_probability`      | INTEGER     | Probability for epic cards (0-100)              |
| `legendary_probability` | INTEGER     | Probability for legendary cards (0-100)         |
| `is_active`             | BOOLEAN     | Whether this config is currently active         |
| `description`           | TEXT        | Optional description of event or purpose        |
| `valid_from`            | TIMESTAMPTZ | Optional start date for scheduled events        |
| `valid_until`           | TIMESTAMPTZ | Optional end date for scheduled events          |
| `created_at`            | TIMESTAMPTZ | Creation timestamp                              |
| `updated_at`            | TIMESTAMPTZ | Last update timestamp                           |

**Constraint**: All four probability columns must sum to exactly 100.

**Unique Constraint**: Only ONE config can have `is_active = TRUE` at any time (enforced by partial unique index).

**Default Config**:

```sql
config_name: 'default'
common_probability: 60
rare_probability: 25
epic_probability: 12
legendary_probability: 3
```

**RLS Policies**:

- Authenticated users: `SELECT WHERE is_active = TRUE` (see active config only)
- Admins: `SELECT` all configs, `INSERT`, `UPDATE`, `DELETE`

**Trigger**: `set_updated_at_vip_card_config` updates `updated_at` column

---

#### Example: Creating Event Configuration

```sql
-- Create Halloween event with boosted legendary drops
INSERT INTO vip_card_config (
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description,
  valid_from,
  valid_until
) VALUES (
  'halloween_2025',
  40, 30, 20, 10, -- Boosted legendary (10% instead of 3%)
  FALSE, -- Not active yet
  'Halloween 2025: Spooky legendary cards everywhere!',
  '2025-10-25 00:00:00+00',
  '2025-11-01 23:59:59+00'
);

-- Activate event (deactivate current config first)
BEGIN;
UPDATE vip_card_config SET is_active = FALSE WHERE is_active = TRUE;
UPDATE vip_card_config SET is_active = TRUE WHERE config_name = 'halloween_2025';
COMMIT;
```

---

#### Helper Function: `is_admin()`

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
```

Used by RLS policies to restrict admin-only operations.

**Migration**: `20251104115149_add_vip_card_templates_tables.sql`

---

#### `teacher_vip_card_overrides`

Stores teacher-specific card enable/disable preferences that apply to ALL their classes. Teachers can restrict which VIP cards their students can draw, but cannot enable cards that admins have disabled globally.

**Schema**:

| Column       | Type        | Constraints                                                      | Description                      |
| ------------ | ----------- | ---------------------------------------------------------------- | -------------------------------- |
| `id`         | UUID        | PRIMARY KEY, default gen_random_uuid()                           | Unique identifier                |
| `teacher_id` | UUID        | FOREIGN KEY → profiles(id) ON DELETE CASCADE, NOT NULL           | Teacher who set this override    |
| `card_id`    | TEXT        | FOREIGN KEY → vip_card_templates(id) ON DELETE CASCADE, NOT NULL | Card being overridden            |
| `is_enabled` | BOOLEAN     | NOT NULL                                                         | Whether teacher allows this card |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW()                                          | When override was created        |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default NOW()                                          | Last modification timestamp      |

**Constraints**:

- `UNIQUE (teacher_id, card_id)` - One override per teacher per card
- `ON DELETE CASCADE` for both foreign keys

**Indexes**:

- `idx_teacher_overrides_teacher` on `teacher_id`
- `idx_teacher_overrides_card` on `card_id`
- `idx_teacher_overrides_enabled` on `is_enabled`
- `idx_teacher_overrides_teacher_card_enabled` on `(teacher_id, card_id, is_enabled)` - Composite for fast lookups

**RLS Policies**:

- Teachers can `SELECT`, `INSERT`, `UPDATE`, `DELETE` their own overrides (`teacher_id = auth.uid()`)
- Admins can `SELECT` all overrides (read-only)

**Intersection Logic**:

When a student draws a card, the system checks ALL their teachers' overrides. If ANY teacher has set `is_enabled = FALSE` for a card, that card is blocked for the student, even if other teachers haven't set an override (which defaults to global setting).

**Example**:

- Student has 2 teachers: Alice and Bob
- Alice disables "candy" card (`is_enabled = FALSE`)
- Bob has no overrides (uses global settings)
- **Result**: Student CANNOT draw "candy" (Alice's override blocks it)

This is called **intersection logic** - the most restrictive setting wins.

**Hierarchy of Permissions**:

1. **Admin global enable/disable** (most powerful) - If admin disables a card globally, NO ONE can draw it
2. **Teacher overrides** (medium power) - Teachers can disable cards for their students but cannot enable globally disabled cards
3. **Probability config** (applies to enabled cards only)

**SQL Query for Drawing Cards**:

```sql
-- Filter out cards disabled by ANY teacher
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_vip_card_overrides
  WHERE card_id = vct.id
    AND is_enabled = FALSE
    AND teacher_id IN (
      SELECT teacher_id FROM classes c
      JOIN class_members cm ON cm.class_id = c.id
      WHERE cm.student_id = p_student_id
    )
)
```

**Performance**: Composite index on `(teacher_id, card_id, is_enabled)` ensures fast filtering (~2-5ms overhead per draw).

**Trigger**: `set_updated_at_teacher_vip_card_overrides` updates `updated_at` column

**Migration**: `20251104120000_add_teacher_vip_card_overrides.sql`

---

#### Storage Bucket: `vip-card-images`

Stores custom VIP card images uploaded by admins.

**Configuration**:

- **Public**: YES (images publicly accessible via URL)
- **Max file size**: 5MB
- **Allowed MIME types**: `image/webp`, `image/jpeg`, `image/png`, `image/gif`, `image/svg+xml`

**RLS Policies**:

- Public can `SELECT` (view) images
- Admins can `INSERT` (upload) images
- Admins can `DELETE` images
- Admins can `UPDATE` image metadata

**File naming convention**: `{card_id}@0.5x.webp`

**Example**: For card ID "fortune", image is stored at `vip-card-images/fortune@0.5x.webp`

**Public URL Format**:

```
https://[project-ref].supabase.co/storage/v1/object/public/vip-card-images/fortune@0.5x.webp
```

**Usage**:

Admins upload images via `/dashboard/admin/vip-cards` interface. The `vip_card_templates.image_path` field is automatically updated to reference the new image.

**Image Requirements**:

- Format: WebP preferred (PNG, JPEG, GIF, SVG also supported)
- Max size: 5MB (enforced by bucket policy)
- Recommended dimensions: 256x256 pixels or 512x512 pixels
- Compression: Use tools like [Squoosh](https://squoosh.app/) or `cwebp` CLI

**Migration**: `20251104130000_create_vip_card_images_storage_bucket.sql`

---

### Classroom Management Tables

#### `classes`

Teacher-created groups of students within a school.

| Column      | Type          | Description                           |
| ----------- | ------------- | ------------------------------------- |
| id          | UUID (PK)     | Class ID                              |
| teacher_id  | UUID (FK)     | Teacher who owns class                |
| school_id   | UUID (FK)     | School this class belongs to          |
| name        | TEXT          | Class name                            |
| description | TEXT          | Class description                     |
| join_code   | TEXT (UNIQUE) | 6-character code for students to join |
| is_active   | BOOLEAN       | Whether class is active               |
| created_at  | TIMESTAMPTZ   | Creation time                         |
| updated_at  | TIMESTAMPTZ   | Last update time                      |

**Automatic Join Code**: A function generates unique 6-character codes.

#### `class_members`

Students enrolled in classes. **This is the source of truth for class memberships.**

| Column     | Type        | Description         |
| ---------- | ----------- | ------------------- |
| id         | UUID (PK)   | Membership ID       |
| class_id   | UUID (FK)   | Class               |
| student_id | UUID (FK)   | Student             |
| joined_at  | TIMESTAMPTZ | When student joined |

**Unique Constraint**: A student can only join each class once (student_id, class_id).

**Automatic Synchronization**: Changes to this table automatically update the `profiles.class_ids` array via trigger for backward compatibility. Always modify class memberships through this table, not the `class_ids` array.

#### `class_schedules`

Weekly recurring schedules for teacher's classes (Sunday-Thursday).

| Column        | Type        | Description                                                            |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| id            | UUID (PK)   | Schedule entry ID                                                      |
| class_id      | UUID (FK)   | References classes(id) ON DELETE CASCADE                               |
| teacher_id    | UUID (FK)   | References profiles(id) ON DELETE CASCADE                              |
| day_of_week   | INTEGER     | Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday    |
| start_time    | TIME        | Session start time (derived from period, e.g., 08:00:00)               |
| end_time      | TIME        | Session end time (derived from period, e.g., 09:00:00)                 |
| period_number | INTEGER     | Links to period number in school timetable (source of truth for times) |
| subject       | TEXT        | Optional subject/topic name                                            |
| room          | TEXT        | Optional room number or location                                       |
| notes         | TEXT        | Optional notes or description                                          |
| created_at    | TIMESTAMPTZ | Creation time                                                          |
| updated_at    | TIMESTAMPTZ | Last update time                                                       |

**Constraints**:

- `day_of_week` must be between 0-4 (Sunday-Thursday)
- `end_time` must be greater than `start_time`

**Important**: The `period_number` field links to the school's timetable configuration. When a teacher creates a schedule entry, they select a period from the school timetable, and the `start_time` and `end_time` are automatically populated from that period. This ensures consistency across all classes in the school.

**Indexes**:

- `idx_class_schedules_class_id` - Fast lookup by class
- `idx_class_schedules_teacher_id` - Fast lookup by teacher
- `idx_class_schedules_day` - Fast lookup by day of week
- `idx_class_schedules_period` - Fast lookup by period number
- `idx_class_schedules_composite` - Composite index on (class_id, day_of_week, start_time)

**RLS Policies**:

- Teachers can view, create, update, and delete schedules for their own classes
- Students can view schedules for classes they're enrolled in
- Admins can view and manage all schedules

**Usage**:
Teachers use this table to define their weekly class schedules. The schedule is displayed as a grid in the teacher dashboard at `/dashboard/teacher/classes`, showing Sunday through Thursday with time slots from 7:00 to 18:00.

#### `pending_students`

Pre-populated student data before first authentication.

| Column       | Type          | Description                                      |
| ------------ | ------------- | ------------------------------------------------ |
| id           | UUID (PK)     | Pending student ID                               |
| email        | TEXT (UNIQUE) | Student's email (must match Google account)      |
| firstname    | TEXT          | Student's first name                             |
| lastname     | TEXT          | Student's last name                              |
| grade        | TEXT          | Student's grade level (e.g., "6ème", "5ème")     |
| school_id    | UUID (FK)     | References schools(id)                           |
| gender       | TEXT          | 'boy' or 'girl' for avatar fallback              |
| is_activated | BOOLEAN       | True when student has logged in (default: false) |
| activated_at | TIMESTAMPTZ   | When student first authenticated                 |
| created_at   | TIMESTAMPTZ   | Creation time                                    |
| updated_at   | TIMESTAMPTZ   | Last update time                                 |

**Purpose**: Allows admins to pre-populate students before they log in with Google for the first time. When a student authenticates, the `handle_new_user()` trigger checks this table and creates their profile with pre-populated data.

**Workflow**:

1. **Teachers create classes** - Each class gets a unique `join_code` (e.g., MATH6A)
2. **Admin imports students** via CSV at `/dashboard/admin/import-students` with class codes
3. **System validates** class codes against existing classes (rejects invalid codes)
4. Students stored in `pending_students` with `class_ids` array (resolved from codes)
5. **Student logs in with Google** - Trigger checks for matching email
6. Profile created with pre-populated data + **auto-enrolled in classes**
7. Student marked as activated, immediately has access to all assigned classes

**Important**: Class codes in import MUST match existing `join_code` values from the `classes` table. Admins cannot invent arbitrary codes.

**RLS Policies**:

- Only admins can view, insert, update, or delete pending students

### Chapter Templates System (NEW: 2025-12-10)

Reusable chapter templates that teachers can create, share, version, and instantiate across multiple classes.

#### `chapter_templates`

Reusable chapter templates with versioning and public/private sharing.

| Column              | Type        | Description                                              |
| ------------------- | ----------- | -------------------------------------------------------- |
| id                  | UUID (PK)   | Template ID                                              |
| created_by          | UUID (FK)   | Teacher who created this template → profiles(id)         |
| status              | TEXT        | Template status: 'draft', 'published', 'archived'        |
| is_public           | BOOLEAN     | Whether template is visible to all teachers              |
| title               | TEXT        | Template title (required, non-empty)                     |
| description         | TEXT        | Optional template description                            |
| grades              | TEXT[]      | Target grade levels (e.g., ['6eme', '5eme'])             |
| color               | TEXT        | Hex color code for UI styling (e.g., '#3B82F6')          |
| icon                | TEXT        | Emoji or icon identifier for visual representation       |
| content_snapshot    | JSONB       | Current template content (documents, quizzes, checklist) |
| instantiation_count | INTEGER     | Number of times this template has been instantiated      |
| current_version     | INTEGER     | Current version number (1-based)                         |
| created_at          | TIMESTAMPTZ | Creation time                                            |
| updated_at          | TIMESTAMPTZ | Last update time                                         |

**Constraints**:

- `status` must be one of: 'draft', 'published', 'archived'
- `color` must be a valid hex color (e.g., '#3B82F6') or NULL
- `title` must be non-empty
- `instantiation_count` must be >= 0
- `current_version` must be >= 1

**Status Workflow**:

- **draft**: Template is editable, visible only to creator
- **published**: Template is locked (no edits), can be made public
- **archived**: Template is hidden from browse, existing instances still work

**RLS Policies**:

- Teachers can view/create/update/delete their own templates
- Teachers can view public published templates
- Admins can manage all templates

#### `chapter_template_versions`

Version history for chapter templates with content snapshots.

| Column           | Type        | Description                                                            |
| ---------------- | ----------- | ---------------------------------------------------------------------- |
| id               | UUID (PK)   | Version ID                                                             |
| template_id      | UUID (FK)   | Reference to parent template → chapter_templates(id) ON DELETE CASCADE |
| version_number   | INTEGER     | Version number (1-based, sequential)                                   |
| created_by       | UUID (FK)   | Teacher who created this version → profiles(id)                        |
| content_snapshot | JSONB       | Full content snapshot at this version                                  |
| change_summary   | TEXT        | Optional human-readable summary of changes                             |
| diff             | JSONB       | Optional structured diff from previous version                         |
| created_at       | TIMESTAMPTZ | Creation time                                                          |

**Constraints**:

- `(template_id, version_number)` is unique
- `version_number` must be >= 1

**Automatic Versioning**: When a template is created, version 1 is automatically created via trigger.

**RLS Policies**:

- Teachers can view versions of their templates
- Teachers can view versions of public published templates
- Teachers can create versions for their templates
- Admins can manage all versions

#### `chapter_template_instantiations`

Links chapters to their source templates for versioning and migration.

| Column                   | Type        | Description                                                                  |
| ------------------------ | ----------- | ---------------------------------------------------------------------------- |
| id                       | UUID (PK)   | Instantiation ID                                                             |
| template_id              | UUID (FK)   | Source template (NULL if deleted) → chapter_templates(id) ON DELETE SET NULL |
| template_version         | INTEGER     | Version used at instantiation                                                |
| chapter_id               | UUID (FK)   | Instantiated chapter → class_chapters(id) ON DELETE CASCADE                  |
| current_template_version | INTEGER     | Latest known template version (NULL = template deleted)                      |
| is_detached              | BOOLEAN     | If true, chapter is independent and won't receive updates                    |
| instantiated_at          | TIMESTAMPTZ | When chapter was created from template                                       |
| last_migrated_at         | TIMESTAMPTZ | Last time chapter was updated to match new version                           |

**Constraints**:

- `chapter_id` is unique (one template per chapter)
- `template_version` must be >= 1

**Workflow**:

1. Teacher selects a template to create chapter
2. System creates `class_chapter` with content from template
3. Instantiation record links chapter to template with version
4. When template gets new version, teacher can choose to migrate
5. Teacher can "detach" to make chapter independent

**RLS Policies**:

- Teachers can view/create/update/delete instantiations for their chapters
- Admins can manage all instantiations

**Triggers**:

- `increment_instantiation_count_trigger`: Auto-increments template's `instantiation_count` on insert
- `create_initial_version_trigger`: Auto-creates version 1 when template is created

**Migration File**: `20251210100000_create_chapter_templates.sql`

### Friend System Tables

#### `friendships`

Mutual friend relationships between users with request/accept workflow.

| Column          | Type        | Description                                                 |
| --------------- | ----------- | ----------------------------------------------------------- |
| id              | UUID (PK)   | Friendship ID                                               |
| requester_id    | UUID (FK)   | User who sent friend request                                |
| addressee_id    | UUID (FK)   | User who receives friend request                            |
| status          | TEXT        | 'pending', 'accepted', or 'rejected'                        |
| friendship_type | TEXT        | 'classmate' (student-student) or 'mentor' (teacher-student) |
| created_at      | TIMESTAMPTZ | When request was sent                                       |
| updated_at      | TIMESTAMPTZ | Last status change                                          |

**Unique Constraint**: (requester_id, addressee_id) - prevents duplicate friend requests
**Check Constraint**: requester_id ≠ addressee_id - prevents self-friendship

**Friendship Workflow**:

1. User A sends request to User B → status = 'pending'
2. User B accepts → status = 'accepted' (friends)
3. User B rejects → status = 'rejected'
4. Either user can unfriend → DELETE row

**Friendship Types**:

- `classmate`: Student-to-student friendships
- `mentor`: Teacher-to-student relationships

**RLS Policies**:

- Users can view friendships they're part of (requester or addressee)
- Users can create friend requests (as requester)
- Addressees can update status (accept/reject)
- Users can delete friendships they're part of (unfriend)
- Teachers can view and delete all student friendships (moderation)

#### `user_presence`

Real-time online/offline status tracked via WebSocket heartbeats.

| Column         | Type        | Description                       |
| -------------- | ----------- | --------------------------------- |
| user_id        | UUID (PK)   | References profiles(id)           |
| status         | TEXT        | 'online' or 'offline'             |
| last_heartbeat | TIMESTAMPTZ | Last WebSocket heartbeat received |
| updated_at     | TIMESTAMPTZ | Last status change                |

**WebSocket System**:

- **Heartbeat Interval**: 60 seconds (client sends heartbeat)
- **Timeout**: Users marked offline after 2 minutes without heartbeat
- **Presence Updates**: Friends notified in real-time via WebSocket
- **Privacy**: Only friends can see each other's presence status

**RLS Policies**:

- Users can view their own presence
- Users can view presence of accepted friends only
- Users can update their own presence (via WebSocket server)

**Helper Functions**:

- `upsert_user_presence(user_id, status)` - Update presence (used by WebSocket server)
- `cleanup_stale_presence()` - Mark offline users with old heartbeats
- `get_friend_ids(user_id)` - Get list of friend IDs (for presence broadcasting)

### Error Monitoring Tables

#### `error_logs`

Comprehensive error logging for application monitoring and debugging.

| Column           | Type        | Description                                      |
| ---------------- | ----------- | ------------------------------------------------ |
| id               | UUID (PK)   | Error log ID                                     |
| error_type       | TEXT        | 'client_js', 'server_api', 'server_load', etc.   |
| severity         | TEXT        | 'info', 'warning', 'error', 'critical'           |
| message          | TEXT        | Error message (max 1000 chars)                   |
| stack_trace      | TEXT        | Full stack trace (sanitized, max 5000 chars)     |
| error_name       | TEXT        | Error constructor name (TypeError, etc.)         |
| url              | TEXT        | Page URL or API endpoint                         |
| file_path        | TEXT        | File where error occurred                        |
| line_number      | INTEGER     | Line number in file                              |
| column_number    | INTEGER     | Column number in file                            |
| user_id          | UUID (FK)   | References profiles(id)                          |
| user_role        | TEXT        | 'student', 'teacher', 'admin'                    |
| session_id       | TEXT        | Session identifier                               |
| request_method   | TEXT        | HTTP method (GET, POST, etc.)                    |
| status_code      | INTEGER     | HTTP status code                                 |
| request_headers  | JSONB       | Sanitized request headers                        |
| request_body     | JSONB       | Sanitized request body                           |
| response_time    | INTEGER     | Response time in milliseconds                    |
| user_agent       | TEXT        | Browser user agent string                        |
| browser_name     | TEXT        | Browser name (Chrome, Firefox, etc.)             |
| browser_version  | TEXT        | Browser version                                  |
| os_name          | TEXT        | Operating system (Windows, macOS, etc.)          |
| device_type      | TEXT        | 'mobile', 'tablet', 'desktop'                    |
| viewport_width   | INTEGER     | Browser viewport width                           |
| viewport_height  | INTEGER     | Browser viewport height                          |
| context          | JSONB       | Additional error-specific data (sanitized)       |
| tags             | TEXT[]      | Tags for categorization                          |
| resolved         | BOOLEAN     | Whether error has been resolved (default: false) |
| resolved_by      | UUID (FK)   | Admin who resolved the error                     |
| resolved_at      | TIMESTAMPTZ | When error was resolved                          |
| resolution_notes | TEXT        | Notes about how error was fixed                  |
| error_signature  | TEXT        | SHA-256 hash for deduplication (auto-generated)  |
| created_at       | TIMESTAMPTZ | When error occurred                              |

**Key Features**:

- **Automatic Sanitization**: Passwords, tokens, API keys, emails removed from contexts
- **Privacy Protection**: Student data protected, PII redacted
- **Error Deduplication**: Automatic signature generation via trigger
- **Admin-Only Access**: RLS enforced for viewing/resolving
- **Service Role Insert**: Error logging bypasses RLS using service role key

**Indexes**:

- `idx_error_logs_created_at` - Time-based queries (DESC)
- `idx_error_logs_user_id` - User-specific errors (partial, WHERE user_id IS NOT NULL)
- `idx_error_logs_type_severity` - Filtering by type and severity
- `idx_error_logs_unresolved` - Active errors dashboard (partial, WHERE resolved = FALSE)
- `idx_error_logs_resolved` - Resolved errors (partial, WHERE resolved = TRUE)
- `idx_error_logs_signature` - Deduplication lookups (partial, WHERE error_signature IS NOT NULL)
- `idx_error_logs_url` - URL-based filtering
- `idx_error_logs_session` - Session tracking (partial, WHERE session_id IS NOT NULL)

**Triggers**:

- `trigger_set_error_signature` - Auto-generates error signature before insert
- `trigger_update_error_occurrence` - Updates occurrence tracking after insert

**RLS Policies**:

- Admins: Full SELECT, INSERT, UPDATE, DELETE access
- Service Role: INSERT access (for error logging from any context)
- Students/Teachers: No access

#### `error_occurrences`

Tracks frequency and patterns of duplicate errors for efficient monitoring.

| Column            | Type        | Description                             |
| ----------------- | ----------- | --------------------------------------- |
| id                | UUID (PK)   | Occurrence record ID                    |
| error_signature   | TEXT UNIQUE | Unique error hash (from error_logs)     |
| error_type        | TEXT        | Error type (denormalized for filtering) |
| severity          | TEXT        | Severity level (denormalized)           |
| message           | TEXT        | Error message (denormalized)            |
| url               | TEXT        | URL where error occurred (denormalized) |
| file_path         | TEXT        | File path (denormalized)                |
| line_number       | INTEGER     | Line number (denormalized)              |
| first_seen        | TIMESTAMPTZ | When error first occurred               |
| last_seen         | TIMESTAMPTZ | Most recent occurrence                  |
| occurrence_count  | INTEGER     | Number of times error occurred          |
| last_error_log_id | UUID (FK)   | Most recent error_logs entry            |
| is_resolved       | BOOLEAN     | Whether all instances are resolved      |
| created_at        | TIMESTAMPTZ | Record creation time                    |
| updated_at        | TIMESTAMPTZ | Last update time                        |

**Key Features**:

- **Automatic Updates**: Incremented via trigger on error_logs insert
- **Deduplication**: Groups identical errors by signature
- **Performance**: Reduces dashboard query load
- **Resolution Tracking**: Bulk resolution by signature

**Indexes**:

- `idx_error_occurrences_signature` - Primary lookup
- `idx_error_occurrences_last_seen` - Recent errors (DESC)
- `idx_error_occurrences_count` - Most frequent errors (DESC)
- `idx_error_occurrences_unresolved` - Active occurrences (partial, WHERE is_resolved = FALSE)
- `idx_error_occurrences_type_severity` - Filtering

**Triggers**:

- `trigger_error_occurrences_updated_at` - Auto-updates updated_at timestamp

**RLS Policies**:

- Admins: Full SELECT access
- Service Role: Full access (for automatic updates)
- Students/Teachers: No access

**Helper Functions**:

- `generate_error_signature(type, message, file, line)` - Creates SHA-256 hash
- `upsert_error_occurrence(signature, log_id, ...)` - Creates/updates occurrence record
- `cleanup_old_errors(days_old)` - Removes resolved errors older than N days
- `get_error_stats(hours)` - Returns error statistics for dashboard
- `resolve_error(error_log_id, resolved_by, notes)` - Marks error as resolved
- `resolve_error_by_signature(signature, resolved_by, notes)` - Bulk resolves by signature

**Usage**:

Error monitoring is fully automatic:

- Client-side errors captured via `hooks.client.ts`
- Server-side errors captured via `hooks.server.ts`
- Manual capture: `captureError()`, `captureValidationError()`, `capturePerformance()`
- Admin dashboard: `/dashboard/admin/errors`
- Critical errors trigger automatic notifications to admins

**Documentation**: See `ERROR_MONITORING_SYSTEM.md` and `ERROR_MONITORING_QUICK_START.md`

### Chat Moderation Tables

> 🆕 2025-11-10

The chat moderation system enables teachers and admins to maintain safe communication environments. See [Chat Moderation Feature Documentation](../features/chat-moderation.md) for complete details.

#### `user_restrictions`

Track mute, timeout, and ban restrictions at database level.

| Column           | Type        | Description                            |
| ---------------- | ----------- | -------------------------------------- |
| id               | UUID (PK)   | Restriction ID                         |
| user_id          | UUID (FK)   | User being restricted (FK to profiles) |
| scope_type       | TEXT        | 'conversation' or 'global'             |
| scope_id         | UUID (FK)   | conversation_id (NULL for global)      |
| restriction_type | TEXT        | 'mute', 'timeout', or 'ban'            |
| reason           | TEXT        | Reason for restriction (min 5 chars)   |
| restricted_by    | UUID (FK)   | Moderator who created restriction      |
| expires_at       | TIMESTAMPTZ | Expiration (NULL = permanent)          |
| created_at       | TIMESTAMPTZ | Creation timestamp                     |
| updated_at       | TIMESTAMPTZ | Last update timestamp                  |

**Constraints**:

- `CHECK (restriction_type IN ('mute', 'timeout', 'ban'))`
- `CHECK (scope_type IN ('conversation', 'global'))`
- `CHECK (length(reason) >= 5)`
- `CHECK (scope_type = 'global' → scope_id IS NULL, scope_type = 'conversation' → scope_id NOT NULL)`
- `UNIQUE (user_id, scope_type, scope_id, restriction_type)` - Prevents duplicate active restrictions

**Foreign Keys**:

- `user_id` → `profiles(id)` ON DELETE CASCADE
- `scope_id` → `conversations(id)` ON DELETE CASCADE
- `restricted_by` → `profiles(id)` (no cascade, audit trail)

**Indexes**:

- `idx_user_restrictions_user_id` ON (user_id)
- `idx_user_restrictions_scope` ON (scope_type, scope_id)
- `idx_user_restrictions_active` ON (user_id) WHERE expires_at IS NULL OR expires_at > now()
- `idx_user_restrictions_moderator` ON (restricted_by, created_at DESC)

**RLS Policies**:

- Teachers/admins can view, create, update, delete restrictions
- `restricted_by` must match `auth.uid()` on INSERT
- UPDATE prevents changing `user_id` or `restricted_by` (immutable audit fields)

**Migration**: `20251110120000_create_user_restrictions.sql`

---

#### `moderation_logs`

Immutable audit trail of all moderation actions.

| Column       | Type        | Description                                   |
| ------------ | ----------- | --------------------------------------------- |
| id           | UUID (PK)   | Log entry ID                                  |
| moderator_id | UUID (FK)   | Moderator who performed action (FK profiles)  |
| action       | TEXT        | Action type (see below)                       |
| target_type  | TEXT        | What was affected (message, user, etc.)       |
| target_id    | UUID        | ID of affected entity (NO FK, audit persists) |
| reason       | TEXT        | Optional reason for action                    |
| metadata     | JSONB       | Additional context (default '{}')             |
| created_at   | TIMESTAMPTZ | Action timestamp                              |

**Action Types**:

```sql
CHECK (action IN (
  'delete_message',
  'mute_user',
  'unmute_user',
  'timeout_user',
  'ban_user',
  'unban_user',
  'review_report',
  'export_conversation'
))
```

**Target Types**:

```sql
CHECK (target_type IN ('message', 'user', 'conversation', 'report'))
```

**Privacy**: Message content is NEVER logged, only metadata (length, timestamp, IDs).

**Indexes**:

- `idx_moderation_logs_moderator` ON (moderator_id, created_at DESC)
- `idx_moderation_logs_target` ON (target_type, target_id)
- `idx_moderation_logs_action` ON (action, created_at DESC)

**RLS Policies**:

- Teachers/admins can SELECT and INSERT
- NO UPDATE or DELETE policies (immutable audit trail)

**Migration**: `20251110120001_create_moderation_logs_and_update_rls.sql`

---

#### Helper Functions (Moderation)

**`is_user_restricted(p_user_id UUID, p_conversation_id UUID DEFAULT NULL) → BOOLEAN`**

Check if user has active restriction (global or conversation-specific).

```sql
SELECT is_user_restricted('user-uuid', 'conversation-uuid'); -- TRUE if restricted
SELECT is_user_restricted('user-uuid', NULL); -- Check global only
```

**`log_moderation_action(p_action TEXT, p_target_type TEXT, p_target_id UUID, p_reason TEXT, p_metadata JSONB) → UUID`**

Create moderation log entry with authorization check (teacher/admin only).

```sql
SELECT log_moderation_action(
  'delete_message',
  'message',
  'message-uuid',
  'Inappropriate content',
  '{"conversation_id": "conv-uuid"}'::jsonb
);
```

**`get_user_moderation_history(p_user_id UUID, p_limit INTEGER DEFAULT 50) → TABLE`**

Get moderation history for a user (teacher-only).

```sql
SELECT * FROM get_user_moderation_history('user-uuid', 20);
```

---

#### RLS Policy Updates (Moderation)

**conversations table**: Teachers can now view 1-on-1 chats where BOTH participants are their students.

**messages table (SELECT)**: Teachers can view messages in student 1-on-1 chats (with authorization logic).

**messages table (INSERT)**: Blocks message sending if user has active restriction (global or conversation-scoped).

**Key Logic** (messages INSERT policy):

```sql
AND NOT EXISTS (
  SELECT 1 FROM user_restrictions ur
  WHERE ur.user_id = auth.uid()
  AND (
    (ur.scope_type = 'global' AND ur.scope_id IS NULL)
    OR (ur.scope_type = 'conversation' AND ur.scope_id = messages.conversation_id)
  )
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
)
```

**Authorization Rationale**: Teachers need visibility into student interactions for safety while respecting privacy. Access requires BOTH students to be in teacher's classes, preventing overly broad access. See [Chat Moderation Documentation](../features/chat-moderation.md#teacher-authorization-logic) for complete details.

---

## Row Level Security (RLS)

All tables have RLS enabled with the following access patterns:

### Students can:

- View their own profile
- View all schools (for selection during registration)
- View classes they're members of
- View their own class memberships
- Join classes (insert into class_members)
- Leave classes (delete from class_members)

### Teachers can:

- View all schools (for selection during registration)
- Create and manage their own classes (where teacher_id = auth.uid())
- View, add, and remove students from their classes
- Update their own classes

### Admins can:

- View and modify all user profiles (using security definer functions)
- Full CRUD operations on schools table
- Change user roles (student/teacher/admin)
- Modify school assignments
- Add/remove users from classes via class_ids array
- Update avatar URLs and personal information
- Search users by email, firstname, or lastname
- Full CRUD operations on pending_students table (pre-populate students)

### RLS Implementation Notes

To avoid infinite recursion between tables, we use **SECURITY DEFINER functions**:

#### Helper Functions:

- `is_admin()` - Checks if user is admin without triggering RLS
- `is_teacher_or_admin()` - Checks if user is teacher or admin
- `is_student()` - Checks if user is student
- `is_class_teacher(class_id)` - Checks if user is teacher of specific class
- `can_view_student_profile(student_id)` - Checks teacher-student relationship

These functions use `SECURITY DEFINER` to bypass RLS when checking roles/permissions, preventing circular policy checks between `profiles`, `classes`, and `class_members` tables.

## Key Functions & Triggers

### Authentication & Profile Management

#### `handle_new_user()`

**Trigger**: After user signup in `auth.users`
**Action**: Automatically creates a profile. If user's email exists in `pending_students`, creates profile with pre-populated data (firstname, lastname, school, grade, gender) and marks the pending student as activated. Otherwise, creates a default profile with role='student'.

### Class Management

#### `generate_join_code()`

**Usage**: Called when creating a class
**Returns**: Random 6-character uppercase code (guaranteed unique)

### RLS Helper Functions (SECURITY DEFINER)

#### `is_admin()`

**Returns**: Boolean - true if current user is admin
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_teacher_or_admin()`

**Returns**: Boolean - true if current user is teacher or admin
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_student()`

**Returns**: Boolean - true if current user is student
**Purpose**: Bypasses RLS to check user role without recursion

#### `is_class_teacher(class_id UUID)`

**Returns**: Boolean - true if current user is teacher of specified class
**Purpose**: Bypasses RLS to check class ownership without recursion

#### `can_view_student_profile(student_id UUID)`

**Returns**: Boolean - true if current user (teacher) has student in their class
**Purpose**: Bypasses RLS to check teacher-student relationship without recursion

### Gidouilles Management (Rewards System)

**Implementation Notes** (Updated: 2025-11-11):

Both gidouilles and bonus systems use atomic `GREATEST(0, value + delta)` updates to prevent race conditions in concurrent scenarios. This approach:

- Ensures read and write happen atomically (no lost updates)
- Enforces minimum value of 0 at database operation level
- Prevents race conditions when multiple requests update the same student simultaneously
- Backed by CHECK constraints (`profiles_gidouilles_non_negative`, `profiles_bonus_non_negative`) for defense in depth

See migration `20251111173411_fix_gidouilles_race_conditions.sql` for implementation details.

#### `update_student_gidouilles(student_id UUID, delta INTEGER)`

**Returns**: INTEGER - New gidouilles count after update
**Purpose**: Securely updates a single student's gidouilles (reward points)
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
- Enforces minimum of 0 gidouilles via atomic GREATEST() operation
  **Usage**:

```sql
-- Add 5 gidouilles to a student
SELECT update_student_gidouilles('student-uuid', 5);

-- Remove 2 gidouilles from a student
SELECT update_student_gidouilles('student-uuid', -2);
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

**Note**: Negative results are automatically clamped to 0 (no exception raised).

#### `update_class_gidouilles(class_id UUID, delta INTEGER)`

**Returns**: INTEGER - Number of students updated
**Purpose**: Updates gidouilles for ALL students in a class at once
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is the teacher who owns the class
- Uses atomic GREATEST() operation to clamp values at 0
  **Usage**:

```sql
-- Add 10 gidouilles to all students in class
SELECT update_class_gidouilles('class-uuid', 10);

-- Remove 5 gidouilles from all students in class
SELECT update_class_gidouilles('class-uuid', -5);
```

**Behavior**:

- All active students in the class are updated atomically
- Students whose value would go negative are clamped to 0 (via GREATEST())
- Returns total count of students updated

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if caller doesn't own the class

### Bonus Management (Rewards System)

The bonus system works identically to gidouilles - it's a separate currency/points system for special achievements. Added in migration `20251111000000_add_bonus_system.sql`.

#### `update_student_bonus(student_id UUID, delta INTEGER)`

**Returns**: INTEGER - New bonus count after update
**Purpose**: Securely updates a single student's bonus (special achievement points)
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
- Enforces minimum of 0 bonus via atomic GREATEST() operation

**Usage**:

```sql
-- Add 5 bonus to a student
SELECT update_student_bonus('student-uuid', 5);

-- Remove 2 bonus from a student
SELECT update_student_bonus('student-uuid', -2);
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

**Note**: Negative results are automatically clamped to 0 (no exception raised).

**Implementation**: Uses the same atomic update pattern as gidouilles to prevent race conditions. See **Implementation Notes** under Gidouilles Management above.

### VIP Cards Management (Rewards System)

VIP cards are special reward items that students can earn by spending 3 gidouilles. The cards are stored in a JSONB column on the profiles table, where each card instance has a unique ID, card type, earned timestamp, and optional used timestamp.

**VIP Card Data Structure**:

```json
{
	"uuid-1": { "cardId": "bonus", "earnedAt": "2025-10-13T...", "usedAt": null },
	"uuid-2": { "cardId": "captain", "earnedAt": "2025-10-13T...", "usedAt": "2025-10-14T..." }
}
```

#### `award_random_vip_card(student_id UUID)`

**Returns**: JSONB - Complete card information including `cardId`, `instanceId`, and `earnedAt`

**Purpose**: Awards a random VIP card to a student by deducting 3 gidouilles

**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
- Ensures student has at least 3 gidouilles before awarding

**Behavior**:

- Deducts 3 gidouilles from student's balance
- Randomly selects from 26 available VIP cards
- Creates new card instance with unique UUID
- Adds card to student's vip_cards JSONB column
- Returns complete card information for frontend cache synchronization

**Return Format**:

```json
{
	"cardId": "bonus",
	"instanceId": "uuid-of-instance",
	"earnedAt": "2025-11-04T10:00:00Z"
}
```

**Usage**:

```sql
-- Award random VIP card to a student
SELECT award_random_vip_card('student-uuid');
-- Returns: {"cardId": "bonus", "instanceId": "abc-123", "earnedAt": "2025-11-04T10:00:00Z"}
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes
- Raises exception if student has insufficient gidouilles

---

#### `draw_multiple_vip_cards()` 🆕 2025-11-04

**Returns**: JSONB - Array of drawn cards with `cardId`, `instanceId`, and `earnedAt`

**Purpose**: Securely draw multiple VIP cards (1-10) for a student with comprehensive validation and race condition protection

**Signature**:

```sql
draw_multiple_vip_cards(
  p_student_id UUID,
  p_count INT,
  p_payment_method TEXT,
  p_gidouilles_cost INT DEFAULT NULL,
  p_vip_card_instance_id UUID DEFAULT NULL
) RETURNS JSONB
```

**Security Features**:

1. **Race Condition Protection**: `SELECT FOR UPDATE` prevents double-spend attacks
2. **Free Card Restriction**: Students CANNOT draw free cards (cost=0), only teachers/admins can
3. **Proportional Validation**: Maximum 10 gidouilles per card (e.g., 3 cards = max 30 gidouilles)
4. **Authorization**: Verifies teacher-student relationship or student drawing for themselves
5. **Atomic Transactions**: All-or-nothing updates ensure consistency

**Payment Methods**:

**1. Gidouilles Payment** (`p_payment_method = 'gidouilles'`):

- Validates `p_gidouilles_cost` is not null and >= 0
- Validates cost <= (count × 10) - proportional limit
- If cost = 0: only allowed if caller is teacher/admin (students blocked)
- Checks balance >= cost with `SELECT FOR UPDATE` (prevents race conditions)
- Deducts gidouilles atomically

**2. VIP Card Payment** (`p_payment_method = 'vip_card'`):

- Validates `p_vip_card_instance_id` is not null
- Gets card instance with `SELECT FOR UPDATE`
- Validates card exists in student's vip_cards JSONB
- Validates card not already used (usedAt IS NULL)
- Marks card as used (sets usedAt = NOW())
- TODO: Validate card has `draw_cards` action (future improvement)

**Return Format**:

```json
{
	"cards": [
		{
			"cardId": "soldes",
			"instanceId": "uuid-1",
			"earnedAt": "2025-11-04T10:30:00Z"
		},
		{
			"cardId": "bonus",
			"instanceId": "uuid-2",
			"earnedAt": "2025-11-04T10:30:00Z"
		}
	]
}
```

**Usage Examples**:

```sql
-- Teacher draws 3 cards for student (15 gidouilles)
SELECT draw_multiple_vip_cards(
  'student-uuid',
  3,
  'gidouilles',
  15,
  NULL
);

-- Teacher draws 1 free card (only teachers can do this)
SELECT draw_multiple_vip_cards(
  'student-uuid',
  1,
  'gidouilles',
  0,  -- FREE - students cannot do this
  NULL
);

-- Student uses VIP card to draw 5 cards
SELECT draw_multiple_vip_cards(
  'student-uuid',
  5,
  'vip_card',
  NULL,
  'vip-card-instance-uuid'
);
```

**Errors**:

- `Invalid count: Must be between 1 and 10` - Count out of range
- `Invalid payment_method: Must be 'gidouilles' or 'vip_card'` - Invalid payment method
- `Unauthorized: Student is not in your classes` - Teacher doesn't have access to student
- `Unauthorized: You can only draw cards for yourself or your students` - Authorization failure
- `Unauthorized: Students cannot draw free cards (cost must be > 0)` - Student trying cost=0
- `Invalid gidouilles_cost: Maximum X gidouilles for Y cards (received: Z)` - Proportional limit exceeded
- `Insufficient gidouilles: Required X, available Y (shortfall: Z)` - Insufficient balance
- `VIP card not found: Instance ID X does not exist` - Card doesn't exist
- `VIP card already used: This card was used at X` - Card already consumed

**Migration**: `supabase/migrations/20251104091315_add_draw_multiple_vip_cards_function.sql`

**Related Feature Documentation**: [VIP Card Draw System](../features/vip-card-draw-system.md)

**Migration** (2025-11-04):
Changed return type from TEXT (cardId only) to JSONB to enable instant cache synchronization in the frontend without requiring a full data refresh.

#### `use_vip_card(student_id UUID, card_id TEXT)`

**Returns**: BOOLEAN - TRUE if card was successfully used, FALSE if no unused card found
**Purpose**: Marks a VIP card instance as used (consumed) by setting the usedAt timestamp
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
  **Behavior**:
- Finds the oldest unused instance of the specified card
- Sets usedAt timestamp to current time
- Returns FALSE if no unused instance exists
  **Usage**:

```sql
-- Use a bonus card for a student
SELECT use_vip_card('student-uuid', 'bonus');
-- Returns: true (if card was found and used)
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

#### `remove_student_vip_card(student_id UUID, card_id TEXT)`

**Returns**: BOOLEAN - TRUE if card was successfully removed, FALSE if no card found
**Purpose**: Removes one instance of a VIP card from a student's collection (no gidouilles refund)
**Security**:

- SECURITY DEFINER function (runs with elevated permissions)
- Verifies caller is a teacher via `is_teacher_or_admin()`
- Verifies student is in one of the teacher's classes
  **Behavior**:
- Finds the oldest unused instance of the specified card
- Completely removes it from the vip_cards JSONB object
- No gidouilles refund (card is simply deleted)
- Returns FALSE if no unused instance exists
  **Usage**:

```sql
-- Remove a captain card from a student
SELECT remove_student_vip_card('student-uuid', 'captain');
-- Returns: true (if card was found and removed)
```

**Errors**:

- Raises exception if caller is not a teacher
- Raises exception if student is not in teacher's classes

### Triggers

#### `update_updated_at_column()`

**Trigger**: Before update on tables with `updated_at`
**Action**: Sets `updated_at = NOW()`

## Indexes

Performance indexes are created for:

- Foreign key relationships
- Common query patterns (teacher→classes, school→classes, etc.)
- RLS policy checks
- Array searches on class_ids (GIN index)
- School-based filtering (`idx_profiles_school_id`)
- Role and school composite queries (`idx_profiles_role_school`)
- Class membership lookups (`idx_class_members_composite`)
- JSONB vip_cards queries (`idx_profiles_vip_cards`)
- Pending student email lookups (`idx_pending_students_email` - partial index for non-activated only)
- Pending student school filtering (`idx_pending_students_school`)

### Query Performance Notes

**Getting all students in a class** (efficient):

```sql
SELECT p.* FROM profiles p
JOIN class_members cm ON p.id = cm.student_id
WHERE cm.class_id = 'class-uuid';
-- Uses idx_class_members_class + idx_profiles_pkey
```

**Getting all classes for a student** (efficient):

```sql
SELECT c.* FROM classes c
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.student_id = 'student-uuid';
-- Uses idx_class_members_student + idx_classes_pkey
```

**Getting student's teacher for a specific class** (efficient):

```sql
SELECT p.* FROM profiles p
JOIN classes c ON p.id = c.teacher_id
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.student_id = 'student-uuid' AND cm.class_id = 'class-uuid';
-- Uses idx_class_members_composite
```

**Admin dashboard: all students in a school** (efficient):

```sql
SELECT * FROM profiles
WHERE role = 'student' AND school_id = 'school-uuid';
-- Uses idx_profiles_role_school
```

## Test Data

The database includes seeded test data for **Lycée Franco-Qatari Voltaire**:

### Teachers (5 total)

- D. Lejolly (existing) - 2nde Maths (MATH2E)
- Prof. Jean Baguette - 6ème Maths (MATH6A)
- Mme. Claire Croissant - 5ème Maths (MATH5B)
- M. Pierre Fromage - 4ème Maths (MATH4C)
- Prof. Marie Escargot - 3ème Maths (MATH3D)

### Classes (5 total)

Each class has a unique join code (e.g., MATH6A, MATH5B, etc.)

### Students (25 total - 5 per class)

All students have:

- Realistic French names
- Email format: `firstname.lastname@voltairedoha.com`
- Appropriate grade level (6ème, 5ème, 4ème, 3ème, 2nde)
- Initial values: `gidouilles = 0`, `vip_cards = {}`

**Note**: These test users cannot authenticate via Google OAuth (dummy passwords). They serve as development/testing data for the UI.

## Usage Examples

### Creating a Class with Join Code

```typescript
const { data, error } = await supabase.from('classes').insert({
	teacher_id: session.user.id,
	school_id: 'school-uuid',
	name: 'Algebra 1 - Period 3',
	description: 'Morning algebra class',
	join_code: await supabase.rpc('generate_join_code')
});
```

### Student Joining a Class

```typescript
const { data, error } = await supabase.from('class_members').insert({
	class_id: 'uuid-from-join-code-lookup',
	student_id: session.user.id
});
```

### Querying Classes with RLS

```typescript
// As a teacher - get your classes
const { data: myClasses } = await supabase
	.from('classes')
	.select('*')
	.eq('teacher_id', session.user.id);

// As a student - get classes you're enrolled in
const { data: enrolledClasses } = await supabase
	.from('classes')
	.select(
		`
    *,
    class_members!inner(*)
  `
	)
	.eq('class_members.student_id', session.user.id);

// Get students in your class (as teacher)
const { data: students } = await supabase
	.from('profiles')
	.select(
		`
    *,
    class_members!inner(*)
  `
	)
	.eq('class_members.class_id', 'your-class-id')
	.eq('role', 'student');
```

## Navadra Game System

The Navadra game system provides a math-learning RPG experience where students solve math challenges in combat scenarios.

### Game Tables Overview

```
game_players (user progress & stats)
    ↓
game_spell_decks (active spell loadout)
    ↓
game_spells (owned spells)
    ↓
game_challenges (math problems) → game_challenge_attempts (student answers)
    ↓
game_combats (battle sessions) → game_monsters (enemies)
```

### `game_players`

Player progression and statistics.

| Column        | Type        | Description                                               |
| ------------- | ----------- | --------------------------------------------------------- |
| id            | UUID (PK)   | Player ID                                                 |
| user_id       | UUID (FK)   | References profiles(id)                                   |
| level         | INTEGER     | Player level (1-100)                                      |
| xp            | INTEGER     | Total experience points                                   |
| prestige      | INTEGER     | Prestige points (for leaderboards)                        |
| pyrs          | JSONB       | Elemental currency (fire, water, earth, air, light, dark) |
| max_endurance | INTEGER     | Maximum HP in combat                                      |
| created_at    | TIMESTAMPTZ | Account creation                                          |
| updated_at    | TIMESTAMPTZ | Last update                                               |

**RLS**: Users can view and update their own game_players record.

### `game_spells`

Spells (math abilities) owned by players.

| Column     | Type        | Description                                    |
| ---------- | ----------- | ---------------------------------------------- |
| id         | UUID (PK)   | Spell ID                                       |
| user_id    | UUID (FK)   | References profiles(id)                        |
| spell_num  | INTEGER     | Spell slot number (1-10)                       |
| name       | TEXT        | Spell name                                     |
| element    | TEXT        | Element type (fire/water/earth/air/light/dark) |
| attack     | INTEGER     | Base damage value                              |
| cost       | INTEGER     | Pyr cost to cast                               |
| image_url  | TEXT        | Spell icon/image                               |
| created_at | TIMESTAMPTZ | Creation time                                  |
| updated_at | TIMESTAMPTZ | Last update                                    |

**Unique Constraint**: (user_id, spell_num) - each player has 10 spell slots.

**RLS**: Users can view and manage their own spells.

### `game_spell_decks`

Active spell loadouts for combat.

| Column     | Type        | Description                     |
| ---------- | ----------- | ------------------------------- |
| id         | UUID (PK)   | Deck ID                         |
| user_id    | UUID (FK)   | References profiles(id)         |
| name       | TEXT        | Deck name                       |
| spell_ids  | UUID[]      | Array of spell IDs (max 10)     |
| is_active  | BOOLEAN     | Whether this is the active deck |
| created_at | TIMESTAMPTZ | Creation time                   |
| updated_at | TIMESTAMPTZ | Last update                     |

**RLS**: Users can view and manage their own decks.

### `game_challenges`

Math challenge definitions (problems to solve during combat).

| Column     | Type        | Description                                                      |
| ---------- | ----------- | ---------------------------------------------------------------- |
| id         | UUID (PK)   | Challenge ID                                                     |
| name       | TEXT        | Challenge name/description                                       |
| element    | TEXT        | Required element (fire/water/earth/air/light/dark)               |
| difficulty | INTEGER     | Difficulty level (1-10)                                          |
| question   | TEXT        | Question template (supports {variable} placeholders)             |
| variables  | JSONB       | Variable definitions and ranges                                  |
| answer     | JSONB       | Answer definition (can be value, expression, or multiple choice) |
| is_active  | BOOLEAN     | Whether challenge is available                                   |
| created_at | TIMESTAMPTZ | Creation time                                                    |
| updated_at | TIMESTAMPTZ | Last update                                                      |

**Variable System**:
Variables are defined in JSONB format:

```json
{
	"x": { "type": "number", "value": "randomInt(1, 10)" },
	"y": { "type": "number", "value": "randomInt(1, 10)" }
}
```

**Answer Types**:

- Simple value: `["x + y"]`
- Multiple choice: `[{"choice": "A", "determined": true}, {"choice": "B", "determined": false}]`
- Conditional: `[{"if": "x > y", "choice": "{x}"}, {"if": "x <= y", "choice": "{y}"}]`

**Known Limitations**:

- Array values with expression strings are not automatically evaluated
- MathJS array indexing doesn't work with JavaScript arrays
- Variables with complex conditions may fail to evaluate
- Custom function return types may have compatibility issues

Simple challenges work well. Complex challenges with nested dependencies and conditions may require manual testing.

**RLS**: Public read access. Admin-only write access.

### `game_challenge_attempts`

Student answers to challenges (for analytics and progress tracking).

| Column             | Type        | Description                                                     |
| ------------------ | ----------- | --------------------------------------------------------------- |
| id                 | UUID (PK)   | Attempt ID                                                      |
| user_id            | UUID (FK)   | References profiles(id)                                         |
| challenge_id       | UUID (FK)   | References game_challenges(id)                                  |
| combat_id          | UUID (FK)   | References game_combats(id) (optional)                          |
| success            | BOOLEAN     | Whether answer was correct                                      |
| time_taken         | INTEGER     | Time in milliseconds                                            |
| answer_given       | JSONB       | Student's answer                                                |
| correct_answer     | JSONB       | The correct answer (for review)                                 |
| challenge_instance | JSONB       | Specific variable values used (deprecated - not stored anymore) |
| created_at         | TIMESTAMPTZ | Attempt timestamp                                               |

**RLS**: Users can insert their own attempts and view their own history.

### `game_monsters`

Monster/enemy definitions for combat.

| Column        | Type        | Description                                  |
| ------------- | ----------- | -------------------------------------------- |
| id            | UUID (PK)   | Monster ID                                   |
| name          | TEXT        | Monster name                                 |
| element       | TEXT        | Monster element (affects damage calculation) |
| max_endurance | INTEGER     | Monster's maximum HP                         |
| attack        | INTEGER     | Monster's attack power                       |
| image_url     | TEXT        | Monster sprite/image                         |
| loot_xp       | INTEGER     | XP reward for defeating                      |
| loot_prestige | INTEGER     | Prestige reward                              |
| loot_pyrs     | JSONB       | Pyr rewards by element                       |
| is_active     | BOOLEAN     | Whether monster can appear in combat         |
| created_at    | TIMESTAMPTZ | Creation time                                |

**RLS**: Public read access. Admin-only write access.

### `game_combats`

Active and completed combat sessions.

| Column                      | Type        | Description                                         |
| --------------------------- | ----------- | --------------------------------------------------- |
| id                          | UUID (PK)   | Combat ID                                           |
| organizer_id                | UUID (FK)   | References profiles(id) - player who started combat |
| monster_id                  | UUID (FK)   | References game_monsters(id)                        |
| status                      | TEXT        | 'active', 'completed', or 'abandoned'               |
| outcome                     | TEXT        | 'victory', 'defeat', or NULL (if active)            |
| monster_endurance_remaining | INTEGER     | Monster's current HP                                |
| current_round               | INTEGER     | Current combat round                                |
| current_turn                | INTEGER     | Current turn number                                 |
| combat_flow                 | JSONB       | Array of turn history (actions, damage, etc.)       |
| xp_gained                   | INTEGER     | XP earned (if victory)                              |
| prestige_gained             | INTEGER     | Prestige earned (if victory)                        |
| pyrs_gained                 | JSONB       | Pyrs earned (if victory)                            |
| started_at                  | TIMESTAMPTZ | Combat start time                                   |
| completed_at                | TIMESTAMPTZ | Combat end time                                     |
| created_at                  | TIMESTAMPTZ | Creation time                                       |
| updated_at                  | TIMESTAMPTZ | Last update                                         |

**Combat Flow Format**:

```json
[
	{
		"round": 1,
		"turn": 1,
		"player_id": "user-uuid",
		"action": "spell",
		"spell_num": 1,
		"challenge_result": {
			"challenge_id": "challenge-uuid",
			"success": true,
			"time_taken": 5000
		},
		"damage_dealt": 25,
		"timestamp": "2025-10-17T12:00:00Z"
	}
]
```

**RLS**: Users can view and manage their own combats.

### Game Mechanics

#### Element System

- **Elements**: Fire, Water, Earth, Air, Light, Dark
- **Element Matching**: Spells must match challenge element to be castable
- **Damage Calculation**: Based on spell attack, player level, and element effectiveness

#### Combat Flow

1. Player selects a spell from their active deck
2. A challenge matching the spell's element is randomly selected
3. Player solves the math problem
4. **If correct**: Spell damage is dealt to monster
5. **If incorrect**: No damage dealt
6. Combat continues until monster HP reaches 0 (victory) or player gives up

#### Answer Validation

- Client generates challenge instance with random variables
- Client evaluates correct answer using same random seed
- Server validates the answer using client-provided correct answer
- Results are recorded in `game_challenge_attempts` and `game_combats.combat_flow`

**Important**: The server trusts the client-provided correct answer since the challenge variables are randomly generated client-side. This is acceptable for an educational app but should not be used for competitive/ranked modes.

#### Progression System

- **XP**: Gained from defeating monsters, levels up player
- **Prestige**: Leaderboard currency, gained from fast/efficient combat
- **Pyrs**: Elemental currency for buying/upgrading spells
- **Levels**: Increase max endurance and spell effectiveness

### Debug Features

#### Debug Monster (Development Tool)

A special debug action is available at `/dashboard/navadra/combat` for quick testing:

**Action**: `?/spawnDebugMonster`

Creates a very weak monster with:

- **Level**: 1
- **HP**: 1 (dies in one hit!)
- **Element**: Fire
- **Category**: Common
- **Name**: "🐛 [MonsterName] DEBUG"

**Purpose**: Allows rapid testing of victory conditions, reward calculations, and post-combat flows without spending time on multiple challenges.

**Implementation**: See `src/routes/(protected)/dashboard/navadra/combat/+page.server.ts` line 44

#### Victory Panel Response Format

When a combat ends in victory, the server returns rewards in a **nested PostgreSQL array format**:

```javascript
// Server response structure
[
	{ success: 1, damageDealt: 2, victory: 1, rewards: 3 }, // Index 0: Column mappings
	true, // Index 1: success boolean
	26, // Index 2: damageDealt value
	{ xp: 4, prestige: 5, pyrs: 6, element: 7 }, // Index 3: Nested rewards mapping
	50, // Index 4: XP value
	12, // Index 5: Prestige value
	5, // Index 6: Pyrs value
	'fire' // Index 7: Element value
];
```

**Important**: The `rewards` field at index 3 is itself a mapping object that points to the actual reward values at indices 4-7. The client must decode this nested structure to extract the correct reward values.

**Implementation**: See `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.svelte` lines 148-165 for the parsing logic.

### Example Queries

```typescript
// Start a new combat
const { data: combat } = await supabase
	.from('game_combats')
	.insert({
		organizer_id: session.user.id,
		monster_id: 'selected-monster-uuid',
		status: 'active',
		monster_endurance_remaining: monsterMaxHP,
		current_round: 1,
		current_turn: 1,
		combat_flow: []
	})
	.select('*, monster:game_monsters(*)')
	.single();

// Record challenge attempt and update combat
const formData = new FormData();
formData.append('challenge_id', challengeId);
formData.append('answer', JSON.stringify(studentAnswer));
formData.append('correct_answer', JSON.stringify(correctAnswer));
formData.append('time_taken', String(milliseconds));
formData.append('spell_num', String(spellSlotNumber));

const result = await fetch('?/submitAnswer', {
	method: 'POST',
	body: formData,
	headers: { 'x-sveltekit-action': 'true' }
});

// Get player's combat history
const { data: combats } = await supabase
	.from('game_combats')
	.select('*, monster:game_monsters(*)')
	.eq('organizer_id', session.user.id)
	.order('created_at', { ascending: false });
```

---

## Question Bank System

### `question_templates`

Stores mathematical question templates with variable support, multiple variations, and categorization.

| Column               | Type        | Description                                                       |
| -------------------- | ----------- | ----------------------------------------------------------------- |
| id                   | UUID (PK)   | Template ID                                                       |
| title                | TEXT        | Template title (supports LaTeX, required)                         |
| description          | TEXT        | Optional description for documentation and student context        |
| type                 | TEXT        | Question type (see types below)                                   |
| variations           | JSONB       | Array of question variations (statement, variables, answer, etc.) |
| exercise_instruction | TEXT        | Optional exercise-level instruction shared across all variations  |
| grades               | TEXT[]      | Applicable grade levels (CP, CE1, 6, 5, etc.)                     |
| theme                | TEXT        | Broad subject area (e.g., "Algèbre", "Géométrie")                 |
| domain               | TEXT        | Specific topic (e.g., "Équations", "Triangles")                   |
| subdomain            | TEXT        | Optional sub-topic (e.g., "Linéaires", "Quadratiques")            |
| level                | INTEGER     | Difficulty level (positive integer, no max)                       |
| status               | TEXT        | Template status: 'draft' or 'published'                           |
| delay                | INTEGER     | Time limit in seconds (optional)                                  |
| precision            | JSONB       | Precision specification for numerical questions                   |
| transform_type       | TEXT        | Type of algebraic transformation (for algebraic_transform type)   |
| multiple_answers     | BOOLEAN     | Allow multiple correct answers (for multiple_choice type)         |
| created_at           | TIMESTAMPTZ | Creation time                                                     |
| updated_at           | TIMESTAMPTZ | Last update time                                                  |
| created_by           | UUID (FK)   | References profiles(id)                                           |

#### Question Types

- `numerical_exact`: Exact numerical answer (fractions, integers)
- `numerical_decimal`: Decimal answer with precision
- `numerical_rounded`: Rounded answer with rounding rules
- `algebraic_transform`: Algebraic expression transformation
- `fill_in_blanks`: Fill-in-the-blank questions
- `multiple_choice`: Multiple choice questions (QCM)

#### Status Field

Templates have two statuses:

- **`draft`**: Work-in-progress templates
  - Can be incomplete (missing required fields)
  - No validation enforced
  - Can have duplicate categories
  - Not affected by filters in the questions list
- **`published`**: Active, complete templates
  - Full validation enforced
  - Must have unique category (theme + domain + subdomain + level)
  - Affected by all filters in the questions list
  - Used for generating question instances

#### Category Uniqueness

Published templates must have a **unique category combination**:

- **Category** = `theme` + `domain` + `subdomain` + `level`
- Enforced via partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_question_templates_unique_category
  ON question_templates(theme, domain, COALESCE(subdomain, ''), level)
  WHERE status = 'published';
  ```
- Draft templates are excluded from this constraint
- Auto-adjustment: If creating a published template with duplicate category, level is automatically adjusted to max+1

#### Variations Structure

Each template contains one or more variations (stored as JSONB array).

**IMPORTANT**: As of Migration 090 (2025-11-24), content fields use **markdown strings** instead of ContentField[] arrays.

```json
{
	"variations": [
		{
			"statement": "Calculer $${a} + {b}$$\n\nOu utiliser une image: ![alt text](url)",
			"variables": [
				{
					"name": "a",
					"type": "random",
					"min": 1,
					"max": 10,
					"exclude": [5]
				},
				{
					"name": "b",
					"type": "random",
					"min": 1,
					"max": 10
				},
				{
					"name": "result",
					"type": "eval",
					"expression": "{a} + {b}"
				}
			],
			"answer": "{result}",
			"correction": "La somme est **{result}**\n\nCalcul: $${a} + {b} = {result}$$",
			"blanks": [], // For fill_in_blanks type
			"choices": [
				{
					"content": "{result}",
					"isCorrect": true
				},
				{
					"content": "{a}",
					"isCorrect": false
				}
			] // For multiple_choice type - content is now a markdown string
		}
	]
}
```

**Old Format (before Migration 090)**:

```json
{
	"statement": [
		{ "type": "text", "content": "Calculer {a} + {b}" },
		{ "type": "image", "url": "https://..." }
	]
}
```

**New Format (Migration 090+)**:

```json
{
	"statement": "Calculer $${a} + {b}$$\n\n![Image](https://...)"
}
```

#### Indexes

- `idx_question_templates_type`: Filter by question type
- `idx_question_templates_title`: Regular index for sorting/filtering by title
- `idx_question_templates_title_search`: GIN index for full-text search on title (French config)
- `idx_question_templates_grades`: GIN index for grade filtering
- `idx_question_templates_created_by`: Filter by creator
- `idx_question_templates_created_at`: Sort by creation date
- `idx_question_templates_status`: Filter by status
- `idx_question_templates_theme`: Filter by theme
- `idx_question_templates_domain`: Filter by domain
- `idx_question_templates_subdomain`: Filter by subdomain (partial)
- `idx_question_templates_level`: Filter by level
- `idx_question_templates_categories`: Composite (theme, domain, level)
- `idx_question_templates_unique_category`: Unique constraint for published templates

#### RLS Policies

- Teachers and admins can view all templates
- Only admins can create, update, or delete templates

#### Caching

**Client-Side Cache**:

A category cache system prevents duplicate API calls:

- **Store**: `src/lib/stores/questionCategories.svelte.ts`
- **API**: `GET /api/questions/categories/all`
- **Cache Duration**: 5 minutes
- **Usage**: Real-time duplicate detection in question forms

**Server-Side Cache** (NEW: 2025-10-29):

Published templates are cached using Redis (Tier 2 cache):

- **Module**: `src/lib/server/cache/templates.ts`
- **Cache Key**: `templates:published`
- **TTL**: 10 minutes
- **Purpose**: Reduce database load for frequently-accessed templates
- **Invalidation**: Manual via admin API or automatic TTL expiration
- **Performance**: 99% reduction in DB queries for template fetching

See [Hybrid Cache System](hybrid-cache-system.md) for full architecture.

#### Workflow: Draft → Published

1. **Create Draft** (status = 'draft'):
   - No validation enforced
   - Can be incomplete
   - Saved with "Enregistrer brouillon" button

2. **Publish** (status = 'published'):
   - Full validation enforced (required fields, circular dependencies)
   - Category uniqueness check
   - If duplicate category detected:
     - Show confirmation dialog with suggested level (max + 1)
     - Auto-adjust level on confirmation
   - Saved with "Publier" button

3. **Edit Published**:
   - Full validation maintained
   - Cannot change category to an existing one
   - Server returns 400 error if duplicate detected

#### Admin Interface

The questions list (`/dashboard/admin/questions`) has two tabs:

- **Brouillons**: All draft templates
  - Sorted by modification date (descending)
  - Always visible
  - Not affected by filters
  - Badge: Orange "Brouillon"

- **Publiés**: Published templates
  - Filterable by: type, grades, theme, domain, subdomain, level range
  - Sortable by: type, creation date
  - Paginated (50 per page)
  - Badge: Green "Publié"

#### Example Queries

```typescript
// Fetch all published templates with filters
const { data: templates } = await supabase
	.from('question_templates')
	.select('*')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.gte('level', 1)
	.lte('level', 5)
	.overlaps('grades', ['6', '5'])
	.order('created_at', { ascending: false });

// Fetch all drafts (sorted by modification date)
const { data: drafts } = await supabase
	.from('question_templates')
	.select('*')
	.eq('status', 'draft')
	.order('updated_at', { ascending: false });

// Check category uniqueness (published only)
const { data: existing } = await supabase
	.from('question_templates')
	.select('id')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.is('subdomain', null)
	.eq('level', 3)
	.single();

// Get next available level in category
const { data: maxLevel } = await supabase
	.from('question_templates')
	.select('level')
	.eq('status', 'published')
	.eq('theme', 'Algèbre')
	.eq('domain', 'Équations')
	.is('subdomain', null)
	.order('level', { ascending: false })
	.limit(1)
	.single();
```

#### Related Documentation

See **[CLAUDE_FEATURES_QUESTION_BANK.md](CLAUDE_FEATURES_QUESTION_BANK.md)** for detailed documentation on:

- Variable resolution system
- Question types and validation
- Instance generation
- Answer checking

---

## Notification System

### Notification System Tables

The notification system allows teachers and admins to send targeted notifications to users, and automatically generates system notifications for important events (new assignments, rewards, etc.).

#### `notifications`

Stores all notification data with intelligent targeting system.

| Column            | Type        | Description                                                  |
| ----------------- | ----------- | ------------------------------------------------------------ |
| id                | UUID (PK)   | Notification ID                                              |
| created_at        | TIMESTAMPTZ | Creation timestamp                                           |
| created_by        | UUID (FK)   | References profiles(id), null for system notifications       |
| title             | TEXT        | Notification title                                           |
| message           | TEXT        | Rich text HTML content                                       |
| type              | TEXT        | 'info', 'alert', 'announcement', or 'reminder'               |
| priority          | TEXT        | 'normal', 'important', or 'urgent' (affects display order)   |
| action_label      | TEXT        | Optional action button label (e.g., "Voir le devoir")        |
| action_url        | TEXT        | Optional action URL (e.g., "/dashboard/student/devoirs/123") |
| target_type       | TEXT        | 'all', 'role', 'classes', or 'users'                         |
| target_roles      | TEXT[]      | Target roles if target_type='role' (e.g., ['student'])       |
| target_class_ids  | UUID[]      | Target class IDs if target_type='classes'                    |
| target_user_ids   | UUID[]      | Target user IDs if target_type='users'                       |
| expires_at        | TIMESTAMPTZ | Expiration date (default: 30 days from creation)             |
| deleted_at        | TIMESTAMPTZ | Soft delete timestamp (by creator or admin)                  |
| is_system         | BOOLEAN     | True if created automatically by the system                  |
| system_event_type | TEXT        | Event type for system notifications (see below)              |

**System Event Types**:

- `assignment_created`: New assignment posted
- `resource_added`: New resource shared
- `reward_earned`: Gidouilles or VIP card earned
- `badge_unlocked`: New badge unlocked
- `maintenance_scheduled`: System maintenance announcement
- `feature_released`: New feature announcement

**Targeting Logic**:

- `target_type='all'`: All users receive the notification
- `target_type='role'`: Users with roles in `target_roles` array
- `target_type='classes'`: Students in classes from `target_class_ids` array
- `target_type='users'`: Specific users from `target_user_ids` array

**Indexes**:

```sql
CREATE INDEX idx_notifications_active ON notifications(created_at DESC)
  WHERE deleted_at IS NULL AND expires_at > now();

CREATE INDEX idx_notifications_created_by ON notifications(created_by)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_target_type ON notifications(target_type)
  WHERE deleted_at IS NULL AND expires_at > now();
```

**RLS Policies**:

1. **View Notifications**: Users can view notifications that target them
   - All users if `target_type='all'`
   - Users with matching role if `target_type='role'`
   - Students in target classes if `target_type='classes'`
   - Directly targeted users if `target_type='users'`
   - Creators can always see their own notifications

2. **Create Notifications**:
   - Teachers: Can target their own classes or students
   - Admins: Can create any notification

3. **Delete (soft delete)**:
   - Users: Can delete their own notifications
   - Admins: Can delete any notification

#### `notification_reads`

Tracks which users have read which notifications.

| Column          | Type        | Description                           |
| --------------- | ----------- | ------------------------------------- |
| id              | UUID (PK)   | Read record ID                        |
| notification_id | UUID (FK)   | References notifications(id)          |
| user_id         | UUID (FK)   | References profiles(id)               |
| read_at         | TIMESTAMPTZ | When the notification was marked read |
| created_at      | TIMESTAMPTZ | Record creation timestamp             |

**Unique Constraint**: (notification_id, user_id) - prevents duplicate reads

**Indexes**:

```sql
CREATE INDEX idx_notification_reads_user ON notification_reads(user_id, notification_id);
CREATE INDEX idx_notification_reads_notification ON notification_reads(notification_id);
```

**RLS Policies**:

1. **View**: Users can view their own read status
2. **Insert**: Users can mark notifications as read (for themselves only)
3. **Stats**: Creators and admins can view read statistics for their notifications

#### Notification Lifecycle

1. **Creation**:
   - Manual: Teacher/admin creates via UI
   - Automatic: System event triggers notification

2. **Delivery**:
   - Notifications are not sent to individual users
   - Each user's unread notifications are computed on-demand via queries

3. **Reading**:
   - User marks notification as read
   - Insert into `notification_reads` table
   - Notification disappears from unread list

4. **Expiration**:
   - Default: 30 days from creation
   - Expired notifications are filtered from queries
   - Cleanup job can hard-delete expired notifications

5. **Deletion**:
   - Soft delete: `deleted_at` timestamp set
   - Deleted notifications are filtered from all queries
   - Hard delete: Optional cleanup after expiration

#### Notification Priority Display

In the banner carousel and dropdown, notifications are sorted by:

1. Priority (urgent → important → normal)
2. Creation date (newest first)

#### Example Queries

**Get unread notifications for current user**:

```typescript
const { data: notifications } = await supabase
	.from('notifications')
	.select(
		`
		*,
		creator:profiles!created_by(firstname, lastname)
	`
	)
	.is('deleted_at', null)
	.gt('expires_at', new Date().toISOString())
	.or(
		`target_type.eq.all,` +
			`and(target_type.eq.role,target_roles.cs.{${userRole}}),` +
			`and(target_type.eq.classes,target_class_ids.cs.{${userClassIds.join(',')}}),` +
			`and(target_type.eq.users,target_user_ids.cs.{${userId}})`
	)
	.not(
		'id',
		'in',
		`(
		SELECT notification_id FROM notification_reads WHERE user_id = '${userId}'
	)`
	)
	.order('priority', { ascending: false }) // urgent first
	.order('created_at', { ascending: false });
```

**Mark notification as read**:

```typescript
await supabase.from('notification_reads').insert({
	notification_id: notificationId,
	user_id: userId
});
```

**Get read statistics for a notification**:

```typescript
// Total potential recipients (example for class-targeted notification)
const { count: totalCount } = await supabase
	.from('class_members')
	.select('*', { count: 'exact', head: true })
	.in('class_id', targetClassIds);

// Read count
const { count: readCount } = await supabase
	.from('notification_reads')
	.select('*', { count: 'exact', head: true })
	.eq('notification_id', notificationId);

// Display: "Lu par 18/24"
```

**Create system notification**:

```typescript
await supabase.from('notifications').insert({
	title: 'Nouveau devoir assigné',
	message: `<p>Le professeur ${teacherName} a assigné un nouveau devoir : <strong>${assignmentTitle}</strong></p>`,
	type: 'info',
	priority: 'normal',
	action_label: 'Voir le devoir',
	action_url: `/dashboard/student/devoirs/${assignmentId}`,
	target_type: 'classes',
	target_class_ids: [classId],
	is_system: true,
	system_event_type: 'assignment_created'
});
```

#### UI Components

The notification system includes:

1. **NotificationBanner**: Sticky carousel at top of dashboard showing urgent/unread notifications
2. **NotificationBadge**: Sidebar icon with unread count badge
3. **NotificationDropdown**: Popover showing recent unread notifications
4. **NotificationList**: Full page showing all unread notifications
5. **NotificationForm**: Creation interface for teachers/admins
6. **NotificationManagement**: Page showing sent notifications with read statistics

#### Automatic Notifications

The system automatically creates notifications for:

| Event                 | Trigger                   | Target             | Priority  |
| --------------------- | ------------------------- | ------------------ | --------- |
| Assignment created    | Assignment form action    | Class students     | Normal    |
| Resource added        | Resource upload           | Class students     | Normal    |
| Reward earned         | Gidouilles/VIP card award | Individual student | Normal    |
| Badge unlocked        | Badge achievement         | Individual student | Normal    |
| Maintenance scheduled | Admin manual              | All users          | Important |
| Feature released      | Admin manual              | All or role-based  | Normal    |

## Assessment System

The assessment system allows teachers to create graded evaluations based on the question cart categories, assign them to classes or individual students, track attempts, and view results.

### Assessment System Tables

#### `assessments`

Teacher-created assessments/evaluations with configurable settings.

| Column      | Type        | Description                                                 |
| ----------- | ----------- | ----------------------------------------------------------- |
| id          | UUID (PK)   | Assessment ID                                               |
| title       | TEXT        | Assessment title                                            |
| grade       | TEXT        | Grade level (e.g., '6ème', '5ème', '4ème', '3ème')          |
| description | TEXT        | Optional description of the assessment                      |
| created_by  | UUID (FK)   | Teacher who created the assessment → profiles(id)           |
| categories  | JSONB       | Array of CartItem objects (same structure as question cart) |
| settings    | JSONB       | Assessment settings (see below)                             |
| status      | TEXT        | 'draft', 'published', or 'archived'                         |
| created_at  | TIMESTAMPTZ | Creation timestamp                                          |
| updated_at  | TIMESTAMPTZ | Last update timestamp (auto-updated via trigger)            |

**Settings Structure (JSONB)**:

```json
{
  "max_attempts": null | number,      // null = unlimited attempts
  "time_limit": null | number,        // Total time limit in seconds, null = no limit
  "deadline": null | string,          // ISO timestamp, null = no deadline
  "shuffle_questions": boolean        // Whether to randomize question order
}
```

**Categories Structure (JSONB)**: Same as question cart `CartItem[]`

```typescript
interface CartItem {
	category: {
		theme: string;
		domain: string;
		subdomain: string | null;
		level: string;
	};
	quantity: number; // Number of questions
	delay: number; // Time per question (seconds)
}
```

#### `assessment_assignments`

Tracks which assessments are assigned to which classes or students.

| Column        | Type        | Description                                               |
| ------------- | ----------- | --------------------------------------------------------- |
| id            | UUID (PK)   | Assignment ID                                             |
| assessment_id | UUID (FK)   | Assessment reference → assessments(id)                    |
| class_id      | UUID (FK)   | Class assignment → classes(id) (null if student-specific) |
| student_id    | UUID (FK)   | Student assignment → profiles(id) (null if class-wide)    |
| assigned_by   | UUID (FK)   | Teacher who made the assignment → profiles(id)            |
| assigned_at   | TIMESTAMPTZ | Assignment timestamp                                      |

**Constraint**: Must target either a class OR a student, not both or neither:

```sql
CHECK (
  (class_id IS NOT NULL AND student_id IS NULL) OR
  (class_id IS NULL AND student_id IS NOT NULL)
)
```

#### `test_sessions` (modified)

Modified to support assessment assignments. Added column:

| Column        | Type      | Description                                               |
| ------------- | --------- | --------------------------------------------------------- |
| assignment_id | UUID (FK) | Reference to assessment assignment (null = free practice) |

All other columns remain unchanged from the existing test sessions table.

#### `assessment_results` (view)

Aggregated view for teacher dashboard showing best attempt per student for each assignment.

| Column            | Type        | Description                                             |
| ----------------- | ----------- | ------------------------------------------------------- |
| assignment_id     | UUID        | Assignment ID                                           |
| assessment_id     | UUID        | Assessment ID                                           |
| assessment_title  | TEXT        | Assessment title                                        |
| assessment_grade  | TEXT        | Assessment grade level                                  |
| class_id          | UUID        | Class ID (if assigned to class)                         |
| student_id        | UUID        | Student ID                                              |
| student_user_id   | UUID        | Student's user ID                                       |
| student_firstname | TEXT        | Student first name                                      |
| student_lastname  | TEXT        | Student last name                                       |
| class_name        | TEXT        | Class name (if assigned to class)                       |
| best_score        | NUMERIC     | Highest score among all attempts (0-10 scale)           |
| attempts_count    | INTEGER     | Number of attempts made                                 |
| last_attempt_at   | TIMESTAMPTZ | Timestamp of most recent attempt                        |
| status            | TEXT        | 'not_started', 'in_progress', 'completed', or 'expired' |
| total_questions   | INTEGER     | Total number of questions                               |

### Assessment Workflow

#### 1. Creation (Teacher)

1. Teacher adds questions to cart from Automaths (/automaths)
2. Teacher navigates to "Create Assessment" (/dashboard/teacher/assessments/new)
3. Three-step wizard:
   - Step 1: Review selected question categories from cart
   - Step 2: Configure assessment (title, grade, settings)
   - Step 3: Review and publish (or save as draft)
4. Assessment created with status='draft' or 'published'

#### 2. Assignment (Teacher)

1. Only **published** assessments can be assigned
2. Teacher navigates to assessment detail and clicks "Assign"
3. Teacher selects classes or individual students
4. System creates assessment_assignments records
5. Students in assigned classes can now see the assessment

#### 3. Taking Assessment (Student)

1. Student sees assigned assessment on dashboard (/dashboard/student/assessments)
2. Student clicks "Commencer" (Start)
3. System validates:
   - Deadline not passed
   - Max attempts not exceeded
   - Assessment is published
4. Student is redirected to test page: `/automaths/test?assignment={assignmentId}&mode=interactive`
5. Test page loads assessment categories and generates questions
6. Student completes test in interactive mode
7. Results saved to test_sessions with assignment_id link

#### 4. Viewing Results

**Teachers** (/dashboard/teacher/assessments/{id}/results):

- Overall statistics (completion rate, average score, etc.)
- Student-by-student results table
- Can see all attempts for each student

**Students** (/dashboard/student/assessments/{id}/results):

- Personal statistics (best score, average, attempts)
- History of all attempts with scores and timestamps
- Cannot see other students' results

### Status Logic

**Assessment Status** (stored in `assessments.status`):

- `draft`: Being created, not yet published, cannot be assigned
- `published`: Active and can be assigned to students
- `archived`: No longer active, hidden from default views

**Student Assignment Status** (derived in views/queries):

- `not_started`: Student has never attempted (attempts_count = 0, deadline not passed)
- `in_progress`: Student started but hasn't completed any attempt (attempts_count > 0, no completed_at)
- `completed`: Student completed at least one attempt (has completed_at)
- `expired`: Deadline passed without any attempts (attempts_count = 0, deadline passed)

### Indexes

Performance indexes for efficient queries:

```sql
-- Assessments
CREATE INDEX idx_assessments_created_by ON assessments(created_by);
CREATE INDEX idx_assessments_grade ON assessments(grade);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);

-- Assignments
CREATE INDEX idx_assessment_assignments_assessment_id ON assessment_assignments(assessment_id);
CREATE INDEX idx_assessment_assignments_class_id ON assessment_assignments(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_assessment_assignments_student_id ON assessment_assignments(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_assessment_assignments_assigned_by ON assessment_assignments(assigned_by);

-- Test sessions (for assignment lookup)
CREATE INDEX idx_test_sessions_assignment_id ON test_sessions(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_test_sessions_assignment_user ON test_sessions(assignment_id, user_id) WHERE assignment_id IS NOT NULL;
```

### RLS Policies

#### Assessments

**Teachers**:

- Can view their own assessments: `created_by = auth.uid()`
- Can create assessments: `role = 'teacher' AND created_by = auth.uid()`
- Can update/delete their own assessments

**Students**:

- Can view published assessments that are assigned to them (directly or via class)

**Admins**:

- Full access to all assessments

#### Assessment Assignments

**Teachers**:

- Can view assignments for their assessments
- Can create assignments for their own assessments and their own classes/students
- Can delete assignments for their assessments

**Students**:

- Can view their own assignments (direct or via class membership)

**Admins**:

- Full access to all assignments

### Server-Side Functions

Core functions in `src/lib/server/assessments.ts`:

**CRUD Operations**:

- `createAssessment(supabase, data, userId)` - Create new assessment
- `getAssessment(supabase, assessmentId)` - Get single assessment
- `getTeacherAssessments(supabase, teacherId, status?)` - Get teacher's assessments
- `updateAssessment(supabase, assessmentId, data, userId)` - Update assessment
- `publishAssessment(supabase, assessmentId, userId)` - Publish draft
- `archiveAssessment(supabase, assessmentId, userId)` - Archive assessment

**Assignment Management**:

- `assignAssessment(supabase, data, teacherId)` - Assign to classes/students
- `getAssessmentAssignments(supabase, assessmentId)` - Get all assignments
- `removeAssignment(supabase, assignmentId, teacherId)` - Remove assignment
- `getStudentAssignments(supabase, studentId)` - Get student's assigned assessments

**Attempt Validation**:

- `validateAttempt(supabase, assignmentId, studentId)` - Check if student can start attempt

**Results & Statistics**:

- `getAssessmentResults(supabase, assessmentId)` - Get all student results
- `getAssessmentStatistics(supabase, assessmentId)` - Get aggregated stats
- `getClassStatistics(supabase, assessmentId)` - Get per-class stats

### Example Queries

#### Get student's assigned assessments with attempt stats

```sql
SELECT
  aa.*,
  a.title,
  a.grade,
  a.settings,
  COUNT(ts.id) as attempts_count,
  MAX(ts.score) as best_score,
  MAX(ts.completed_at) as last_attempt_at
FROM assessment_assignments aa
JOIN assessments a ON a.id = aa.assessment_id
LEFT JOIN test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = :student_id
WHERE a.status = 'published'
  AND (
    aa.student_id = :student_id
    OR aa.class_id IN (
      SELECT class_id FROM class_members WHERE student_id = :student_id
    )
  )
GROUP BY aa.id, a.id;
```

#### Get teacher's assessment with assignment count

```sql
SELECT
  a.*,
  COUNT(DISTINCT aa.id) as assignments_count
FROM assessments a
LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
WHERE a.created_by = :teacher_id
GROUP BY a.id
ORDER BY a.created_at DESC;
```

#### Get assessment completion statistics

```sql
SELECT
  COUNT(*) as total_assigned,
  COUNT(*) FILTER (WHERE attempts_count = 0) as not_started,
  COUNT(*) FILTER (WHERE attempts_count > 0 AND last_attempt_at IS NULL) as in_progress,
  COUNT(*) FILTER (WHERE last_attempt_at IS NOT NULL) as completed,
  AVG(best_score) FILTER (WHERE best_score IS NOT NULL) as average_score
FROM assessment_results
WHERE assessment_id = :assessment_id;
```

### Related Documentation

- **Migration**: `supabase/migrations/082_create_assessment_system.sql`
- **Types**: `src/lib/types/assessment.ts`
- **Server Functions**: `src/lib/server/assessments.ts`
- **API Routes**: `src/routes/api/assessments/`
- **Teacher Pages**: `src/routes/(protected)/dashboard/teacher/assessments/`
- **Student Pages**: `src/routes/(protected)/dashboard/student/assessments/`
- **Components**: `src/lib/components/assessments/`

---

## Riddles (Énigmes) System

Math riddles/enigmas with automatic and manual validation, riddle of the day, degressive rewards, and leaderboard system.

### Tables

#### `riddles`

Mathematical riddles/enigmas created by teachers.

| Column        | Type    | Description                                                     |
| ------------- | ------- | --------------------------------------------------------------- |
| id            | UUID    | Riddle ID                                                       |
| riddle_number | SERIAL  | Auto-incrementing display number (global, unique)               |
| title         | TEXT    | Riddle title                                                    |
| genre         | TEXT    | Free-form tag (e.g., "Logique", "Géométrie")                    |
| difficulty    | INTEGER | Difficulty level: 1 (Facile), 2 (Moyen), 3 (Difficile)          |
| statement     | TEXT    | Problem statement (HTML rich text)                              |
| correction    | TEXT    | Solution/explanation (HTML rich text, visible to teachers only) |
| image_url     | TEXT    | Optional image URL                                              |
| answer        | JSONB   | Optional automatic validation config (null = manual validation) |
| created_by    | UUID    | Teacher who created the riddle (FK → profiles)                  |
| status        | TEXT    | 'draft' or 'published'                                          |
| created_at    | TSTZ    | Creation timestamp                                              |
| updated_at    | TSTZ    | Last update timestamp                                           |

**Answer Structure** (JSONB):

```json
{
  "type": "numerical" | "text" | "qcm" | "math",
  "value": <expected answer(s)>,
  "options": {
    "tolerance": 0.01,          // For numerical
    "caseSensitive": false,     // For text
    "choices": ["A", "B", "C"], // For QCM
    "exactMatch": true          // For math
  }
}
```

**Validation Types**:

- `numerical`: Number with tolerance
- `text`: Text exact match (case insensitive by default)
- `qcm`: Multiple choice
- `math`: Mathematical expression

**Status**:

- `draft`: Not yet published, visible only to creator
- `published`: Active, can be assigned or used as riddle of the day

#### `riddle_assignments`

Specific assignments of riddles to classes or students.

| Column      | Type | Description                                        |
| ----------- | ---- | -------------------------------------------------- |
| id          | UUID | Assignment ID                                      |
| riddle_id   | UUID | Riddle being assigned (FK → riddles)               |
| class_id    | UUID | Class assignment (FK → classes, mutually exclusive |
| student_id  | UUID | Student assignment (FK → profiles, with class_id)  |
| assigned_by | UUID | Teacher who made assignment (FK → profiles)        |
| assigned_at | TSTZ | Assignment timestamp                               |

**Constraint**: Must have either `class_id` OR `student_id`, not both or neither.

**Note**: Riddle of the day is accessible to all students without explicit assignment.

#### `riddle_of_the_day`

Daily riddle accessible to all students (one per day for entire school).

| Column        | Type    | Description                                    |
| ------------- | ------- | ---------------------------------------------- |
| id            | UUID    | Record ID                                      |
| riddle_id     | UUID    | Riddle selected for the day (FK → riddles)     |
| date          | DATE    | Date (unique - only one riddle per day)        |
| auto_selected | BOOLEAN | true = automatic rotation, false = manual pick |
| selected_by   | UUID    | User who selected (FK → profiles, if manual)   |
| created_at    | TSTZ    | Creation timestamp                             |

**Selection Methods**:

- **Automatic**: Cron job selects random published riddle, avoiding recent ones
- **Manual**: Teacher/admin overrides with specific riddle

**Accessibility**: All students can access riddle of the day regardless of class assignments.

#### `riddle_attempts`

Student attempts at solving riddles with degressive rewards.

| Column             | Type    | Description                                            |
| ------------------ | ------- | ------------------------------------------------------ |
| id                 | UUID    | Attempt ID                                             |
| riddle_id          | UUID    | Riddle being attempted (FK → riddles)                  |
| student_id         | UUID    | Student making attempt (FK → profiles)                 |
| attempt_number     | INTEGER | Attempt sequence number (1, 2, 3, ...)                 |
| submitted_answer   | JSONB   | Student's answer (structure depends on riddle type)    |
| is_correct         | BOOLEAN | null = awaiting validation, true/false = validated     |
| validated_by       | UUID    | Teacher who validated (FK → profiles, if manual)       |
| validated_at       | TSTZ    | Validation timestamp                                   |
| gidouilles_awarded | INTEGER | Gidouilles earned (calculated with degressive formula) |
| created_at         | TSTZ    | Attempt timestamp                                      |

**Unique Constraint**: (riddle_id, student_id, attempt_number)

**Degressive Rewards Formula**:

```
gidouilles = difficulty × multiplier

Multiplier:
- 1st attempt: 3
- 2nd attempt: 2
- 3rd+ attempts: 1

Examples:
- Difficulty 1: 3 → 2 → 1 gidouilles
- Difficulty 2: 6 → 4 → 2 gidouilles
- Difficulty 3: 9 → 6 → 3 gidouilles
```

**Validation Flow**:

1. **With `answer` config**: Automatic validation → immediate `is_correct` + gidouilles
2. **Without `answer`**: Manual validation → `is_correct = NULL` → teacher validates via messaging

### Views

#### `riddle_stats`

Statistics per riddle for teacher dashboard.

| Column                   | Type    | Description                                  |
| ------------------------ | ------- | -------------------------------------------- |
| riddle_id                | UUID    | Riddle ID                                    |
| riddle_number            | INTEGER | Display number                               |
| title                    | TEXT    | Riddle title                                 |
| genre                    | TEXT    | Genre tag                                    |
| difficulty               | INTEGER | Difficulty level                             |
| created_by               | UUID    | Creator ID                                   |
| unique_students          | INTEGER | Number of students who attempted             |
| total_attempts           | INTEGER | Total attempts across all students           |
| avg_attempts_to_success  | DECIMAL | Average attempts needed for success          |
| successful_attempts      | INTEGER | Number of successful attempts                |
| success_rate_percent     | DECIMAL | Success rate (0-100%)                        |
| first_attempts           | INTEGER | Attempts made on 1st try                     |
| second_attempts          | INTEGER | Attempts made on 2nd try                     |
| third_plus_attempts      | INTEGER | Attempts made on 3rd+ try                    |
| pending_validations      | INTEGER | Awaiting manual validation                   |
| total_gidouilles_awarded | INTEGER | Total gidouilles distributed for this riddle |

#### `riddle_progress`

Student progress and leaderboard data.

| Column             | Type    | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| student_id         | UUID    | Student ID                               |
| firstname          | TEXT    | Student first name                       |
| lastname           | TEXT    | Student last name                        |
| avatar_url         | TEXT    | Student avatar                           |
| riddles_completed  | INTEGER | Number of riddles successfully solved    |
| total_attempts     | INTEGER | Total attempts across all riddles        |
| riddles_gidouilles | INTEGER | Total gidouilles earned from riddles     |
| last_success_at    | TSTZ    | Most recent successful attempt           |
| rank               | INTEGER | Global rank (by riddles_gidouilles DESC) |

**Used for**: Leaderboard display and student progress tracking.

#### `riddle_student_history`

Individual student riddle history.

| Column                  | Type    | Description                                 |
| ----------------------- | ------- | ------------------------------------------- |
| student_id              | UUID    | Student ID                                  |
| riddle_id               | UUID    | Riddle ID                                   |
| riddle_number           | INTEGER | Display number                              |
| riddle_title            | TEXT    | Riddle title                                |
| genre                   | TEXT    | Genre tag                                   |
| difficulty              | INTEGER | Difficulty level                            |
| first_attempt_number    | INTEGER | Number of first attempt                     |
| latest_attempt_number   | INTEGER | Number of latest attempt                    |
| total_attempts          | INTEGER | Total attempts for this riddle              |
| ever_succeeded          | BOOLEAN | Whether student ever succeeded              |
| first_success_at        | TSTZ    | Timestamp of first success                  |
| max_gidouilles_earned   | INTEGER | Maximum gidouilles earned in single attempt |
| total_gidouilles_earned | INTEGER | Total gidouilles earned for this riddle     |
| last_attempt_at         | TSTZ    | Most recent attempt timestamp               |

### Functions

#### `get_next_riddle_attempt_number(p_riddle_id, p_student_id)`

Returns the next attempt number for a student on a specific riddle.

**Returns**: INTEGER (1 for first attempt, 2 for second, etc.)

#### `calculate_riddle_gidouilles(p_difficulty, p_attempt_number)`

Calculates gidouilles reward using degressive formula.

**Parameters**:

- `p_difficulty`: 1, 2, or 3
- `p_attempt_number`: 1, 2, 3, ...

**Returns**: INTEGER (gidouilles amount)

**Formula**: `difficulty × multiplier` where multiplier = 3 for 1st, 2 for 2nd, 1 for 3rd+

#### `submit_riddle_attempt(p_riddle_id, p_student_id, p_submitted_answer, p_is_correct)`

Creates a new attempt record and awards gidouilles if correct.

**Parameters**:

- `p_riddle_id`: UUID
- `p_student_id`: UUID
- `p_submitted_answer`: JSONB
- `p_is_correct`: BOOLEAN or NULL (NULL for manual validation)

**Returns**: UUID (attempt_id)

**Side Effects**:

- Creates `riddle_attempts` record
- Updates `profiles.gidouilles` if correct

#### `validate_riddle_attempt(p_attempt_id, p_teacher_id, p_is_correct)`

Manual validation by teacher for riddles without automatic validation.

**Parameters**:

- `p_attempt_id`: UUID
- `p_teacher_id`: UUID
- `p_is_correct`: BOOLEAN

**Returns**: BOOLEAN (success)

**Side Effects**:

- Updates `riddle_attempts` (is_correct, validated_by, validated_at, gidouilles_awarded)
- Updates `profiles.gidouilles` if correct

#### `get_riddle_of_the_day(p_date)`

Gets the riddle of the day for a specific date.

**Parameters**:

- `p_date`: DATE (defaults to today)

**Returns**: UUID (riddle_id) or NULL

#### `set_riddle_of_the_day(p_riddle_id, p_date, p_selected_by)`

Sets or updates the riddle of the day (manual override).

**Parameters**:

- `p_riddle_id`: UUID
- `p_date`: DATE
- `p_selected_by`: UUID (teacher/admin)

**Returns**: UUID (riddle_of_the_day.id)

**Behavior**: Upserts record (updates if date already exists)

### RLS Policies

**Riddles**:

- Teachers: CRUD their own riddles
- Students: SELECT published riddles (assigned OR riddle of the day)
- Admins: Full access

**Riddle Assignments**:

- Teachers: CRUD assignments for their riddles and students
- Students: SELECT their own assignments
- Admins: Full access

**Riddle of the Day**:

- Everyone: SELECT
- Teachers/Admins: INSERT, UPDATE
- Admins: DELETE

**Riddle Attempts**:

- Students: INSERT their attempts, SELECT their attempts
- Teachers: SELECT attempts of their students, UPDATE for validation
- Admins: Full access

### Common Queries

#### Get today's riddle of the day with student's attempt

```sql
SELECT
  r.*,
  rotd.date,
  ra.id as attempt_id,
  ra.attempt_number,
  ra.is_correct,
  ra.gidouilles_awarded
FROM riddle_of_the_day rotd
JOIN riddles r ON r.id = rotd.riddle_id
LEFT JOIN riddle_attempts ra ON ra.riddle_id = r.id
  AND ra.student_id = :student_id
WHERE rotd.date = CURRENT_DATE
  AND r.status = 'published';
```

#### Get teacher's riddles with stats

```sql
SELECT
  r.*,
  rs.unique_students,
  rs.total_attempts,
  rs.success_rate_percent,
  rs.pending_validations
FROM riddles r
LEFT JOIN riddle_stats rs ON rs.riddle_id = r.id
WHERE r.created_by = :teacher_id
ORDER BY r.riddle_number DESC;
```

#### Get leaderboard (top 10 students)

```sql
SELECT
  student_id,
  firstname,
  lastname,
  avatar_url,
  riddles_completed,
  riddles_gidouilles,
  rank
FROM riddle_progress
WHERE riddles_completed > 0
ORDER BY rank ASC
LIMIT 10;
```

#### Get pending manual validations for teacher

```sql
SELECT
  ra.*,
  r.title as riddle_title,
  r.riddle_number,
  r.correction,
  p.firstname as student_firstname,
  p.lastname as student_lastname
FROM riddle_attempts ra
JOIN riddles r ON r.id = ra.riddle_id
JOIN profiles p ON p.id = ra.student_id
WHERE ra.is_correct IS NULL
  AND r.created_by = :teacher_id
ORDER BY ra.created_at ASC;
```

#### Get student's riddle history

```sql
SELECT *
FROM riddle_student_history
WHERE student_id = :student_id
ORDER BY last_attempt_at DESC;
```

### Related Documentation

- **Migration**: `supabase/migrations/099_create_riddles_system.sql`
- **Types**: `src/lib/types/riddle.ts`
- **Teacher Pages**: `src/routes/(protected)/dashboard/teacher/riddles/`
- **Student Pages**: `src/routes/(protected)/dashboard/student/riddles/` (to be implemented)
- **Components**: `src/lib/components/riddles/`
- **Features**:
  - Automatic and manual validation
  - Degressive rewards system
  - Riddle of the day
  - Statistics and leaderboard
  - Rich text and image support

---

## Minesweeper Game System

Classic Minesweeper game with public accessibility and premium features for authenticated students.

### Features

- **Public Gameplay**: Anyone can play without authentication
- **Game Persistence**: Authenticated students can save and resume games
- **Gidouilles Rewards**: Only authenticated students earn in-game currency
- **Statistics Tracking**: Personal stats for authenticated students
- **Leaderboard System**: Competitive rankings by difficulty level

### Tables

#### `minesweeper_games`

Stores Minesweeper game sessions with support for both public and authenticated gameplay.

| Column             | Type        | Description                                                      |
| ------------------ | ----------- | ---------------------------------------------------------------- |
| id                 | UUID (PK)   | Game session ID                                                  |
| student_id         | UUID (FK)   | Student who played (NULL for public/anonymous games)             |
| difficulty         | TEXT        | 'beginner', 'intermediate', or 'expert'                          |
| status             | TEXT        | 'in_progress', 'won', or 'lost'                                  |
| grid_state         | JSONB       | Complete game state for resuming (see structure below)           |
| time_seconds       | INTEGER     | Time elapsed in seconds (NULL for in_progress)                   |
| gidouilles_awarded | INTEGER     | Gidouilles earned (0 for public games, calculated server-side)   |
| started_at         | TIMESTAMPTZ | Auto-set by trigger on first move (NULL until first grid change) |
| completed_at       | TIMESTAMPTZ | Completion timestamp (NULL for in_progress)                      |
| created_at         | TIMESTAMPTZ | Game creation timestamp                                          |

**Foreign Keys**:

- `student_id` → `profiles(id)` (ON DELETE CASCADE)

**Constraints**:

- `difficulty` must be 'beginner', 'intermediate', or 'expert'
- `status` must be 'in_progress', 'won', or 'lost'
- `gidouilles_awarded >= 0 AND gidouilles_awarded <= 1000` (prevents abuse)
- All numeric values must be >= 0

**Grid State JSONB Structure** (GridStateDTO format):

```json
{
  "rows": 9,
  "cols": 9,
  "mines": [[0, 5], [2, 3], ...],            // Array of [row, col] mine positions
  "revealed": [[0, 0], [0, 1], ...],          // Array of [row, col] revealed cells
  "flagged": [[1, 2], ...],                   // Array of [row, col] flagged cells
  "adjacentCounts": {"0,0": 1, "0,1": 2, ...} // Map of "row,col": adjacent mine count
}
```

**Note**: adjacentCounts uses comma separator ("0,0") not hyphen.

**Indexes**:

- `idx_minesweeper_games_student_status` on `(student_id, status)` (WHERE student_id IS NOT NULL)
- `idx_minesweeper_games_resume` on `(student_id, status, created_at DESC)` (for resume game queries)
- `idx_minesweeper_games_difficulty` on `(difficulty, status, time_seconds)` (for leaderboards)

**Triggers**:

- `set_minesweeper_started_at` (BEFORE UPDATE): Auto-sets `started_at` timestamp on first grid_state change

### Functions (RPC)

#### `complete_minesweeper_game(p_game_id UUID, p_grid_state JSONB)`

**Security**: `SECURITY DEFINER` - Runs with elevated privileges for atomic gidouilles update

**Purpose**: Server-side win validation and reward calculation (prevents client-side manipulation)

**Parameters**:

- `p_game_id`: UUID of the game being completed
- `p_grid_state`: Final grid state in GridStateDTO format

**Returns**: TABLE(success BOOLEAN, gidouilles_awarded INTEGER, time_seconds INTEGER)

**Validation Steps**:

1. Verify ownership (student_id matches authenticated user)
2. Verify game is in_progress
3. **Win validation**:
   - All non-mine cells must be revealed
   - No mine cells revealed (except flagged)
   - Reject if validation fails
4. Calculate time elapsed (NOW() - started_at)
5. Calculate gidouilles with bonuses:
   - Time bonus (degressive): 2.0× (≤50% target), 1.5× (≤75%), 1.0× (≤100%), 0.5× (>100%)
   - Daily degressive: 1.0× (1st win), 0.8× (2nd), 0.6× (3rd), 0.4× (4th+)
   - Cap at max 1000 gidouilles
6. Atomically:
   - Update game status to 'won'
   - Set completed_at timestamp
   - Update student's gidouilles balance

**Example**:

```sql
SELECT * FROM complete_minesweeper_game(
  'game-uuid-here',
  '{"rows": 9, "cols": 9, "mines": [[0,3]], ...}'::jsonb
);
-- Returns: (true, 20, 90) for successful completion with 20 gidouilles in 90 seconds
```

#### `record_minesweeper_loss(p_game_id UUID, p_grid_state JSONB)`

**Security**: `SECURITY DEFINER`

**Purpose**: Records a game loss (mine explosion) with final grid state

**Parameters**:

- `p_game_id`: UUID of the game
- `p_grid_state`: Final grid state with exploded mine

**Returns**: TABLE(success BOOLEAN)

**Flow**:

1. Verify ownership
2. Verify game is in_progress
3. Update status to 'lost'
4. Set completed_at timestamp
5. Save final grid_state

**Example**:

```sql
SELECT * FROM record_minesweeper_loss(
  'game-uuid-here',
  '{"rows": 9, "cols": 9, ...}'::jsonb
);
-- Returns: (true) for successful recording
```

### Views

#### `minesweeper_leaderboard`

Ranked leaderboard partitioned by difficulty level. Only includes authenticated users with at least one win.

| Column           | Type    | Description                                       |
| ---------------- | ------- | ------------------------------------------------- |
| student_id       | UUID    | Student ID                                        |
| first_name       | TEXT    | Student first name (from profiles)                |
| last_name        | TEXT    | Student last name (from profiles)                 |
| difficulty       | TEXT    | Game difficulty level                             |
| games_won        | INTEGER | Number of games won at this difficulty            |
| games_played     | INTEGER | Total games played at this difficulty             |
| best_time        | INTEGER | Best completion time in seconds                   |
| total_gidouilles | INTEGER | Total gidouilles earned at this difficulty        |
| win_rate         | NUMERIC | Win percentage (rounded to 1 decimal place)       |
| rank             | INTEGER | Rank within difficulty (ordered by best_time ASC) |

**Ranking Logic**:

- Partitioned by `difficulty`
- Ordered by `best_time ASC` (fastest time = rank 1)
- Secondary sort by `games_won DESC` for ties
- Only includes students with at least 1 win

### RLS Policies

**minesweeper_games**:

- **SELECT**: Authenticated users can view their own games (`student_id = auth.uid()`)
- **INSERT** (authenticated): Students can create games with `student_id = auth.uid()`
- **INSERT** (anonymous): Anyone can create public games with `student_id = NULL` and `gidouilles_awarded = 0`
- **UPDATE**: Only authenticated users can update their own games (`student_id = auth.uid()`)
- **DELETE**: Only authenticated users can delete their own games (`student_id = auth.uid()`)

**minesweeper_leaderboard** (view):

- **SELECT**: Available to both `authenticated` and `anon` users (public leaderboard)
- Security: Uses `security_invoker = on` to inherit RLS from base tables

### Common Queries

#### Get user's game statistics by difficulty

```sql
SELECT
  difficulty,
  COUNT(*) FILTER (WHERE status = 'won') as games_won,
  COUNT(*) FILTER (WHERE status = 'lost') as games_lost,
  COUNT(*) FILTER (WHERE status = 'in_progress') as games_in_progress,
  MIN(time_seconds) FILTER (WHERE status = 'won') as best_time,
  AVG(time_seconds) FILTER (WHERE status = 'won') as avg_time,
  SUM(gidouilles_awarded) as total_gidouilles
FROM minesweeper_games
WHERE student_id = :student_id
GROUP BY difficulty
ORDER BY
  CASE difficulty
    WHEN 'beginner' THEN 1
    WHEN 'intermediate' THEN 2
    WHEN 'expert' THEN 3
  END;
```

#### Get leaderboard for specific difficulty

```sql
SELECT *
FROM minesweeper_leaderboard
WHERE difficulty = 'expert'
ORDER BY rank
LIMIT 100;
```

#### Resume in-progress game

```sql
SELECT *
FROM minesweeper_games
WHERE student_id = :student_id
  AND status = 'in_progress'
ORDER BY created_at DESC
LIMIT 1;
```

#### Cleanup old abandoned games (cron job)

```sql
-- Delete in-progress games older than 7 days
DELETE FROM minesweeper_games
WHERE status = 'in_progress'
  AND created_at < NOW() - INTERVAL '7 days';
```

### Design Decisions

**Why NULL student_id for public games?**

- Allows anyone to play without authentication
- Enforced at DB level: public games cannot earn gidouilles
- RLS policies ensure proper separation between public and authenticated gameplay

**Why JSONB for grid_state?**

- Enables complete game state persistence
- Flexible structure for different difficulty levels
- Supports efficient resume functionality
- No need for complex relational structure for ephemeral game state

**Why separate leaderboard view?**

- Pre-computed rankings improve query performance
- Simplifies frontend queries
- Automatic filtering of incomplete data
- Partition by difficulty for fair competition

**Gidouilles reward strategy**:

- Only awarded to authenticated students (incentivizes account creation)
- Awarded on game completion (won status)
- Amount can vary by difficulty level (implementation detail in application logic)

### Migrations

**Created**: 2025-11-18

1. **`20251118063746_create_minesweeper_tables.sql`**
   - Initial schema with minesweeper_games table and leaderboard view
   - Basic RLS policies for authenticated users
   - Indexes for performance

2. **`20251118120000_harden_minesweeper_security.sql`**
   - Security hardening based on security audit
   - Added `started_at` column and auto-trigger
   - Implemented SECURITY DEFINER RPC functions (complete_minesweeper_game, record_minesweeper_loss)
   - Server-side win validation to prevent client manipulation
   - Server-side gidouilles calculation with time bonuses
   - Added gidouilles cap (max 1000) to prevent abuse
   - Daily degressive multiplier for repeated wins

### Related Documentation

- **Feature Guide**: [docs/features/minesweeper.md](../features/minesweeper.md) - Complete user and technical guide
- **Types**: `src/lib/types/minesweeper.ts` - TypeScript interfaces
- **Store**: `src/lib/stores/minesweeper.svelte.ts` - Game logic and state management
- **Validation**: `src/lib/server/validation/minesweeper.ts` - Difficulty-specific Zod schemas
- **API Routes**: `src/routes/api/games/minesweeper/` - API endpoints
- **Public Page**: `src/routes/(public)/games/minesweeper/` - Main game interface
- **Stats Page**: `src/routes/(protected)/dashboard/student/minesweeper/stats/` - Personal statistics
- **Leaderboard**: `src/routes/(protected)/dashboard/student/minesweeper/leaderboard/` - Rankings
- **Components**: `src/lib/components/game/minesweeper/` - UI components

---

## Universal Achievements System

**NEW: 2025-11-21** - Context-aware achievement tracking across all UbuMaths features.

### Overview

The Universal Achievements System is a flexible, event-driven achievement tracking system that works across all features: Minesweeper, Questions, Assessments, SRS, Riddles, and Social interactions.

**Key Features:**

- Context-aware (achievements specific to features)
- Flexible unlocking (automatic, progressive, or manual)
- Context variations (same achievement for different difficulties/subjects/tiers)
- Repeatable achievements with limits
- Prerequisites support
- XP points and Gidouilles rewards
- Teacher manual awards
- Real-time event processing

### Tables

#### `achievements`

Achievement definitions (templates) that can be unlocked by students.

| Column          | Type        | Description                                                                                                                   |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`            | TEXT (PK)   | Slug identifier (e.g., `minesweeper_first_win`)                                                                               |
| `context`       | TEXT        | Feature: `minesweeper`, `questions`, `assessments`, `srs`, `riddles`, `social`, `meta`, `system`                              |
| `category`      | TEXT        | Category: `speed`, `accuracy`, `streak`, `mastery`, `exploration`, `social`, `collection`, `milestone`, `special`, `seasonal` |
| `name`          | TEXT        | Display name (French)                                                                                                         |
| `description`   | TEXT        | Description (French)                                                                                                          |
| `icon`          | TEXT        | Emoji or icon identifier                                                                                                      |
| `unlock_type`   | TEXT        | How unlocked: `automatic`, `event_based`, `progressive`, `manual`                                                             |
| `metadata`      | JSONB       | Flexible configuration (rewards, conditions, tiers, etc.)                                                                     |
| `is_active`     | BOOLEAN     | Whether achievement is active (default: true)                                                                                 |
| `display_order` | INTEGER     | Sort order for UI (default: 0)                                                                                                |
| `created_at`    | TIMESTAMPTZ | Creation timestamp                                                                                                            |
| `updated_at`    | TIMESTAMPTZ | Last update timestamp                                                                                                         |

**Indexes:**

- `idx_achievements_context` (context) WHERE is_active = true
- `idx_achievements_category` (category) WHERE is_active = true
- `idx_achievements_display_order` (display_order) WHERE is_active = true
- `idx_achievements_metadata_gin` GIN (metadata)

**Metadata Examples:**

```json
// Minesweeper speed achievement
{
  "difficulty_specific": true,
  "points": 50,
  "gidouilles_reward": 20,
  "rarity": "epic",
  "unlock_conditions": {
    "type": "minesweeper_game_completed",
    "params": {
      "max_time": 90,
      "difficulty": "expert"
    }
  }
}

// Progressive questions achievement
{
  "subject_specific": true,
  "show_progress": true,
  "points": 100,
  "gidouilles_reward": 50,
  "rarity": "legendary",
  "unlock_conditions": {
    "type": "questions_answered",
    "params": {
      "target": 50,
      "min_accuracy": 0.95,
      "subject": "calculus"
    }
  }
}

// Repeatable social achievement
{
  "repeatable": true,
  "max_repetitions": 5,
  "points": 10,
  "gidouilles_reward": 5,
  "unlock_conditions": {
    "type": "friend_added",
    "params": {}
  }
}
```

#### `student_achievements`

Records of achievements unlocked by students.

| Column               | Type                       | Description                                                  |
| -------------------- | -------------------------- | ------------------------------------------------------------ |
| `id`                 | UUID (PK)                  | Unique ID                                                    |
| `student_id`         | UUID (FK → profiles)       | Student who unlocked                                         |
| `achievement_id`     | TEXT (FK → achievements)   | Achievement unlocked                                         |
| `context_data`       | JSONB                      | Context-specific data (difficulty, subject, tier, iteration) |
| `unlocked_at`        | TIMESTAMPTZ                | When unlocked                                                |
| `unlocked_by`        | UUID (FK → profiles, NULL) | NULL = system, UUID = teacher manual award                   |
| `unlock_reason`      | TEXT                       | Optional description                                         |
| `points_awarded`     | INTEGER                    | XP points awarded (denormalized)                             |
| `gidouilles_awarded` | INTEGER                    | Gidouilles awarded (denormalized)                            |

**UNIQUE Constraint:**

```sql
CONSTRAINT unique_student_achievement UNIQUE NULLS NOT DISTINCT (
  student_id,
  achievement_id,
  (context_data->>'difficulty'),
  (context_data->>'subject'),
  (context_data->>'tier'),
  (context_data->>'iteration')
)
```

This prevents duplicate unlocks while allowing the same achievement for different contexts (e.g., "First Win" achievement for beginner, intermediate, and expert difficulties).

**Indexes:**

- `idx_student_achievements_student` (student_id)
- `idx_student_achievements_achievement` (achievement_id)
- `idx_student_achievements_unlocked` (student_id, unlocked_at DESC)
- `idx_student_achievements_context_gin` GIN (context_data)

#### `achievement_progress`

Tracks progress towards progressive achievements (e.g., "Answer 100 questions").

| Column                | Type                     | Description                           |
| --------------------- | ------------------------ | ------------------------------------- |
| `id`                  | UUID (PK)                | Unique ID                             |
| `student_id`          | UUID (FK → profiles)     | Student progressing                   |
| `achievement_id`      | TEXT (FK → achievements) | Achievement being progressed          |
| `current_value`       | NUMERIC                  | Current progress value (CHECK >= 0)   |
| `target_value`        | NUMERIC                  | Target value to complete (CHECK > 0)  |
| `progress_percentage` | INTEGER (GENERATED)      | Auto-calculated 0-100%                |
| `context_key`         | TEXT                     | Optional context (e.g., subject name) |
| `is_active`           | BOOLEAN                  | Whether progress is active            |
| `started_at`          | TIMESTAMPTZ              | When progress started                 |
| `updated_at`          | TIMESTAMPTZ              | Last progress update                  |
| `completed_at`        | TIMESTAMPTZ              | When completed (100%)                 |

**UNIQUE Constraint:** (student_id, achievement_id, context_key)

**Generated Column:**

```sql
progress_percentage INTEGER GENERATED ALWAYS AS (
  LEAST(100, GREATEST(0, ROUND((current_value / NULLIF(target_value, 0)) * 100)))
) STORED
```

**Indexes:**

- `idx_achievement_progress_student` (student_id) WHERE is_active = true
- `idx_achievement_progress_achievement` (achievement_id) WHERE is_active = true
- `idx_achievement_progress_updated` (updated_at DESC) WHERE is_active = true
- `idx_achievement_progress_incomplete` (student_id, achievement_id) WHERE is_active = true AND progress_percentage < 100

#### `achievement_events`

Event log for achievement processing (audit trail + retry queue).

| Column             | Type                 | Description                                     |
| ------------------ | -------------------- | ----------------------------------------------- |
| `id`               | UUID (PK)            | Unique ID                                       |
| `event_type`       | TEXT                 | Event type (e.g., `minesweeper_game_completed`) |
| `event_data`       | JSONB                | Event data (score, time, etc.)                  |
| `student_id`       | UUID (FK → profiles) | Student who triggered event                     |
| `processed`        | BOOLEAN              | Whether event has been processed                |
| `processed_at`     | TIMESTAMPTZ          | When processed                                  |
| `processing_error` | TEXT                 | Error message if processing failed              |
| `created_at`       | TIMESTAMPTZ          | When event occurred                             |

**Indexes:**

- `idx_achievement_events_unprocessed` (created_at) WHERE processed = false
- `idx_achievement_events_student` (student_id, event_type)
- `idx_achievement_events_type` (event_type, created_at DESC)

### Functions

#### `check_achievement_prerequisites(p_student_id UUID, p_achievement_id TEXT) RETURNS BOOLEAN`

Checks if a student has met all prerequisites for an achievement.

**Security:** SECURITY DEFINER with SET search_path = public

#### `update_achievement_progress(p_student_id UUID, p_achievement_id TEXT, p_delta NUMERIC, p_context_key TEXT DEFAULT NULL) RETURNS JSONB`

Updates progress for a progressive achievement. Auto-unlocks when target reached.

**Returns:** `{"current_value": 73, "target_value": 100, "progress_percentage": 73, "completed": false, "newly_unlocked": false}`

**Security:** SECURITY DEFINER with SET search_path = public

#### `process_achievement_event(p_event_type TEXT, p_student_id UUID, p_event_data JSONB DEFAULT '{}') RETURNS JSONB`

Main entry point for achievement processing. Processes an event and unlocks any matching achievements.

**Returns:** `{"event_id": "uuid", "unlocked_achievements": [...], "count": 1}`

**Example:**

```sql
SELECT public.process_achievement_event(
  'minesweeper_game_completed',
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '{"difficulty": "expert", "score": 150, "time_seconds": 45, "perfect": true}'::jsonb
);
```

**Security:** SECURITY DEFINER with SET search_path = public

#### `award_achievement_manual(p_teacher_id UUID, p_student_id UUID, p_achievement_id TEXT, p_reason TEXT DEFAULT NULL) RETURNS BOOLEAN`

Allows teachers to manually award achievements to their students.

**Security:** SECURITY DEFINER with SET search_path = public

- Verifies teacher has access to student (via class membership)
- Only allows manual or event_based achievements

### RLS Policies

**`achievements` table:**

- Anyone can view active achievements
- Admins can manage achievements

**`student_achievements` table:**

- Students can view their own achievements
- Teachers can view their students' achievements (via class membership)
- System can insert (only via SECURITY DEFINER functions - WITH CHECK false)

**`achievement_progress` table:**

- Students can view their own progress
- Teachers can view their students' progress (via class membership)
- System can manage (only via SECURITY DEFINER functions - WITH CHECK false)

**`achievement_events` table:**

- All operations restricted to SECURITY DEFINER functions (WITH CHECK false)

### Event Processing Flow

```
1. Action occurs (e.g., minesweeper game completed)
   ↓
2. Call process_achievement_event()
   ↓
3. Insert event into achievement_events table
   ↓
4. Find matching achievements (by context and unlock_type)
   ↓
5. For each achievement:
   - Check prerequisites
   - Evaluate unlock conditions
   - For progressive: update progress
   - For automatic/event-based: unlock immediately if conditions met
   - Handle repeatable achievements
   ↓
6. Mark event as processed
   ↓
7. Return newly unlocked achievements
```

### Sample Achievements

The migration includes 8 sample achievements:

**Minesweeper:**

- `minesweeper_first_win` - First victory (common, 10 points)
- `minesweeper_speed_demon` - Expert in <90s (epic, 50 points)
- `minesweeper_perfect_beginner` - Perfect beginner game (uncommon, 15 points)

**Questions:**

- `questions_first_answer` - First answer (common, 5 points)
- `questions_streak_10` - 10 correct in a row (uncommon, 25 points, progressive)
- `questions_master_calculus` - 95% accuracy, 50+ questions (legendary, 100 points, progressive)

**Social:**

- `social_first_friend` - First friend added (common, 10 points)
- `social_popular` - 10 friends (rare, 30 points, progressive)

**Meta:**

- `meta_achievement_hunter` - Unlock 25 achievements (epic, 50 points, progressive)

### Design Decisions

**JSONB for Flexibility:** Different achievement types need different configuration. JSONB avoids 50+ columns with mostly NULL values.

**Context Variations:** NULLS NOT DISTINCT allows same achievement for different difficulties/subjects/tiers without duplicate entries.

**Event-Driven Architecture:** Decouples achievement logic from feature code. Single entry point for all unlocks.

**SECURITY DEFINER Protection:** RLS policies block direct INSERT. Functions provide controlled access with search_path protection.

**Generated Percentage:** Auto-calculated progress percentage ensures consistency.

### Performance

**Current:** 200-400ms per event, 2.5-5 events/second
**Optimized:** 60-120ms per event, 50-100 events/second (with Phase 2 optimizations)

See [Performance Analysis](.claude/achievements-performance-analysis.md) for optimization roadmap.

### Migrations

- `20251121000000_create_universal_achievements_system.sql` - Phase 1: Database schema (839 lines)

### Related Documentation

- **Architecture:** [docs/architecture/achievements-system.md](achievements-system.md) - Complete system guide
- **Performance:** [.claude/achievements-performance-analysis.md](../../.claude/achievements-performance-analysis.md) - Optimization roadmap
- **Tests:** [.claude/achievement-tests-summary.md](../../.claude/achievement-tests-summary.md) - Test coverage (77/77 passing)
- **Types:** `src/lib/types/achievements.ts` - TypeScript interfaces
- **Test Suite:** `src/lib/server/achievements/__tests__/` - Comprehensive test coverage

---

## Exercise Bank System

Math exercise bank with rich markdown content, LaTeX formulas, and multiple export formats (web, LaTeX/PDF).

### Tables

#### `exercises`

Mathematical exercises with markdown-formatted statements and solutions.

| Column            | Type        | Description                                                       |
| ----------------- | ----------- | ----------------------------------------------------------------- |
| id                | UUID        | Exercise ID (primary key)                                         |
| title             | TEXT        | Exercise title (optional, for organization)                       |
| source            | TEXT        | Source reference (e.g., book name, author)                        |
| difficulty        | INTEGER     | Difficulty level: 1 (easy), 2 (medium), 3 (hard)                  |
| tags              | TEXT[]      | Tags for categorization (e.g., ['algèbre', 'équations'])          |
| statement_md      | TEXT        | Exercise statement in markdown with LaTeX ($...$ and $$...$$)     |
| solution_md       | TEXT        | Solution/correction in markdown with LaTeX                        |
| grade_levels      | TEXT[]      | Applicable grade levels (e.g., ['3', '2', 'SPE_1'])               |
| topic             | TEXT        | Topic category (e.g., 'Algèbre', 'Géométrie')                     |
| variables         | JSONB       | Parameterization variables (default: `[]`)                        |
| distribution_mode | TEXT        | Instance distribution: `on_demand`, `per_student`, or `per_group` |
| is_public         | BOOLEAN     | Whether exercise is publicly shared (default: `false`)            |
| created_at        | TIMESTAMPTZ | Creation timestamp                                                |
| updated_at        | TIMESTAMPTZ | Last update timestamp                                             |
| created_by        | UUID        | Teacher who created the exercise (FK → profiles.id)               |

**Markdown Format**:

- **Inline math**: `$x^2 + 2x + 1$`
- **Block math**: `$$\int_0^\pi \sin(x) dx = 2$$`
- **Lists**: Ordered (1., a.) and unordered (-, \*, +) with nesting
- **Tables**: GitHub Flavored Markdown (GFM) syntax
- **Images**: `![Description](path/to/image.png)` (stored in Supabase Storage)
- **Text formatting**: `**bold**`, `*italic*`, `` `code` ``

**Example Content**:

```markdown
# Équations du premier degré

Résoudre les équations suivantes:

1. $2x + 3 = 7$
2. $\frac{x}{2} + \frac{x}{3} = 5$

| x   | f(x) |
| --- | ---- |
| 0   | 0    |
| 1   | 2    |
```

**Parameterization**:

Exercises can include variables to generate different instances:

- **Variables**: Defined in the `variables` JSONB array, each variable has a `name` and `expression`
- **Syntax**: Uses Markdown syntax (`{{}}`) for variable references, random values, and evaluations
  - Variable reference: `{{varName}}`
  - Random integer: `{{1..10}}` or `{{random:1..10}}`
  - Random decimal: `{{0.5..9.99:0.01}}`
  - Evaluation: `{{eval:a+b}}`
  - Exclusions: `{{1..10!{{a}}}}`
- **Distribution Modes**:
  - `on_demand`: Students can regenerate unlimited times (random each time)
  - `per_student`: Each student gets unique consistent values (deterministic seed)
  - `per_group`: All students in a group see the same values (shared seed)

**Example Parameterized Exercise**:

```json
{
	"variables": [
		{ "name": "a", "expression": "{{1..10}}" },
		{ "name": "b", "expression": "{{1..10}}" },
		{ "name": "sum", "expression": "{{eval:{{a}}+{{b}}}}" }
	],
	"statement_md": "Calculer : ${{a}} + {{b}}$",
	"solution_md": "La réponse est ${{sum}}$",
	"distribution_mode": "per_student"
}
```

When displayed to a student, variables are resolved to actual values:

- Student 1 might see: "Calculer : $7 + 3$" with solution "La réponse est $10$"
- Student 2 might see: "Calculer : $4 + 9$" with solution "La réponse est $13$"

See: `docs/features/exercises/parameterization-guide.md` for complete documentation.

### Storage

#### `exercise-images` Bucket

Public storage bucket for exercise images.

- **Path structure**: `{userId}/{exerciseId}/{filename}`
- **Access**: Public read, authenticated teachers can upload/update/delete their own images
- **Cleanup**: Images automatically cleaned up when exercise is deleted (trigger)

#### `vip-card-images` Bucket

Public storage bucket for VIP card images uploaded by admins. See [VIP Card System Tables](#storage-bucket-vip-card-images) for detailed documentation.

### Row Level Security

**Teachers can**:

- View all exercises (read)
- Create new exercises (insert)
- Update their own exercises (update)
- Delete their own exercises (delete)

**RLS Policies**:

```sql
-- Teachers can view all exercises
CREATE POLICY "Teachers can view all exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Teachers can create exercises
CREATE POLICY "Teachers can create exercises"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
    AND created_by = auth.uid()
  );

-- Teachers can update/delete their own exercises
CREATE POLICY "Teachers can update own exercises"
  ON exercises FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own exercises"
  ON exercises FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_exercises_created_by ON exercises(created_by);
CREATE INDEX idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX idx_exercises_tags ON exercises USING gin(tags);
CREATE INDEX idx_exercises_grade_levels ON exercises USING gin(grade_levels);
CREATE INDEX idx_exercises_topic ON exercises(topic);
CREATE INDEX idx_exercises_created_at ON exercises(created_at DESC);

-- Parameterization indexes
CREATE INDEX idx_exercises_distribution_mode ON exercises(distribution_mode);
CREATE INDEX idx_exercises_is_public ON exercises(is_public);
CREATE INDEX idx_exercises_has_variables ON exercises((jsonb_array_length(variables) > 0));

-- Full-text search on title and source
CREATE INDEX idx_exercises_search ON exercises
  USING gin(to_tsvector('french', coalesce(title, '') || ' ' || coalesce(source, '')));
```

### Triggers

**Auto-update `updated_at`**:

```sql
CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();
```

### Helper Functions

**Check if exercise has variables**:

```sql
CREATE OR REPLACE FUNCTION is_exercise_parameterized(exercise_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(jsonb_array_length(variables) > 0, false)
  FROM exercises
  WHERE id = exercise_id;
$$ LANGUAGE SQL STABLE;
```

Usage:

```sql
-- Find all parameterized exercises
SELECT * FROM exercises
WHERE is_exercise_parameterized(id);

-- Check if a specific exercise is parameterized
SELECT is_exercise_parameterized('uuid-here');
```

### Usage Examples

#### Create an exercise

```sql
INSERT INTO exercises (
  title,
  source,
  difficulty,
  tags,
  statement_md,
  solution_md,
  grade_levels,
  topic,
  created_by
)
VALUES (
  'Équations du premier degré',
  'Livre de mathématiques 3ème',
  2,
  ARRAY['algèbre', 'équations', '3ème'],
  '# Exercice\n\nRésoudre: $2x + 3 = 7$',
  '# Solution\n\n$$x = 2$$',
  10,
  ARRAY['3', '2'],
  'Algèbre',
  auth.uid()
);
```

#### Find exercises by tags

```sql
SELECT *
FROM exercises
WHERE tags @> ARRAY['algèbre', 'équations']
ORDER BY difficulty ASC, created_at DESC;
```

#### Search exercises

```sql
SELECT *
FROM exercises
WHERE to_tsvector('french', coalesce(title, '') || ' ' || coalesce(source, ''))
  @@ to_tsquery('french', 'pythagore')
ORDER BY created_at DESC;
```

#### Create a parameterized exercise

```sql
INSERT INTO exercises (
  title,
  statement_md,
  solution_md,
  variables,
  distribution_mode,
  difficulty,
  tags,
  grade_levels,
  created_by
)
VALUES (
  'Addition aléatoire',
  'Calculer : ${{a}} + {{b}}$',
  'La réponse est ${{sum}}$',
  '[
    {"name": "a", "expression": "{{1..10}}"},
    {"name": "b", "expression": "{{1..10}}"},
    {"name": "sum", "expression": "{{eval:{{a}}+{{b}}}}"}
  ]'::jsonb,
  'per_student',
  1,
  ARRAY['arithmétique', 'addition'],
  ARRAY['6', '5'],
  auth.uid()
);
```

#### Find parameterized exercises

```sql
-- All exercises with variables
SELECT *
FROM exercises
WHERE jsonb_array_length(variables) > 0;

-- Using the helper function
SELECT *
FROM exercises
WHERE is_exercise_parameterized(id);

-- Per-student distribution mode only
SELECT *
FROM exercises
WHERE distribution_mode = 'per_student'
  AND jsonb_array_length(variables) > 0;
```

### Related Documentation

- **Migrations**:
  - `supabase/migrations/20251026080000_create_exercises_table.sql` (initial table)
  - `supabase/migrations/20251026153000_add_exercise_parameterization.sql` (parameterization)
- **Types**: `src/lib/exercises/types.ts`
- **Instance Generator**: `src/lib/exercises/generator/instance-generator.ts`
- **Parser**: `src/lib/custom-markdown/parser/`
- **Generators**: `src/lib/custom-markdown/generators/`
- **Importers**: `src/lib/custom-markdown/importers/`
- **Components**: `src/lib/components/exercises/`
- **Test Page**: `src/routes/(protected)/test-exercises/` (development)
- **Feature Documentation**:
  - `docs/features/exercises/README.md` (overview)
  - `docs/features/exercises/parameterization-guide.md` (parameterization)
- **Features**:
  - Rich markdown with LaTeX math support
  - GitHub Flavored Markdown (tables, lists)
  - Image upload to Supabase Storage
  - LaTeX/PDF export via transpiler
  - Full-text search in French
  - Tag-based filtering
  - Difficulty and grade level organization
  - **Parameterization with variables** (random values, evaluations)
  - **Three distribution modes** (on-demand, per-student, per-group)
  - **Deterministic seeding** for consistent student experiences

## Student Marketplace System

The marketplace enables students to trade VIP cards and gidouilles within their school through two methods:

1. **Friend-to-Friend Trading**: Private negotiation between friends with offer/counter-offer flow
2. **Public Marketplace**: Public listings visible to all students in the same school

### Tables

#### `marketplace_config`

Controls marketplace enable/disable at school and class levels.

| Column                   | Type        | Description                                                             |
| ------------------------ | ----------- | ----------------------------------------------------------------------- |
| id                       | UUID        | Configuration ID                                                        |
| school_id                | UUID        | School ID (nullable, exactly one of school_id or class_id must be set)  |
| class_id                 | UUID        | Class ID (nullable, exactly one of school_id or class_id must be set)   |
| enabled_globally         | BOOLEAN     | For school-level: enables marketplace for entire school (default false) |
| enabled_for_class        | BOOLEAN     | For class-level: overrides school setting (default true)                |
| max_listings_per_student | INTEGER     | Max active public listings per student (default 5)                      |
| max_trades_per_day       | INTEGER     | Max completed trades per day per student (default 10)                   |
| listing_duration_days    | INTEGER     | Days before listings auto-expire (default 7)                            |
| created_at               | TIMESTAMPTZ | Creation timestamp                                                      |
| updated_at               | TIMESTAMPTZ | Last update timestamp                                                   |
| updated_by               | UUID        | User who last updated                                                   |

#### `marketplace_listings`

Public sell/buy listings in the marketplace.

| Column                   | Type        | Description                                                     |
| ------------------------ | ----------- | --------------------------------------------------------------- |
| id                       | UUID        | Listing ID                                                      |
| creator_id               | UUID        | Student who created the listing                                 |
| school_id                | UUID        | School scope (students can only see listings from their school) |
| listing_type             | TEXT        | 'sell' or 'buy'                                                 |
| status                   | TEXT        | 'active', 'expired', 'completed', 'cancelled'                   |
| offered_card_ids         | TEXT[]      | Array of VIP card instance IDs being offered                    |
| offered_gidouilles       | INTEGER     | Gidouilles being offered                                        |
| wanted_card_template_ids | TEXT[]      | Array of VIP card template IDs wanted (not specific instances)  |
| wanted_gidouilles        | INTEGER     | Gidouilles wanted                                               |
| title                    | TEXT        | Listing title (3-100 chars)                                     |
| description              | TEXT        | Optional description (max 500 chars)                            |
| max_proposals            | INTEGER     | Max number of proposals allowed (default 10)                    |
| created_at               | TIMESTAMPTZ | Creation timestamp                                              |
| expires_at               | TIMESTAMPTZ | Expiration timestamp (auto-set based on config)                 |
| completed_at             | TIMESTAMPTZ | Completion timestamp                                            |
| cancelled_at             | TIMESTAMPTZ | Cancellation timestamp                                          |
| view_count               | INTEGER     | Number of views                                                 |
| proposal_count           | INTEGER     | Number of proposals received                                    |

#### `marketplace_proposals`

Responses to public listings.

| Column             | Type        | Description                                            |
| ------------------ | ----------- | ------------------------------------------------------ |
| id                 | UUID        | Proposal ID                                            |
| listing_id         | UUID        | Related listing                                        |
| proposer_id        | UUID        | Student making the proposal                            |
| status             | TEXT        | 'pending', 'accepted', 'rejected', 'withdrawn'         |
| offered_card_ids   | TEXT[]      | VIP card instance IDs offered                          |
| offered_gidouilles | INTEGER     | Gidouilles offered                                     |
| message            | TEXT        | Optional message from proposer (max 500 chars)         |
| response_message   | TEXT        | Optional response from listing creator (max 500 chars) |
| created_at         | TIMESTAMPTZ | Creation timestamp                                     |
| responded_at       | TIMESTAMPTZ | Response timestamp                                     |
| withdrawn_at       | TIMESTAMPTZ | Withdrawal timestamp                                   |

**Constraint**: UNIQUE(listing_id, proposer_id) - one proposal per user per listing

#### `marketplace_trades`

Friend-to-friend negotiations and completed trade history.

| Column          | Type        | Description                                    |
| --------------- | ----------- | ---------------------------------------------- |
| id              | UUID        | Trade ID                                       |
| trade_type      | TEXT        | 'friend' or 'marketplace'                      |
| status          | TEXT        | 'negotiating', 'completed', 'cancelled'        |
| initiator_id    | UUID        | Student who initiated the trade                |
| partner_id      | UUID        | Trade partner                                  |
| listing_id      | UUID        | Related listing (for marketplace trades only)  |
| proposal_id     | UUID        | Related proposal (for marketplace trades only) |
| conversation_id | UUID        | Chat conversation ID (optional integration)    |
| current_offer   | JSONB       | Current negotiation state                      |
| last_offer_by   | UUID        | Who made the last offer                        |
| final_trade     | JSONB       | Final agreed trade (immutable once set)        |
| created_at      | TIMESTAMPTZ | Creation timestamp                             |
| completed_at    | TIMESTAMPTZ | Completion timestamp                           |
| cancelled_at    | TIMESTAMPTZ | Cancellation timestamp                         |
| updated_at      | TIMESTAMPTZ | Last update timestamp                          |

**JSONB Structure for offers**:

```json
{
	"from_initiator": {
		"cards": ["card_instance_id_1", "card_instance_id_2"],
		"gidouilles": 100
	},
	"from_partner": {
		"cards": ["card_instance_id_3"],
		"gidouilles": 50
	}
}
```

#### `marketplace_trade_offers`

Complete history of offers and counter-offers in friend trades.

| Column               | Type        | Description                                    |
| -------------------- | ----------- | ---------------------------------------------- |
| id                   | UUID        | Offer ID                                       |
| trade_id             | UUID        | Related trade                                  |
| offered_by           | UUID        | Student making the offer                       |
| offer_number         | INTEGER     | Sequential number (auto-incremented per trade) |
| initiator_cards      | TEXT[]      | Cards offered by initiator                     |
| initiator_gidouilles | INTEGER     | Gidouilles offered by initiator                |
| partner_cards        | TEXT[]      | Cards offered by partner                       |
| partner_gidouilles   | INTEGER     | Gidouilles offered by partner                  |
| status               | TEXT        | 'pending', 'accepted', 'rejected', 'countered' |
| message              | TEXT        | Optional message with offer (max 500 chars)    |
| created_at           | TIMESTAMPTZ | Creation timestamp                             |
| responded_at         | TIMESTAMPTZ | Response timestamp                             |

**Constraint**: UNIQUE(trade_id, offer_number)

#### `marketplace_locked_cards`

Prevents double-spending by locking cards in active listings/trades.

| Column           | Type        | Description                                 |
| ---------------- | ----------- | ------------------------------------------- |
| id               | UUID        | Lock ID                                     |
| student_id       | UUID        | Card owner                                  |
| card_instance_id | TEXT        | UUID key from profiles.vip_cards JSONB      |
| locked_for       | TEXT        | 'listing' or 'trade'                        |
| locked_entity_id | UUID        | ID of the listing or trade holding the lock |
| locked_at        | TIMESTAMPTZ | Lock timestamp                              |

**Constraint**: UNIQUE(card_instance_id) - one card can only be locked once
**Auto-cleanup**: CASCADE DELETE when listing/trade is deleted

#### `marketplace_chat_messages`

Contextual chat for friend-to-friend trade negotiations.

| Column         | Type        | Description                       |
| -------------- | ----------- | --------------------------------- |
| id             | UUID        | Message ID                        |
| trade_id       | UUID        | Related trade                     |
| sender_id      | UUID        | Message sender                    |
| message        | TEXT        | Message content (1-1000 chars)    |
| created_at     | TIMESTAMPTZ | Creation timestamp                |
| is_flagged     | BOOLEAN     | Moderation flag                   |
| flagged_reason | TEXT        | Reason if flagged (max 200 chars) |

### RPC Functions

#### `check_marketplace_enabled(p_student_id UUID)`

Checks if marketplace is enabled for a student.

**Returns**: BOOLEAN
**Logic**:

1. Check school-level config: enabled_globally must be TRUE
2. Check all student's classes: enabled_for_class must be TRUE for all
3. Return FALSE if disabled at any level

#### `lock_cards(p_student_id UUID, p_card_ids TEXT[], p_entity_id UUID, p_lock_type TEXT)`

Locks VIP cards to prevent double-spending.

**Returns**: BOOLEAN
**Logic**:

1. Verify all cards exist in profiles.vip_cards for this student
2. Verify none are already locked
3. Verify cards are unused (check vip_cards_activity)
4. Insert into marketplace_locked_cards
5. Return success/failure

#### `unlock_cards(p_entity_id UUID)`

Unlocks VIP cards when listing/trade ends.

**Returns**: INTEGER (number of cards unlocked)

#### `execute_trade(p_trade_id UUID)`

Atomically executes a completed trade.

**Returns**: JSONB with success status
**Critical**: Must be atomic transaction with full rollback on failure

**Logic**:

1. Lock trade row (FOR UPDATE)
2. Verify status = 'negotiating'
3. Check daily trade limits for both participants
4. Transfer VIP cards (update profiles.vip_cards JSONB)
5. Transfer gidouilles (call update_student_gidouilles)
6. Update trade status = 'completed'
7. Unlock cards
8. Log in vip_cards_activity and gidouilles_history
9. Return success or error

#### `auto_expire_listings()`

Auto-expires old listings (for cron job).

**Returns**: INTEGER (number of listings expired)
**Logic**:

1. Update listings where expires_at < NOW()
2. Unlock cards for expired listings
3. Reject pending proposals

### Security & RLS Policies

All tables have Row Level Security enabled with the following key policies:

**marketplace_listings**:

- SELECT: Students see active listings from their school + their own listings
- INSERT: Students can create if under limit (5 active)
- UPDATE/DELETE: Only creator

**marketplace_proposals**:

- SELECT: Listing creator sees all; proposer sees own
- INSERT: Any student (one per listing, can't propose to own listing)
- UPDATE: Proposer can withdraw; creator can accept/reject

**marketplace_trades**:

- SELECT/UPDATE/DELETE: Participants only
- INSERT: Must verify friendship exists

**marketplace_locked_cards**:

- SELECT: Student sees own locked cards
- INSERT/DELETE: Via RPC functions only (SECURITY DEFINER)

**marketplace_chat_messages**:

- SELECT/INSERT: Trade participants only

**marketplace_config**:

- SELECT: All authenticated users
- UPDATE: Teachers for their classes, admins for school-level

### Important Implementation Notes

1. **Card Instance IDs**: VIP cards are stored in profiles.vip_cards as JSONB with UUID keys. The marketplace_locked_cards.card_instance_id refers to these keys.

2. **Atomicity**: The execute_trade function MUST be atomic - if ANY step fails, the entire trade rolls back.

3. **Daily Limits**: Max 10 completed trades per day per student (configurable in marketplace_config).

4. **Listing Limits**: Max 5 active listings per student (configurable).

5. **Auto-expiry**: Listings expire after 7 days (configurable). A cron job should call auto_expire_listings() regularly.

6. **School Scope**: All marketplace activity is limited to within the same school. Students cannot see or trade with students from other schools.

7. **Unused Cards Only**: Only unused VIP cards can be traded. The system checks vip_cards_activity to ensure cards haven't been used.

8. **Card Locking**: Critical to prevent double-spending. Cards in active listings or trades are locked and cannot be used elsewhere.

### Integration Points

- **profiles.vip_cards**: JSONB field storing VIP card instances
- **profiles.gidouilles**: INTEGER field for gidouilles balance
- **vip_cards_activity**: Tracks all VIP card actions including trades
- **gidouilles_history**: Tracks all gidouille transactions
- **friendships**: Friend verification for friend-to-friend trades
- **update_student_gidouilles()**: Existing RPC for gidouille transfers
- **chat_conversations**: Optional integration for trade chat

### File Organization

- **Migration**: `supabase/migrations/20251114082611_marketplace_foundation.sql`
- **Types**: Updated in `src/lib/types/database.ts`
- **Backend** (Phase 2): Will be in `src/routes/api/marketplace/`
- **Frontend** (Phase 3): Will be in `src/routes/(protected)/dashboard/student/marketplace/`
- **Components** (Phase 3): Will be in `src/lib/components/marketplace/`

---

## Shop System

**Added**: 2025-11-21
**Status**: 🚧 In Development
**Purpose**: Virtual shop where students can purchase items using gidouilles (virtual currency). Items can be consumables (hints, skips), boosters (XP multipliers), cosmetics (avatar frames), or utilities. Purchased items can be traded in the marketplace.

### Architecture Overview

```
shop_item_templates (admin-defined items)
    ↓ Purchase with gidouilles
student_item_inventory (owned items)
    ↓ Can be used (consumables)
    ↓ Can be equipped (cosmetics/boosters)
    ↓ Can be traded (via marketplace)
item_usage_log (analytics & cooldowns)

Integration Points:
- profiles.gidouilles (currency)
- gidouilles_history (audit trail)
- marketplace_listings/trades (item trading)
```

### Tables

#### `shop_item_templates`

**Purpose**: Admin-defined items available for purchase in the shop.

| Column                  | Type        | Description                                                   |
| ----------------------- | ----------- | ------------------------------------------------------------- |
| id                      | UUID (PK)   | Template ID                                                   |
| internal_name           | TEXT UNIQUE | Code identifier (e.g., 'minesweeper_hint')                    |
| display_name            | TEXT        | French display name (e.g., 'Indice Démineur')                 |
| description             | TEXT        | French description for UI                                     |
| category                | TEXT        | Main category: consumable, booster, cosmetic, utility         |
| item_type               | TEXT        | Specific type within category                                 |
| rarity                  | TEXT        | Rarity: common, uncommon, rare, epic, legendary               |
| base_price              | INTEGER     | Price in gidouilles                                           |
| discount_percentage     | INTEGER     | Current discount (0-100)                                      |
| is_active               | BOOLEAN     | Whether item is available                                     |
| available_from/until    | TIMESTAMPTZ | Optional availability window                                  |
| max_owned_per_student   | INTEGER     | Maximum ownership limit (NULL = unlimited)                    |
| daily_purchase_limit    | INTEGER     | Max purchases per day                                         |
| weekly_purchase_limit   | INTEGER     | Max purchases per week                                        |
| purchase_cooldown_hours | INTEGER     | Hours before can purchase again                               |
| properties              | JSONB       | Item-specific properties (stackable, uses, duration, effects) |
| is_tradeable            | BOOLEAN     | Can be traded in marketplace                                  |
| trade_cooldown_hours    | INTEGER     | Hours after acquisition before tradeable                      |
| icon_url                | TEXT        | Item icon                                                     |
| sort_order              | INTEGER     | Display order in shop                                         |

**Properties Examples**:

```json
// Consumable hint
{
  "stackable": true,
  "game": "minesweeper",
  "effect": "reveal_safe_cell"
}

// XP Booster
{
  "duration_minutes": 30,
  "multiplier": 2.0,
  "stackable": false
}

// Avatar Frame
{
  "theme": "gold",
  "animated": false
}
```

#### `student_item_inventory`

**Purpose**: Items owned by students with quantity and usage tracking.

| Column                | Type        | Description                                     |
| --------------------- | ----------- | ----------------------------------------------- |
| id                    | UUID (PK)   | Inventory ID                                    |
| student_id            | UUID (FK)   | Owner (→ profiles)                              |
| template_id           | UUID (FK)   | Item template (→ shop_item_templates)           |
| quantity              | INTEGER     | Number owned (for stackable items)              |
| uses_remaining        | INTEGER     | For multi-use consumables (NULL for single-use) |
| is_equipped           | BOOLEAN     | Currently equipped (cosmetics/boosters)         |
| equipped_at           | TIMESTAMPTZ | When equipped                                   |
| acquired_at           | TIMESTAMPTZ | When obtained                                   |
| acquired_from         | TEXT        | Source: shop, trade, reward, gift, migration    |
| acquisition_data      | JSONB       | Details (purchase_id, trade_id, etc.)           |
| expires_at            | TIMESTAMPTZ | For time-limited items                          |
| last_used_at          | TIMESTAMPTZ | Last usage timestamp                            |
| total_uses_count      | INTEGER     | Total times used                                |
| is_locked             | BOOLEAN     | Locked for trade/listing                        |
| locked_for_listing_id | UUID (FK)   | → marketplace_listings                          |
| locked_for_trade_id   | UUID (FK)   | → marketplace_trades                            |
| instance_data         | JSONB       | Instance-specific properties                    |

**Indexes**:

- Composite UNIQUE on `(student_id, template_id)` WHERE `uses_remaining IS NULL AND instance_data = '{}'` (for stackables)
- Index on `(student_id)`, `(template_id)`, `(is_locked)`, `(expires_at)`

#### `shop_purchase_history`

**Purpose**: Complete audit trail of all shop purchases.

| Column                | Type        | Description                                       |
| --------------------- | ----------- | ------------------------------------------------- |
| id                    | UUID (PK)   | Purchase ID                                       |
| student_id            | UUID (FK)   | Purchaser (→ profiles)                            |
| template_id           | UUID (FK)   | Item purchased (→ shop_item_templates)            |
| inventory_id          | UUID (FK)   | Created inventory item (→ student_item_inventory) |
| quantity              | INTEGER     | Number purchased                                  |
| unit_price            | INTEGER     | Price per item                                    |
| total_price           | INTEGER     | Total gidouilles spent                            |
| discount_applied      | INTEGER     | Discount amount                                   |
| purchase_context      | JSONB       | Promo codes, events, etc.                         |
| gidouilles_history_id | UUID        | Link to gidouilles transaction                    |
| purchased_at          | TIMESTAMPTZ | Purchase timestamp                                |
| refunded_at           | TIMESTAMPTZ | If refunded                                       |
| refund_reason         | TEXT        | Refund explanation                                |

#### `item_usage_log`

**Purpose**: Track item usage for analytics and cooldown enforcement.

| Column            | Type        | Description                                    |
| ----------------- | ----------- | ---------------------------------------------- |
| id                | UUID (PK)   | Log ID                                         |
| student_id        | UUID (FK)   | User (→ profiles)                              |
| inventory_id      | UUID (FK)   | Item used (→ student_item_inventory)           |
| template_id       | UUID (FK)   | Item template (→ shop_item_templates)          |
| used_at           | TIMESTAMPTZ | Usage timestamp                                |
| usage_context     | TEXT        | Where used (e.g., 'minesweeper', 'assessment') |
| usage_data        | JSONB       | Context details (game_id, cell position, etc.) |
| effect_applied    | JSONB       | What effect was applied                        |
| effect_expires_at | TIMESTAMPTZ | When effect ends (for boosters)                |
| reversed_at       | TIMESTAMPTZ | If effect was reversed                         |
| reversal_reason   | TEXT        | Why reversed                                   |

### Extended Marketplace Tables

**marketplace_listings** additions:

- `offered_item_ids` UUID[] - Inventory IDs being sold
- `wanted_item_template_ids` UUID[] - Item templates wanted

**marketplace_proposals** additions:

- `offered_item_ids` UUID[] - Inventory IDs offered

### RPC Functions

#### Core Functions

| Function                   | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `purchase_shop_item()`     | Atomic purchase with all validations and limits |
| `use_item()`               | Use consumable with effect tracking             |
| `get_shop_items()`         | Get available items with student-specific info  |
| `lock_items_for_listing()` | Lock items for marketplace listing              |
| `lock_items_for_trade()`   | Lock items for friend trade                     |
| `unlock_items()`           | Unlock items when trade cancelled               |
| `transfer_items()`         | Transfer items between students                 |

#### purchase_shop_item

**Args**: `p_student_id`, `p_template_id`, `p_quantity`
**Returns**: `{success, inventory_id, purchase_id, gidouilles_spent, new_balance}`

**Process**:

1. Validate item availability and price
2. Check student balance
3. Enforce purchase limits (max owned, daily, weekly, cooldown)
4. Deduct gidouilles (via update_student_gidouilles)
5. Add to inventory (stack if stackable)
6. Log purchase history
7. Return success with details

#### use_item

**Args**: `p_inventory_id`, `p_context`, `p_usage_data`
**Returns**: `{success, effect, remaining_uses}`

**Process**:

1. Validate ownership and item not locked
2. Check item is consumable and valid for context
3. Apply effect based on item_type
4. Decrement uses/quantity
5. Log usage
6. Return effect details

### Security

**RLS Policies**:

- Templates: Anyone can view active items, only admins can modify
- Inventory: Students see own, teachers see their students', inserts via RPC only
- Purchase history: View own or admin, inserts via RPC only
- Usage log: View own or admin, inserts via RPC only

**Validations**:

- All monetary operations are atomic
- Purchase limits enforced at database level
- Items locked during trades to prevent double-spending
- Cooldowns tracked and enforced

### Integration with Existing Systems

- **Gidouilles**: Uses existing `update_student_gidouilles()` for transactions
- **Marketplace**: Items can be listed/traded like VIP cards
- **Games**: Items can provide in-game benefits (hints, skips)
- **Achievements**: Item purchases/usage can trigger achievements

---

## Google Classroom Integration (CourseWorkMaterials)

🆕 **Added**: 2025-11-15
**Status**: ✅ Production
**Purpose**: Sync and share non-graded educational materials from Google Classroom with UbuMaths classes.

### Overview

The Google Classroom integration enables teachers to:

1. Connect their personal Google account via OAuth 2.0 + PKCE
2. Sync courses, topics, and course work materials (non-graded content) from Google Classroom
3. Share educational materials with their UbuMaths classes
4. Organize materials by Google Topics OR UbuMaths Categories (hybrid pattern)
5. Students browse shared materials with filters and pagination

**Documentation**: See detailed integration guide at [docs/development/google-classroom-integration.md](../development/google-classroom-integration.md)

### Architecture Flow

```
Google Classroom API
        ↓ OAuth 2.0 + PKCE
google_integrations (encrypted tokens)
        ↓ Sync API
google_classroom_courses
        ↓
google_classroom_topics (for organization)
        ↓
google_classroom_materials (non-graded content)
        ↓
google_classroom_material_attachments (Drive files, YouTube, links)
        ↓ Teacher shares
shared_materials (with denormalized course_name★ and teacher_name★)
        ↓ Student access
/dashboard/student/materials (filtered view)
```

**★ Denormalized fields** maintained by triggers to avoid RLS circular dependency.

### Tables

#### `google_integrations`

**Purpose**: Store encrypted OAuth tokens for each teacher's Google account.

| Column        | Type                         | Description                                             |
| ------------- | ---------------------------- | ------------------------------------------------------- |
| id            | UUID (PK)                    | Integration ID                                          |
| teacher_id    | UUID (UNIQUE, FK → profiles) | Teacher who linked Google account                       |
| access_token  | TEXT                         | **Encrypted** OAuth access token (~1 hour lifespan)     |
| refresh_token | TEXT                         | **Encrypted** OAuth refresh token (long-lived)          |
| token_expiry  | TIMESTAMPTZ                  | When access_token expires                               |
| scopes        | TEXT[]                       | OAuth scopes granted (e.g., classroom.courses.readonly) |
| google_email  | TEXT                         | Email of linked Google account                          |
| last_sync_at  | TIMESTAMPTZ                  | Last successful sync timestamp                          |
| created_at    | TIMESTAMPTZ                  | Creation timestamp                                      |
| updated_at    | TIMESTAMPTZ                  | Last update timestamp                                   |

**Indexes**:

- `idx_google_integrations_teacher` on `teacher_id`
- `idx_google_integrations_expiry` on `token_expiry` (WHERE `token_expiry < NOW() + 1 hour`)

**Encryption**: Tokens encrypted with AES-256-GCM (application-level, not pgcrypto).

- Key stored in `GOOGLE_TOKEN_ENCRYPTION_KEY` environment variable
- Never stored in database or logs
- See `src/lib/server/google/encryption.ts`

**RLS Policies**:

- Teachers: Full CRUD on their own integration
- Admins: SELECT only (for support)

---

#### `google_classroom_courses`

**Purpose**: Google Classroom courses synced from teacher's account.

| Column              | Type                 | Description                                        |
| ------------------- | -------------------- | -------------------------------------------------- |
| id                  | UUID (PK)            | Internal course ID                                 |
| teacher_id          | UUID (FK → profiles) | Teacher who owns this course                       |
| google_course_id    | TEXT                 | Google's unique course identifier                  |
| name                | TEXT                 | Course name                                        |
| section             | TEXT                 | Course section (optional)                          |
| description_heading | TEXT                 | Course description                                 |
| room                | TEXT                 | Classroom location (optional)                      |
| enrollment_code     | TEXT                 | Google Classroom join code                         |
| course_state        | TEXT                 | ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED |
| alternate_link      | TEXT                 | URL to view course in Google Classroom             |
| last_synced_at      | TIMESTAMPTZ          | Last sync from Google API                          |
| created_at          | TIMESTAMPTZ          | Creation timestamp                                 |
| updated_at          | TIMESTAMPTZ          | Last update timestamp                              |

**Unique Constraint**: (teacher_id, google_course_id)

**Indexes**:

- `idx_google_courses_teacher` on `teacher_id`
- `idx_google_courses_state` on `course_state`
- `idx_google_courses_google_id` on `google_course_id`

**RLS Policies**:

- Teachers: Full CRUD on their own courses
- Admins: SELECT only

---

#### `google_classroom_topics`

**Purpose**: Topics (rubriques/thèmes) from Google Classroom for organizing materials.

| Column           | Type                                          | Description                                 |
| ---------------- | --------------------------------------------- | ------------------------------------------- |
| id               | UUID (PK)                                     | Internal topic ID                           |
| google_course_id | UUID (FK → google_classroom_courses, CASCADE) | Parent course                               |
| google_topic_id  | TEXT                                          | Google's unique topic identifier            |
| name             | TEXT                                          | Topic name (max 100 chars per Google API)   |
| updated_time     | TIMESTAMPTZ                                   | Last update timestamp from Google Classroom |
| last_synced_at   | TIMESTAMPTZ                                   | Last sync timestamp                         |
| created_at       | TIMESTAMPTZ                                   | Creation timestamp                          |
| updated_at       | TIMESTAMPTZ                                   | Last update timestamp                       |

**Unique Constraint**: (google_course_id, google_topic_id)

**Indexes**:

- `idx_topics_course` on `google_course_id`
- `idx_topics_google_id` on `google_topic_id`
- `idx_topics_name` on `(google_course_id, name)`

**RLS Policies**:

- Teachers: Full CRUD for their own courses' topics
- Admins: SELECT only

---

#### `google_classroom_materials`

**Purpose**: Non-graded educational materials from Google Classroom (documents, videos for consultation).

| Column             | Type                                          | Description                              |
| ------------------ | --------------------------------------------- | ---------------------------------------- |
| id                 | UUID (PK)                                     | Internal material ID                     |
| google_course_id   | UUID (FK → google_classroom_courses, CASCADE) | Parent course                            |
| google_material_id | TEXT                                          | Google's unique material identifier      |
| title              | TEXT                                          | Material title                           |
| description        | TEXT                                          | Material description (optional)          |
| state              | TEXT                                          | PUBLISHED, DRAFT, DELETED                |
| topic_id           | UUID (FK → google_classroom_topics, SET NULL) | Optional topic for organization          |
| created_time       | TIMESTAMPTZ                                   | When created in Google Classroom         |
| updated_time       | TIMESTAMPTZ                                   | When last updated in Google Classroom    |
| alternate_link     | TEXT                                          | URL to view material in Google Classroom |
| last_synced_at     | TIMESTAMPTZ                                   | Last sync timestamp                      |
| created_at         | TIMESTAMPTZ                                   | Creation timestamp                       |
| updated_at         | TIMESTAMPTZ                                   | Last update timestamp                    |

**Unique Constraint**: (google_course_id, google_material_id)

**Indexes**:

- `idx_materials_course` on `google_course_id`
- `idx_materials_topic` on `topic_id`
- `idx_materials_state` on `state`
- `idx_materials_google_id` on `google_material_id`
- `idx_materials_published` on `(google_course_id, state)` WHERE `state = 'PUBLISHED'`

**RLS Policies**:

- Teachers: Full CRUD for their own courses' materials
- Students: SELECT for materials shared with their classes (via `shared_materials`)
- Admins: SELECT only

**Note**: Only PUBLISHED materials are synced. DRAFT and DELETED materials are ignored or marked but not shown to students.

---

#### `google_classroom_material_attachments`

**Purpose**: Files, links, and videos attached to CourseWorkMaterials.

| Column             | Type                                            | Description                                                 |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| id                 | UUID (PK)                                       | Attachment ID                                               |
| google_material_id | UUID (FK → google_classroom_materials, CASCADE) | Parent material                                             |
| material_type      | TEXT                                            | DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM                       |
| google_file_id     | TEXT                                            | Google Drive file ID (for DRIVE_FILE type only)             |
| file_name          | TEXT                                            | File name or link title                                     |
| mime_type          | TEXT                                            | MIME type (e.g., application/pdf, video/mp4)                |
| file_url           | TEXT                                            | URL to access the resource                                  |
| thumbnail_url      | TEXT                                            | Thumbnail preview URL (optional)                            |
| title              | TEXT                                            | Display title (for links/videos, may differ from file_name) |
| created_at         | TIMESTAMPTZ                                     | Creation timestamp                                          |

**Indexes**:

- `idx_material_attachments_material` on `google_material_id`
- `idx_material_attachments_type` on `material_type`
- `idx_material_attachments_google_file` on `google_file_id` WHERE `google_file_id IS NOT NULL`

**RLS Policies**:

- Teachers: Full CRUD for their own materials' attachments
- Students: SELECT for attachments of shared materials (cross-table policy)
- Admins: SELECT only

**Material Types**:

- `DRIVE_FILE`: Google Drive file (PDF, Doc, etc.)
- `YOUTUBE_VIDEO`: YouTube video
- `LINK`: External link
- `FORM`: Google Form

---

#### `shared_materials`

**Purpose**: Track which CourseWorkMaterials are shared with UbuMaths classes.

🌟 **Strategic Denormalization**: This table denormalizes `course_name` and `teacher_name` to avoid RLS circular dependency.

| Column               | Type                                            | Description                                                    |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| id                   | UUID (PK)                                       | Sharing record ID                                              |
| material_id          | UUID (FK → google_classroom_materials, CASCADE) | Material being shared                                          |
| class_id             | UUID (FK → classes, CASCADE)                    | UbuMaths class receiving material                              |
| category_id          | UUID (FK → coursework_categories, SET NULL)     | Optional UbuMaths category for organization                    |
| topic_id             | UUID (FK → google_classroom_topics, SET NULL)   | Optional Google topic for organization                         |
| shared_by            | UUID (FK → profiles, CASCADE)                   | Teacher who shared the material                                |
| description_override | TEXT                                            | Teacher's custom description (overrides material.description)  |
| visible              | BOOLEAN                                         | Whether students can currently see this material               |
| **course_name**      | TEXT                                            | **★ Denormalized** course name (from google_classroom_courses) |
| **teacher_name**     | TEXT                                            | **★ Denormalized** teacher name (from profiles)                |
| created_at           | TIMESTAMPTZ                                     | Creation timestamp                                             |
| updated_at           | TIMESTAMPTZ                                     | Last update timestamp                                          |

**Unique Constraint**: (material_id, class_id)

**Indexes**:

- `idx_shared_materials_material` on `material_id`
- `idx_shared_materials_class` on `class_id`
- `idx_shared_materials_category` on `category_id`
- `idx_shared_materials_topic` on `topic_id`
- `idx_shared_materials_visible` on `(class_id, visible)` WHERE `visible = true`
- `idx_shared_materials_course_name` on `course_name` WHERE `course_name IS NOT NULL`

**RLS Policies**:

- Teachers: Full CRUD for their own shared materials
- Students: SELECT visible materials for their classes (with `is_test = false` check)
- Admins: SELECT only

#### Denormalization Pattern

**Problem**: RLS circular dependency when students query shared_materials → google_classroom_materials → google_classroom_courses (RLS blocks access to courses table).

**Solution**: Denormalize `course_name` and `teacher_name` into `shared_materials`.

**Automatic Maintenance via Triggers**:

1. **INSERT Trigger** (`populate_shared_material_names`):
   - Runs BEFORE INSERT on `shared_materials`
   - Auto-populates `course_name` and `teacher_name` using SECURITY DEFINER
   - Eliminates need for service role bypass in application code

2. **Course Rename Trigger** (`update_shared_material_course_name`):
   - Runs AFTER UPDATE on `google_classroom_courses`
   - Updates all `shared_materials.course_name` when a course is renamed
   - Only triggers when name actually changes (performance optimized)

3. **Teacher Rename Trigger** (`update_shared_material_teacher_name`):
   - Runs AFTER UPDATE on `profiles`
   - Updates all `shared_materials.teacher_name` when teacher changes name
   - Only triggers when first/last name changes

**Benefits**:

- ✅ **3x faster queries** (1 query vs 3 with JOINs)
- ✅ **No service role bypass** in application code (more secure)
- ✅ **Automatic consistency** (triggers handle updates, zero maintenance)
- ✅ **90% code reduction** (3 lines vs 31 lines for student queries)

**Trade-offs**:

- ⚠️ ~100 bytes extra storage per record (negligible)
- ⚠️ < 5ms overhead on writes (negligible for rare operations)

**Rationale**: Course/teacher names are NOT sensitive data, renames are extremely rare (< 0.1% of operations), triggers guarantee consistency.

**See Also**: [DECISION-rls-denormalization.md](./DECISION-rls-denormalization.md) for complete analysis.

---

#### `shared_coursework`

**Purpose**: Track which Google Classroom coursework (assignments, quizzes) are shared with UbuMaths classes.

🌟 **Strategic Denormalization**: This table denormalizes `course_name` and `teacher_name` to avoid RLS circular dependency (identical pattern to `shared_materials`).

| Column               | Type                                             | Description                                                     |
| -------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| id                   | UUID (PK)                                        | Sharing record ID                                               |
| coursework_id        | UUID (FK → google_classroom_coursework, CASCADE) | Coursework being shared                                         |
| class_id             | UUID (FK → classes, CASCADE)                     | UbuMaths class receiving coursework                             |
| category_id          | UUID (FK → coursework_categories, SET NULL)      | Optional UbuMaths category for organization                     |
| topic_id             | UUID (FK → google_classroom_topics, SET NULL)    | Optional Google topic for organization                          |
| shared_by            | UUID (FK → profiles, CASCADE)                    | Teacher who shared the coursework                               |
| description_override | TEXT                                             | Teacher's custom description (overrides coursework.description) |
| visible              | BOOLEAN                                          | Whether students can currently see this coursework              |
| display_order        | INTEGER                                          | Custom ordering for display (default 0)                         |
| **course_name**      | TEXT                                             | **★ Denormalized** course name (from google_classroom_courses)  |
| **teacher_name**     | TEXT                                             | **★ Denormalized** teacher name (from profiles)                 |
| created_at           | TIMESTAMPTZ                                      | Creation timestamp                                              |
| updated_at           | TIMESTAMPTZ                                      | Last update timestamp                                           |

**Unique Constraint**: (coursework_id, class_id)

**Indexes**:

- `idx_shared_coursework_coursework` on `coursework_id`
- `idx_shared_coursework_class` on `class_id`
- `idx_shared_coursework_category` on `category_id`
- `idx_shared_coursework_topic` on `topic_id`
- `idx_shared_coursework_visible` on `(class_id, visible)` WHERE `visible = true`
- `idx_shared_coursework_course_name` on `course_name` WHERE `course_name IS NOT NULL`
- `idx_shared_coursework_display_order` on `(class_id, display_order, created_at)`

**RLS Policies**:

- Teachers: Full CRUD for their own shared coursework
- Students: SELECT visible coursework for their classes (with `is_test = false` check)
- Admins: SELECT only

#### Denormalization Pattern (Identical to shared_materials)

**Problem**: RLS circular dependency when students query shared_coursework → google_classroom_coursework → google_classroom_courses (RLS blocks access to courses table).

**Solution**: Denormalize `course_name` and `teacher_name` into `shared_coursework`.

**Automatic Maintenance via Triggers**:

1. **INSERT Trigger** (`populate_shared_coursework_names`):
   - Runs BEFORE INSERT on `shared_coursework`
   - Auto-populates `course_name` and `teacher_name` using SECURITY DEFINER
   - Eliminates need for service role bypass in application code

2. **Course Rename Trigger** (`update_shared_coursework_on_course_rename`):
   - Runs AFTER UPDATE on `google_classroom_courses`
   - Updates all `shared_coursework.course_name` when a course is renamed
   - Only triggers when name actually changes (performance optimized)

3. **Teacher Rename Trigger** (`update_shared_coursework_on_teacher_rename`):
   - Runs AFTER UPDATE on `profiles`
   - Updates all `shared_coursework.teacher_name` when teacher changes name
   - Only triggers when first/last name changes

**Benefits**:

- ✅ **3x faster queries** (1 query vs 3 with JOINs)
- ✅ **No service role bypass** in application code (more secure)
- ✅ **Automatic consistency** (triggers handle updates, zero maintenance)
- ✅ **Simplified API code** (no need to JOIN courses table for names)

**Trade-offs**:

- ⚠️ ~100 bytes extra storage per record (negligible)
- ⚠️ < 5ms overhead on writes (negligible for rare operations)

**Rationale**: Course/teacher names are NOT sensitive data, renames are extremely rare (< 0.1% of operations), triggers guarantee consistency.

**Related Tables**: `shared_coursework_students` (for student-level restrictions on coursework)

---

### Hybrid Organization Pattern

Teachers can choose **per-class** how to organize shared materials:

1. **Google Topics** - Use Topics from Google Classroom
2. **UbuMaths Categories** - Use custom categories (5 defaults: Cours, Exercices, Corrections, Devoirs, Évaluations)

**Logic**:

- Both `category_id` and `topic_id` are optional
- Teachers select one or the other (cannot have both)
- Students see materials grouped by category (if set) > topic (if set) > uncategorized

**Database Constraint**: Validated at application level (Zod schema), not database CHECK constraint.

---

### RLS Policy Summary

**35+ policies** across 8+ tables:

| Table                       | Teachers                 | Students                    | Admins      |
| --------------------------- | ------------------------ | --------------------------- | ----------- |
| google_integrations         | Full CRUD (own)          | None                        | SELECT only |
| google_classroom_courses    | Full CRUD (own)          | None                        | SELECT only |
| google_classroom_topics     | Full CRUD (via course)   | None                        | SELECT only |
| google_classroom_materials  | Full CRUD (via course)   | SELECT (shared)             | SELECT only |
| material_attachments        | Full CRUD (via material) | SELECT (shared)             | SELECT only |
| shared_materials            | Full CRUD (own)          | SELECT (visible + in class) | SELECT only |
| shared_coursework           | Full CRUD (own)          | SELECT (visible + in class) | SELECT only |
| google_classroom_coursework | Full CRUD (via course)   | SELECT (shared)             | SELECT only |

**Cross-Table Student Policies**:

```sql
-- Students can view materials shared with their classes
CREATE POLICY "Students can view materials shared with their classes"
ON google_classroom_materials FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shared_materials sm
    JOIN class_members cm ON cm.class_id = sm.class_id
    WHERE sm.material_id = google_classroom_materials.id
    AND cm.student_id = auth.uid()
    AND cm.is_test = false
    AND sm.visible = true
  )
);

-- Students can view attachments for shared materials
CREATE POLICY "Students can view attachments for shared materials"
ON google_classroom_material_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shared_materials sm
    JOIN class_members cm ON cm.class_id = sm.class_id
    WHERE sm.material_id = google_classroom_material_attachments.google_material_id
    AND cm.student_id = auth.uid()
    AND cm.is_test = false
    AND sm.visible = true
  )
);
```

---

### Sync Logic

**Workflow**:

1. **Teacher initiates sync** (manual trigger via UI)
2. **Access token auto-refresh** if expired (< 5 minutes remaining)
3. **Sync courses** from Google Classroom (ACTIVE only)
4. **For each course**:
   - Sync topics
   - Sync course work materials (PUBLISHED only)
   - Sync attachments
5. **Cleanup deleted items** (courses/topics/materials no longer in Google)
6. **Update last_sync_at** timestamp

**Incremental Sync**: Currently full sync each time (< 10s for 50 materials). Future optimization: use `updateTime` filters.

**API Client**: `src/lib/server/google/classroom-api.ts`

- Automatic retry with exponential backoff (rate limits)
- Zod validation on all responses
- Comprehensive error handling

**Sync Functions**: `src/lib/server/google/sync.ts`

- `fullSync(teacherId, supabase)` - Main entry point
- `syncTeacherCourses()` - Sync all courses
- `syncTopics(courseId, ...)` - Sync topics for a course
- `syncCourseWorkMaterials(courseId, ...)` - Sync materials

---

### Security

#### OAuth 2.0 + PKCE

**Flow**:

1. Generate PKCE code verifier (64 random characters)
2. Create code challenge (SHA-256 hash)
3. Redirect to Google with challenge
4. Google redirects back with authorization code
5. Exchange code + verifier for tokens
6. Encrypt and store tokens

**Required Scopes**:

- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
- `https://www.googleapis.com/auth/drive.readonly`

**Implementation**: `src/lib/server/google/oauth.ts`

#### Token Encryption

**Algorithm**: AES-256-GCM (authenticated encryption)

**Process**:

1. Derive 256-bit key from `GOOGLE_TOKEN_ENCRYPTION_KEY` (SHA-256)
2. Generate random 16-byte IV per encryption
3. Encrypt token with AES-256-GCM
4. Store: [IV (16 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]

**Security Audit**:

- ✅ Authenticated encryption (prevents tampering)
- ✅ Random IV per encryption (prevents pattern analysis)
- ✅ Key derivation (ensures 256-bit key)
- ✅ Error handling (doesn't leak sensitive data)
- ✅ Server-side only (encryption key never exposed to client)

**Implementation**: `src/lib/server/google/encryption.ts`

#### Multi-Layer Authorization

**Layer 1**: Authentication (requireRole)
**Layer 2**: Ownership verification (material belongs to teacher)
**Layer 3**: Class ownership (teacher owns all selected classes)
**Layer 4**: RLS policies (database-level)

**Example** (POST /api/google/materials/[id]/share):

```typescript
// Layer 1
const { user } = await requireRole(locals, 'teacher');

// Layer 2
const { data: material } = await supabase
	.from('google_classroom_materials')
	.select('google_classroom_courses!inner(teacher_id)')
	.eq('id', materialId)
	.single();

if (material.google_classroom_courses.teacher_id !== user.id) {
	throw error(403, 'You do not own this material');
}

// Layer 3
const { data: classes } = await supabase
	.from('classes')
	.select('id, teacher_id')
	.in('id', classIds);

const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
if (invalidClasses.length > 0) {
	throw error(403, 'You do not own all selected classes');
}

// Layer 4 (automatic via RLS)
const { error: insertError } = await supabase.from('shared_materials').insert(sharesToInsert);
```

---

### Migration Files

| Date       | File                                                     | Tables Created                                              |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 2025-11-14 | `20251114150000_google_classroom_integration.sql`        | google_integrations, google_classroom_courses, (coursework) |
| 2025-11-15 | `20251115100000_fix_shared_coursework_rls_recursion.sql` | (RLS fixes for shared_coursework)                           |
| 2025-11-15 | `20251115160000_fix_google_classroom_courses_rls.sql`    | (RLS fixes)                                                 |
| 2025-11-15 | `20251115180000_denormalize_course_teacher_names.sql`    | (Denormalization for shared_coursework)                     |
| 2025-11-15 | `20251115181000_create_google_classroom_topics.sql`      | google_classroom_topics                                     |
| 2025-11-15 | `20251115182000_create_google_classroom_materials.sql`   | google_classroom_materials                                  |
| 2025-11-15 | `20251115183000_create_material_attachments.sql`         | google_classroom_material_attachments                       |
| 2025-11-15 | `20251115184000_create_shared_materials.sql`             | shared_materials (with denormalization triggers)            |

**Total**: 8+ tables, 35+ RLS policies, 7 triggers, 30+ indexes

---

### Related Documentation

- **User Guide**: [docs/features/google-classroom-materials.md](../features/google-classroom-materials.md)
- **Developer Guide**: [docs/development/google-classroom-integration.md](../development/google-classroom-integration.md)
- **Setup Guide**: [docs/guides/google-classroom-setup.md](../guides/google-classroom-setup.md)
- **Schema Detailed**: [docs/architecture/google-classroom-schema.md](./google-classroom-schema.md)
- **Denormalization Decision**: [docs/architecture/DECISION-rls-denormalization.md](./DECISION-rls-denormalization.md)

---

## Geometric Constructions System

🆕 **Added**: 2025-12-04
**Status**: ✅ Production
**Purpose**: Animated geometry construction player for educational demonstrations (InstrumenPoche-style).

### Overview

The Constructions system provides interactive, parameterizable geometry construction animations for teaching geometry concepts. It includes a JSON-based scripting format, a powerful animation engine, and conversion tools for importing legacy InstrumenPoche XML files.

**Key Features**:

- JSON-based ConstructionScript format (parameterizable with expressions)
- Interactive animation player with timeline scrubbing
- Geometric objects (points, lines, circles, polygons, etc.)
- Virtual instruments (ruler, compass, set square, protractor)
- InstrumenPoche XML conversion (34 unit tests, security hardened)

### Tables

#### `constructions`

Stores geometric construction animation scripts.

| Column        | Type                      | Description                                        |
| ------------- | ------------------------- | -------------------------------------------------- |
| `id`          | UUID (PK)                 | Unique identifier                                  |
| `title`       | TEXT NOT NULL             | Title of the construction (French)                 |
| `description` | TEXT                      | Optional description                               |
| `script`      | JSONB NOT NULL            | ConstructionScript JSON (steps, objects, actions)  |
| `author_id`   | UUID (FK → profiles)      | User who created this construction                 |
| `is_public`   | BOOLEAN DEFAULT false     | Whether visible to all authenticated users         |
| `tags`        | TEXT[] DEFAULT '{}'       | Tags for categorization (e.g., ["circle", "3eme"]) |
| `created_at`  | TIMESTAMPTZ DEFAULT now() | Creation timestamp                                 |
| `updated_at`  | TIMESTAMPTZ DEFAULT now() | Last update timestamp                              |

**Indexes**:

- `idx_constructions_author_id` (author_id)
- `idx_constructions_is_public` (is_public) WHERE is_public = true
- `idx_constructions_tags` GIN(tags) - for efficient tag filtering

**Tag Examples**:

```sql
-- Filter by single tag
WHERE tags @> ARRAY['circle']

-- Filter by multiple tags (any match)
WHERE tags && ARRAY['circle', 'triangle']

-- Filter by level
WHERE tags @> ARRAY['6eme']
```

### ConstructionScript Format

The `script` JSONB column contains:

```typescript
{
  "version": 1,
  "title": "Construction Title",
  "description": "Description text",
  "canvas": {
    "width": 800,
    "height": 600,
    "backgroundColor": "#FFFFFF"
  },
  "parameters": {
    "radius": 100,
    "angleStep": 30
  },
  "steps": [
    {
      "type": "create",
      "object": {
        "kind": "point",
        "id": "A",
        "x": 100,
        "y": 200,
        "style": { "color": "#FF0000", "size": 5 }
      }
    },
    {
      "type": "action",
      "action": {
        "kind": "show",
        "target": "ruler",
        "duration": 500
      }
    }
  ]
}
```

**Supported Objects**: point, segment, line, ray, circle, arc, polygon, text, angleMark
**Supported Instruments**: ruler, compass, setSquare, protractor, pencil
**Supported Actions**: create, show, hide, moveTo, rotate, scale, draw, setCompass, pause

### RLS Policies

**SELECT**:

- Own constructions (author_id = auth.uid())
- Public constructions (is_public = true)

**INSERT**:

- Authenticated users can create constructions

**UPDATE**:

- Own constructions only (author_id = auth.uid())

**DELETE**:

- Own constructions only (author_id = auth.uid())

### InstrumenPoche Conversion

**Converter Module**: `src/lib/constructions/converter.ts`
**Conversion Page**: `/constructions/conversion` (Teachers/Admins only)
**API Endpoint**: `POST /api/constructions/convert`

**Security Features**:

- Step count limit: 1000 steps max (prevents DoS)
- Array bounds: 1000 items max per array
- XML parsing timeout: 10 seconds
- Input size limit: 5MB
- Role-based access: Teachers and Admins only

**Testing**: 34 unit tests covering all conversion scenarios

**Example Conversion**:

```typescript
import { convertInstrumenPoche } from '$lib/constructions/converter';

const result = await convertInstrumenPoche(xmlContent, {
	title: 'My Construction',
	description: 'Description'
});

if (result.success) {
	// Save to database
	await supabase.from('constructions').insert({
		title: result.script.title,
		script: result.script,
		tags: ['imported', 'instrumenpoche']
	});
}
```

### Routes

| Route                             | Access          | Purpose                          |
| --------------------------------- | --------------- | -------------------------------- |
| `/constructions`                  | Authenticated   | List all available constructions |
| `/constructions/[id]`             | Authenticated   | Play construction animation      |
| `/constructions/conversion`       | Teachers/Admins | Convert InstrumenPoche XML       |
| `POST /api/constructions`         | Authenticated   | Create new construction          |
| `GET /api/constructions/[id]`     | Authenticated   | Fetch construction by ID         |
| `PUT /api/constructions/[id]`     | Owner           | Update construction              |
| `DELETE /api/constructions/[id]`  | Owner           | Delete construction              |
| `POST /api/constructions/convert` | Teachers/Admins | Convert XML to JSON              |

### Migration Files

| Date       | File                                            | Changes                           |
| ---------- | ----------------------------------------------- | --------------------------------- |
| 2025-12-04 | `20251204100000_create_constructions_table.sql` | constructions table, RLS policies |
| 2025-12-06 | `20251206184559_add_tags_to_constructions.sql`  | tags column, GIN index            |

### Related Documentation

- **Conversion Guide**: [docs/claude/instrumenpoche-conversion.md](../claude/instrumenpoche-conversion.md)
- **Progress Tracker**: [docs/wip/constructions-progress.md](../wip/constructions-progress.md)
- **Type Definitions**: [src/lib/constructions/types.ts](../../src/lib/constructions/types.ts)
- **Zod Schemas**: [src/lib/constructions/schemas.ts](../../src/lib/constructions/schemas.ts)
