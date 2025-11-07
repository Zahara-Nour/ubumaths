/**
 * VIP Card Draw Filters - Database Trigger Tests
 *
 * Tests for the award_vip_cards_with_filters RPC function.
 * This function allows drawing VIP cards with advanced filtering capabilities.
 *
 * REQUIREMENTS:
 * - Supabase local running on port 54321 (pnpm db:start)
 * - Tests verify all filter types and combinations
 *
 * FILTER TYPES:
 * 1. forceRarity: Force all cards to be of specified rarity
 * 2. minRarity: Guarantee at least 1 card of minimum rarity or higher
 * 3. excludeCardIds: Exclude specific card IDs from draw pool
 * 4. onlyCardsWithActions: Only draw cards with action definitions
 *
 * Tests:
 * - Individual filter behaviors
 * - Combined filters
 * - Error cases (invalid inputs, mutually exclusive filters)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/supabase-client';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { VIP_CARDS, type VipCardRarity } from '$lib/types/vip-card';

describe('VIP Card Draw Filters - RPC Function Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	/**
	 * Helper function to count cards by rarity
	 */
	function countByRarity(
		cards: Array<{ cardId: string; rarity: string }>
	): Record<VipCardRarity, number> {
		const counts: Record<VipCardRarity, number> = {
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};

		for (const card of cards) {
			const rarity = card.rarity as VipCardRarity;
			counts[rarity]++;
		}

		return counts;
	}

	/**
	 * Helper function to call award_vip_cards_with_filters RPC
	 */
	async function callAwardVipCardsWithFilters(
		client: SupabaseClient<Database>,
		studentId: string,
		count: number,
		filters: Record<string, unknown> = {}
	) {
		// Type assertion needed until database types are regenerated after migration
		const { data, error } = (await client.rpc(
			'award_vip_cards_with_filters' as never,
			{
				p_student_id: studentId,
				p_count: count,
				p_filters: filters
			} as never
		)) as {
			data: {
				cards: Array<{
					cardId: string;
					instanceId: string;
					name: string;
					rarity: string;
					earnedAt: string;
				}>;
			} | null;
			error: { message: string } | null;
		};

		return { data, error };
	}

	// ============================================================================
	// FORCE RARITY FILTER TESTS
	// ============================================================================

	describe('forceRarity filter', () => {
		it('should force all cards to be common rarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Draw 10 cards with forceRarity: 'common'
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				forceRarity: 'common'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.common).toBe(10);
			expect(counts.rare).toBe(0);
			expect(counts.epic).toBe(0);
			expect(counts.legendary).toBe(0);
		});

		it('should force all cards to be rare rarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.common).toBe(0);
			expect(counts.rare).toBe(10);
			expect(counts.epic).toBe(0);
			expect(counts.legendary).toBe(0);
		});

		it('should force all cards to be epic rarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				forceRarity: 'epic'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.common).toBe(0);
			expect(counts.rare).toBe(0);
			expect(counts.epic).toBe(10);
			expect(counts.legendary).toBe(0);
		});

		it('should force all cards to be legendary rarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				forceRarity: 'legendary'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.common).toBe(0);
			expect(counts.rare).toBe(0);
			expect(counts.epic).toBe(0);
			expect(counts.legendary).toBe(10);
		});

		it('should return error when forceRarity has no enabled cards', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Disable all legendary cards
			const legendaryCards = VIP_CARDS.filter((c) => c.rarity === 'legendary');
			for (const card of legendaryCards) {
				await serviceClient
					.from('vip_card_templates')
					.update({ is_enabled: false })
					.eq('id', card.id);
			}

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				forceRarity: 'legendary'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('No cards available matching filters');
			expect(data).toBeNull();

			// Cleanup: Re-enable cards
			for (const card of legendaryCards) {
				await serviceClient
					.from('vip_card_templates')
					.update({ is_enabled: true })
					.eq('id', card.id);
			}
		});
	});

	// ============================================================================
	// MIN RARITY FILTER TESTS
	// ============================================================================

	describe('minRarity filter', () => {
		it('should guarantee at least 1 rare card when minRarity is rare', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Draw 10 cards multiple times to verify guarantee
			const trials = 5;
			for (let i = 0; i < trials; i++) {
				const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
					minRarity: 'rare'
				});

				// Assert
				expect(error).toBeNull();
				expect(data).toBeDefined();
				expect(data?.cards).toHaveLength(10);

				const counts = countByRarity(data!.cards);
				// At least 1 card should be rare/epic/legendary
				const rareOrHigher = counts.rare + counts.epic + counts.legendary;
				expect(rareOrHigher).toBeGreaterThanOrEqual(1);
			}
		});

		it('should guarantee at least 1 epic card when minRarity is epic', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const trials = 5;
			for (let i = 0; i < trials; i++) {
				const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
					minRarity: 'epic'
				});

				// Assert
				expect(error).toBeNull();
				expect(data).toBeDefined();
				expect(data?.cards).toHaveLength(10);

				const counts = countByRarity(data!.cards);
				// At least 1 card should be epic/legendary
				const epicOrHigher = counts.epic + counts.legendary;
				expect(epicOrHigher).toBeGreaterThanOrEqual(1);
			}
		});

		it('should guarantee exactly 1 legendary card when minRarity is legendary', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Draw 10 cards (first should be legendary)
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				minRarity: 'legendary'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			// Exactly 1 card should be legendary (first card)
			expect(counts.legendary).toBe(1);
		});

		it('should draw remaining cards normally after minRarity guarantee', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Draw 10 cards with minRarity: 'rare'
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				minRarity: 'rare'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			// First card is rare or higher, remaining 9 follow normal distribution
			// So we should have at least 1 rare+ card and possibly some common cards
			const rareOrHigher = counts.rare + counts.epic + counts.legendary;
			expect(rareOrHigher).toBeGreaterThanOrEqual(1);

			// Remaining cards can be any rarity (including common)
			const totalCards = counts.common + counts.rare + counts.epic + counts.legendary;
			expect(totalCards).toBe(10);
		});
	});

	// ============================================================================
	// EXCLUDE CARD IDS FILTER TESTS
	// ============================================================================

	describe('excludeCardIds filter', () => {
		it('should exclude specific cards from draw pool', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Select some cards to exclude (e.g., 'bonus', 'super-bonus')
			const excludedCardIds = ['bonus', 'super-bonus', 'mega-bonus'];

			// Act: Draw 50 cards (large sample to verify exclusion)
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				excludeCardIds: excludedCardIds
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			// Verify none of the excluded cards appear
			for (const card of data!.cards) {
				expect(excludedCardIds).not.toContain(card.cardId);
			}
		});

		it('should handle excluding all cards of a specific rarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Exclude all legendary cards
			const legendaryCardIds = VIP_CARDS.filter((c) => c.rarity === 'legendary').map((c) => c.id);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				excludeCardIds: legendaryCardIds
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.legendary).toBe(0);
		});

		it('should return error when all cards are excluded', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Exclude all cards
			const allCardIds = VIP_CARDS.map((c) => c.id);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				excludeCardIds: allCardIds
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('No cards available matching filters');
			expect(data).toBeNull();
		});
	});

	// ============================================================================
	// ONLY CARDS WITH ACTIONS FILTER TESTS
	// ============================================================================

	describe('onlyCardsWithActions filter', () => {
		it('should only draw cards that have action definitions', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Draw 10 cards with onlyCardsWithActions: true
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				onlyCardsWithActions: true
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			// Verify all drawn cards have actions
			for (const card of data!.cards) {
				const cardDef = VIP_CARDS.find((c) => c.id === card.cardId);
				expect(cardDef).toBeDefined();
				expect(cardDef?.action).toBeDefined();
			}
		});

		it('should exclude cards without actions', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Get cards without actions
			const cardsWithoutActions = VIP_CARDS.filter((c) => !c.action).map((c) => c.id);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				onlyCardsWithActions: true
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			// Verify none of the cards without actions appear
			for (const card of data!.cards) {
				expect(cardsWithoutActions).not.toContain(card.cardId);
			}
		});
	});

	// ============================================================================
	// COMBINED FILTERS TESTS
	// ============================================================================

	describe('combined filters', () => {
		it('should combine minRarity and excludeCardIds filters', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Exclude some specific cards
			const excludedCardIds = ['bonus', 'super-bonus'];

			// Act: Draw with minRarity: 'rare' + excludeCardIds
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				minRarity: 'rare',
				excludeCardIds: excludedCardIds
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			// At least 1 rare or higher
			const rareOrHigher = counts.rare + counts.epic + counts.legendary;
			expect(rareOrHigher).toBeGreaterThanOrEqual(1);

			// No excluded cards
			for (const card of data!.cards) {
				expect(excludedCardIds).not.toContain(card.cardId);
			}
		});

		it('should combine forceRarity and excludeCardIds filters', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Exclude some rare cards
			const rareCards = VIP_CARDS.filter((c) => c.rarity === 'rare');
			const excludedRareCardIds = rareCards.slice(0, 2).map((c) => c.id);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				forceRarity: 'rare',
				excludeCardIds: excludedRareCardIds
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			expect(counts.rare).toBe(10);

			// No excluded cards
			for (const card of data!.cards) {
				expect(excludedRareCardIds).not.toContain(card.cardId);
			}
		});

		it('should combine onlyCardsWithActions and excludeCardIds filters', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Get a card with action and exclude it
			const cardsWithActions = VIP_CARDS.filter((c) => c.action);
			const excludedCardIds = cardsWithActions.slice(0, 2).map((c) => c.id);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				onlyCardsWithActions: true,
				excludeCardIds: excludedCardIds
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			// All cards have actions
			for (const card of data!.cards) {
				const cardDef = VIP_CARDS.find((c) => c.id === card.cardId);
				expect(cardDef?.action).toBeDefined();
				expect(excludedCardIds).not.toContain(card.cardId);
			}
		});

		it('should combine all compatible filters (minRarity + excludeCardIds + onlyCardsWithActions)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			const excludedCardIds = ['soldes', 'mega-soldes'];

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 10, {
				minRarity: 'rare',
				excludeCardIds: excludedCardIds,
				onlyCardsWithActions: true
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(10);

			const counts = countByRarity(data!.cards);
			const rareOrHigher = counts.rare + counts.epic + counts.legendary;
			expect(rareOrHigher).toBeGreaterThanOrEqual(1);

			// All cards have actions and none are excluded
			for (const card of data!.cards) {
				const cardDef = VIP_CARDS.find((c) => c.id === card.cardId);
				expect(cardDef?.action).toBeDefined();
				expect(excludedCardIds).not.toContain(card.cardId);
			}
		});
	});

	// ============================================================================
	// ERROR CASES TESTS
	// ============================================================================

	describe('error cases', () => {
		it('should reject forceRarity + minRarity combination (mutually exclusive)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act: Try to use both forceRarity and minRarity
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				forceRarity: 'rare',
				minRarity: 'epic'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('forceRarity and minRarity cannot be used together');
			expect(data).toBeNull();
		});

		it('should reject invalid rarity value for forceRarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				forceRarity: 'super-rare' // Invalid rarity
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Invalid forceRarity filter');
			expect(data).toBeNull();
		});

		it('should reject invalid rarity value for minRarity', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				minRarity: 'ultra-rare' // Invalid rarity
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Invalid minRarity filter');
			expect(data).toBeNull();
		});

		it('should reject non-existent student ID', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const teacherClient = await createAuthenticatedClient(teacher.email);
			const fakeStudentId = crypto.randomUUID();

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, fakeStudentId, 5, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Student not found');
			expect(data).toBeNull();
		});

		it('should reject count out of range (0 cards)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 0, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Invalid count');
			expect(data).toBeNull();
		});

		it('should reject count out of range (11 cards)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 11, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Invalid count');
			expect(data).toBeNull();
		});

		it('should reject unauthorized teacher (student not in their class)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher1 = await TestData.profile().withRole('teacher').create();
			const teacher2 = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher1.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			// Teacher2 is NOT the teacher of this student
			const teacher2Client = await createAuthenticatedClient(teacher2.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacher2Client, student.id, 5, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('Student is not in your classes');
			expect(data).toBeNull();
		});

		it('should reject when filters match zero cards', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Exclude all cards with actions, then require onlyCardsWithActions
			const cardsWithActions = VIP_CARDS.filter((c) => c.action).map((c) => c.id);

			// Act: This creates impossible constraints
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				onlyCardsWithActions: true,
				excludeCardIds: cardsWithActions
			});

			// Assert
			expect(error).toBeDefined();
			expect(error?.message).toContain('No cards available matching filters');
			expect(data).toBeNull();
		});
	});

	// ============================================================================
	// RETURN VALUE TESTS
	// ============================================================================

	describe('return value structure', () => {
		it('should return correct JSONB structure with all fields', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 3, {
				forceRarity: 'rare'
			});

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(data?.cards).toHaveLength(3);

			// Verify each card has all required fields
			for (const card of data!.cards) {
				expect(card.cardId).toBeDefined();
				expect(typeof card.cardId).toBe('string');

				expect(card.instanceId).toBeDefined();
				expect(typeof card.instanceId).toBe('string');

				expect(card.name).toBeDefined();
				expect(typeof card.name).toBe('string');

				expect(card.rarity).toBeDefined();
				expect(typeof card.rarity).toBe('string');
				expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);

				expect(card.earnedAt).toBeDefined();
				expect(typeof card.earnedAt).toBe('string');
				// Verify it's a valid ISO timestamp
				expect(new Date(card.earnedAt).toISOString()).toBe(card.earnedAt);
			}
		});

		it('should update student vip_cards JSONB correctly', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			const teacherClient = await createAuthenticatedClient(teacher.email);

			// Get initial vip_cards
			const { data: initialProfile } = await serviceClient
				.from('profiles')
				.select('vip_cards')
				.eq('id', student.id)
				.single();

			const initialCardCount = initialProfile?.vip_cards
				? Object.keys(initialProfile.vip_cards).length
				: 0;

			// Act
			const { data, error } = await callAwardVipCardsWithFilters(teacherClient, student.id, 5, {
				forceRarity: 'epic'
			});

			expect(error).toBeNull();
			expect(data).toBeDefined();

			// Assert: Check student's vip_cards was updated
			const { data: updatedProfile } = await serviceClient
				.from('profiles')
				.select('vip_cards')
				.eq('id', student.id)
				.single();

			expect(updatedProfile?.vip_cards).toBeDefined();
			const updatedCardCount = Object.keys(
				updatedProfile!.vip_cards as Record<string, unknown>
			).length;
			expect(updatedCardCount).toBe(initialCardCount + 5);

			// Verify the instanceIds from the response exist in the profile
			for (const card of data!.cards) {
				const cardInstance = (updatedProfile!.vip_cards as Record<string, unknown>)[
					card.instanceId
				];
				expect(cardInstance).toBeDefined();
			}
		});
	});
});
