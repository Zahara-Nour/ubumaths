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
		const { data: existing } = await supabase
			.from('riddle_of_the_day')
			.select('riddle_id')
			.eq('assignment_date', targetDate)
			.single();

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

		const { data: recentRiddles } = await supabase
			.from('riddle_of_the_day')
			.select('riddle_id')
			.gte('assignment_date', thirtyDaysAgoStr);

		const recentRiddleIds = (recentRiddles || []).map((r) => r.riddle_id);

		// Get last used difficulty to determine next difficulty
		const { data: lastRiddle } = await supabase
			.from('riddle_of_the_day')
			.select(
				`
				riddle:riddles!inner(difficulty)
			`
			)
			.lt('assignment_date', targetDate)
			.order('assignment_date', { ascending: false })
			.limit(1)
			.single();

		// Determine next difficulty (rotate 1 -> 2 -> 3 -> 1)
		let targetDifficulty: RiddleDifficulty = 1;
		if (lastRiddle?.riddle?.difficulty) {
			const lastDiff = lastRiddle.riddle.difficulty;
			targetDifficulty = (lastDiff === 3 ? 1 : lastDiff + 1) as RiddleDifficulty;
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
			const { error: setError } = await supabase.rpc('set_riddle_of_the_day', {
				p_riddle_id: selectedRiddle.id,
				p_assignment_date: targetDate
			});

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
		const { error: setError } = await supabase.rpc('set_riddle_of_the_day', {
			p_riddle_id: selectedRiddle.id,
			p_assignment_date: targetDate
		});

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
	const { data: existing } = await supabase
		.from('riddle_of_the_day')
		.select('riddle_id')
		.eq('assignment_date', today)
		.single();

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
