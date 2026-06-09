/**
 * API Route: POST /api/skill-attempts
 *
 * Creates skill_attempts rows for every family-knowledge skill tagged on a
 * question_template, based on the outcome of a student's local answer
 * validation.
 *
 * Only family 'knowledge' skills are processed here. Family 'competence'
 * attempts are handled by the teacher through evaluation_tasks (decision 72).
 *
 * Response:
 *   200 { inserted: number, skill_ids: string[] }
 *
 * Error codes:
 *   400 – Zod validation failure
 *   401 – not authenticated (thrown by requireAuth)
 *   404 – template_id does not exist in question_templates
 *   500 – INSERT failed (RLS violation, constraint, network)
 *
 * Security:
 *   - RLS policy `skill_attempts_insert_own_student` enforces
 *     `student_id = auth.uid()` — no manual check needed.
 *   - Inserting with `source='auto'` is allowed by the student insert policy.
 *   - Family competence rows would violate the `chk_attempt_family_regime`
 *     CHECK (success IS NOT NULL required) — filtered out at query level.
 *
 * Spec: docs/wip/competence-referentiel-phase2-progress.md §2.2
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { skillAttemptInputSchema } from '$lib/server/validation/skill-attempts';

// ============================================================================
// POST /api/skill-attempts
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authenticate — throws 401 if no valid session
	const { user } = await requireAuth(locals);

	// 2. Parse and validate body
	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = skillAttemptInputSchema.safeParse(bodyRaw);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { template_id, success, with_help, phase_blocage } = validation.data;

	// 3. Verify the template exists
	const { data: templateRow, error: templateError } = await locals.supabase
		.from('question_templates')
		.select('id')
		.eq('id', template_id)
		.maybeSingle();

	if (templateError) {
		console.error('[skill-attempts] Failed to verify template:', templateError);
		throw error(500, 'Failed to verify template');
	}

	if (!templateRow) {
		throw error(404, 'template_not_found');
	}

	// 4. Fetch all family-knowledge skill_ids tagged on this template.
	//    Filter on skills.family = 'knowledge' (generated column, decision 67).
	//    Family 'competence' skills are excluded by design (decision 72).
	const { data: taggedSkills, error: skillsError } = await locals.supabase
		.from('question_template_skills')
		.select('skill_id, skills!inner(family)')
		.eq('template_id', template_id)
		.eq('skills.family', 'knowledge');

	if (skillsError) {
		console.error('[skill-attempts] Failed to fetch tagged skills:', skillsError);
		throw error(500, 'Failed to fetch tagged skills');
	}

	// No skills tagged yet — normal for most templates pre-tagging (decision phase 2)
	if (!taggedSkills || taggedSkills.length === 0) {
		return json({ inserted: 0, skill_ids: [] });
	}

	const skillIds = taggedSkills.map((row) => row.skill_id);

	// 5. Insert one attempt row per skill.
	//    student_id is set explicitly so RLS can verify auth.uid() matches.
	//    template_id is mandatory for the distinct_template_successes rule
	//    on capacite_attendue (decision 60).
	const attemptRows = skillIds.map((skill_id) => ({
		student_id: user.id,
		skill_id,
		template_id,
		success,
		with_help,
		source: 'auto' as const,
		...(phase_blocage !== undefined ? { phase_blocage } : {})
	}));

	const { error: insertError } = await locals.supabase.from('skill_attempts').insert(attemptRows);

	if (insertError) {
		console.error('[skill-attempts] INSERT failed:', insertError);
		return json({ error: 'insert_failed', detail: insertError.message }, { status: 500 });
	}

	return json({ inserted: skillIds.length, skill_ids: skillIds });
};
