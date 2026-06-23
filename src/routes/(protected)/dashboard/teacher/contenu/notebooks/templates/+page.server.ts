/**
 * Teacher Content hub — Notebook Templates gallery.
 *
 * Loads two buckets of templates the caller can clone:
 *   - own templates (the teacher's personal library)
 *   - shared templates (is_public = true, authored by other teachers)
 *
 * A third "system" bucket is reserved for Chiphre-shipped templates; for
 * V1 it stays empty (the page handles the empty case gracefully).
 *
 * Permissions: teacher / admin only — students don't see templates at all.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	if (!user || !profile) {
		throw error(401, 'Non autorisé - Authentification requise');
	}
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	// Fetch in one round-trip: all visible templates (own + public). We split
	// them client-side into "Mes templates" / "Templates partagés" buckets.
	// The `.or()` is intentionally **narrower than RLS** — it caps gallery
	// visibility to (own | shared) and excludes any roundabout paths RLS
	// might allow (e.g. a teacher who landed in `python_notebook_assignments`
	// for a template by accident). Defense in depth: do not simplify by
	// removing the `.or()` even though the RLS policy is the actual gate.
	const { data: templates, error: queryError } = await locals.supabase
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
		.or(`author_id.eq.${user.id},is_public.eq.true`)
		.order('updated_at', { ascending: false });

	if (queryError) {
		console.error('Error loading templates:', queryError);
		throw error(500, 'Erreur lors du chargement des templates');
	}

	return {
		templates: templates ?? [],
		currentUserId: user.id
	};
};
