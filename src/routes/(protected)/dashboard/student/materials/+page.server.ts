import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { listStudentSharedMaterialsSchema } from '$lib/server/validation';

const DEFAULT_PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	// Only students can view shared materials
	const { user } = await requireRole(locals, 'student');

	// Parse and validate filters from URL
	const validation = listStudentSharedMaterialsSchema.safeParse({
		page: url.searchParams.get('page'),
		limit: String(DEFAULT_PAGE_SIZE),
		classId: url.searchParams.get('classId'),
		categoryId: url.searchParams.get('categoryId'),
		topicId: url.searchParams.get('topicId')
	});

	// Use defaults if validation fails (graceful degradation for load functions)
	const { classId, categoryId, topicId, page, limit } = validation.success
		? validation.data
		: { classId: null, categoryId: null, topicId: null, page: 1, limit: DEFAULT_PAGE_SIZE };

	// Build API URL with filters
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString()
	});

	if (classId) params.set('classId', classId);
	if (categoryId) params.set('categoryId', categoryId);
	if (topicId) params.set('topicId', topicId);

	// Fetch shared materials via API
	const materialsResponse = await fetch(`/api/student/shared-materials?${params}`);

	if (!materialsResponse.ok) {
		const errorText = await materialsResponse.text();
		console.error('[Student Materials Page] API call failed:', materialsResponse.status, errorText);
		throw error(materialsResponse.status, `Failed to fetch shared materials: ${errorText}`);
	}

	const materialsData = await materialsResponse.json();

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
		.eq('is_test', false)
		.order('classes(name)');

	if (classesError) {
		console.error('[Student Materials Page] Error fetching classes:', classesError);
	}

	// Transform classes data
	const classes = (studentClasses || [])
		.map((item) => {
			// Handle Supabase JOIN types
			const classData = item.classes as unknown as
				| { id: string; name: string }
				| { id: string; name: string }[];
			const classInfo = Array.isArray(classData) ? classData[0] : classData;

			// Validate JOIN data exists
			if (!classInfo?.id || !classInfo?.name) {
				console.warn('[Student Materials Page] Invalid class data in JOIN:', item);
				return null;
			}

			return {
				id: classInfo.id,
				name: classInfo.name
			};
		})
		.filter((c): c is { id: string; name: string } => c !== null);

	// Fetch categories for selected class (if any)
	let categories: Array<{ id: string; name: string; icon: string | null }> = [];
	if (classId) {
		const { data: categoriesData, error: categoriesError } = await locals.supabase
			.from('coursework_categories')
			.select('id, name, icon')
			.eq('class_id', classId)
			.order('name');

		if (categoriesError) {
			console.error('[Student Materials Page] Error fetching categories:', categoriesError);
		} else {
			categories = categoriesData || [];
		}
	}

	// Fetch topics for selected class (if any)
	let topics: Array<{ id: string; name: string }> = [];
	if (classId) {
		// Get unique topics from shared materials for this class
		const { data: topicsData, error: topicsError } = await locals.supabase
			.from('shared_materials')
			.select(
				`
				google_classroom_topics!inner(
					id,
					name
				)
			`
			)
			.eq('class_id', classId)
			.eq('visible', true)
			.not('topic_id', 'is', null);

		if (topicsError) {
			console.error('[Student Materials Page] Error fetching topics:', topicsError);
		} else {
			// Extract unique topics
			const topicMap = new Map<string, { id: string; name: string }>();
			for (const item of topicsData || []) {
				const topicData = item.google_classroom_topics as unknown as
					| { id: string; name: string }
					| { id: string; name: string }[];
				const topic = Array.isArray(topicData) ? topicData[0] : topicData;

				// Validate JOIN data exists
				if (topic?.id && topic?.name && !topicMap.has(topic.id)) {
					topicMap.set(topic.id, { id: topic.id, name: topic.name });
				}
			}
			topics = Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name));
		}
	}

	return {
		materials: materialsData.materials || [],
		total: materialsData.total,
		page: materialsData.page,
		limit: materialsData.limit,
		totalPages: materialsData.totalPages,
		classes,
		categories,
		topics,
		filters: {
			classId: classId || '',
			categoryId: categoryId || '',
			topicId: topicId || '',
			page
		}
	};
};
