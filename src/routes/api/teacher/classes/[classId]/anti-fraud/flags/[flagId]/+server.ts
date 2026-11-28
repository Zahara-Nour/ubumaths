/**
 * PATCH /api/teacher/classes/[classId]/anti-fraud/flags/[flagId]
 *
 * Marque un flag comme résolu (resolved=true). Idempotent.
 *
 * Cf. spec TDD : docs/archive/wip/srs-anti-fraud-spec-tdd.md §B10
 */

import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '#lib/server/stats/teacher-class-auth.ts';
import { classIdParamSchema } from '#lib/server/validation/teacher-analytics.ts';
import { flagIdParamSchema, markResolvedBodySchema } from '#lib/server/validation/anti-fraud.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger(
	'api/teacher/classes/[classId]/anti-fraud/flags/[flagId]/+server'
);

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const classCheck = classIdParamSchema.safeParse({ classId: params.classId });
	if (!classCheck.success) {
		return Response.json({ error: classCheck.error.issues[0].message }, { status: 400 });
	}
	const flagCheck = flagIdParamSchema.safeParse({ flagId: params.flagId });
	if (!flagCheck.success) {
		return Response.json({ error: flagCheck.error.issues[0].message }, { status: 400 });
	}

	let bodyJson: unknown;
	try {
		bodyJson = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const bodyCheck = markResolvedBodySchema.safeParse(bodyJson);
	if (!bodyCheck.success) {
		return Response.json({ error: bodyCheck.error.issues[0].message }, { status: 400 });
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
		// Le message de la base reste dans le journal du serveur.
		logger.error('Signalement illisible :', flagErr);
		return Response.json({ error: 'Impossible de lire le signalement' }, { status: 500 });
	}
	if (!flagRow) {
		// Volontairement 404 pour ne pas révéler l'existence d'un flag d'une autre classe.
		return Response.json({ error: 'Flag not found' }, { status: 404 });
	}

	const { data: membership, error: membershipError } = await locals.supabase
		.from('class_members')
		.select('id')
		.eq('class_id', classId)
		.eq('student_id', flagRow.student_id)
		.eq('status', 'active')
		.maybeSingle();

	// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
	// panne doit se distinguer d'un refus mérité.
	if (membershipError) {
		logger.error('Contrôle d’accès impossible :', membershipError);
		return Response.json({ error: 'Impossible de vérifier l’accès' }, { status: 500 });
	}

	if (!membership) {
		return Response.json({ error: 'Flag not found' }, { status: 404 });
	}

	// Idempotent : si déjà résolu, retour 200 sans UPDATE.
	if (flagRow.resolved) {
		return Response.json({ id: flagId, resolved: true, already_resolved: true });
	}

	const nowIso = new Date().toISOString();
	const { data: updatedRows, error: updateErr } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.update({
			resolved: true,
			resolved_by: user.id,
			resolved_at: nowIso
		})
		.eq('id', flagId)
		.select('id');

	// Un refus des règles d'accès rend zéro ligne, sans erreur : on vérifie la ligne écrite.
	if (updateErr || (updatedRows ?? []).length === 0) {
		logger.error('Signalement non mis à jour :', updateErr ?? 'aucune ligne écrite');
		return Response.json({ error: 'Impossible de marquer le signalement' }, { status: 500 });
	}

	return Response.json({ id: flagId, resolved: true, resolved_by: user.id, resolved_at: nowIso });
};
