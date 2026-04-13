/**
 * POST /api/student/buddy/xp
 * ===========================
 *
 * Add XP to the student's buddy from an exercise answer.
 *
 * AUTH: Student only
 *
 * REQUEST BODY:
 * {
 *   isCorrect: boolean,
 *   theme?: string
 * }
 *
 * RESPONSE:
 * {
 *   xpResult: BuddyXpGainResult,
 *   streakUpdated: boolean,
 *   newStreak: number,
 *   streakBonusXp: number,
 *   isNewTheme: boolean
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { addBuddyXpFromExercise } from '$lib/server/buddy-xp-service';
import { z } from 'zod';

const bodySchema = z.object({
	isCorrect: z.boolean(),
	theme: z.string().optional()
});

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'student');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete invalide (JSON attendu)');
	}

	const validation = bodySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		const result = await addBuddyXpFromExercise(locals.supabase, user.id, {
			isCorrect: validation.data.isCorrect,
			theme: validation.data.theme
		});

		if (!result) {
			return json({ buddy_xp: null });
		}

		return json({ buddy_xp: result });
	} catch (err) {
		console.error('❌ [API] POST /api/student/buddy/xp:', err);
		throw error(500, "Erreur lors de l'ajout d'XP");
	}
};
