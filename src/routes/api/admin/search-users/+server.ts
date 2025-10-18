import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const searchTerm = url.searchParams.get('q');

	if (!searchTerm || searchTerm.length < 3) {
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
		.limit(50);

	if (searchError) {
		console.error('Search error:', searchError);
		return json({ error: searchError.message, users: [] });
	}

	// Transform class_members array to class_ids array for easier use
	const usersWithClasses = users?.map((user) => ({
		...user,
		class_ids: user.class_members?.map((cm: any) => cm.class_id) || []
	}));

	return json({ users: usersWithClasses || [] });
};
