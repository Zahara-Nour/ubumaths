/**
 * Badges de capacité : les cartes de cours n'y comptent pas
 * =========================================================
 *
 * Décision A1 de David (2026-09-28) : une carte de cours ne mesure pas une
 * capacité — l'élève se note lui-même. Ses tentatives, en entraînement libre
 * (`student_self`) comme dans un paquet de révision (`srs`), ne font ni
 * avancer ni reculer `student_point_state`, même si la carte est taguée.
 *
 * DOIVENT échouer sans la migration 20260928160000.
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	createServiceRoleClient,
	TestData,
	getKnowledgeSkill,
	setPointRegime,
	insertKnowledgeAttempt,
	createFakeTemplate,
	getSkillStateA,
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

/** Un modèle marqué carte de cours, comme en production (`type = 'course_card'`). */
async function createCourseCard(createdBy: string): Promise<string> {
	const id = await createFakeTemplate(service, createdBy);
	const { data, error } = await service
		.from('question_templates')
		.update({ type: 'course_card', options: { courseCard: true } })
		.eq('id', id)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`createCourseCard failed: ${error?.message}`);
	return id;
}

describe('badges de capacité et cartes de cours', () => {
	it('une carte seule ne crée aucun état de capacité (entraînement libre ou paquet)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const card = await createCourseCard(student.id);

		for (const source of ['student_self', 'srs'] as const) {
			await insertKnowledgeAttempt(service, {
				studentId: student.id,
				skillId: skill.id,
				templateId: card,
				success: true,
				source
			});
		}

		expect(await getSkillStateA(service, student.id, skill.id)).toBeNull();
	});

	it('une réussite sur carte ne compte pas parmi les réussites', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const question = await createFakeTemplate(service, student.id);
		const card = await createCourseCard(student.id);

		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: question,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: card,
			success: true,
			source: 'student_self'
		});

		const state = await getSkillStateA(service, student.id, skill.id);
		expect(state?.total_successes).toBe(1);
		expect(state?.distinct_template_successes).toBe(1);
	});

	it('deux « je ne savais pas » sur une carte ne font pas perdre un badge acquis', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		await setPointRegime(service, skill.id, 'diversite');
		const q1 = await createFakeTemplate(service, student.id);
		const q2 = await createFakeTemplate(service, student.id);
		const card = await createCourseCard(student.id);

		for (const templateId of [q1, q2]) {
			await insertKnowledgeAttempt(service, {
				studentId: student.id,
				skillId: skill.id,
				templateId,
				success: true
			});
		}
		expect((await getSkillStateA(service, student.id, skill.id))?.is_acquired).toBe(true);

		for (let i = 0; i < 2; i += 1) {
			await insertKnowledgeAttempt(service, {
				studentId: student.id,
				skillId: skill.id,
				templateId: card,
				success: false,
				source: 'student_self'
			});
		}

		const state = await getSkillStateA(service, student.id, skill.id);
		expect(state?.is_acquired).toBe(true);
		expect(state?.needs_remediation).toBe(false);
	});
});
