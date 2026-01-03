/**
 * Student Worksheets List Page Server
 *
 * Loads the list of worksheet assignments available to the logged-in student.
 * Supports filtering by class and pagination.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';

// Validation schema for query parameters
const querySchema = z.object({
	class_id: z.string().uuid().optional(),
	page: z.coerce.number().int().min(1).max(1000).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	// Only students can view their worksheets
	const { user } = await requireRole(locals, 'student');

	// Parse and validate filters from URL (graceful degradation for invalid params)
	const validation = querySchema.safeParse({
		class_id: url.searchParams.get('class_id') || undefined,
		page: url.searchParams.get('page') || undefined,
		limit: url.searchParams.get('limit') || undefined
	});

	const { class_id, page, limit } = validation.success
		? validation.data
		: { class_id: undefined, page: 1, limit: 50 };

	// Build API URL with filters
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString()
	});

	if (class_id) {
		params.set('class_id', class_id);
	}

	// Fetch worksheets via API
	const worksheetsResponse = await fetch(`/api/student/worksheets?${params}`);

	if (!worksheetsResponse.ok) {
		const errorText = await worksheetsResponse.text();
		console.error(
			'[Student Worksheets Page] API call failed:',
			worksheetsResponse.status,
			errorText
		);
	}

	const worksheetsData = worksheetsResponse.ok
		? await worksheetsResponse.json()
		: { worksheets: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };

	// Fetch student's classes for filter dropdown
	const { data: studentClasses, error: classesError } = await locals.supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(
				id,
				name
			)
		`
		)
		.eq('student_id', user.id)
		.eq('status', 'active')
		.order('classes(name)');

	if (classesError) {
		console.error('[Student Worksheets Page] Error fetching classes:', classesError);
	}

	// Transform classes data for the filter dropdown
	const classes = (studentClasses || []).map((item) => {
		// Handle Supabase JOIN types
		const classData = item.classes as unknown as
			| { id: string; name: string }
			| { id: string; name: string }[];
		const classInfo = Array.isArray(classData) ? classData[0] : classData;

		return {
			id: classInfo?.id || '',
			name: classInfo?.name || 'Classe inconnue'
		};
	});

	return {
		worksheets: worksheetsData.worksheets || [],
		pagination: worksheetsData.pagination,
		classes,
		filters: {
			classId: class_id || '',
			page
		}
	};
};
