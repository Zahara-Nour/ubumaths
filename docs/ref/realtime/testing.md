# Testing Realtime

Comprehensive guide for testing realtime functionality in UbuMaths.

---

## Test Files Overview

| File                      | Location                   | Purpose                |
| ------------------------- | -------------------------- | ---------------------- |
| `presence.svelte.test.ts` | `src/lib/stores/`          | Presence manager tests |
| `chat.svelte.test.ts`     | `src/lib/stores/`          | Chat store tests       |
| `chat-triggers.test.ts`   | `tests/database/triggers/` | Database trigger tests |

---

## Mock Patterns

### Mock Supabase Client

```typescript
// Base mock for Supabase client
function createMockSupabase() {
	return {
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(() => Promise.resolve({ data: null, error: null })),
					order: vi.fn(() => Promise.resolve({ data: [], error: null }))
				})),
				order: vi.fn(() => ({
					limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
				}))
			})),
			insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
			update: vi.fn(() => ({
				eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
			})),
			upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
		})),
		rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
		channel: vi.fn(() => createMockChannel('default'))
	} as unknown as SupabaseClient<Database>;
}
```

### Mock Realtime Channel

```typescript
interface MockRealtimeChannel {
	channelName: string;
	on: Mock;
	subscribe: Mock;
	unsubscribe: Mock;
	send: Mock;
	simulateEvent: (type: string, config: object, payload: unknown) => void;
	simulatePostgresChanges: (payload: unknown) => void;
	simulateBroadcast: (event: string, payload: unknown) => void;
}

function createMockChannel(name: string): MockRealtimeChannel {
	const listeners = new Map<string, ((payload: unknown) => void)[]>();

	const channel: MockRealtimeChannel = {
		channelName: name,

		on: vi.fn(function (
			this: MockRealtimeChannel,
			type: string,
			config: object,
			callback: (payload: unknown) => void
		) {
			const key = JSON.stringify({ type, config });
			if (!listeners.has(key)) {
				listeners.set(key, []);
			}
			listeners.get(key)!.push(callback);
			return this;
		}),

		subscribe: vi.fn(function (this: MockRealtimeChannel, callback?: (status: string) => void) {
			if (callback) {
				// Simulate async subscription
				setTimeout(() => callback('SUBSCRIBED'), 0);
			}
			return this;
		}),

		unsubscribe: vi.fn(() => Promise.resolve()),

		send: vi.fn(() => Promise.resolve()),

		// Helper to simulate events
		simulateEvent(type: string, config: object, payload: unknown) {
			const key = JSON.stringify({ type, config });
			const callbacks = listeners.get(key);
			if (callbacks) {
				callbacks.forEach((cb) => cb(payload));
			}
		},

		// Convenience for postgres_changes
		simulatePostgresChanges(payload: unknown) {
			// Find all postgres_changes listeners
			for (const [key, callbacks] of listeners.entries()) {
				if (key.includes('postgres_changes')) {
					callbacks.forEach((cb) => cb(payload));
				}
			}
		},

		// Convenience for broadcast
		simulateBroadcast(event: string, payload: unknown) {
			const key = JSON.stringify({ type: 'broadcast', config: { event } });
			const callbacks = listeners.get(key);
			if (callbacks) {
				callbacks.forEach((cb) => cb({ payload }));
			}
		}
	};

	return channel;
}
```

### Mock supabaseRealtimeManager

```typescript
// Mock the singleton
vi.mock('$lib/stores/supabaseRealtime.svelte', () => {
	const channels = new Map<string, MockRealtimeChannel>();

	return {
		supabaseRealtimeManager: {
			init: vi.fn(),
			connectionStatus: 'connected',
			isConnected: true,
			currentUserId: null,

			createChannel: vi.fn((name: string) => {
				if (!channels.has(name)) {
					channels.set(name, createMockChannel(name));
				}
				return channels.get(name);
			}),

			subscribeChannel: vi.fn(() => Promise.resolve()),
			unsubscribeChannel: vi.fn(() => Promise.resolve()),
			getChannel: vi.fn((name: string) => channels.get(name)),
			disconnect: vi.fn(() => Promise.resolve()),

			// Test helper
			_getChannels: () => channels,
			_clearChannels: () => channels.clear()
		}
	};
});
```

