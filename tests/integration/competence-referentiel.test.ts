/**
 * Competence Referentiel — Integration Tests
 * ===========================================
 *
 * Verifies the full stack of the skills/competences system against a local
 * Supabase instance (run `pnpm db:start` first).
 *
 * Requires migration 1.1 + 1.2 + 1.3 to have been applied:
 *   pnpm db:migrate
 *
 * Coverage:
 *   - Trigger famille knowledge  : student_skill_state_a UPSERT after INSERT skill_attempts
 *   - Trigger famille competence : student_observable_state + student_competence_level cascade
 *   - VIEW student_skill_state_a_v : to_review flag based on last_success_at age
 *   - 6 conjunctive rules : Chercher, Calculer, Raisonner, Communiquer, Modéliser, Représenter
 *   - RLS scope élève    : own data visible, other student's data invisible
 *   - RLS scope prof     : class-scoped access; insert teacher-source attempts
 *   - RLS référentiel    : authenticated read, anonymous blocked
 *
 * @module tests/integration/competence-referentiel
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	createServiceRoleClient,
	TestData,
	createAuthenticatedClient,
	getKnowledgeSkill,
	getObservableSkill,
	getMathCompetenceId,
	insertKnowledgeAttempt,
	insertCompetenceAttempt,
	createFakeTemplate,
	createEvaluationTask,
	getSkillStateA,
	getSkillStateAView,
	getObservableState,
	getCompetenceLevel,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// ---------------------------------------------------------------------------
// Shared service client
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;

beforeAll(async () => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCompetenceTestData();
});

// ============================================================================
// Helper: poll the cache table until trigger has written the row
// ============================================================================

async function pollSkillStateA(
	studentId: string,
	skillId: string,
	timeoutMs = 3000
): Promise<import('../helpers/competence-referentiel.helpers').StudentSkillStateARow> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const row = await getSkillStateA(service, studentId, skillId);
		if (row) return row;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`pollSkillStateA: no cache row after ${timeoutMs}ms for student=${studentId} skill=${skillId}`
	);
}

async function pollObservableState(
	studentId: string,
	skillId: string,
	timeoutMs = 3000
): Promise<import('../helpers/competence-referentiel.helpers').StudentObservableStateRow> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const row = await getObservableState(service, studentId, skillId);
		if (row) return row;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`pollObservableState: no cache row after ${timeoutMs}ms for student=${studentId} skill=${skillId}`
	);
}

async function pollCompetenceLevel(
	studentId: string,
	mathCompetenceId: string,
	timeoutMs = 3000
): Promise<import('../helpers/competence-referentiel.helpers').StudentCompetenceLevelRow> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const row = await getCompetenceLevel(service, studentId, mathCompetenceId);
		if (row) return row;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`pollCompetenceLevel: no cache row after ${timeoutMs}ms for student=${studentId} competence=${mathCompetenceId}`
	);
}

// ============================================================================
// Trigger — famille knowledge
// ============================================================================

describe('Trigger famille knowledge', () => {
	it('creates student_skill_state_a with total_successes=1 after first success', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const templateId = await createFakeTemplate(service, student.id);

		// Act
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId,
			success: true
		});

		// Assert
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.total_successes).toBe(1);
		expect(state.distinct_template_successes).toBe(1);
		expect(state.last_success_at).not.toBeNull();
		expect(state.last_attempt_at).not.toBeNull();
	});

	it('marks is_acquired=true for capacite_attendue after success on 2 distinct templates with no recent failure', async () => {
		// Arrange: pick a capacite_attendue skill (Fractions rank 1)
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		expect(skill.knowledge_type).toBe('capacite_attendue');

		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);

		// Act: 2 successes on 2 distinct templates, no failure
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl1,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl2,
			success: true
		});

		// Assert
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.is_acquired).toBe(true);
		expect(state.distinct_template_successes).toBeGreaterThanOrEqual(2);
		expect(state.needs_remediation).toBe(false);
	});

	it('marks is_acquired=true for automatisme after 5 successes including >=3 in last 5', async () => {
		// Arrange: pick an automatisme skill (Organiser et lire des données rank 1)
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Organiser et lire des données', 1);
		expect(skill.knowledge_type).toBe('automatisme');

		const tpl = await createFakeTemplate(service, student.id);

		// Act: 5 successes on the same template (distinct_tpl=1 but automatisme only cares about total+recent)
		for (let i = 0; i < 5; i++) {
			await insertKnowledgeAttempt(service, {
				studentId: student.id,
				skillId: skill.id,
				templateId: tpl,
				success: true
			});
		}

		// Assert
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.is_acquired).toBe(true);
		expect(state.total_successes).toBe(5);
	});

	it('marks is_acquired=false and needs_remediation=true after 1 success then 2 failures on capacite_attendue', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres décimaux', 1);
		expect(skill.knowledge_type).toBe('capacite_attendue');

		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);

		// Act: 1 success, then 2 failures  (decision 64: >=2 failures in recent window)
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl1,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl2,
			success: false
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl2,
			success: false
		});

		// Assert
		const state = await pollSkillStateA(student.id, skill.id);
		// The recent window (last 3) contains the 2 failures → not acquired, needs_remediation
		expect(state.is_acquired).toBe(false);
		expect(state.needs_remediation).toBe(true);
	});

	it('does NOT set needs_remediation=true after only 1 failure on a never-touched skill', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Proportionnalité', 1);
		const tpl = await createFakeTemplate(service, student.id);

		// Act: single failure only
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: false
		});

		// Assert: 1 failure < threshold of 2
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.is_acquired).toBe(false);
		expect(state.needs_remediation).toBe(false);
	});
});

// ============================================================================
// Trigger — famille competence
// ============================================================================

describe('Trigger famille competence', () => {
	it('creates student_observable_state with count_plus=1 after first plus attempt', async () => {
		// Arrange
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const taskId = await createEvaluationTask(service, { teacherId: teacher.id });
		const observable = await getObservableSkill(service, 'chercher', 'A1');

		// Act
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId,
			code: 'plus'
		});

		// Assert
		const state = await pollObservableState(student.id, observable.id);
		expect(state.count_plus).toBe(1);
		expect(state.count_minus).toBe(0);
		expect(state.is_acquis).toBe(false); // need >=2 plus AND plus > minus
	});

	it('marks is_acquis=true after 2 plus and 1 minus (2 > 1 and count_plus >= 2)', async () => {
		// Arrange
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const task1 = await createEvaluationTask(service, { teacherId: teacher.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacher.id });
		const observable = await getObservableSkill(service, 'chercher', 'B1');

		// Act: 2 plus (on distinct tasks) + 1 minus
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId: task2,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId: task2,
			code: 'minus'
		});

		// Assert
		const state = await pollObservableState(student.id, observable.id);
		expect(state.count_plus).toBe(2);
		expect(state.count_minus).toBe(1);
		expect(state.is_acquis).toBe(true);
	});

	it('marks is_acquis=false when count_plus < count_minus (2 plus, 3 minus)', async () => {
		// Arrange
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const task = await createEvaluationTask(service, { teacherId: teacher.id });
		const observable = await getObservableSkill(service, 'chercher', 'A2');

		// Act
		for (let i = 0; i < 2; i++) {
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: observable.id,
				taskId: task,
				code: 'plus'
			});
		}
		for (let i = 0; i < 3; i++) {
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: observable.id,
				taskId: task,
				code: 'minus'
			});
		}

		// Assert
		const state = await pollObservableState(student.id, observable.id);
		expect(state.count_plus).toBe(2);
		expect(state.count_minus).toBe(3);
		expect(state.is_acquis).toBe(false); // 2 > 3 is false
	});

	it('cascades to student_competence_level after observable state update', async () => {
		// Arrange: acquire enough observables to create a Chercher record
		// Chercher Fragile: >=1 of A AND >=1 of B
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const chercherCompId = await getMathCompetenceId(service, 'chercher');
		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		const obsB1 = await getObservableSkill(service, 'chercher', 'B1');

		// We need task_count >= 2 for a non-insuffisante verdict
		const task1 = await createEvaluationTask(service, { teacherId: teacher.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacher.id });

		// Acquire A1: 2 plus on 2 tasks
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task2,
			code: 'plus'
		});

		// Acquire B1: 2 plus on 2 tasks
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsB1.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsB1.id,
			taskId: task2,
			code: 'plus'
		});

		// Assert: competence level has been created
		const level = await pollCompetenceLevel(student.id, chercherCompId);
		expect(level).not.toBeNull();
		// With task_count=2 and only A1+B1 acquired:
		// - Satisfaisante requires B1 AND >=2 of A AND >=1 of B2..B5 → not met (only A1, no A2+)
		// - Fragile requires >=1 of A AND >=1 of B → met (A1 + B1)
		// → expected niveau = 'fragile'
		expect(level.niveau).toBe('fragile');
		expect(level.task_count).toBeGreaterThanOrEqual(2);
	});
});

// ============================================================================
// VIEW student_skill_state_a_v — to_review flag
// ============================================================================

describe('VIEW student_skill_state_a_v to_review', () => {
	it('returns to_review=false for a recent success (today)', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 2);
		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);

		// Acquire the skill (capacite_attendue: 2 distinct templates, no failure)
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl1,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl2,
			success: true
		});

		// Assert
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.is_acquired).toBe(true);

		const view = await getSkillStateAView(service, student.id, skill.id);
		expect(view).not.toBeNull();
		expect(view!.is_acquired).toBe(true);
		expect(view!.to_review).toBe(false); // last_success_at is recent
	});

	it('returns to_review=true when last_success_at is backdated to 31 days ago', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 3);
		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);

		// Acquire first
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl1,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl2,
			success: true
		});

		// Wait for cache to settle
		await pollSkillStateA(student.id, skill.id);

		// Backdate last_success_at to 31 days ago via service role (admin bypass)
		const ago31 = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
		const { error: patchErr } = await service
			.from('student_skill_state_a' as never)
			.update({ last_success_at: ago31 } as never)
			.eq('student_id', student.id)
			.eq('skill_id', skill.id);
		expect(patchErr).toBeNull();

		// Assert: VIEW reads NOW() at query time, so to_review reflects the backdated value
		const view = await getSkillStateAView(service, student.id, skill.id);
		expect(view).not.toBeNull();
		expect(view!.is_acquired).toBe(true);
		expect(view!.to_review).toBe(true); // 31 days > 30 days threshold
	});

	it('returns to_review=false when last_success_at is old but is_acquired=false', async () => {
		// Arrange: insert only a failure (is_acquired stays false)
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 2);
		const tpl = await createFakeTemplate(service, student.id);

		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: false
		});

		await pollSkillStateA(student.id, skill.id);

		// Assert: VIEW requires is_acquired=true for to_review=true
		const view = await getSkillStateAView(service, student.id, skill.id);
		expect(view).not.toBeNull();
		expect(view!.is_acquired).toBe(false);
		expect(view!.to_review).toBe(false);
	});
});

// ============================================================================
// Règles conjonctives — 6 compétences
// ============================================================================

/**
 * Helper: acquire a set of observables for a student by inserting 2 plus
 * attempts per observable on 2 different tasks (guarantees is_acquis=true
 * and task_count=2 minimum which is enough for Fragile/Satisfaisante).
 */
