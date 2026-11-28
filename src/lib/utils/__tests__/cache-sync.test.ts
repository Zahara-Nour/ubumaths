/**
 * Cache Synchronization Utilities Tests
 * ======================================
 *
 * Comprehensive tests for cache synchronization helpers.
 *
 * Test Categories:
 * 1. VIP Cards Sync (syncVipCards)
 * 2. Gidouilles Sync (syncGidouilles + rollbackGidouilles)
 * 3. Cache Context Detection (isTeacherContext)
 * 4. Error Handling
 *
 * TESTING STRATEGY:
 * - Mock both teacherCache and studentCache
 * - Verify correct cache is updated based on context
 * - Test optimistic updates and rollbacks
 * - Ensure no cross-cache pollution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isTeacherContext, isStudentContext } from '#lib/types/cache-context.ts';
import type { TeacherCacheContext, StudentCacheContext } from '#lib/types/cache-context.ts';
import type { StudentVipCards } from '#lib/types/vip-card.ts';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock the cache stores
vi.mock('#lib/stores/teacherDashboardCache.svelte.ts', () => ({
	teacherCache: {
		updateVipCardsOptimistic: vi.fn(),
		updateGidouillesOptimistic: vi.fn()
	}
}));

vi.mock('#lib/stores/studentDashboardCache.svelte.ts', () => ({
	studentCache: {
		updateVipCardsOptimistic: vi.fn(),
		updateGidouillesOptimistic: vi.fn()
	}
}));

// Import after mocking
import { teacherCache } from '#lib/stores/teacherDashboardCache.svelte.ts';
import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
import { syncVipCards, syncGidouilles, rollbackGidouilles } from '../cache-sync';

// Sample contexts
const teacherContext: TeacherCacheContext = {
	type: 'teacher',
	classId: 'class-123',
	studentId: 'student-456'
};

const studentContext: StudentCacheContext = {
	type: 'student'
};

// Sample data
const sampleVipCards: StudentVipCards = {
	'card-1': {
		cardId: 'bronze-boost',
		earnedAt: '2025-01-15T10:00:00Z',
		usedAt: null
	},
	'card-2': {
		cardId: 'silver-shield',
		earnedAt: '2025-01-16T11:00:00Z',
		usedAt: null
	}
};

// ============================================================================
// HELPER TESTS
// ============================================================================

describe('Cache Context Type Guards', () => {
	it('should correctly identify teacher context', () => {
		expect(isTeacherContext(teacherContext)).toBe(true);
		expect(isTeacherContext(studentContext)).toBe(false);
	});

	it('should correctly identify student context', () => {
		expect(isStudentContext(studentContext)).toBe(true);
		expect(isStudentContext(teacherContext)).toBe(false);
	});
});

// ============================================================================
// VIP CARDS SYNC TESTS
// ============================================================================

describe('syncVipCards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should update teacher cache when context is teacher', () => {
		syncVipCards(teacherContext, sampleVipCards);

		expect(teacherCache.updateVipCardsOptimistic).toHaveBeenCalledWith(
			'class-123',
			'student-456',
			sampleVipCards
		);
		expect(teacherCache.updateVipCardsOptimistic).toHaveBeenCalledTimes(1);
		expect(studentCache.updateVipCardsOptimistic).not.toHaveBeenCalled();
	});

	it('should update student cache when context is student', () => {
		syncVipCards(studentContext, sampleVipCards);

		expect(studentCache.updateVipCardsOptimistic).toHaveBeenCalledWith(sampleVipCards);
		expect(studentCache.updateVipCardsOptimistic).toHaveBeenCalledTimes(1);
		expect(teacherCache.updateVipCardsOptimistic).not.toHaveBeenCalled();
	});

	it('should handle empty VIP cards object', () => {
		const emptyCards: StudentVipCards = {};

		syncVipCards(studentContext, emptyCards);

		expect(studentCache.updateVipCardsOptimistic).toHaveBeenCalledWith(emptyCards);
	});

	it('should handle VIP cards with used cards', () => {
		const cardsWithUsed: StudentVipCards = {
			'card-1': {
				cardId: 'bronze-boost',
				earnedAt: '2025-01-15T10:00:00Z',
				usedAt: '2025-01-17T14:30:00Z'
			}
		};

		syncVipCards(teacherContext, cardsWithUsed);

		expect(teacherCache.updateVipCardsOptimistic).toHaveBeenCalledWith(
			'class-123',
			'student-456',
			cardsWithUsed
		);
	});
});

// ============================================================================
// GIDOUILLES SYNC TESTS
// ============================================================================

describe('syncGidouilles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should update teacher cache when context is teacher', () => {
		syncGidouilles(teacherContext, 5);

		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledWith(
			'class-123',
			'student-456',
			5
		);
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(1);
		expect(studentCache.updateGidouillesOptimistic).not.toHaveBeenCalled();
	});

	it('should update student cache when context is student', () => {
		syncGidouilles(studentContext, 10);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(10);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(1);
		expect(teacherCache.updateGidouillesOptimistic).not.toHaveBeenCalled();
	});

	it('should handle positive delta (adding gidouilles)', () => {
		syncGidouilles(studentContext, 25);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(25);
	});

	it('should handle negative delta (removing gidouilles)', () => {
		syncGidouilles(studentContext, -3);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(-3);
	});

	it('should handle zero delta', () => {
		syncGidouilles(studentContext, 0);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(0);
	});

	it('should work with multiple rapid updates', () => {
		syncGidouilles(teacherContext, 1);
		syncGidouilles(teacherContext, 1);
		syncGidouilles(teacherContext, 1);

		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(3);
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenNthCalledWith(
			1,
			'class-123',
			'student-456',
			1
		);
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenNthCalledWith(
			2,
			'class-123',
			'student-456',
			1
		);
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenNthCalledWith(
			3,
			'class-123',
			'student-456',
			1
		);
	});
});

// ============================================================================
// ROLLBACK GIDOUILLES TESTS
// ============================================================================

describe('rollbackGidouilles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should invert positive delta to rollback addition', () => {
		rollbackGidouilles(studentContext, 5);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(-5);
	});

	it('should invert negative delta to rollback removal', () => {
		rollbackGidouilles(studentContext, -3);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(3);
	});

	it('should work for teacher context', () => {
		rollbackGidouilles(teacherContext, 10);

		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledWith(
			'class-123',
			'student-456',
			-10
		);
	});

	it('should handle rollback of zero delta', () => {
		rollbackGidouilles(studentContext, 0);

		// JavaScript quirk: -1 * 0 = -0, but functionally equivalent to 0
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(-0);
	});

	it('should demonstrate optimistic update + rollback pattern', () => {
		// Optimistic update
		syncGidouilles(studentContext, 5);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(5);

		// Simulate API error - rollback
		rollbackGidouilles(studentContext, 5);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(-5);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// INTEGRATION PATTERNS TESTS
// ============================================================================

describe('Integration Patterns', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should demonstrate optimistic gidouilles pattern with success', () => {
		// Pattern: Optimistic BEFORE API
		// 1. Update cache immediately
		syncGidouilles(studentContext, 5);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(5);

		// 2. API call (simulated success - no action needed)
		// 3. Success: cache already correct ✅
		// No rollback needed

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(1);
	});

	it('should demonstrate optimistic gidouilles pattern with error', () => {
		// Pattern: Optimistic BEFORE API with error
		// 1. Update cache immediately
		syncGidouilles(studentContext, 10);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(10);

		// 2. API call fails (simulated)
		// 3. Error: rollback ❌
		rollbackGidouilles(studentContext, 10);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(-10);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(2);
	});

	it('should demonstrate VIP cards server-confirmed pattern', () => {
		// Pattern: Server-confirmed AFTER API
		const serverCards: StudentVipCards = {
			'card-1': {
				cardId: 'new-card',
				earnedAt: '2025-01-20T10:00:00Z',
				usedAt: null
			}
		};

		// 1. API call returns server data (simulated)
		// 2. Update cache with server-confirmed data
		syncVipCards(studentContext, serverCards);
		expect(studentCache.updateVipCardsOptimistic).toHaveBeenCalledWith(serverCards);

		// 3. Success: cache already correct ✅
		// No invalidation needed
	});

	it('should handle concurrent operations without pollution', () => {
		// Teacher updates one student
		syncGidouilles(teacherContext, 5);

		// Student updates their own data
		syncGidouilles(studentContext, 3);

		// Verify no cross-pollution
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(1);
		expect(teacherCache.updateGidouillesOptimistic).toHaveBeenCalledWith(
			'class-123',
			'student-456',
			5
		);

		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledTimes(1);
		expect(studentCache.updateGidouillesOptimistic).toHaveBeenCalledWith(3);
	});
});