---

## Presence Manager Tests

### Test Categories

```typescript
describe('PresenceManager', () => {
	describe('CRITICAL: Heartbeat Interval', () => {
		// Verify the billing-critical constant
	});

	describe('Heartbeat Lifecycle', () => {
		// Start, send, stop, recurring
	});

	describe('Presence Tracking', () => {
		// Subscribe, unsubscribe, handle events
	});

	describe('Friend Presence Management', () => {
		// Multiple friends, unknown friends
	});

	describe('Edge Cases', () => {
		// Browser checks, empty lists, errors
	});

	describe('Integration', () => {
		// Channel name verification
	});

	describe('Reconnection Logic', () => {
		// Exponential backoff, max attempts
	});
});
```

### Critical Constant Test

```typescript
describe('CRITICAL: Heartbeat Interval', () => {
	it('should use 180000ms heartbeat interval for billing compliance', () => {
		// This constant is BILLING CRITICAL
		// Changing it affects Supabase free tier quota usage
		expect(HEARTBEAT_INTERVAL).toBe(180000);
	});

	it('should document why 180s was chosen', () => {
		// 200 users × 8h × 20 days = ~640K messages/month
		// This is 32% of the 2M free tier limit
		const usersPerMonth = 200;
		const hoursPerDay = 8;
		const daysPerMonth = 20;
		const heartbeatsPerHour = 3600000 / HEARTBEAT_INTERVAL; // 20 per hour
		const totalMessages = usersPerMonth * hoursPerDay * daysPerMonth * heartbeatsPerHour;

		expect(totalMessages).toBeLessThan(2_000_000 * 0.5); // Under 50% of limit
	});
});
```

### Heartbeat Test

```typescript
describe('Heartbeat Lifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should send heartbeat immediately on start', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		await presenceManager.startPresenceTracking(['friend1']);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('upsert_user_presence');
	});

	it('should send recurring heartbeats', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		await presenceManager.startPresenceTracking(['friend1']);

		// Initial call
		expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);

		// Advance time by one interval
		vi.advanceTimersByTime(HEARTBEAT_INTERVAL);
		expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);

		// Advance time by another interval
		vi.advanceTimersByTime(HEARTBEAT_INTERVAL);
		expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
	});

	it('should stop heartbeat on stopPresenceTracking', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		await presenceManager.startPresenceTracking(['friend1']);
		await presenceManager.stopPresenceTracking();

		const callsBefore = mockSupabase.rpc.mock.calls.length;

		vi.advanceTimersByTime(HEARTBEAT_INTERVAL * 2);

		// No additional calls after stop
		expect(mockSupabase.rpc).toHaveBeenCalledTimes(callsBefore);
	});
});
```

### Presence Event Handling

```typescript
describe('Friend Presence Management', () => {
	it('should update friend status on INSERT event', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('friend-presence:user123');

		vi.mocked(supabaseRealtimeManager.createChannel).mockReturnValue(mockChannel);

		presenceManager.init(mockSupabase, 'user123');
		await presenceManager.startPresenceTracking(['friend1']);

		// Simulate friend coming online
		mockChannel.simulatePostgresChanges({
			eventType: 'INSERT',
			new: { user_id: 'friend1', last_seen_at: new Date().toISOString() },
			old: null
		});

		expect(presenceManager.getFriendPresence('friend1')).toBe('online');
	});

	it('should update friend status on DELETE event', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('friend-presence:user123');

		vi.mocked(supabaseRealtimeManager.createChannel).mockReturnValue(mockChannel);

		presenceManager.init(mockSupabase, 'user123');
		await presenceManager.startPresenceTracking(['friend1']);

		// Simulate friend going offline (cleanup deleted their row)
		mockChannel.simulatePostgresChanges({
			eventType: 'DELETE',
			new: null,
			old: { user_id: 'friend1' }
		});

		expect(presenceManager.getFriendPresence('friend1')).toBe('offline');
	});

	it('should ignore events for non-tracked users', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('friend-presence:user123');

		vi.mocked(supabaseRealtimeManager.createChannel).mockReturnValue(mockChannel);

		presenceManager.init(mockSupabase, 'user123');
		await presenceManager.startPresenceTracking(['friend1']);

		// Simulate unknown user
		mockChannel.simulatePostgresChanges({
			eventType: 'INSERT',
			new: { user_id: 'unknown-user', last_seen_at: new Date().toISOString() },
			old: null
		});

		expect(presenceManager.getFriendPresence('unknown-user')).toBe('offline');
	});
});
```

