import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { validateFormData, riddleFormSchema } from '$lib/server/validation';
import { requireRoles } from '$lib/server/middleware/auth';
import type { TablesInsert } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';

/**
 * Load page (no data needed for new riddle)
 */
export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	return {};
};

/**
 * Create riddle action
 */
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { supabase } = locals;
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

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

		// Le type d'insertion généré exprime l'absence par `null` (Postgres), là où
		// `CreateRiddleData` l'exprime par `undefined` (TypeScript). `answer` part
		// dans une colonne jsonb, d'où la conversion explicite.
		const riddleData: TablesInsert<'riddles'> = {
			title: validation.data.title,
			genre: validation.data.genre || null,
			difficulty: validation.data.difficulty,
			statement: validation.data.statement,
			correction: validation.data.correction,
			image_url: validation.data.image_url || null,
			answer: toJson(answer),
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
