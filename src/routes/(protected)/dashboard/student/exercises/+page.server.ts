import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Parse filters from URL
	const filters = new URLSearchParams();

	const completed = url.searchParams.get('completed');
	if (completed) filters.set('completed', completed);

	const assignedOnly = url.searchParams.get('assigned_only');
	if (assignedOnly) filters.set('assigned_only', assignedOnly);

	const hasDeadline = url.searchParams.get('has_deadline');
	if (hasDeadline) filters.set('has_deadline', hasDeadline);

	const search = url.searchParams.get('search');
	if (search) filters.set('search', search);

	// Fetch assigned exercises
	const response = await fetch(`/api/exercises/assigned?${filters.toString()}`);

	const exercises = response.ok ? await response.json() : [];

	return {
		exercises,
		filters: {
			completed: completed === 'true',
			assigned_only: assignedOnly === 'true',
			has_deadline: hasDeadline === 'true',
			search: search || ''
		}
	};
};
