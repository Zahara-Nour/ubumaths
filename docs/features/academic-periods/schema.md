# Academic Periods Schema Documentation

Add this section to `docs/architecture/database-schema.md`

---

## Academic Periods Management

### Overview

The academic periods system manages school years, academic periods (trimesters/semesters), and vacation schedules. It automatically links assessments to periods based on their creation date.

### Tables

#### `school_years`

Represents academic years (e.g., "2024-2025") with one active year per school.

| Column       | Type        | Constraints                | Description                             |
| ------------ | ----------- | -------------------------- | --------------------------------------- |
| `id`         | UUID        | PRIMARY KEY                | Unique identifier                       |
| `school_id`  | UUID        | NOT NULL, FK → schools(id) | School this year belongs to             |
| `name`       | TEXT        | NOT NULL                   | Year name (e.g., "2024-2025")           |
| `start_date` | DATE        | NOT NULL                   | School year start date                  |
| `end_date`   | DATE        | NOT NULL                   | School year end date                    |
| `is_active`  | BOOLEAN     | DEFAULT false              | Only one active year per school         |
| `metadata`   | JSONB       | DEFAULT '{}'               | Extensible data (region, custom fields) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW()              | Creation timestamp                      |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW()              | Last update timestamp                   |

**Constraints:**

- `unique_school_year`: UNIQUE(school_id, name)
- `valid_year_dates`: CHECK (end_date > start_date)
- `one_active_per_school`: UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)

**Indexes:**

- `idx_school_years_school`: (school_id)
- `idx_school_years_active`: (school_id, is_active) WHERE is_active = true

**RLS Policies:**

- Admins can manage all school years
- Teachers can read their school's years

---

#### `academic_periods`

Represents periods within a school year (trimesters, semesters, quarters).

| Column           | Type        | Constraints                     | Description                                  |
| ---------------- | ----------- | ------------------------------- | -------------------------------------------- |
| `id`             | UUID        | PRIMARY KEY                     | Unique identifier                            |
| `school_year_id` | UUID        | NOT NULL, FK → school_years(id) | Parent school year                           |
| `type`           | TEXT        | NOT NULL, CHECK                 | 'trimester', 'semester', 'quarter', 'custom' |
| `name`           | TEXT        | NOT NULL                        | Display name (e.g., "Trimestre 1")           |
| `start_date`     | DATE        | NOT NULL                        | Period start date                            |
| `end_date`       | DATE        | NOT NULL                        | Period end date                              |
| `period_order`   | INTEGER     | NOT NULL                        | Sequential order (1, 2, 3...)                |
| `color`          | TEXT        | DEFAULT '#3b82f6'               | Hex color for UI display                     |
| `metadata`       | JSONB       | DEFAULT '{}'                    | Extensible data                              |
| `created_at`     | TIMESTAMPTZ | DEFAULT NOW()                   | Creation timestamp                           |
| `updated_at`     | TIMESTAMPTZ | DEFAULT NOW()                   | Last update timestamp                        |

**Constraints:**

- `valid_period_dates`: CHECK (end_date > start_date)
- `unique_period_order`: UNIQUE(school_year_id, period_order)
- `valid_type`: CHECK (type IN ('trimester', 'semester', 'quarter', 'custom'))
- `positive_order`: CHECK (period_order > 0)

**Indexes:**

- `idx_academic_periods_year`: (school_year_id)
- `idx_academic_periods_order`: (school_year_id, period_order)

**RLS Policies:**

- Admins can manage periods for their school
- Teachers can read their school's periods

---

#### `school_holidays`

Represents vacation periods within a school year.

