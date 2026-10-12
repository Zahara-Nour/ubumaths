/**
 * API Route: /api/exercises/by-slug/[slug]
 * GET - Get exercise by slug (public access for public exercises)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExerciseBySlug } from '$lib/server/exercises';
import { z } from 'zod';

const slugSchema = z
	.string()
	.min(3, 'Slug trop court')
	.max(100, 'Slug trop long')
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug invalide');

/**
 * GET /api/exercises/by-slug/[slug]
 * Get exercise by slug
 * Public exercises are accessible without authentication
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { slug } = params;

	// Validate slug format
	const validation = slugSchema.safeParse(slug);
	if (!validation.success) {
		throw error(400, 'Slug invalide');
	}

	// Fetch exercise by slug
	const result = await getExerciseBySlug(locals.supabase, slug);

	if (result.error || !result.data) {
		throw error(404, 'Exercice introuvable');
	}

	const exercise = result.data;

	// Check access: must be public OR user is the creator
	const userId = locals.user?.id;
	const isCreator = userId && exercise.created_by === userId;
	const isPublic = exercise.is_public === true;

	if (!isPublic && !isCreator) {
		throw error(403, 'Cet exercice n’est pas public');
	}

	return json({ exercise });
};