async function acquireObservables(
	studentId: string,
	teacherId: string,
	classId: string,
	competenceCode: string,
	observableCodes: string[]
): Promise<void> {
	const task1 = await createEvaluationTask(service, {
		teacherId,
		classId,
		name: `Test task ${crypto.randomUUID()}`
	});
	const task2 = await createEvaluationTask(service, {
		teacherId,
		classId,
		name: `Test task ${crypto.randomUUID()}`
	});

	for (const code of observableCodes) {
		const observable = await getObservableSkill(service, competenceCode, code);
		await insertCompetenceAttempt(service, {
			studentId,
			skillId: observable.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId,
			skillId: observable.id,
			taskId: task2,
			code: 'plus'
		});
	}
}

// ============================================================================
// Chercher (rule: §1 of college-competences.md)
//   Très bonne  : Satisfaisante AND C2 AND C1 AND >=1 of D
//   Satisfaisante : B1 AND >=2 of A AND >=1 of B2..B5
//   Fragile     : >=1 of A AND >=1 of B
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Chercher', () => {
	async function setupChercher() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'chercher');
		return { teacher, student, klass, compId };
	}

	it('Chercher — Très bonne maîtrise: B1 + A1+A2 + B2 + C1 + C2 + D1 (with 3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupChercher();

		// Need 3 tasks for Très bonne (task_count cap guard)
		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});

		await acquireObservables(student.id, teacher.id, klass.id, 'chercher', [
			'A1',
			'A2',
			'B1',
			'B2',
			'C1',
			'C2',
			'D1'
		]);

		// Insert a third task observation for D2 to push task_count=3
		const obsA3 = await getObservableSkill(service, 'chercher', 'A3');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA3.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
		expect(level.missing_for_next).toEqual([]);
	});

	it('Chercher — Insuffisante: no observables acquired', async () => {
		// Single-teacher: reuse setupChercher's teacher/class (the student is already
		// enrolled there) instead of creating a 2nd teacher (forbidden by the trigger).
		const { student, compId, teacher } = await setupChercher();

		// No attempts at all → no competence level row yet; after one minus it becomes insuffisante
		const task = await createEvaluationTask(service, { teacherId: teacher.id });
		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		// Insert 1 minus only → A1 not acquired (count_plus=0 < 2)
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task,
			code: 'minus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('insuffisante');
		// missing_for_next should mention A* or B* (residual needs)
		expect(Array.isArray(level.missing_for_next)).toBe(true);
	});
});

