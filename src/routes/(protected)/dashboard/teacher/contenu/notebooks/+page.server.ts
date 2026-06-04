/**
 * Teacher Content hub — Notebooks tab.
 *
 * Lists the notebooks authored by the current teacher with their metadata
 * (description, public flag, last update). Public-read of *other* teachers'
 * notebooks is intentionally not surfaced here — this is a personal
 * library, parallel to `/dashboard/teacher/contenu/exercices`.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	if (!user || !profile) {
		throw error(401, 'Non autorisé - Authentification requise');
	}
	// The contenu hub is teacher-only; reflect the same gate as siblings.
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	// Filter out templates — they live in the parallel /templates gallery so
	// the personal-library view stays focused on cloned/assigned content.
	const { data: notebooks, error: notebooksError } = await locals.supabase
		.from('python_notebooks')
		.select('id, title, description, is_public, created_at, updated_at')
		.eq('author_id', user.id)
		.eq('is_template', false)
		.order('updated_at', { ascending: false });

	if (notebooksError) {
		console.error('Error loading notebooks:', notebooksError);
		throw error(500, 'Erreur lors du chargement des notebooks');
	}

	return {
		notebooks: notebooks ?? []
	};
};
