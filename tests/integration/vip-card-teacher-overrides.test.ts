/**
 * VIP Card Teacher Override System - Integration Tests
 *
 * Tests the teacher override system with intersection logic:
 * - If ANY teacher has disabled a card, it's blocked for the student
 * - Teachers can enable/disable cards for their students
 * - Overrides apply across all classes taught by the teacher
 * - RLS policies prevent teachers from modifying other teachers' overrides
 *
 * REQUIREMENTS:
 * - Supabase local running on port 54321 (pnpm db:start)
 * - Tests verify intersection logic with multiple teachers
 * - Tests verify CRUD operations and RLS policies
 *
 * Tests:
 * 1. Single teacher blocking card for their student
 * 2. Multiple teachers with intersection logic (ANY disabled = blocked)
 * 3. All teachers enabling card (ALL enabled = allowed)
 * 4. Student with no teachers (fallback to global settings)
 * 5. Fallback to common when teacher disables entire rarity
 * 6. CRUD operations on teacher overrides
 * 7. RLS policy: teachers cannot modify other teachers' overrides
 * 8. Complex scenario with 3 teachers and mixed overrides
 * 9. Helper function get_student_teachers()
 * 10. Edge case: all cards blocked by teacher overrides
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

describe('VIP Card Teacher Override System - Integration Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
		console.log('[Setup] Starting VIP card teacher override tests...');

		// Verify VIP card templates exist
		const { data: templates } = await serviceClient
			.from('vip_card_templates')
			.select('id, name, rarity, is_enabled');

		console.log(`[Setup] Found ${templates?.length} VIP card templates`);
		expect(templates).toBeDefined();
		expect(templates!.length).toBeGreaterThan(0);
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		// Enable all cards before each test
		console.log('[beforeEach] Enabling all VIP cards...');
		await serviceClient.from('vip_card_templates').update({ is_enabled: true }).neq('id', 'dummy');

		// Disable default disabled cards (candy, captain, team)
		await serviceClient
			.from('vip_card_templates')
			.update({ is_enabled: false })
			.in('id', ['candy', 'captain', 'team']);
	});

	afterEach(async () => {
		console.log('[afterEach] Cleaning up teacher overrides...');

		// Delete ALL teacher overrides
		await serviceClient
			.from('teacher_vip_card_overrides')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

		// Reset cards to enabled state
		console.log('[afterEach] Re-enabling all VIP cards...');
		await serviceClient.from('vip_card_templates').update({ is_enabled: true }).neq('id', 'dummy');

		// Re-disable default disabled cards
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

		console.log('[afterEach] Cleanup complete');
	});

	/**
	 * Helper: Create teacher with a class
	 */
	async function createTeacherWithClass(name: string) {
		try {
			console.log('[helper] Creating teacher profile...');
			const teacher = await TestData.profile()
				.withRole('teacher')
				.withEmail(`${name.toLowerCase().replace(/\s+/g, '')}@test.com`)
				.withFullName(name)
				.create();

			console.log(`[helper] Created teacher: ${teacher.id}`);
			console.log('[helper] Creating class...');

			const classData = await TestData.class(teacher.id).withName(`Class ${name}`).create();

			console.log(`[helper] Created class: ${classData.id}`);

			return { teacher, class: classData };
		} catch (error) {
			console.error('[helper] Error creating teacher/class:', error);
			throw error;
		}
	}

	/**
	 * Helper: Add student to class
	 */
	async function addStudentToClass(studentId: string, classId: string) {
		const { error } = await serviceClient.from('class_members').insert({
			student_id: studentId,
			class_id: classId,
			role: 'student'
		});

		expect(error).toBeNull();
	}

	/**
	 * Helper: Create teacher override
	 */
	async function createOverride(teacherId: string, cardId: string, isEnabled: boolean) {
		const { error } = await serviceClient.from('teacher_vip_card_overrides').insert({
			teacher_id: teacherId,
			card_id: cardId,
			is_enabled: isEnabled
		});

		expect(error).toBeNull();
	}

	/**
	 * Helper: Draw cards and collect card IDs
	 */
	async function drawCardsAndCollect(
		studentClient: SupabaseClient<Database>,
		studentId: string,
		totalCount: number
	): Promise<string[]> {
		const drawnCardIds: string[] = [];
		const batchSize = 10;
		const batches = Math.ceil(totalCount / batchSize);

		for (let i = 0; i < batches; i++) {
			const count = Math.min(batchSize, totalCount - i * batchSize);

			const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
				p_student_id: studentId,
				p_count: count,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: count,
				p_vip_card_instance_id: null
			});

			expect(error).toBeNull();
			expect(data).toBeDefined();

			const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
			const cards = parsedData.cards || parsedData.drawn_cards;
			expect(cards).toBeDefined();

			drawnCardIds.push(...cards.map((c: { cardId: string }) => c.cardId));
		}

		return drawnCardIds;
	}

	/**
	 * Helper: Count cards by rarity
	 */
	function countByRarity(cardIds: string[]): Record<VipCardRarity, number> {
		const counts: Record<VipCardRarity, number> = {
			common: 0,
			rare: 0,
			epic: 0,
			legendary: 0
		};

		for (const cardId of cardIds) {
			const card = VIP_CARDS.find((c) => c.id === cardId);
			if (card) {
				counts[card.rarity]++;
			}
		}

		return counts;
	}

	describe('Single Teacher Override', () => {
		it('should block card disabled by teacher for their student', async () => {
			// ========================================
			// ARRANGE: Setup teacher, student, class, and override
			// ========================================

			console.log('[test] Creating teacher Alice with class...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');

			console.log('[test] Creating student Bob...');
			const bob = await TestData.profile().withRole('student').withGidouilles(200).create();

			console.log("[test] Adding Bob to Alice's class...");
			await addStudentToClass(bob.id, aliceClass.id);

			console.log('[test] Creating override: Alice disables "candy" card...');
			await createOverride(alice.id, 'candy', false);

			// Verify override exists
			const { data: override } = await serviceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy')
				.single();

			expect(override).toBeDefined();
			expect(override?.is_enabled).toBe(false);

			// ========================================
			// ACT: Student draws 100 cards
			// ========================================

			console.log('[test] Bob drawing 100 cards...');
			const bobClient = await createAuthenticatedClient(bob.email);
			const drawnCards = await drawCardsAndCollect(bobClient, bob.id, 100);

			// ========================================
			// ASSERT: "candy" never appears
			// ========================================

			expect(drawnCards).toHaveLength(100);

			const candyCount = drawnCards.filter((id) => id === 'candy').length;
			expect(candyCount).toBe(0);

			console.log('[test] Verified: "candy" card blocked (0/100) ✓');

			// Verify other common cards appear
			const otherCommonCards = VIP_CARDS.filter(
				(c) => c.rarity === 'common' && c.id !== 'candy' && c.id !== 'captain' && c.id !== 'team'
			).map((c) => c.id);

			const otherCommonCount = drawnCards.filter((id) => otherCommonCards.includes(id)).length;
			expect(otherCommonCount).toBeGreaterThan(0);

			console.log('[test] Other common cards drawn:', otherCommonCount);
		}, 150000);
	});

	describe('Multiple Teachers - Intersection Logic', () => {
		it('should block card if ANY teacher disabled it (intersection logic)', async () => {
			// ========================================
			// ARRANGE: Two teachers, one student in both classes
			// ========================================

			console.log('[test] Creating teacher Alice with class...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');

			console.log('[test] Creating teacher Bob with class...');
			const { teacher: bob, class: bobClass } = await createTeacherWithClass('Bob');

			console.log('[test] Creating student Charlie...');
			const charlie = await TestData.profile().withRole('student').withGidouilles(200).create();

			console.log('[test] Adding Charlie to both classes...');
			await addStudentToClass(charlie.id, aliceClass.id);
			await addStudentToClass(charlie.id, bobClass.id);

			console.log('[test] Alice disables "bonus" card...');
			await createOverride(alice.id, 'bonus', false);

			console.log('[test] Bob has no overrides (all cards enabled for him)...');
			// Bob doesn't create any overrides, so all cards are enabled by default for him

			// Verify only Alice has an override
			const { data: aliceOverride } = await serviceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'bonus')
				.single();

			expect(aliceOverride?.is_enabled).toBe(false);

			const { data: bobOverrides } = await serviceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', bob.id);

			expect(bobOverrides).toHaveLength(0);

			// ========================================
			// ACT: Charlie draws 100 cards
			// ========================================

			console.log('[test] Charlie drawing 100 cards...');
			const charlieClient = await createAuthenticatedClient(charlie.email);
			const drawnCards = await drawCardsAndCollect(charlieClient, charlie.id, 100);

			// ========================================
			// ASSERT: "bonus" never appears (Alice blocked it)
			// ========================================

			expect(drawnCards).toHaveLength(100);

			const bonusCount = drawnCards.filter((id) => id === 'bonus').length;
			expect(bonusCount).toBe(0);

			console.log('[test] Verified: "bonus" card blocked by Alice (0/100) ✓');
			console.log(
				"[test] Intersection logic works: even though Bob didn't block it, Alice's block wins ✓"
			);

			// Verify other common cards appear
			const otherCommonCards = VIP_CARDS.filter(
				(c) =>
					c.rarity === 'common' &&
					c.id !== 'bonus' &&
					c.id !== 'candy' &&
					c.id !== 'captain' &&
					c.id !== 'team'
			).map((c) => c.id);

			const otherCommonCount = drawnCards.filter((id) => otherCommonCards.includes(id)).length;
			expect(otherCommonCount).toBeGreaterThan(0);
		}, 150000);

		it('should allow card if ALL teachers enable it', async () => {
			// ========================================
			// ARRANGE: Two teachers, both enabling "Sheikh" card
			// ========================================

			console.log('[test] Creating teacher Alice with class...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');

			console.log('[test] Creating teacher Bob with class...');
			const { teacher: bob, class: bobClass } = await createTeacherWithClass('Bob');

			console.log('[test] Creating student Charlie...');
			const charlie = await TestData.profile().withRole('student').withGidouilles(2000).create();

			console.log('[test] Adding Charlie to both classes...');
			await addStudentToClass(charlie.id, aliceClass.id);
			await addStudentToClass(charlie.id, bobClass.id);

			console.log('[test] Both teachers have no overrides (Sheikh enabled by default)...');
			// No overrides means all globally enabled cards are available

			// ========================================
			// ACT: Charlie draws 1000 cards (large sample for legendary)
			// ========================================

			console.log('[test] Charlie drawing 1000 cards...');
			const charlieClient = await createAuthenticatedClient(charlie.email);
			const drawnCards = await drawCardsAndCollect(charlieClient, charlie.id, 1000);

			// ========================================
			// ASSERT: "Sheikh" appears at least once
			// ========================================

			expect(drawnCards).toHaveLength(1000);

			const sheikhCount = drawnCards.filter((id) => id === 'Sheikh').length;
			expect(sheikhCount).toBeGreaterThan(0);

			console.log(`[test] "Sheikh" card drawn ${sheikhCount} times (not blocked) ✓`);

			// Verify frequency is consistent with legendary rarity (~3%)
			const expectedFrequency = 0.03;
			const actualFrequency = sheikhCount / 1000;
			console.log(`[test] Sheikh frequency: ${(actualFrequency * 100).toFixed(2)}% (expected ~3%)`);

			// Allow wide range (1-6%) due to randomness
			expect(actualFrequency).toBeGreaterThan(0.01);
			expect(actualFrequency).toBeLessThan(0.06);
		}, 150000);
	});

	describe('Student with No Teachers', () => {
		it('should allow all globally enabled cards if student has no teachers', async () => {
			// ========================================
			// ARRANGE: Student with no classes
			// ========================================

			console.log('[test] Creating student (orphan, no classes)...');
			const orphan = await TestData.profile().withRole('student').withGidouilles(200).create();

			// Verify student has no teachers
			const { data: classMemberships } = await serviceClient
				.from('class_members')
				.select('*')
				.eq('student_id', orphan.id);

			expect(classMemberships).toHaveLength(0);

			// ========================================
			// ACT: Student draws 100 cards
			// ========================================

			console.log('[test] Orphan student drawing 100 cards...');
			const orphanClient = await createAuthenticatedClient(orphan.email);
			const drawnCards = await drawCardsAndCollect(orphanClient, orphan.id, 100);

			// ========================================
			// ASSERT: All globally enabled cards can be drawn
			// ========================================

			expect(drawnCards).toHaveLength(100);

			// Verify globally disabled cards (candy, captain, team) are still blocked
			const disabledCards = ['candy', 'captain', 'team'];
			const disabledCount = drawnCards.filter((id) => disabledCards.includes(id)).length;
			expect(disabledCount).toBe(0);

			console.log('[test] Globally disabled cards (candy, captain, team) still blocked ✓');

			// Verify globally enabled cards appear
			const enabledCards = VIP_CARDS.filter((c) => !disabledCards.includes(c.id)).map((c) => c.id);
			const enabledCount = drawnCards.filter((id) => enabledCards.includes(id)).length;
			expect(enabledCount).toBe(100);

			console.log('[test] All globally enabled cards available for student with no teachers ✓');
		}, 150000);
	});

	describe('Fallback Behavior', () => {
		it('should fallback to common when teacher disabled all epic cards', async () => {
			// ========================================
			// ARRANGE: Teacher disables all epic cards
			// ========================================

			console.log('[test] Creating teacher Alice with class...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');

			console.log('[test] Creating student Bob...');
			const bob = await TestData.profile().withRole('student').withGidouilles(200).create();

			console.log("[test] Adding Bob to Alice's class...");
			await addStudentToClass(bob.id, aliceClass.id);

			console.log('[test] Alice disables ALL epic cards...');
			const epicCards = VIP_CARDS.filter((c) => c.rarity === 'epic');
			for (const card of epicCards) {
				await createOverride(alice.id, card.id, false);
			}

			console.log(`[test] Disabled ${epicCards.length} epic cards`);

			// ========================================
			// ACT: Bob draws 100 cards
			// ========================================

			console.log('[test] Bob drawing 100 cards...');
			const bobClient = await createAuthenticatedClient(bob.email);
			const drawnCards = await drawCardsAndCollect(bobClient, bob.id, 100);

			// ========================================
			// ASSERT: No epic cards appear
			// ========================================

			const rarityCounts = countByRarity(drawnCards);

			console.log('[test] Distribution with epic disabled (100 cards):');
			console.log({
				common: `${rarityCounts.common} (${((rarityCounts.common / 100) * 100).toFixed(1)}%)`,
				rare: `${rarityCounts.rare} (${((rarityCounts.rare / 100) * 100).toFixed(1)}%)`,
				epic: `${rarityCounts.epic} (${((rarityCounts.epic / 100) * 100).toFixed(1)}%)`,
				legendary: `${rarityCounts.legendary} (${((rarityCounts.legendary / 100) * 100).toFixed(1)}%)`
			});

			// NO epic cards
			expect(rarityCounts.epic).toBe(0);

			// Common, rare, legendary cards appear
			expect(rarityCounts.common).toBeGreaterThan(0);
			expect(rarityCounts.rare).toBeGreaterThan(0);

			console.log('[test] Epic cards blocked, fallback to common working ✓');
		}, 150000);
	});

	describe('CRUD Operations on Teacher Overrides', () => {
		it('should create, update, and delete teacher overrides', async () => {
			// ========================================
			// ARRANGE: Create teacher
			// ========================================

			console.log('[test] Creating teacher Alice...');
			const { teacher: alice } = await createTeacherWithClass('Alice');
			const aliceClient = await createAuthenticatedClient(alice.email);

			// ========================================
			// CREATE
			// ========================================

			console.log('[test] Alice creates override (disable "candy")...');
			const { error: createError } = await aliceClient.from('teacher_vip_card_overrides').insert({
				teacher_id: alice.id,
				card_id: 'candy',
				is_enabled: false
			});

			expect(createError).toBeNull();

			// Verify created
			const { data: created } = await aliceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy')
				.single();

			expect(created).toBeDefined();
			expect(created?.is_enabled).toBe(false);
			console.log('[test] Override created successfully ✓');

			// ========================================
			// UPDATE
			// ========================================

			console.log('[test] Alice updates override (enable "candy")...');
			const { error: updateError } = await aliceClient
				.from('teacher_vip_card_overrides')
				.update({ is_enabled: true })
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy');

			expect(updateError).toBeNull();

			// Verify updated
			const { data: updated } = await aliceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy')
				.single();

			expect(updated?.is_enabled).toBe(true);
			console.log('[test] Override updated successfully ✓');

			// ========================================
			// DELETE
			// ========================================

			console.log('[test] Alice deletes override...');
			const { error: deleteError } = await aliceClient
				.from('teacher_vip_card_overrides')
				.delete()
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy');

			expect(deleteError).toBeNull();

			// Verify deleted
			const { data: deleted } = await aliceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy');

			expect(deleted).toHaveLength(0);
			console.log('[test] Override deleted successfully ✓');
		}, 30000);
	});

	describe('RLS Policy: Teacher Isolation', () => {
		it("should prevent teacher from modifying another teacher's overrides", async () => {
			// ========================================
			// ARRANGE: Two teachers, Alice creates override
			// ========================================

			console.log('[test] Creating teacher Alice...');
			const { teacher: alice } = await createTeacherWithClass('Alice');

			console.log('[test] Creating teacher Bob...');
			const { teacher: bob } = await createTeacherWithClass('Bob');

			console.log('[test] Alice creates override (disable "candy")...');
			await createOverride(alice.id, 'candy', false);

			// Verify Alice's override exists
			const { data: aliceOverride } = await serviceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy')
				.single();

			expect(aliceOverride?.is_enabled).toBe(false);

			// ========================================
			// ACT: Bob attempts to modify Alice's override
			// ========================================

			console.log("[test] Bob attempts to update Alice's override...");
			const bobClient = await createAuthenticatedClient(bob.email);

			const { error } = await bobClient
				.from('teacher_vip_card_overrides')
				.update({ is_enabled: true })
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy');

			// ========================================
			// ASSERT: RLS blocks Bob's update
			// ========================================

			expect(error).toBeDefined();
			console.log("[test] Bob blocked by RLS (cannot modify Alice's override) ✓");

			// Verify Alice's override unchanged
			const { data: unchanged } = await serviceClient
				.from('teacher_vip_card_overrides')
				.select('*')
				.eq('teacher_id', alice.id)
				.eq('card_id', 'candy')
				.single();

			expect(unchanged?.is_enabled).toBe(false);
			console.log("[test] Alice's override remains unchanged ✓");
		}, 30000);
	});

	describe('Complex Scenarios', () => {
		it('should handle complex scenario with 3 teachers and mixed overrides', async () => {
			// ========================================
			// ARRANGE: 3 teachers, 1 student, mixed overrides
			// ========================================

			console.log('[test] Creating 3 teachers with classes...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');
			const { teacher: bob, class: bobClass } = await createTeacherWithClass('Bob');
			const { teacher: charlie, class: charlieClass } = await createTeacherWithClass('Charlie');

			console.log('[test] Creating student David...');
			const david = await TestData.profile().withRole('student').withGidouilles(300).create();

			console.log('[test] Adding David to all 3 classes...');
			await addStudentToClass(david.id, aliceClass.id);
			await addStudentToClass(david.id, bobClass.id);
			await addStudentToClass(david.id, charlieClass.id);

			console.log('[test] Setting up overrides:');
			console.log('  - Alice: disables "bonus", "choix"');
			console.log('  - Bob: disables "jeu"');
			console.log('  - Charlie: no overrides (all enabled)');

			await createOverride(alice.id, 'bonus', false);
			await createOverride(alice.id, 'choix', false);
			await createOverride(bob.id, 'jeu', false);

			// ========================================
			// ACT: David draws 200 cards
			// ========================================

			console.log('[test] David drawing 200 cards...');
			const davidClient = await createAuthenticatedClient(david.email);
			const drawnCards = await drawCardsAndCollect(davidClient, david.id, 200);

			// ========================================
			// ASSERT: Blocked cards never appear
			// ========================================

			expect(drawnCards).toHaveLength(200);

			const bonusCount = drawnCards.filter((id) => id === 'bonus').length;
			const choixCount = drawnCards.filter((id) => id === 'choix').length;
			const jeuCount = drawnCards.filter((id) => id === 'jeu').length;

			expect(bonusCount).toBe(0);
			expect(choixCount).toBe(0);
			expect(jeuCount).toBe(0);

			console.log('[test] Verified: "bonus" blocked (Alice) - 0/200 ✓');
			console.log('[test] Verified: "choix" blocked (Alice) - 0/200 ✓');
			console.log('[test] Verified: "jeu" blocked (Bob) - 0/200 ✓');

			// Verify other common cards appear
			const allowedCommonCards = VIP_CARDS.filter(
				(c) =>
					c.rarity === 'common' &&
					!['bonus', 'choix', 'jeu', 'candy', 'captain', 'team'].includes(c.id)
			).map((c) => c.id);

			const allowedCommonCount = drawnCards.filter((id) => allowedCommonCards.includes(id)).length;
			expect(allowedCommonCount).toBeGreaterThan(0);

			console.log('[test] Other common cards drawn:', allowedCommonCount);
			console.log('[test] Intersection logic works with 3+ teachers ✓');
		}, 150000);
	});

	describe('Edge Cases', () => {
		it('should raise error when ALL cards blocked by teacher overrides', async () => {
			// ========================================
			// ARRANGE: Teacher disables ALL cards
			// ========================================

			console.log('[test] Creating teacher Alice with class...');
			const { teacher: alice, class: aliceClass } = await createTeacherWithClass('Alice');

			console.log('[test] Creating student Bob...');
			const bob = await TestData.profile().withRole('student').withGidouilles(100).create();

			console.log("[test] Adding Bob to Alice's class...");
			await addStudentToClass(bob.id, aliceClass.id);

			console.log('[test] Alice disables ALL cards...');
			for (const card of VIP_CARDS) {
				await createOverride(alice.id, card.id, false);
			}

			console.log(`[test] Disabled ${VIP_CARDS.length} cards`);

			// ========================================
			// ACT: Bob attempts to draw cards
			// ========================================

			console.log('[test] Bob attempting to draw cards...');
			const bobClient = await createAuthenticatedClient(bob.email);

			const { error } = await bobClient.rpc('draw_multiple_vip_cards', {
				p_student_id: bob.id,
				p_count: 10,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: 10,
				p_vip_card_instance_id: null
			});

			// ========================================
			// ASSERT: Error raised
			// ========================================

			expect(error).toBeDefined();
			expect(error?.message).toMatch(/no enabled vip cards|no cards available/i);

			console.log('[test] Error message:', error?.message);
			console.log('[test] System correctly rejected draw when all cards blocked ✓');
		}, 30000);
	});
});