// ============================================================================
// Calculer (rule: §2)
//   Très bonne  : Satisfaisante AND D1 AND D2 AND >=3 of B AND >=2 of A AND >=1 of C
//   Satisfaisante : >=2 of B AND >=1 of A AND (D1 OR D2)
//   Fragile     : >=1 of B
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Calculer', () => {
	async function setupCalculer() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'calculer');
		return { teacher, student, klass, compId };
	}

	it('Calculer — Très bonne maîtrise: A1+A2 + B1+B2+B3 + C1 + D1+D2 (3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupCalculer();

		await acquireObservables(student.id, teacher.id, klass.id, 'calculer', [
			'A1',
			'A2',
			'B1',
			'B2',
			'B3',
			'C1',
			'D1',
			'D2'
		]);

		// Force task_count >= 3 by injecting a 3rd-task observation
		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsA3 = await getObservableSkill(service, 'calculer', 'A3');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA3.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
	});

	it('Calculer — Insuffisante: only A1 acquired (no B)', async () => {
		const { teacher, student, klass, compId } = await setupCalculer();

		// Acquire A1 only → Calculer Fragile requires >=1 of B, so must be Insuffisante
		await acquireObservables(student.id, teacher.id, klass.id, 'calculer', ['A1']);

		const level = await pollCompetenceLevel(student.id, compId);
		// task_count=2, A1 acquired but no B → Insuffisante (Fragile needs >=1 B)
		expect(level.niveau).toBe('insuffisante');
		// TODO: update assertion after missing_for_next refactor to typed objects
		expect(Array.isArray(level.missing_for_next)).toBe(true);
		expect((level.missing_for_next ?? []).length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Raisonner (rule: §3)
//   Très bonne  : Satisfaisante AND B2 AND D2 AND >=1 of C
//   Satisfaisante : A1 AND B1
//   Fragile     : >=1 of {A1, B1, D1}
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Raisonner', () => {
	async function setupRaisonner() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'raisonner');
		return { teacher, student, klass, compId };
	}

	it('Raisonner — Très bonne maîtrise: A1 + B1 + B2 + C1 + D2 (3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupRaisonner();

		await acquireObservables(student.id, teacher.id, klass.id, 'raisonner', [
			'A1',
			'B1',
			'B2',
			'C1',
			'D2'
		]);

		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsD1 = await getObservableSkill(service, 'raisonner', 'D1');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsD1.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
	});

	it('Raisonner — Insuffisante: C1 only (not in {A1, B1, D1})', async () => {
		const { teacher, student, klass, compId } = await setupRaisonner();

		await acquireObservables(student.id, teacher.id, klass.id, 'raisonner', ['C1']);

		const level = await pollCompetenceLevel(student.id, compId);
		// Fragile requires >=1 of {A1,B1,D1}; C1 alone → Insuffisante
		expect(level.niveau).toBe('insuffisante');
	});
});

