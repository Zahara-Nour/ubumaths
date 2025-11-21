/**
 * Achievements Realtime Manager Tests
 * ====================================
 *
 * Tests the real-time achievement unlock notifications via Supabase Realtime.
 *
 * Test Categories:
 * 1. Initialization
 * 2. Start Listening (channel creation and subscription)
 * 3. Stop Listening (cleanup)
 * 4. Handle New Achievement (toast notification and cache invalidation)
 * 5. Edge Cases & Error Handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// MOCKS - Using vi.hoisted() for proper hoisting
// ============================================================================

// Store reference to the callback passed to channel.on() for postgres_changes
let postgresChangesCallback: ((payload: unknown) => void) | null = null;

// Use vi.hoisted to ensure these are available when vi.mock runs
const {
	mockCreateChannel,
	mockSubscribeChannel,
	mockUnsubscribeChannel,
	mockInit,
	mockChannel,
	mockShowUnlockToast,
	mockClearCache,
	mockGetAchievement
} = vi.hoisted(() => {
	// Mock channel instance - needs to be inside hoisted to avoid reference issues
	const _mockChannel = {
		on: vi.fn(function (
			this: RealtimeChannel,
			_type: string,
			_filter: unknown,
			_callback: (payload: unknown) => void
		) {
			// We'll set postgresChangesCallback outside since it's a module-level var
			return this;
		}),
		subscribe: vi.fn()
	} as unknown as RealtimeChannel;

	return {
		mockCreateChannel: vi.fn(() => _mockChannel),
		mockSubscribeChannel: vi.fn(() => Promise.resolve()),
		mockUnsubscribeChannel: vi.fn(() => Promise.resolve()),
		mockInit: vi.fn(),
		mockChannel: _mockChannel,
		mockShowUnlockToast: vi.fn(),
		mockClearCache: vi.fn(),
		mockGetAchievement: vi.fn()
	};
});

// Mock supabaseRealtimeManager
vi.mock('$lib/stores/supabaseRealtime.svelte', () => ({
	supabaseRealtimeManager: {
		createChannel: mockCreateChannel,
		subscribeChannel: mockSubscribeChannel,
		unsubscribeChannel: mockUnsubscribeChannel,
		init: mockInit
	}
}));

// Mock achievementsStore
vi.mock('$lib/stores/achievements.svelte', () => ({
	achievementsStore: {
		showUnlockToast: mockShowUnlockToast,
		clearCache: mockClearCache,
		getAchievement: mockGetAchievement
	}
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// Mock logger
vi.mock('$lib/utils/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}));

// Import after mocks are set up
import { achievementsRealtimeManager } from '../achievementsRealtime.svelte';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockSupabaseClient(): SupabaseClient<Database> {
	return {
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(() =>
						Promise.resolve({
							data: {
								id: 'achievement-123',
								name: 'Test Achievement',
								description: 'A test achievement',
								icon: 'trophy',
								context: 'minesweeper',
								category: 'skill',
								unlock_type: 'automatic',
								is_active: true,
								metadata: { points: 100, gidouilles_reward: 5 }
							},
							error: null
						})
					)
				}))
			}))
		})),
		channel: vi.fn(),
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

function createNewAchievementPayload(overrides = {}) {
	return {
		new: {
			id: 'student-achievement-123',
			student_id: 'user-123',
			achievement_id: 'achievement-123',
			points_awarded: 100,
			gidouilles_awarded: 5,
			unlocked_at: new Date().toISOString(),
			unlocked_by: null,
			unlock_reason: null,
			context_data: {},
			...overrides
		}
	};
}

/**
 * Reset the manager's internal state for clean tests
 */
function resetManager() {
	// Access private properties to reset state
	achievementsRealtimeManager['supabase'] = null;
	achievementsRealtimeManager['userId'] = null;
	achievementsRealtimeManager['_isListening'] = false;
}

/**
 * Setup the mock channel's on() to capture the postgres_changes callback
 */
function setupMockChannel() {
	(mockChannel.on as Mock).mockImplementation(function (
		this: RealtimeChannel,
		_type: string,
		_filter: unknown,
		callback: (payload: unknown) => void
	) {
		postgresChangesCallback = callback;
		return this;
	});
}

