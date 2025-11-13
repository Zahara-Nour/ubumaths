/**
 * Notifications Formatting Tests
 *
 * Test suite for daily summary and weekly reward notification formatting
 */

import { describe, it, expect } from 'vitest';
import { formatDailySummary, formatWeeklyReward } from './notifications';
import type { DailyChanges } from './types';

describe('formatDailySummary', () => {
	const className = 'Mathématiques';
	const date = new Date('2025-11-13T12:00:00Z');

	it('should show "Aucune activité" when all changes are zero', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('Mathématiques');
		expect(result).toContain('Aucune activité enregistrée');
	});

	it('should show only gidouilles gained when only that changed', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 15,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🪙 Gidouilles : +15 gagnées');
		expect(result).not.toContain('perdues');
		expect(result).not.toContain('⚠️ Avertissements');
		expect(result).not.toContain('🎴 Cartes VIP');
		expect(result).not.toContain('⭐ Bonus');
	});

	it('should show only gidouilles lost when only that changed', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 5,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🪙 Gidouilles : -5 perdues');
		expect(result).not.toContain('gagnées');
	});

	it('should show net gidouilles when both gained and lost', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 15,
			gidouilles_lost: 3,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🪙 Gidouilles : +15 gagnées, -3 perdues (Total : +12)');
	});

	it('should show negative net gidouilles correctly', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 3,
			gidouilles_lost: 10,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🪙 Gidouilles : +3 gagnées, -10 perdues (Total : -7)');
	});

	it('should show warnings issued correctly (singular)', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⚠️ Avertissements : 1 reçu');
	});

	it('should show warnings issued correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 3,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⚠️ Avertissements : 3 reçus');
	});

	it('should show warnings removed correctly (singular)', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⚠️ Avertissements : 1 retiré');
	});

	it('should show warnings removed correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 2,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⚠️ Avertissements : 2 retirés');
	});

	it('should show both warnings issued and removed', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 2,
			warnings_removed: 1,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⚠️ Avertissements : 2 reçus, 1 retiré');
	});

	it('should show VIP cards gained correctly (singular)', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🎴 Cartes VIP : 1 gagnée');
	});

	it('should show VIP cards gained correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 3,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🎴 Cartes VIP : 3 gagnées');
	});

	it('should show VIP cards used correctly (singular)', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🎴 Cartes VIP : 1 utilisée');
	});

	it('should show VIP cards used correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 2
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🎴 Cartes VIP : 2 utilisées');
	});

	it('should show both VIP cards gained and used', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 2,
			vip_cards_used: 1
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🎴 Cartes VIP : 2 gagnées, 1 utilisée');
	});

	it('should show bonus gained correctly (singular)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 1,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⭐ Bonus : +1 gagné');
	});

	it('should show bonus gained correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 5,
			bonus_used: 0,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⭐ Bonus : +5 gagnés');
	});

	it('should show bonus used correctly (singular)', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⭐ Bonus : -1 utilisé');
	});

	it('should show bonus used correctly (plural)', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 0,
			bonus_used: 3,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⭐ Bonus : -3 utilisés');
	});

	it('should show net bonus when both gained and used', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 0,
			gidouilles_lost: 0,
			bonus_gained: 5,
			bonus_used: 2,
			warnings_issued: 0,
			warnings_removed: 0,
			vip_cards_gained: 0,
			vip_cards_used: 0
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('⭐ Bonus : +5 gagnés, -2 utilisés (Total : +3)');
	});

	it('should show all categories when all have changes', () => {
		const changes: DailyChanges = {
			gidouilles_gained: 15,
			gidouilles_lost: 3,
			bonus_gained: 5,
			bonus_used: 1,
			warnings_issued: 1,
			warnings_removed: 0,
			vip_cards_gained: 2,
			vip_cards_used: 1
		};

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('🪙 Gidouilles');
		expect(result).toContain('⚠️ Avertissements');
		expect(result).toContain('🎴 Cartes VIP');
		expect(result).toContain('⭐ Bonus');
	});

	it('should include class name in header', () => {
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

		const result = formatDailySummary(className, date, changes);

		expect(result).toContain('Mathématiques');
	});

	it('should include formatted date in header', () => {
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

		const result = formatDailySummary(className, date, changes);

		// Should contain the formatted date (e.g., "13 novembre 2025")
		expect(result).toMatch(/\d{1,2} \w+ \d{4}/);
	});
});

describe('formatWeeklyReward', () => {
	const className = 'Mathématiques';
	const weekStart = new Date('2025-11-09T00:00:00Z');
	const weekEnd = new Date('2025-11-15T23:59:59Z');

	it('should include class name in message', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('Mathématiques');
	});

	it('should include reward amount (1 gidouille)', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('1 gidouille');
	});

	it('should include week start date', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		// Should contain formatted start date
		expect(result).toMatch(/du \d{1,2} \w+/);
	});

	it('should include week end date', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		// Should contain formatted end date
		expect(result).toMatch(/au \d{1,2} \w+/);
	});

	it('should include congratulatory message', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('Bravo');
		expect(result).toContain('sans avertissement');
	});

	it('should include encouragement message', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('Continue comme ça');
	});

	it('should include trophy emoji', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('🏆');
	});

	it('should include strong emoji', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		expect(result).toContain('💪');
	});

	it('should be properly formatted as markdown', () => {
		const result = formatWeeklyReward(className, weekStart, weekEnd);

		// Should have title line
		expect(result).toMatch(/^🏆 Récompense hebdomadaire/);

		// Should have multiple lines
		expect(result.split('\n').length).toBeGreaterThan(1);
	});
});
