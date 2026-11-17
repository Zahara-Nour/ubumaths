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
 * 3. Relecture du statut des amis (toutes les 60 s, signal de vie < 270 s)
 * 4. Friend Presence Management
 * 5. Edge Cases & Error Handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	presenceManager,
	HEARTBEAT_INTERVAL,
	PRESENCE_POLL_INTERVAL,
	STALE_AFTER_MS
} from '../presence.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock Supabase client
function createMockSupabaseClient(): SupabaseClient<Database> {
	return {
		channel: vi.fn(),
		rpc: vi.fn(),
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() => Promise.resolve({ data: [], error: null }))
			}))
		})),
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

// Mock browser environment using vi.stubEnv
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// ============================================================================
// 1. HEARTBEAT INTERVAL (CRITICAL - BILLING)
// ============================================================================

describe('CRITICAL: Heartbeat Interval (Billing)', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		vi.useFakeTimers();
		presenceManager.init(supabase, userId);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('CRITICAL: heartbeat interval MUST be exactly 180000ms (180 seconds)', () => {
		// This is THE most critical test - wrong interval = over quota
		// Test the constant directly to ensure it's set correctly
		expect(HEARTBEAT_INTERVAL).toBe(180000); // 180 seconds = 3 minutes
	});

	it('CRITICAL: verify heartbeat interval is NOT 30 seconds (old value)', () => {
		// Guard against regression to old 30-second interval
		expect(HEARTBEAT_INTERVAL).not.toBe(30000);
		expect(HEARTBEAT_INTERVAL).toBe(180000);
	});

	it('CRITICAL: verify heartbeat interval is NOT 60 seconds', () => {
		// Guard against other common interval values
		expect(HEARTBEAT_INTERVAL).not.toBe(60000);
		expect(HEARTBEAT_INTERVAL).toBe(180000);
	});

	it('CRITICAL: heartbeat interval should be compatible with 270s stale cleanup', () => {
		// cleanup_stale_presence function uses 270 seconds (4.5 minutes)
		// Heartbeat at 180s gives 90s buffer before cleanup
		const CLEANUP_TIMEOUT = 270000; // 270 seconds
		const buffer = CLEANUP_TIMEOUT - HEARTBEAT_INTERVAL;

		// Buffer should be 90 seconds (90000ms)
		expect(buffer).toBe(90000);
		expect(buffer).toBeGreaterThan(0); // Must have positive buffer
	});

	it('should send initial heartbeat immediately on start', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		// Start tracking (this returns after setting up subscriptions)
		const promise = presenceManager.startPresenceTracking(['friend-1']);

		// Wait for the initial async operations to complete
		await promise;

		// Now wait for the async heartbeat call to complete
		// The heartbeat is fire-and-forget (void), so we need to wait for promises to settle
		await vi.waitFor(
			() => {
				expect(rpcMock).toHaveBeenCalled();
			},
			{ timeout: 1000 }
		);

		// Should call RPC immediately (before interval fires)
		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
		expect(rpcMock).toHaveBeenCalledTimes(1);
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
		vi.useFakeTimers();
		presenceManager.init(supabase, userId);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('should send heartbeat via upsert_user_presence RPC', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		// Wait for async heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});

		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
	});

	it('should send recurring heartbeats at interval', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		// Wait for initial heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalledTimes(1);
		});

		// Clear and advance time by heartbeat interval
		rpcMock.mockClear();
		await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL);

		// Should have fired another heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalledTimes(1);
		});

		// Advance again
		await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL);

		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalledTimes(2);
		});
	});

	it('should clear heartbeat interval on stop', async () => {
		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		// Interval should be active
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		await presenceManager.stopPresenceTracking();

		// Interval should be cleared
		expect(vi.getTimerCount()).toBe(0);
	});

	it('should mark self as offline on stop', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		// Wait for initial heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});

		rpcMock.mockClear();

		await presenceManager.stopPresenceTracking();

		// Wait for offline heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});

		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'offline'
		});
	});

	it('should clear existing interval before starting new one', async () => {
		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		const timersAfterFirst = vi.getTimerCount();
		expect(timersAfterFirst).toBeGreaterThan(0);

		await presenceManager.startPresenceTracking(['friend-2']);

		const timersAfterSecond = vi.getTimerCount();

		// Should still have same number of timers (old one cleared, new one created)
		expect(timersAfterSecond).toBe(timersAfterFirst);
	});

	it('should start heartbeat even with empty friend list', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ error: null });
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		await presenceManager.startPresenceTracking([]);

		// Wait for heartbeat
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});

		// Should still send heartbeat to maintain own presence
		expect(rpcMock).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
		expect(vi.getTimerCount()).toBeGreaterThan(0);
	});

	it('should handle heartbeat RPC errors gracefully', async () => {
		const rpcMock = vi.fn().mockResolvedValue({
			error: { message: 'RPC failed' }
		});
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		// Should not throw
		await expect(presenceManager.startPresenceTracking(['friend-1'])).resolves.not.toThrow();

		// Wait for heartbeat attempt
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});
	});

	it('should handle heartbeat network errors gracefully', async () => {
		const rpcMock = vi.fn().mockRejectedValue(new Error('Network error'));
		supabase.rpc = rpcMock;

		// Mock realtime manager methods

		await presenceManager.startPresenceTracking(['friend-1']);

		// Wait for heartbeat attempt
		await vi.waitFor(() => {
			expect(rpcMock).toHaveBeenCalled();
		});

		// Should not throw, just log error
		expect(rpcMock).toHaveBeenCalled();
	});
});