// ============================================================================
// Communiquer (rule: §4)
//   Très bonne  : Satisfaisante AND C1 AND C2 AND A1 AND A2
//   Satisfaisante : >=1 of B AND >=1 of A
//   Fragile     : >=1 of B OR >=1 of A (not Satisfaisante)
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Communiquer', () => {
	async function setupCommuniquer() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'communiquer');
		return { teacher, student, klass, compId };
	}

	it('Communiquer — Très bonne maîtrise: A1 + A2 + B1 + C1 + C2 (3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupCommuniquer();

		await acquireObservables(student.id, teacher.id, klass.id, 'communiquer', [
			'A1',
			'A2',
			'B1',
			'C1',
			'C2'
		]);

		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsB2 = await getObservableSkill(service, 'communiquer', 'B2');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsB2.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
	});

	it('Communiquer — Insuffisante: no observables acquired at all', async () => {
		const { teacher, student, klass, compId } = await setupCommuniquer();

		// 2 minus on A1 → not acquired; still triggers a competence level row
		const task = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const task2 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsA1 = await getObservableSkill(service, 'communiquer', 'A1');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task,
			code: 'minus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task2,
			code: 'minus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('insuffisante');
	});
});

// ============================================================================
// Modéliser (rule: §5)
//   Très bonne  : Satisfaisante AND B2 AND C1 AND >=1 of {C2, C3}
//   Satisfaisante : A2 AND A3 AND B1
//   Fragile     : >=1 of A
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Modéliser', () => {
	async function setupModeliser() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'modeliser');
		return { teacher, student, klass, compId };
	}

	it('Modéliser — Très bonne maîtrise: A2+A3+B1+B2+C1+C2 (3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupModeliser();

		await acquireObservables(student.id, teacher.id, klass.id, 'modeliser', [
			'A2',
			'A3',
			'B1',
			'B2',
			'C1',
			'C2'
		]);

		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsA1 = await getObservableSkill(service, 'modeliser', 'A1');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
	});

	it('Modéliser — Insuffisante: no A observables acquired', async () => {
		const { teacher, student, klass, compId } = await setupModeliser();

		// Acquire B1 only; Fragile requires >=1 of A, so must be Insuffisante
		await acquireObservables(student.id, teacher.id, klass.id, 'modeliser', ['B1']);

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('insuffisante');
		// TODO: update assertion after missing_for_next refactor to typed objects
		expect(Array.isArray(level.missing_for_next)).toBe(true);
		expect((level.missing_for_next ?? []).length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Représenter (rule: §6)
//   Très bonne  : Satisfaisante AND C1 AND C2 AND >=1 of {D1, D2}
//   Satisfaisante : A2 AND B1 AND B2
//   Fragile     : >=1 of A OR >=1 of B
//   Insuffisante: residual
// ============================================================================

describe('Règles conjonctives — Représenter', () => {
	async function setupRepresenter() {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });
		const compId = await getMathCompetenceId(service, 'representer');
		return { teacher, student, klass, compId };
	}

	it('Représenter — Très bonne maîtrise: A2+B1+B2+C1+C2+D1 (3 tasks)', async () => {
		const { teacher, student, klass, compId } = await setupRepresenter();

		await acquireObservables(student.id, teacher.id, klass.id, 'representer', [
			'A2',
			'B1',
			'B2',
			'C1',
			'C2',
			'D1'
		]);

		const task3 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsA1 = await getObservableSkill(service, 'representer', 'A1');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task3,
			code: 'plus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('tres_bonne');
	});

	it('Représenter — Insuffisante: no observables acquired', async () => {
		const { teacher, student, klass, compId } = await setupRepresenter();

		// Single minus on A1 on 2 tasks → not acquired → insuffisante
		const task = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const task2 = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id,
			name: `Test task ${crypto.randomUUID()}`
		});
		const obsA1 = await getObservableSkill(service, 'representer', 'A1');
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task,
			code: 'minus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: obsA1.id,
			taskId: task2,
			code: 'minus'
		});

		const level = await pollCompetenceLevel(student.id, compId);
		expect(level.niveau).toBe('insuffisante');
	});
});

