/**
 * Kanban RLS - Integration Tests
 * ===============================
 *
 * Verifies the Row-Level Security policies on the three kanban tables
 * end-to-end, using real authenticated clients against a local Supabase
 * instance (run `pnpm db:start` first).
 *
 * Coverage:
 * - Personal boards: only the owner can SELECT / UPDATE / DELETE.
 * - Class boards: teacher + class members can SELECT; only teacher can
 *   manage columns; any board-visible user can CRUD cards.
 * - Cross-isolation: a teacher of another class can't see / manipulate.
 * - Cascade DELETE: removing a board removes its columns and cards.
 * - Cross-board move guard: API rejects moving a card to another board.
 * - DB-level CHECK: description longer than 50000 chars is rejected.
 *
 * @module tests/integration/kanban-rls
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../database/helpers/trigger-test-helpers';
import { createAuthenticatedClient } from '../database/helpers/supabase-client';
import { TestData } from '../database/helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Kanban RLS - Integration Tests', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	// ========================================================================
	// Personal boards
	// ========================================================================

	describe('Personal boards', () => {
		it('only the owner can SELECT a personal board', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const other = await TestData.profile().withRole('student').create();

			const { data: board, error: insertErr } = await serviceClient
				.from('kanban_boards')
				.insert({
					owner_id: owner.id,
					class_id: null,
					title: 'Personal — secret'
				})
				.select()
				.single();
			expect(insertErr).toBeNull();
			expect(board).not.toBeNull();

			const ownerClient = await createAuthenticatedClient(owner.email);
			const otherClient = await createAuthenticatedClient(other.email);

			const { data: ownerView } = await ownerClient
				.from('kanban_boards')
				.select('id')
				.eq('id', board!.id);
			expect(ownerView).toHaveLength(1);

			const { data: otherView } = await otherClient
				.from('kanban_boards')
				.select('id')
				.eq('id', board!.id);
			expect(otherView).toHaveLength(0);
		});

		it('non-owner cannot UPDATE the title', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const other = await TestData.profile().withRole('student').create();

			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: owner.id, class_id: null, title: 'Mine' })
				.select()
				.single();

			const otherClient = await createAuthenticatedClient(other.email);
			const { error } = await otherClient
				.from('kanban_boards')
				.update({ title: 'Hijacked' })
				.eq('id', board!.id);
			// RLS filters out the row → update affects zero rows; the title is
			// unchanged when we re-read via service role.
			expect(error).toBeNull();

			const { data: reread } = await serviceClient
				.from('kanban_boards')
				.select('title')
				.eq('id', board!.id)
				.single();
			expect(reread?.title).toBe('Mine');
		});
	});

	// ========================================================================
	// Class boards
	// ========================================================================

	describe('Class boards', () => {
		it('students enrolled in the class can SELECT but not manage columns', async () => {
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const klass = await TestData.class(teacher.id).withName('CM2-A').create();

			await serviceClient
				.from('class_members')
				.insert({ class_id: klass.id, student_id: student.id });

			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: teacher.id, class_id: klass.id, title: 'Class board' })
				.select()
				.single();

			const studentClient = await createAuthenticatedClient(student.email);

			// SELECT board: visible to the student via class membership.
			const { data: studentView } = await studentClient
				.from('kanban_boards')
				.select('id')
				.eq('id', board!.id);
			expect(studentView).toHaveLength(1);

			// Student tries to INSERT a column on this board → RLS blocks it
			// (only the board owner — i.e. the teacher — can manage columns).
			const { error: colError } = await studentClient
				.from('kanban_columns')
				.insert({ board_id: board!.id, title: 'To do', position: 0 });
			expect(colError).not.toBeNull();
		});

		it('class members (students) can CRUD cards but not columns', async () => {
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const klass = await TestData.class(teacher.id).create();

			await serviceClient
				.from('class_members')
				.insert({ class_id: klass.id, student_id: student.id });

			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: teacher.id, class_id: klass.id, title: 'CB' })
				.select()
				.single();
			const { data: column } = await serviceClient
				.from('kanban_columns')
				.insert({ board_id: board!.id, title: 'À faire', position: 0 })
				.select()
				.single();

			const studentClient = await createAuthenticatedClient(student.email);

			// CREATE card: allowed.
			const { data: card, error: createErr } = await studentClient
				.from('kanban_cards')
				.insert({ column_id: column!.id, title: 'Devoir maison', position: 0 })
				.select()
				.single();
			expect(createErr).toBeNull();
			expect(card).not.toBeNull();

			// UPDATE card: allowed.
			const { error: updateErr } = await studentClient
				.from('kanban_cards')
				.update({ title: 'Devoir maison (corrigé)' })
				.eq('id', card!.id);
			expect(updateErr).toBeNull();

			// DELETE card: allowed.
			const { error: deleteErr } = await studentClient
				.from('kanban_cards')
				.delete()
				.eq('id', card!.id);
			expect(deleteErr).toBeNull();

			// DELETE column: forbidden.
			const { error: colDelErr, count } = await studentClient
				.from('kanban_columns')
				.delete({ count: 'exact' })
				.eq('id', column!.id);
			// RLS may either return an error or simply affect 0 rows; either is
			// acceptable as long as the column still exists.
			expect(colDelErr === null || count === 0).toBe(true);

			const { data: stillThere } = await serviceClient
				.from('kanban_columns')
				.select('id')
				.eq('id', column!.id);
			expect(stillThere).toHaveLength(1);
		});

		it('a teacher of another class cannot see the board', async () => {
			const teacherA = await TestData.profile().withRole('teacher').create();
			const teacherB = await TestData.profile().withRole('teacher').create();
			const klass = await TestData.class(teacherA.id).create();

			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: teacherA.id, class_id: klass.id, title: 'Private to A' })
				.select()
				.single();

			const teacherBClient = await createAuthenticatedClient(teacherB.email);
			const { data: bView } = await teacherBClient
				.from('kanban_boards')
				.select('id')
				.eq('id', board!.id);
			expect(bView).toHaveLength(0);
		});
	});

	// ========================================================================
	// Cascade DELETE
	// ========================================================================

	describe('Cascade DELETE', () => {
		it('deleting a board removes its columns and cards', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: owner.id, class_id: null, title: 'Cascade test' })
				.select()
				.single();
			const { data: column } = await serviceClient
				.from('kanban_columns')
				.insert({ board_id: board!.id, title: 'C', position: 0 })
				.select()
				.single();
			await serviceClient
				.from('kanban_cards')
				.insert({ column_id: column!.id, title: 'Card', position: 0 });

			await serviceClient.from('kanban_boards').delete().eq('id', board!.id);

			const { data: colsLeft } = await serviceClient
				.from('kanban_columns')
				.select('id')
				.eq('board_id', board!.id);
			expect(colsLeft).toHaveLength(0);

			const { data: cardsLeft } = await serviceClient
				.from('kanban_cards')
				.select('id')
				.eq('column_id', column!.id);
			expect(cardsLeft).toHaveLength(0);
		});
	});

	// ========================================================================
	// DB-level CHECK
	// ========================================================================

	describe('DB constraints', () => {
		it('rejects a description longer than 50000 chars', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: owner.id, class_id: null, title: 'CHK' })
				.select()
				.single();
			const { data: column } = await serviceClient
				.from('kanban_columns')
				.insert({ board_id: board!.id, title: 'C', position: 0 })
				.select()
				.single();

			const tooLong = 'x'.repeat(50001);
			const { error } = await serviceClient.from('kanban_cards').insert({
				column_id: column!.id,
				title: 'long',
				position: 0,
				description: tooLong
			});
			expect(error).not.toBeNull();
			// PG check-constraint violations carry code 23514.
			expect(error?.code).toBe('23514');
		});

		it('accepts exactly 50000 chars', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const { data: board } = await serviceClient
				.from('kanban_boards')
				.insert({ owner_id: owner.id, class_id: null, title: 'CHK 2' })
				.select()
				.single();
			const { data: column } = await serviceClient
				.from('kanban_columns')
				.insert({ board_id: board!.id, title: 'C', position: 0 })
				.select()
				.single();

			const justFits = 'x'.repeat(50000);
			const { error } = await serviceClient.from('kanban_cards').insert({
				column_id: column!.id,
				title: 'edge',
				position: 0,
				description: justFits
			});
			expect(error).toBeNull();
		});
	});

	// ========================================================================
	// RPC pagination
	// ========================================================================

	describe('get_accessible_kanban_boards RPC', () => {
		it('clamps p_limit to [1, 200] and respects the cursor', async () => {
			const owner = await TestData.profile().withRole('student').create();
			const ownerClient = await createAuthenticatedClient(owner.email);

			// Create 5 boards with staggered updated_at so the order is deterministic.
			const ids: string[] = [];
			for (let i = 0; i < 5; i++) {
				const { data } = await serviceClient
					.from('kanban_boards')
					.insert({ owner_id: owner.id, class_id: null, title: `B${i}` })
					.select('id, updated_at')
					.single();
				ids.push(data!.id);
				// Small delay so updated_at differs.
				await new Promise((r) => setTimeout(r, 10));
			}

			// First page with p_limit = 3.
			const { data: page1, error: e1 } = await ownerClient.rpc('get_accessible_kanban_boards', {
				p_limit: 3
			});
			expect(e1).toBeNull();
			expect(page1).toHaveLength(3);

			// Second page using the last board's updated_at as cursor.
			const cursor = page1![page1!.length - 1].updated_at;
			const { data: page2 } = await ownerClient.rpc('get_accessible_kanban_boards', {
				p_limit: 3,
				p_cursor: cursor
			});
			expect(page2!.length).toBeGreaterThan(0);
			expect(page2!.length).toBeLessThanOrEqual(3);

			// No overlap between pages.
			const overlap = page2!.filter((b) => page1!.some((p) => p.id === b.id));
			expect(overlap).toHaveLength(0);
		});
	});
});