// ============================================================================
// 1. INITIALIZATION
// ============================================================================

describe('Initialization', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(async () => {
		await achievementsRealtimeManager.stopListening();
		vi.clearAllMocks();
	});

	it('should store supabase and userId on init', () => {
		achievementsRealtimeManager.init(supabase, userId);

		expect(achievementsRealtimeManager['supabase']).toBe(supabase);
		expect(achievementsRealtimeManager['userId']).toBe(userId);
	});

	it('should initialize the underlying supabaseRealtimeManager', () => {
		achievementsRealtimeManager.init(supabase, userId);

		expect(mockInit).toHaveBeenCalledWith(supabase, userId);
	});

	it('should not be listening after init', () => {
		achievementsRealtimeManager.init(supabase, userId);

		expect(achievementsRealtimeManager.isListening).toBe(false);
	});

	it('should handle re-initialization with different user', () => {
		achievementsRealtimeManager.init(supabase, 'user-1');
		expect(achievementsRealtimeManager['userId']).toBe('user-1');

		achievementsRealtimeManager.init(supabase, 'user-2');
		expect(achievementsRealtimeManager['userId']).toBe('user-2');
	});
});

// ============================================================================
// 2. START LISTENING
// ============================================================================

describe('startListening', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(async () => {
		await achievementsRealtimeManager.stopListening();
		vi.clearAllMocks();
	});

	it('should create a channel with the correct name', async () => {
		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		expect(mockCreateChannel).toHaveBeenCalledWith('achievements-realtime');
	});

	it('should subscribe to postgres_changes on student_achievements table', async () => {
		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		expect(mockChannel.on).toHaveBeenCalledWith(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'student_achievements',
				filter: `student_id=eq.${userId}`
			},
			expect.any(Function)
		);
	});

	it('should filter by student_id (userId)', async () => {
		const testUserId = 'custom-user-456';
		achievementsRealtimeManager.init(supabase, testUserId);
		await achievementsRealtimeManager.startListening();

		const onCall = (mockChannel.on as Mock).mock.calls[0];
		const filter = onCall[1];

		expect(filter.filter).toBe(`student_id=eq.${testUserId}`);
	});

	it('should call subscribeChannel with the correct channel name', async () => {
		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		expect(mockSubscribeChannel).toHaveBeenCalledWith('achievements-realtime');
	});

	it('should set isListening to true after successful subscription', async () => {
		achievementsRealtimeManager.init(supabase, userId);

		expect(achievementsRealtimeManager.isListening).toBe(false);

		await achievementsRealtimeManager.startListening();

		expect(achievementsRealtimeManager.isListening).toBe(true);
	});

	it('should not start listening if not initialized', async () => {
		// Don't call init
		await achievementsRealtimeManager.startListening();

		expect(mockCreateChannel).not.toHaveBeenCalled();
		expect(achievementsRealtimeManager.isListening).toBe(false);
	});

	it('should not start listening if already listening', async () => {
		achievementsRealtimeManager.init(supabase, userId);

		await achievementsRealtimeManager.startListening();
		vi.clearAllMocks();

		// Try to start again
		await achievementsRealtimeManager.startListening();

		expect(mockCreateChannel).not.toHaveBeenCalled();
	});

	it('should handle subscription error and set isListening to false', async () => {
		mockSubscribeChannel.mockRejectedValueOnce(new Error('Subscription failed'));

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		expect(achievementsRealtimeManager.isListening).toBe(false);
	});
});

// ============================================================================
// 3. STOP LISTENING
// ============================================================================

describe('stopListening', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should call unsubscribeChannel with the correct channel name', async () => {
		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		await achievementsRealtimeManager.stopListening();

		expect(mockUnsubscribeChannel).toHaveBeenCalledWith('achievements-realtime');
	});

	it('should set isListening to false after stopping', async () => {
		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		expect(achievementsRealtimeManager.isListening).toBe(true);

		await achievementsRealtimeManager.stopListening();

		expect(achievementsRealtimeManager.isListening).toBe(false);
	});

	it('should not call unsubscribeChannel if not listening', async () => {
		achievementsRealtimeManager.init(supabase, userId);

		// Not listening yet
		await achievementsRealtimeManager.stopListening();

		expect(mockUnsubscribeChannel).not.toHaveBeenCalled();
	});

	it('should handle unsubscribe error gracefully', async () => {
		mockUnsubscribeChannel.mockRejectedValueOnce(new Error('Unsubscribe failed'));

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Should not throw
		await expect(achievementsRealtimeManager.stopListening()).resolves.not.toThrow();
	});
});

