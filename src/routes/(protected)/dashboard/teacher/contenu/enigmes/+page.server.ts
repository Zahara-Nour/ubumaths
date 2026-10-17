import type { PageServerLoad, Actions } from './$types';
import { RIDDLE_COLUMNS, toDbRiddle } from '$lib/types/riddle';
import { fetchRiddleSolutions } from '$lib/server/riddle-solutions';
import { error, redirect, fail } from '@sveltejs/kit';
import { requireRoles } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/contenu/enigmes/+page.server');

/**
 * Load teacher's riddles
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Fetch teacher's riddles
	const { data: riddles, error: riddlesError } = await supabase
		.from('riddles')
		.select(RIDDLE_COLUMNS)
		.eq('created_by', user.id)
		.order('riddle_number', { ascending: false });

	if (riddlesError) {
		logger.error('Error fetching riddles:', riddlesError);
		throw error(500, 'Erreur lors du chargement des énigmes');
	}

	// La liste affiche si l'énigme se valide seule (réponse attendue présente) : la
	// réponse vit dans `riddle_solutions`, que la RLS ouvre à l'auteur.
	const { solutions, error: solutionsError } = await fetchRiddleSolutions(
		supabase,
		(riddles || []).map((r) => r.id)
	);

	if (solutionsError) {
		logger.error('Error fetching riddle solutions:', solutionsError);
		throw error(500, 'Erreur lors du chargement des énigmes');
	}

	// Fetch stats for these riddles
	const { data: stats, error: statsError } = await supabase
		.from('riddle_stats')
		.select('*')
		.eq('created_by', user.id);

	if (statsError) {
		logger.error('Error fetching riddle stats:', statsError);
	}

	// Merge riddles with their stats
	const riddlesWithStats = (riddles || []).map((riddle) => ({
		...toDbRiddle(riddle, solutions.get(riddle.id) ?? null),
		stats: stats?.find((s) => s.riddle_id === riddle.id)
	}));

	return {
		riddles: riddlesWithStats
	};
};

/**
 * Actions for riddle management
 */
export const actions: Actions = {
	/**
	 * Delete a riddle
	 */
	delete: async ({ request, locals }) => {
		const { supabase } = locals;
		await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const riddleId = formData.get('riddle_id')?.toString();

		if (!riddleId) {
			return fail(400, { message: "ID de l'énigme manquant" });
		}

		// Delete riddle (RLS ensures user can only delete their own)
		const { error: deleteError } = await supabase.from('riddles').delete().eq('id', riddleId);

		if (deleteError) {
			logger.error('Error deleting riddle:', deleteError);
			return fail(500, { message: "Erreur lors de la suppression de l'énigme" });
		}

		return { success: true, message: 'Énigme supprimée avec succès' };
	},

	/**
	 * Toggle riddle status (draft <-> published)
	 */
	toggleStatus: async ({ request, locals }) => {
		const { supabase } = locals;
		await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const riddleId = formData.get('riddle_id')?.toString();
		const currentStatus = formData.get('current_status')?.toString() as 'draft' | 'published';

		if (!riddleId || !currentStatus) {
			return fail(400, { message: 'Données manquantes' });
		}

		const newStatus = currentStatus === 'draft' ? 'published' : 'draft';

		const { error: updateError } = await supabase
			.from('riddles')
			.update({ status: newStatus })
			.eq('id', riddleId);

		if (updateError) {
			logger.error('Error updating riddle status:', updateError);
			return fail(500, { message: 'Erreur lors de la mise à jour du statut' });
		}

		return {
			success: true,
			message: `Énigme ${newStatus === 'published' ? 'publiée' : 'mise en brouillon'}`
		};
	}
};
