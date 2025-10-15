import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireRole } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// Get authenticated user and profile from parent layout
	const { profile } = await parent();

	// Require teacher or admin role
	requireRole(profile, ['teacher', 'admin']);

	const supabase = locals.supabase;

	// Fetch all friendships with profile data
	const { data: friendships, error: friendshipsError } = await supabase
		.from('friendships')
		.select(
			`
			id,
			requester_id,
			addressee_id,
			status,
			friendship_type,
			created_at,
			requester:profiles!friendships_requester_id_fkey(
				id,
				full_name,
				firstname,
				lastname,
				avatar_url,
				role,
				class_ids
			),
			addressee:profiles!friendships_addressee_id_fkey(
				id,
				full_name,
				firstname,
				lastname,
				avatar_url,
				role,
				class_ids
			)
		`
		)
		.order('created_at', { ascending: false });

	if (friendshipsError) {
		console.error('Error fetching friendships:', friendshipsError);
		return {
			friendships: [],
			classes: [],
			stats: { total: 0, accepted: 0, pending: 0, rejected: 0 }
		};
	}

	// Fetch classes for filtering
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('is_active', true)
		.order('name');

	if (classesError) {
		console.error('Error fetching classes:', classesError);
	}

	// Transform friendships data
	const transformedFriendships = friendships.map((f: any) => ({
		id: f.id,
		requester_id: f.requester_id,
		addressee_id: f.addressee_id,
		status: f.status,
		friendship_type: f.friendship_type,
		created_at: f.created_at,
		requester_name:
			f.requester?.full_name ||
			`${f.requester?.firstname || ''} ${f.requester?.lastname || ''}`.trim() ||
			'Utilisateur inconnu',
		requester_avatar: f.requester?.avatar_url || null,
		requester_role: f.requester?.role || 'student',
		requester_class_ids: f.requester?.class_ids || [],
		addressee_name:
			f.addressee?.full_name ||
			`${f.addressee?.firstname || ''} ${f.addressee?.lastname || ''}`.trim() ||
			'Utilisateur inconnu',
		addressee_avatar: f.addressee?.avatar_url || null,
		addressee_role: f.addressee?.role || 'student',
		addressee_class_ids: f.addressee?.class_ids || []
	}));

	// Calculate stats
	const stats = {
		total: transformedFriendships.length,
		accepted: transformedFriendships.filter((f: any) => f.status === 'accepted').length,
		pending: transformedFriendships.filter((f: any) => f.status === 'pending').length,
		rejected: transformedFriendships.filter((f: any) => f.status === 'rejected').length
	};

	return {
		friendships: transformedFriendships,
		classes: classes || [],
		stats
	};
};

export const actions: Actions = {
	deleteFriendship: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = locals.supabase;

		// Check if user is teacher or admin
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await request.formData();
		const friendshipId = formData.get('friendshipId') as string;

		if (!friendshipId) {
			return fail(400, { error: 'Missing friendshipId' });
		}

		// Delete the friendship
		const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

		if (error) {
			console.error('Error deleting friendship:', error);
			return fail(500, { error: 'Failed to delete friendship' });
		}

		return { success: true };
	}
};
