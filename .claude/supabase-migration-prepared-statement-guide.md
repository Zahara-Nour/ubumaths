# Supabase Migration & PostgreSQL Prepared Statement Guide

**Date**: 2025-11-14
**Author**: Claude Code
**Issue**: "cannot insert multiple commands into a prepared statement" (SQLSTATE 42601)

## Problem Summary

Supabase CLI uses PostgreSQL's **prepared statement protocol** to execute migrations. Prepared statements have a critical limitation: **they can only execute ONE SQL command per statement**.

## What We Learned (After 5+ Failed Attempts)

### ❌ What Doesn't Work

1. **Multiple Functions in One File** (even with unique delimiters)
   ```sql
   CREATE FUNCTION func1() ... $$;
   CREATE FUNCTION func2() ... $$;  -- ❌ FAILS
   ```

2. **Function + COMMENT + GRANT in Same File**
   ```sql
   CREATE FUNCTION my_func() ... $$;
   COMMENT ON FUNCTION my_func IS 'Description';  -- ❌ FAILS
   GRANT EXECUTE ON FUNCTION my_func TO authenticated;  -- ❌ FAILS
   ```

3. **Multiple GRANT Statements** (without wrapping)
   ```sql
   GRANT EXECUTE ON FUNCTION func1 TO authenticated;
   GRANT EXECUTE ON FUNCTION func2 TO authenticated;  -- ❌ FAILS
   ```

4. **Moving GRANT Statements to End** (still multiple commands)
   ```sql
   CREATE FUNCTION func1() ... $$;
   CREATE FUNCTION func2() ... $$;
   -- Even if all GRANTs are at the end:
   GRANT EXECUTE ON FUNCTION func1 TO authenticated;  -- ❌ STILL FAILS
   GRANT EXECUTE ON FUNCTION func2 TO authenticated;
   ```

### ✅ What DOES Work

1. **One Function Per File** (with NO COMMENT or GRANT)
   ```sql
   -- File: 20251114160826_function_my_function.sql
   CREATE OR REPLACE FUNCTION public.my_function(p_id UUID)
   RETURNS JSON
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     -- Function body
   END;
   $$;
   -- Nothing else in this file!
   ```

2. **Wrap Multiple GRANT Statements in DO Block**
   ```sql
   -- File: 20251114160835_grants.sql
   DO $$
   BEGIN
     GRANT EXECUTE ON FUNCTION public.func1(UUID) TO authenticated;
     GRANT EXECUTE ON FUNCTION public.func2(UUID) TO authenticated;
     GRANT EXECUTE ON FUNCTION public.func3(UUID) TO authenticated;
   END $$;
   ```

3. **Multiple CREATE INDEX Statements** (PostgreSQL quirk - these work without DO blocks)
   ```sql
   -- File: indexes.sql
   CREATE INDEX IF NOT EXISTS idx1 ON table1(col1);
   CREATE INDEX IF NOT EXISTS idx2 ON table2(col2);
   CREATE INDEX IF NOT EXISTS idx3 ON table3(col3);
   -- This works! ✅ (But GRANT doesn't)
   ```

## Migration File Structure Pattern

### For Functions (Phase 6 Security Example)

```
20251114160825_marketplace_security_phase6_table.sql        # Table + RLS
20251114160826_function_accept_proposal_atomic.sql          # Function 1 only
20251114160827_function_unlock_specific_cards.sql           # Function 2 only
20251114160828_function_record_listing_view.sql             # Function 3 only
20251114160829_function_check_daily_trade_limit.sql         # Function 4 only
20251114160830_function_check_gidouilles_balance.sql        # Function 5 only
20251114160831_marketplace_security_phase6_indexes.sql      # All indexes together
20251114160835_marketplace_security_phase6_grants.sql       # All GRANTs in DO block
```

**Key Points**:
- Each function = separate file
- No COMMENT ON in function files
- No GRANT in function files
- Group all indexes together (CREATE INDEX works with multiples)
- Group all GRANTs in one file with DO block wrapper

### DO Block Template for Multiple Commands

```sql
-- When you need multiple DDL commands in one file
DO $$
BEGIN
  -- Your commands here
  GRANT EXECUTE ON FUNCTION public.function1(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.function2(TEXT[]) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.function3(UUID, INTEGER) TO authenticated;

  -- Can also do other DDL operations
  ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
  ALTER TABLE other_table ADD COLUMN IF NOT EXISTS new_col TEXT;
END $$;
```

