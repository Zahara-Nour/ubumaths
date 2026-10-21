/**
 * POST /api/student/buddy/change
 * ================================
 *
 * Change the student's Palotin type.
 * First change is free, subsequent changes cost 50 gidouilles.
 * XP is always preserved.
 *
 * AUTH: Student only
 *
 * REQUEST BODY:
 * {
 *   newPalotinType: 'giron' | 'pile' | 'cotice'
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { changeStudentPalotin } from '$lib/server/buddy-queries';
import { changeBuddySchema } from '$lib/server/validation/buddy';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/buddy/change/+server');

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'student');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete invalide (JSON attendu)');
	}

	const validation = changeBuddySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { newPalotinType } = validation.data;

	try {
		// Changement et débit au client service, identité de la session : le prix
		// et l'enchaînement débit/changement sont tenus par changeStudentPalotin
		const result = await changeStudentPalotin(user.id, newPalotinType);

		switch (result.status) {
			case 'missing':
				throw error(404, 'Aucun Palotin choisi');
			case 'same':
				throw error(400, 'Palotin déjà choisi');
			case 'insufficient':
				throw error(400, `${result.cost} gidouilles nécessaires pour changer de Palotin`);
			case 'conflict':
				throw error(409, 'Palotin modifié entre-temps, réessaie');
			case 'changed':
				return json({ buddy: result.buddy, cost: result.cost });
		}
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		logger.error('❌ [API] POST /api/student/buddy/change:', err);
		throw error(500, 'Erreur lors du changement de Palotin');
	}
};