// ============================================================================
// 4. HANDLE NEW ACHIEVEMENT
// ============================================================================

describe('handleNewAchievement', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(async () => {
		await achievementsRealtimeManager.stopListening();
		vi.clearAllMocks();
	});

	it('should call showUnlockToast when achievement is in cache', async () => {
		const mockAchievement = {
			id: 'achievement-123',
			name: 'Test Achievement',
			description: 'A test achievement',
			icon: 'trophy',
			context: 'minesweeper',
			category: 'skill',
			unlock_type: 'automatic',
			is_active: true,
			metadata: { points: 100, gidouilles_reward: 5 }
		};

		mockGetAchievement.mockReturnValue(mockAchievement);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Simulate receiving a new achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockGetAchievement).toHaveBeenCalledWith('achievement-123');
		expect(mockShowUnlockToast).toHaveBeenCalledWith(mockAchievement, 100, 5);
	});

	it('should fetch achievement from database if not in cache', async () => {
		mockGetAchievement.mockReturnValue(null);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Simulate receiving a new achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockGetAchievement).toHaveBeenCalledWith('achievement-123');
		expect(supabase.from).toHaveBeenCalledWith('achievements');
	});

	it('should clear cache after showing notification', async () => {
		const mockAchievement = {
			id: 'achievement-123',
			name: 'Test Achievement',
			icon: 'trophy'
		};

		mockGetAchievement.mockReturnValue(mockAchievement);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Simulate receiving a new achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockClearCache).toHaveBeenCalled();
	});

	it('should pass correct points and gidouilles to showUnlockToast', async () => {
		const mockAchievement = { id: 'achievement-123', name: 'Test', icon: 'star' };
		mockGetAchievement.mockReturnValue(mockAchievement);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Custom points and gidouilles
		const payload = createNewAchievementPayload({
			points_awarded: 250,
			gidouilles_awarded: 10
		});
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockShowUnlockToast).toHaveBeenCalledWith(mockAchievement, 250, 10);
	});

	it('should handle missing achievement gracefully', async () => {
		mockGetAchievement.mockReturnValue(null);

		// Mock database returning no data
		const mockSupabaseWithNoData = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						single: vi.fn(() =>
							Promise.resolve({
								data: null,
								error: { message: 'Not found' }
							})
						)
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		achievementsRealtimeManager.init(mockSupabaseWithNoData, userId);
		await achievementsRealtimeManager.startListening();

		// Simulate receiving a new achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Should not call showUnlockToast if achievement not found
		expect(mockShowUnlockToast).not.toHaveBeenCalled();
	});
});

// ============================================================================
// 5. EDGE CASES & ERROR HANDLING
// ============================================================================

