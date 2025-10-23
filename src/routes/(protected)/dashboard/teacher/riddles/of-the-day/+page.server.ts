import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';

/**
 * Load riddle of the day management data
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Get current riddle of the day
	const { data: currentRiddle } = await supabase.rpc('get_riddle_of_the_day');

	// Get history of past riddles of the day
	const { data: history, error: historyError } = await supabase
		.from('riddle_of_the_day')
		.select(
			`
			*,
			riddle:riddles(*)
		`
		)
		.order('assignment_date', { ascending: false })
		.limit(30);

	if (historyError) {
		console.error('Error fetching history:', historyError);
	}

	// Get all published riddles for selection
	const { data: riddles, error: riddlesError } = await supabase
		.from('riddles')
		.select('id, riddle_number, title, genre, difficulty, status')
		.eq('status', 'published')
		.order('riddle_number', { ascending: false });

	if (riddlesError) {
		console.error('Error fetching riddles:', riddlesError);
	}

	return {
		currentRiddle: currentRiddle && currentRiddle.length > 0 ? currentRiddle[0] : null,
		history: (history || []).map((h: any) => ({
			...h,
			riddle: h.riddle
		})),
		availableRiddles: riddles || []
	};
};

/**
 * Set riddle of the day
 */
export const actions: Actions = {
	setRiddle: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();
		const riddleId = formData.get('riddle_id')?.toString();
		const assignmentDate = formData.get('assignment_date')?.toString();

		if (!riddleId || !assignmentDate) {
			return fail(400, { message: 'Énigme et date requises' });
		}

		// Verify riddle exists and is published
		const { data: riddle, error: riddleError } = await supabase
			.from('riddles')
			.select('id, status')
			.eq('id', riddleId)
			.eq('status', 'published')
			.single();

		if (riddleError || !riddle) {
			return fail(404, { message: 'Énigme non trouvée ou non publiée' });
		}

		// Set riddle of the day using RPC
		const { error: setError } = await supabase.rpc('set_riddle_of_the_day', {
			p_riddle_id: riddleId,
			p_assignment_date: assignmentDate
		});

		if (setError) {
			console.error('Error setting riddle of the day:', setError);
			return fail(500, { message: "Erreur lors de la définition de l'énigme du jour" });
		}

		return { success: true, message: 'Énigme du jour définie avec succès' };
	},

	removeRiddle: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();
		const assignmentDate = formData.get('assignment_date')?.toString();

		if (!assignmentDate) {
			return fail(400, { message: 'Date requise' });
		}

		// Delete riddle of the day for this date
		const { error: deleteError } = await supabase
			.from('riddle_of_the_day')
			.delete()
			.eq('assignment_date', assignmentDate);

		if (deleteError) {
			console.error('Error removing riddle of the day:', deleteError);
			return fail(500, { message: 'Erreur lors de la suppression' });
		}

		return { success: true, message: 'Énigme du jour supprimée' };
	}
};
