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
	.min(3, 'Slug too short')
	.max(100, 'Slug too long')
	.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid slug format');

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
		throw error(400, 'Invalid slug format');
	}

	// Fetch exercise by slug
	const result = await getExerciseBySlug(locals.supabase, slug);

	if (result.error || !result.data) {
		throw error(404, 'Exercise not found');
	}

	const exercise = result.data;

	// Check access: must be public OR user is the creator
	const userId = locals.user?.id;
	const isCreator = userId && exercise.created_by === userId;
	const isPublic = exercise.is_public === true;

	if (!isPublic && !isCreator) {
		throw error(403, 'This exercise is not public');
	}

	return json({ exercise });
};