// ============================================================================
// §6.4 task_count guard
// ============================================================================

describe('Garde-fous §6.4 — task_count', () => {
	it('caps niveau to insuffisante when task_count < 2 even if observables are acquired', async () => {
		// Arrange: insert all attempts on the SAME task (task_count=1)
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const compId = await getMathCompetenceId(service, 'raisonner');
		const singleTask = await createEvaluationTask(service, { teacherId: teacher.id });

		// Acquire A1 and B1 via 2 plus each on the SAME single task
		const obsA1 = await getObservableSkill(service, 'raisonner', 'A1');
		const obsB1 = await getObservableSkill(service, 'raisonner', 'B1');

		// 2 plus on same task for each observable still gives task_count=1 for competence
		for (let i = 0; i < 2; i++) {
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: obsA1.id,
				taskId: singleTask,
				code: 'plus'
			});
		}
		for (let i = 0; i < 2; i++) {
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: obsB1.id,
				taskId: singleTask,
				code: 'plus'
			});
		}

		const level = await pollCompetenceLevel(student.id, compId);
		// task_count=1 < 2 → insuffisante regardless of rule verdict
		expect(level.niveau).toBe('insuffisante');
		// TODO: update assertion after missing_for_next refactor to typed objects
		expect(Array.isArray(level.missing_for_next)).toBe(true);
		expect((level.missing_for_next ?? []).length).toBeGreaterThan(0);
	});
});

// ============================================================================
// RLS — scope élève
// ============================================================================

describe('RLS — scope élève', () => {
	it('student can INSERT an attempt for themselves with source=auto', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const tpl = await createFakeTemplate(service, student.id);

		const studentClient = await createAuthenticatedClient(student.email);

		// Act
		const { error } = await studentClient.from('skill_attempts' as never).insert({
			student_id: student.id,
			skill_id: skill.id,
			template_id: tpl,
			success: true,
			source: 'auto'
		});

		// Assert
		expect(error).toBeNull();
	});

	it('student can SELECT their own attempts', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 2);
		const tpl = await createFakeTemplate(service, student.id);

		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		const studentClient = await createAuthenticatedClient(student.email);

		// Act
		const { data, error } = await studentClient
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student.id);

		// Assert
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBeGreaterThanOrEqual(1);
	});

	it('student cannot see attempts belonging to another student (0 rows returned)', async () => {
		// Arrange
		const student1 = await TestData.profile().withRole('student').create();
		const student2 = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 3);
		const tpl = await createFakeTemplate(service, student2.id);

		await insertKnowledgeAttempt(service, {
			studentId: student2.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		const student1Client = await createAuthenticatedClient(student1.email);

		// Act
		const { data } = await student1Client
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student2.id);

		// Assert: RLS filters the row; no error, just empty result
		expect((data as Array<unknown>).length).toBe(0);
	});

	it('student cannot INSERT an attempt for another student (policy violation)', async () => {
		// Arrange
		const student1 = await TestData.profile().withRole('student').create();
		const student2 = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres décimaux', 1);
		const tpl = await createFakeTemplate(service, student2.id);

		const student1Client = await createAuthenticatedClient(student1.email);

		// Act: student1 tries to insert an attempt for student2
		const { error } = await student1Client.from('skill_attempts' as never).insert({
			student_id: student2.id,
			skill_id: skill.id,
			template_id: tpl,
			success: true,
			source: 'auto'
		});

		// Assert: RLS WITH CHECK fails
		expect(error).not.toBeNull();
	});
});

// ============================================================================
// RLS — scope prof
// ============================================================================

