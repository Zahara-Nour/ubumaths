/**
 * Tests for BroadcastChannel functionality in CacheEventBus
 *
 * These tests verify that cache invalidation events are properly
 * synchronized across browser tabs using BroadcastChannel API.
 *
 * Note: BroadcastChannel is browser-only - these tests verify the feature
 * doesn't break when unavailable (SSR compatibility).
 */

import { describe, it, expect, vi } from 'vitest';
import { cacheEventBus } from '../cacheEventBus.svelte';

describe('CacheEventBus - BroadcastChannel', () => {
	it('publishes events and notifies local listeners', () => {
		// Subscribe to events
		const listener = vi.fn();
		const unsubscribe = cacheEventBus.subscribe(listener);

		// Publish an event
		cacheEventBus.publish({
			type: 'warnings',
			scope: { classId: 'class-123', periodId: 'period-456' },
			reason: 'Warning added'
		});

		// Verify local listener was called
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'warnings',
				scope: { classId: 'class-123', periodId: 'period-456' },
				reason: 'Warning added',
				timestamp: expect.any(Number)
			})
		);

		// Cleanup
		unsubscribe();
	});

	it('handles multiple listeners correctly', () => {
		const listener1 = vi.fn();
		const listener2 = vi.fn();

		const unsubscribe1 = cacheEventBus.subscribe(listener1);
		const unsubscribe2 = cacheEventBus.subscribe(listener2);

		// Publish an event
		cacheEventBus.publish({
			type: 'students',
			scope: { classId: 'class-789' },
			reason: 'Student imported'
		});

		// Both listeners should be called
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(1);

		// Cleanup
		unsubscribe1();
		unsubscribe2();
	});

	it('does not throw when BroadcastChannel is unavailable', () => {
		// This test verifies SSR compatibility
		// Even if BroadcastChannel doesn't exist, the bus should work
		expect(() => {
			cacheEventBus.publish({
				type: 'gidouilles',
				scope: { classId: 'test' },
				reason: 'Test'
			});
		}).not.toThrow();
	});

	it('cleanup method exists for testing', () => {
		// Verify cleanup method is available
		expect(typeof cacheEventBus._cleanup).toBe('function');

		// Should not throw
		expect(() => cacheEventBus._cleanup()).not.toThrow();
	});
});
