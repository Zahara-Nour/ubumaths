# Extending the Audit Trail

> Step-by-step guide for adding new audit sources to the system.

## Table of Contents

- [Overview](#overview)
- [Adding a New Reward Source](#adding-a-new-reward-source)
  - [Step 1: Create Source Table](#step-1-create-source-table)
  - [Step 2: Create Trigger Function](#step-2-create-trigger-function)
  - [Step 3: Attach Trigger](#step-3-attach-trigger)
  - [Step 4: Update TypeScript Types](#step-4-update-typescript-types)
  - [Step 5: Update Description Generator](#step-5-update-description-generator)
- [Adding New Event Types](#adding-new-event-types)
- [Adding New Reward Types](#adding-new-reward-types)
- [Adding Specialized Audit Tables](#adding-specialized-audit-tables)
- [Testing Your Changes](#testing-your-changes)
- [Checklist](#checklist)

---

## Overview

The audit trail system is designed to be extensible. There are three main extension patterns:

| Pattern               | When to Use                                     | Example                             |
| --------------------- | ----------------------------------------------- | ----------------------------------- |
| **New Reward Source** | Adding a new table that generates reward events | `daily_challenges_history`          |
| **New Event Type**    | Adding a new action type                        | `expired`, `gifted`                 |
| **New Reward Type**   | Adding a new category of rewards                | `badges`, `titles`                  |
| **Specialized Audit** | Non-reward audit needs                          | `login_history`, `settings_changes` |

---

## Adding a New Reward Source

This example adds a `daily_challenges_history` table that logs when students complete daily challenges.

### Step 1: Create Source Table

Create a migration file: `supabase/migrations/<timestamp>_create_daily_challenges_history.sql`

```sql
-- ============================================================================
-- Migration: Create daily_challenges_history table
-- Description: Tracks student daily challenge completions
-- ============================================================================

-- Create source table
CREATE TABLE IF NOT EXISTS public.daily_challenges_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    challenge_id TEXT NOT NULL,
    challenge_name TEXT NOT NULL,
    reward_amount INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Add comment
COMMENT ON TABLE public.daily_challenges_history IS 'Tracks daily challenge completions for audit trail';

-- Create indexes
CREATE INDEX idx_daily_challenges_student_time
    ON public.daily_challenges_history (student_id, completed_at DESC);

CREATE INDEX idx_daily_challenges_class_time
    ON public.daily_challenges_history (class_id, completed_at DESC)
    WHERE class_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.daily_challenges_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own challenge history"
    ON public.daily_challenges_history
    FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can view challenge history for their students"
    ON public.daily_challenges_history
    FOR SELECT
    USING (
        class_id IS NOT NULL
        AND public.is_class_teacher(class_id)
    );

CREATE POLICY "Admins can view all challenge history"
    ON public.daily_challenges_history
    FOR SELECT
    USING (public.is_admin());
```

### Step 2: Create Trigger Function

Add to the same migration file:

```sql
-- ============================================================================
-- Trigger Function: Log daily challenges to reward_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_daily_challenges_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_description TEXT;
BEGIN
    -- Deduplication check
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'daily_challenges_history'
          AND source_id = NEW.id
          AND student_id = NEW.student_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Generate description
    v_description := public.generate_reward_event_description(
        'gidouilles'::public.reward_type,
        'earned'::public.reward_event_type,
        NEW.reward_amount,
        NEW.challenge_name,
        jsonb_build_object(
            'challenge_id', NEW.challenge_id,
            'challenge_name', NEW.challenge_name
        )
    );

    -- Insert event
    INSERT INTO public.reward_events (
        student_id,
        reward_type,
        event_type,
        amount,
        item_name,
        description,
        metadata,
        source_table,
        source_id,
        class_id,
        created_at
    ) VALUES (
        NEW.student_id,
        'gidouilles',
        'earned',
        NEW.reward_amount,
        NEW.challenge_name,
        v_description,
        jsonb_build_object(
            'challenge_id', NEW.challenge_id,
            'challenge_name', NEW.challenge_name,
            'reward_amount', NEW.reward_amount
        ) || NEW.metadata,
        'daily_challenges_history',
        NEW.id,
        NEW.class_id,
        NEW.completed_at
    );

    RETURN NEW;
END;
$$;

-- Security: Revoke public access
REVOKE ALL ON FUNCTION public.log_daily_challenges_to_events() FROM PUBLIC;
```

### Step 3: Attach Trigger

```sql
-- ============================================================================
-- Attach Trigger
-- ============================================================================

CREATE TRIGGER trigger_log_daily_challenges_to_events
    AFTER INSERT ON public.daily_challenges_history
    FOR EACH ROW
    EXECUTE FUNCTION public.log_daily_challenges_to_events();
```

### Step 4: Update TypeScript Types

Update `src/lib/types/database.ts`:

```typescript
// Add to Tables interface
daily_challenges_history: {
    Row: {
        id: string;
        student_id: string;
        class_id: string | null;
        challenge_id: string;
        challenge_name: string;
        reward_amount: number;
        completed_at: string;
        metadata: Record<string, unknown>;
    };
    Insert: {
        id?: string;
        student_id: string;
        class_id?: string | null;
        challenge_id: string;
        challenge_name: string;
        reward_amount?: number;
        completed_at?: string;
        metadata?: Record<string, unknown>;
    };
    Update: {
        id?: string;
        student_id?: string;
        class_id?: string | null;
        challenge_id?: string;
        challenge_name?: string;
        reward_amount?: number;
        completed_at?: string;
        metadata?: Record<string, unknown>;
    };
};
```

### Step 5: Update Description Generator

If your source needs custom description handling, update `generate_reward_event_description`:

```sql
-- Add case for challenge-specific descriptions
WHEN 'gidouilles' THEN
    CASE p_event_type
        WHEN 'earned' THEN
            -- Check if it's from a challenge
            IF p_metadata ? 'challenge_name' THEN
                v_description := format(
                    'Tu as terminé le défi "%s" et gagné %s gidouille%s',
                    p_metadata->>'challenge_name',
                    p_amount,
                    CASE WHEN p_amount > 1 THEN 's' ELSE '' END
                );
            ELSE
                -- Default earned description
                v_description := format('Tu as gagné %s gidouille%s',
                    p_amount, CASE WHEN p_amount > 1 THEN 's' ELSE '' END);
            END IF;
        -- ... other cases
    END CASE;
```

---

## Adding New Event Types

To add a new event type (e.g., `gifted` for peer-to-peer gifting):

### Step 1: Alter Enum Type

```sql
-- Add new event type to enum
ALTER TYPE public.reward_event_type ADD VALUE IF NOT EXISTS 'gifted';
```

### Step 2: Update Description Generator

```sql
-- Add handling in generate_reward_event_description
WHEN 'gifted' THEN
    v_description := format(
        'Tu as reçu %s %s en cadeau',
        p_amount,
        CASE p_reward_type
            WHEN 'gidouilles' THEN 'gidouille' || CASE WHEN p_amount > 1 THEN 's' ELSE '' END
            WHEN 'bonus' THEN 'point' || CASE WHEN p_amount > 1 THEN 's' ELSE '' END || ' bonus'
            ELSE 'récompense' || CASE WHEN p_amount > 1 THEN 's' ELSE '' END
        END
    );
```

### Step 3: Update TypeScript Types

Update `src/lib/types/reward-journal.ts`:

```typescript
export type RewardEventType =
	| 'earned'
	| 'spent'
	| 'traded'
	| 'used'
	| 'expired'
	| 'unlocked'
	| 'purchased'
	| 'awarded'
	| 'removed'
	| 'gifted'; // Add new type
```

### Step 4: Update Zod Schema

Update `src/lib/server/validation/reward-journal.ts`:

```typescript
export const rewardEventTypeSchema = z.enum([
	'earned',
	'spent',
	'traded',
	'used',
	'expired',
	'unlocked',
	'purchased',
	'awarded',
	'removed',
	'gifted' // Add new type
]);
```

### Step 5: Update Frontend Components

Update `RewardEventCard.svelte` badge colors:

```typescript
const EVENT_BADGE_COLORS: Record<RewardEventType, string> = {
	// ... existing
	gifted: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
};
```

---

## Adding New Reward Types

To add a new reward type (e.g., `badge` for achievement badges):

### Step 1: Alter Enum Type

```sql
-- Add new reward type to enum
ALTER TYPE public.reward_type ADD VALUE IF NOT EXISTS 'badge';
```

### Step 2: Update Description Generator

```sql
-- Add case in generate_reward_event_description
WHEN 'badge' THEN
    CASE p_event_type
        WHEN 'unlocked' THEN
            v_description := format('Tu as obtenu le badge "%s"',
                COALESCE(p_item_name, 'Inconnu'));
        WHEN 'removed' THEN
            v_description := format('Le badge "%s" a été retiré',
                COALESCE(p_item_name, 'Inconnu'));
        ELSE
            v_description := format('Badge "%s"',
                COALESCE(p_item_name, 'Inconnu'));
    END CASE;
```

### Step 3: Update TypeScript Types

Update `src/lib/types/reward-journal.ts`:

```typescript
export type RewardType = 'gidouilles' | 'bonus' | 'vip_card' | 'achievement' | 'item' | 'badge'; // Add new type
```

### Step 4: Update Zod Schema

```typescript
export const rewardTypeSchema = z.enum([
	'gidouilles',
	'bonus',
	'vip_card',
	'achievement',
	'item',
	'badge' // Add new type
]);
```

### Step 5: Update Frontend Components

Update icon and color mappings:

```typescript
import { Award } from 'lucide-svelte';

const REWARD_ICONS: Record<RewardType, typeof Coins> = {
	// ... existing
	badge: Award
};

const ICON_COLORS: Record<RewardType, string> = {
	// ... existing
	badge: 'text-indigo-500'
};
```

---

## Adding Specialized Audit Tables

For non-reward audit needs (e.g., login history):

### Step 1: Create Table

```sql
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_login_history_user_time
    ON public.login_history (user_id, login_at DESC);

CREATE INDEX idx_login_history_failed
    ON public.login_history (login_at DESC)
    WHERE success = false;

-- RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login history"
    ON public.login_history
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login history"
    ON public.login_history
    FOR SELECT
    USING (public.is_admin());
```

### Step 2: Create Logging Function

```sql
CREATE OR REPLACE FUNCTION public.log_login(
    p_user_id UUID,
    p_success BOOLEAN DEFAULT true,
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.login_history (
        user_id, success, failure_reason, metadata
    ) VALUES (
        p_user_id, p_success, p_failure_reason, p_metadata
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
```

### Step 3: Call from Application

```typescript
// In auth hook or login endpoint
await supabase.rpc('log_login', {
	p_user_id: user.id,
	p_success: true,
	p_metadata: {
		provider: 'google',
		ip: request.headers.get('x-forwarded-for')
	}
});
```

---

## Testing Your Changes

### 1. Test Trigger Execution

```sql
-- Insert test record
INSERT INTO daily_challenges_history (
    student_id, challenge_id, challenge_name, reward_amount
) VALUES (
    '<test-student-uuid>',
    'daily-001',
    'Calcul mental',
    5
);

-- Verify event was created
SELECT * FROM reward_events
WHERE source_table = 'daily_challenges_history'
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Test Deduplication

```sql
-- Get the source ID
SELECT id FROM daily_challenges_history
ORDER BY completed_at DESC LIMIT 1;

-- Try to manually trigger (should not create duplicate)
-- This simulates what would happen if trigger fired twice
SELECT log_daily_challenges_to_events();

-- Verify no duplicate
SELECT COUNT(*) FROM reward_events
WHERE source_table = 'daily_challenges_history'
  AND source_id = '<source-id>';
-- Should return 1
```

### 3. Test RLS Policies

```sql
-- Test as student
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<student-uuid>"}';

SELECT COUNT(*) FROM daily_challenges_history;
-- Should only see own records

RESET ROLE;
```

### 4. Test Description Generation

```sql
SELECT generate_reward_event_description(
    'gidouilles'::reward_type,
    'earned'::reward_event_type,
    5,
    'Calcul mental',
    '{"challenge_name": "Calcul mental"}'::jsonb
);
-- Should return: "Tu as terminé le défi "Calcul mental" et gagné 5 gidouilles"
```

### 5. Integration Test (TypeScript)

```typescript
// src/routes/api/challenges/complete/+server.test.ts
import { describe, it, expect } from 'vitest';

describe('Daily Challenge Completion', () => {
	it('should create reward event when challenge completed', async () => {
		// Insert challenge completion
		const { data: challenge } = await supabase
			.from('daily_challenges_history')
			.insert({
				student_id: testStudentId,
				challenge_id: 'test-001',
				challenge_name: 'Test Challenge',
				reward_amount: 10
			})
			.select()
			.single();

		// Verify event was created
		const { data: event } = await supabase
			.from('reward_events')
			.select()
			.eq('source_table', 'daily_challenges_history')
			.eq('source_id', challenge.id)
			.single();

		expect(event).toBeDefined();
		expect(event.reward_type).toBe('gidouilles');
		expect(event.event_type).toBe('earned');
		expect(event.amount).toBe(10);
	});
});
```

---

## Checklist

### New Reward Source

- [ ] Created migration file with timestamp
- [ ] Created source table with proper columns
- [ ] Added indexes for common queries
- [ ] Enabled RLS with appropriate policies
- [ ] Created trigger function with:
  - [ ] `SECURITY DEFINER`
  - [ ] `SET search_path = public`
  - [ ] Deduplication check
  - [ ] Proper event type mapping
  - [ ] Description generation
- [ ] Attached trigger to source table
- [ ] Updated TypeScript database types
- [ ] Updated description generator (if needed)
- [ ] Tested trigger execution
- [ ] Tested deduplication
- [ ] Tested RLS policies
- [ ] Updated documentation

### New Event Type

- [ ] Added to `reward_event_type` enum
- [ ] Updated `generate_reward_event_description`
- [ ] Updated TypeScript types
- [ ] Updated Zod schema
- [ ] Updated frontend badge colors
- [ ] Tested description generation
- [ ] Updated documentation

### New Reward Type

- [ ] Added to `reward_type` enum
- [ ] Updated `generate_reward_event_description`
- [ ] Updated TypeScript types
- [ ] Updated Zod schema
- [ ] Updated frontend icons and colors
- [ ] Tested description generation
- [ ] Updated documentation

---

## Related Documentation

- [Database Schema](./database-schema.md) - Existing table definitions
- [Triggers & Functions](./triggers-functions.md) - Existing trigger implementations
- [Security Model](./security-model.md) - RLS policy patterns
- [Troubleshooting](./troubleshooting.md) - Debug issues with new sources
