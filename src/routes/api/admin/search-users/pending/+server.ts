/**
 * Pending Users API Endpoint
 * ==========================
 *
 * GET /api/admin/search-users/pending
 *
 * Returns all users with status='pending' awaiting approval.
 * Security: Admin and Teacher roles only
 *
 * @module api/admin/search-users/pending
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	// Allow admin and teacher roles
	await requireRoles(locals, ['admin', 'teacher']);

	const { supabase } = locals;

	try {
		// Fetch all pending users with school relation
		const { data: users, error: fetchError } = await supabase
			.from('profiles')
			.select(
				`
				*,
				schools (name),
				class_members (class_id)
			`
			)
			.eq('status', 'pending')
			.order('created_at', { ascending: false });

		if (fetchError) {
			console.error('Error fetching pending users:', fetchError);
			throw error(500, 'Erreur lors de la récupération des utilisateurs en attente');
		}

		// Transform to include class_ids array
		const usersWithClasses = (users || []).map((user) => ({
			...user,
			class_ids: Array.isArray(user.class_members)
				? user.class_members.map((cm: { class_id: string }) => cm.class_id)
				: []
		}));

		return json({ users: usersWithClasses });
	} catch (err) {
		console.error('Error in GET /api/admin/search-users/pending:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur interne du serveur');
	}
};
