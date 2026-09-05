import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { requireRoles } from '$lib/server/middleware/auth';

/**
 * Load riddle of the day management data
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// `get_riddle_of_the_day` renvoie un UUID scalaire, pas une ligne. Le code le
	// traitait comme un tableau (`.length`, `[0]`), d'où une carte qui ne pouvait
	// afficher ni numéro, ni titre, ni date.
	const { data: currentRiddleId } = await supabase.rpc('get_riddle_of_the_day');

	const currentRiddle = currentRiddleId
		? ((await supabase.from('riddles').select('*').eq('id', currentRiddleId).maybeSingle()).data ??
			null)
		: null;

	// Get history of past riddles of the day
	const { data: history, error: historyError } = await supabase
		.from('riddle_of_the_day')
		.select(
			`
			*,
			riddle:riddles(*)
		`
		)
		// La table porte `date`, pas `assignment_date`.
		.order('date', { ascending: false })
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
		currentRiddle,
		// Le RPC interroge CURRENT_DATE : c'est la date du jour qui s'affiche.
		currentRiddleDate: currentRiddle ? new Date().toISOString().slice(0, 10) : null,
		history: (history || []).map((h) => ({
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
	setRiddle: async ({ request, locals }) => {
		const { supabase } = locals;
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

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
		// Signature réelle : (p_riddle_id uuid, p_date date, p_selected_by uuid).
		// Le code passait `p_assignment_date` et omettait `p_selected_by` : l'appel
		// échouait, et aucune énigme du jour n'a donc jamais pu être programmée.
		const { error: setError } = await supabase.rpc('set_riddle_of_the_day', {
			p_riddle_id: riddleId,
			p_date: assignmentDate,
			p_selected_by: user.id
		});

		if (setError) {
			console.error('Error setting riddle of the day:', setError);
			return fail(500, { message: "Erreur lors de la définition de l'énigme du jour" });
		}

		return { success: true, message: 'Énigme du jour définie avec succès' };
	},

	removeRiddle: async ({ request, locals }) => {
		const { supabase } = locals;
		await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const assignmentDate = formData.get('assignment_date')?.toString();

		if (!assignmentDate) {
			return fail(400, { message: 'Date requise' });
		}

		// Delete riddle of the day for this date
		const { error: deleteError } = await supabase
			.from('riddle_of_the_day')
			.delete()
			// La colonne est `date`.
			.eq('date', assignmentDate);

		if (deleteError) {
			console.error('Error removing riddle of the day:', deleteError);
			return fail(500, { message: 'Erreur lors de la suppression' });
		}

		return { success: true, message: 'Énigme du jour supprimée' };
	}
};