describe('RLS — scope prof', () => {
	it('teacher can SELECT attempts for students in their class', async () => {
		// Arrange
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		const tpl = await createFakeTemplate(service, student.id);
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		const teacherClient = await createAuthenticatedClient(teacher.email);

		// Act
		const { data, error } = await teacherClient
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student.id);

		// Assert
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBeGreaterThanOrEqual(1);
	});

	// Obsolete under single-teacher + Option B: the sole teacher reads ALL students'
	// attempts (is_my_student), and there is no second teacher to isolate against.
	it.skip('teacher cannot SELECT attempts for students in another class (0 rows)', async () => {
		// Arrange
		const teacherA = await TestData.profile().withRole('teacher').create();
		const teacherB = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();

		// student is only in teacherA's class
		const klassA = await TestData.class(teacherA.id).create();
		await service.from('class_members').insert({ class_id: klassA.id, student_id: student.id });

		const skill = await getKnowledgeSkill(service, 'Fractions', 2);
		const tpl = await createFakeTemplate(service, student.id);
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		const teacherBClient = await createAuthenticatedClient(teacherB.email);

		// Act
		const { data } = await teacherBClient
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student.id);

		// Assert: teacherB has no class membership with this student
		expect((data as Array<unknown>).length).toBe(0);
	});

	it('teacher can INSERT a teacher-source attempt for a student in their class', async () => {
		// Arrange
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: student.id });

		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		const taskId = await createEvaluationTask(service, {
			teacherId: teacher.id,
			classId: klass.id
		});

		const teacherClient = await createAuthenticatedClient(teacher.email);

		// Act
		const { error } = await teacherClient.from('skill_attempts' as never).insert({
			student_id: student.id,
			skill_id: obsA1.id,
			task_id: taskId,
			code: 'plus',
			source: 'teacher'
		});

		// Assert
		expect(error).toBeNull();
	});

	// Obsolete under the single-teacher model: no second teacher exists to test
	// cross-teacher write isolation against (enforce_single_teacher trigger).
	it.skip('teacher cannot INSERT a teacher-source attempt for a student outside their class', async () => {
		// Arrange
		const teacherA = await TestData.profile().withRole('teacher').create();
		const teacherB = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();

		// student is only in teacherA's class
		const klassA = await TestData.class(teacherA.id).create();
		await service.from('class_members').insert({ class_id: klassA.id, student_id: student.id });

		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		const taskId = await createEvaluationTask(service, { teacherId: teacherA.id });

		const teacherBClient = await createAuthenticatedClient(teacherB.email);

		// Act: teacherB tries to insert for a student not in their class
		const { error } = await teacherBClient.from('skill_attempts' as never).insert({
			student_id: student.id,
			skill_id: obsA1.id,
			task_id: taskId,
			code: 'plus',
			source: 'teacher'
		});

		// Assert: RLS WITH CHECK fails
		expect(error).not.toBeNull();
	});
});

// ============================================================================
// RLS — référentiel (lecture publique pour authentifiés)
// ============================================================================

describe('RLS — référentiel lecture publique', () => {
	it('authenticated student can SELECT all skill_themes (seed count >= 6)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const studentClient = await createAuthenticatedClient(student.email);

		const { data, error } = await studentClient.from('skill_themes' as never).select('id, name');

		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBeGreaterThanOrEqual(6);
	});

	it('authenticated student can SELECT skill_objectives (seed count >= 18)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const studentClient = await createAuthenticatedClient(student.email);

		const { data, error } = await studentClient
			.from('skill_objectives' as never)
			.select('id, name');

		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBeGreaterThanOrEqual(18);
	});

	it('authenticated student can SELECT skills (seed count >= 72 + 56)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const studentClient = await createAuthenticatedClient(student.email);

		const { data, error } = await studentClient.from('skills' as never).select('id, family');

		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBeGreaterThanOrEqual(128);
	});

	it('authenticated student can SELECT math_competences (seed count = 6)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const studentClient = await createAuthenticatedClient(student.email);

		const { data, error } = await studentClient
			.from('math_competences' as never)
			.select('id, code');

		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(6);
	});

	it('anonymous client (no session) gets 0 rows or an error on skill_themes (TO authenticated policy)', async () => {
		// Create an anon client without signing in
		const { createClient } = await import('@supabase/supabase-js');
		const url = process.env.SUPABASE_TEST_URL ?? 'http://localhost:54321';
		const anonKey =
			process.env.SUPABASE_TEST_ANON_KEY ??
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

		const anonClient = createClient(url, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const { data, error } = await anonClient.from('skill_themes' as never).select('id');

		// RLS policy is FOR SELECT TO authenticated → anon role gets 0 rows, no error.
		// (The USING clause is simply never evaluated for the anon role — 0 rows returned silently.)
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});
});

// ============================================================================
// RLS — scope élève (caches + VIEW)                                     [D1]
// ============================================================================

