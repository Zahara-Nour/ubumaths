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
import { getStudentBuddy, changeStudentPalotin } from '$lib/server/buddy-queries';
import { changeBuddySchema } from '$lib/server/validation/buddy';

const CHANGE_COST = 50;

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
		const buddy = await getStudentBuddy(locals.supabase, user.id);
		if (!buddy) {
			throw error(404, 'Aucun Palotin choisi');
		}

		if (buddy.palotin_type === newPalotinType) {
			throw error(400, 'Tu as deja ce Palotin');
		}

		// Check cost (first change is free)
		if (buddy.change_count > 0) {
			// Fetch current gidouilles
			const { data: profile, error: profileError } = await locals.supabase
				.from('profiles')
				.select('gidouilles')
				.eq('id', user.id)
				.single();

			if (profileError) throw profileError;

			if ((profile.gidouilles ?? 0) < CHANGE_COST) {
				throw error(400, `Il te faut ${CHANGE_COST} gidouilles pour changer de Palotin`);
			}

			// Deduct gidouilles
			const { error: deductError } = await locals.supabase
				.from('profiles')
				.update({ gidouilles: (profile.gidouilles ?? 0) - CHANGE_COST })
				.eq('id', user.id);

			if (deductError) throw deductError;
		}

		const updatedBuddy = await changeStudentPalotin(locals.supabase, user.id, newPalotinType);

		return json({
			buddy: updatedBuddy,
			cost: buddy.change_count > 0 ? CHANGE_COST : 0
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('❌ [API] POST /api/student/buddy/change:', err);
		throw error(500, 'Erreur lors du changement de Palotin');
	}
};