| Column           | Type        | Constraints                     | Description                             |
| ---------------- | ----------- | ------------------------------- | --------------------------------------- |
| `id`             | UUID        | PRIMARY KEY                     | Unique identifier                       |
| `school_year_id` | UUID        | NOT NULL, FK → school_years(id) | Parent school year                      |
| `name`           | TEXT        | NOT NULL                        | Holiday name (e.g., "Vacances de Noël") |
| `start_date`     | DATE        | NOT NULL                        | Holiday start date                      |
| `end_date`       | DATE        | NOT NULL                        | Holiday end date                        |
| `created_at`     | TIMESTAMPTZ | DEFAULT NOW()                   | Creation timestamp                      |
| `updated_at`     | TIMESTAMPTZ | DEFAULT NOW()                   | Last update timestamp                   |

**Constraints:**

- `valid_holiday_dates`: CHECK (end_date > start_date)

**Indexes:**

- `idx_school_holidays_year`: (school_year_id)
- `idx_school_holidays_dates`: (start_date, end_date)

**RLS Policies:**

- Admins can manage holidays for their school
- Teachers can read their school's holidays

---

### Modified Tables

#### `assessments` (Updated)

**New Column:**

| Column               | Type | Constraints                         | Description                                   |
| -------------------- | ---- | ----------------------------------- | --------------------------------------------- |
| `academic_period_id` | UUID | NULLABLE, FK → academic_periods(id) | Auto-assigned period based on created_at date |

**New Index:**

- `idx_assessments_period`: (academic_period_id)

---

### Database Functions

#### `auto_assign_assessment_to_period()`

**Purpose:** Automatically assigns new assessments to academic periods based on their `created_at` date.

**Trigger:** BEFORE INSERT ON assessments

**Logic:**

1. Finds the academic period that contains the assessment's `created_at` date
2. Filters by the class's school and active school year
3. Assigns the matching period's ID to `academic_period_id`
4. If no matching period found (e.g., during holidays), leaves as NULL

**Usage:** Automatic on INSERT

---

#### `link_existing_assessments_to_periods(school_year_id UUID)`

**Purpose:** Backfills `academic_period_id` for existing assessments.

**Returns:** INTEGER (count of updated assessments)

**Parameters:**

- `school_year_id`: UUID of the school year to process

**Logic:**

1. Updates all assessments without `academic_period_id`
2. Matches assessments to periods by `created_at` date and class's school
3. Only processes assessments for the specified school year

**Usage:**

```sql
-- Backfill assessments for 2024-2025 school year
SELECT link_existing_assessments_to_periods('11111111-1111-1111-1111-111111111111');
-- Returns: 45 (number of assessments updated)
```

---

### Relationships

```
schools
  └── school_years (1:N)
        ├── academic_periods (1:N)
        └── school_holidays (1:N)

classes
  └── assessments (1:N)
        └── academic_periods (N:1) [via academic_period_id]
```

---

### Typical Workflows

#### 1. Creating a New School Year

```typescript
// 1. Insert school year
const { data: schoolYear } = await supabase
	.from('school_years')
	.insert({
		school_id: 'xxx',
		name: '2024-2025',
		start_date: '2024-09-01',
		end_date: '2025-07-15',
		is_active: true
	})
	.select()
	.single();

// 2. Create trimesters
await supabase.from('academic_periods').insert([
	{
		school_year_id: schoolYear.id,
		type: 'trimester',
		name: 'Trimestre 1',
		start_date: '2024-09-01',
		end_date: '2024-12-20',
		period_order: 1,
		color: '#3b82f6'
	},
	{
		school_year_id: schoolYear.id,
		type: 'trimester',
		name: 'Trimestre 2',
		start_date: '2025-01-06',
		end_date: '2025-04-04',
		period_order: 2,
		color: '#10b981'
	},
	{
		school_year_id: schoolYear.id,
		type: 'trimester',
		name: 'Trimestre 3',
		start_date: '2025-04-22',
		end_date: '2025-07-15',
		period_order: 3,
		color: '#f59e0b'
	}
]);

// 3. Add holidays
await supabase.from('school_holidays').insert([
	{
		school_year_id: schoolYear.id,
		name: 'Vacances de Noël',
		start_date: '2024-12-21',
		end_date: '2025-01-05'
	},
	{
		school_year_id: schoolYear.id,
		name: 'Vacances de printemps',
		start_date: '2025-04-05',
		end_date: '2025-04-21'
	}
]);
```

