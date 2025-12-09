# Testing Guide

> How to test audit trail functionality: triggers, RLS policies, and integration tests.

## Table of Contents

- [Overview](#overview)
- [Testing Trigger Functions](#testing-trigger-functions)
  - [Unit Testing Triggers](#unit-testing-triggers)
  - [Testing Event Type Mapping](#testing-event-type-mapping)
  - [Testing Description Generation](#testing-description-generation)
  - [Testing Deduplication](#testing-deduplication)
- [Testing RLS Policies](#testing-rls-policies)
  - [Policy Test Patterns](#policy-test-patterns)
  - [Testing Student Access](#testing-student-access)
  - [Testing Teacher Access](#testing-teacher-access)
  - [Testing Admin Access](#testing-admin-access)
- [Integration Tests](#integration-tests)
  - [End-to-End Event Flow](#end-to-end-event-flow)
  - [API Endpoint Tests](#api-endpoint-tests)
  - [Real-time Subscription Tests](#real-time-subscription-tests)
- [Test Fixtures](#test-fixtures)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting Tests](#troubleshooting-tests)

---

## Overview

The audit trail system requires testing at multiple levels:

| Level           | What to Test             | Tools                   |
| --------------- | ------------------------ | ----------------------- |
| **Database**    | Triggers, functions, RLS | pgTAP, raw SQL          |
| **API**         | Endpoints, validation    | Vitest, Supertest       |
| **Integration** | Full event flow          | Vitest, Supabase client |
| **Frontend**    | Components, stores       | Vitest, Testing Library |

### Test Environment Setup

```bash
# Start local Supabase for testing
pnpm db:start

# Run database trigger tests
pnpm test:triggers

# Run API/integration tests
pnpm test:server src/routes/api/rewards/

# Run frontend component tests
pnpm test:client src/lib/components/rewards/
```

---

## Testing Trigger Functions

### Unit Testing Triggers

Test trigger functions in isolation using SQL:

```sql
-- test/triggers/test_gidouilles_trigger.sql

-- Setup: Create test student
INSERT INTO profiles (id, role, firstname, lastname)
VALUES ('11111111-1111-1111-1111-111111111111', 'student', 'Test', 'Student');

-- Test 1: Positive delta creates 'earned' event
DO $$
DECLARE
    v_source_id UUID;
    v_event_count INTEGER;
    v_event_type TEXT;
BEGIN
    -- Insert positive gidouilles change
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES ('11111111-1111-1111-1111-111111111111', 10, 'Test exercise')
    RETURNING id INTO v_source_id;

    -- Verify event was created
    SELECT COUNT(*), event_type INTO v_event_count, v_event_type
    FROM reward_events
    WHERE source_table = 'gidouilles_history'
      AND source_id = v_source_id;

    ASSERT v_event_count = 1, 'Expected 1 event, got ' || v_event_count;
    ASSERT v_event_type = 'earned', 'Expected earned, got ' || v_event_type;

    RAISE NOTICE 'Test 1 PASSED: Positive delta creates earned event';
END;
$$;

-- Test 2: Negative delta with 'achat' creates 'spent' event
DO $$
DECLARE
    v_source_id UUID;
    v_event_type TEXT;
BEGIN
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES ('11111111-1111-1111-1111-111111111111', -5, 'Achat boutique')
    RETURNING id INTO v_source_id;

    SELECT event_type INTO v_event_type
    FROM reward_events
    WHERE source_table = 'gidouilles_history'
      AND source_id = v_source_id;

    ASSERT v_event_type = 'spent', 'Expected spent, got ' || v_event_type;

    RAISE NOTICE 'Test 2 PASSED: Negative delta with achat creates spent event';
END;
$$;

-- Test 3: Awarded by teacher (created_by not null)
DO $$
DECLARE
    v_source_id UUID;
    v_event_type TEXT;
    v_teacher_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    -- Create teacher
    INSERT INTO profiles (id, role, firstname, lastname)
    VALUES (v_teacher_id, 'teacher', 'Test', 'Teacher')
    ON CONFLICT DO NOTHING;

    INSERT INTO gidouilles_history (student_id, delta, reason, created_by)
    VALUES ('11111111-1111-1111-1111-111111111111', 15, 'Bonus', v_teacher_id)
    RETURNING id INTO v_source_id;

    SELECT event_type INTO v_event_type
    FROM reward_events
    WHERE source_table = 'gidouilles_history'
      AND source_id = v_source_id;

    ASSERT v_event_type = 'awarded', 'Expected awarded, got ' || v_event_type;

    RAISE NOTICE 'Test 3 PASSED: Teacher award creates awarded event';
END;
$$;

-- Cleanup
DELETE FROM reward_events WHERE student_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM gidouilles_history WHERE student_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);
```

### Testing Event Type Mapping

```sql
-- test/triggers/test_event_type_mapping.sql

-- Test all gidouilles event type mappings
CREATE OR REPLACE FUNCTION test_gidouilles_event_mapping()
RETURNS SETOF TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id UUID := gen_random_uuid();
    v_teacher_id UUID := gen_random_uuid();
    v_source_id UUID;
    v_actual_type TEXT;
BEGIN
    -- Setup
    INSERT INTO profiles (id, role, firstname, lastname)
    VALUES
        (v_student_id, 'student', 'Test', 'Student'),
        (v_teacher_id, 'teacher', 'Test', 'Teacher');

    -- Test: delta > 0, no created_by -> earned
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES (v_student_id, 10, 'Exercise') RETURNING id INTO v_source_id;

    SELECT event_type INTO v_actual_type FROM reward_events
    WHERE source_id = v_source_id;

    IF v_actual_type = 'earned' THEN
        RETURN NEXT 'PASS: delta>0 without created_by -> earned';
    ELSE
        RETURN NEXT 'FAIL: Expected earned, got ' || v_actual_type;
    END IF;

    -- Test: delta > 0, with created_by -> awarded
    INSERT INTO gidouilles_history (student_id, delta, reason, created_by)
    VALUES (v_student_id, 5, 'Bonus', v_teacher_id) RETURNING id INTO v_source_id;

    SELECT event_type INTO v_actual_type FROM reward_events
    WHERE source_id = v_source_id;

    IF v_actual_type = 'awarded' THEN
        RETURN NEXT 'PASS: delta>0 with created_by -> awarded';
    ELSE
        RETURN NEXT 'FAIL: Expected awarded, got ' || v_actual_type;
    END IF;

    -- Test: delta < 0, reason contains 'achat' -> spent
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES (v_student_id, -3, 'Achat item') RETURNING id INTO v_source_id;

    SELECT event_type INTO v_actual_type FROM reward_events
    WHERE source_id = v_source_id;

    IF v_actual_type = 'spent' THEN
        RETURN NEXT 'PASS: delta<0 with achat -> spent';
    ELSE
        RETURN NEXT 'FAIL: Expected spent, got ' || v_actual_type;
    END IF;

    -- Test: delta < 0, reason contains 'échange' -> traded
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES (v_student_id, -2, 'Échange avec ami') RETURNING id INTO v_source_id;

    SELECT event_type INTO v_actual_type FROM reward_events
    WHERE source_id = v_source_id;

    IF v_actual_type = 'traded' THEN
        RETURN NEXT 'PASS: delta<0 with échange -> traded';
    ELSE
        RETURN NEXT 'FAIL: Expected traded, got ' || v_actual_type;
    END IF;

    -- Test: delta < 0, with created_by -> removed
    INSERT INTO gidouilles_history (student_id, delta, reason, created_by)
    VALUES (v_student_id, -5, 'Penalty', v_teacher_id) RETURNING id INTO v_source_id;

    SELECT event_type INTO v_actual_type FROM reward_events
    WHERE source_id = v_source_id;

    IF v_actual_type = 'removed' THEN
        RETURN NEXT 'PASS: delta<0 with created_by -> removed';
    ELSE
        RETURN NEXT 'FAIL: Expected removed, got ' || v_actual_type;
    END IF;

    -- Cleanup
    DELETE FROM reward_events WHERE student_id = v_student_id;
    DELETE FROM gidouilles_history WHERE student_id = v_student_id;
    DELETE FROM profiles WHERE id IN (v_student_id, v_teacher_id);
END;
$$;

-- Run tests
SELECT * FROM test_gidouilles_event_mapping();
```

### Testing Description Generation

```sql
-- test/triggers/test_description_generation.sql

-- Test French description generation
DO $$
DECLARE
    v_desc TEXT;
BEGIN
    -- Test gidouilles earned (singular)
    v_desc := generate_reward_event_description(
        'gidouilles', 'earned', 1, NULL, '{"reason": "Test"}'::jsonb
    );
    ASSERT v_desc LIKE '%1 gidouille%', 'Singular: ' || v_desc;
    ASSERT v_desc NOT LIKE '%gidouilles%', 'Should not be plural: ' || v_desc;

    -- Test gidouilles earned (plural)
    v_desc := generate_reward_event_description(
        'gidouilles', 'earned', 5, NULL, '{"reason": "Exercise"}'::jsonb
    );
    ASSERT v_desc LIKE '%5 gidouilles%', 'Plural: ' || v_desc;
    ASSERT v_desc LIKE '%Exercise%', 'Should include reason: ' || v_desc;

    -- Test VIP card unlocked
    v_desc := generate_reward_event_description(
        'vip_card', 'unlocked', NULL, 'Maître du Temps', '{}'::jsonb
    );
    ASSERT v_desc LIKE '%Maître du Temps%', 'Should include card name: ' || v_desc;
    ASSERT v_desc LIKE '%obtenu%', 'Should use obtenu: ' || v_desc;

    -- Test achievement unlocked
    v_desc := generate_reward_event_description(
        'achievement', 'unlocked', NULL, 'Expert Calcul', '{}'::jsonb
    );
    ASSERT v_desc LIKE '%débloqué%', 'Should use débloqué: ' || v_desc;
    ASSERT v_desc LIKE '%Expert Calcul%', 'Should include name: ' || v_desc;

    -- Test item purchased
    v_desc := generate_reward_event_description(
        'item', 'purchased', NULL, 'Gomme Magique', '{}'::jsonb
    );
    ASSERT v_desc LIKE '%acheté%', 'Should use acheté: ' || v_desc;

    RAISE NOTICE 'All description generation tests PASSED';
END;
$$;
```

### Testing Deduplication

```sql
-- test/triggers/test_deduplication.sql

DO $$
DECLARE
    v_student_id UUID := gen_random_uuid();
    v_source_id UUID;
    v_event_count INTEGER;
BEGIN
    -- Setup
    INSERT INTO profiles (id, role, firstname, lastname)
    VALUES (v_student_id, 'student', 'Test', 'Student');

    -- Insert source record
    INSERT INTO gidouilles_history (student_id, delta, reason)
    VALUES (v_student_id, 10, 'Test')
    RETURNING id INTO v_source_id;

    -- Count events (should be 1)
    SELECT COUNT(*) INTO v_event_count
    FROM reward_events
    WHERE source_table = 'gidouilles_history'
      AND source_id = v_source_id;

    ASSERT v_event_count = 1, 'Initial: Expected 1, got ' || v_event_count;

    -- Manually call trigger function again (simulating race condition)
    -- This should NOT create a duplicate due to EXISTS check
    PERFORM log_gidouilles_history_to_events();

    SELECT COUNT(*) INTO v_event_count
    FROM reward_events
    WHERE source_table = 'gidouilles_history'
      AND source_id = v_source_id;

    ASSERT v_event_count = 1, 'After duplicate attempt: Expected 1, got ' || v_event_count;

    RAISE NOTICE 'Deduplication test PASSED';

    -- Cleanup
    DELETE FROM reward_events WHERE student_id = v_student_id;
    DELETE FROM gidouilles_history WHERE student_id = v_student_id;
    DELETE FROM profiles WHERE id = v_student_id;
END;
$$;
```

---

## Testing RLS Policies

### Policy Test Patterns

```sql
-- Helper function to test as specific user
CREATE OR REPLACE FUNCTION test_as_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set session to act as authenticated user
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, true);
    SET LOCAL ROLE authenticated;
END;
$$;

-- Reset to service role
CREATE OR REPLACE FUNCTION reset_test_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
END;
$$;
```

### Testing Student Access

```typescript
// src/routes/api/rewards/journal/+server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Student RLS Policies', () => {
	let supabase: SupabaseClient;
	let studentId: string;
	let otherStudentId: string;

	beforeAll(async () => {
		// Create test students
		studentId = await createTestStudent('student1@test.com');
		otherStudentId = await createTestStudent('student2@test.com');

		// Create events for both students
		await createTestEvent(studentId, 'gidouilles', 'earned', 10);
		await createTestEvent(otherStudentId, 'gidouilles', 'earned', 5);
	});

	afterAll(async () => {
		await cleanupTestData([studentId, otherStudentId]);
	});

	it('student can only see their own events', async () => {
		// Login as student1
		supabase = await loginAs(studentId);

		const { data, error } = await supabase.from('reward_events').select('*');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data![0].student_id).toBe(studentId);
	});

	it('student cannot see other students events', async () => {
		supabase = await loginAs(studentId);

		const { data } = await supabase
			.from('reward_events')
			.select('*')
			.eq('student_id', otherStudentId);

		expect(data).toHaveLength(0);
	});

	it('student cannot insert events directly', async () => {
		supabase = await loginAs(studentId);

		const { error } = await supabase.from('reward_events').insert({
			student_id: studentId,
			reward_type: 'gidouilles',
			event_type: 'earned',
			amount: 100,
			description: 'Hack attempt'
		});

		expect(error).not.toBeNull();
	});

	it('student cannot update events', async () => {
		supabase = await loginAs(studentId);

		const { error } = await supabase
			.from('reward_events')
			.update({ amount: 1000 })
			.eq('student_id', studentId);

		expect(error).not.toBeNull();
	});

	it('student cannot delete events', async () => {
		supabase = await loginAs(studentId);

		const { error } = await supabase.from('reward_events').delete().eq('student_id', studentId);

		expect(error).not.toBeNull();
	});
});
```

### Testing Teacher Access

```typescript
// src/routes/api/rewards/journal/[studentId]/+server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Teacher RLS Policies', () => {
	let teacherId: string;
	let studentInClass: string;
	let studentNotInClass: string;
	let classId: string;

	beforeAll(async () => {
		// Setup teacher with class
		teacherId = await createTestTeacher();
		classId = await createTestClass(teacherId);

		// Create students
		studentInClass = await createTestStudent('in-class@test.com');
		studentNotInClass = await createTestStudent('not-in-class@test.com');

		// Add one student to class
		await addStudentToClass(studentInClass, classId);

		// Create events
		await createTestEvent(studentInClass, 'gidouilles', 'earned', 10, classId);
		await createTestEvent(studentNotInClass, 'gidouilles', 'earned', 5, null);
	});

	it('teacher can see events for students in their class', async () => {
		const supabase = await loginAs(teacherId);

		const { data, error } = await supabase
			.from('reward_events')
			.select('*')
			.eq('student_id', studentInClass);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('teacher cannot see events for students not in their class', async () => {
		const supabase = await loginAs(teacherId);

		const { data } = await supabase
			.from('reward_events')
			.select('*')
			.eq('student_id', studentNotInClass);

		expect(data).toHaveLength(0);
	});

	it('teacher cannot see events without class_id', async () => {
		const supabase = await loginAs(teacherId);

		// Event without class_id should not be visible to teacher
		const { data } = await supabase.from('reward_events').select('*').is('class_id', null);

		expect(data).toHaveLength(0);
	});

	it('teacher can view moderation logs', async () => {
		const supabase = await loginAs(teacherId);

		const { error } = await supabase.from('moderation_logs').select('*').limit(1);

		expect(error).toBeNull();
	});
});
```

### Testing Admin Access

```typescript
// test/rls/admin-access.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Admin RLS Policies', () => {
	let adminId: string;
	let randomStudentId: string;

	beforeAll(async () => {
		adminId = await createTestAdmin();
		randomStudentId = await createTestStudent('random@test.com');
		await createTestEvent(randomStudentId, 'gidouilles', 'earned', 10);
	});

	it('admin can see all reward_events', async () => {
		const supabase = await loginAs(adminId);

		const { data, error } = await supabase.from('reward_events').select('*');

		expect(error).toBeNull();
		expect(data!.length).toBeGreaterThan(0);
	});

	it('admin can see template_audit_log', async () => {
		const supabase = await loginAs(adminId);

		const { error } = await supabase.from('template_audit_log').select('*');

		expect(error).toBeNull();
	});

	it('admin can see error_logs', async () => {
		const supabase = await loginAs(adminId);

		const { error } = await supabase.from('error_logs').select('*');

		expect(error).toBeNull();
	});

	it('admin can update error_logs (resolve)', async () => {
		const supabase = await loginAs(adminId);

		// Create an error log first
		const { data: log } = await supabase
			.from('error_logs')
			.insert({
				error_type: 'test',
				severity: 'info',
				message: 'Test error',
				url: '/test'
			})
			.select()
			.single();

		// Admin should be able to resolve it
		const { error } = await supabase
			.from('error_logs')
			.update({
				resolved: true,
				resolved_by: adminId,
				resolved_at: new Date().toISOString()
			})
			.eq('id', log!.id);

		expect(error).toBeNull();
	});
});
```

---

## Integration Tests

### End-to-End Event Flow

```typescript
// test/integration/reward-event-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServiceClient } from '$lib/server/supabase';

describe('Reward Event Flow Integration', () => {
	const supabase = createServiceClient();
	let studentId: string;
	let classId: string;

	beforeAll(async () => {
		// Create test data
		const { data: student } = await supabase
			.from('profiles')
			.insert({
				role: 'student',
				firstname: 'Integration',
				lastname: 'Test'
			})
			.select()
			.single();

		studentId = student!.id;
	});

	afterAll(async () => {
		// Cleanup
		await supabase.from('reward_events').delete().eq('student_id', studentId);
		await supabase.from('gidouilles_history').delete().eq('student_id', studentId);
		await supabase.from('profiles').delete().eq('id', studentId);
	});

	it('inserting gidouilles_history creates reward_event', async () => {
		// Insert into source table
		const { data: history } = await supabase
			.from('gidouilles_history')
			.insert({
				student_id: studentId,
				delta: 10,
				reason: 'Integration test exercise'
			})
			.select()
			.single();

		// Wait for trigger (should be immediate, but add small delay for safety)
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify event was created
		const { data: event } = await supabase
			.from('reward_events')
			.select('*')
			.eq('source_table', 'gidouilles_history')
			.eq('source_id', history!.id)
			.single();

		expect(event).not.toBeNull();
		expect(event!.student_id).toBe(studentId);
		expect(event!.reward_type).toBe('gidouilles');
		expect(event!.event_type).toBe('earned');
		expect(event!.amount).toBe(10);
		expect(event!.description).toContain('10 gidouilles');
		expect(event!.description).toContain('Integration test exercise');
	});

	it('marketplace trade creates events for both parties', async () => {
		// Create second student
		const { data: receiver } = await supabase
			.from('profiles')
			.insert({
				role: 'student',
				firstname: 'Receiver',
				lastname: 'Test'
			})
			.select()
			.single();

		// Insert trade
		const { data: trade } = await supabase
			.from('marketplace_trades')
			.insert({
				sender_id: studentId,
				receiver_id: receiver!.id,
				trade_type: 'gidouilles',
				amount: 5,
				status: 'completed'
			})
			.select()
			.single();

		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify sender event
		const { data: senderEvent } = await supabase
			.from('reward_events')
			.select('*')
			.eq('source_table', 'marketplace_trades')
			.eq('source_id', trade!.id)
			.eq('student_id', studentId)
			.single();

		expect(senderEvent).not.toBeNull();
		expect(senderEvent!.event_type).toBe('traded');

		// Verify receiver event
		const { data: receiverEvent } = await supabase
			.from('reward_events')
			.select('*')
			.eq('source_table', 'marketplace_trades')
			.eq('source_id', trade!.id)
			.eq('student_id', receiver!.id)
			.single();

		expect(receiverEvent).not.toBeNull();
		expect(receiverEvent!.event_type).toBe('earned');

		// Cleanup
		await supabase.from('reward_events').delete().eq('student_id', receiver!.id);
		await supabase.from('profiles').delete().eq('id', receiver!.id);
	});
});
```

### API Endpoint Tests

```typescript
// src/routes/api/rewards/journal/+server.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('GET /api/rewards/journal', () => {
	let studentId: string;
	let authToken: string;

	beforeAll(async () => {
		// Setup authenticated student with events
		const result = await setupAuthenticatedStudent();
		studentId = result.studentId;
		authToken = result.token;

		// Create test events
		for (let i = 0; i < 25; i++) {
			await createTestEvent(studentId, 'gidouilles', 'earned', i + 1);
		}
	});

	it('returns paginated events', async () => {
		const response = await fetch('/api/rewards/journal?limit=10', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.events).toHaveLength(10);
		expect(data.pagination.total).toBe(25);
		expect(data.pagination.totalPages).toBe(3);
		expect(data.pagination.hasMore).toBe(true);
	});

	it('filters by reward_type', async () => {
		// Create bonus event
		await createTestEvent(studentId, 'bonus', 'earned', 5);

		const response = await fetch('/api/rewards/journal?reward_type=bonus', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		const data = await response.json();

		expect(data.events.every((e: any) => e.reward_type === 'bonus')).toBe(true);
	});

	it('filters by date range', async () => {
		const from = new Date(Date.now() - 86400000).toISOString(); // Yesterday
		const to = new Date().toISOString();

		const response = await fetch(`/api/rewards/journal?from=${from}&to=${to}`, {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		const data = await response.json();

		data.events.forEach((event: any) => {
			const eventDate = new Date(event.created_at);
			expect(eventDate >= new Date(from)).toBe(true);
			expect(eventDate <= new Date(to)).toBe(true);
		});
	});

	it('returns 400 for invalid reward_type', async () => {
		const response = await fetch('/api/rewards/journal?reward_type=invalid', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status).toBe(400);
	});

	it('returns 401 without authentication', async () => {
		const response = await fetch('/api/rewards/journal');

		expect(response.status).toBe(401);
	});
});
```

### Real-time Subscription Tests

```typescript
// test/integration/realtime.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Real-time Subscriptions', () => {
	let supabase: SupabaseClient;
	let studentId: string;
	let channel: RealtimeChannel;

	beforeAll(async () => {
		studentId = await createTestStudent('realtime@test.com');
		supabase = await loginAs(studentId);
	});

	afterAll(async () => {
		if (channel) channel.unsubscribe();
		await cleanupTestData([studentId]);
	});

	it('receives new events via subscription', async () => {
		const receivedEvents: any[] = [];

		// Setup subscription
		channel = supabase
			.channel(`test-${studentId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reward_events',
					filter: `student_id=eq.${studentId}`
				},
				(payload) => receivedEvents.push(payload.new)
			)
			.subscribe();

		// Wait for subscription to be ready
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Insert event (using service role to bypass RLS for insert)
		const serviceClient = createServiceClient();
		await serviceClient.from('gidouilles_history').insert({
			student_id: studentId,
			delta: 10,
			reason: 'Realtime test'
		});

		// Wait for event to arrive
		await new Promise((resolve) => setTimeout(resolve, 500));

		expect(receivedEvents).toHaveLength(1);
		expect(receivedEvents[0].student_id).toBe(studentId);
		expect(receivedEvents[0].reward_type).toBe('gidouilles');
	});

	it('does not receive events for other students', async () => {
		const receivedEvents: any[] = [];
		const otherStudentId = await createTestStudent('other@test.com');

		channel = supabase
			.channel(`test-filter-${studentId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reward_events',
					filter: `student_id=eq.${studentId}`
				},
				(payload) => receivedEvents.push(payload.new)
			)
			.subscribe();

		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Insert event for OTHER student
		const serviceClient = createServiceClient();
		await serviceClient.from('gidouilles_history').insert({
			student_id: otherStudentId,
			delta: 10,
			reason: 'Other student test'
		});

		await new Promise((resolve) => setTimeout(resolve, 500));

		// Should NOT receive event for other student
		expect(receivedEvents).toHaveLength(0);

		await cleanupTestData([otherStudentId]);
	});
});
```

---

## Test Fixtures

### Fixture Utilities

```typescript
// test/fixtures/audit-trail.ts
import { createServiceClient } from '$lib/server/supabase';

const supabase = createServiceClient();

export async function createTestStudent(email: string): Promise<string> {
	const { data } = await supabase
		.from('profiles')
		.insert({
			role: 'student',
			firstname: 'Test',
			lastname: email.split('@')[0],
			email
		})
		.select('id')
		.single();

	return data!.id;
}

export async function createTestTeacher(): Promise<string> {
	const { data } = await supabase
		.from('profiles')
		.insert({
			role: 'teacher',
			firstname: 'Test',
			lastname: 'Teacher'
		})
		.select('id')
		.single();

	return data!.id;
}

export async function createTestAdmin(): Promise<string> {
	const { data } = await supabase
		.from('profiles')
		.insert({
			role: 'admin',
			firstname: 'Test',
			lastname: 'Admin'
		})
		.select('id')
		.single();

	return data!.id;
}

export async function createTestClass(teacherId: string): Promise<string> {
	const { data } = await supabase
		.from('classes')
		.insert({
			name: 'Test Class',
			teacher_id: teacherId
		})
		.select('id')
		.single();

	return data!.id;
}

export async function addStudentToClass(studentId: string, classId: string): Promise<void> {
	await supabase.from('class_members').insert({
		student_id: studentId,
		class_id: classId
	});
}

export async function createTestEvent(
	studentId: string,
	rewardType: string,
	eventType: string,
	amount: number,
	classId?: string | null
): Promise<string> {
	// Insert into source table to trigger event creation
	if (rewardType === 'gidouilles') {
		const { data } = await supabase
			.from('gidouilles_history')
			.insert({
				student_id: studentId,
				delta: eventType === 'spent' ? -amount : amount,
				class_id: classId,
				reason: `Test ${eventType}`
			})
			.select('id')
			.single();

		return data!.id;
	}

	// For other types, insert directly (for testing purposes)
	const { data } = await supabase
		.from('reward_events')
		.insert({
			student_id: studentId,
			reward_type: rewardType,
			event_type: eventType,
			amount,
			class_id: classId,
			description: `Test ${rewardType} ${eventType}`,
			source_table: 'test_fixture',
			metadata: {}
		})
		.select('id')
		.single();

	return data!.id;
}

export async function cleanupTestData(userIds: string[]): Promise<void> {
	for (const userId of userIds) {
		await supabase.from('reward_events').delete().eq('student_id', userId);
		await supabase.from('gidouilles_history').delete().eq('student_id', userId);
		await supabase.from('bonus_history').delete().eq('student_id', userId);
		await supabase.from('class_members').delete().eq('student_id', userId);
		await supabase.from('profiles').delete().eq('id', userId);
	}
}

export async function loginAs(userId: string): Promise<SupabaseClient> {
	// For testing, create a client with the user's JWT
	// This depends on your auth setup
	const token = await generateTestToken(userId);
	return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
		global: {
			headers: { Authorization: `Bearer ${token}` }
		}
	});
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test-audit-trail.yml
name: Audit Trail Tests

on:
  push:
    paths:
      - 'supabase/migrations/**'
      - 'src/routes/api/rewards/**'
      - 'src/lib/components/rewards/**'
      - 'test/**'

jobs:
  database-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Run migrations
        run: supabase db push

      - name: Run trigger tests
        run: |
          supabase db reset
          psql $DATABASE_URL -f test/triggers/test_gidouilles_trigger.sql
          psql $DATABASE_URL -f test/triggers/test_event_type_mapping.sql
          psql $DATABASE_URL -f test/triggers/test_description_generation.sql
          psql $DATABASE_URL -f test/triggers/test_deduplication.sql

  integration-tests:
    runs-on: ubuntu-latest
    needs: database-tests
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Start Supabase
        run: supabase start

      - name: Run integration tests
        run: pnpm test:server src/routes/api/rewards/ --run
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

---

## Troubleshooting Tests

### Common Issues

| Issue                            | Cause                   | Solution                        |
| -------------------------------- | ----------------------- | ------------------------------- |
| Trigger test fails silently      | Transaction rolled back | Check for constraint violations |
| RLS test returns unexpected data | Wrong user context      | Verify `set_config` and role    |
| Real-time test times out         | Subscription not ready  | Increase wait time              |
| Cleanup fails                    | Foreign key constraints | Delete in correct order         |

### Debug Queries

```sql
-- Check if triggers are firing
SELECT * FROM pg_stat_user_tables
WHERE relname IN ('gidouilles_history', 'reward_events');

-- Check trigger execution errors
SELECT * FROM pg_stat_activity
WHERE state = 'idle in transaction (aborted)';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('reward_events', 'gidouilles_history');
```

---

## Related Documentation

- [Triggers & Functions](./triggers-functions.md) - What to test
- [Security Model](./security-model.md) - RLS policy details
- [API Reference](./api-reference.md) - Endpoint specifications
- [Troubleshooting](./troubleshooting.md) - Debug failing tests
