import type { PageServerLoad, Actions } from './$types';
import type { CreateRiddleData } from '$lib/types/riddle';
import { redirect, fail } from '@sveltejs/kit';

/**
 * Load page (no data needed for new riddle)
 */
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	return {};
};

/**
 * Create riddle action
 */
export const actions: Actions = {
	default: async ({ request, locals: { supabase, safeGetSession } }) => {
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
		const riddleData: CreateRiddleData & { created_by: string } = {
			title: formData.get('title')?.toString() || '',
			genre: formData.get('genre')?.toString() || undefined,
			difficulty: parseInt(formData.get('difficulty')?.toString() || '1') as 1 | 2 | 3,
			statement: formData.get('statement')?.toString() || '',
			correction: formData.get('correction')?.toString() || '',
			image_url: formData.get('image_url')?.toString() || undefined,
			answer,
			status: (formData.get('status')?.toString() || 'draft') as 'draft' | 'published',
			created_by: session.user.id
		};

		// Validate required fields
		if (!riddleData.title || !riddleData.statement || !riddleData.correction) {
			return fail(400, { message: 'Titre, énoncé et correction sont obligatoires' });
		}

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
