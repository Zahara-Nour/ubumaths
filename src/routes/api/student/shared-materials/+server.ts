/**
 * Student Shared Materials Endpoint
 * ===================================
 *
 * Endpoint: GET /api/student/shared-materials
 * Purpose: Fetch course work materials shared with student's classes
 *
 * Flow:
 * 1. Verify user is a student
 * 2. Validate query parameters (filters, pagination)
 * 3. Get student's classes (excluding test accounts)
 * 4. Fetch shared materials with filters
 * 5. Return paginated results with enriched data
 *
 * Query Parameters:
 * - classId (optional): Filter by specific class
 * - categoryId (optional): Filter by category
 * - topicId (optional): Filter by topic
 * - page (default: 1): Page number (1-indexed)
 * - pageSize (default: 20, max: 100): Items per page
 *
 * Security:
 * - Student role required
 * - Only returns materials shared with student's classes
 * - Excludes test account materials
 * - Only visible materials returned
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { listStudentSharedMaterialsSchema } from '$lib/server/validation';

/**
 * GET /api/student/shared-materials
 * Fetch course work materials shared with student's classes
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Require student role
	const { user } = await requireRole(locals, 'student');

	// Parse and validate query parameters
	const queryParams = {
		classId: url.searchParams.get('classId') || undefined,
		categoryId: url.searchParams.get('categoryId') || undefined,
		topicId: url.searchParams.get('topicId') || undefined,
		page: url.searchParams.get('page') || '1',
		limit: url.searchParams.get('limit') || '20'
	};

	const validation = listStudentSharedMaterialsSchema.safeParse(queryParams);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId, categoryId, topicId, page, limit } = validation.data;

	// Get student's classes (excluding test accounts)
	const { data: studentClasses, error: classesError } = await locals.supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('is_test', false);

	if (classesError) {
		console.error('[Student Shared Materials] Error fetching student classes:', classesError);
		throw error(500, 'Failed to fetch student classes');
	}

	if (!studentClasses || studentClasses.length === 0) {
		// Student has no classes - return empty result
		return json({
			materials: [],
			total: 0,
			page,
			limit,
			totalPages: 0
		});
	}

	const studentClassIds = studentClasses.map((c) => c.class_id);

	// Build query for materials
	let query = locals.supabase
		.from('shared_materials')
		.select(
			`
			id,
			description_override,
			visible,
			course_name,
			teacher_name,
			created_at,
			google_classroom_materials!inner(
				id,
				google_material_id,
				title,
				description,
				state,
				created_time,
				alternate_link,
				topic_id,
				google_classroom_topics(id, name),
				google_classroom_material_attachments(
					id,
					drive_file_id,
					title,
					alternate_link,
					thumbnail_url,
					youtube_url,
					link_url,
					form_url
				)
			),
			classes!inner(id, name, is_archived),
			coursework_categories(id, name, icon),
			google_classroom_topics(id, name)
		`
		)
		.eq('visible', true)
		.eq('classes.is_archived', false)
		.eq('google_classroom_materials.state', 'PUBLISHED')
		.in('class_id', studentClassIds);

	// Apply filters
	if (classId) {
		query = query.eq('class_id', classId);
	}

	if (categoryId) {
		query = query.eq('category_id', categoryId);
	}

	if (topicId) {
		query = query.eq('topic_id', topicId);
	}

	// Pagination
	const offset = (page - 1) * limit;
	query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

	// Get count for pagination
	let countQuery = locals.supabase
		.from('shared_materials')
		.select('classes!inner(*), google_classroom_materials!inner(*)', { count: 'exact', head: true })
		.eq('visible', true)
		.eq('classes.is_archived', false)
		.eq('google_classroom_materials.state', 'PUBLISHED')
		.in('class_id', studentClassIds);

	// Apply same filters to count query
	if (classId) {
		countQuery = countQuery.eq('class_id', classId);
	}
	if (categoryId) {
		countQuery = countQuery.eq('category_id', categoryId);
	}
	if (topicId) {
		countQuery = countQuery.eq('topic_id', topicId);
	}

	// Execute both queries in parallel
	const [{ data: materialsData, error: materialsError }, { count, error: countError }] =
		await Promise.all([query, countQuery]);

	if (materialsError || countError) {
		console.error(
			'[Student Shared Materials] Error fetching materials:',
			materialsError || countError
		);
		throw error(500, 'Failed to fetch materials');
	}

	// Transform materials to camelCase
	const transformedMaterials = (materialsData || []).map((item) => {
		// Handle nested material data
		const materialData = item.google_classroom_materials as unknown as
			| {
					id: string;
					google_material_id: string;
					title: string;
					description: string | null;
					state: string;
					created_time: string;
					alternate_link: string;
					google_classroom_topics: { id: string; name: string } | null;
					google_classroom_material_attachments: Array<{
						id: string;
						drive_file_id: string | null;
						title: string;
						alternate_link: string;
						thumbnail_url: string | null;
						youtube_url: string | null;
						link_url: string | null;
						form_url: string | null;
					}>;
			  }
			| Array<{
					id: string;
					google_material_id: string;
					title: string;
					description: string | null;
					state: string;
					created_time: string;
					alternate_link: string;
					google_classroom_topics: { id: string; name: string } | null;
					google_classroom_material_attachments: Array<{
						id: string;
						drive_file_id: string | null;
						title: string;
						alternate_link: string;
						thumbnail_url: string | null;
						youtube_url: string | null;
						link_url: string | null;
						form_url: string | null;
					}>;
			  }>;

		const material = Array.isArray(materialData) ? materialData[0] : materialData;

		// Handle nested class data
		const classData = item.classes as unknown as
			| { id: string; name: string }
			| { id: string; name: string }[];
		const classInfo = Array.isArray(classData) ? classData[0] : classData;

		// Handle nested category data
		const categoryData = item.coursework_categories as unknown as {
			id: string;
			name: string;
			icon: string | null;
		} | null;

		// Handle topic from shared_materials (for filtering/organization)
		const sharedTopicData = item.google_classroom_topics as unknown as {
			id: string;
			name: string;
		} | null;

		return {
			id: item.id,
			descriptionOverride: item.description_override,
			visible: item.visible,
			courseName: item.course_name,
			teacherName: item.teacher_name,
			createdAt: item.created_at,
			material: {
				id: material.id,
				googleMaterialId: material.google_material_id,
				title: material.title,
				description: material.description,
				state: material.state,
				createdTime: material.created_time,
				alternateLink: material.alternate_link,
				topic: material.google_classroom_topics || null,
				attachments: material.google_classroom_material_attachments || []
			},
			class: {
				id: classInfo.id,
				name: classInfo.name
			},
			category: categoryData
				? {
						id: categoryData.id,
						name: categoryData.name,
						icon: categoryData.icon
					}
				: null,
			topic: sharedTopicData
		};
	});

	return json({
		materials: transformedMaterials,
		total: count || 0,
		page,
		limit,
		totalPages: Math.ceil((count || 0) / limit)
	});
};
