# Testing Guide

> How to test the rewards system components.

## Test Structure

```
tests/
├── server/
│   ├── rewards/
│   │   ├── update-student.test.ts     # Gidouilles updates
│   │   ├── draw-vip-cards.test.ts     # Card drawing
│   │   ├── vip-card-actions.test.ts   # Card action execution
│   │   └── shop-purchase.test.ts      # Shop transactions
│   └── triggers/
│       └── reward-events.test.ts      # Database triggers
├── client/
│   ├── VipCardDrawModal.svelte.test.ts
│   ├── RewardEventCard.svelte.test.ts
│   └── ShopItemCard.svelte.test.ts
└── integration/
    └── rewards-flow.test.ts           # End-to-end flows
```

## Running Tests

```bash
# All unit tests (watch mode)
pnpm test:unit

# Server-side tests only
pnpm test:server tests/server/rewards/

# Client-side tests only (Svelte components)
pnpm test:client tests/client/

# Database trigger tests (requires Docker)
pnpm test:triggers

# Single file
pnpm test:server tests/server/rewards/update-student.test.ts
```

---

## Unit Test Examples

### Testing Gidouilles Update

```typescript
// tests/server/rewards/update-student.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '$routes/api/teacher/rewards/update-student/+server';

describe('POST /api/teacher/rewards/update-student', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should update gidouilles for valid request', async () => {
		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: '123e4567-e89b-12d3-a456-426614174000',
				classId: '123e4567-e89b-12d3-a456-426614174001',
				delta: 10
			})
		});

		const mockLocals = {
			user: { id: 'teacher-uuid', role: 'teacher' },
			supabase: createMockSupabase()
		};

		const response = await POST({ request: mockRequest, locals: mockLocals });
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.newBalance).toBe(110); // Previous 100 + 10
	});

	it('should reject invalid UUID', async () => {
		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: 'not-a-uuid',
				classId: '123e4567-e89b-12d3-a456-426614174001',
				delta: 10
			})
		});

		const response = await POST({ request: mockRequest, locals: mockLocals });
		expect(response.status).toBe(400);
	});

	it('should prevent negative balance', async () => {
		// Student has 5 gidouilles, trying to remove 10
		const mockSupabase = createMockSupabase({ gidouilles: 5 });

		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: '123e4567-e89b-12d3-a456-426614174000',
				classId: '123e4567-e89b-12d3-a456-426614174001',
				delta: -10
			})
		});

		const response = await POST({
			request: mockRequest,
			locals: { ...mockLocals, supabase: mockSupabase }
		});
		expect(response.status).toBe(400);
	});
});
```

### Testing VIP Card Draw

```typescript
// tests/server/rewards/draw-vip-cards.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '$routes/api/rewards/draw-vip-cards/+server';

describe('POST /api/rewards/draw-vip-cards', () => {
	it('should draw card with gidouilles payment', async () => {
		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: '123e4567-e89b-12d3-a456-426614174000',
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 3
			})
		});

		const response = await POST({ request: mockRequest, locals: mockLocals });
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.cards).toHaveLength(1);
		expect(data.cards[0]).toHaveProperty('cardId');
		expect(data.cards[0]).toHaveProperty('rarity');
	});

	it('should draw cards with VIP card payment', async () => {
		// Using Soldes card (draw_cards: 2)
		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: '123e4567-e89b-12d3-a456-426614174000',
				count: 2,
				paymentMethod: 'vip_card',
				vipCardInstanceId: 'soldes-instance-uuid'
			})
		});

		const response = await POST({ request: mockRequest, locals: mockLocals });
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.cards).toHaveLength(2);
	});

	it('should reject insufficient gidouilles', async () => {
		const mockSupabase = createMockSupabase({ gidouilles: 1 }); // Only 1, need 3

		const mockRequest = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({
				studentId: '123e4567-e89b-12d3-a456-426614174000',
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 3
			})
		});

		const response = await POST({
			request: mockRequest,
			locals: { ...mockLocals, supabase: mockSupabase }
		});
		expect(response.status).toBe(400);
	});
});
```

### Testing Svelte Components

```typescript
// tests/client/VipCardDrawModal.svelte.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VipCardDrawModal from '$lib/components/rewards/VipCardDrawModal.svelte';

describe('VipCardDrawModal', () => {
	const mockCards = [
		{ cardId: 'bonus', rarity: 'common', instanceId: 'uuid-1' },
		{ cardId: 'help', rarity: 'rare', instanceId: 'uuid-2' }
	];

	it('should render drawn cards', () => {
		render(VipCardDrawModal, {
			props: {
				cards: mockCards,
				onClose: () => {}
			}
		});

		expect(screen.getByText('Bonus')).toBeTruthy();
		expect(screen.getByText('Help !')).toBeTruthy();
	});

	it('should show rarity badges', () => {
		render(VipCardDrawModal, {
			props: {
				cards: mockCards,
				onClose: () => {}
			}
		});

		expect(screen.getByText('Common')).toBeTruthy();
		expect(screen.getByText('Rare')).toBeTruthy();
	});
});
```

---

## Database Trigger Tests

Trigger tests require Docker for isolated database testing.

