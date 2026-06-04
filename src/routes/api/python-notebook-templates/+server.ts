/**
 * API Route: /api/python-notebook-templates
 *
 * GET — List notebook templates visible to the caller (own + public).
 *       Teacher-only. Students get 403 — templates are an author surface.
 *
 * Authorization model: the underlying RLS policies on `python_notebooks`
 * already allow (a) own rows and (b) public rows visible to teachers. We
 * just need to filter `is_template = true` and refuse students at the
 * endpoint level so they don't see template skeletons via the API.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { profile } = await requireAuth(locals);

	// Templates are an author/teacher surface — students shouldn't even know
	// they exist. Defense in depth: the RLS on `python_notebooks` already
	// prevents a student from reading a template they aren't assigned to,
	// but explicit 403 here keeps the error semantic.
	if (profile.role === 'student') {
		throw error(403, 'Réservé aux enseignants');
	}

	// Own templates + public templates from other teachers. RLS handles the
	// access check; we explicitly request both ownership branches via OR so
	// the policy can short-circuit on either condition.
	const { data, error: queryError } = await locals.supabase
		.from('python_notebooks')
		.select(
			`
			id,
			title,
			description,
			author_id,
			is_public,
			template_category,
			created_at,
			updated_at,
			profiles!python_notebooks_author_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('is_template', true)
		.order('updated_at', { ascending: false });

	if (queryError) {
		console.error('Failed to list notebook templates:', queryError);
		throw error(500, 'Erreur lors du chargement des templates');
	}

	return json({ templates: data ?? [] });
};
