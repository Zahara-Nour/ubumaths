import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { validateFormData, riddleFormSchema, parseRiddleAnswerField } from '$lib/server/validation';
import { requireRoles } from '$lib/server/middleware/auth';
import type { TablesInsert } from '$lib/types/database';
import { RIDDLE_COLUMNS } from '$lib/types/riddle';
import { toJson } from '$lib/types/database-helpers';
import { saveRiddleSolution } from '$lib/server/riddle-solutions';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/contenu/enigmes/new/+page.server');

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
			const [firstError] = Object.values(validation.errors).flat();
			return fail(400, { message: firstError, errors: validation.errors });
		}

		// Réponse attendue contrôlée avant toute écriture : mal formée, elle ferait
		// compter faux les réponses des élèves.
		const parsedAnswer = parseRiddleAnswerField(validation.data.answer);
		if (!parsedAnswer.ok) {
			return fail(400, {
				message: parsedAnswer.message,
				errors: { answer: [parsedAnswer.message] }
			});
		}

		// Le type d'insertion généré exprime l'absence par `null` (Postgres), là où
		// `CreateRiddleData` l'exprime par `undefined` (TypeScript). Réponse attendue et
		// correction ne vont PAS dans `riddles` : elles vont dans `riddle_solutions`.
		const riddleData: TablesInsert<'riddles'> = {
			title: validation.data.title,
			genre: validation.data.genre || null,
			difficulty: validation.data.difficulty,
			statement: validation.data.statement,
			image_url: validation.data.image_url || null,
			status: validation.data.status,
			created_by: user.id
		};

		// Insert riddle
		const { data: newRiddle, error: insertError } = await supabase
			.from('riddles')
			.insert([riddleData])
			.select(RIDDLE_COLUMNS)
			.single();

		if (insertError || !newRiddle) {
			logger.error('[RIDDLE CREATE SERVER] Error creating riddle:', insertError);
			return fail(500, { message: "Erreur lors de la création de l'énigme" });
		}

		// `answer` part dans une colonne jsonb, d'où la conversion explicite.
		const saved = await saveRiddleSolution(supabase, newRiddle.id, {
			answer: toJson(parsedAnswer.answer),
			correction: validation.data.correction
		});

		if (!saved.ok) {
			logger.error('[RIDDLE CREATE SERVER] Error saving solution:', saved);
			// Compensation : une énigme sans sa solution ne doit pas rester en base
			// (publiée, elle se validerait à la main sans correction).
			const { data: deleted, error: deleteError } = await supabase
				.from('riddles')
				.delete()
				.eq('id', newRiddle.id)
				.select('id');
			if (deleteError || !deleted || deleted.length === 0) {
				logger.error('[RIDDLE CREATE SERVER] Compensation impossible :', {
					riddleId: newRiddle.id,
					deleteError
				});
			}
			return fail(500, {
				message: "Erreur lors de l'enregistrement de la réponse et de la correction"
			});
		}

		// Return success (client will handle navigation)
		return { success: true, riddle: newRiddle };
	}
};
