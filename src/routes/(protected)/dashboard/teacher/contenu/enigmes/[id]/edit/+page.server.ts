import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';
import { requireRoles } from '$lib/server/middleware/auth';
import type { TablesUpdate } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import { asRiddleDifficulty, RIDDLE_COLUMNS, toDbRiddle } from '$lib/types/riddle';
import { fetchRiddleSolutions, saveRiddleSolution } from '$lib/server/riddle-solutions';

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
		.select(RIDDLE_COLUMNS)
		.eq('id', id)
		.eq('created_by', user.id)
		.single();

	if (riddleError || !riddle) {
		console.error('Error fetching riddle:', riddleError);
		throw error(404, 'Énigme non trouvée');
	}

	// Réponse attendue et correction : `riddle_solutions`, que la RLS ouvre à l'auteur.
	const { solutions, error: solutionError } = await fetchRiddleSolutions(supabase, [riddle.id]);
	if (solutionError) {
		// Sans solution lue, le formulaire s'ouvrirait vide et l'enregistrement
		// effacerait la correction existante.
		console.error('Error fetching riddle solution:', solutionError);
		throw error(500, "Impossible de charger la réponse et la correction de l'énigme");
	}

	return {
		riddle: toDbRiddle(riddle, solutions.get(riddle.id) ?? null)
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
		// Le type d'écriture généré décrit exactement ce que la table accepte. Réponse
		// attendue et correction ne s'écrivent plus dans `riddles` : `riddle_solutions`.
		const updateData: TablesUpdate<'riddles'> = {
			title: formData.get('title')?.toString() || '',
			genre: formData.get('genre')?.toString() || null,
			difficulty: asRiddleDifficulty(parseInt(formData.get('difficulty')?.toString() || '1')),
			statement: formData.get('statement')?.toString() || '',
			image_url: formData.get('image_url')?.toString() || null,
			status: formData.get('status')?.toString() === 'published' ? 'published' : 'draft'
		};
		const correction = formData.get('correction')?.toString() || '';

		// Validate required fields
		if (!updateData.title || !updateData.statement || !correction) {
			return fail(400, { message: 'Titre, énoncé et correction sont obligatoires' });
		}

		// Update riddle (RLS ensures user can only update their own). Un refus de la RLS
		// rend zéro ligne sans erreur : seules les lignes rendues prouvent l'écriture.
		const { data: updated, error: updateError } = await supabase
			.from('riddles')
			.update(updateData)
			.eq('id', id)
			.eq('created_by', user.id)
			.select('id');

		if (updateError) {
			console.error('[RIDDLE EDIT SERVER] Error updating riddle:', updateError);
			return fail(500, { message: "Erreur lors de la mise à jour de l'énigme" });
		}
		if (!updated || updated.length === 0) {
			return fail(404, { message: 'Énigme introuvable ou non modifiable' });
		}

		// `answer` part dans une colonne jsonb, d'où la conversion explicite.
		const saved = await saveRiddleSolution(supabase, id, {
			answer: toJson(answer),
			correction
		});
		if (!saved.ok) {
			console.error('[RIDDLE EDIT SERVER] Error saving solution:', saved);
			return fail(500, {
				message: "Erreur lors de l'enregistrement de la réponse et de la correction"
			});
		}

		// Return success (client will handle navigation)
		return { success: true };
	}
};
