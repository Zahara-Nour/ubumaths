# Component and Store Testing

Testing Svelte 5 components and reactive stores.

## Overview

UbuMaths uses two approaches for client-side testing:

| Type            | Environment          | File Pattern                     | Purpose                          |
| --------------- | -------------------- | -------------------------------- | -------------------------------- |
| Component Tests | Browser (Playwright) | `*.svelte.test.ts`               | DOM rendering, user interactions |
| Store Tests     | Node.js or Browser   | `*.test.ts` / `*.svelte.test.ts` | Reactive state logic             |

## Svelte Component Testing

### Setup

Component tests run in a real browser via `@vitest/browser`:

```typescript
// vitest-setup-client.ts
/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />
```

### Basic Component Test

```typescript
// src/routes/(public)/page.svelte.spec.ts
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
```

### Component with Props

```typescript
import { render } from 'vitest-browser-svelte';
import UserCard from './UserCard.svelte';

describe('UserCard', () => {
	it('should display user name', async () => {
		render(UserCard, {
			props: {
				user: { name: 'John Doe', email: 'john@example.com' }
			}
		});

		const name = page.getByText('John Doe');
		await expect.element(name).toBeVisible();
	});
});
```

### Testing User Interactions

```typescript
import { render } from 'vitest-browser-svelte';
import Counter from './Counter.svelte';

describe('Counter', () => {
	it('should increment count on button click', async () => {
		render(Counter, { props: { initialCount: 0 } });

		const button = page.getByRole('button', { name: 'Increment' });
		const count = page.getByTestId('count');

		await expect.element(count).toHaveText('0');

		await button.click();
		await expect.element(count).toHaveText('1');

		await button.click();
		await expect.element(count).toHaveText('2');
	});
});
```

### Testing Form Components

```typescript
describe('LoginForm', () => {
	it('should validate email format', async () => {
		render(LoginForm);

		const emailInput = page.getByRole('textbox', { name: 'Email' });
		const submitButton = page.getByRole('button', { name: 'Login' });

		await emailInput.fill('invalid-email');
		await submitButton.click();

		const error = page.getByText('Invalid email format');
		await expect.element(error).toBeVisible();
	});

	it('should submit form with valid data', async () => {
		const onSubmit = vi.fn();
		render(LoginForm, { props: { onSubmit } });

		await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
		await page.getByLabelText('Password').fill('password123');
		await page.getByRole('button', { name: 'Login' }).click();

		expect(onSubmit).toHaveBeenCalledWith({
			email: 'test@example.com',
			password: 'password123'
		});
	});
});
```

## Svelte 5 Store Testing

### Store Architecture

Stores use Svelte 5 runes (`$state`, `$derived`) and export reactive state:

```typescript
// src/lib/stores/example.svelte.ts
import { browser } from '$app/environment';

function createExampleStore() {
	let items = $state<Item[]>([]);
	let loading = $state(false);

	return {
		get items() {
			return items;
		},
		get loading() {
			return loading;
		},
		get count() {
			return items.length;
		},

		async fetchItems() {
			if (!browser) return;
			loading = true;
			try {
				items = await api.getItems();
			} finally {
				loading = false;
			}
		},

		addItem(item: Item) {
			items = [...items, item];
		}
	};
}

export const exampleStore = createExampleStore();
```

### Testing Store Logic

```typescript
// src/lib/stores/example.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exampleStore } from './example.svelte';

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

describe('exampleStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset store state if needed
	});

	it('should add item', () => {
		const item = { id: '1', name: 'Test' };

		exampleStore.addItem(item);

		expect(exampleStore.items).toContainEqual(item);
		expect(exampleStore.count).toBe(1);
	});
});
```

### Complex Store Test Example

```typescript
// src/lib/stores/chat.svelte.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatStore } from './chat.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock modules
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

vi.mock('./friends.svelte', () => ({
	friendsManager: {
		get friendships() {
			return [];
		}
	}
}));

function createMockSupabaseClient(): SupabaseClient<Database> {
	return {
		channel: vi.fn((name) => createMockChannel(name)),
		from: vi.fn(() => ({
			insert: vi.fn(() => ({
				select: vi.fn(() => ({
					single: vi.fn(() =>
						Promise.resolve({
							data: { id: 'msg-1', content: { text: 'Test' } },
							error: null
						})
					)
				}))
			}))
		})),
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

describe('chatStore', () => {
	let supabase: SupabaseClient<Database>;

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		vi.clearAllMocks();
	});

	describe('sendMessage', () => {
		it('should add optimistic message immediately', async () => {
			chatStore.initialize(supabase, 'user-1');
			await chatStore.joinConversation('conv-1');

			const promise = chatStore.sendMessage('conv-1', 'Hello');

			// Optimistic message appears immediately
			expect(chatStore.getMessages('conv-1')).toContainEqual(
				expect.objectContaining({
					content: { text: 'Hello' },
					isOptimistic: true
				})
			);

			await promise;
		});

		it('should replace optimistic with DB message', async () => {
			chatStore.initialize(supabase, 'user-1');
			await chatStore.joinConversation('conv-1');

			await chatStore.sendMessage('conv-1', 'Hello');

			const messages = chatStore.getMessages('conv-1');
			expect(messages).toHaveLength(1);
			expect(messages[0].isOptimistic).toBeFalsy();
			expect(messages[0].id).toBe('msg-1');
		});
	});
});
```

### Testing Realtime Store Events

