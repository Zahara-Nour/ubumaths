import type { PageServerLoad, Actions } from './$types';
import type { DbRiddle } from '$lib/types/riddle';
import { error, redirect, fail } from '@sveltejs/kit';

/**
 * Load teacher's riddles
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Fetch teacher's riddles
	const { data: riddles, error: riddlesError } = await supabase
		.from('riddles')
		.select('*')
		.eq('created_by', session.user.id)
		.order('riddle_number', { ascending: false });

	if (riddlesError) {
		console.error('Error fetching riddles:', riddlesError);
		throw error(500, 'Erreur lors du chargement des énigmes');
	}

	// Fetch stats for these riddles
	const { data: stats, error: statsError } = await supabase
		.from('riddle_stats')
		.select('*')
		.eq('created_by', session.user.id);

	if (statsError) {
		console.error('Error fetching riddle stats:', statsError);
	}

	// Merge riddles with their stats
	const riddlesWithStats = (riddles || []).map((riddle) => ({
		...riddle,
		stats: stats?.find((s) => s.riddle_id === riddle.id)
	}));

	return {
		riddles: riddlesWithStats as unknown as DbRiddle[]
	};
};

/**
 * Actions for riddle management
 */
export const actions: Actions = {
	/**
	 * Delete a riddle
	 */
	delete: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();
		const riddleId = formData.get('riddle_id')?.toString();

		if (!riddleId) {
			return fail(400, { message: "ID de l'énigme manquant" });
		}

		// Delete riddle (RLS ensures user can only delete their own)
		const { error: deleteError } = await supabase.from('riddles').delete().eq('id', riddleId);

		if (deleteError) {
			console.error('Error deleting riddle:', deleteError);
			return fail(500, { message: "Erreur lors de la suppression de l'énigme" });
		}

		return { success: true, message: 'Énigme supprimée avec succès' };
	},

	/**
	 * Toggle riddle status (draft <-> published)
	 */
	toggleStatus: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) {
			return fail(401, { message: 'Non authentifié' });
		}

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
			console.error('Error updating riddle status:', updateError);
			return fail(500, { message: 'Erreur lors de la mise à jour du statut' });
		}

		return {
			success: true,
			message: `Énigme ${newStatus === 'published' ? 'publiée' : 'mise en brouillon'}`
		};
	}
};
