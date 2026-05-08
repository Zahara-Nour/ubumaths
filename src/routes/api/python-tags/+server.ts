/**
 * API Route: /api/python-tags
 * GET  - List all available python tags (sorted alphabetically)
 * POST - Create a new python tag
 *
 * This endpoint is the python-exercises counterpart of /api/tags. It targets
 * the dedicated `python_tags` table (created in migration
 * 20260508162152_create_python_tags.sql) so the python tag vocabulary stays
 * separate from the math exercise tag vocabulary.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	validateCreateTag,
	tagListResponseSchema,
	createTagResponseSchema
} from '$lib/server/validation';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	await requireAuth(locals);

	const { data, error: fetchError } = await locals.supabase
		.from('python_tags')
		.select('id, name, created_by, created_at')
		.order('name', { ascending: true });

	if (fetchError) {
		console.error('Failed to fetch python tags:', fetchError);
		throw error(500, 'Failed to fetch python tags');
	}

	const validated = validateJsonResponse(
		tagListResponseSchema,
		{ tags: data ?? [] },
		'GET /api/python-tags'
	);

	return json(validated);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireAuth(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateCreateTag(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name } = validation.data;

	// Check if tag already exists (case-insensitive)
	const { data: existing } = await locals.supabase
		.from('python_tags')
		.select('id, name')
		.ilike('name', name)
		.single();

	if (existing) {
		const { data: fullTag } = await locals.supabase
			.from('python_tags')
			.select('id, name, created_by, created_at')
			.eq('id', existing.id)
			.single();

		if (fullTag) {
			const validated = validateJsonResponse(
				createTagResponseSchema,
				fullTag,
				'POST /api/python-tags (existing)'
			);
			return json(validated, { status: 200 });
		}
	}

	const { data: newTag, error: insertError } = await locals.supabase
		.from('python_tags')
		.insert({
			name: name.trim(),
			created_by: user.id
		})
		.select('id, name, created_by, created_at')
		.single();

	if (insertError) {
		if (insertError.code === '23505') {
			throw error(409, 'Ce tag existe déjà');
		}
		console.error('Failed to create python tag:', insertError);
		throw error(500, 'Failed to create python tag');
	}

	const validated = validateJsonResponse(createTagResponseSchema, newTag, 'POST /api/python-tags');

	return json(validated, { status: 201 });
};
