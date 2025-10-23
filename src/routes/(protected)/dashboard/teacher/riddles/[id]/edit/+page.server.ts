import type { PageServerLoad, Actions } from './$types';
import type { DbRiddle, UpdateRiddleData } from '$lib/types/riddle';
import { error, redirect, fail } from '@sveltejs/kit';

/**
 * Load riddle for editing
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Fetch riddle (RLS ensures user can only access their own)
	const { data: riddle, error: riddleError } = await supabase
		.from('riddles')
		.select('*')
		.eq('id', params.id)
		.eq('created_by', session.user.id)
		.single();

	if (riddleError || !riddle) {
		console.error('Error fetching riddle:', riddleError);
		throw error(404, 'Énigme non trouvée');
	}

	return {
		riddle: riddle as DbRiddle
	};
};

/**
 * Update riddle action
 */
export const actions: Actions = {
	default: async ({ params, request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();

		// Parse answer config (JSON)
		let answer = null;
		const answerStr = formData.get('answer')?.toString();
		if (answerStr && answerStr !== 'null') {
			try {
				answer = JSON.parse(answerStr);
			} catch (e) {
				console.error('Error parsing answer config:', e);
			}
		}

		// Parse form data
		const updateData: Partial<DbRiddle> = {
			title: formData.get('title')?.toString() || '',
			genre: formData.get('genre')?.toString() || null,
			difficulty: parseInt(formData.get('difficulty')?.toString() || '1') as 1 | 2 | 3,
			statement: formData.get('statement')?.toString() || '',
			correction: formData.get('correction')?.toString() || '',
			image_url: formData.get('image_url')?.toString() || null,
			answer,
			status: (formData.get('status')?.toString() || 'draft') as 'draft' | 'published'
		};

		// Validate required fields
		if (!updateData.title || !updateData.statement || !updateData.correction) {
			return fail(400, { message: 'Titre, énoncé et correction sont obligatoires' });
		}

		// Update riddle (RLS ensures user can only update their own)
		const { error: updateError } = await supabase
			.from('riddles')
			.update(updateData)
			.eq('id', params.id)
			.eq('created_by', session.user.id);

		if (updateError) {
			console.error('Error updating riddle:', updateError);
			return fail(500, { message: 'Erreur lors de la mise à jour de l\'énigme' });
		}

		// Redirect to riddles list
		throw redirect(303, '/dashboard/teacher/riddles');
	}
};