describe('RLS — scope élève (caches + VIEW)', () => {
	it('student A cannot SELECT student_skill_state_a rows belonging to student B (0 rows)', async () => {
		// Arrange
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const tpl = await createFakeTemplate(service, studentB.id);

		// Pre-populate cache via service role (triggers the trigger)
		await insertKnowledgeAttempt(service, {
			studentId: studentB.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});
		await pollSkillStateA(studentB.id, skill.id);

		const studentAClient = await createAuthenticatedClient(studentA.email);

		// Act
		const { data, error } = await studentAClient
			.from('student_skill_state_a' as never)
			.select('student_id')
			.eq('student_id', studentB.id);

		// Assert: RLS policy "student_skill_state_a_select_own" filters out other students
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});

	it('student A cannot SELECT student_skill_state_a_v (VIEW) rows belonging to student B (0 rows — fix C1)', async () => {
		// Arrange: VIEW has security_invoker=on so RLS of the underlying table is enforced
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		const tpl1 = await createFakeTemplate(service, studentB.id);
		const tpl2 = await createFakeTemplate(service, studentB.id);

		await insertKnowledgeAttempt(service, {
			studentId: studentB.id,
			skillId: skill.id,
			templateId: tpl1,
			success: true
		});
		await insertKnowledgeAttempt(service, {
			studentId: studentB.id,
			skillId: skill.id,
			templateId: tpl2,
			success: true
		});
		await pollSkillStateA(studentB.id, skill.id);

		const studentAClient = await createAuthenticatedClient(studentA.email);

		// Act: query the VIEW, not the raw table
		const { data, error } = await studentAClient
			.from('student_skill_state_a_v' as never)
			.select('student_id')
			.eq('student_id', studentB.id);

		// Assert: security_invoker=on means the VIEW inherits the caller's RLS context
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});

	it('student A cannot SELECT student_observable_state rows belonging to student B (0 rows)', async () => {
		// Arrange
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: studentB.id });

		const task1 = await createEvaluationTask(service, { teacherId: teacher.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacher.id });
		const observable = await getObservableSkill(service, 'chercher', 'A1');

		await insertCompetenceAttempt(service, {
			studentId: studentB.id,
			skillId: observable.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: studentB.id,
			skillId: observable.id,
			taskId: task2,
			code: 'plus'
		});
		await pollObservableState(studentB.id, observable.id);

		const studentAClient = await createAuthenticatedClient(studentA.email);

		// Act
		const { data, error } = await studentAClient
			.from('student_observable_state' as never)
			.select('student_id')
			.eq('student_id', studentB.id);

		// Assert: RLS policy "student_observable_state_select_own" filters out other students
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});

	it('student A cannot SELECT student_competence_level rows belonging to student B (0 rows)', async () => {
		// Arrange
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class(teacher.id).create();
		await service.from('class_members').insert({ class_id: klass.id, student_id: studentB.id });

		const chercherCompId = await getMathCompetenceId(service, 'chercher');
		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		const obsB1 = await getObservableSkill(service, 'chercher', 'B1');
		const task1 = await createEvaluationTask(service, { teacherId: teacher.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacher.id });

		// Acquire A1 + B1 for studentB → triggers competence level row
		for (const obs of [obsA1, obsB1]) {
			await insertCompetenceAttempt(service, {
				studentId: studentB.id,
				skillId: obs.id,
				taskId: task1,
				code: 'plus'
			});
			await insertCompetenceAttempt(service, {
				studentId: studentB.id,
				skillId: obs.id,
				taskId: task2,
				code: 'plus'
			});
		}
		await pollCompetenceLevel(studentB.id, chercherCompId);

		const studentAClient = await createAuthenticatedClient(studentA.email);

		// Act
		const { data, error } = await studentAClient
			.from('student_competence_level' as never)
			.select('student_id')
			.eq('student_id', studentB.id);

		// Assert: RLS policy "student_competence_level_select_own" filters out other students
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});
});

// ============================================================================
// RLS — scope prof (caches)                                             [D2]
// ============================================================================

