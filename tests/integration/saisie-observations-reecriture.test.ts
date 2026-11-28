/**
 * Saisie des observations d'une tâche : réécriture de la grille (L39)
 * ====================================================================
 *
 * La saisie supprimait les observations de la tâche puis réinsérait la grille.
 * Le prof n'avait aucune policy DELETE sur `skill_attempts` : la suppression
 * ne supprimait rien, sans erreur, et chaque enregistrement doublait la grille.
 * Rien ne liait non plus les deux écritures : un refus à l'insertion perdait la
 * grille.
 *
 * Contrat épinglé (accord de David, 2026-11-28) :
 *   - `save_evaluation_task_grid(task, rows)` réécrit la grille en une transaction ;
 *   - deux enregistrements → une seule grille, la dernière ;
 *   - une case retirée de la grille → le cache de l'élève est recalculé ;
 *   - une ligne refusée → rien n'est changé ;
 *   - le prof ne supprime que des observations `teacher` (jamais une trace d'élève) ;
 *   - un élève ne peut rien effacer ;
 *   - un élève archivé, absent de la nouvelle grille, garde ses observations ;
 *   - un élève qui a des observations reste supprimable (RGPD, art. 17).
 *
 * @module tests/integration/saisie-observations-reecriture
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	createServiceRoleClient,
	TestData,
	createAuthenticatedClient,
	getObservableSkill,
	createEvaluationTask,
	createFakeTemplate,
	getObservableState,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

let service: SupabaseClient<Database>;

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCompetenceTestData();
});

interface Decor {
	teacherClient: SupabaseClient<Database>;
	studentClient: SupabaseClient<Database>;
	studentId: string;
	teacherId: string;
	classId: string;
	taskId: string;
	obsA: string;
	obsB: string;
}

async function decor(): Promise<Decor> {
	const teacher = await TestData.profile().withRole('teacher').create();
	const student = await TestData.profile().create();
	const cls = await TestData.class().create();
	const { error } = await service
		.from('class_members')
		.insert({ class_id: cls.id, student_id: student.id, status: 'active' });
	expect(error).toBeNull();
	const taskId = await createEvaluationTask(service, { teacherId: teacher.id, classId: cls.id });
	const obsA = (await getObservableSkill(service, 'chercher', 'A1')).id;
	const obsB = (await getObservableSkill(service, 'chercher', 'A2')).id;
	return {
		teacherClient: await createAuthenticatedClient(teacher.email),
		studentClient: await createAuthenticatedClient(student.email),
		studentId: student.id,
		teacherId: teacher.id,
		classId: cls.id,
		taskId,
		obsA,
		obsB
	};
}

async function taskRows(taskId: string) {
	const { data, error } = await service
		.from('skill_attempts')
		.select('student_id, observable_id, code, source')
		.eq('task_id', taskId);
	expect(error).toBeNull();
	return data ?? [];
}

describe('save_evaluation_task_grid (L39)', () => {
	it('deux enregistrements donnent une seule grille, la dernière', async () => {
		const d = await decor();
		const first = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [
				{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' },
				{ student_id: d.studentId, observable_id: d.obsB, code: 'minus' }
			]
		});
		expect(first.error).toBeNull();
		expect(first.data).toBe(2);

		const second = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [
				{ student_id: d.studentId, observable_id: d.obsA, code: 'minus' },
				{ student_id: d.studentId, observable_id: d.obsB, code: 'plus' }
			]
		});
		expect(second.error).toBeNull();

		const rows = await taskRows(d.taskId);
		expect(rows).toHaveLength(2);
		const codes = Object.fromEntries(rows.map((r) => [r.observable_id, r.code]));
		expect(codes).toEqual({ [d.obsA]: 'minus', [d.obsB]: 'plus' });
		expect(rows.every((r) => r.source === 'teacher')).toBe(true);

		// Le cache suit la dernière grille : une seule observation par case.
		const stateA = await getObservableState(service, d.studentId, d.obsA);
		expect(stateA).toMatchObject({ count_plus: 0, count_minus: 1 });
	});

	it('une case retirée de la grille ne laisse pas de cache périmé', async () => {
		const d = await decor();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [
				{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' },
				{ student_id: d.studentId, observable_id: d.obsB, code: 'plus' }
			]
		});
		expect(await getObservableState(service, d.studentId, d.obsB)).not.toBeNull();

		const { error } = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});
		expect(error).toBeNull();
		expect(await taskRows(d.taskId)).toHaveLength(1);
		expect(await getObservableState(service, d.studentId, d.obsB)).toBeNull();
	});

	it('une ligne refusée ne change rien : la grille précédente reste', async () => {
		const d = await decor();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});

		const { error } = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [
				{ student_id: d.studentId, observable_id: d.obsA, code: 'minus' },
				{ student_id: d.studentId, observable_id: d.obsB, code: 'peut-etre' }
			]
		});
		expect(error).not.toBeNull();

		const rows = await taskRows(d.taskId);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ observable_id: d.obsA, code: 'plus' });
	});

	it("un élève ne peut rien effacer d'une grille", async () => {
		const d = await decor();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});

		const viaRpc = await d.studentClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'minus' }]
		});
		expect(viaRpc.error).not.toBeNull();

		const viaDelete = await d.studentClient
			.from('skill_attempts')
			.delete()
			.eq('task_id', d.taskId)
			.select('id');
		expect(viaDelete.data ?? []).toHaveLength(0);

		expect(await taskRows(d.taskId)).toHaveLength(1);
	});

	it("le prof ne supprime pas une trace d'élève", async () => {
		const d = await decor();
		const templateId = await createFakeTemplate(service, d.teacherId);
		const { data: loose, error: insErr } = await service
			.from('skill_attempts')
			.insert({
				student_id: d.studentId,
				template_id: templateId,
				success: true,
				source: 'auto'
			})
			.select('id')
			.single();
		expect(insErr).toBeNull();

		const { data: deleted, error } = await d.teacherClient
			.from('skill_attempts')
			.delete()
			.eq('id', loose!.id)
			.select('id');
		expect(error).toBeNull();
		expect(deleted ?? []).toHaveLength(0);
	});

	it('le prof supprime une observation de tâche de ses élèves', async () => {
		const d = await decor();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});
		const { data: deleted, error } = await d.teacherClient
			.from('skill_attempts')
			.delete()
			.eq('task_id', d.taskId)
			.select('id');
		expect(error).toBeNull();
		expect(deleted ?? []).toHaveLength(1);
	});

	it('un élève archivé, absent de la nouvelle grille, garde ses observations', async () => {
		const d = await decor();
		const other = await TestData.profile().create();
		const { error: memErr } = await service
			.from('class_members')
			.insert({ class_id: d.classId, student_id: other.id, status: 'active' });
		expect(memErr).toBeNull();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [
				{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' },
				{ student_id: other.id, observable_id: d.obsA, code: 'plus' }
			]
		});
		const { error: archErr } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('class_id', d.classId)
			.eq('student_id', other.id)
			.select('student_id');
		expect(archErr).toBeNull();

		const { error } = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'minus' }]
		});
		expect(error).toBeNull();

		const rows = await taskRows(d.taskId);
		expect(rows).toHaveLength(2);
		expect(rows.find((r) => r.student_id === other.id)).toMatchObject({ code: 'plus' });
	});

	it('un élève qui a des observations de prof reste supprimable', async () => {
		const d = await decor();
		const { error: saveErr } = await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});
		expect(saveErr).toBeNull();

		const { error } = await service.auth.admin.deleteUser(d.studentId);
		expect(error).toBeNull();
		expect(await taskRows(d.taskId)).toHaveLength(0);
	});

	it('une tâche saisie reste supprimable, et le cache de ses cases suit', async () => {
		const d = await decor();
		await d.teacherClient.rpc('save_evaluation_task_grid', {
			p_task_id: d.taskId,
			p_rows: [{ student_id: d.studentId, observable_id: d.obsA, code: 'plus' }]
		});
		expect(await getObservableState(service, d.studentId, d.obsA)).not.toBeNull();

		const { data: deleted, error } = await d.teacherClient
			.from('evaluation_tasks')
			.delete()
			.eq('id', d.taskId)
			.select('id');
		expect(error).toBeNull();
		expect(deleted ?? []).toHaveLength(1);
		expect(await getObservableState(service, d.studentId, d.obsA)).toBeNull();
	});
});
