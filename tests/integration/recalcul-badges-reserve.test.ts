/**
 * Le recalcul d'un badge n'est plus appelable par un utilisateur
 * ==============================================================
 *
 * `update_student_point_state` (SECURITY DEFINER) était exécutable par tout
 * utilisateur connecté via PostgREST (privilèges par défaut du baseline) :
 * n'importe qui pouvait forcer le recalcul du badge de n'importe quel élève,
 * ou effacer l'état d'un point sans tentative. Seul appelant légitime : le
 * trigger `skill_attempts_after_insert` (SECURITY DEFINER, propriétaire
 * postgres), qui doit continuer de fonctionner.
 *
 * DOIVENT échouer sans la migration 20260928180000 (sauf le test du trigger,
 * garde de non-régression).
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	getKnowledgeSkill,
	createFakeTemplate,
	getSkillStateA,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

const RECALCUL = 'update_student_point_state' as never;

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

describe('recalcul des badges réservé', () => {
	it('ni un élève ni le prof ne peuvent l’appeler ; le service, si', async () => {
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const args = { p_student_id: student.id, p_point_id: skill.id } as never;

		for (const email of [student.email, teacher.email]) {
			const client = await createAuthenticatedClient(email);
			const { error } = await client.rpc(RECALCUL, args);
			expect(error, `${email} a pu forcer le recalcul`).not.toBeNull();
		}

		// Sans cet appel, le refus serait aussi vert si la fonction n'existait pas.
		const { error: autorise } = await service.rpc(RECALCUL, args);
		expect(autorise, 'la fonction est absente : le refus ne prouve rien').toBeNull();
	});

	it('le trigger recalcule toujours le badge quand l’élève répond', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const templateId = await createFakeTemplate(service, student.id);
		const { error: tagError } = await service
			.from('question_template_points' as never)
			.insert({ template_id: templateId, point_id: skill.id } as never);
		expect(tagError).toBeNull();

		const client = await createAuthenticatedClient(student.email);
		const { data, error } = await client
			.from('skill_attempts')
			.insert({ student_id: student.id, template_id: templateId, success: true, source: 'auto' })
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const state = await getSkillStateA(service, student.id, skill.id);
		expect(state?.total_successes).toBe(1);
	});
});
