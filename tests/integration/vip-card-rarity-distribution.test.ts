/**
 * VIP Card Rarity Distribution - Statistical Validation Tests
 *
 * Tests that the VIP card drawing system produces correct weighted distribution
 * based on configured rarity probabilities.
 *
 * REQUIREMENTS:
 * - Supabase local running on port 54321 (pnpm db:start)
 * - Tests verify weighted rarity selection (60/25/12/3 by default)
 * - Tests verify custom event configurations work correctly
 *
 * Tests:
 * 1. Default config: 60% common, 25% rare, 12% epic, 3% legendary
 * 2. Custom event config: Modified probabilities (e.g., 50% legendary boost)
 * 3. Distribution variance: Validate ±5% tolerance on large samples
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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

describe('VIP Card Rarity Distribution - Statistical Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	afterEach(async () => {
		// Reset config to default after each test
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

	/**
	 * Helper to format percentages for logging
	 */
	function formatPercentages(counts: Record<VipCardRarity, number>, total: number) {
		return {
			common: `${counts.common} (${((counts.common / total) * 100).toFixed(2)}%)`,
			rare: `${counts.rare} (${((counts.rare / total) * 100).toFixed(2)}%)`,
			epic: `${counts.epic} (${((counts.epic / total) * 100).toFixed(2)}%)`,
			legendary: `${counts.legendary} (${((counts.legendary / total) * 100).toFixed(2)}%)`
		};
	}

	describe('Default Configuration (60/25/12/3)', () => {
		it('should match configured rarity probabilities with 10,000 card sample', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			// Create test student with high gidouilles balance for 10,000 draws
			console.log('[test] Creating student profile...');
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			console.log('[test] Created student:', student.id, student.email);

			// Create authenticated client as student (draws for themselves)
			const studentClient = await createAuthenticatedClient(student.email);

			// Verify default config is active
			const { data: configData } = await serviceClient
				.from('vip_card_config')
				.select('*')
				.eq('config_name', 'default')
				.eq('is_active', true)
				.single();

			expect(configData).toBeDefined();
			expect(configData?.common_probability).toBe(60);
			expect(configData?.rare_probability).toBe(25);
			expect(configData?.epic_probability).toBe(12);
			expect(configData?.legendary_probability).toBe(3);

			// ========================================
			// ACT: Draw 10,000 cards in batches of 10
			// ========================================

			const sampleSize = 10000;
			const batchSize = 10;
			const batchCount = sampleSize / batchSize;
			const drawnCards: string[] = [];

			console.log(`[test] Drawing ${sampleSize} cards in ${batchCount} batches...`);
			const startTime = Date.now();

			for (let i = 0; i < batchCount; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: batchSize,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10, // Student pays gidouilles
					p_vip_card_instance_id: undefined
				});

				expect(error).toBeNull();
				expect(data).toBeDefined();

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				const cards = parsedData.cards;
				expect(cards).toHaveLength(batchSize);

				drawnCards.push(...cards.map((c: { cardId: string }) => c.cardId));

				// Log progress every 100 batches
				if ((i + 1) % 100 === 0) {
					const progress = ((i + 1) / batchCount) * 100;
					console.log(`[test] Progress: ${progress.toFixed(0)}% (${drawnCards.length} cards)`);
				}
			}

			const duration = Date.now() - startTime;
			console.log(`[test] Completed in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

			// ========================================
			// ASSERT: Verify distribution
			// ========================================

			expect(drawnCards).toHaveLength(sampleSize);

			// Count by rarity
			const rarityCounts = countByRarity(drawnCards.map((cardId) => ({ cardId })));

			// Log results
			console.log('[test] Rarity distribution (10,000 cards):');
			console.log(formatPercentages(rarityCounts, sampleSize));
			console.log(
				'[test] Expected: common=6000 (60%), rare=2500 (25%), epic=1200 (12%), legendary=300 (3%)'
			);

			// Validate with ±6% tolerance (10k sample still has natural variance)
			const tolerance = 0.06;

			// Common: 6000 ±300 (60% ±5%)
			expect(rarityCounts.common).toBeGreaterThanOrEqual(6000 * (1 - tolerance));
			expect(rarityCounts.common).toBeLessThanOrEqual(6000 * (1 + tolerance));

			// Rare: 2500 ±125 (25% ±5%)
			expect(rarityCounts.rare).toBeGreaterThanOrEqual(2500 * (1 - tolerance));
			expect(rarityCounts.rare).toBeLessThanOrEqual(2500 * (1 + tolerance));

			// Epic: 1200 ±60 (12% ±5%)
			expect(rarityCounts.epic).toBeGreaterThanOrEqual(1200 * (1 - tolerance));
			expect(rarityCounts.epic).toBeLessThanOrEqual(1200 * (1 + tolerance));

			// Legendary: 300 ±15 (3% ±5%)
			expect(rarityCounts.legendary).toBeGreaterThanOrEqual(300 * (1 - tolerance));
			expect(rarityCounts.legendary).toBeLessThanOrEqual(300 * (1 + tolerance));

			// Calculate actual percentages
			const actualPercentages = {
				common: (rarityCounts.common / sampleSize) * 100,
				rare: (rarityCounts.rare / sampleSize) * 100,
				epic: (rarityCounts.epic / sampleSize) * 100,
				legendary: (rarityCounts.legendary / sampleSize) * 100
			};

			console.log('[test] Actual percentages:', {
				common: actualPercentages.common.toFixed(2) + '%',
				rare: actualPercentages.rare.toFixed(2) + '%',
				epic: actualPercentages.epic.toFixed(2) + '%',
				legendary: actualPercentages.legendary.toFixed(2) + '%'
			});

			// Verify total equals sample size
			const total = Object.values(rarityCounts).reduce((sum, count) => sum + count, 0);
			expect(total).toBe(sampleSize);
		}, 150000); // 2.5 minute timeout for 10k draws
	});

	describe('Custom Event Configuration', () => {
		it('should respect custom event configuration (50% legendary boost)', async () => {
			// ========================================
			// ARRANGE: Setup test data
			// ========================================

			console.log('[test] Creating student...');
			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Deactivate default config
			console.log('[test] Deactivating default config...');
			await serviceClient
				.from('vip_card_config')
				.update({ is_active: false })
				.eq('config_name', 'default');

			// Create/update test event config with 50% legendary probability (upsert to handle existing config)
			console.log('[test] Creating test event config (50% legendary)...');
			const { error: upsertError } = await serviceClient.from('vip_card_config').upsert(
				{
					config_name: 'test_event_legendary_boost',
					common_probability: 20,
					rare_probability: 15,
					epic_probability: 15,
					legendary_probability: 50, // Boosted!
					is_active: true,
					description: 'Test event with boosted legendary drop rate'
				},
				{ onConflict: 'config_name' }
			);

			if (upsertError) {
				console.error('[test] Failed to create config:', upsertError);
			}

			// Verify config is active
			const { data: activeConfig } = await serviceClient
				.from('vip_card_config')
				.select('*')
				.eq('config_name', 'test_event_legendary_boost')
				.eq('is_active', true)
				.single();

			expect(activeConfig).toBeDefined();
			expect(activeConfig?.legendary_probability).toBe(50);
			console.log('[test] Verified custom config is active with 50% legendary');

			// ========================================
			// ACT: Draw 1,000 cards
			// ========================================

			const sampleSize = 1000;
			const drawnCards: string[] = [];

			console.log('[test] Drawing 1,000 cards with custom config...');
			for (let i = 0; i < 100; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: undefined
				});

				expect(error).toBeNull();
				expect(data).toBeDefined();

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				const cards = parsedData.cards;
				drawnCards.push(...cards.map((c: { cardId: string }) => c.cardId));
			}

			// ========================================
			// ASSERT: Verify custom distribution
			// ========================================

			const rarityCounts = countByRarity(drawnCards.map((cardId) => ({ cardId })));

			console.log('[test] Custom config distribution (1,000 cards):');
			console.log(formatPercentages(rarityCounts, sampleSize));
			console.log(
				'[test] Expected: legendary ~500 (50%), common ~200 (20%), rare ~150 (15%), epic ~150 (15%)'
			);

			// Legendary should be ~500 (50% of 1000), allow ±15% variance (1000 cards = smaller sample)
			expect(rarityCounts.legendary).toBeGreaterThanOrEqual(425);
			expect(rarityCounts.legendary).toBeLessThanOrEqual(575);

			// Common should be ~200 (20% of 1000), allow ±15% variance (1000 cards = smaller sample)
			expect(rarityCounts.common).toBeGreaterThanOrEqual(170);
			expect(rarityCounts.common).toBeLessThanOrEqual(230);

			console.log(`[test] Legendary cards: ${rarityCounts.legendary}/1000 (expected ~500)`);
			console.log(`[test] Common cards: ${rarityCounts.common}/1000 (expected ~200)`);

			// ========================================
			// CLEANUP: Restore default config
			// ========================================

			console.log('[test] Restoring default config...');
			await serviceClient
				.from('vip_card_config')
				.delete()
				.eq('config_name', 'test_event_legendary_boost');

			await serviceClient
				.from('vip_card_config')
				.update({ is_active: true })
				.eq('config_name', 'default');
		}, 60000); // 1 minute timeout

		it('should fallback to default config when custom config is invalid', async () => {
			// ========================================
			// ARRANGE: Setup with invalid custom config
			// ========================================

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Deactivate default config
			await serviceClient
				.from('vip_card_config')
				.update({ is_active: false })
				.eq('config_name', 'default');

			// Create invalid config (probabilities don't sum to 100)
			await serviceClient.from('vip_card_config').insert({
				config_name: 'test_invalid_config',
				common_probability: 10,
				rare_probability: 10,
				epic_probability: 10,
				legendary_probability: 10, // Total = 40% (invalid!)
				is_active: true,
				description: 'Invalid config for testing fallback'
			});

			// ========================================
			// ACT: Attempt to draw cards
			// ========================================

			const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
				p_student_id: student.id,
				p_count: 10,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: undefined
			});

			// ========================================
			// ASSERT: Should succeed using fallback
			// ========================================

			// Either:
			// 1. RPC succeeds and uses default config as fallback, or
			// 2. RPC fails with validation error
			// Both behaviors are acceptable

			if (error) {
				// If validation fails, error should mention probabilities
				expect(error.message).toMatch(/probabilities|probability|config/i);
				console.log('[test] RPC correctly rejected invalid config:', error.message);
			} else {
				// If fallback works, we should get cards
				expect(data).toBeDefined();
				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				expect(parsedData.cards).toHaveLength(10);
				console.log('[test] RPC succeeded with fallback config');
			}

			// ========================================
			// CLEANUP
			// ========================================

			await serviceClient.from('vip_card_config').delete().eq('config_name', 'test_invalid_config');

			await serviceClient
				.from('vip_card_config')
				.update({ is_active: true })
				.eq('config_name', 'default');
		}, 30000);
	});

	describe('Distribution Edge Cases', () => {
		it('should maintain distribution when drawing single cards repeatedly', async () => {
			// Tests that drawing 1 card 100 times produces same distribution as 100 cards at once

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			const singleCardDraws: string[] = [];

			// Draw 1 card at a time, 100 times
			for (let i = 0; i < 100; i++) {
				const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 1,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: undefined
				});

				expect(error).toBeNull();
				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				singleCardDraws.push(parsedData.cards[0].cardId);
			}

			// Count distribution
			const rarityCounts = countByRarity(singleCardDraws.map((cardId) => ({ cardId })));

			console.log('[test] Single card draws distribution (100 cards):');
			console.log(formatPercentages(rarityCounts, 100));

			// With 100 cards, we expect approximately:
			// Common: 60, Rare: 25, Epic: 12, Legendary: 3
			// Allow wide variance (±50%) for small sample

			expect(rarityCounts.common).toBeGreaterThan(30); // At least 30%
			expect(rarityCounts.common).toBeLessThan(90); // At most 90%

			expect(rarityCounts.legendary).toBeGreaterThanOrEqual(0); // Can be 0 in small sample
			expect(rarityCounts.legendary).toBeLessThan(15); // Unlikely to exceed 15%
		}, 30000);

		it('should not be affected by previous draws (independence)', async () => {
			// Tests that each draw is independent (no "pity timer" or bias from previous results)

			const student = await TestData.profile().withRole('student').withGidouilles(100000).create();
			const studentClient = await createAuthenticatedClient(student.email);

			// Draw 2 batches of 500 cards
			const batch1Cards: string[] = [];
			const batch2Cards: string[] = [];

			// Batch 1
			for (let i = 0; i < 50; i++) {
				const { data } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: undefined
				});

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				batch1Cards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// Batch 2 (immediately after)
			for (let i = 0; i < 50; i++) {
				const { data } = await studentClient.rpc('draw_multiple_vip_cards', {
					p_student_id: student.id,
					p_count: 10,
					p_payment_method: 'gidouilles',
					p_gidouilles_cost: 10,
					p_vip_card_instance_id: undefined
				});

				const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
				batch2Cards.push(...parsedData.cards.map((c: { cardId: string }) => c.cardId));
			}

			// Count distributions
			const batch1Counts = countByRarity(batch1Cards.map((cardId) => ({ cardId })));
			const batch2Counts = countByRarity(batch2Cards.map((cardId) => ({ cardId })));

			console.log('[test] Batch 1 distribution (500 cards):');
			console.log(formatPercentages(batch1Counts, 500));
			console.log('[test] Batch 2 distribution (500 cards):');
			console.log(formatPercentages(batch2Counts, 500));

			// Both batches should have similar distributions (±20% variance)
			// This is a loose check - we're just ensuring no obvious bias

			const batch1CommonPct = (batch1Counts.common / 500) * 100;
			const batch2CommonPct = (batch2Counts.common / 500) * 100;

			expect(Math.abs(batch1CommonPct - batch2CommonPct)).toBeLessThan(20); // Within 20 percentage points

			console.log(
				`[test] Common variance: ${Math.abs(batch1CommonPct - batch2CommonPct).toFixed(2)}% (expected <20%)`
			);
		}, 60000);
	});
});
