import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/riddles/auto-select-daily/+server');

/**
 * La sélection automatique vit dans `api/cron/riddle-of-the-day` (cron Vercel quotidien et
 * bouton admin) ; cette route ne garde que la lecture du statut.
 */

/**
 * GET endpoint to check status
 */
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	const today = new Date().toISOString().split('T')[0];

	const { data: existing, error: existingError } = await supabase
		.from('riddle_of_the_day')
		.select(
			`
			*,
			riddle:riddles(riddle_number, title, difficulty)
		`
		)
		// La colonne s'appelle `date` : `assignment_date` n'existe pas, et la
		// requête était donc rejetée en bloc — la vérification « une énigme
		// est-elle déjà programmée aujourd'hui ? » ne répondait jamais.
		.eq('date', today)
		.single();

	// PGRST116 = aucune énigme programmée aujourd'hui : c'est précisément la
	// réponse que cette route est censée donner, pas une panne.
	if (existingError && existingError.code !== 'PGRST116') {
		logger.error('Énigme du jour illisible :', existingError);
		throw error(500, 'Impossible de vérifier l’énigme du jour');
	}

	return json({
		date: today,
		hasRiddle: !!existing,
		riddle: existing
			? {
					riddleNumber: existing.riddle.riddle_number,
					title: existing.riddle.title,
					difficulty: existing.riddle.difficulty
				}
			: null
	});
};
