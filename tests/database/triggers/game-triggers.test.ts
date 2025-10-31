/**
 * Game System Trigger Tests
 *
 * Tests for Navadra game system triggers
 *
 * Triggers tested:
 * - trigger_create_game_profile_on_user_creation (AFTER INSERT on profiles)
 * - trigger_award_gidouilles_on_combat_victory (AFTER UPDATE on game_combats)
 * - trigger_update_player_combat_stats (AFTER UPDATE on game_combats)
 * - trigger_ensure_single_active_deck (BEFORE INSERT OR UPDATE on game_spell_decks)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	waitForCondition,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Game System Triggers', () => {
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

	describe('trigger_create_game_profile_on_user_creation', () => {
		it('should create game_players row when student profile is created', async () => {
			// Arrange & Act: Create student profile
			const student = await TestData.profile().withRole('student').create();

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: game_players row should exist
			const { data: gamePlayer } = await serviceClient
				.from('game_players')
				.select()
				.eq('user_id', student.id)
				.maybeSingle();

			expect(gamePlayer).not.toBeNull();
			expect(gamePlayer?.user_id).toBe(student.id);
		});

		it('should NOT create game_players row for teacher', async () => {
			// Arrange & Act
			const teacher = await TestData.profile().withRole('teacher').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: No game_players row should exist
			const { data: gamePlayer } = await serviceClient
				.from('game_players')
				.select()
				.eq('user_id', teacher.id)
				.maybeSingle();

			expect(gamePlayer).toBeNull();
		});

		it('should NOT create game_players row for admin', async () => {
			// Arrange & Act
			const admin = await TestData.profile().withRole('admin').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: No game_players row should exist
			const { data: gamePlayer } = await serviceClient
				.from('game_players')
				.select()
				.eq('user_id', admin.id)
				.maybeSingle();

			expect(gamePlayer).toBeNull();
		});
	});

	describe('trigger_award_gidouilles_on_combat_victory', () => {
		it('should award gidouilles to organizer on combat victory', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').withGidouilles(100).create();

			// Wait for game_players creation
			await waitForCondition(
				async () => {
					const { data } = await serviceClient
						.from('game_players')
						.select()
						.eq('user_id', organizer.id)
						.maybeSingle();
					return data !== null;
				},
				5000,
				100
			);

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.create();

			// Act: Complete combat with victory
			await serviceClient
				.from('game_combats')
				.update({ status: 'completed', outcome: 'victory' })
				.eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Organizer should have received gidouilles
			// Formula: XP / 10 + 5 bonus = 100/10 + 5 = 15
			const { data: updatedOrganizer } = await serviceClient
				.from('profiles')
				.select('gidouilles')
				.eq('id', organizer.id)
				.single();

			expect(updatedOrganizer?.gidouilles).toBe(115); // 100 + 15
		});

		it('should award gidouilles to all ready participants', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').withGidouilles(100).create();
			const participant1 = await TestData.profile().withRole('student').withGidouilles(50).create();
			const participant2 = await TestData.profile().withRole('student').withGidouilles(75).create();

			// Wait for game_players creation
			await new Promise((resolve) => setTimeout(resolve, 200));

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.withReadyPlayers([participant1.id, participant2.id])
				.create();

			// Act: Complete combat with victory
			await serviceClient
				.from('game_combats')
				.update({ status: 'completed', outcome: 'victory' })
				.eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 200));

			// Assert: All should have received gidouilles (15 each)
			const { data: profiles } = await serviceClient
				.from('profiles')
				.select('id, gidouilles')
				.in('id', [organizer.id, participant1.id, participant2.id]);

			const gidouillesMap = new Map(profiles?.map((p) => [p.id, p.gidouilles]));

			expect(gidouillesMap.get(organizer.id)).toBe(115); // 100 + 15
			expect(gidouillesMap.get(participant1.id)).toBe(65); // 50 + 15
			expect(gidouillesMap.get(participant2.id)).toBe(90); // 75 + 15
		});

		it('should NOT award gidouilles on defeat', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').withGidouilles(100).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.create();

			// Act: Complete combat with defeat
			await serviceClient
				.from('game_combats')
				.update({ status: 'completed', outcome: 'defeat' })
				.eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: No gidouilles awarded
			const { data: organizer2 } = await serviceClient
				.from('profiles')
				.select('gidouilles')
				.eq('id', organizer.id)
				.single();

			expect(organizer2?.gidouilles).toBe(100); // Unchanged
		});

		it('should only fire when status changes to completed', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').withGidouilles(100).create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.create();

			// Act: Update other fields but not status
			await serviceClient.from('game_combats').update({ xp_gained: 200 }).eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: No gidouilles awarded yet
			const { data: organizer2 } = await serviceClient
				.from('profiles')
				.select('gidouilles')
				.eq('id', organizer.id)
				.single();

			expect(organizer2?.gidouilles).toBe(100); // Unchanged
		});
	});

	describe('trigger_update_player_combat_stats', () => {
		it('should increment total_combats and combats_won on victory', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Get initial stats
			const { data: initialStats } = await serviceClient
				.from('game_players')
				.select('total_combats, combats_won, combats_lost')
				.eq('user_id', organizer.id)
				.single();

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.create();

			// Act: Complete combat with victory
			await serviceClient
				.from('game_combats')
				.update({ status: 'completed', outcome: 'victory' })
				.eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 200));

			// Assert: Stats updated
			const { data: updatedStats } = await serviceClient
				.from('game_players')
				.select('total_combats, combats_won, combats_lost')
				.eq('user_id', organizer.id)
				.single();

			expect(updatedStats?.total_combats).toBe((initialStats?.total_combats || 0) + 1);
			expect(updatedStats?.combats_won).toBe((initialStats?.combats_won || 0) + 1);
			expect(updatedStats?.combats_lost).toBe(initialStats?.combats_lost || 0); // Unchanged
		});

		it('should increment total_combats and combats_lost on defeat', async () => {
			// Arrange
			const organizer = await TestData.profile().withRole('student').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			const { data: initialStats } = await serviceClient
				.from('game_players')
				.select('total_combats, combats_won, combats_lost')
				.eq('user_id', organizer.id)
				.single();

			const combat = await TestData.gameCombat(organizer.id)
				.withStatus('active')
				.withXp(100)
				.create();

			// Act: Complete combat with defeat
			await serviceClient
				.from('game_combats')
				.update({ status: 'completed', outcome: 'defeat' })
				.eq('id', combat.id);

			await new Promise((resolve) => setTimeout(resolve, 200));

			// Assert: Stats updated
			const { data: updatedStats } = await serviceClient
				.from('game_players')
				.select('total_combats, combats_won, combats_lost')
				.eq('user_id', organizer.id)
				.single();

			expect(updatedStats?.total_combats).toBe((initialStats?.total_combats || 0) + 1);
			expect(updatedStats?.combats_lost).toBe((initialStats?.combats_lost || 0) + 1);
			expect(updatedStats?.combats_won).toBe(initialStats?.combats_won || 0); // Unchanged
		});
	});

	describe('trigger_ensure_single_active_deck (WHEN clause)', () => {
		it('should deactivate other decks when setting a deck to active', async () => {
			// Arrange: Create student with multiple decks
			const student = await TestData.profile().withRole('student').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Create 2 decks, first one active
			await serviceClient.from('game_spell_decks').insert({
				user_id: student.id,
				name: 'Deck 1',
				is_active: true
			});

			const { data: deck2 } = await serviceClient
				.from('game_spell_decks')
				.insert({
					user_id: student.id,
					name: 'Deck 2',
					is_active: false
				})
				.select()
				.single();

			// Act: Activate deck2
			await serviceClient.from('game_spell_decks').update({ is_active: true }).eq('id', deck2!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only deck2 should be active
			const { data: decks } = await serviceClient
				.from('game_spell_decks')
				.select('id, is_active')
				.eq('user_id', student.id)
				.order('created_at');

			expect(decks).toHaveLength(2);
			expect(decks?.[0].is_active).toBe(false); // deck1 deactivated
			expect(decks?.[1].is_active).toBe(true); // deck2 active
		});

		it('should only fire when is_active changes to true (WHEN clause)', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			const { data: deck1 } = await serviceClient
				.from('game_spell_decks')
				.insert({
					user_id: student.id,
					name: 'Deck 1',
					is_active: true
				})
				.select()
				.single();

			const { data: deck2 } = await serviceClient
				.from('game_spell_decks')
				.insert({
					user_id: student.id,
					name: 'Deck 2',
					is_active: false
				})
				.select()
				.single();

			// Act: Update deck2 name but keep is_active = false
			await serviceClient
				.from('game_spell_decks')
				.update({ name: 'Updated Deck 2' })
				.eq('id', deck2!.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: deck1 should still be active (trigger didn't fire)
			const { data: deck1After } = await serviceClient
				.from('game_spell_decks')
				.select('is_active')
				.eq('id', deck1!.id)
				.single();

			expect(deck1After?.is_active).toBe(true);
		});
	});
});
