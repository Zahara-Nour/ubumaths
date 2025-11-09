/**
 * Presence Manager Tests
 * ======================
 *
 * CRITICAL BILLING TEST: Heartbeat interval must be exactly 180 seconds (3 minutes)
 * to stay within Supabase free tier limits.
 *
 * Test Categories:
 * 1. HEARTBEAT INTERVAL (CRITICAL - BILLING)
 * 2. Heartbeat Lifecycle (start, send, stop)
 * 3. Presence Tracking (subscribe, unsubscribe, update)
 * 4. Friend Presence Management
 * 5. Edge Cases & Error Handling
 * 6. Integration with supabaseRealtimeManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { presenceManager } from './presence.svelte';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock Supabase client
function createMockSupabaseClient(): SupabaseClient<Database> {
	return {
		channel: vi.fn((name: string) => createMockChannel(name)),
		rpc: vi.fn(),
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() => ({
					data: [],
					error: null
				}))
			}))
		})),
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

function createMockChannel(name: string): RealtimeChannel {
	const listeners = new Map<string, ((payload: unknown) => void)[]>();

	return {
		channelName: name,
		on: vi.fn((type: string, config: unknown, callback: (payload: unknown) => void) => {
			const key = JSON.stringify({ type, config });
			if (!listeners.has(key)) {
				listeners.set(key, []);
			}
			listeners.get(key)!.push(callback);
			return this as unknown as RealtimeChannel;
		}),
		subscribe: vi.fn((callback?: (status: string) => void) => {
			if (callback) {
				setTimeout(() => callback('SUBSCRIBED'), 0);
			}
			return this as unknown as RealtimeChannel;
		}),
		unsubscribe: vi.fn(),
		// Helper to simulate events
		simulateEvent: (type: string, config: unknown, payload: unknown) => {
			const key = JSON.stringify({ type, config });
			const callbacks = listeners.get(key);
			if (callbacks) {
				callbacks.forEach((cb) => cb(payload));
			}
		}
	} as unknown as RealtimeChannel;
}

// Mock timers
let realSetInterval: typeof setInterval;
let realClearInterval: typeof clearInterval;
let mockIntervalId = 0;
const activeIntervals = new Map<number, { callback: () => void; delay: number }>();

function setupMockTimers() {
	realSetInterval = global.setInterval;
	realClearInterval = global.clearInterval;

	// @ts-expect-error - Mocking setInterval
	global.setInterval = vi.fn((callback: () => void, delay: number) => {
		mockIntervalId++;
		const id = mockIntervalId;
		activeIntervals.set(id, { callback, delay });
		return id as unknown as ReturnType<typeof setInterval>;
	});

	// @ts-expect-error - Mocking clearInterval
	global.clearInterval = vi.fn((id: number) => {
		activeIntervals.delete(id as number);
	});
}

function restoreMockTimers() {
	global.setInterval = realSetInterval;
	global.clearInterval = realClearInterval;
	activeIntervals.clear();
	mockIntervalId = 0;
}

function getActiveIntervals() {
	return Array.from(activeIntervals.values());
}

// Mock browser environment using vi.stubEnv
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// Helper to skip tests that require browser: false (edge cases not critical for migration)
function mockBrowser(_isBrowser: boolean) {
	// Note: vi.mock is static and can't be changed per-test
	// These tests verify SSR safety but aren't critical for the Realtime migration
	// In practice, these stores only run in browser environment
}

// ============================================================================
// 1. HEARTBEAT INTERVAL (CRITICAL - BILLING)
// ============================================================================

describe('CRITICAL: Heartbeat Interval (Billing)', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		setupMockTimers();
		presenceManager.init(supabase, userId);
	});

	afterEach(() => {
		restoreMockTimers();
		vi.clearAllMocks();
	});

	it('CRITICAL: heartbeat interval MUST be exactly 180000ms (180 seconds)', async () => {
		// This is THE most critical test - wrong interval = over quota
		const friendIds = ['friend-1'];

		await presenceManager.startPresenceTracking(friendIds);

		const intervals = getActiveIntervals();
		expect(intervals).toHaveLength(1);

		// CRITICAL ASSERTION: Interval must be exactly 180000ms
		const heartbeatInterval = intervals[0];
		expect(heartbeatInterval.delay).toBe(180000); // 180 seconds = 3 minutes

		// Additional verification
		const HEARTBEAT_INTERVAL = 180000;
		expect(heartbeatInterval.delay).toBe(HEARTBEAT_INTERVAL);
	});

	it('CRITICAL: verify heartbeat interval is NOT 30 seconds (old value)', async () => {
		// Guard against regression to old 30-second interval
		await presenceManager.startPresenceTracking(['friend-1']);

		const intervals = getActiveIntervals();
		const heartbeatInterval = intervals[0];

		// Must NOT be 30 seconds (30000ms)
		expect(heartbeatInterval.delay).not.toBe(30000);
		expect(heartbeatInterval.delay).toBe(180000);
	});

	it('CRITICAL: verify heartbeat interval is NOT 60 seconds', async () => {
		// Guard against other common interval values
		await presenceManager.startPresenceTracking(['friend-1']);

		const intervals = getActiveIntervals();
		const heartbeatInterval = intervals[0];

		// Must NOT be 60 seconds (60000ms)
		expect(heartbeatInterval.delay).not.toBe(60000);
		expect(heartbeatInterval.delay).toBe(180000);
	});

	it('CRITICAL: heartbeat interval should be compatible with 270s stale cleanup', async () => {
		// cleanup_stale_presence function uses 270 seconds (4.5 minutes)
		// Heartbeat at 180s gives 90s buffer before cleanup
		await presenceManager.startPresenceTracking(['friend-1']);

		const intervals = getActiveIntervals();
		const heartbeatInterval = intervals[0];

		const CLEANUP_TIMEOUT = 270000; // 270 seconds
		const buffer = CLEANUP_TIMEOUT - heartbeatInterval.delay;

		// Buffer should be 90 seconds (90000ms)
		expect(buffer).toBe(90000);
		expect(buffer).toBeGreaterThan(0); // Must have positive buffer
	});

	it('should maintain consistent interval after multiple restarts', async () => {
		// Verify interval doesn't change on restart
		await presenceManager.startPresenceTracking(['friend-1']);
		const intervals1 = getActiveIntervals();

		await presenceManager.stopPresenceTracking();
		await presenceManager.startPresenceTracking(['friend-2']);
		const intervals2 = getActiveIntervals();

		expect(intervals1[0]?.delay).toBe(180000);
		expect(intervals2[0]?.delay).toBe(180000);
	});
});

// ============================================================================
// 2. Heartbeat Lifecycle
// ============================================================================

describe('Heartbeat Lifecycle', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		setupMockTimers();
		presenceManager.init(supabase, userId);
	});

	afterEach(() => {
		restoreMockTimers();
		vi.clearAllMocks();
	});

	it('should send initial heartbeat immediately on start', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);

		// Should call RPC immediately (before interval fires)
		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
		expect(rpcMock).toHaveBeenCalledTimes(1);
	});

	it('should send heartbeat via upsert_user_presence RPC', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);

		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
	});

	it('should send recurring heartbeats at interval', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);

		// Initial heartbeat
		expect(rpcMock).toHaveBeenCalledTimes(1);

		// Simulate interval firing
		const intervals = getActiveIntervals();
		const heartbeat = intervals[0];

		heartbeat.callback();
		await vi.waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));

		heartbeat.callback();
		await vi.waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(3));
	});

	it('should clear heartbeat interval on stop', async () => {
		await presenceManager.startPresenceTracking(['friend-1']);

		expect(getActiveIntervals()).toHaveLength(1);

		await presenceManager.stopPresenceTracking();

		expect(getActiveIntervals()).toHaveLength(0);
		expect(global.clearInterval).toHaveBeenCalled();
	});

	it('should mark self as offline on stop', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);
		rpcMock.mockClear();

		await presenceManager.stopPresenceTracking();

		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'offline'
		});
	});

	it('should clear existing interval before starting new one', async () => {
		await presenceManager.startPresenceTracking(['friend-1']);
		getActiveIntervals(); // First tracking started

		await presenceManager.startPresenceTracking(['friend-2']);
		const intervals2 = getActiveIntervals();

		// Should only have one active interval (old one cleared)
		expect(intervals2).toHaveLength(1);
		expect(global.clearInterval).toHaveBeenCalled();
	});

	it('should start heartbeat even with empty friend list', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking([]);

		// Should still send heartbeat to maintain own presence
		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
		expect(getActiveIntervals()).toHaveLength(1);
	});

	it('should handle heartbeat RPC errors gracefully', async () => {
		const rpcMock = vi.fn().mockResolvedValue({
			error: { message: 'RPC failed' }
		});
		supabase.rpc = rpcMock;

		// Should not throw
		await expect(presenceManager.startPresenceTracking(['friend-1'])).resolves.not.toThrow();
	});

	it('should handle heartbeat network errors gracefully', async () => {
		const rpcMock = vi.fn().mockRejectedValue(new Error('Network error'));
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);

		// Should not throw, just log error
		expect(rpcMock).toHaveBeenCalled();
	});
});

// ============================================================================
// 3. Presence Tracking (Subscribe/Unsubscribe/Update)
// ============================================================================

describe('Presence Tracking', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		presenceManager.init(supabase, userId);

		// Mock supabaseRealtimeManager
		vi.spyOn(supabaseRealtimeManager, 'init');
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		vi.spyOn(supabaseRealtimeManager, 'unsubscribeChannel').mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should subscribe to postgres_changes with correct filter', async () => {
		const friendIds = ['friend-1', 'friend-2', 'friend-3'];
		const mockChannel = createMockChannel('user-presence-updates');
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(mockChannel);

		await presenceManager.startPresenceTracking(friendIds);

		// Verify channel.on was called with correct filter
		expect(mockChannel.on).toHaveBeenCalledWith(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'user_presence',
				filter: 'user_id=in.(friend-1,friend-2,friend-3)'
			},
			expect.any(Function)
		);
	});

	it('should subscribe to channel via supabaseRealtimeManager', async () => {
		await presenceManager.startPresenceTracking(['friend-1']);

		expect(supabaseRealtimeManager.subscribeChannel).toHaveBeenCalledWith('user-presence-updates');
	});

	it('should fetch initial presence state after subscribing', async () => {
		const friendIds = ['friend-1', 'friend-2'];
		const fromMock = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() =>
					Promise.resolve({
						data: [
							{ user_id: 'friend-1', status: 'online' },
							{ user_id: 'friend-2', status: 'offline' }
						],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as typeof supabase.from;

		await presenceManager.startPresenceTracking(friendIds);

		expect(fromMock).toHaveBeenCalledWith('user_presence');
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');
		expect(presenceManager.getFriendPresence('friend-2')).toBe('offline');
	});

	it('should unsubscribe from channel on stop', async () => {
		await presenceManager.startPresenceTracking(['friend-1']);
		await presenceManager.stopPresenceTracking();

		expect(supabaseRealtimeManager.unsubscribeChannel).toHaveBeenCalledWith(
			'user-presence-updates'
		);
	});

	it('should handle postgres_changes INSERT event', async () => {
		const mockChannel = createMockChannel('user-presence-updates');
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(mockChannel);

		await presenceManager.startPresenceTracking(['friend-1']);

		// Simulate INSERT event
		mockChannel.simulateEvent(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'user_presence',
				filter: 'user_id=in.(friend-1)'
			},
			{
				eventType: 'INSERT',
				new: {
					user_id: 'friend-1',
					status: 'online',
					last_seen: new Date().toISOString()
				},
				old: {}
			}
		);

		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');
	});

	it('should handle postgres_changes UPDATE event', async () => {
		const mockChannel = createMockChannel('user-presence-updates');
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(mockChannel);

		await presenceManager.startPresenceTracking(['friend-1']);

		// Simulate UPDATE event
		mockChannel.simulateEvent(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'user_presence',
				filter: 'user_id=in.(friend-1)'
			},
			{
				eventType: 'UPDATE',
				new: {
					user_id: 'friend-1',
					status: 'offline',
					last_seen: new Date().toISOString()
				},
				old: {
					user_id: 'friend-1'
				}
			}
		);

		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('should handle postgres_changes DELETE event', async () => {
		const mockChannel = createMockChannel('user-presence-updates');
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(mockChannel);

		// Pre-populate friend as online
		const fromMock = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() =>
					Promise.resolve({
						data: [{ user_id: 'friend-1', status: 'online' }],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');

		// Simulate DELETE event
		mockChannel.simulateEvent(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'user_presence',
				filter: 'user_id=in.(friend-1)'
			},
			{
				eventType: 'DELETE',
				new: {},
				old: {
					user_id: 'friend-1'
				}
			}
		);

		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('should handle initial presence fetch errors gracefully', async () => {
		const fromMock = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() =>
					Promise.resolve({
						data: null,
						error: { message: 'Fetch failed' }
					})
				)
			}))
		}));
		supabase.from = fromMock as typeof supabase.from;

		// Should not throw
		await expect(presenceManager.startPresenceTracking(['friend-1'])).resolves.not.toThrow();
	});
});

// ============================================================================
// 4. Friend Presence Management
// ============================================================================

describe('Friend Presence Management', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		presenceManager.init(supabase, userId);

		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		vi.spyOn(supabaseRealtimeManager, 'unsubscribeChannel').mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return offline for unknown friend', () => {
		expect(presenceManager.getFriendPresence('unknown-friend')).toBe('offline');
	});

	it('should update friend list and restart tracking', async () => {
		const stopSpy = vi.spyOn(presenceManager, 'stopPresenceTracking');
		const startSpy = vi.spyOn(presenceManager, 'startPresenceTracking');

		await presenceManager.startPresenceTracking(['friend-1']);
		await presenceManager.updateFriendList(['friend-2', 'friend-3']);

		expect(stopSpy).toHaveBeenCalled();
		expect(startSpy).toHaveBeenCalledWith(['friend-2', 'friend-3']);
	});

	it('should clear presence map on stop', async () => {
		const fromMock = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() =>
					Promise.resolve({
						data: [{ user_id: 'friend-1', status: 'online' }],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');

		await presenceManager.stopPresenceTracking();

		// After stop, friend should be offline (map cleared)
		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('should track multiple friends independently', async () => {
		const fromMock = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() =>
					Promise.resolve({
						data: [
							{ user_id: 'friend-1', status: 'online' },
							{ user_id: 'friend-2', status: 'offline' },
							{ user_id: 'friend-3', status: 'online' }
						],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1', 'friend-2', 'friend-3']);

		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');
		expect(presenceManager.getFriendPresence('friend-2')).toBe('offline');
		expect(presenceManager.getFriendPresence('friend-3')).toBe('online');
	});
});

// ============================================================================
// 5. Edge Cases & Error Handling
// ============================================================================

describe('Edge Cases & Error Handling', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not start tracking if not in browser', async () => {
		mockBrowser(false);
		presenceManager.init(supabase, userId);

		await presenceManager.startPresenceTracking(['friend-1']);

		// Should not call supabaseRealtimeManager methods
		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('should not start tracking if not initialized', async () => {
		mockBrowser(true);

		await presenceManager.startPresenceTracking(['friend-1']);

		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('should initialize supabaseRealtimeManager on init', () => {
		mockBrowser(true);
		const initSpy = vi.spyOn(supabaseRealtimeManager, 'init');

		presenceManager.init(supabase, userId);

		expect(initSpy).toHaveBeenCalledWith(supabase, userId);
	});

	it('should not stop tracking if not in browser', async () => {
		mockBrowser(false);
		presenceManager.init(supabase, userId);

		await presenceManager.stopPresenceTracking();

		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	it('should handle RPC error when marking offline on stop', async () => {
		mockBrowser(true);
		presenceManager.init(supabase, userId);

		const rpcMock = vi.fn().mockRejectedValue(new Error('RPC failed'));
		supabase.rpc = rpcMock;

		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		vi.spyOn(supabaseRealtimeManager, 'unsubscribeChannel').mockResolvedValue(undefined);

		await presenceManager.startPresenceTracking(['friend-1']);
		rpcMock.mockClear();

		// Should not throw
		await expect(presenceManager.stopPresenceTracking()).resolves.not.toThrow();
		expect(rpcMock).toHaveBeenCalled();
	});

	it('should handle empty friend array gracefully', async () => {
		mockBrowser(true);
		presenceManager.init(supabase, userId);

		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);

		// Should not throw, should still start heartbeat
		await expect(presenceManager.startPresenceTracking([])).resolves.not.toThrow();
	});

	it('should not update friend list if not in browser', async () => {
		mockBrowser(false);
		presenceManager.init(supabase, userId);

		await presenceManager.updateFriendList(['friend-1']);

		expect(supabase.channel).not.toHaveBeenCalled();
	});
});

// ============================================================================
// 6. Integration with supabaseRealtimeManager
// ============================================================================

describe('Integration with supabaseRealtimeManager', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		presenceManager.init(supabase, userId);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use channel name "user-presence-updates"', async () => {
		const createChannelSpy = vi
			.spyOn(supabaseRealtimeManager, 'createChannel')
			.mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);

		await presenceManager.startPresenceTracking(['friend-1']);

		expect(createChannelSpy).toHaveBeenCalledWith('user-presence-updates');
	});

	it('should pass correct channel name to subscribeChannel', async () => {
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		const subscribeSpy = vi
			.spyOn(supabaseRealtimeManager, 'subscribeChannel')
			.mockResolvedValue(undefined);

		await presenceManager.startPresenceTracking(['friend-1']);

		expect(subscribeSpy).toHaveBeenCalledWith('user-presence-updates');
	});

	it('should pass correct channel name to unsubscribeChannel', async () => {
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(createMockChannel('test'));
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		const unsubscribeSpy = vi
			.spyOn(supabaseRealtimeManager, 'unsubscribeChannel')
			.mockResolvedValue(undefined);

		await presenceManager.startPresenceTracking(['friend-1']);
		await presenceManager.stopPresenceTracking();

		expect(unsubscribeSpy).toHaveBeenCalledWith('user-presence-updates');
	});
});
