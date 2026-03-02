import { describe, it, expect } from 'vitest';
import { countAvailableConsumableUses } from './vip-cards';
import type { StudentVipCards } from '$lib/types/vip-card';

describe('countAvailableConsumableUses', () => {
	it('returns 0 for empty vip cards', () => {
		expect(countAvailableConsumableUses({}, 'minesweeper-hint')).toBe(0);
	});

	it('returns 0 when no matching cards exist', () => {
		const vipCards: StudentVipCards = {
			'inst-1': { cardId: 'other-card', earnedAt: '2026-01-01T00:00:00Z', usedAt: null }
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(0);
	});

	it('counts a single-use card (usesRemaining is null) as 1', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null,
				usesRemaining: null
			}
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(1);
	});

	it('counts a single-use card without usesRemaining field as 1', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null
			}
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(1);
	});

	it('counts multi-use card usesRemaining correctly', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null,
				usesRemaining: 3
			}
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(3);
	});

	it('ignores fully used cards (usedAt set)', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: '2026-01-02T00:00:00Z',
				usesRemaining: 0
			},
			'inst-2': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null,
				usesRemaining: 2
			}
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(2);
	});

	it('sums uses across multiple instances', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null,
				usesRemaining: 2
			},
			'inst-2': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-02T00:00:00Z',
				usedAt: null,
				usesRemaining: null
			},
			'inst-3': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-03T00:00:00Z',
				usedAt: '2026-01-04T00:00:00Z'
			}
		};
		// 2 (multi-use) + 1 (single-use) + 0 (used) = 3
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(3);
	});

	it('handles usesRemaining = 0 as no uses available', () => {
		const vipCards: StudentVipCards = {
			'inst-1': {
				cardId: 'minesweeper-hint',
				earnedAt: '2026-01-01T00:00:00Z',
				usedAt: null,
				usesRemaining: 0
			}
		};
		expect(countAvailableConsumableUses(vipCards, 'minesweeper-hint')).toBe(0);
	});
});