describe('RLS — scope prof (caches)', () => {
	// Obsolete under single-teacher + Option B: the sole teacher reads ALL students'
	// cache rows (is_my_student) ; no second teacher to isolate against.
	it.skip("teacher B cannot SELECT student_skill_state_a for a student in teacher A's class (0 rows)", async () => {
		// Arrange: student is only in teacherA's class
		const teacherA = await TestData.profile().withRole('teacher').create();
		const teacherB = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klassA = await TestData.class(teacherA.id).create();
		await service.from('class_members').insert({ class_id: klassA.id, student_id: student.id });

		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const tpl = await createFakeTemplate(service, student.id);
		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});
		await pollSkillStateA(student.id, skill.id);

		const teacherBClient = await createAuthenticatedClient(teacherB.email);

		// Act
		const { data, error } = await teacherBClient
			.from('student_skill_state_a' as never)
			.select('student_id')
			.eq('student_id', student.id);

		// Assert: teacherB has no class membership with this student
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});

	// Obsolete under single-teacher + Option B (see note above): sole teacher reads all.
	it.skip("teacher B cannot SELECT student_observable_state for a student in teacher A's class (0 rows)", async () => {
		// Arrange
		const teacherA = await TestData.profile().withRole('teacher').create();
		const teacherB = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klassA = await TestData.class(teacherA.id).create();
		await service.from('class_members').insert({ class_id: klassA.id, student_id: student.id });

		const task1 = await createEvaluationTask(service, { teacherId: teacherA.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacherA.id });
		const observable = await getObservableSkill(service, 'calculer', 'A1');

		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId: task1,
			code: 'plus'
		});
		await insertCompetenceAttempt(service, {
			studentId: student.id,
			skillId: observable.id,
			taskId: task2,
			code: 'plus'
		});
		await pollObservableState(student.id, observable.id);

		const teacherBClient = await createAuthenticatedClient(teacherB.email);

		// Act
		const { data, error } = await teacherBClient
			.from('student_observable_state' as never)
			.select('student_id')
			.eq('student_id', student.id);

		// Assert: teacherB has no class membership with this student
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});

	// Obsolete under single-teacher + Option B (see note above): sole teacher reads all.
	it.skip("teacher B cannot SELECT student_competence_level for a student in teacher A's class (0 rows)", async () => {
		// Arrange
		const teacherA = await TestData.profile().withRole('teacher').create();
		const teacherB = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const klassA = await TestData.class(teacherA.id).create();
		await service.from('class_members').insert({ class_id: klassA.id, student_id: student.id });

		const chercherCompId = await getMathCompetenceId(service, 'chercher');
		const obsA1 = await getObservableSkill(service, 'chercher', 'A1');
		const obsB1 = await getObservableSkill(service, 'chercher', 'B1');
		const task1 = await createEvaluationTask(service, { teacherId: teacherA.id });
		const task2 = await createEvaluationTask(service, { teacherId: teacherA.id });

		for (const obs of [obsA1, obsB1]) {
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: obs.id,
				taskId: task1,
				code: 'plus'
			});
			await insertCompetenceAttempt(service, {
				studentId: student.id,
				skillId: obs.id,
				taskId: task2,
				code: 'plus'
			});
		}
		await pollCompetenceLevel(student.id, chercherCompId);

		const teacherBClient = await createAuthenticatedClient(teacherB.email);

		// Act
		const { data, error } = await teacherBClient
			.from('student_competence_level' as never)
			.select('student_id')
			.eq('student_id', student.id);

		// Assert: teacherB has no class membership with this student
		expect(error).toBeNull();
		expect((data as Array<unknown>).length).toBe(0);
	});
});

// ============================================================================
// Immutabilité skill_attempts                                            [D3]
// ============================================================================

describe('Immutabilité skill_attempts', () => {
	it('student cannot UPDATE their own skill_attempt (0 rows affected or error)', async () => {
		// Arrange: insert an attempt via service role, then try to UPDATE via student client
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const tpl = await createFakeTemplate(service, student.id);

		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		// Fetch the attempt id via service role
		const { data: attempts } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student.id)
			.limit(1);
		const attemptId = ((attempts ?? []) as Array<{ id: string }>)[0]?.id;
		expect(attemptId).toBeDefined();

		const studentClient = await createAuthenticatedClient(student.email);

		// Act: try to UPDATE
		const { data: updated, error } = await studentClient
			.from('skill_attempts' as never)
			.update({ with_help: true } as never)
			.eq('id', attemptId);

		// Assert: no UPDATE policy exists for non-admin users → 0 rows affected, no error
		// (Supabase returns null data or empty array when RLS silently blocks)
		const rowsAffected = (updated as Array<unknown> | null)?.length ?? 0;
		const blocked = error !== null || rowsAffected === 0;
		expect(blocked).toBe(true);
	});

	it('student cannot DELETE their own skill_attempt (0 rows affected or error)', async () => {
		// Arrange
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		const tpl = await createFakeTemplate(service, student.id);

		await insertKnowledgeAttempt(service, {
			studentId: student.id,
			skillId: skill.id,
			templateId: tpl,
			success: true
		});

		// Fetch the attempt id
		const { data: attempts } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', student.id)
			.limit(1);
		const attemptId = ((attempts ?? []) as Array<{ id: string }>)[0]?.id;
		expect(attemptId).toBeDefined();

		const studentClient = await createAuthenticatedClient(student.email);

		// Act: try to DELETE
		const { data: deleted, error } = await studentClient
			.from('skill_attempts' as never)
			.delete()
			.eq('id', attemptId);

		// Assert: no DELETE policy exists for non-admin users → 0 rows deleted, no error
		const rowsDeleted = (deleted as Array<unknown> | null)?.length ?? 0;
		const blocked = error !== null || rowsDeleted === 0;
		expect(blocked).toBe(true);

		// Double-check: the row still exists in the DB
		const { data: check } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('id', attemptId);
		expect(((check ?? []) as Array<unknown>).length).toBe(1);
	});
});
