# Database Security

> Row Level Security (RLS) policies, triggers, and security functions.

## Overview

UbuMaths uses PostgreSQL Row Level Security (RLS) to enforce authorization at the database level. This provides defense-in-depth: even if application code has bugs, the database prevents unauthorized access.

---

## User Role System

### Role Enum

**Migration**: `001_initial_schema.sql`

```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
```

### Status Enum

**Migration**: `20251208100000_add_approval_status_to_profiles.sql`

```sql
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
```

### Profiles Table

```sql
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'approved',
    rejection_reason TEXT,
    status_changed_at TIMESTAMPTZ,
    status_changed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Security Helper Functions

**Migration**: `017_fix_rls_with_bypass.sql`

### is_admin()

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN user_role = 'admin';
END;
$$;
```

### is_teacher_or_admin()

```sql
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN user_role IN ('teacher', 'admin');
END;
$$;
```

### Why SECURITY DEFINER?

```
SECURITY INVOKER (default)    SECURITY DEFINER
─────────────────────────────────────────────────────
Runs as calling user          Runs as function owner
Subject to caller's RLS       Bypasses RLS
Can cause infinite loops      Safe for role checks
```

Functions that check roles must use `SECURITY DEFINER` to avoid infinite recursion when RLS policies call these functions.

---

## RLS Policy Patterns

### Pattern 1: Self-Access

Users can access their own rows:

```sql
CREATE POLICY "users_own_profile" ON profiles
    FOR ALL
    USING (auth.uid() = id);
```

### Pattern 2: Admin Bypass

Admins can access all rows:

```sql
CREATE POLICY "admins_view_all" ON profiles
    FOR SELECT
    USING (is_admin());
```

### Pattern 3: Role-Based Access

Teachers can view students in their classes:

```sql
CREATE POLICY "teachers_view_class_students" ON profiles
    FOR SELECT
    USING (
        role = 'student'
        AND EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            WHERE c.teacher_id = auth.uid()
            AND cm.student_id = profiles.id
        )
    );
```

### Pattern 4: Ownership Check

Users can only modify their own resources:

```sql
CREATE POLICY "users_update_own_settings" ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

### Pattern 5: Insert Validation

Ensure new rows reference the current user:

```sql
CREATE POLICY "users_insert_own_data" ON user_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

## Key RLS Policies by Table

### profiles

```sql
-- Users see their own profile
CREATE POLICY "users_own_profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Teachers see students in their classes
CREATE POLICY "teachers_view_students" ON profiles
    FOR SELECT USING (
        role = 'student' AND EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON c.id = cm.class_id
            WHERE c.teacher_id = auth.uid()
            AND cm.student_id = profiles.id
        )
    );

-- Admins see all profiles
CREATE POLICY "admins_view_all_profiles" ON profiles
    FOR SELECT USING (is_admin());

-- Users update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only admins can update roles/status
CREATE POLICY "admins_update_any_profile" ON profiles
    FOR UPDATE USING (is_admin());
```

### classes

```sql
-- Teachers see their own classes
CREATE POLICY "teachers_view_own_classes" ON classes
    FOR SELECT USING (teacher_id = auth.uid());

-- Students see classes they're enrolled in
CREATE POLICY "students_view_enrolled_classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_members
            WHERE class_id = classes.id
            AND student_id = auth.uid()
        )
    );

-- Admins see all classes
CREATE POLICY "admins_view_all_classes" ON classes
    FOR SELECT USING (is_admin());

-- Only teachers create classes
CREATE POLICY "teachers_create_classes" ON classes
    FOR INSERT WITH CHECK (
        is_teacher_or_admin()
        AND teacher_id = auth.uid()
    );
```

### class_members

```sql
-- Teachers manage their class memberships
CREATE POLICY "teachers_manage_class_members" ON class_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE id = class_members.class_id
            AND teacher_id = auth.uid()
        )
    );

-- Students see their own memberships
CREATE POLICY "students_view_own_memberships" ON class_members
    FOR SELECT USING (student_id = auth.uid());
```

---

## Triggers

### Profile Auto-Creation

**Migration**: `20251208120000_fix_voltairedoha_approval_bypass.sql`

When a new user signs up, automatically create their profile:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    pending_student pending_students%ROWTYPE;
    user_status_value user_status;
    user_firstname TEXT;
    user_lastname TEXT;
    user_full_name TEXT;
BEGIN
    -- 1. Check if user was pre-imported
    SELECT * INTO pending_student
    FROM pending_students
    WHERE email = NEW.email;

    IF FOUND THEN
        -- Pre-imported student: auto-approve
        user_firstname := pending_student.firstname;
        user_lastname := pending_student.lastname;
        user_full_name := user_firstname || ' ' || user_lastname;
        user_status_value := 'approved';

        -- Create profile
        INSERT INTO profiles (id, email, full_name, firstname, lastname, role, status)
        VALUES (NEW.id, NEW.email, user_full_name, user_firstname, user_lastname, 'student', user_status_value);

        -- Enroll in pre-assigned classes
        IF pending_student.class_ids IS NOT NULL THEN
            INSERT INTO class_members (class_id, student_id)
            SELECT unnest(pending_student.class_ids), NEW.id;
        END IF;

        -- Mark as activated
        UPDATE pending_students
        SET is_activated = TRUE, activated_at = NOW()
        WHERE id = pending_student.id;
    ELSE
        -- New user: check domain for approval requirement
        IF NEW.email LIKE '%@voltairedoha.com' THEN
            user_status_value := 'pending';
        ELSE
            user_status_value := 'approved';
        END IF;

        INSERT INTO profiles (id, email, role, status)
        VALUES (NEW.id, NEW.email, 'student', user_status_value);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

### Profile Update Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

---

## Service Role Client

For operations that need to bypass RLS:

**File**: `src/lib/server/serviceRoleClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SERVICE_ROLE_KEY } from '$env/static/private';

export function createServiceRoleClient() {
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
```

**Use cases**:

- Job logging (system operations)
- Rate limiting (cross-user tracking)
- Admin operations on any user
- Cron jobs
- Error monitoring

**Security**: Only use server-side, never expose to client.

---

## Security Audit Checklist

### For New Tables

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Policy for SELECT (who can read?)
- [ ] Policy for INSERT (who can create? what validation?)
- [ ] Policy for UPDATE (who can modify? what fields?)
- [ ] Policy for DELETE (who can remove?)
- [ ] Consider admin bypass policies

### For New Columns

- [ ] Does existing UPDATE policy allow modifying this column?
- [ ] Should this column have restricted update access?

### Common Mistakes

| Mistake                                | Impact             | Fix                     |
| -------------------------------------- | ------------------ | ----------------------- |
| Forgetting RLS on new table            | Data exposed       | Enable RLS immediately  |
| Using SECURITY INVOKER for role checks | Infinite recursion | Use SECURITY DEFINER    |
| Missing WITH CHECK on INSERT           | Invalid data       | Add INSERT validation   |
| Overly permissive SELECT               | Data leakage       | Narrow USING clause     |
| No admin bypass                        | Admins locked out  | Add `is_admin()` policy |
