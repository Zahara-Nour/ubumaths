/**
 * PATCH /api/teacher/classes/[classId]/anti-fraud/flags/[flagId]
 *
 * Marque un flag comme résolu (resolved=true). Idempotent.
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B10
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { flagIdParamSchema, markResolvedBodySchema } from '$lib/server/validation/anti-fraud';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const classCheck = classIdParamSchema.safeParse({ classId: params.classId });
	if (!classCheck.success) {
		return json({ error: classCheck.error.issues[0].message }, { status: 400 });
	}
	const flagCheck = flagIdParamSchema.safeParse({ flagId: params.flagId });
	if (!flagCheck.success) {
		return json({ error: flagCheck.error.issues[0].message }, { status: 400 });
	}

	let bodyJson: unknown;
	try {
		bodyJson = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const bodyCheck = markResolvedBodySchema.safeParse(bodyJson);
	if (!bodyCheck.success) {
		return json({ error: bodyCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = classCheck.data;
	const { flagId } = flagCheck.data;
	const { user } = await requireTeacherOfClass(locals, classId);

	// Vérif ownership : flag.student_id ∈ classe du prof.
	const { data: flagRow, error: flagErr } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.select('id, student_id, resolved')
		.eq('id', flagId)
		.maybeSingle();

	if (flagErr) {
		return json({ error: flagErr.message }, { status: 500 });
	}
	if (!flagRow) {
		// Volontairement 404 pour ne pas révéler l'existence d'un flag d'une autre classe.
		return json({ error: 'Flag not found' }, { status: 404 });
	}

	const { data: membership } = await locals.supabase
		.from('class_members')
		.select('id')
		.eq('class_id', classId)
		.eq('student_id', flagRow.student_id)
		.eq('status', 'active')
		.maybeSingle();

	if (!membership) {
		return json({ error: 'Flag not found' }, { status: 404 });
	}

	// Idempotent : si déjà résolu, retour 200 sans UPDATE.
	if (flagRow.resolved) {
		return json({ id: flagId, resolved: true, already_resolved: true });
	}

	const nowIso = new Date().toISOString();
	const { error: updateErr } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.update({
			resolved: true,
			resolved_by: user.id,
			resolved_at: nowIso
		})
		.eq('id', flagId);

	if (updateErr) {
		return json({ error: updateErr.message }, { status: 500 });
	}

	return json({ id: flagId, resolved: true, resolved_by: user.id, resolved_at: nowIso });
};
