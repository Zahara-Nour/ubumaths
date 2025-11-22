import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';

// Validation schema for query parameters
const querySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z.enum(['draft', 'published', 'archived']).optional(),
	type: z.enum(['worksheet', 'assessment', 'exam', 'quiz', 'homework']).optional(),
	search: z.string().max(200).optional()
});

/**
 * Load teacher's worksheets with filters and pagination
 */
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Parse and validate query parameters
	const rawParams = {
		page: url.searchParams.get('page') || '1',
		limit: url.searchParams.get('limit') || '20',
		status: url.searchParams.get('status') || undefined,
		type: url.searchParams.get('type') || undefined,
		search: url.searchParams.get('search') || undefined
	};

	const parseResult = querySchema.safeParse(rawParams);
	if (!parseResult.success) {
		// Return with default values on validation error
		return {
			worksheets: [],
			pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
			filters: { status: null, type: null, search: '' }
		};
	}

	const { page, limit, status, type, search } = parseResult.data;

	// Build API URL with filters
	const apiParams = new URLSearchParams();
	apiParams.set('page', String(page));
	apiParams.set('limit', String(limit));
	if (status) apiParams.set('status', status);
	if (type) apiParams.set('type', type);
	if (search) apiParams.set('search', search);

	// Fetch from API endpoint
	const response = await fetch(`/api/worksheets?${apiParams.toString()}`);

	if (!response.ok) {
		console.error('Failed to fetch worksheets:', await response.text());
		return {
			worksheets: [],
			pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
			filters: { status: status || null, type: type || null, search: search || '' }
		};
	}

	const data = await response.json();

	return {
		worksheets: data.worksheets || [],
		pagination: data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
		filters: {
			status: status || null,
			type: type || null,
			search: search || ''
		}
	};
};

/**
 * Actions for worksheet management
 */
export const actions: Actions = {
	/**
	 * Delete a worksheet (draft only)
	 */
	delete: async ({ request, locals, fetch }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifie' });
		}

		const formData = await request.formData();
		const worksheetId = formData.get('worksheet_id')?.toString();

		// Validate UUID
		const uuidSchema = z.string().uuid();
		const validation = uuidSchema.safeParse(worksheetId);
		if (!validation.success) {
			return fail(400, { message: 'ID de la feuille invalide' });
		}

		// Call API to delete
		const response = await fetch(`/api/worksheets/${worksheetId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
			return fail(response.status, { message: error.message || 'Erreur lors de la suppression' });
		}

		return { success: true, message: 'Feuille supprimee avec succes' };
	},

	/**
	 * Duplicate a worksheet
	 */
	duplicate: async ({ request, locals, fetch }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifie' });
		}

		const formData = await request.formData();
		const worksheetId = formData.get('worksheet_id')?.toString();

		// Validate UUID
		const uuidSchema = z.string().uuid();
		const validation = uuidSchema.safeParse(worksheetId);
		if (!validation.success) {
			return fail(400, { message: 'ID de la feuille invalide' });
		}

		// First, get the worksheet details
		const getResponse = await fetch(`/api/worksheets/${worksheetId}`);
		if (!getResponse.ok) {
			return fail(404, { message: 'Feuille non trouvee' });
		}

		const { worksheet: original } = await getResponse.json();

		// Create a copy with modified title
		const copyData = {
			title: `${original.title} (copie)`,
			description: original.description,
			type: original.type,
			config: original.config,
			estimated_duration_minutes: original.estimated_duration_minutes,
			grade_levels: original.grade_levels,
			tags: original.tags
		};

		const createResponse = await fetch('/api/worksheets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(copyData)
		});

		if (!createResponse.ok) {
			const error = await createResponse.json().catch(() => ({ message: 'Erreur inconnue' }));
			return fail(createResponse.status, {
				message: error.message || 'Erreur lors de la duplication'
			});
		}

		const { worksheet: newWorksheet } = await createResponse.json();

		return { success: true, message: 'Feuille dupliquee', worksheetId: newWorksheet.id };
	}
};
