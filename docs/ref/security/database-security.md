# Database Security

## Overview

UbuMaths uses Supabase (PostgreSQL) with Row Level Security (RLS) as the primary access control mechanism.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application                             │
├─────────────────────────────────────────────────────────────┤
│  Anonymous Client       │       Service Role Client         │
│  (supabase-js)          │       (server-only)               │
│                         │                                   │
│  - Uses user's JWT      │       - Bypasses RLS              │
│  - RLS enforced         │       - For background jobs       │
│  - Safe for all ops     │       - NEVER for user data       │
└────────────┬────────────┴────────────┬──────────────────────┘
             │                         │
             v                         v
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Row Level Security                    │   │
│  │                                                       │   │
│  │  SELECT: auth.uid() = user_id                        │   │
│  │  INSERT: auth.uid() = user_id                        │   │
│  │  UPDATE: auth.uid() = user_id                        │   │
│  │  DELETE: auth.uid() = user_id                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Row Level Security (RLS)

### Core Concepts

RLS policies are SQL expressions that filter rows based on the current user's context.

```sql
-- Basic policy: users can only see their own data
CREATE POLICY "Users can view own data"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- auth.uid() returns the current user's UUID from JWT
```

### Policy Structure

```sql
CREATE POLICY "policy_name"
ON table_name
FOR {SELECT | INSERT | UPDATE | DELETE | ALL}
TO {authenticated | anon | public | role_name}
USING (expression)          -- For SELECT, UPDATE, DELETE
WITH CHECK (expression);    -- For INSERT, UPDATE
```

---

## Policy Patterns

### 1. User-Owned Data

```sql
-- Users can CRUD their own records
CREATE POLICY "Users own their exercises"
ON user_exercises FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Teacher Access to Class Data

```sql
-- Teachers can view students in their classes
CREATE POLICY "Teachers view class students"
ON class_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_members.class_id
        AND classes.teacher_id = auth.uid()
    )
);
```

### 3. Role-Based Access

```sql
-- Admins can access everything
CREATE POLICY "Admins full access"
ON profiles FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
```

### 4. Public Read, Authenticated Write

```sql
-- Anyone can read, only authenticated can write
CREATE POLICY "Public read" ON items FOR SELECT USING (true);

CREATE POLICY "Authenticated insert"
ON items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 5. Hierarchical Access

```sql
-- Users can see their own + their teacher can see
CREATE POLICY "Student or teacher view"
ON student_progress FOR SELECT
USING (
    auth.uid() = student_id
    OR
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE cm.student_id = student_progress.student_id
        AND c.teacher_id = auth.uid()
    )
);
```

---

## UbuMaths RLS Policies

### Profiles Table

```sql
-- Location: supabase/migrations/

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

### Classes Table

```sql
-- Teachers can manage their own classes
CREATE POLICY "Teachers manage own classes"
ON classes FOR ALL
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Students can view classes they belong to
CREATE POLICY "Students view enrolled classes"
ON classes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = classes.id
        AND class_members.student_id = auth.uid()
    )
);
```

### Messages Table

```sql
-- Users can view messages they sent or received
CREATE POLICY "View own messages"
ON messages FOR SELECT
USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
);

-- Users can send messages (as themselves)
CREATE POLICY "Send messages"
ON messages FOR INSERT
WITH CHECK (sender_id = auth.uid());
```

---

## Service Role Client

### Purpose

The service role client bypasses ALL RLS policies. Use only for:

- Background jobs
- Cron tasks
- System operations

### Location

`src/lib/server/serviceRoleClient.ts`

### Usage

```typescript
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

// Only in background jobs!
const adminClient = createServiceRoleClient();

// This bypasses RLS - DANGEROUS for user data
const { data } = await adminClient.from('background_job_runs').insert({...});
```

### Security Rules

| Usage                   | Allowed |
| ----------------------- | ------- |
| Background job logging  | ✅      |
| Cron job operations     | ✅      |
| System-wide queries     | ✅      |
| User-initiated requests | ❌      |
| User data access        | ❌      |
| Any API endpoint        | ❌      |

### Current Safe Usages

1. **Job Logging**: `background_job_runs` table
2. **Auto Riddle Selection**: Cron job
3. **SRS Deck Assignment**: System operation

---

## Migration Security

### Creating Migrations

```bash
# Generate timestamp
date +%Y%m%d%H%M%S

# Create file: supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

### Migration Template

