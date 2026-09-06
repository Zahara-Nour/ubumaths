import type { SupabaseClient } from '@supabase/supabase-js';
import type { RiddleDifficulty } from '$lib/types/riddle';

/**
 * Auto-select riddle of the day
 *
 * Algorithm:
 * 1. Exclude riddles used in the last 30 days
 * 2. Balance difficulty (rotate 1-2-3 based on last used)
 * 3. Randomly select from eligible riddles
 * 4. Upsert into riddle_of_the_day
 */
export async function autoSelectRiddleOfTheDay(
	supabase: SupabaseClient,
	targetDate: string = new Date().toISOString().split('T')[0]
): Promise<{ success: boolean; riddleId?: string; error?: string }> {
	try {
		// Check if riddle already exists for this date
		const { data: existing, error: existingError } = await supabase
			.from('riddle_of_the_day')
			.select('riddle_id')
			.eq('date', targetDate)
			.single();

		// ⚠️ PGRST116 = aucune énigme programmée, cas normal qu'on vient traiter.
		// Toute AUTRE panne prenait le même visage : l'automate poursuivait et son
		// upsert (`onConflict: 'date'`) écrasait l'énigme que le professeur avait
		// choisie à la main.
		if (existingError && existingError.code !== 'PGRST116') {
			console.error('[auto-select] Énigme du jour illisible :', existingError);
			return { success: false, error: 'Impossible de vérifier l’énigme du jour' };
		}

		if (existing) {
			return {
				success: false,
				error: 'Une énigme du jour existe déjà pour cette date'
			};
		}

		// Get riddles used in last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

		const { data: recentRiddles, error: recentRiddlesError } = await supabase
			.from('riddle_of_the_day')
			.select('riddle_id')
			.gte('date', thirtyDaysAgoStr);

		// Cette liste EXCLUT les énigmes déjà posées. Vide par accident, elle
		// autorisait à reproposer aux élèves une énigme vue la semaine passée.
		if (recentRiddlesError) {
			console.error('[auto-select] Énigmes récentes illisibles :', recentRiddlesError);
			return { success: false, error: 'Impossible de lire les énigmes récentes' };
		}

		const recentRiddleIds = (recentRiddles || []).map((r) => r.riddle_id);

		// Get last used difficulty to determine next difficulty
		const { data: lastRiddle, error: lastRiddleError } = await supabase
			.from('riddle_of_the_day')
			.select(
				`
				riddle:riddles!inner(difficulty)
			`
			)
			.lt('date', targetDate)
			.order('date', { ascending: false })
			.limit(1)
			.maybeSingle();

		// La difficulté tourne 1 → 2 → 3 → 1 à partir de la précédente. Sans elle,
		// on repart systématiquement à 1 : la rotation se bloque sur le niveau le
		// plus facile. Aucune ligne (première énigme) est en revanche légitime.
		if (lastRiddleError) {
			console.error('[auto-select] Dernière énigme illisible :', lastRiddleError);
			return { success: false, error: 'Impossible de lire la dernière énigme posée' };
		}

		// Determine next difficulty (rotate 1 -> 2 -> 3 -> 1)
		let targetDifficulty: RiddleDifficulty = 1;
		if (lastRiddle && typeof lastRiddle === 'object' && 'riddle' in lastRiddle) {
			const riddleData = lastRiddle.riddle;
			if (riddleData && typeof riddleData === 'object' && 'difficulty' in riddleData) {
				const lastDiff = riddleData.difficulty as number;
				targetDifficulty = (lastDiff === 3 ? 1 : lastDiff + 1) as RiddleDifficulty;
			}
		}

		// Get eligible riddles
		let query = supabase
			.from('riddles')
			.select('id')
			.eq('status', 'published')
			.eq('difficulty', targetDifficulty);

		if (recentRiddleIds.length > 0) {
			query = query.not('id', 'in', `(${recentRiddleIds.join(',')})`);
		}

		const { data: eligibleRiddles, error: riddlesError } = await query;

		if (riddlesError) {
			console.error('Error fetching eligible riddles:', riddlesError);
			return { success: false, error: 'Erreur lors de la récupération des énigmes' };
		}

		if (!eligibleRiddles || eligibleRiddles.length === 0) {
			// Try any difficulty if no riddles available at target difficulty
			let fallbackQuery = supabase.from('riddles').select('id').eq('status', 'published');

			if (recentRiddleIds.length > 0) {
				fallbackQuery = fallbackQuery.not('id', 'in', `(${recentRiddleIds.join(',')})`);
			}

			const { data: fallbackRiddles } = await fallbackQuery;

			if (!fallbackRiddles || fallbackRiddles.length === 0) {
				return { success: false, error: 'Aucune énigme éligible disponible' };
			}

			// Select random from fallback
			const randomIndex = Math.floor(Math.random() * fallbackRiddles.length);
			const selectedRiddle = fallbackRiddles[randomIndex];

			// Set riddle of the day
			// `set_riddle_of_the_day` force `auto_selected = false` et exige un
			// `p_selected_by` : c'est le poseur MANUEL, inutilisable par un automate.
			// Une sélection automatique s'écrit donc directement, en marquant
			// `auto_selected` — ce que la colonne prévoit précisément.
			const { error: setError } = await supabase.from('riddle_of_the_day').upsert(
				{
					riddle_id: selectedRiddle.id,
					date: targetDate,
					auto_selected: true,
					selected_by: null
				},
				{ onConflict: 'date' }
			);

			if (setError) {
				console.error('Error setting riddle of the day:', setError);
				return { success: false, error: "Erreur lors de la définition de l'énigme" };
			}

			return { success: true, riddleId: selectedRiddle.id };
		}

		// Select random riddle from eligible list
		const randomIndex = Math.floor(Math.random() * eligibleRiddles.length);
		const selectedRiddle = eligibleRiddles[randomIndex];

		// Set riddle of the day using RPC
		// `set_riddle_of_the_day` force `auto_selected = false` et exige un
		// `p_selected_by` : c'est le poseur MANUEL, inutilisable par un automate.
		// Une sélection automatique s'écrit donc directement, en marquant
		// `auto_selected` — ce que la colonne prévoit précisément.
		const { error: setError } = await supabase.from('riddle_of_the_day').upsert(
			{
				riddle_id: selectedRiddle.id,
				date: targetDate,
				auto_selected: true,
				selected_by: null
			},
			{ onConflict: 'date' }
		);

		if (setError) {
			console.error('Error setting riddle of the day:', setError);
			return { success: false, error: "Erreur lors de la définition de l'énigme" };
		}

		return { success: true, riddleId: selectedRiddle.id };
	} catch (err) {
		console.error('Unexpected error in autoSelectRiddleOfTheDay:', err);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Check if auto-select is needed for today and execute
 */
export async function checkAndAutoSelectToday(
	supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
	const today = new Date().toISOString().split('T')[0];

	// Check if riddle already exists
	const { data: existing, error: existingError } = await supabase
		.from('riddle_of_the_day')
		.select('riddle_id')
		.eq('date', today)
		.single();

	// Même garde que ci-dessus : une panne ne doit pas lancer une sélection
	// automatique par-dessus une énigme déjà programmée.
	if (existingError && existingError.code !== 'PGRST116') {
		console.error('[auto-select] Énigme du jour illisible :', existingError);
		return { success: false, message: 'Impossible de vérifier l’énigme du jour' };
	}

	if (existing) {
		return { success: true, message: 'Énigme du jour déjà définie' };
	}

	// Auto-select
	const result = await autoSelectRiddleOfTheDay(supabase, today);

	if (result.success) {
		return {
			success: true,
			message: `Énigme du jour sélectionnée automatiquement: ${result.riddleId}`
		};
	} else {
		return { success: false, message: result.error || 'Échec de la sélection automatique' };
	}
}
