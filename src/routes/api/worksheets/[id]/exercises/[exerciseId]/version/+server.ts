/**
 * API Route: /api/worksheets/[id]/exercises/[exerciseId]/version — version d'une ligne de fiche
 * PUT - fait pointer la ligne vers une autre version de son exercice (ADR 0044 point 6)
 *
 * Permis sur un brouillon ET sur une fiche publiée (distribuée comprise : la confirmation est
 * demandée par la page), pas sur une fiche archivée. La policy de `worksheet_exercises` laisse
 * l'auteur de la fiche écrire la ligne ; la clé étrangère composée refuse la version d'un autre
 * exercice.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { setLineVersionSchema } from '#lib/server/validation/worksheets.ts';
import { verifyWorksheetLineAccess } from '#lib/server/worksheets/worksheet-line-access.ts';
import { setLineVersion } from '#lib/server/exercise-versions.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/worksheets/[id]/exercises/[exerciseId]/version/+server');

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const parsed = setLineVersionSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0]?.message ?? 'Données invalides');
	}

	const { worksheet, worksheetExercise } = await verifyWorksheetLineAccess(
		locals.supabase,
		params.id,
		params.exerciseId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	if (worksheet.status === 'archived') {
		throw error(400, 'Une fiche archivée ne se modifie pas : restaurez-la d’abord.');
	}

	let result;
	try {
		result = await setLineVersion(
			locals.supabase,
			worksheet.id,
			worksheetExercise.id,
			worksheetExercise.exercise_id,
			parsed.data.exercise_version_id
		);
	} catch (e) {
		logger.error('Version de ligne non modifiée :', e);
		throw error(500, 'Impossible de changer la version');
	}

	if (!result.updated) {
		if (result.reason === 'wrong_version') {
			throw error(400, 'Cette version n’existe plus ou n’appartient pas à cet exercice.');
		}
		throw error(404, 'Aucune modification enregistrée : exercice introuvable ou accès refusé');
	}

	return Response.json({
		exercise_version_id: parsed.data.exercise_version_id,
		number: result.number
	});
};
