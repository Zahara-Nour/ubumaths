/**
 * GET/POST /api/student/buddy
 * ============================
 *
 * GET: Fetch the student's buddy state
 * POST: Create a new buddy after quiz selection
 *
 * AUTH: Student only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getStudentBuddy, createStudentBuddy } from '$lib/server/buddy-queries';
import { chooseBuddySchema } from '$lib/server/validation/buddy';

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	try {
		const buddy = await getStudentBuddy(locals.supabase, user.id);
		return json({ buddy });
	} catch (err) {
		console.error('❌ [API] GET /api/student/buddy:', err);
		throw error(500, 'Erreur lors de la recuperation du buddy');
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'student');

	// Validate body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete invalide (JSON attendu)');
	}

	const validation = chooseBuddySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { palotinType } = validation.data;

	try {
		// Check if buddy already exists
		const existing = await getStudentBuddy(locals.supabase, user.id);
		if (existing) {
			throw error(409, 'Un Palotin a deja ete choisi');
		}

		const buddy = await createStudentBuddy(locals.supabase, user.id, palotinType);
		return json({ buddy }, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('❌ [API] POST /api/student/buddy:', err);
		throw error(500, 'Erreur lors de la creation du buddy');
	}
};
