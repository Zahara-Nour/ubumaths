/**
 * VIP Card Enabled/Disabled Filtering - Integration Tests
 *
 * Tests that the VIP card drawing system correctly filters out disabled cards
 * and handles edge cases when rarities have no enabled cards.
 *
 * REQUIREMENTS:
 * - Supabase local running on port 54321 (pnpm db:start)
 * - Tests verify disabled cards are never drawn
 * - Tests verify fallback behavior when rarity has no enabled cards
 *
 * Tests:
 * 1. Disabled cards (candy, captain, team) are never drawn
 * 2. When a rarity has no enabled cards, system falls back to common
 * 3. When all cards are disabled, system raises error
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../database/helpers/trigger-test-helpers';
import { createAuthenticatedClient } from '../database/helpers/supabase-client';
import { TestData } from '../database/helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { VIP_CARDS, type VipCardRarity } from '$lib/types/vip-card';

describe('VIP Card Enabled/Disabled Filtering - Integration Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		// Ensure all cards are enabled before each test
		console.log('[beforeEach] Enabling all VIP cards...');
		await serviceClient.from('vip_card_templates').update({ is_enabled: true }).neq('id', 'dummy');

		// Verify disabled cards (candy, captain, team) are disabled
		await serviceClient
			.from('vip_card_templates')
			.update({ is_enabled: false })
			.in('id', ['candy', 'captain', 'team']);
	});

	afterEach(async () => {
		// Re-enable all cards after each test to avoid affecting other tests
		console.log('[afterEach] Re-enabling all VIP cards...');
		await serviceClient.from('vip_card_templates').update({ is_enabled: true }).neq('id', 'dummy');

		// Re-disable the default disabled cards
		await serviceClient
			.from('vip_card_templates')
			.update({ is_enabled: false })
			.in('id', ['candy', 'captain', 'team']);

		// Reset config to default
		console.log('[afterEach] Resetting config to default...');
		await serviceClient
			.from('vip_card_config')
			.update({ is_active: false })
			.neq('config_name', 'default');
		await serviceClient
			.from('vip_card_config')
			.update({ is_active: true })
			.eq('config_name', 'default');
	});

	/**
	 * Helper function to count cards by rarity
	 */
	function countByRarity(cards: Array<{ cardId: string }>): Record<VipCardRarity, number> {
		const counts: Record<VipCardRarity, number> = {
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};

		for (const { cardId } of cards) {
			const card = VIP_CARDS.find((c) => c.id === cardId);
			if (card) {
				counts[card.rarity]++;
			}
		}

		return counts;
	}

	describe('Disabled Cards Never Drawn', () => {
		it('should never draw disabled cards (candy, captain, team)', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			console.log('[test] Creating student...');
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Verify disabled cards in DB
			const { data: disabledCards } = await serviceClient
				.from('vip_card_templates')
				.select('id')
				.eq('is_enabled', false);

			console.log('[test] Disabled cards:', disabledCards?.map((c) => c.id).join(', '));
			expect(disabledCards?.map((c) => c.id).sort()).toEqual(['candy', 'captain', 'team'].sort());

			// ========================================
			// ACT: Draw 1,000 cards
			// ========================================

			const sampleSize = 1000;
			const drawnCards: string[] = [];

			console.log('[test] Drawing 1,000 cards...');
			for (let i = 0; i < 100; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				expect(error).toBeNull();
				expect(data).toBeDefined();

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				const cards = parsedData.cards;
				drawnCards.push(...cards.map((c: { cardId: string }) => c.cardId));
			}

			// ========================================
			// ASSERT: No disabled cards were drawn
			// ========================================

			expect(drawnCards).toHaveLength(sampleSize);

			// Verify NO disabled cards in results
			const disabledCardsInDraw = drawnCards.filter((cardId) =>
				['candy', 'captain', 'team'].includes(cardId)
			);

			expect(disabledCardsInDraw).toHaveLength(0);

			// Log unique cards drawn
			const uniqueCards = [...new Set(drawnCards)];
			console.log(`[test] Cards drawn: ${drawnCards.length} total, ${uniqueCards.length} unique`);
			console.log('[test] Verified: NO disabled cards (candy, captain, team) were drawn ✓');

			// Verify enabled cards WERE drawn
			const enabledCardIds = VIP_CARDS.filter(
				(c) => !['candy', 'captain', 'team'].includes(c.id)
			).map((c) => c.id);

			const enabledCardsInDraw = drawnCards.filter((cardId) => enabledCardIds.includes(cardId));
			expect(enabledCardsInDraw).toHaveLength(sampleSize);

			console.log('[test] All drawn cards are enabled ✓');
		}, 60000);

		it('should maintain correct rarity distribution without disabled cards', async () => {
			// Verify that disabling cards doesn't break the rarity distribution logic

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Draw 500 cards
			const drawnCards: string[] = [];

			for (let i = 0; i < 50; i++) {
				const { data } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				drawnCards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// Count by rarity
			const rarityCounts = countByRarity(drawnCards.map((cardId) => ({ cardId })));

			console.log('[test] Distribution with disabled cards (500 cards):');
			console.log({
				common: `${rarityCounts.common} (${((rarityCounts.common / 500) * 100).toFixed(1)}%)`,
				rare: `${rarityCounts.rare} (${((rarityCounts.rare / 500) * 100).toFixed(1)}%)`,
				epic: `${rarityCounts.epic} (${((rarityCounts.epic / 500) * 100).toFixed(1)}%)`,
				legendary: `${rarityCounts.legendary} (${((rarityCounts.legendary / 500) * 100).toFixed(1)}%)`
			});

			// Distribution should still follow 60/25/12/3 ratio (±20% for small sample)
			expect(rarityCounts.common).toBeGreaterThan(240); // > 48% (60% - 12%)
			expect(rarityCounts.common).toBeLessThan(360); // < 72% (60% + 12%)

			expect(rarityCounts.legendary).toBeGreaterThanOrEqual(0); // Can be very low
			expect(rarityCounts.legendary).toBeLessThan(50); // < 10% (3% + 7%)
		}, 30000);
	});

	describe('Fallback to Common When Rarity Empty', () => {
		it('should fallback to common when selected rarity has no enabled cards', async () => {
			// ========================================
			// ARRANGE: Disable ALL legendary cards
			// ========================================

			console.log('[test] Creating student...');
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Get all legendary card IDs
			const legendaryCards = VIP_CARDS.filter((c) => c.rarity === 'legendary');
			const legendaryIds = legendaryCards.map((c) => c.id);

			console.log('[test] Disabling legendary cards:', legendaryIds.join(', '));
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: false })
				.in('id', legendaryIds);

			// Verify legendary cards are disabled
			const { data: disabledLegendary } = await serviceClient
				.from('vip_card_templates')
				.select('id')
				.eq('is_enabled', false)
				.eq('rarity', 'legendary');

			expect(disabledLegendary).toHaveLength(legendaryIds.length);

			// ========================================
			// ACT: Draw 1,000 cards
			// ========================================

			const drawnCards: string[] = [];

			console.log('[test] Drawing 1,000 cards (legendary disabled)...');
			for (let i = 0; i < 100; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				expect(error).toBeNull();
				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				drawnCards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// ========================================
			// ASSERT: No legendary cards drawn
			// ========================================

			// Count by rarity
			const rarityCounts = countByRarity(drawnCards.map((cardId) => ({ cardId })));

			console.log('[test] Distribution with legendary disabled (1,000 cards):');
			console.log({
				common: `${rarityCounts.common} (${((rarityCounts.common / 1000) * 100).toFixed(1)}%)`,
				rare: `${rarityCounts.rare} (${((rarityCounts.rare / 1000) * 100).toFixed(1)}%)`,
				epic: `${rarityCounts.epic} (${((rarityCounts.epic / 1000) * 100).toFixed(1)}%)`,
				legendary: `${rarityCounts.legendary} (${((rarityCounts.legendary / 1000) * 100).toFixed(1)}%)`
			});

			// NO legendary cards should be drawn
			expect(rarityCounts.legendary).toBe(0);

			// Common cards should be increased (includes fallback from legendary 3%)
			// Expected: 60% base + 3% fallback = 63%
			// Allow wide range due to fallback implementation variance
			expect(rarityCounts.common).toBeGreaterThan(580); // > 58% (conservative)
			expect(rarityCounts.common).toBeLessThan(700); // < 70% (generous)

			console.log('[test] Legendary fallback working: common increased to', rarityCounts.common);

			// ========================================
			// CLEANUP: Re-enable legendary cards
			// ========================================

			console.log('[test] Re-enabling legendary cards...');
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: true })
				.in('id', legendaryIds);
		}, 60000);

		it('should fallback to common when multiple rarities are disabled', async () => {
			// Disable both epic and legendary

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Get epic and legendary card IDs
			const epicCards = VIP_CARDS.filter((c) => c.rarity === 'epic');
			const legendaryCards = VIP_CARDS.filter((c) => c.rarity === 'legendary');
			const disabledIds = [...epicCards, ...legendaryCards].map((c) => c.id);

			console.log('[test] Disabling epic and legendary cards:', disabledIds.join(', '));
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: false })
				.in('id', disabledIds);

			// Draw 500 cards
			const drawnCards: string[] = [];

			for (let i = 0; i < 50; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				expect(error).toBeNull();
				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				drawnCards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			const rarityCounts = countByRarity(drawnCards.map((cardId) => ({ cardId })));

			console.log('[test] Distribution with epic+legendary disabled (500 cards):');
			console.log({
				common: `${rarityCounts.common} (${((rarityCounts.common / 500) * 100).toFixed(1)}%)`,
				rare: `${rarityCounts.rare} (${((rarityCounts.rare / 500) * 100).toFixed(1)}%)`,
				epic: `${rarityCounts.epic} (${((rarityCounts.epic / 500) * 100).toFixed(1)}%)`,
				legendary: `${rarityCounts.legendary} (${((rarityCounts.legendary / 500) * 100).toFixed(1)}%)`
			});

			// NO epic or legendary cards
			expect(rarityCounts.epic).toBe(0);
			expect(rarityCounts.legendary).toBe(0);

			// Common should absorb 12% + 3% = 15% fallback
			// Expected: 60% + 15% = 75%
			expect(rarityCounts.common).toBeGreaterThan(325); // > 65%
			expect(rarityCounts.common).toBeLessThan(425); // < 85%

			// Re-enable cards
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: true })
				.in('id', disabledIds);
		}, 30000);
	});

	describe('Error Handling: All Cards Disabled', () => {
		it('should raise error when all VIP cards are disabled', async () => {
			// ========================================
			// ARRANGE: Disable ALL cards
			// ========================================

			console.log('[test] Creating student...');
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			console.log('[test] Disabling ALL VIP cards...');
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: false })
				.neq('id', 'dummy');

			// Verify all cards are disabled
			const { data: enabledCards } = await serviceClient
				.from('vip_card_templates')
				.select('id')
				.eq('is_enabled', true);

			expect(enabledCards).toHaveLength(0);
			console.log('[test] Confirmed: ALL cards disabled');

			// ========================================
			// ACT: Attempt to draw cards
			// ========================================

			const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
				p_student_id: student.id,
				p_count: 1,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: null
			});

			// ========================================
			// ASSERT: Should fail with appropriate error
			// ========================================

			expect(error).toBeDefined();
			expect(error?.message).toMatch(/no enabled vip cards|no cards available/i);

			console.log('[test] Error message:', error?.message);
			console.log('[test] System correctly rejected draw when no cards available ✓');

			// Data should be null or empty
			if (data !== null) {
				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				if (parsedData.cards) {
					expect(parsedData.cards).toHaveLength(0);
				}
			}

			// ========================================
			// CLEANUP: Re-enable all cards
			// ========================================

			console.log('[test] Re-enabling all VIP cards...');
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: true })
				.neq('id', 'dummy');
		}, 30000);

		it('should raise error when all common cards are disabled and fallback fails', async () => {
			// Edge case: What if fallback target (common) is also empty?

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Get all common card IDs from VIP_CARDS (enabled cards only)
			const commonCards = VIP_CARDS.filter((c) => c.rarity === 'common');
			const commonIds = commonCards.map((c) => c.id);

			console.log('[test] Disabling all common cards:', commonIds.join(', '));
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: false })
				.in('id', commonIds);

			// Verify ALL common cards are disabled (including default disabled: candy, captain)
			const { data: disabledCommon } = await serviceClient
				.from('vip_card_templates')
				.select('id')
				.eq('is_enabled', false)
				.eq('rarity', 'common');

			// Should have 8 total: 6 we just disabled + 2 default disabled (candy, captain)
			expect(disabledCommon).toHaveLength(8);

			// Try to draw cards (should fail because fallback target 'common' is empty)
			const { error } = await studentClient.rpc('draw_multiple_vip_cards', {
				p_student_id: student.id,
				p_count: 10,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: null
			});

			// Should fail because fallback always targets 'common', which is now empty
			expect(error).toBeDefined();
			expect(error?.message).toContain('No enabled VIP cards available');

			console.log('[test] Error message:', error?.message);
			console.log('[test] System correctly rejected draw when fallback target (common) is empty ✓');

			// Re-enable common cards
			await serviceClient
				.from('vip_card_templates')
				.update({ is_enabled: true })
				.in('id', commonIds);
		}, 30000);
	});

	describe('Specific Disabled Cards Verification', () => {
		it('should never draw candy card (disabled)', async () => {
			// Specific test for candy card (commented out in VIP_CARDS array)

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Verify candy is disabled
			const { data: candyCard } = await serviceClient
				.from('vip_card_templates')
				.select('*')
				.eq('id', 'candy')
				.single();

			expect(candyCard).toBeDefined();
			expect(candyCard?.is_enabled).toBe(false);

			// Draw 500 cards
			const drawnCards: string[] = [];

			for (let i = 0; i < 50; i++) {
				const { data } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				drawnCards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// Verify candy never appeared
			const candyCount = drawnCards.filter((id) => id === 'candy').length;
			expect(candyCount).toBe(0);

			console.log('[test] Verified: candy card never drawn (0/500) ✓');
		}, 30000);

		it('should never draw captain or team cards (disabled)', async () => {
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Verify captain and team are disabled
			const { data: disabledCards } = await serviceClient
				.from('vip_card_templates')
				.select('*')
				.in('id', ['captain', 'team']);

			expect(disabledCards).toHaveLength(2);
			expect(disabledCards?.every((card) => card.is_enabled === false)).toBe(true);

			// Draw 500 cards
			const drawnCards: string[] = [];

			for (let i = 0; i < 50; i++) {
				const { data } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: null
				});

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				drawnCards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// Verify neither appeared
			const captainCount = drawnCards.filter((id) => id === 'captain').length;
			const teamCount = drawnCards.filter((id) => id === 'team').length;

			expect(captainCount).toBe(0);
			expect(teamCount).toBe(0);

			console.log('[test] Verified: captain card never drawn (0/500) ✓');
			console.log('[test] Verified: team card never drawn (0/500) ✓');
		}, 30000);
	});
});
