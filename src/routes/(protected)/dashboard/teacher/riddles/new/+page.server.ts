import type { PageServerLoad, Actions } from './$types';
import type { CreateRiddleData } from '$lib/types/riddle';
import { redirect, fail } from '@sveltejs/kit';
import { validateFormData, riddleFormSchema } from '$lib/server/validation';

/**
 * Load page (no data needed for new riddle)
 */
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	return {};
};

/**
 * Create riddle action
 */
export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();

		const validation = validateFormData(riddleFormSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		// Parse answer config (JSON)
		let answer = null;
		const answerStr = validation.data.answer;
		if (answerStr && answerStr !== 'null') {
			try {
				answer = JSON.parse(answerStr);
			} catch (e) {
				console.error('Error parsing answer config:', e);
				return fail(400, {
					errors: { answer: ['Format JSON invalide pour la réponse'] }
				});
			}
		}

		// Build riddle data
		const riddleData: CreateRiddleData & { created_by: string } = {
			title: validation.data.title,
			genre: validation.data.genre || undefined,
			difficulty: validation.data.difficulty,
			statement: validation.data.statement,
			correction: validation.data.correction,
			image_url: validation.data.image_url || undefined,
			answer,
			status: validation.data.status,
			created_by: user.id
		};

		// Insert riddle
		const { data: newRiddle, error: insertError } = await supabase
			.from('riddles')
			.insert([riddleData])
			.select()
			.single();

		if (insertError) {
			console.error('[RIDDLE CREATE SERVER] Error creating riddle:', insertError);
			return fail(500, { message: "Erreur lors de la création de l'énigme" });
		}

		console.log('[RIDDLE CREATE SERVER] Insert successful, returning success');
		// Return success (client will handle navigation)
		const result = { success: true, riddle: newRiddle };
		console.log('[RIDDLE CREATE SERVER] Returning:', result);
		return result;
	}
};