### Reconnection Tests

```typescript
describe('Reconnection Logic', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should use exponential backoff', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		// Mock subscription to fail
		vi.mocked(supabaseRealtimeManager.subscribeChannel)
			.mockRejectedValueOnce(new Error('Network error'))
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce(undefined);

		await presenceManager.startPresenceTracking(['friend1']);

		// First reconnect attempt after 5000ms
		vi.advanceTimersByTime(5000);
		await vi.runAllTimersAsync();

		// Second reconnect attempt after 10000ms (5000 * 2)
		vi.advanceTimersByTime(10000);
		await vi.runAllTimersAsync();

		expect(supabaseRealtimeManager.subscribeChannel).toHaveBeenCalledTimes(3);
	});

	it('should stop after max attempts', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		// Mock subscription to always fail
		vi.mocked(supabaseRealtimeManager.subscribeChannel).mockRejectedValue(
			new Error('Network error')
		);

		await presenceManager.startPresenceTracking(['friend1']);

		// Advance through all retry attempts
		for (let i = 0; i < 10; i++) {
			vi.advanceTimersByTime(100000);
			await vi.runAllTimersAsync();
		}

		// Should not exceed MAX_RECONNECT_ATTEMPTS (5) + initial
		expect(supabaseRealtimeManager.subscribeChannel.mock.calls.length).toBeLessThanOrEqual(6);
	});

	it('should prevent concurrent reconnection attempts', async () => {
		const mockSupabase = createMockSupabase();
		presenceManager.init(mockSupabase, 'user123');

		// Mock slow subscription
		vi.mocked(supabaseRealtimeManager.subscribeChannel).mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 10000))
		);

		await presenceManager.startPresenceTracking(['friend1']);

		// Trigger multiple reconnections
		presenceManager['attemptReconnect']();
		presenceManager['attemptReconnect']();
		presenceManager['attemptReconnect']();

		// Should only have one active reconnection
		expect(presenceManager['isReconnecting']).toBe(true);
	});
});
```

---

## Chat Store Tests

### Message Deduplication Test

```typescript
describe('CRITICAL: Message Deduplication', () => {
	it('should not show duplicate messages from broadcast + postgres_changes', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('chat:conv1');
		const conversationId = 'conv1';

		chatStore.init(mockSupabase, 'user1', { full_name: 'Test User', avatar_url: null });

		// Step 1: Send message (creates optimistic)
		const sendPromise = chatStore.sendMessage(conversationId, 'Hello!');

		// Verify optimistic message exists
		let messages = chatStore.getMessages(conversationId);
		expect(messages).toHaveLength(1);
		expect(messages[0].is_optimistic).toBe(true);

		await sendPromise;

		// Step 2: Simulate broadcast arrival (~50ms)
		mockChannel.simulateBroadcast('new_message', {
			id: 'temp-id',
			content: 'Hello!',
			sender_id: 'user1',
			created_at: messages[0].created_at
		});

		messages = chatStore.getMessages(conversationId);
		expect(messages).toHaveLength(1); // Still 1, not duplicated

		// Step 3: Simulate postgres_changes arrival (~300ms)
		mockChannel.simulatePostgresChanges({
			eventType: 'INSERT',
			new: {
				id: 'db-generated-uuid',
				content: 'Hello!',
				sender_id: 'user1',
				created_at: messages[0].created_at,
				conversation_id: conversationId
			}
		});

		messages = chatStore.getMessages(conversationId);
		expect(messages).toHaveLength(1); // STILL 1, properly deduplicated
		expect(messages[0].is_optimistic).toBe(false);
		expect(messages[0].id).toBe('db-generated-uuid');
	});
});
```