```sql
-- supabase/migrations/20250101000000_add_new_table.sql

-- 1. Create table
CREATE TABLE new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON new_table FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON new_table FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
ON new_table FOR DELETE
USING (auth.uid() = user_id);

-- 4. Create indexes
CREATE INDEX idx_new_table_user_id ON new_table(user_id);
```

### Policy Checklist

- [ ] RLS enabled on table
- [ ] SELECT policy defined
- [ ] INSERT policy with WITH CHECK
- [ ] UPDATE policy with USING and WITH CHECK
- [ ] DELETE policy defined
- [ ] Admin override if needed
- [ ] Teacher access if needed
- [ ] Indexes on foreign keys

---

## Database Functions Security

### Secure Function Pattern

```sql
CREATE OR REPLACE FUNCTION purchase_item(
    p_user_id UUID,
    p_item_id UUID,
    p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner's privileges
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verify caller is the user
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Function logic...

    RETURN v_result;
END;
$$;

-- Restrict execution
REVOKE ALL ON FUNCTION purchase_item FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purchase_item TO authenticated;
```

### Security Considerations

| Property           | Meaning                        | When to Use                         |
| ------------------ | ------------------------------ | ----------------------------------- |
| `SECURITY DEFINER` | Runs as function creator       | When function needs elevated access |
| `SECURITY INVOKER` | Runs as caller                 | Default, respects RLS               |
| `SET search_path`  | Prevents search path injection | Always with SECURITY DEFINER        |

---

## Common Vulnerabilities

### 1. Missing RLS

```sql
-- BAD: No RLS enabled
CREATE TABLE sensitive_data (
    id UUID PRIMARY KEY,
    user_id UUID,
    secret TEXT
);
-- Anyone can read all data!

-- GOOD: RLS enabled
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own data only" ON sensitive_data
FOR ALL USING (auth.uid() = user_id);
```

### 2. Overly Permissive Policy

```sql
-- BAD: Allows any authenticated user
CREATE POLICY "Anyone can delete"
ON items FOR DELETE
TO authenticated
USING (true);  -- Deletes any row!

-- GOOD: Only owner can delete
CREATE POLICY "Owner can delete"
ON items FOR DELETE
USING (auth.uid() = user_id);
```

### 3. Missing WITH CHECK

```sql
-- BAD: Can update to any user_id
CREATE POLICY "Update items"
ON items FOR UPDATE
USING (auth.uid() = user_id);
-- Missing WITH CHECK allows changing user_id!

-- GOOD: Prevents ownership transfer
CREATE POLICY "Update items"
ON items FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4. Indirect Access Leak

```sql
-- BAD: Exposes data through joins
CREATE POLICY "View messages"
ON messages FOR SELECT
USING (true);  -- Can join to see private data

-- GOOD: Restrict to participant
CREATE POLICY "View messages"
ON messages FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid());
```

---

## Testing RLS Policies

### Manual Testing

```sql
-- Test as specific user
SET request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Try to access data
SELECT * FROM protected_table;

-- Reset
RESET request.jwt.claims;
```

### Automated Testing

```typescript
// tests/database/rls.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
	it('user cannot see other users data', async () => {
		const user1Client = createClient(url, anonKey, {
			global: { headers: { Authorization: `Bearer ${user1Token}` } }
		});

		const { data } = await user1Client.from('items').select().eq('user_id', 'other-user-id');

		expect(data).toHaveLength(0);
	});
});
```

---

## Backup & Recovery

### Data Retention

```sql
-- Soft delete pattern
ALTER TABLE items ADD COLUMN deleted_at TIMESTAMPTZ;

-- Policy excludes soft-deleted
CREATE POLICY "View active items"
ON items FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);
```

### Audit Logging

```sql
-- Audit trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        user_id,
        old_data,
        new_data,
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        row_to_json(OLD),
        row_to_json(NEW),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER items_audit
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Security Checklist

For every new table:

- [ ] RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] SELECT policy defined
- [ ] INSERT policy with WITH CHECK
- [ ] UPDATE policy with USING and WITH CHECK
- [ ] DELETE policy defined
- [ ] Foreign key constraints
- [ ] ON DELETE CASCADE where appropriate
- [ ] Indexes on foreign keys
- [ ] Admin override policy if needed
- [ ] Teacher access policy if needed
- [ ] Migration tested locally
- [ ] Types updated in `database.ts`
