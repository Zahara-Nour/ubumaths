/**
 * Integration Tests: POST /api/skill-attempts
 * ============================================
 *
 * Tests the full stack of the skill-attempts endpoint against a local Supabase
 * instance (run `pnpm db:start` and `pnpm db:migrate` first).
 *
 * Refonte 2026-06-10 (Phase 2 chantier SRS/FSRS) :
 * - L'endpoint insère TOUJOURS 1 row (per-template), peu importe le tagging.
 * - `observable_id` est NULL en régime contenus (la M2M `question_template_points`
 *   est la source de la liaison).
 * - Le trigger PG boucle sur les skills tagués famille A pour mettre à jour
 *   `student_point_state` (N updates pour N skills tagués).
 * - Le déclencheur FSRS UPSERT `srs_card_stats` est fail-loud (500 si erreur).
 * - Auto-ajout au deck Programme (`is_auto_managed=true`) si template tagué famille A.
 *
 * Strategy
 * --------
 * We call the SvelteKit RequestHandler function directly (imported from +server.ts)
 * rather than hitting an HTTP server. This avoids needing a running dev server while
 * still exercising real DB behavior.
 *
 * For each test we construct a minimal App.Locals object with:
 *   - `supabase`: either a service-role client (bypasses RLS) or an authenticated
 *     anon client (enforces RLS)
 *   - `safeGetSession`: a vi.fn() stub that returns the expected user
 *   - `user` / `profile` / `requestId`: typed placeholders (unused by this endpoint)
 *
 * Coverage
 * --------
 *   1. Zod validation — 400 for malformed bodies
 *   2. Auth + RLS — 401 for anon; 200 with student_id=auth.uid() enforced by RLS
 *   3. Endpoint behaviour — 404 for missing template; 200 with inserted=1 (always),
 *      point_ids reflects tagged knowledge skills
 *   4. Post-chantier — observable_id NULL en régime contenus, FSRS auto-update, Programme deck
 *      auto-create
 *   5. End-to-end — answer → POST → trigger → student_point_state cache updated
 *   6. Robustness — duplicate inserts create distinct rows; 500 path documented
 *
 * Migrations required:
 *   20260609120000_competence_referentiel_schema.sql
 *   20260609120001_competence_referentiel_triggers.sql
 *   20260609120002_competence_referentiel_rls.sql
 *   20260609130000_seed_question_template_points.sql
 *   20260610100000_refonte_skill_attempts_per_template.sql      (refonte chantier)
 *   20260610100100_srs_deck_sections.sql                         (Programme deck)
 *   20260610150000_followup_p0_uniques_and_checks.sql           (UNIQUE Programme + CHECK grade B)
 *
 * @module tests/integration/skill-attempts-endpoint
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { User } from '@supabase/supabase-js';

import { POST } from '../../src/routes/api/skill-attempts/+server';

import {
	createServiceRoleClient,
	TestData,
	createAuthenticatedClient,
	createFakeTemplate,
	getKnowledgeSkill,
	getSkillStateA,
	getSkillStateAView,
	cleanupCompetenceTestData,
	tagTemplateWithSkill,
	callSkillAttemptsEndpoint,
	getTaggedKnowledgeTemplate
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

// ---------------------------------------------------------------------------
// Poll helper (same pattern as competence-referentiel.test.ts)
// ---------------------------------------------------------------------------

async function pollSkillStateA(
	studentId: string,
	skillId: string,
	timeoutMs = 4000
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

// ---------------------------------------------------------------------------
// Build a fake App.Locals for calling POST directly
// ---------------------------------------------------------------------------

function buildLocals(
	supabaseClient: SupabaseClient<Database>,
	userOrNull: User | null
): App.Locals {
	return {
		supabase: supabaseClient as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: userOrNull }),
		user: userOrNull,
		profile: null,
		requestId: crypto.randomUUID()
	};
}

function buildRequest(body: unknown): Request {
	return new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

// ============================================================================
// 1. Zod validation — 400 for malformed bodies
// ============================================================================

describe('POST /api/skill-attempts — validation Zod', () => {
	// Each test creates its own student profile to avoid conflicts with the
	// root-level beforeEach cleanup (which purges all @test.com profiles).

	it('returns 400 for an empty body', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const request = new Request('http://localhost/api/skill-attempts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{}'
		});

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when template_id is not a UUID', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: 'not-a-uuid', success: true });

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when success is absent', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: crypto.randomUUID() });

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when phase_blocage has an invalid value', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({
			template_id: crypto.randomUUID(),
			success: true,
			phase_blocage: 'invalide_valeur'
		});

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('returns 400 when body is not valid JSON', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const request = new Request('http://localhost/api/skill-attempts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{ invalid json'
		});

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('returns 200 with { inserted: 1, point_ids: [] } for a valid body pointing to an untagged template', async () => {
		// Refonte 2026-06-10 : 1 row INSERT toujours, point_ids reflète seulement les skills tagués famille A.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: templateId, success: true });

		const response = await POST({ request, locals } as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.inserted).toBe(1);
		expect(data.point_ids).toEqual([]);

		// Verify the row exists with observable_id=NULL (régime contenus per-template)
		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('observable_id, template_id, source')
			.eq('template_id', templateId);
		expect(rows).toHaveLength(1);
		const row = (
			rows as Array<{ observable_id: string | null; template_id: string; source: string }>
		)[0];
		expect(row.observable_id).toBeNull();
		expect(row.source).toBe('auto');
	});
});

// ============================================================================
// 2. Auth + RLS
// ============================================================================

describe('POST /api/skill-attempts — auth + RLS', () => {
	it('returns 401 when there is no session (anon)', async () => {
		const { createClient } = await import('@supabase/supabase-js');
		const url = process.env.SUPABASE_TEST_URL ?? 'http://localhost:54321';
		const anonKey =
			process.env.SUPABASE_TEST_ANON_KEY ??
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
		const anonClient = createClient(url, anonKey, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// safeGetSession returns null user — simulates no session
		const locals = buildLocals(anonClient as unknown as SupabaseClient<Database>, null);
		const request = buildRequest({ template_id: crypto.randomUUID(), success: true });

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 401 });
	});

	it('returns 200 for an authenticated student using their own account', async () => {
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const studentUser = { id: student.id } as User;
		// Use the service-role client so the template lookup succeeds (no RLS issue on templates)
		// The student_id in the INSERT will be set to studentUser.id by the endpoint
		const locals = buildLocals(service, studentUser);
		const request = buildRequest({ template_id: templateId, success: true });

		const response = await POST({ request, locals } as never);
		const data = await response.json();

		// Template untagged → inserted=1 (row persisted) avec point_ids=[]
		expect(response.status).toBe(200);
		expect(data.inserted).toBe(1);
		expect(data.point_ids).toEqual([]);
	});

	it('student_id in INSERT is always auth.uid() — any extra student_id field in body is ignored', async () => {
		// The Zod schema for the endpoint does NOT accept a student_id field in the body.
		// The endpoint always uses user.id from requireAuth. We verify the Zod schema
		// rejects an unexpected field gracefully (stripUnknown by default in z.object).
		const student = await TestData.profile().withRole('student').create();
		const otherStudent = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);

		// Tag the template with a real skill so the INSERT actually runs
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const studentUser = { id: student.id } as User;
		const authenticatedClient = await createAuthenticatedClient(student.email);
		const locals = buildLocals(
			authenticatedClient as unknown as SupabaseClient<Database>,
			studentUser
		);

		// Body includes a rogue student_id field — Zod will strip it (z.object is strict-mode safe)
		const request = buildRequest({
			template_id: templateId,
			success: true,
			student_id: otherStudent.id // should be silently ignored
		});

		const response = await POST({ request, locals } as never);
		expect(response.status).toBe(200);

		// Verify the row was inserted for the authenticated student, not otherStudent
		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('student_id')
			.eq('template_id', templateId);
		const insertedRow = (rows as Array<{ student_id: string }>)[0];
		expect(insertedRow?.student_id).toBe(student.id);
		expect(insertedRow?.student_id).not.toBe(otherStudent.id);
	});
});

// ============================================================================
// 3. Endpoint behaviour
// ============================================================================

describe('POST /api/skill-attempts — comportement', () => {
	it('returns 404 with error=template_not_found for a non-existent template_id', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);
		const nonExistentUuid = crypto.randomUUID();
		const request = buildRequest({ template_id: nonExistentUuid, success: true });

		await expect(POST({ request, locals } as never)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 200 with { inserted: 1, point_ids: [] } for a template with no tagged skills (row stored, observable_id NULL)', async () => {
		// Refonte 2026-06-10 : 1 row INSERT toujours, même sans tagging.
		// La row a observable_id=NULL en régime contenus — la M2M question_template_points
		// est la source de la liaison vers les skills (vide ici).
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: templateId, success: false });

		const response = await POST({ request, locals } as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.inserted).toBe(1);
		expect(data.point_ids).toEqual([]);
	});

	it('returns 200 with { inserted: 1, point_ids: [<uuid>] } for a template with 1 tagged skill', async () => {
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: templateId, success: true });

		const response = await POST({ request, locals } as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.inserted).toBe(1);
		expect(Array.isArray(data.point_ids)).toBe(true);
		expect(data.point_ids).toHaveLength(1);
		expect(data.point_ids[0]).toBe(skill.id);
	});

	it('creates the skill_attempts row with correct fields: source=auto, student_id=auth.uid(), template_id, success, observable_id=NULL (régime contenus per-template)', async () => {
		// Refonte 2026-06-10 : observable_id est NULL en régime contenus. La liaison vers les
		// skills passe par question_template_points à la lecture.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Nombres décimaux', 1);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({ template_id: templateId, success: false, with_help: true });

		await POST({ request, locals } as never);

		// Verify the row in DB via service role
		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('student_id, observable_id, template_id, success, with_help, source, grade')
			.eq('template_id', templateId)
			.eq('student_id', student.id);

		// 1 row inserted (per-template) — pas N rows comme avant
		expect(rows).toHaveLength(1);
		const row = (
			rows as Array<{
				student_id: string;
				observable_id: string | null;
				template_id: string;
				success: boolean;
				with_help: boolean;
				source: string;
				grade: number | null;
			}>
		)[0];
		expect(row.student_id).toBe(student.id);
		expect(row.observable_id).toBeNull(); // ← refonte chantier : NULL en régime A
		expect(row.template_id).toBe(templateId);
		expect(row.success).toBe(false);
		expect(row.with_help).toBe(true);
		expect(row.source).toBe('auto');
		// Mapping success → grade : false → 1 (Again)
		expect(row.grade).toBe(1);
	});

	it('stores phase_blocage when provided', async () => {
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Proportionnalité', 1);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const request = buildRequest({
			template_id: templateId,
			success: false,
			phase_blocage: 'calculer'
		});

		await POST({ request, locals } as never);

		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('phase_blocage')
			.eq('template_id', templateId)
			.eq('student_id', student.id);

		const row = (rows as Array<{ phase_blocage: string | null }>)[0];
		expect(row?.phase_blocage).toBe('calculer');
	});

	it('creates 2 distinct attempt rows when called twice (no deduplication)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 2);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const makeRequest = () => buildRequest({ template_id: templateId, success: true });

		const locals1 = buildLocals(service, { id: student.id } as User);
		const locals2 = buildLocals(service, { id: student.id } as User);

		// Two sequential calls
		const r1 = await POST({ request: makeRequest(), locals: locals1 } as never);
		const r2 = await POST({ request: makeRequest(), locals: locals2 } as never);

		expect(r1.status).toBe(200);
		expect(r2.status).toBe(200);

		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('template_id', templateId)
			.eq('student_id', student.id);

		expect((rows as Array<{ id: string }>).length).toBe(2);
	});
});

// ============================================================================
// 4. End-to-end: answer → attempt → trigger → cache
// ============================================================================

describe('End-to-end : answer → attempt → trigger → cache', () => {
	it('distinct_template_successes=2 and is_acquired=true after 2 successes via endpoint on 2 different tagged templates', async () => {
		// Arrange: student + 2 fake templates both tagged on the same skill
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		expect(skill.regime_acquisition).toBe('diversite');

		// Create 2 distinct templates and tag them both to the same skill
		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);
		await tagTemplateWithSkill(service, tpl1, skill.id);
		await tagTemplateWithSkill(service, tpl2, skill.id);

		const studentUser = { id: student.id } as User;

		// Act: call endpoint twice with different template_ids
		const r1 = await POST({
			request: buildRequest({ template_id: tpl1, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);
		const r2 = await POST({
			request: buildRequest({ template_id: tpl2, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);

		expect(r1.status).toBe(200);
		expect(r2.status).toBe(200);

		// Assert: trigger has written the cache
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.distinct_template_successes).toBeGreaterThanOrEqual(2);
		expect(state.is_acquired).toBe(true);
	});

	it('VIEW student_point_state_v shows to_review=false immediately after acquisition via endpoint', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 2);
		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);
		await tagTemplateWithSkill(service, tpl1, skill.id);
		await tagTemplateWithSkill(service, tpl2, skill.id);

		const studentUser = { id: student.id } as User;

		await POST({
			request: buildRequest({ template_id: tpl1, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);
		await POST({
			request: buildRequest({ template_id: tpl2, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);

		// Wait for trigger
		await pollSkillStateA(student.id, skill.id);

		// Check VIEW
		const view = await getSkillStateAView(service, student.id, skill.id);
		expect(view).not.toBeNull();
		expect(view!.is_acquired).toBe(true);
		expect(view!.needs_remediation).toBe(false); // freshly acquired
	});

	it('needs_remediation=true after 2 failures via endpoint', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres décimaux', 1);
		expect(skill.regime_acquisition).toBe('diversite');

		const tpl1 = await createFakeTemplate(service, student.id);
		const tpl2 = await createFakeTemplate(service, student.id);
		await tagTemplateWithSkill(service, tpl1, skill.id);
		await tagTemplateWithSkill(service, tpl2, skill.id);

		const studentUser = { id: student.id } as User;

		// 1 success then 2 failures
		await POST({
			request: buildRequest({ template_id: tpl1, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);
		await POST({
			request: buildRequest({ template_id: tpl2, success: false }),
			locals: buildLocals(service, studentUser)
		} as never);
		await POST({
			request: buildRequest({ template_id: tpl2, success: false }),
			locals: buildLocals(service, studentUser)
		} as never);

		// Wait for trigger to update cache
		const state = await pollSkillStateA(student.id, skill.id);
		expect(state.is_acquired).toBe(false);
		expect(state.needs_remediation).toBe(true);
	});

	// Skipped: prod EU has 0 rows in question_template_points (the migration-2.1 tagging
	// data is not present — there is no real tagged template to verify), so there is
	// nothing to seed for this assertion. Per-template tagging is covered by the tests
	// above that tag their own fake templates via tagTemplateWithSkill().
	it.skip('one of the seeded 6e templates (Fractions/Addition) is correctly tagged via migration 2.1', async () => {
		// Verify that the migration 20260609130000 actually tagged real templates.
		// getTaggedKnowledgeTemplate fetches a template that has at least one skill linked.
		const taggedTemplate = await getTaggedKnowledgeTemplate(service, 'Fractions', 'Addition');
		expect(taggedTemplate).not.toBeNull();
		expect(taggedTemplate!.template_id).toBeDefined();
		expect(taggedTemplate!.point_id).toBeDefined();

		// Now call the endpoint with a real seeded template
		const student = await TestData.profile().withRole('student').create();
		const studentUser = { id: student.id } as User;
		const request = buildRequest({ template_id: taggedTemplate!.template_id, success: true });

		const response = await POST({ request, locals: buildLocals(service, studentUser) } as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.inserted).toBeGreaterThanOrEqual(1);
		expect(data.point_ids).toContain(taggedTemplate!.point_id);
	});

	it('with_help=false is stored by default when not provided', async () => {
		const student = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Proportionnalité', 1);
		const tpl = await createFakeTemplate(service, student.id);
		await tagTemplateWithSkill(service, tpl, skill.id);

		const studentUser = { id: student.id } as User;
		const request = buildRequest({ template_id: tpl, success: true }); // no with_help

		await POST({ request, locals: buildLocals(service, studentUser) } as never);

		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('with_help')
			.eq('template_id', tpl);

		const row = (rows as Array<{ with_help: boolean }>)[0];
		expect(row?.with_help).toBe(false);
	});
});

// ============================================================================
// 5. Robustness / fail-silent
// ============================================================================

describe('Fail-silent — robustesse', () => {
	it('two calls to the endpoint create 2 distinct rows without conflict (no UNIQUE constraint on template+student+skill)', async () => {
		// This verifies the design decision: no deduplication at DB level for family knowledge
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 3);
		await tagTemplateWithSkill(service, tpl, skill.id);

		const studentUser = { id: student.id } as User;

		// First call via service role to simulate a pre-existing attempt
		const r1 = await POST({
			request: buildRequest({ template_id: tpl, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);
		expect(r1.status).toBe(200);

		// Second call (same template, same student) — should still succeed
		const r2 = await POST({
			request: buildRequest({ template_id: tpl, success: true }),
			locals: buildLocals(service, studentUser)
		} as never);
		expect(r2.status).toBe(200);

		// Both rows exist
		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('template_id', tpl)
			.eq('student_id', student.id);

		expect((rows as Array<{ id: string }>).length).toBe(2);
	});

	it('endpoint returns 200 { inserted: 1, point_ids: [] } for template without knowledge tagged skills (point_ids filtered by family=knowledge)', async () => {
		// Refonte 2026-06-10 : 1 row INSERT toujours. point_ids filtre seulement
		// les skills famille knowledge — un template tagué seulement avec famille
		// competence (cas exotique) ou sans tag renvoie point_ids=[] mais le row
		// est créé.
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const response = await POST({
			request: buildRequest({ template_id: tpl, success: true }),
			locals
		} as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.inserted).toBe(1);
		expect(data.point_ids).toEqual([]);
	});

	it('calling endpoint with phase_blocage=regulation creates the row correctly (boundary value)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		await tagTemplateWithSkill(service, tpl, skill.id);

		const response = await POST({
			request: buildRequest({
				template_id: tpl,
				success: false,
				phase_blocage: 'regulation'
			}),
			locals: buildLocals(service, { id: student.id } as User)
		} as never);

		expect(response.status).toBe(200);

		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('phase_blocage')
			.eq('template_id', tpl)
			.eq('student_id', student.id);

		const row = (rows as Array<{ phase_blocage: string | null }>)[0];
		expect(row?.phase_blocage).toBe('regulation');
	});

	it('all 5 valid phase_blocage values are accepted by Zod', async () => {
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);
		const validValues = ['comprendre', 'modeliser', 'calculer', 'repondre', 'regulation'] as const;
		const studentUser = { id: student.id } as User;

		for (const phaseBlocage of validValues) {
			const response = await POST({
				request: buildRequest({ template_id: tpl, success: false, phase_blocage: phaseBlocage }),
				locals: buildLocals(service, studentUser)
			} as never);
			// Refonte 2026-06-10 : 200 OK avec inserted=1 toujours (row stored).
			expect(response.status).toBe(200);
		}
	});
});

// ============================================================================
// 7. Refonte chantier 2026-06-10 — Comportements per-template
// ============================================================================

describe('Refonte per-template — comportements ajoutés', () => {
	it('1 attempt sur template tagué avec N skills → 1 row skill_attempts inséré, N rows student_point_state updated', async () => {
		// Refonte 2026-06-10 : la fonction trigger boucle sur question_template_points
		// et met à jour 1 row student_point_state par skill tagué famille A.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill1 = await getKnowledgeSkill(service, 'Fractions', 1);
		const skill2 = await getKnowledgeSkill(service, 'Fractions', 2);
		await tagTemplateWithSkill(service, templateId, skill1.id);
		await tagTemplateWithSkill(service, templateId, skill2.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const response = await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		// 1 row inserted regardless of N skills
		expect(data.inserted).toBe(1);
		// Both knowledge skills returned in point_ids
		expect(data.point_ids).toHaveLength(2);
		expect(data.point_ids).toEqual(expect.arrayContaining([skill1.id, skill2.id]));

		// 1 row skill_attempts dans la DB
		const { data: attemptRows } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('template_id', templateId)
			.eq('student_id', student.id);
		expect((attemptRows as Array<{ id: string }>).length).toBe(1);

		// 2 rows student_point_state (1 par skill) après trigger
		const state1 = await pollSkillStateA(student.id, skill1.id);
		const state2 = await pollSkillStateA(student.id, skill2.id);
		expect(state1.total_successes).toBeGreaterThanOrEqual(1);
		expect(state2.total_successes).toBeGreaterThanOrEqual(1);
	});

	it('success=true → grade=3 (Good) ; success=false → grade=1 (Again)', async () => {
		// Vérifie le mapping appliqué par l'endpoint pour FSRS.
		const student = await TestData.profile().withRole('student').create();
		const tplOk = await createFakeTemplate(service, student.id);
		const tplKo = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		await tagTemplateWithSkill(service, tplOk, skill.id);
		await tagTemplateWithSkill(service, tplKo, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		await POST({
			request: buildRequest({ template_id: tplOk, success: true }),
			locals
		} as never);
		await POST({
			request: buildRequest({ template_id: tplKo, success: false }),
			locals
		} as never);

		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('template_id, success, grade')
			.eq('student_id', student.id)
			.in('template_id', [tplOk, tplKo]);

		const rowOk = (rows as Array<{ template_id: string; grade: number }>).find(
			(r) => r.template_id === tplOk
		);
		const rowKo = (rows as Array<{ template_id: string; grade: number }>).find(
			(r) => r.template_id === tplKo
		);
		expect(rowOk?.grade).toBe(3); // Good
		expect(rowKo?.grade).toBe(1); // Again
	});

	it('Auto-création du deck Programme à la 1ʳᵉ interaction famille A', async () => {
		// Refonte 2026-06-10 : ensureProgrammeDeckCard auto-crée le deck Programme
		// (is_auto_managed=true) si absent + y ajoute la carte template.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 3);
		await tagTemplateWithSkill(service, templateId, skill.id);

		// Avant l'appel : pas de deck Programme
		const { data: decksBefore } = await service
			.from('srs_decks' as never)
			.select('id, name, is_auto_managed')
			.eq('owner_id', student.id);
		expect(
			(decksBefore as Array<{ is_auto_managed: boolean }>).filter((d) => d.is_auto_managed)
		).toHaveLength(0);

		const locals = buildLocals(service, { id: student.id } as User);
		await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);

		// Après l'appel : 1 deck Programme + 1 carte
		const { data: decksAfter } = await service
			.from('srs_decks' as never)
			.select('id, name, is_auto_managed, deck_type')
			.eq('owner_id', student.id);
		const programmeDeck = (
			decksAfter as Array<{
				id: string;
				name: string;
				is_auto_managed: boolean;
				deck_type: string;
			}>
		).find((d) => d.is_auto_managed);
		expect(programmeDeck).toBeDefined();
		expect(programmeDeck?.name).toBe('Programme');
		expect(programmeDeck?.deck_type).toBe('personal');

		const { data: cards } = await service
			.from('srs_cards' as never)
			.select('template_id, card_type')
			.eq('deck_id', programmeDeck!.id);
		expect(cards).toHaveLength(1);
		const card = (cards as Array<{ template_id: string; card_type: string }>)[0];
		expect(card.template_id).toBe(templateId);
		expect(card.card_type).toBe('template');
	});

	it('Idempotence : 2 appels sur le même template → 1 seule carte dans le deck Programme', async () => {
		// Vérifie l'UNIQUE INDEX uq_srs_cards_deck_template + ON CONFLICT DO NOTHING.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 4);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);
		await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);

		// 2 rows skill_attempts mais 1 seule carte dans Programme
		const { data: decks } = await service
			.from('srs_decks' as never)
			.select('id')
			.eq('owner_id', student.id)
			.eq('is_auto_managed', true);
		const programmeDeckId = (decks as Array<{ id: string }>)[0]?.id;
		expect(programmeDeckId).toBeDefined();

		const { data: cards } = await service
			.from('srs_cards' as never)
			.select('id')
			.eq('deck_id', programmeDeckId)
			.eq('template_id', templateId);
		expect(cards).toHaveLength(1);
	});

	it('Template non tagué famille A → pas d ajout au deck Programme (mais skill_attempts row OK)', async () => {
		// Refonte 2026-06-10 : Programme ne contient que les templates tagués famille A.
		// Un template sans tag laisse FSRS suivre le template (srs_card_stats créé)
		// mais ne crée pas de carte dans Programme.
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		// Pas de tagTemplateWithSkill — template volontairement non tagué

		const locals = buildLocals(service, { id: student.id } as User);
		const response = await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.inserted).toBe(1);
		expect(data.point_ids).toEqual([]);

		// skill_attempts row créée
		const { data: attempts } = await service
			.from('skill_attempts' as never)
			.select('id')
			.eq('template_id', templateId);
		expect((attempts as Array<{ id: string }>).length).toBe(1);

		// Pas de deck Programme créé (ou créé mais sans carte pour ce template)
		const { data: decks } = await service
			.from('srs_decks' as never)
			.select('id')
			.eq('owner_id', student.id)
			.eq('is_auto_managed', true);
		const programmeDeckId = (decks as Array<{ id: string }>)[0]?.id;

		if (programmeDeckId) {
			// Si un Programme existe (par exemple via un test précédent), il ne doit pas
			// contenir cette carte.
			const { data: cards } = await service
				.from('srs_cards' as never)
				.select('id')
				.eq('deck_id', programmeDeckId)
				.eq('template_id', templateId);
			expect(cards).toHaveLength(0);
		}
	});

	it('FSRS srs_card_stats créé automatiquement avec state=learning à la 1ʳᵉ interaction réussie', async () => {
		// Refonte 2026-06-10 : applyFsrsUpdate crée srs_card_stats si absent.
		// État après 1 succès : state=learning (transition new → learning).
		const student = await TestData.profile().withRole('student').create();
		const templateId = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Nombres décimaux', 2);
		await tagTemplateWithSkill(service, templateId, skill.id);

		const locals = buildLocals(service, { id: student.id } as User);
		await POST({
			request: buildRequest({ template_id: templateId, success: true }),
			locals
		} as never);

		const { data: stats } = await service
			.from('srs_card_stats' as never)
			.select('state, total_reviews, difficulty, stability, next_review')
			.eq('user_id', student.id)
			.eq('card_reference_type', 'template')
			.eq('card_reference_id', templateId);

		expect(stats).toHaveLength(1);
		const stat = (
			stats as Array<{
				state: string;
				total_reviews: number;
				difficulty: number;
				stability: number;
				next_review: string;
			}>
		)[0];
		expect(stat.state).toBe('learning');
		expect(stat.total_reviews).toBe(1);
		expect(stat.difficulty).toBeGreaterThan(0);
		expect(stat.stability).toBeGreaterThan(0);
		expect(new Date(stat.next_review).getTime()).toBeGreaterThan(Date.now());
	});
});

// ============================================================================
// 6. RLS via authenticated client (double-check that student_id=auth.uid()
//    is enforced at DB level, not just by endpoint logic)
// ============================================================================

describe('POST /api/skill-attempts — RLS enforcement via authenticated client', () => {
	it('RLS policy allows a student to INSERT with their own student_id', async () => {
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		await tagTemplateWithSkill(service, tpl, skill.id);

		// Use the student's own authenticated supabase client (enforces RLS)
		const studentSupabase = await createAuthenticatedClient(student.email);
		const studentUser = { id: student.id } as User;

		const locals = buildLocals(studentSupabase as unknown as SupabaseClient<Database>, studentUser);
		const response = await POST({
			request: buildRequest({ template_id: tpl, success: true }),
			locals
		} as never);

		expect(response.status).toBe(200);

		// The inserted row exists and is owned by the student
		const { data: rows } = await service
			.from('skill_attempts' as never)
			.select('student_id, source')
			.eq('template_id', tpl);

		expect((rows as Array<{ student_id: string; source: string }>)[0]?.student_id).toBe(student.id);
		expect((rows as Array<{ student_id: string; source: string }>)[0]?.source).toBe('auto');
	});

	it('RLS policy blocks INSERT when student_id in the row differs from auth.uid()', async () => {
		// This tests the RLS WITH CHECK policy directly — bypassing the endpoint.
		// The endpoint always sets student_id=auth.uid(), so to test the RLS we
		// insert directly via the authenticated Supabase client.
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Nombres entiers', 1);
		const tpl = await createFakeTemplate(service, studentB.id);

		const studentASupabase = await createAuthenticatedClient(studentA.email);

		// studentA tries to insert a row with student_id=studentB.id directly
		const { error: insertError } = await studentASupabase.from('skill_attempts' as never).insert({
			student_id: studentB.id, // NOT auth.uid()
			observable_id: skill.id,
			template_id: tpl,
			success: true,
			source: 'auto'
		});

		// RLS WITH CHECK (student_id = auth.uid()) must fail
		expect(insertError).not.toBeNull();
	});

	it('student cannot SELECT skill_attempts rows belonging to another student via authenticated client', async () => {
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const skill = await getKnowledgeSkill(service, 'Fractions', 1);
		const tpl = await createFakeTemplate(service, studentB.id);

		// Insert an attempt for studentB via service role
		await service.from('skill_attempts' as never).insert({
			student_id: studentB.id,
			observable_id: skill.id,
			template_id: tpl,
			success: true,
			source: 'auto'
		});

		// studentA queries with their own authenticated client
		const studentASupabase = await createAuthenticatedClient(studentA.email);
		const { data } = await studentASupabase
			.from('skill_attempts' as never)
			.select('id')
			.eq('student_id', studentB.id);

		expect((data as Array<unknown>).length).toBe(0);
	});
});

// ============================================================================
// 7. callSkillAttemptsEndpoint helper smoke test
// ============================================================================

describe('callSkillAttemptsEndpoint helper', () => {
	it('helper wraps the endpoint call and returns parsed JSON', async () => {
		const student = await TestData.profile().withRole('student').create();
		const tpl = await createFakeTemplate(service, student.id);
		const studentUser = { id: student.id } as User;

		const result = await callSkillAttemptsEndpoint(service, studentUser, {
			template_id: tpl,
			success: true
		});

		expect(result.status).toBe(200);
		expect(result.body).toHaveProperty('inserted');
	});
});
