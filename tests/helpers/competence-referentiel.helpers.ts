/**
 * Helpers for competence referentiel integration tests
 * =====================================================
 *
 * Provides fixtures and utilities specific to the skills / competences system
 * (Family A knowledge and Family B competence tables introduced by migration
 * 20260609120000..20260609120002).
 *
 * These helpers use the service-role client so they bypass RLS and are suitable
 * for test setup / teardown only.  Tests themselves use authenticated clients
 * (createAuthenticatedClient) to validate RLS policies.
 */

import { createServiceRoleClient, generateTestEmail } from './database/trigger-test-helpers';
import { deleteTestAuthUsers } from './database/postgres-client';
import { TestData } from './database/test-data-factory';
import { createAuthenticatedClient } from './database/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ---------------------------------------------------------------------------
// Type aliases for the new tables (not yet in generated database.ts)
// ---------------------------------------------------------------------------

export type SkillRow = {
	id: string;
	family: 'knowledge' | 'competence';
	objective_id: string | null;
	subdimension_id: string | null;
	knowledge_type: 'automatisme' | 'capacite_attendue' | null;
	observable_code: string | null;
	name: string;
	display_order: number;
	niveau_scolaire: string | null;
};

export type StudentSkillStateARow = {
	student_id: string;
	skill_id: string;
	is_acquired: boolean;
	total_successes: number;
	distinct_template_successes: number;
	last_success_at: string | null;
	last_attempt_at: string | null;
	needs_remediation: boolean;
	updated_at: string;
};

export type StudentSkillStateAViewRow = StudentSkillStateARow & {
	needs_remediation: boolean;
};

export type StudentObservableStateRow = {
	student_id: string;
	skill_id: string;
	count_plus: number;
	count_minus: number;
	is_acquis: boolean;
	last_attempt_at: string | null;
	updated_at: string;
};

export type StudentCompetenceLevelRow = {
	student_id: string;
	math_competence_id: string;
	niveau: 'insuffisante' | 'fragile' | 'satisfaisante' | 'tres_bonne';
	validated_observables: string[] | null;
	missing_for_next: string[] | null;
	task_count: number | null;
	last_recalc_at: string;
};

export type EvaluationTaskRow = {
	id: string;
	teacher_id: string;
	class_id: string | null;
	niveau_scolaire: string;
	name: string;
};

// ---------------------------------------------------------------------------
// Seed lookup helpers
// ---------------------------------------------------------------------------

/** Fetch a knowledge skill by (objective name fragment, display_order). */
export async function getKnowledgeSkill(
	service: SupabaseClient<Database>,
	objectiveNameFragment: string,
	displayOrder: number
): Promise<SkillRow> {
	const { data, error } = await service
		.from('skill_objectives' as never)
		.select('id, name')
		.ilike('name', `%${objectiveNameFragment}%`)
		.limit(1)
		.single();

	if (error || !data) {
		throw new Error(
			`getKnowledgeSkill: objective '${objectiveNameFragment}' not found: ${error?.message}`
		);
	}

	const { data: skill, error: skillErr } = await service
		.from('skills' as never)
		.select('*')
		.eq('objective_id', (data as { id: string }).id)
		.eq('display_order', displayOrder)
		.single();

	if (skillErr || !skill) {
		throw new Error(
			`getKnowledgeSkill: no skill at rank ${displayOrder} for objective '${objectiveNameFragment}': ${skillErr?.message}`
		);
	}

	return skill as SkillRow;
}

/** Fetch a competence observable by (competence code, observable_code). */
export async function getObservableSkill(
	service: SupabaseClient<Database>,
	competenceCode: string,
	observableCode: string
): Promise<SkillRow> {
	// Resolve competence id
	const { data: comp, error: compErr } = await service
		.from('math_competences' as never)
		.select('id')
		.eq('code', competenceCode)
		.single();

	if (compErr || !comp) {
		throw new Error(`getObservableSkill: competence '${competenceCode}' not found`);
	}

	// Find skill via subdimension (skills carry observable_code per subdimension)
	const { data: skill, error: skillErr } = await service
		.from('skills' as never)
		.select('*, math_competence_subdimensions!skills_subdimension_id_fkey(math_competence_id)')
		.eq('observable_code', observableCode)
		.eq('family', 'competence')
		.limit(20);

	if (skillErr || !skill) {
		throw new Error(`getObservableSkill: error loading skills: ${skillErr?.message}`);
	}

	// Filter by competence id
	const matching = (
		skill as Array<
			SkillRow & { math_competence_subdimensions: { math_competence_id: string } | null }
		>
	).filter(
		(s) => s.math_competence_subdimensions?.math_competence_id === (comp as { id: string }).id
	);

	if (matching.length === 0) {
		throw new Error(
			`getObservableSkill: no observable '${observableCode}' for competence '${competenceCode}'`
		);
	}

	return matching[0] as SkillRow;
}

