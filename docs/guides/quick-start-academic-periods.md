# Quick Start: Academic Periods System

**TL;DR:** 4 migrations ready to deploy. Run `pnpm db:migrate`, then update types & docs.

---

## 1. Apply Migrations (5 seconds)

```bash
cd /Users/david/Coding/js/ubumaths
pnpm db:migrate
```

**What this does:**

- Creates `school_years`, `academic_periods`, `school_holidays` tables
- Adds `academic_period_id` column to `assessments`
- Enables RLS policies
- Creates auto-assignment trigger and backfill function

---

## 2. Test Migrations (30 seconds)

```bash
# Local Supabase (Docker must be running)
pnpm db:start  # If not already running
psql -U postgres -h localhost -p 54321 -d postgres \
  -f test_academic_periods_migrations.sql
```

**Expected output:** All 7 tests show "Test PASSED"

---

## 3. Update TypeScript Types (2 minutes)

```bash
# Merge types into database.ts
cat academic_periods_types.ts
# Copy the types into src/lib/types/database.ts
```

**What to add:**

- `school_years`, `academic_periods`, `school_holidays` table types
- `academic_period_id` to `assessments` type
- Helper types (SchoolYear, AcademicPeriod, etc.)

---

## 4. Update Documentation (2 minutes)

```bash
# Add schema docs to database-schema.md
cat academic_periods_schema_docs.md
# Append to docs/architecture/database-schema.md
```

---

## 5. Verify in Supabase Dashboard (1 minute)

**Check:**

- ✅ Tables exist: `school_years`, `academic_periods`, `school_holidays`
- ✅ RLS enabled on all 3 tables
- ✅ Indexes created (7 total)
- ✅ Triggers active (`auto_assign_assessment_period`)
- ✅ Functions exist (`link_existing_assessments_to_periods`)

---

## Example Usage

### Create a School Year

```typescript
const { data: schoolYear } = await supabase
	.from('school_years')
	.insert({
		school_id: 'your-school-id',
		name: '2024-2025',
		start_date: '2024-09-01',
		end_date: '2025-07-15',
		is_active: true
	})
	.select()
	.single();
```

### Create Trimesters

```typescript
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
```

### Add Holidays

```typescript
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

### Get Current Period

```typescript
const today = new Date().toISOString().split('T')[0];

const { data: currentPeriod } = await supabase
	.from('academic_periods')
	.select(
		`
    *,
    school_year:school_years!inner(*)
  `
	)
	.eq('school_year.school_id', schoolId)
	.eq('school_year.is_active', true)
	.lte('start_date', today)
	.gte('end_date', today)
	.single();
```

### Filter Assessments by Period

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

### Backfill Existing Assessments

```typescript
const { data } = await supabase.rpc('link_existing_assessments_to_periods', {
	p_school_year_id: schoolYearId
});

console.log(`Updated ${data} assessments`);
```

---

## Key Features

### 1. Auto-Assignment

New assessments are automatically assigned to periods based on their `created_at` date:

- Assessment created on 2024-10-15 → Trimestre 1
- Assessment created on 2025-02-15 → Trimestre 2
- Assessment created on 2024-12-25 (holidays) → NULL

### 2. One Active Year Per School

Enforced by PostgreSQL constraint. Attempting to activate a second year will fail:

```sql
-- This will fail if another year is already active
INSERT INTO school_years (school_id, name, ..., is_active)
VALUES ('school-id', '2025-2026', ..., true);
-- ERROR: duplicate key value violates unique constraint "one_active_per_school"
```

### 3. Sequential Period Ordering

Periods must have unique `period_order` values within a school year:

```sql
-- Periods: 1, 2, 3 (no gaps, no duplicates)
INSERT INTO academic_periods (..., period_order) VALUES (..., 4);  -- OK
INSERT INTO academic_periods (..., period_order) VALUES (..., 2);  -- ERROR (duplicate)
```

---

## Files Created

### Migrations (in `supabase/migrations/`)

1. `20251028120000_create_school_years.sql` (2.3K)
2. `20251028120100_create_academic_periods.sql` (2.6K)
3. `20251028120200_create_school_holidays.sql` (1.9K)
4. `20251028120300_link_assessments_to_periods.sql` (2.6K)

### Documentation

1. `test_academic_periods_migrations.sql` (11K) - Test suite
2. `academic_periods_types.ts` (7.1K) - TypeScript types
3. `academic_periods_schema_docs.md` (13K) - Schema documentation
4. `MIGRATION_REPORT_ACADEMIC_PERIODS.md` (17K) - Full report
5. `QUICK_START_ACADEMIC_PERIODS.md` (This file)

---

## Troubleshooting

### "Function update_updated_at_column does not exist"

**Solution:** The function exists in earlier migrations. Ensure all migrations are applied in order.

### "Table schools does not exist"

**Solution:** `school_years` requires the `schools` table. Ensure your base schema is applied.

### "Constraint one_active_per_school not found"

**Solution:** Requires PostgreSQL 15+. Check your Postgres version:

```sql
SELECT version();
```

### Auto-assignment not working

**Check:**

1. Trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'auto_assign_assessment_period';`
2. School year is active: `SELECT * FROM school_years WHERE is_active = true;`
3. Period dates contain assessment date
4. Assessment's class belongs to the same school as the school year

---

## Next Steps

1. **UI Development:**
   - Admin page: Manage school years, periods, holidays
   - Teacher dashboard: Display current period, upcoming holidays
   - Assessment form: Show which period assessment will be assigned to

2. **API Endpoints:**
   - `/api/school-years` - CRUD for years
   - `/api/academic-periods` - CRUD for periods
   - `/api/school-holidays` - CRUD for holidays

3. **Validation Schemas:**
   - Create Zod schemas in `src/lib/server/validation/`
   - Validate dates, period order, unique constraints

4. **Analytics:**
   - Average assessment scores by period
   - Student progress across trimesters
   - Period completion rates

---

## Support

- Full report: `MIGRATION_REPORT_ACADEMIC_PERIODS.md`
- Schema docs: `academic_periods_schema_docs.md`
- Type definitions: `academic_periods_types.ts`
- Test suite: `test_academic_periods_migrations.sql`

---

**Status:** ✅ Ready for deployment
**Author:** Claude Code
**Date:** 2025-10-28
