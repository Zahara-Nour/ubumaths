/**
 * Page Server: /python-notebook/[id]/present
 *
 * Loads the notebook for the presentation mode (full-screen, cell-by-cell).
 * Permissions mirror the editor route — owner-teacher or shared-class student.
 * The presentation route is always read-only on the notebook content itself
 * (cells can still be re-executed and checkpoints clicked, but edits go
 * through the editor route).
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { uuidSchema } from '$lib/server/validation/common';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = locals;

	if (!user || !profile) {
		throw error(401, 'Non autorisé - Authentification requise');
	}

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}
	const notebookId = idValidation.data;

	const { data: notebook, error: queryError } = await locals.supabase
		.from('python_notebooks')
		.select(
			`
				id,
				title,
				description,
				content,
				author_id,
				is_public,
				created_at,
				updated_at,
				profiles!python_notebooks_author_id_fkey (
					firstname,
					lastname
				)
			`
		)
		.eq('id', notebookId)
		.single();

	if (queryError) {
		if (queryError.code === 'PGRST116') throw error(404, 'Notebook introuvable');
		console.error('Error loading notebook for presentation:', queryError);
		throw error(500, 'Erreur lors du chargement du notebook');
	}
	if (!notebook) throw error(404, 'Notebook introuvable');

	// Same access rules as the editor route: owner, public+teacher, or assigned student.
	const isOwner = notebook.author_id === user.id;
	const isPublicAndTeacher = notebook.is_public && profile.role === 'teacher';
	let isAssigned = false;

	if (profile.role === 'student') {
		const { data: assignment } = await locals.supabase
			.from('python_notebook_assignments')
			.select('id')
			.eq('notebook_id', notebookId)
			.limit(1)
			.maybeSingle();
		isAssigned = !!assignment;
	}

	if (!isOwner && !isPublicAndTeacher && !isAssigned) {
		throw error(403, 'Accès interdit à ce notebook');
	}

	return {
		notebook,
		isOwner,
		userRole: profile.role
	};
};
