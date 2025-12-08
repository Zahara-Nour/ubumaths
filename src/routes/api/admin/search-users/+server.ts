import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchUsersSchema } from '$lib/server/validation/admin';
import { requireRole } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRole(locals, 'admin');

	// ✅ SECURITY: Validate query parameters with Zod
	const validation = searchUsersSchema.safeParse({
		query: url.searchParams.get('q') || '',
		role: url.searchParams.get('role') || undefined,
		limit: url.searchParams.get('limit') || undefined
	});

	if (!validation.success) {
		console.error('Search validation error:', validation.error.issues);
		throw error(400, validation.error.issues[0].message);
	}

	const { query: searchTerm, limit } = validation.data;

	// Return empty array for short queries (less than 3 chars)
	if (searchTerm.length < 3) {
		return json({ users: [] });
	}

	// Use RPC function for accent-insensitive search (e.g., "zoe" finds "Zoé")
	const { data: users, error: searchError } = await locals.supabase.rpc('search_users_unaccent', {
		search_term: searchTerm,
		result_limit: limit
	});

	if (searchError) {
		console.error('Search error:', searchError);
		return json({ error: searchError.message, users: [] });
	}

	// Transform the result to match expected format
	// RPC returns school_name directly, map it to schools object for consistency
	const usersWithSchools = users?.map(
		(user: {
			id: string;
			email: string;
			firstname: string;
			lastname: string;
			role: string;
			school_id: string;
			grade: string;
			is_test: boolean;
			created_at: string;
			updated_at: string;
			school_name: string | null;
			class_ids: string[];
		}) => ({
			...user,
			schools: user.school_name ? { name: user.school_name } : null
		})
	);

	return json({ users: usersWithSchools || [] });
};