// ============================================================================
// 3. Relecture du statut des amis (écart T1, 2026-11-03)
// ============================================================================

function presenceFrom(rows: () => { data: unknown; error: unknown }) {
	return vi.fn(() => ({
		select: vi.fn(() => ({
			in: vi.fn(() => Promise.resolve(rows()))
		}))
	}));
}

describe('Relecture du statut des amis', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';
	const NOW = new Date('2026-11-03T12:00:00Z').getTime();
	const secondsAgo = (s: number) => new Date(NOW - s * 1000).toISOString();

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		supabase = createMockSupabaseClient();
		presenceManager.init(supabase, userId);
	});

	afterEach(async () => {
		await presenceManager.stopPresenceTracking();
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("n'ouvre aucun canal temps réel", async () => {
		await presenceManager.startPresenceTracking(['friend-1']);
		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('lit le statut à l’ouverture, puis toutes les 60 s', async () => {
		const fromMock = presenceFrom(() => ({ data: [], error: null }));
		supabase.from = fromMock as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		expect(fromMock).toHaveBeenCalledTimes(1);
		expect(fromMock).toHaveBeenCalledWith('user_presence');
		expect(PRESENCE_POLL_INTERVAL).toBe(60000);

		await vi.advanceTimersByTimeAsync(59_000);
		expect(fromMock).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(fromMock).toHaveBeenCalledTimes(2);
	});

	it('suit un ami qui se connecte puis se déconnecte entre deux relectures', async () => {
		let rows = [{ user_id: 'friend-1', status: 'offline', last_heartbeat: secondsAgo(500) }];
		supabase.from = presenceFrom(() => ({
			data: rows,
			error: null
		})) as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');

		rows = [{ user_id: 'friend-1', status: 'online', last_heartbeat: secondsAgo(0) }];
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');

		rows = [{ user_id: 'friend-1', status: 'offline', last_heartbeat: secondsAgo(0) }];
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('un ami « online » sans signal de vie depuis 270 s est hors ligne', async () => {
		supabase.from = presenceFrom(() => ({
			data: [
				{ user_id: 'friend-1', status: 'online', last_heartbeat: secondsAgo(269) },
				{ user_id: 'friend-2', status: 'online', last_heartbeat: secondsAgo(270) },
				{ user_id: 'friend-3', status: 'online', last_heartbeat: secondsAgo(86_400) }
			],
			error: null
		})) as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1', 'friend-2', 'friend-3']);

		expect(STALE_AFTER_MS).toBe(270000);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');
		expect(presenceManager.getFriendPresence('friend-2')).toBe('offline');
		expect(presenceManager.getFriendPresence('friend-3')).toBe('offline');
	});

	it('un ami sans ligne de présence est hors ligne', async () => {
		supabase.from = presenceFrom(() => ({
			data: [],
			error: null
		})) as unknown as typeof supabase.from;
		await presenceManager.startPresenceTracking(['friend-1']);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('une relecture en échec garde le dernier statut connu', async () => {
		let fail = false;
		supabase.from = presenceFrom(() =>
			fail
				? { data: null, error: { message: 'réseau' } }
				: {
						data: [{ user_id: 'friend-1', status: 'online', last_heartbeat: secondsAgo(0) }],
						error: null
					}
		) as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');

		fail = true;
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL);
		expect(presenceManager.getFriendPresence('friend-1')).toBe('online');
	});

	it('arrête la relecture à l’arrêt du suivi', async () => {
		const fromMock = presenceFrom(() => ({ data: [], error: null }));
		supabase.from = fromMock as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		await presenceManager.stopPresenceTracking();
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL * 3);
		expect(fromMock).toHaveBeenCalledTimes(1);
	});

	it('une relecture qui revient après l’arrêt ne réaffiche rien', async () => {
		let resolve!: (v: { data: unknown; error: null }) => void;
		let calls = 0;
		supabase.from = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() => {
					calls++;
					if (calls === 1) {
						return Promise.resolve({ data: [], error: null });
					}
					return new Promise((r) => (resolve = r));
				})
			}))
		})) as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking(['friend-1']);
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL); // relecture en vol
		await presenceManager.stopPresenceTracking();
		resolve({
			data: [{ user_id: 'friend-1', status: 'online', last_heartbeat: secondsAgo(0) }],
			error: null
		});
		await vi.advanceTimersByTimeAsync(0);

		expect(presenceManager.getFriendPresence('friend-1')).toBe('offline');
	});

	it('un arrêt pendant le démarrage ne laisse ni relecture ni signal de vie', async () => {
		let resolve!: (v: { data: unknown; error: null }) => void;
		supabase.from = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() => new Promise((r) => (resolve = r)))
			}))
		})) as unknown as typeof supabase.from;

		const starting = presenceManager.startPresenceTracking(['friend-1']);
		await presenceManager.stopPresenceTracking();
		resolve({ data: [], error: null });
		await starting;

		expect(vi.getTimerCount()).toBe(0);
		expect(supabase.rpc).not.toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
	});

	it('deux démarrages simultanés ne laissent qu’une relecture et un signal de vie', async () => {
		const resolvers: ((v: { data: unknown; error: null }) => void)[] = [];
		supabase.from = vi.fn(() => ({
			select: vi.fn(() => ({
				in: vi.fn(() => new Promise((r) => resolvers.push(r)))
			}))
		})) as unknown as typeof supabase.from;

		const first = presenceManager.startPresenceTracking(['friend-1']);
		const second = presenceManager.startPresenceTracking(['friend-1', 'friend-2']);
		resolvers.forEach((r) => r({ data: [], error: null }));
		await Promise.all([first, second]);

		// Un minuteur de relecture + un minuteur de signal de vie.
		expect(vi.getTimerCount()).toBe(2);
	});

	it('ne relit rien sans ami, mais envoie le signal de vie', async () => {
		const fromMock = presenceFrom(() => ({ data: [], error: null }));
		supabase.from = fromMock as unknown as typeof supabase.from;

		await presenceManager.startPresenceTracking([]);
		await vi.advanceTimersByTimeAsync(PRESENCE_POLL_INTERVAL * 2);
		expect(fromMock).not.toHaveBeenCalled();
		expect(supabase.rpc).toHaveBeenCalledWith('upsert_user_presence', {
			p_user_id: userId,
			p_status: 'online'
		});
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
						data: [
							{ user_id: 'friend-1', status: 'online', last_heartbeat: new Date().toISOString() }
						],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as unknown as typeof supabase.from;

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
							{ user_id: 'friend-1', status: 'online', last_heartbeat: new Date().toISOString() },
							{ user_id: 'friend-2', status: 'offline', last_heartbeat: new Date().toISOString() },
							{ user_id: 'friend-3', status: 'online', last_heartbeat: new Date().toISOString() }
						],
						error: null
					})
				)
			}))
		}));
		supabase.from = fromMock as unknown as typeof supabase.from;

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

	it('should not start tracking if not initialized', async () => {
		await presenceManager.startPresenceTracking(['friend-1']);

		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('should handle RPC error when marking offline on stop', async () => {
		presenceManager.init(supabase, userId);

		const rpcMock = vi.fn().mockRejectedValue(new Error('RPC failed'));
		supabase.rpc = rpcMock;

		await presenceManager.startPresenceTracking(['friend-1']);
		rpcMock.mockClear();

		// Should not throw
		await expect(presenceManager.stopPresenceTracking()).resolves.not.toThrow();
		expect(rpcMock).toHaveBeenCalled();
	});

	it('should handle empty friend array gracefully', async () => {
		presenceManager.init(supabase, userId);

		// Should not throw, should still start heartbeat
		await expect(presenceManager.startPresenceTracking([])).resolves.not.toThrow();
	});
});