/** Return the UUID of a math_competence by code. */
export async function getMathCompetenceId(
	service: SupabaseClient<Database>,
	code: string
): Promise<string> {
	const { data, error } = await service
		.from('math_competences' as never)
		.select('id')
		.eq('code', code)
		.single();

	if (error || !data) {
		throw new Error(`getMathCompetenceId: competence '${code}' not found: ${error?.message}`);
	}

	return (data as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Attempt insertion helpers (service role — for cache pre-population)
// ---------------------------------------------------------------------------

/** Insert a single Family A (knowledge) skill_attempt via service role. */
export async function insertKnowledgeAttempt(
	service: SupabaseClient<Database>,
	params: {
		studentId: string;
		skillId: string;
		templateId: string;
		success: boolean;
		source?: 'auto' | 'teacher' | 'student_self';
	}
): Promise<void> {
	// Family A: the attempt references a template; the after-insert trigger derives
	// the skill from the template's tags. Tag the template with skillId first, then
	// insert WITHOUT skill_id (chk_attempt_family_regime requires skill_id NULL when
	// template_id is set).
	const { error: tagErr } = await service
		.from('question_template_skills' as never)
		.upsert({ template_id: params.templateId, skill_id: params.skillId } as never, {
			onConflict: 'template_id,skill_id'
		});
	if (tagErr) {
		throw new Error(`insertKnowledgeAttempt tag failed: ${tagErr.message}`);
	}

	const { error } = await service.from('skill_attempts' as never).insert({
		student_id: params.studentId,
		template_id: params.templateId,
		success: params.success,
		source: params.source ?? 'auto'
	});

	if (error) {
		throw new Error(`insertKnowledgeAttempt failed: ${error.message}`);
	}
}

/** Insert a single Family B (competence) skill_attempt via service role. */
export async function insertCompetenceAttempt(
	service: SupabaseClient<Database>,
	params: {
		studentId: string;
		skillId: string;
		taskId: string;
		code: 'plus' | 'minus';
		source?: 'auto' | 'teacher' | 'student_self';
	}
): Promise<void> {
	const { error } = await service.from('skill_attempts' as never).insert({
		student_id: params.studentId,
		skill_id: params.skillId,
		task_id: params.taskId,
		code: params.code,
		source: params.source ?? 'teacher'
	});

	if (error) {
		throw new Error(`insertCompetenceAttempt failed: ${error.message}`);
	}
}

// ---------------------------------------------------------------------------
// Cache read helpers
// ---------------------------------------------------------------------------

/** Read the Family A cache row for (student, skill). Returns null if absent. */
export async function getSkillStateA(
	service: SupabaseClient<Database>,
	studentId: string,
	skillId: string
): Promise<StudentSkillStateARow | null> {
	const { data, error } = await service
		.from('student_skill_state_a' as never)
		.select('*')
		.eq('student_id', studentId)
		.eq('skill_id', skillId)
		.maybeSingle();

	if (error) throw new Error(`getSkillStateA failed: ${error.message}`);
	return data as StudentSkillStateARow | null;
}

/** Read the VIEW row (includes to_review flag). Returns null if absent. */
export async function getSkillStateAView(
	service: SupabaseClient<Database>,
	studentId: string,
	skillId: string
): Promise<StudentSkillStateAViewRow | null> {
	const { data, error } = await service
		.from('student_skill_state_a_v' as never)
		.select('*')
		.eq('student_id', studentId)
		.eq('skill_id', skillId)
		.maybeSingle();

	if (error) throw new Error(`getSkillStateAView failed: ${error.message}`);
	return data as StudentSkillStateAViewRow | null;
}

/** Read the Family B observable cache row for (student, skill). */
export async function getObservableState(
	service: SupabaseClient<Database>,
	studentId: string,
	skillId: string
): Promise<StudentObservableStateRow | null> {
	const { data, error } = await service
		.from('student_observable_state' as never)
		.select('*')
		.eq('student_id', studentId)
		.eq('skill_id', skillId)
		.maybeSingle();

	if (error) throw new Error(`getObservableState failed: ${error.message}`);
	return data as StudentObservableStateRow | null;
}

/** Read the competence-level cache row for (student, math_competence). */
export async function getCompetenceLevel(
	service: SupabaseClient<Database>,
	studentId: string,
	mathCompetenceId: string
): Promise<StudentCompetenceLevelRow | null> {
	const { data, error } = await service
		.from('student_competence_level' as never)
		.select('*')
		.eq('student_id', studentId)
		.eq('math_competence_id', mathCompetenceId)
		.maybeSingle();

	if (error) throw new Error(`getCompetenceLevel failed: ${error.message}`);
	return data as StudentCompetenceLevelRow | null;
}

// ---------------------------------------------------------------------------
// Fake question_template helper
// ---------------------------------------------------------------------------

/** Create a minimal question_template row for use as template_id in attempts. */
export async function createFakeTemplate(
	service: SupabaseClient<Database>,
	createdBy: string
): Promise<string> {
	const { data, error } = await service
		.from('question_templates')
		.insert({
			domain: 'test',
			// UNIQUE idx_question_templates_unique_category (theme, domain, subdomain, level)
			// WHERE published: keep domain='test' (cleanup marker) but vary theme per call
			// so repeated createFakeTemplate() calls don't collide.
			theme: `test-${crypto.randomUUID()}`,
			title: `test-template-${crypto.randomUUID()}`,
			// CHECK question_templates_type_check: valid types only (not 'direct').
			type: 'numerical_exact',
			level: 1,
			// CHECK question_templates_valid_grades: is_valid_grade_array accepts '6', not '6e'.
			grades: ['6'],
			status: 'published',
			// CHECK variations_minimum_one: jsonb_array_length(variations) >= 1.
			variations: [{}],
			created_by: createdBy
		})
		.select('id')
		.single();

	if (error || !data) {
		throw new Error(`createFakeTemplate failed: ${error?.message}`);
	}

	return data.id;
}

// ---------------------------------------------------------------------------
// Evaluation task helper
// ---------------------------------------------------------------------------

/** Create an evaluation_task via service role. Returns the task id. */
export async function createEvaluationTask(
	service: SupabaseClient<Database>,
	params: {
		teacherId: string;
		classId?: string | null;
		name?: string;
		niveauScolaire?: string;
	}
): Promise<string> {
	// Mono-teacher: evaluation_tasks.teacher_id was dropped (role-based ownership).
	void params.teacherId;
	const { data, error } = await service
		.from('evaluation_tasks' as never)
		.insert({
			class_id: params.classId ?? null,
			name: params.name ?? 'Test task',
			niveau_scolaire: params.niveauScolaire ?? '6e'
		})
		.select('id')
		.single();

	if (error || !data) {
		throw new Error(`createEvaluationTask failed: ${error?.message}`);
	}

	return (data as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Cleanup helper (extends the standard cleanupAllTestData for new tables)
// ---------------------------------------------------------------------------

/**
 * Delete all test data for the competence referentiel tables.
 * Called in afterAll / beforeEach to keep tests isolated.
 * Respects FK cascade order.
 *
 * Strategy: find all test profiles (email @test.com), then delete
 * every dependent row by student_id / teacher_id, then remove the
 * profiles themselves and auth.users entries.
 */
export async function cleanupCompetenceTestData(): Promise<void> {
	const service = createServiceRoleClient();

	// Step 1: collect test profile IDs
	const { data: profiles } = await service
		.from('profiles')
		.select('id, role')
		.like('email', '%@test.com');

	if (!profiles || profiles.length === 0) return;

	const allIds = profiles.map((p) => p.id);

	// Step 2: delete attempts (leaf; ON DELETE CASCADE from profiles already handles it,
	// but we do it explicitly to avoid trigger side-effects on non-existent cache rows)
	if (allIds.length > 0) {
		await service
			.from('skill_attempts' as never)
			.delete()
			.in('student_id', allIds);

		// Step 3: caches
		await service
			.from('student_skill_state_a' as never)
			.delete()
			.in('student_id', allIds);
		await service
			.from('student_observable_state' as never)
			.delete()
			.in('student_id', allIds);
		await service
			.from('student_competence_level' as never)
			.delete()
			.in('student_id', allIds);
	}

	// Step 4: evaluation tasks. Mono-teacher dropped evaluation_tasks.teacher_id, so
	// they no longer scope by teacher; purge all (test DB only — seed.sql has none).
	// Delete perimeter first (defensive, even though task_id has ON DELETE CASCADE).
	await service
		.from('evaluation_task_perimeter' as never)
		.delete()
		.not('task_id', 'is', null);
	await service
		.from('evaluation_tasks' as never)
		.delete()
		.not('id', 'is', null);

	// Step 5: fake templates (domain = 'test') — scoped to test users to avoid
	// polluting parallel test sessions (B10: filter by created_by)
	if (allIds.length > 0) {
		await service.from('question_templates').delete().eq('domain', 'test').in('created_by', allIds);
	}

	// Step 6: class membership + classes
	if (allIds.length > 0) {
		await service.from('class_members').delete().in('student_id', allIds);
	}
	// classes no longer carry teacher_id; purge all (test DB only — seed.sql has none).
	await service.from('classes').delete().not('id', 'is', null);

	// Step 7: profiles + auth users — replica-mode deletion. A client-side
	// `from('profiles').delete()` (or auth.admin.deleteUser) is silently aborted by
	// the local-only storage.protect_delete guard reached via
	// trigger_delete_exercise_images on a cascade, leaking the profile →
	// enforce_single_teacher contamination. deleteTestAuthUsers() removes all
	// @test.com profiles + auth users under session_replication_role=replica.
	await deleteTestAuthUsers();
}

// ---------------------------------------------------------------------------
// Endpoint call helpers (for skill-attempts-endpoint tests)
// ---------------------------------------------------------------------------

/**
 * Tag a question_template with a skill via the question_template_skills table.
 * Uses service role to bypass RLS.
 *
 * @param service - Service-role Supabase client
 * @param templateId - UUID of the question_template
 * @param skillId - UUID of the skill to tag
 */
export async function tagTemplateWithSkill(
	service: SupabaseClient<Database>,
	templateId: string,
	skillId: string
): Promise<void> {
	const { error } = await service
		.from('question_template_skills' as never)
		.insert({ template_id: templateId, skill_id: skillId } as never);

	if (error) {
		// ON CONFLICT DO NOTHING — duplicate tags are silently accepted
		if (error.code !== '23505') {
			throw new Error(`tagTemplateWithSkill failed: ${error.message}`);
		}
	}
}

/**
 * Return type for callSkillAttemptsEndpoint.
 */
export type SkillAttemptsEndpointResult = {
	status: number;
	body: { inserted: number; skill_ids: string[] } | { error: string; detail?: string };
};

/**
 * Convenience wrapper: calls the POST /api/skill-attempts endpoint directly
 * (no HTTP server needed) using a pre-built locals object.
 *
 * @param supabase - Supabase client to use (service role or authenticated)
 * @param user - User object to inject via safeGetSession mock
 * @param body - Request body (template_id, success, etc.)
 */
export async function callSkillAttemptsEndpoint(
	supabase: SupabaseClient<Database>,
	user: import('@supabase/supabase-js').User,
	body: { template_id: string; success: boolean; with_help?: boolean; phase_blocage?: string }
): Promise<SkillAttemptsEndpointResult> {
	const { vi } = await import('vitest');
	const { POST } = await import('../../src/routes/api/skill-attempts/+server');

	const locals: App.Locals = {
		supabase: supabase as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		profile: null,
		requestId: crypto.randomUUID()
	};

	const request = new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	try {
		const response = await POST({ request, locals } as never);
		const responseBody = await response.json();
		return { status: response.status, body: responseBody };
	} catch (err: unknown) {
		// SvelteKit error() throws an object with { status, body } shape
		const httpError = err as { status?: number; body?: { message?: string } };
		return {
			status: httpError.status ?? 500,
			body: { error: httpError.body?.message ?? 'unknown error' }
		};
	}
}

/**
 * Find an existing (template, skill) pair from question_template_skills that
 * was created by migration 20260609130000 — i.e., a real seeded 6e template
 * tagged to a real knowledge skill.
 *
 * Filters by the template's domain/subdomain to target a specific seed.
 * Returns null if the migration hasn't been applied yet.
 *
 * @param service - Service-role client
 * @param domain - Template domain to match (e.g. 'Fractions')
 * @param subdomain - Template subdomain to match (e.g. 'Addition')
 */
export async function getTaggedKnowledgeTemplate(
	service: SupabaseClient<Database>,
	domain: string,
	subdomain: string
): Promise<{ template_id: string; skill_id: string } | null> {
	const { data, error } = await service
		.from('question_template_skills' as never)
		.select('template_id, skill_id, question_templates!inner(domain, subdomain)')
		.eq('question_templates.domain', domain)
		.eq('question_templates.subdomain', subdomain)
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new Error(`getTaggedKnowledgeTemplate failed: ${error.message}`);
	}

	if (!data) return null;
	const row = data as { template_id: string; skill_id: string };
	return { template_id: row.template_id, skill_id: row.skill_id };
}

// ---------------------------------------------------------------------------
// Re-export commonly used helpers from other files for convenience
// ---------------------------------------------------------------------------

export { TestData, generateTestEmail, createServiceRoleClient, createAuthenticatedClient };
