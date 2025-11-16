/**
 * Google Classroom Shared Coursework Endpoint
 * ============================================
 *
 * Endpoint: GET/POST/DELETE /api/google/shared-coursework
 * Purpose: List and manage shared coursework
 *
 * GET - List all shared coursework
 * Flow:
 * 1. Verify user is a teacher
 * 2. Parse and validate query params (pagination, filters)
 * 3. Query shared_coursework with JOINs
 * 4. Apply filters (classId, courseId, courseworkId, visible)
 * 5. Paginate results
 * 6. Return data with pagination metadata
 *
 * POST - Share a single coursework with multiple classes (bulk)
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (courseworkId, classIds, settings)
 * 3. Verify coursework exists and belongs to teacher
 * 4. Verify all classes exist and belong to teacher
 * 5. Verify categoryId if provided
 * 6. Bulk upsert shared_coursework records
 * 7. Return success with count
 *
 * DELETE - Bulk unshare coursework from multiple classes
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (courseworkId, classIds)
 * 3. Verify coursework belongs to teacher
 * 4. Verify all classes belong to teacher
 * 5. Delete shared_coursework records (bulk)
 * 6. Return success
 *
 * Security:
 * - Teacher role required
 * - Verify coursework ownership via RLS + explicit checks
 * - Verify class ownership
 * - Verify category belongs to teacher's classes
 * - All inputs validated with Zod
 * - Array size limits to prevent DoS
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	listSharedCourseworkEnhancedSchema,
	shareSingleCourseworkSchema,
	bulkUnshareCourseworkSchema
} from '$lib/server/validation/google';

/**
 * List all shared coursework for the teacher
 *
 * Security: Teacher role required
 *
 * Supports pagination and filtering by class, course, coursework, and visibility
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Only teachers can list shared coursework
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate query params
	const queryParams = {
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit'),
		classId: url.searchParams.get('classId'),
		courseId: url.searchParams.get('courseId'),
		courseworkId: url.searchParams.get('courseworkId'),
		visible: url.searchParams.get('visible')
	};

	const validation = listSharedCourseworkEnhancedSchema.safeParse(queryParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit, classId, courseId, courseworkId, visible } = validation.data;

	try {
		// Build base query with JOINs
		// Note: Uses denormalized course_name and teacher_name fields to avoid RLS circular dependencies
		// Database uses 'description_override' but we map to 'descriptionOverride' in API
		let query = locals.supabase.from('shared_coursework').select(
			`
				id,
				coursework_id,
				class_id,
				visible,
				category_id,
				description_override,
				display_order,
				course_name,
				teacher_name,
				created_at,
				updated_at,
				google_classroom_coursework!inner(
					id,
					title,
					description,
					google_course_id,
					max_points,
					work_type,
					due_date,
					due_time
				),
				classes!inner(
					id,
					name
				),
				coursework_categories(
					id,
					name
				)
			`,
			{ count: 'exact' }
		);

		// Apply filters
		if (classId) {
			query = query.eq('class_id', classId);
		}

		if (courseId) {
			query = query.eq('google_classroom_coursework.google_course_id', courseId);
		}

		if (courseworkId) {
			query = query.eq('coursework_id', courseworkId);
		}

		if (visible !== undefined) {
			query = query.eq('visible', visible);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		const { data: sharedCourseworkList, error: fetchError, count } = await query;

		if (fetchError) {
			console.error('[Google Shared Coursework] Database error:', fetchError);
			throw error(500, 'Failed to fetch shared coursework');
		}

		// Get unique Google Course IDs for fetching course IDs (needed for courseId in response)
		// Note: We use denormalized course_name, but still need course.id for the API response
		const googleCourseIds = [
			...new Set(
				(sharedCourseworkList || [])
					.map((item) => {
						const courseworkData = item.google_classroom_coursework as unknown as
							| { google_course_id: string }
							| { google_course_id: string }[];
						const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
						return coursework?.google_course_id;
					})
					.filter(Boolean) as string[]
			)
		];

		const courseworkIds = (sharedCourseworkList || []).map((item) => item.coursework_id);

		// Fetch course IDs only (names come from denormalized field)
		const { data: courses, error: coursesError } = await locals.supabase
			.from('google_classroom_courses')
			.select('id, google_course_id')
			.in('google_course_id', googleCourseIds)
			.eq('teacher_id', user.id);

		if (coursesError) {
			console.error('[Google Shared Coursework] Courses fetch error:', coursesError);
		}

		// Create course ID lookup map (only IDs, not names)
		const courseIdMap: Record<string, string> = (courses || []).reduce(
			(acc, c) => {
				acc[c.google_course_id] = c.id;
				return acc;
			},
			{} as Record<string, string>
		);

		// Fetch ALL materials/attachments in one query
		const { data: materialsData, error: materialsError } = await locals.supabase
			.from('coursework_materials')
			.select('coursework_id')
			.in('coursework_id', courseworkIds);

		if (materialsError) {
			console.error('[Google Shared Coursework] Materials fetch error:', materialsError);
		}

		// Group materials by coursework_id
		const materialsCounts: Record<string, number> = (materialsData || []).reduce(
			(acc, material) => {
				acc[material.coursework_id] = (acc[material.coursework_id] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		// Map with pre-fetched data (no additional queries)
		// Uses denormalized course_name and teacher_name from database
		const enrichedData = (sharedCourseworkList || []).map((item) => {
			// Handle nested coursework data from Supabase JOIN
			const courseworkData = item.google_classroom_coursework as unknown as
				| {
						id: string;
						title: string;
						description: string | null;
						google_course_id: string;
						max_points: number | null;
						work_type: string;
						due_date: string | null;
						due_time: string | null;
				  }
				| {
						id: string;
						title: string;
						description: string | null;
						google_course_id: string;
						max_points: number | null;
						work_type: string;
						due_date: string | null;
						due_time: string | null;
				  }[];

			const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
			const googleCourseId = coursework?.google_course_id;

			// Get course ID from map (name comes from denormalized field)
			const courseId = courseIdMap[googleCourseId || ''] || null;

			// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
			const classData = item.classes as unknown as
				| { id: string; name: string }
				| { id: string; name: string }[];
			const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;
			const classId = Array.isArray(classData) ? classData[0]?.id : classData?.id;

			// Handle nested category data
			const categoryData = item.coursework_categories as unknown as {
				id: string;
				name: string;
			} | null;

			return {
				id: item.id,
				courseworkId: item.coursework_id,
				courseworkTitle: coursework?.title || 'Untitled',
				courseworkDescription: coursework?.description || null,
				workType: coursework?.work_type || 'ASSIGNMENT',
				maxPoints: coursework?.max_points || null,
				dueDate: coursework?.due_date || null,
				dueTime: coursework?.due_time || null,
				courseId: courseId,
				courseName: item.course_name || 'Unknown Course', // ✅ DENORMALIZED FIELD
				teacherName: item.teacher_name || 'Unknown Teacher', // ✅ DENORMALIZED FIELD
				classId: classId || item.class_id,
				className: className || 'Unknown Class',
				visible: item.visible,
				categoryId: item.category_id,
				categoryName: categoryData?.name || null,
				descriptionOverride: item.description_override, // Map to camelCase in response
				displayOrder: item.display_order,
				sharedAt: item.created_at,
				updatedAt: item.updated_at,
				attachmentsCount: materialsCounts[item.coursework_id] || 0
			};
		});

		// Calculate pagination metadata
		const totalPages = Math.ceil((count || 0) / limit);

		return json({
			sharedCoursework: enrichedData,
			total: count || 0,
			page,
			limit,
			totalPages
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Shared Coursework] Error fetching data:', err);
		throw error(500, 'An error occurred while fetching shared coursework');
	}
};

/**
 * Share a single coursework with multiple classes (bulk)
 *
 * Security: Teacher role required, ownership verified
 *
 * Creates shared_coursework records for coursework+class combinations
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = shareSingleCourseworkSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkId, classIds, categoryId, topicId, descriptionOverride, visible } =
		validation.data;

	try {
		// Verify coursework exists and belongs to teacher (RLS + explicit check)
		const { data: coursework, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select(
				`
				id,
				google_classroom_courses!inner(id, teacher_id)
			`
			)
			.eq('id', courseworkId)
			.single();

		if (courseworkError) {
			if (courseworkError.code === 'PGRST116') {
				throw error(404, 'Coursework not found or access denied');
			}
			console.error('[Share Coursework] Error fetching coursework:', courseworkError);
			throw error(500, 'Failed to fetch coursework');
		}

		if (!coursework) {
			throw error(404, 'Coursework not found');
		}

		// Verify coursework belongs to teacher
		const courseData = coursework.google_classroom_courses as unknown as
			| { teacher_id: string }
			| { teacher_id: string }[];
		const teacherId = Array.isArray(courseData)
			? courseData[0]?.teacher_id
			: courseData?.teacher_id;

		if (teacherId !== user.id) {
			console.error(
				`[Share Coursework] Unauthorized coursework access attempt by teacher ${user.id}: coursework ${courseworkId}`
			);
			throw error(403, 'You do not own this coursework');
		}

		// Verify teacher owns all classes
		const { data: classes, error: classesError } = await locals.supabase
			.from('classes')
			.select('id, teacher_id')
			.in('id', classIds)
			.eq('is_active', true);

		if (classesError) {
			console.error('[Share Coursework] Error fetching classes:', classesError);
			throw error(500, 'Failed to verify class ownership');
		}

		if (!classes || classes.length !== classIds.length) {
			throw error(400, 'One or more classes not found or inactive');
		}

		const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
		if (invalidClasses.length > 0) {
			console.error(
				`[Share Coursework] Unauthorized class access attempt by teacher ${user.id}:`,
				invalidClasses.map((c) => c.id)
			);
			throw error(403, 'You do not own all selected classes');
		}

		// If categoryId is provided, verify it belongs to one of the teacher's classes
		if (categoryId) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id, class_id')
				.eq('id', categoryId)
				.single();

			if (categoryError || !category) {
				throw error(400, 'Category not found');
			}

			// Verify the category's class belongs to the teacher
			const { data: categoryClass, error: categoryClassError } = await locals.supabase
				.from('classes')
				.select('id')
				.eq('id', category.class_id)
				.eq('teacher_id', user.id)
				.single();

			if (categoryClassError || !categoryClass) {
				throw error(400, 'Category does not belong to one of your classes');
			}
		}

		// If topicId is provided, verify it belongs to one of the teacher's courses
		if (topicId) {
			const { data: topic, error: topicError } = await locals.supabase
				.from('google_classroom_topics')
				.select('id, google_course_id')
				.eq('id', topicId)
				.single();

			if (topicError || !topic) {
				throw error(400, 'Topic not found');
			}

			// Verify topic belongs to a course owned by teacher
			const { data: topicCourse, error: topicCourseError } = await locals.supabase
				.from('google_classroom_courses')
				.select('id')
				.eq('google_course_id', topic.google_course_id)
				.eq('teacher_id', user.id)
				.single();

			if (topicCourseError || !topicCourse) {
				throw error(400, 'Topic does not belong to one of your courses');
			}
		}

		// Create shared_coursework records for all coursework+class combinations
		const sharesToInsert = classIds.map((classId) => ({
			coursework_id: courseworkId,
			class_id: classId,
			category_id: categoryId || null,
			topic_id: topicId || null,
			shared_by: user.id,
			description_override: descriptionOverride || null,
			visible: visible
		}));

		// Use transaction for bulk insert with proper error handling
		const { data: insertedRecords, error: insertError } = await locals.supabase
			.from('shared_coursework')
			.upsert(sharesToInsert, {
				onConflict: 'coursework_id,class_id',
				ignoreDuplicates: false // Update if exists
			})
			.select();

		if (insertError) {
			console.error('[Share Coursework] Error sharing coursework:', insertError);
			throw error(500, 'Failed to share coursework');
		}

		return json({
			success: true,
			shared: insertedRecords?.length || sharesToInsert.length
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Share Coursework] Unexpected error:', err);
		throw error(500, 'An error occurred while sharing coursework');
	}
};

/**
 * Bulk unshare coursework from multiple classes
 *
 * Security: Teacher role required, ownership verified
 *
 * Deletes shared_coursework records (idempotent)
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = bulkUnshareCourseworkSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkId, classIds } = validation.data;

	try {
		// Verify coursework belongs to teacher (via RLS)
		const { data: coursework, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select('id')
			.eq('id', courseworkId)
			.single();

		if (courseworkError || !coursework) {
			if (courseworkError?.code === 'PGRST116') {
				throw error(404, 'Coursework not found or access denied');
			}
			console.error('[Unshare Coursework] Coursework verification error:', courseworkError);
			throw error(403, 'Coursework does not belong to you');
		}

		// Verify teacher owns all classes
		const { data: classes, error: classesError } = await locals.supabase
			.from('classes')
			.select('id')
			.in('id', classIds)
			.eq('teacher_id', user.id);

		if (classesError) {
			console.error('[Unshare Coursework] Error fetching classes:', classesError);
			throw error(500, 'Failed to verify class ownership');
		}

		if (!classes || classes.length !== classIds.length) {
			throw error(400, 'One or more classes not found or access denied');
		}

		// Delete from shared_coursework (bulk, idempotent - no error if not found)
		const { data: deletedRecords, error: deleteError } = await locals.supabase
			.from('shared_coursework')
			.delete()
			.eq('coursework_id', courseworkId)
			.in('class_id', classIds)
			.eq('shared_by', user.id)
			.select();

		if (deleteError) {
			console.error('[Unshare Coursework] Delete error:', deleteError);
			throw error(500, 'Failed to unshare coursework');
		}

		return json({
			success: true,
			deleted: deletedRecords?.length || 0
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Unshare Coursework] Unexpected error:', err);
		throw error(500, 'An error occurred while unsharing coursework');
	}
};