describe('Edge Cases & Error Handling', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(async () => {
		await achievementsRealtimeManager.stopListening();
		vi.clearAllMocks();
	});

	it('should expose isListening as a getter', () => {
		expect(typeof achievementsRealtimeManager.isListening).toBe('boolean');
	});

	it('should handle multiple start/stop cycles', async () => {
		achievementsRealtimeManager.init(supabase, userId);

		// First cycle
		await achievementsRealtimeManager.startListening();
		expect(achievementsRealtimeManager.isListening).toBe(true);

		await achievementsRealtimeManager.stopListening();
		expect(achievementsRealtimeManager.isListening).toBe(false);

		vi.clearAllMocks();

		// Second cycle
		await achievementsRealtimeManager.startListening();
		expect(mockCreateChannel).toHaveBeenCalled();
		expect(achievementsRealtimeManager.isListening).toBe(true);

		await achievementsRealtimeManager.stopListening();
		expect(achievementsRealtimeManager.isListening).toBe(false);
	});

	it('should handle database error during achievement fetch', async () => {
		mockGetAchievement.mockReturnValue(null);

		// Mock database throwing error
		const mockSupabaseWithError = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						single: vi.fn(() =>
							Promise.resolve({
								data: null,
								error: { message: 'Database error', code: 'PGRST116' }
							})
						)
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		achievementsRealtimeManager.init(mockSupabaseWithError, userId);
		await achievementsRealtimeManager.startListening();

		// Should not throw when receiving achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Should gracefully handle error - not crash
		expect(mockShowUnlockToast).not.toHaveBeenCalled();
		expect(mockClearCache).not.toHaveBeenCalled();
	});

	it('should handle payload with zero points and gidouilles', async () => {
		const mockAchievement = { id: 'achievement-123', name: 'Participation', icon: 'medal' };
		mockGetAchievement.mockReturnValue(mockAchievement);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Zero rewards
		const payload = createNewAchievementPayload({
			points_awarded: 0,
			gidouilles_awarded: 0
		});
		postgresChangesCallback?.(payload);

		// Wait for async handler
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockShowUnlockToast).toHaveBeenCalledWith(mockAchievement, 0, 0);
	});

	it('should use correct filter format for postgres_changes', async () => {
		const specialUserId = 'user-with-special-chars-123';
		achievementsRealtimeManager.init(supabase, specialUserId);
		await achievementsRealtimeManager.startListening();

		const onCall = (mockChannel.on as Mock).mock.calls[0];
		const config = onCall[1];

		expect(config).toEqual({
			event: 'INSERT',
			schema: 'public',
			table: 'student_achievements',
			filter: `student_id=eq.${specialUserId}`
		});
	});
});

// ============================================================================
// 6. INTEGRATION-LIKE SCENARIOS
// ============================================================================

describe('Integration Scenarios', () => {
	let supabase: SupabaseClient<Database>;
	const userId = 'user-123';

	beforeEach(() => {
		supabase = createMockSupabaseClient();
		resetManager();
		setupMockChannel();
		vi.clearAllMocks();
		postgresChangesCallback = null;
	});

	afterEach(async () => {
		await achievementsRealtimeManager.stopListening();
		vi.clearAllMocks();
	});

	it('should complete full lifecycle: init -> listen -> receive -> stop', async () => {
		const mockAchievement = {
			id: 'achievement-123',
			name: 'First Win',
			icon: 'trophy'
		};
		mockGetAchievement.mockReturnValue(mockAchievement);

		// 1. Initialize
		achievementsRealtimeManager.init(supabase, userId);
		expect(achievementsRealtimeManager['supabase']).toBe(supabase);
		expect(achievementsRealtimeManager['userId']).toBe(userId);

		// 2. Start listening
		await achievementsRealtimeManager.startListening();
		expect(achievementsRealtimeManager.isListening).toBe(true);
		expect(mockCreateChannel).toHaveBeenCalledWith('achievements-realtime');

		// 3. Receive achievement
		const payload = createNewAchievementPayload();
		postgresChangesCallback?.(payload);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockShowUnlockToast).toHaveBeenCalled();
		expect(mockClearCache).toHaveBeenCalled();

		// 4. Stop listening
		await achievementsRealtimeManager.stopListening();
		expect(achievementsRealtimeManager.isListening).toBe(false);
		expect(mockUnsubscribeChannel).toHaveBeenCalledWith('achievements-realtime');
	});

	it('should handle rapid achievement unlocks', async () => {
		const mockAchievement = { id: 'achievement-123', name: 'Test', icon: 'star' };
		mockGetAchievement.mockReturnValue(mockAchievement);

		achievementsRealtimeManager.init(supabase, userId);
		await achievementsRealtimeManager.startListening();

		// Simulate 3 rapid unlocks
		for (let i = 0; i < 3; i++) {
			const payload = createNewAchievementPayload({
				achievement_id: `achievement-${i}`,
				points_awarded: 100 * (i + 1)
			});
			postgresChangesCallback?.(payload);
		}

		// Wait for all async handlers
		await new Promise((resolve) => setTimeout(resolve, 50));

		// All 3 should be processed
		expect(mockShowUnlockToast).toHaveBeenCalledTimes(3);
		expect(mockClearCache).toHaveBeenCalledTimes(3);
	});
});
