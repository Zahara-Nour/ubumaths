import type { PageServerLoad, Actions } from './$types';
import type { DbRiddle } from '$lib/types/riddle';
import { error, redirect, fail } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';
import { requireRoles } from '$lib/server/middleware/auth';
import type { TablesUpdate } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import { asRiddleDifficulty } from '$lib/types/riddle';

/**
 * Load riddle for editing
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	const id = validateUuidParam(params.id);

	// Fetch riddle (RLS ensures user can only access their own)
	const { data: riddle, error: riddleError } = await supabase
		.from('riddles')
		.select('*')
		.eq('id', id)
		.eq('created_by', user.id)
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
	default: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

		const id = validateUuidParam(params.id);
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
		// Le type d'écriture généré décrit exactement ce que la table accepte :
		// `answer` y est du jsonb, et les deux `as` d'origine affirmaient une
		// valeur venant d'un formulaire, donc d'une source non fiable.
		const updateData: TablesUpdate<'riddles'> = {
			title: formData.get('title')?.toString() || '',
			genre: formData.get('genre')?.toString() || null,
			difficulty: asRiddleDifficulty(parseInt(formData.get('difficulty')?.toString() || '1')),
			statement: formData.get('statement')?.toString() || '',
			correction: formData.get('correction')?.toString() || '',
			image_url: formData.get('image_url')?.toString() || null,
			answer: toJson(answer),
			status: formData.get('status')?.toString() === 'published' ? 'published' : 'draft'
		};

		// Validate required fields
		if (!updateData.title || !updateData.statement || !updateData.correction) {
			return fail(400, { message: 'Titre, énoncé et correction sont obligatoires' });
		}

		// Update riddle (RLS ensures user can only update their own)
		const { error: updateError } = await supabase
			.from('riddles')
			.update(updateData)
			.eq('id', id)
			.eq('created_by', user.id);

		if (updateError) {
			console.error('[RIDDLE EDIT SERVER] Error updating riddle:', updateError);
			return fail(500, { message: "Erreur lors de la mise à jour de l'énigme" });
		}

		console.log('[RIDDLE EDIT SERVER] Update successful, returning success');
		// Return success (client will handle navigation)
		const result = { success: true };
		console.log('[RIDDLE EDIT SERVER] Returning:', result);
		return result;
	}
};
