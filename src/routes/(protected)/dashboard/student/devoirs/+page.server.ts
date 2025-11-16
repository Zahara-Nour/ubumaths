import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { listStudentSharedCourseworkSchema } from '$lib/server/validation/google';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	// Only students can view shared coursework
	const { user } = await requireRole(locals, 'student');

	// Parse and validate filters from URL
	const validation = listStudentSharedCourseworkSchema.safeParse({
		page: url.searchParams.get('page'),
		limit: '20',
		classId: url.searchParams.get('classId'),
		categoryId: url.searchParams.get('categoryId')
	});

	// Use defaults if validation fails (graceful degradation for load functions)
	const { classId, categoryId, page, limit } = validation.success
		? validation.data
		: { classId: null, categoryId: null, page: 1, limit: 20 };

	// Build API URL with filters
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString()
	});

	if (classId) params.set('classId', classId);
	if (categoryId) params.set('categoryId', categoryId);

	// Fetch shared coursework via API
	const courseworkResponse = await fetch(`/api/student/shared-coursework?${params}`);

	if (!courseworkResponse.ok) {
		const errorText = await courseworkResponse.text();
		console.error(
			'[Student Coursework Page] API call failed:',
			courseworkResponse.status,
			errorText
		);
	}

	const courseworkData = courseworkResponse.ok
		? await courseworkResponse.json()
		: { coursework: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

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
		.order('classes(name)');

	if (classesError) {
		console.error('[Student Coursework Page] Error fetching classes:', classesError);
	}

	// Transform classes data
	const classes = (studentClasses || []).map((item) => {
		// Handle Supabase JOIN types
		const classData = item.classes as unknown as
			| { id: string; name: string }
			| { id: string; name: string }[];
		const classInfo = Array.isArray(classData) ? classData[0] : classData;

		return {
			id: classInfo?.id || '',
			name: classInfo?.name || 'Unknown Class'
		};
	});

	// Fetch categories for selected class (if any)
	let categories: Array<{ id: string; name: string; icon: string | null }> = [];
	if (classId) {
		const { data: categoriesData, error: categoriesError } = await locals.supabase
			.from('coursework_categories')
			.select('id, name, icon')
			.eq('class_id', classId)
			.order('name');

		if (categoriesError) {
			console.error('[Student Coursework Page] Error fetching categories:', categoriesError);
		} else {
			categories = categoriesData || [];
		}
	}

	return {
		coursework: courseworkData.coursework || [],
		pagination: courseworkData.pagination,
		classes,
		categories,
		filters: {
			classId: classId || '',
			categoryId: categoryId || '',
			page
		}
	};
};