### Typing Indicator Tests

```typescript
describe('Typing Indicators', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should track typing users', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('chat:conv1');
		const conversationId = 'conv1';

		chatStore.init(mockSupabase, 'user1');
		await chatStore.subscribeToConversation(conversationId);

		// Simulate typing indicator from another user
		mockChannel.simulateBroadcast('typing_indicator', {
			userId: 'user2',
			userName: 'Alice',
			isTyping: true
		});

		const typingUsers = chatStore.getTypingUsers(conversationId);
		expect(typingUsers.has('user2')).toBe(true);
	});

	it('should auto-clear typing after timeout', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('chat:conv1');
		const conversationId = 'conv1';

		chatStore.init(mockSupabase, 'user1');
		await chatStore.subscribeToConversation(conversationId);

		mockChannel.simulateBroadcast('typing_indicator', {
			userId: 'user2',
			userName: 'Alice',
			isTyping: true
		});

		expect(chatStore.getTypingUsers(conversationId).has('user2')).toBe(true);

		// Advance past timeout (5 seconds)
		vi.advanceTimersByTime(6000);

		expect(chatStore.getTypingUsers(conversationId).has('user2')).toBe(false);
	});

	it('should clear typing timers on unsubscribe (memory leak prevention)', async () => {
		const mockSupabase = createMockSupabase();
		const mockChannel = createMockChannel('chat:conv1');
		const conversationId = 'conv1';

		chatStore.init(mockSupabase, 'user1');
		await chatStore.subscribeToConversation(conversationId);

		// Add typing indicator
		mockChannel.simulateBroadcast('typing_indicator', {
			userId: 'user2',
			isTyping: true
		});

		// Spy on clearTimeout
		const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

		await chatStore.unsubscribeFromConversation(conversationId);

		// Should have cleared the typing timer
		expect(clearTimeoutSpy).toHaveBeenCalled();
	});
});
```

---

## Database Trigger Tests

### Profanity Detection Test

```typescript
// Location: tests/database/triggers/chat-triggers.test.ts

describe('trigger_process_message_content', () => {
	it('should flag messages with profanity', async () => {
		// Insert message with profanity
		const tiptapContent = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Oh merde, je me suis trompe!' }]
				}
			]
		};

		const { data: message, error } = await supabase
			.from('messages')
			.insert({
				conversation_id: testConversationId,
				sender_id: testUserId,
				content: tiptapContent
			})
			.select()
			.single();

		expect(error).toBeNull();
		expect(message!.is_flagged).toBe(true);
		expect(message!.flag_reason).toBe('Profanite detectee automatiquement');
	});

	it('should extract plain_text from TipTap JSON', async () => {
		const tiptapContent = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Hello ' },
						{ type: 'text', text: 'world', marks: [{ type: 'bold' }] }
					]
				}
			]
		};

		const { data: message } = await supabase
			.from('messages')
			.insert({
				conversation_id: testConversationId,
				sender_id: testUserId,
				content: tiptapContent
			})
			.select()
			.single();

		expect(message!.plain_text).toBe('Hello world');
	});
});
```

---

## Running Tests

```bash
# Run all client-side tests (including realtime stores)
pnpm test:client

# Run specific test file
pnpm test:client src/lib/stores/presence.svelte.test.ts
pnpm test:client src/lib/stores/chat.svelte.test.ts

# Run database trigger tests (requires Docker)
pnpm test:triggers
```

---

## Test Coverage Goals

| Area             | Target | Notes                         |
| ---------------- | ------ | ----------------------------- |
| Presence Manager | 90%+   | Critical for billing          |
| Chat Store       | 85%+   | Complex deduplication logic   |
| Notifications    | 80%+   | Simpler store                 |
| Achievements     | 80%+   | Simpler store                 |
| Multiplayer      | 75%+   | Game-specific, harder to test |

---

## Related Documentation

- [Stores Reference](./stores-reference.md) - APIs being tested
- [Chat System](./chat-system.md) - Chat implementation details
- [Best Practices](./best-practices.md) - Quality standards
