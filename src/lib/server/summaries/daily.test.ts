/**
 * Daily Summary Tests
 *
 * Test suite for daily summary aggregation and helper functions
 */

import { describe, it, expect } from 'vitest';
import { hasAnyChanges } from './daily';
import type { DailyChanges } from './types';

describe('hasAnyChanges', () => {
	it('should return false when all changes are zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(false);
	});

	it('should return true when gidouilles_gained is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 5,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when gidouilles_lost is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 3,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when bonus_gained is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 2,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when bonus_used is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 1,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when warnings_issued is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 1,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when warnings_removed is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 1,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when vip_cards_gained is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 1,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when vip_cards_used is non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 1
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should return true when multiple changes are non-zero', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 15,
			gidouilles_lost: 3,
			bonus_gained: 5,
			bonus_used: 2,
			warnings_issued: 1,
			warnings_removed: 0,
			vip_cards_gained: 2,
			vip_cards_used: 1
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});

	it('should handle negative values correctly (return false as invalid data)', () => {
		// This shouldn't happen in practice, but test the behavior
		// Negative values in "gained" fields are invalid and should not be counted
		const changes: DailyChanges = {
			gidouilles_gained: -5,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		// Function checks > 0, so negative values return false (correct behavior)
		expect(hasAnyChanges(changes)).toBe(false);
	});

	it('should handle decimal values correctly (treat as non-zero)', () => {
		// This shouldn't happen with integers, but test the behavior
		const changes: DailyChanges = {
			gidouilles_gained: 0.5,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		expect(hasAnyChanges(changes)).toBe(true);
	});
});