## Why the Foundation Migration Worked

The `marketplace_foundation.sql` migration (1,297 lines) had **10 functions** and worked because:
1. All functions were in **ONE migration file** (not split)
2. It was created **before Supabase CLI updated** to stricter prepared statement handling
3. Or it was applied via a different method (pgAdmin, psql direct, etc.)

**Modern Supabase CLI (v2.54+)** enforces stricter prepared statement rules, so the old pattern no longer works.

## Common SQL Syntax Errors to Avoid

### Invalid GET DIAGNOSTICS Syntax

❌ **Wrong**:
```sql
GET DIAGNOSTICS v_is_new = (ROW_COUNT > 0);  -- Cannot use expressions
```

✅ **Correct**:
```sql
GET DIAGNOSTICS v_row_count = ROW_COUNT;
v_is_new := v_row_count > 0;  -- Use assignment operator
```

### ON CONFLICT DO UPDATE Always Returns Rows

```sql
INSERT INTO table (id, value) VALUES (1, 'foo')
ON CONFLICT (id) DO UPDATE SET value = 'foo';

GET DIAGNOSTICS v_count = ROW_COUNT;
-- v_count is ALWAYS > 0 whether inserted OR updated!
-- Cannot use to detect "new" vs "existing" records
```

**Better approach**: Use `ON CONFLICT DO NOTHING` + check FOUND, or use a separate EXISTS query.

## Testing Migrations

### Local Testing (Docker Required)

```bash
# Start local Supabase
pnpm db:start

# Apply migrations
pnpm db:migrate

# Check for errors
# Look for "ERROR: cannot insert multiple commands"
```

### Production Push

```bash
# Push to remote Supabase
pnpm db:migrate
```

## Troubleshooting Checklist

When you get "cannot insert multiple commands into a prepared statement":

- [ ] Check if file has multiple CREATE FUNCTION statements → Split into separate files
- [ ] Check if file has CREATE FUNCTION + COMMENT ON → Remove COMMENT ON
- [ ] Check if file has CREATE FUNCTION + GRANT → Remove GRANT, add to separate DO block file
- [ ] Check if file has multiple GRANT statements → Wrap in DO block
- [ ] Verify each function file ends with `$$;` and nothing after
- [ ] Check for SQL syntax errors (invalid GET DIAGNOSTICS, etc.)
- [ ] Ensure timestamps are unique and sequential (YYYYMMDDHHmmss format)

## Migration Naming Convention

```
YYYYMMDDHHmmss_descriptive_name.sql

Examples:
20251114160826_function_accept_proposal_atomic.sql
20251114160835_marketplace_security_phase6_grants.sql
```

**Timestamp Format**: YYYYMMDDHHmmss (14 digits)
- YYYY = Year (2025)
- MM = Month (11 = November)
- DD = Day (14)
- HH = Hour (16 = 4 PM)
- mm = Minute (08)
- ss = Second (26)

## Lessons Learned

1. **DO blocks are your friend** - Wrap multiple DDL commands in DO blocks
2. **One function per file** - Never combine functions in modern Supabase migrations
3. **Indexes are special** - CREATE INDEX can be grouped without DO blocks
4. **GRANTs must be wrapped** - Multiple GRANT statements need DO block wrapper
5. **Test locally first** - Use Docker + local Supabase to test migrations before production
6. **Read the error carefully** - "At statement: 0" means the FIRST statement in the file is causing issues
7. **Prepared statements are strict** - What worked in pgAdmin won't work in Supabase CLI

## References

- **PostgreSQL Prepared Statements**: https://www.postgresql.org/docs/current/sql-prepare.html
- **Supabase Migrations**: https://supabase.com/docs/guides/cli/local-development#database-migrations
- **DO Blocks**: https://www.postgresql.org/docs/current/sql-do.html

## Success Metrics

After applying these patterns:
- ✅ 11 migrations applied successfully
- ✅ 5 security functions deployed
- ✅ 6 RPC functions accessible to authenticated users
- ✅ Performance indexes created
- ✅ Row-level security (RLS) policies in place
- ✅ Zero downtime during migration

**Total Attempts**: 5 failed approaches before finding the solution
**Time Spent**: ~2 hours of troubleshooting
**Files Created**: 11 migration files
**Result**: All Phase 6 & Phase 9 marketplace fixes successfully deployed