```typescript
describe('CRITICAL: Message Deduplication', () => {
	let supabase: SupabaseClient<Database>;
	let mockChannel: MockRealtimeChannel;

	beforeEach(() => {
		mockChannel = createMockChannel('conv-1');
		supabase = {
			channel: vi.fn(() => mockChannel),
			removeChannel: vi.fn()
		} as unknown as SupabaseClient<Database>;
	});

	it('should not duplicate message from broadcast and postgres_changes', async () => {
		chatStore.initialize(supabase, 'user-1');
		await chatStore.joinConversation('conv-1');

		// Simulate receiving same message from both sources
		const messageData = {
			id: 'msg-123',
			conversation_id: 'conv-1',
			content: { text: 'Hello' }
		};

		// First: broadcast arrives
		mockChannel.simulateBroadcast('new_message', messageData);

		// Then: postgres_changes arrives with same message
		mockChannel.simulatePostgresChanges({
			eventType: 'INSERT',
			new: messageData
		});

		// Should only have one message
		const messages = chatStore.getMessages('conv-1');
		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe('msg-123');
	});
});
```

## Browser vs Node Environment

### When to Use Browser Tests

Use `*.svelte.test.ts` for:

- Components requiring DOM
- Tests with user interactions
- Testing reactive UI updates
- Testing browser APIs (localStorage, etc.)

### When to Use Node Tests

Use `*.test.ts` for:

- Pure logic testing
- API/server-side testing
- Store logic (when not testing reactivity)
- Faster test execution

### Mocking Browser in Node

```typescript
// For store tests in Node environment
vi.mock('$app/environment', () => ({
	browser: true, // Simulate browser
	building: false,
	dev: true,
	version: '1.0.0'
}));
```

## Testing Reactive State

### Testing $state

```typescript
describe('Counter Store', () => {
	it('should update count reactively', () => {
		// Given Svelte 5 runes, access reactive state via getters
		expect(counterStore.count).toBe(0);

		counterStore.increment();
		expect(counterStore.count).toBe(1);

		counterStore.decrement();
		expect(counterStore.count).toBe(0);
	});
});
```

### Testing $derived

```typescript
describe('CartStore', () => {
	it('should compute total from items', () => {
		cartStore.addItem({ id: '1', price: 10, qty: 2 });
		cartStore.addItem({ id: '2', price: 5, qty: 1 });

		// $derived total is computed automatically
		expect(cartStore.total).toBe(25); // (10*2) + (5*1)
	});

	it('should update total when items change', () => {
		cartStore.addItem({ id: '1', price: 10, qty: 1 });
		expect(cartStore.total).toBe(10);

		cartStore.updateQuantity('1', 3);
		expect(cartStore.total).toBe(30);
	});
});
```

### Testing $effect (Side Effects)

```typescript
describe('AutoSaveStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should auto-save after changes', async () => {
		const saveSpy = vi.spyOn(api, 'save');

		autoSaveStore.setContent('New content');

		// Effect debounces save
		expect(saveSpy).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1000);

		expect(saveSpy).toHaveBeenCalledWith('New content');
	});
});
```

## Component Test Queries

### Query Methods

```typescript
// By role (preferred)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { level: 1 });

// By label (forms)
page.getByLabelText('Password');

// By text
page.getByText('Welcome');
page.getByText(/loading/i); // Regex

// By test ID (last resort)
page.getByTestId('custom-element');

// By placeholder
page.getByPlaceholder('Search...');
```

### Assertions

```typescript
// Visibility
await expect.element(el).toBeVisible();
await expect.element(el).not.toBeVisible();

// Content
await expect.element(el).toHaveText('Hello');
await expect.element(el).toContainText('Hello');

// Attributes
await expect.element(el).toHaveAttribute('disabled');
await expect.element(el).toHaveClass('active');

// Form state
await expect.element(input).toHaveValue('test');
await expect.element(checkbox).toBeChecked();
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good - tests user-visible behavior
it('should show error message for invalid email', async () => {
	await emailInput.fill('invalid');
	await submitButton.click();
	await expect.element(page.getByText('Invalid email')).toBeVisible();
});

// Avoid - tests internal state
it('should set hasError to true', async () => {
	// Testing internal state couples test to implementation
});
```

### 2. Use Accessible Queries

```typescript
// Good - uses semantic queries
page.getByRole('button', { name: 'Delete' });
page.getByLabelText('Email address');

// Avoid - brittle selectors
page.locator('.btn-primary');
page.locator('[data-cy="delete-btn"]');
```

### 3. Isolate Store State

```typescript
describe('MyStore', () => {
	let store: ReturnType<typeof createMyStore>;

	beforeEach(() => {
		// Create fresh store for each test
		store = createMyStore();
	});

	// Tests are isolated
});
```

### 4. Mock External Dependencies

```typescript
// Mock API calls in store tests
vi.mock('$lib/api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn()
	}
}));

// Mock Supabase
const mockSupabase = createMockSupabase();
store.initialize(mockSupabase);
```

### 5. Test Edge Cases

```typescript
describe('MessageList', () => {
	it('should show empty state when no messages', async () => {
		render(MessageList, { props: { messages: [] } });
		await expect.element(page.getByText('No messages')).toBeVisible();
	});

	it('should handle very long messages', async () => {
		const longMessage = 'A'.repeat(10000);
		render(MessageList, { props: { messages: [{ text: longMessage }] } });
		// Should render without crashing, potentially truncated
	});

	it('should handle special characters', async () => {
		render(MessageList, { props: { messages: [{ text: '<script>alert(1)</script>' }] } });
		// Should escape HTML
		await expect.element(page.getByText('<script>')).toBeVisible();
	});
});
```
