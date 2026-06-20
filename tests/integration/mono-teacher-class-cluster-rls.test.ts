/**
 * Mono-teacher — class-cluster RLS after dropping `teacher_id` — Integration Tests
 * ===============================================================================
 *
 * Refactor « professeur unique » : la colonne `teacher_id` a été retirée de
 * classes, class_chapters, class_journal_entries, class_schedules, game_timeslots
 * et evaluation_tasks. La propriété passe désormais par le RÔLE
 * (`public.is_teacher_or_admin()`) au lieu de `teacher_id = auth.uid()`.
 *
 * Ces tests épinglent le contrat RLS post-migration, avec de vrais clients
 * authentifiés (RLS réellement appliqué) :
 *   - le prof unique ET l'admin gèrent toutes les lignes (CRUD) ;
 *   - un élève membre LIT les lignes de sa classe (selon les policies élève) ;
 *   - un élève n'ÉCRIT jamais ;
 *   - un élève non-membre ne lit pas.
 *
 * Migration : 20260620090000_drop_class_teacher_id_mono_teacher.sql
 * NB : le trigger mono-prof interdit ≥ 2 comptes teacher → un seul teacher par
 * test ; cleanupAllTestData() entre les tests.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/mono-teacher-class-cluster-rls
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Mono-teacher class-cluster RLS (no teacher_id) - Integration Tests', () => {
	let service: SupabaseClient<Database>;

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
	});

	/** Create a class and enrol `studentId` as an active member. */
	async function classWithMember(studentId: string) {
		const cls = await TestData.class().create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: cls.id, student_id: studentId, status: 'active' });
		expect(error).toBeNull();
		return cls;
	}

	// ========================================================================
	// classes — ownership is now role-based (insert/update/delete/view_own)
	// ========================================================================

	it('the teacher can create, read, update and delete any class', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const tc = await createAuthenticatedClient(teacher.email);

		const { data: created, error: insErr } = await tc
			.from('classes')
			.insert({ name: 'Maths 6e', join_code: `MONO${Math.random().toString(36).slice(2, 7)}` })
			.select()
			.single();
		expect(insErr).toBeNull();
		expect(created).not.toBeNull();

		const { data: read } = await tc.from('classes').select('id').eq('id', created!.id);
		expect(read).toHaveLength(1);

		const { error: updErr } = await tc
			.from('classes')
			.update({ name: 'Maths 6e B' })
			.eq('id', created!.id);
		expect(updErr).toBeNull();

		const { error: delErr } = await tc.from('classes').delete().eq('id', created!.id);
		expect(delErr).toBeNull();
		const { data: gone } = await service.from('classes').select('id').eq('id', created!.id);
		expect(gone).toHaveLength(0);
	});

	it('the admin can create a class (role-based ownership covers admin)', async () => {
		const admin = await TestData.profile().withRole('admin').create();
		// The sole teacher always exists in prod; the class chat-room trigger
		// attributes the auto-created room to them.
		await TestData.profile().withRole('teacher').create();
		const ac = await createAuthenticatedClient(admin.email);

		const { data, error } = await ac
			.from('classes')
			.insert({ name: 'Admin class', join_code: `ADM${Math.random().toString(36).slice(2, 7)}` })
			.select()
			.single();
		expect(error).toBeNull();
		expect(data).not.toBeNull();
	});

	it('a student cannot create a class, but reads a class they are a member of', async () => {
		await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);
		const sc = await createAuthenticatedClient(student.email);

		const { error: insErr } = await sc
			.from('classes')
			.insert({ name: 'Hack', join_code: `HACK${Math.random().toString(36).slice(2, 7)}` })
			.select();
		expect(insErr).not.toBeNull();

		const { data: read } = await sc.from('classes').select('id').eq('id', cls.id);
		expect(read).toHaveLength(1);
	});

	it('a non-member student does not see a class', async () => {
		await TestData.profile().withRole('teacher').create();
		const outsider = await TestData.profile().withRole('student').create();
		const cls = await TestData.class().create();

		const sc = await createAuthenticatedClient(outsider.email);
		const { data } = await sc.from('classes').select('id').eq('id', cls.id);
		expect(data).toHaveLength(0);
	});

	// ========================================================================
	// class_chapters — teacher manages; student reads visible chapters of class
	// ========================================================================

	it('the teacher manages chapters; a member student reads only visible ones', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);

		const tc = await createAuthenticatedClient(teacher.email);
		const { data: visible, error: insErr } = await tc
			.from('class_chapters')
			.insert({ class_id: cls.id, title: 'Visible', is_visible: true })
			.select()
			.single();
		expect(insErr).toBeNull();

		const { data: hidden } = await tc
			.from('class_chapters')
			.insert({ class_id: cls.id, title: 'Hidden', is_visible: false })
			.select()
			.single();

		const sc = await createAuthenticatedClient(student.email);
		const { data: studentSees } = await sc
			.from('class_chapters')
			.select('id')
			.eq('class_id', cls.id);
		const ids = (studentSees ?? []).map((r) => r.id);
		expect(ids).toContain(visible!.id);
		expect(ids).not.toContain(hidden!.id);

		// student cannot write a chapter
		const { error: hackErr } = await sc
			.from('class_chapters')
			.insert({ class_id: cls.id, title: 'Hack', is_visible: true })
			.select();
		expect(hackErr).not.toBeNull();
	});

	// ========================================================================
	// class_journal_entries — teacher manages; student reads published past
	// ========================================================================

	it('the teacher manages journal entries; a member student reads only published past ones', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);
		const today = new Date().toISOString().slice(0, 10);

		const tc = await createAuthenticatedClient(teacher.email);
		const { data: published, error: insErr } = await tc
			.from('class_journal_entries')
			.insert({ class_id: cls.id, entry_date: today, is_published: true })
			.select()
			.single();
		expect(insErr).toBeNull();

		// Distinct date: (class_id, entry_date) is unique.
		const { data: draft, error: draftErr } = await tc
			.from('class_journal_entries')
			.insert({ class_id: cls.id, entry_date: '2020-01-01', is_published: false })
			.select()
			.single();
		expect(draftErr).toBeNull();

		const sc = await createAuthenticatedClient(student.email);
		const { data: seen } = await sc
			.from('class_journal_entries')
			.select('id')
			.eq('class_id', cls.id);
		const ids = (seen ?? []).map((r) => r.id);
		expect(ids).toContain(published!.id);
		expect(ids).not.toContain(draft!.id);

		const { error: hackErr } = await sc
			.from('class_journal_entries')
			.insert({ class_id: cls.id, entry_date: today, is_published: true })
			.select();
		expect(hackErr).not.toBeNull();
	});

	// ========================================================================
	// class_schedules — teacher manages; member student reads their class's
	// ========================================================================

	it('the teacher manages schedules; a member student reads them; a student cannot write', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);

		const tc = await createAuthenticatedClient(teacher.email);
		const { data: sched, error: insErr } = await tc
			.from('class_schedules')
			.insert({ class_id: cls.id, day_of_week: 1, start_time: '08:00', end_time: '09:00' })
			.select()
			.single();
		expect(insErr).toBeNull();

		const sc = await createAuthenticatedClient(student.email);
		const { data: seen } = await sc.from('class_schedules').select('id').eq('id', sched!.id);
		expect(seen).toHaveLength(1);

		const { error: hackErr } = await sc
			.from('class_schedules')
			.insert({ class_id: cls.id, day_of_week: 2, start_time: '10:00', end_time: '11:00' })
			.select();
		expect(hackErr).not.toBeNull();
	});

	// ========================================================================
	// game_timeslots — teacher manages; member student reads their class's
	// ========================================================================

	it('the teacher manages game timeslots; a member student reads them', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);

		const tc = await createAuthenticatedClient(teacher.email);
		const { data: slot, error: insErr } = await tc
			.from('game_timeslots')
			.insert({
				class_id: cls.id,
				name: 'Slot',
				challenge_ids: [],
				difficulty: 1,
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 3600_000).toISOString()
			})
			.select()
			.single();
		expect(insErr).toBeNull();

		const sc = await createAuthenticatedClient(student.email);
		const { data: seen } = await sc.from('game_timeslots').select('id').eq('id', slot!.id);
		expect(seen).toHaveLength(1);

		const { error: hackErr } = await sc
			.from('game_timeslots')
			.insert({
				class_id: cls.id,
				name: 'Hack',
				challenge_ids: [],
				difficulty: 1,
				starts_at: new Date().toISOString(),
				ends_at: new Date(Date.now() + 3600_000).toISOString()
			})
			.select();
		expect(hackErr).not.toBeNull();
	});

	// ========================================================================
	// evaluation_tasks — teacher manages; member student reads class tasks
	// ========================================================================

	it('the teacher manages evaluation tasks; a member student reads their class tasks; a student cannot write', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);

		const tc = await createAuthenticatedClient(teacher.email);
		const { data: task, error: insErr } = await tc
			.from('evaluation_tasks')
			.insert({ class_id: cls.id, niveau_scolaire: '6e', name: 'Eval 1' })
			.select()
			.single();
		expect(insErr).toBeNull();

		const sc = await createAuthenticatedClient(student.email);
		const { data: seen } = await sc.from('evaluation_tasks').select('id').eq('id', task!.id);
		expect(seen).toHaveLength(1);

		const { error: hackErr } = await sc
			.from('evaluation_tasks')
			.insert({ class_id: cls.id, niveau_scolaire: '6e', name: 'Hack' })
			.select();
		expect(hackErr).not.toBeNull();
	});
});
