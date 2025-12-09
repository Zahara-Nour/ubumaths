# Security Model

> Complete security documentation for the rewards system including RLS policies, validation, and access control.

## Overview

The rewards system security is built on multiple layers:

1. **Authentication** - Session-based via Supabase Auth
2. **Row Level Security (RLS)** - Database-enforced access control
3. **Input Validation** - Zod schemas at API boundaries
4. **SECURITY DEFINER Functions** - Controlled privilege escalation
5. **Audit Trails** - Complete action logging

---

## Authentication Requirements

All reward endpoints require authentication:

```typescript
// API endpoint pattern
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}
	// ...
};
```

### Role-based Access

```typescript
// Require specific role
const { user } = await requireRole(locals, 'teacher');

// Check multiple roles
const { user } = await requireRole(locals, ['teacher', 'admin']);
```

---

## Row Level Security (RLS)

### Core Tables

#### `profiles` (gidouilles, bonus, vip_cards)

```sql
-- Students can view own profile
CREATE POLICY "Students view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Teachers can view students in their classes
CREATE POLICY "Teachers view class students"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.student_id = profiles.id
          AND c.teacher_id = auth.uid()
    )
);

-- Updates via SECURITY DEFINER functions only
-- No direct UPDATE policies for gidouilles/bonus/vip_cards
```

#### `reward_events`

```sql
-- Students see own events
CREATE POLICY "Students can view their own reward events"
ON reward_events FOR SELECT
USING (student_id = auth.uid());

-- Teachers see events for their students
CREATE POLICY "Teachers can view reward events for their students"
ON reward_events FOR SELECT
USING (
    class_id IS NOT NULL AND is_class_teacher(class_id)
);

-- Admins see all
CREATE POLICY "Admins can view all reward events"
ON reward_events FOR SELECT
USING (is_admin());

-- INSERT via service_role only (triggers)
CREATE POLICY "Service role can insert reward events"
ON reward_events FOR INSERT
TO service_role
WITH CHECK (true);
```

#### `vip_card_templates`

```sql
-- All authenticated users can view
CREATE POLICY "vip_card_templates_select_authenticated"
ON vip_card_templates FOR SELECT
TO authenticated
USING (TRUE);

-- Only admins can modify
CREATE POLICY "vip_card_templates_insert_admin"
ON vip_card_templates FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "vip_card_templates_update_admin"
ON vip_card_templates FOR UPDATE
USING (is_admin());

CREATE POLICY "vip_card_templates_delete_admin"
ON vip_card_templates FOR DELETE
USING (is_admin());
```

#### `vip_card_config`

```sql
-- Users see only active config
CREATE POLICY "vip_card_config_select_active"
ON vip_card_config FOR SELECT
USING (is_active = TRUE);

-- Admins see all configs
CREATE POLICY "vip_card_config_select_admin"
ON vip_card_config FOR SELECT
USING (is_admin());

-- Only admins can modify
-- Similar INSERT/UPDATE/DELETE policies
```

### Shop Tables

#### `shop_item_templates`

```sql
-- Students see active items
CREATE POLICY "Students view active shop items"
ON shop_item_templates FOR SELECT
USING (is_active = TRUE);

-- Admins have full access
CREATE POLICY "Admins manage shop items"
ON shop_item_templates FOR ALL
USING (is_admin());
```

#### `student_item_inventory`

```sql
-- Students see own inventory
CREATE POLICY "Students view own inventory"
ON student_item_inventory FOR SELECT
USING (student_id = auth.uid());

-- Teachers see students' inventory
CREATE POLICY "Teachers view student inventory"
ON student_item_inventory FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.student_id = student_item_inventory.student_id
          AND c.teacher_id = auth.uid()
    )
);
```

### Marketplace Tables

```sql
-- Listings visible to same school
CREATE POLICY "View school listings"
ON marketplace_listings FOR SELECT
USING (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
));

-- Trades visible to participants only
CREATE POLICY "View own trades"
ON marketplace_trades FOR SELECT
USING (initiator_id = auth.uid() OR partner_id = auth.uid());
```

---