#### 2. Getting Current Period

```typescript
const { data: currentPeriod } = await supabase
	.from('academic_periods')
	.select(
		`
    *,
    school_year:school_years(*)
  `
	)
	.eq('school_year.school_id', schoolId)
	.eq('school_year.is_active', true)
	.lte('start_date', new Date().toISOString().split('T')[0])
	.gte('end_date', new Date().toISOString().split('T')[0])
	.single();
```

#### 3. Getting Assessments by Period

```typescript
const { data: assessments } = await supabase
	.from('assessments')
	.select(
		`
    *,
    academic_period:academic_periods(*)
  `
	)
	.eq('academic_period_id', periodId)
	.order('created_at', { ascending: false });
```

---

### Design Decisions

#### 1. One Active Year Per School

**Constraint:** `one_active_per_school UNIQUE NULLS NOT DISTINCT (school_id, CASE WHEN is_active THEN TRUE END)`

**Why:** Ensures only one school year can be marked active at a time, simplifying queries for current period/year.

#### 2. Auto-Assignment vs Manual Assignment

**Approach:** Automatic assignment via trigger, with NULL fallback for edge cases.

**Why:**

- Reduces teacher workload (no manual period selection)
- Assessments created during holidays remain NULL (intentional)
- Manual override possible via `UPDATE` if needed

#### 3. Period Order Constraint

**Constraint:** `unique_period_order UNIQUE(school_year_id, period_order)`

**Why:** Ensures sequential ordering of periods (1, 2, 3...) without gaps or duplicates.

#### 4. Color Field for UI

**Field:** `color TEXT DEFAULT '#3b82f6'`

**Why:** Enables visual differentiation of periods in dashboards, calendars, and reports.

---

### Security Considerations

#### RLS Policies

- **Admin access:** Full CRUD on all tables
- **Teacher access:** Read-only on their school's data
- **Student access:** None (students don't need direct access to this data)

#### Data Integrity

- **Cascading deletes:** Deleting a school year removes all periods/holidays
- **Set NULL on delete:** Deleting a period preserves assessments but removes link
- **Date validation:** CHECK constraints prevent invalid date ranges

---

### Performance Optimizations

#### Indexes

1. **School lookup:** `idx_school_years_school` for fast school-based queries
2. **Active year lookup:** `idx_school_years_active` partial index for current year queries
3. **Period ordering:** `idx_academic_periods_order` for sequential period retrieval
4. **Assessment filtering:** `idx_assessments_period` for period-based assessment queries
5. **Holiday date ranges:** `idx_school_holidays_dates` for date overlap checks

#### Query Patterns

- Use `is_active = true` filter with partial index for current year
- Join `academic_periods` with `school_years` to filter by school
- Avoid scanning all assessments by filtering on `academic_period_id`

---

### Future Enhancements

1. **Period templates:** Pre-defined period configurations (French trimester system, US semester system)
2. **Automatic rollover:** Function to create next year's structure based on current year
3. **Period statistics:** Aggregate assessment scores/completion by period
4. **Holiday calendars:** Import from external sources (French Education Ministry API)
5. **Custom period types:** Allow schools to define custom period structures beyond trimester/semester

---

### Migration History

- `20251028120000_create_school_years.sql` - Created school_years table
- `20251028120100_create_academic_periods.sql` - Created academic_periods table
- `20251028120200_create_school_holidays.sql` - Created school_holidays table
- `20251028120300_link_assessments_to_periods.sql` - Added academic_period_id to assessments

---

### Testing

See `/test_academic_periods_migrations.sql` for comprehensive test suite covering:

- Schema verification
- Constraint validation
- Auto-assignment trigger
- Backfill function
- RLS policies
- Edge cases (holidays, invalid dates, duplicate orders)
