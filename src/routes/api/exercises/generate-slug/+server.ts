/**
 * Exercise Slug Generation API
 * =============================
 *
 * POST /api/exercises/generate-slug
 *
 * Generates a unique slug for a new exercise.
 * Used to get a slug before the exercise is saved, so images can be named properly.
 *
 * Request body:
 * - topic?: string - Optional topic for slug prefix
 *
 * Response:
 * - slug: string - The generated unique slug
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateExerciseSlug, isValidSlug } from '$lib/exercises/slug-generator';

const generateSlugSchema = z.object({
	topic: z.string().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify user is authenticated
	const session = await locals.safeGetSession();
	if (!session.user) {
		throw error(401, 'Non authentifie');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const validation = generateSlugSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { topic } = validation.data;

	// Generate unique slug
	const slug = generateExerciseSlug(topic);

	// Verify it's valid (should always be, but just in case)
	if (!isValidSlug(slug)) {
		throw error(500, 'Erreur lors de la generation du slug');
	}

	return json({ slug });
};
