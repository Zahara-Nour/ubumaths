/**
 * Page Server: /python-notebook/[id]
 * Load single Python notebook with full content
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { uuidSchema } from '$lib/server/validation/common';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = locals;

	if (!user || !profile) {
		throw error(401, 'Non autorisé - Authentification requise');
	}

	// Validate notebook ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}

	const notebookId = idValidation.data;

	// Fetch notebook with author info
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
		if (queryError.code === 'PGRST116') {
			throw error(404, 'Notebook introuvable');
		}
		console.error('Error loading notebook:', queryError);
		throw error(500, 'Erreur lors du chargement du notebook');
	}

	if (!notebook) {
		throw error(404, 'Notebook introuvable');
	}

	// Check access permissions
	const isOwner = notebook.author_id === user.id;
	const isPublicAndTeacher = notebook.is_public && profile.role === 'teacher';

	// Check if student has it assigned
	let isAssigned = false;
	let isReadonly = false;
	if (profile.role === 'student') {
		const { data: assignment } = await locals.supabase
			.from('python_notebook_assignments')
			.select('id, readonly')
			.eq('notebook_id', notebookId)
			.limit(1)
			.maybeSingle();

		if (assignment) {
			isAssigned = true;
			isReadonly = assignment.readonly;
		}
	}

	if (!isOwner && !isPublicAndTeacher && !isAssigned) {
		throw error(403, 'Acces interdit a ce notebook');
	}

	// Determine access level
	const canEdit = isOwner;
	const readonly = !canEdit || isReadonly;

	return {
		notebook,
		canEdit,
		readonly,
		isOwner,
		userRole: profile.role
	};
};