```typescript
// tests/triggers/reward-events.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, resetDatabase } from '../helpers/supabase-test';

describe('Reward Events Triggers', () => {
	let supabase;

	beforeAll(async () => {
		supabase = await createTestClient();
		await resetDatabase();
	});

	afterAll(async () => {
		await supabase.dispose();
	});

	it('should create reward_event when gidouilles_history inserted', async () => {
		// Insert into gidouilles_history
		const { data: history } = await supabase
			.from('gidouilles_history')
			.insert({
				student_id: testStudentId,
				class_id: testClassId,
				delta: 10,
				reason: 'Test award'
			})
			.select()
			.single();

		// Verify reward_event was created
		const { data: events } = await supabase
			.from('reward_events')
			.select('*')
			.eq('source_table', 'gidouilles_history')
			.eq('source_id', history.id);

		expect(events).toHaveLength(1);
		expect(events[0].reward_type).toBe('gidouilles');
		expect(events[0].event_type).toBe('earned');
		expect(events[0].amount).toBe(10);
	});

	it('should create reward_event when vip_cards_activity inserted', async () => {
		// Insert VIP card activity
		const { data: activity } = await supabase
			.from('vip_cards_activity')
			.insert({
				student_id: testStudentId,
				card_id: 'bonus',
				card_instance_id: 'test-instance',
				action: 'gained'
			})
			.select()
			.single();

		// Verify event
		const { data: events } = await supabase
			.from('reward_events')
			.select('*')
			.eq('source_table', 'vip_cards_activity')
			.eq('source_id', activity.id);

		expect(events).toHaveLength(1);
		expect(events[0].reward_type).toBe('vip_card');
		expect(events[0].event_type).toBe('earned');
	});
});
```

---

## Integration Tests

End-to-end flows testing complete user journeys.

```typescript
// tests/integration/rewards-flow.test.ts
import { describe, it, expect } from 'vitest';

describe('Complete Rewards Flow', () => {
	it('should complete full VIP card lifecycle', async () => {
		// 1. Teacher awards gidouilles
		const awardResponse = await fetch('/api/teacher/rewards/update-student', {
			method: 'POST',
			headers: { Authorization: `Bearer ${teacherToken}` },
			body: JSON.stringify({ studentId, classId, delta: 10 })
		});
		expect(awardResponse.ok).toBe(true);

		// 2. Student draws card
		const drawResponse = await fetch('/api/rewards/draw-vip-cards', {
			method: 'POST',
			headers: { Authorization: `Bearer ${studentToken}` },
			body: JSON.stringify({
				studentId,
				count: 1,
				paymentMethod: 'gidouilles',
				gidouillesCost: 3
			})
		});
		const { cards } = await drawResponse.json();
		expect(cards).toHaveLength(1);

		// 3. Student requests activation
		const requestResponse = await fetch('/api/vip-cards/request-activation', {
			method: 'POST',
			headers: { Authorization: `Bearer ${studentToken}` },
			body: JSON.stringify({
				cardInstanceId: cards[0].instanceId
			})
		});
		expect(requestResponse.ok).toBe(true);

		// 4. Teacher approves
		const approveResponse = await fetch('/api/vip-cards/use-card', {
			method: 'POST',
			headers: { Authorization: `Bearer ${teacherToken}` },
			body: JSON.stringify({
				studentId,
				cardInstanceId: cards[0].instanceId
			})
		});
		expect(approveResponse.ok).toBe(true);

		// 5. Verify in journal
		const journalResponse = await fetch('/api/rewards/journal', {
			headers: { Authorization: `Bearer ${studentToken}` }
		});
		const { events } = await journalResponse.json();

		// Should have: earned gidouilles, spent gidouilles (draw), earned card, used card
		expect(events.length).toBeGreaterThanOrEqual(4);
	});
});
```

---

## Test Utilities

### Mock Supabase Client

```typescript
// tests/helpers/mock-supabase.ts
export function createMockSupabase(profileData = {}) {
	const defaultProfile = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		gidouilles: 100,
		bonus: 0,
		vip_cards: {},
		...profileData
	};

	return {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					single: () => Promise.resolve({ data: defaultProfile, error: null })
				})
			}),
			update: (data: object) => ({
				eq: () => ({
					select: () => ({
						single: () =>
							Promise.resolve({
								data: { ...defaultProfile, ...data },
								error: null
							})
					})
				})
			}),
			insert: (data: object) => ({
				select: () => ({
					single: () => Promise.resolve({ data, error: null })
				})
			})
		}),
		rpc: (fn: string, params: object) => Promise.resolve({ data: {}, error: null })
	};
}
```

### Test Data Factories

```typescript
// tests/helpers/factories.ts
import { v4 as uuid } from 'uuid';

export function createTestStudent(overrides = {}) {
	return {
		id: uuid(),
		email: `student-${Date.now()}@test.com`,
		role: 'student',
		gidouilles: 100,
		bonus: 0,
		vip_cards: {},
		...overrides
	};
}

export function createTestVipCard(overrides = {}) {
	return {
		cardId: 'bonus',
		instanceId: uuid(),
		earnedAt: new Date().toISOString(),
		usedAt: null,
		activationRequestedAt: null,
		...overrides
	};
}

export function createTestShopItem(overrides = {}) {
	return {
		id: uuid(),
		internal_name: 'test_item',
		display_name: 'Test Item',
		category: 'consumable',
		base_price: 10,
		is_active: true,
		...overrides
	};
}
```

---

## Coverage Requirements

| Category          | Minimum | Target |
| ----------------- | ------- | ------ |
| API Endpoints     | 80%     | 95%    |
| Business Logic    | 90%     | 100%   |
| Database Triggers | 85%     | 95%    |
| Svelte Components | 70%     | 85%    |

Run coverage report:

```bash
pnpm test:unit -- --coverage
```

---

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Mock external services** - Don't hit real Supabase in unit tests
3. **Test edge cases** - Empty arrays, null values, boundaries
4. **Use descriptive names** - `it('should reject when gidouilles insufficient')`
5. **Clean up after** - Reset state between tests
6. **Test error paths** - Not just happy paths
