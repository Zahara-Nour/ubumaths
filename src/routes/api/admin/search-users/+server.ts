import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchUsersSchema } from '$lib/server/validation/admin';

export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// ✅ SECURITY: Verify admin role
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// ✅ SECURITY: Validate query parameters with Zod
	const validation = searchUsersSchema.safeParse({
		query: url.searchParams.get('q') || '',
		role: url.searchParams.get('role'),
		limit: url.searchParams.get('limit')
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { query: searchTerm, limit } = validation.data;

	// Return empty array for short queries (less than 3 chars)
	if (searchTerm.length < 3) {
		return json({ users: [] });
	}

	// Case-insensitive partial match across email, firstname, lastname (OR logic)
	const { data: users, error: searchError } = await supabase
		.from('profiles')
		.select('*, schools(name), class_members(class_id)')
		.or(
			`email.ilike.%${searchTerm}%,firstname.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%`
		)
		.order('lastname', { ascending: true })
		.order('firstname', { ascending: true })
		.limit(limit);

	if (searchError) {
		console.error('Search error:', searchError);
		return json({ error: searchError.message, users: [] });
	}

	// Transform class_members array to class_ids array for easier use
	const usersWithClasses = users?.map((user) => ({
		...user,
		class_ids: user.class_members?.map((cm: { class_id: string }) => cm.class_id) || []
	}));

	return json({ users: usersWithClasses || [] });
};
