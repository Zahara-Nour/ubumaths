/**
 * Page Server: /python-notebook
 * Load user's Python notebooks
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = locals;

	if (!user || !profile) {
		throw error(401, 'Non autorisé - Authentification requise');
	}

	// Fetch user's notebooks
	const { data: notebooks, error: notebooksError } = await locals.supabase
		.from('python_notebooks')
		.select(
			`
			id,
			title,
			description,
			is_public,
			created_at,
			updated_at
		`
		)
		.eq('author_id', user.id)
		.order('updated_at', { ascending: false });

	if (notebooksError) {
		console.error('Error loading notebooks:', notebooksError);
		throw error(500, 'Erreur lors du chargement des notebooks');
	}

	// If student, also fetch assigned notebooks
	let assignedNotebooks: Array<{
		id: string;
		title: string;
		description: string | null;
		created_at: string;
		updated_at: string;
		profiles: { firstname: string | null; lastname: string | null } | null;
		assignment: {
			id: string;
			readonly: boolean;
			created_at: string;
			class_name: string | null;
		};
	}> = [];

	if (profile.role === 'student') {
		const { data: assigned, error: assignedError } = await locals.supabase
			.from('python_notebook_assignments')
			.select(
				`
				id,
				readonly,
				created_at,
				python_notebooks!python_notebook_assignments_notebook_id_fkey (
					id,
					title,
					description,
					created_at,
					updated_at,
					profiles!python_notebooks_author_id_fkey (
						firstname,
						lastname
					)
				),
				classes!python_notebook_assignments_class_id_fkey (
					name
				)
			`
			)
			.order('created_at', { ascending: false });

		if (!assignedError && assigned) {
			assignedNotebooks = assigned
				.filter((a) => a.python_notebooks)
				.map((a) => {
					// Supabase returns related single records as objects, not arrays
					const notebook = a.python_notebooks as unknown as {
						id: string;
						title: string;
						description: string | null;
						created_at: string;
						updated_at: string;
						profiles: { firstname: string | null; lastname: string | null } | null;
					};
					const classData = a.classes as unknown as { name: string } | null;
					return {
						...notebook,
						assignment: {
							id: a.id,
							readonly: a.readonly,
							created_at: a.created_at,
							class_name: classData?.name ?? null
						}
					};
				});
		}
	}

	return {
		notebooks: notebooks ?? [],
		assignedNotebooks,
		userRole: profile.role
	};
};