## Helper Functions

### `is_admin()`

```sql
CREATE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'teacher')
    );
END;
$$;
```

### `is_class_teacher(p_class_id)`

```sql
CREATE FUNCTION is_class_teacher(p_class_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM classes
        WHERE id = p_class_id
          AND teacher_id = auth.uid()
    );
END;
$$;
```

---

## SECURITY DEFINER Functions

### Purpose

These functions run with elevated privileges to:

- Bypass RLS for cross-table operations
- Enforce business rules at database level
- Ensure atomic transactions

### `update_student_gidouilles`

```sql
CREATE FUNCTION update_student_gidouilles(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_value INTEGER;
    v_teacher_id UUID;
BEGIN
    -- 1. Verify teacher is authorized for this class
    SELECT teacher_id INTO v_teacher_id
    FROM classes WHERE id = p_class_id;

    IF v_teacher_id != auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Not authorized to modify this class';
    END IF;

    -- 2. Verify student is in class
    IF NOT EXISTS (
        SELECT 1 FROM class_members
        WHERE student_id = p_student_id AND class_id = p_class_id
    ) THEN
        RAISE EXCEPTION 'Student not in class';
    END IF;

    -- 3. Update gidouilles (CHECK constraint prevents negative)
    UPDATE profiles
    SET gidouilles = gidouilles + p_delta
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_value;

    -- 4. Log to history (triggers reward_events)
    INSERT INTO gidouilles_history (student_id, class_id, delta, created_by)
    VALUES (p_student_id, p_class_id, p_delta, auth.uid());

    RETURN v_new_value;
END;
$$;
```

### `draw_multiple_vip_cards`

```sql
CREATE FUNCTION draw_multiple_vip_cards(
    p_student_id UUID,
    p_count INTEGER,
    p_payment_method TEXT,
    p_gidouilles_cost INTEGER,
    p_vip_card_instance_id TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
-- Implementation:
-- 1. Verify student owns enough gidouilles or the specified VIP card
-- 2. Deduct payment (gidouilles or consume card)
-- 3. Draw cards using weighted random selection
-- 4. Add cards to student's vip_cards JSONB
-- 5. Log to vip_cards_activity
-- 6. Return drawn cards
$$;
```

---

## Input Validation

### Zod Schemas

All API inputs validated with Zod:

```typescript
// /api/teacher/rewards/update-student
const schema = z.object({
	studentId: z.string().uuid(),
	classId: z.string().uuid(),
	delta: z.number().int().min(-1000).max(1000)
});

// Validate
const validation = schema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

### Common Validation Rules

| Field        | Validation                              |
| ------------ | --------------------------------------- |
| UUIDs        | `z.string().uuid()`                     |
| Delta values | `z.number().int().min(-1000).max(1000)` |
| Count        | `z.number().int().min(1).max(10)`       |
| Reason       | `z.string().min(1).max(500).optional()` |
| Card IDs     | Array of validated UUIDs                |

### Route Parameter Validation

```typescript
// Validate route parameters
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const GET: RequestHandler = async ({ params }) => {
	const validation = uuidSchema.safeParse(params.studentId);
	if (!validation.success) {
		throw error(400, 'Invalid student ID format');
	}
	// ...
};
```

---

## Authorization Checks

### Teacher-Student Relationship

```typescript
// API endpoint check
async function verifyTeacherStudentRelation(
	teacherId: string,
	studentId: string,
	classId: string
): Promise<boolean> {
	const { data } = await supabase
		.from('class_members')
		.select('class_id, classes!inner(teacher_id)')
		.eq('student_id', studentId)
		.eq('class_id', classId)
		.eq('classes.teacher_id', teacherId)
		.single();

	return !!data;
}
```

### Card Ownership Verification

```typescript
// Before card activation/use
async function verifyCardOwnership(
	studentId: string,
	cardInstanceId: string
): Promise<VipCardInstance | null> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	return profile?.vip_cards?.[cardInstanceId] ?? null;
}
```

---

## Double-Spend Prevention

### VIP Card Locking

```sql
-- Card cannot be traded twice
CREATE TABLE marketplace_locked_cards (
    card_instance_id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL,
    locked_for TEXT NOT NULL,
    reference_id UUID NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check before any card operation
CREATE FUNCTION check_card_not_locked(p_instance_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM marketplace_locked_cards
        WHERE card_instance_id = p_instance_id
    );
END;
$$;
```

### Shop Item Locking

```sql
-- Inventory items locked for trades
ALTER TABLE student_item_inventory
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN locked_for_listing_id UUID,
ADD COLUMN locked_for_trade_id UUID;

-- Constraint: only one lock type
CONSTRAINT only_one_lock CHECK (
    locked_for_listing_id IS NULL OR
    locked_for_trade_id IS NULL
)
```

---

## Audit Trail Security

### Immutable Logs

```sql
-- No UPDATE or DELETE on audit tables
CREATE POLICY "No updates on gidouilles_history"
ON gidouilles_history FOR UPDATE
USING (FALSE);

CREATE POLICY "No deletes on gidouilles_history"
ON gidouilles_history FOR DELETE
USING (FALSE);
```

### Service Role Insertion

```sql
-- Only triggers (service_role) can insert
CREATE POLICY "Service role only insert"
ON reward_events FOR INSERT
TO service_role
WITH CHECK (TRUE);
```

### Trigger-based Population

```sql
-- Events auto-created, cannot be forged
CREATE TRIGGER trigger_log_gidouilles_to_events
AFTER INSERT ON gidouilles_history
FOR EACH ROW
EXECUTE FUNCTION log_gidouilles_history_to_events();
```

---

## Rate Limiting

### API Level

```typescript
// Middleware example
const rateLimiter = createRateLimiter({
	windowMs: 60000, // 1 minute
	max: 100 // 100 requests per window
});

// Applied to routes
app.use('/api/rewards/*', rateLimiter);
```

### Database Level

```sql
-- Purchase cooldown check
SELECT MAX(purchased_at) INTO v_last_purchase
FROM shop_purchase_history
WHERE student_id = p_student_id
  AND template_id = p_template_id;

IF v_last_purchase IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_purchase)) / 3600;
    IF v_hours_since < v_template.purchase_cooldown_hours THEN
        RAISE EXCEPTION 'Cooldown active, wait % hours', v_remaining;
    END IF;
END IF;
```

---

## Best Practices

### 1. Always Use RPC Functions for Writes

```typescript
// GOOD: Use RPC
const { data, error } = await supabase.rpc('update_student_gidouilles', {
	p_student_id: studentId,
	p_class_id: classId,
	p_delta: delta
});

// BAD: Direct update (blocked by RLS)
await supabase.from('profiles').update({ gidouilles: newValue });
```

### 2. Validate All Inputs

```typescript
// Always validate before processing
const validation = schema.safeParse(input);
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

### 3. Use UUID Format Validation

```typescript
// Validate UUIDs prevent injection
const uuidSchema = z.string().uuid();
```

### 4. Check Ownership Before Actions

```typescript
// Always verify ownership
const card = await verifyCardOwnership(studentId, cardInstanceId);
if (!card) {
	throw error(404, 'Card not found');
}
```

### 5. Use Atomic Transactions

```sql
-- Wrap related operations in transaction
BEGIN;
    -- Deduct gidouilles
    UPDATE profiles SET gidouilles = gidouilles - $cost WHERE id = $student_id;
    -- Add item to inventory
    INSERT INTO student_item_inventory (...) VALUES (...);
    -- Log purchase
    INSERT INTO shop_purchase_history (...) VALUES (...);
COMMIT;
```

---

## Security Checklist

- [ ] All endpoints require authentication
- [ ] Role-based access enforced (student/teacher/admin)
- [ ] UUIDs validated with Zod
- [ ] Numeric values bounded (min/max)
- [ ] Teacher-student relationship verified
- [ ] Card/item ownership verified before use
- [ ] RLS policies cover all access patterns
- [ ] SECURITY DEFINER functions have authorization checks
- [ ] Audit tables are immutable
- [ ] Double-spend prevention via locking
