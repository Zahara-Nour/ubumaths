/**
 * Student Shared Coursework Endpoint
 * ===================================
 *
 * Endpoint: GET /api/student/shared-coursework
 * Purpose: List coursework shared with student's classes
 *
 * Flow:
 * 1. Verify user is a student
 * 2. Parse and validate query params (pagination, filters)
 * 3. Fetch student's classes from class_members
 * 4. Query shared_coursework with JOINs (only visible coursework)
 * 5. Apply filters (classId, categoryId)
 * 6. Paginate results
 * 7. Bulk fetch materials counts (N+1 optimization)
 * 8. Return enriched data with pagination metadata
 *
 * Security:
 * - Student role required
 * - Only returns visible coursework
 * - Only returns coursework for student's classes
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { listStudentSharedCourseworkSchema } from '$lib/server/validation';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * List all visible coursework shared with student's classes
 *
 * Security: Student role required
 *
 * Supports pagination and filtering by class and category
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Only students can list shared coursework
	const { user } = await requireRole(locals, 'student');

	// Parse and validate query params
	const queryParams = {
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit'),
		classId: url.searchParams.get('classId'),
		categoryId: url.searchParams.get('categoryId')
	};

	const validation = listStudentSharedCourseworkSchema.safeParse(queryParams);
	if (!validation.success) {
		console.error('[Student Shared Coursework] Validation error:', validation.error.issues);
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit, classId, categoryId } = validation.data;

	try {
		// First, fetch student's classes
		const { data: studentClasses, error: classesError } = await locals.supabase
			.from('class_members')
			.select('class_id')
			.eq('student_id', user.id);

		if (classesError) {
			console.error('[Student Shared Coursework] Classes fetch error:', classesError);
			throw error(500, 'Failed to fetch student classes');
		}

		// If student is not in any classes, return empty result
		if (!studentClasses || studentClasses.length === 0) {
			return json({
				coursework: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0
				}
			});
		}

		// Extract class IDs
		const classIds = studentClasses.map((c) => c.class_id);

		// Build base query with JOINs
		// Note: Only fetch visible coursework for student's classes
		let query = locals.supabase.from('shared_coursework').select(
			`
				id,
				coursework_id,
				class_id,
				category_id,
				description_override,
				created_at,
				updated_at,
				shared_by,
				google_classroom_coursework!inner(
					id,
					title,
					description,
					google_course_id,
					due_date,
					due_time,
					max_points,
					work_type,
					alternate_link
				),
				classes!inner(
					name
				),
				coursework_categories(
					name,
					icon
				)
			`,
			{ count: 'exact' }
		);

		// Filter: Only visible coursework for student's classes
		query = query.eq('visible', true).in('class_id', classIds);

		// Apply optional filters
		if (classId) {
			query = query.eq('class_id', classId);
		}

		if (categoryId) {
			query = query.eq('category_id', categoryId);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

		const { data: sharedCourseworkList, error: fetchError, count } = await query;

		if (fetchError) {
			console.error('[Student Shared Coursework] Database error:', fetchError);
			throw error(500, 'Failed to fetch shared coursework');
		}

		// If no coursework found, return empty result
		if (!sharedCourseworkList || sharedCourseworkList.length === 0) {
			return json({
				coursework: [],
				pagination: {
					page,
					limit,
					total: count || 0,
					totalPages: 0
				}
			});
		}

		// Optimize: Fetch all courses and materials in bulk queries instead of N+1
		const googleCourseIds = [
			...new Set(
				(sharedCourseworkList || [])
					.map((item) => {
						const courseworkData = item.google_classroom_coursework as unknown as
							| {
									id: string;
									title: string;
									description: string | null;
									google_course_id: string;
									due_date: string | null;
									due_time: string | null;
									max_points: number | null;
									work_type: string;
									alternate_link: string;
							  }
							| {
									id: string;
									title: string;
									description: string | null;
									google_course_id: string;
									due_date: string | null;
									due_time: string | null;
									max_points: number | null;
									work_type: string;
									alternate_link: string;
							  }[];
						const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
						return coursework?.google_course_id;
					})
					.filter(Boolean) as string[]
			)
		];

		const courseworkIds = (sharedCourseworkList || []).map((item) => item.coursework_id);
		const sharedByIds = [...new Set((sharedCourseworkList || []).map((item) => item.shared_by))];

		// Create service role client to bypass RLS
		// SAFE: We already verified user is a student and fetched shared_coursework with RLS
		// We only fetch courses for coursework IDs that passed RLS checks
		const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		// Fetch courses with service role (bypasses RLS to avoid circular dependency)
		const { data: courses, error: coursesError } = await supabaseAdmin
			.from('google_classroom_courses')
			.select('id, name, google_course_id')
			.in('id', googleCourseIds);

		if (coursesError) {
			console.error('[Student Shared Coursework] Courses fetch error:', coursesError);
		}

		// Create course lookup map (keyed by UUID id for matching with coursework.google_course_id)
		const courseMap: Record<string, { id: string; name: string }> = (courses || []).reduce(
			(acc, c) => {
				acc[c.id] = { id: c.id, name: c.name };
				return acc;
			},
			{} as Record<string, { id: string; name: string }>
		);

		// Fetch teacher names in one query
		const { data: teachers, error: teachersError } = await locals.supabase
			.from('profiles')
			.select('id, firstname, lastname')
			.in('id', sharedByIds);

		if (teachersError) {
			console.error('[Student Shared Coursework] Teachers fetch error:', teachersError);
		}

		// Create teacher lookup map
		const teacherMap: Record<string, string> = (teachers || []).reduce(
			(acc, t) => {
				acc[t.id] = `${t.firstname} ${t.lastname}`;
				return acc;
			},
			{} as Record<string, string>
		);

		// Fetch ALL materials in one query
		const { data: materialsData, error: materialsError } = await locals.supabase
			.from('coursework_materials')
			.select('coursework_id')
			.in('coursework_id', courseworkIds);

		if (materialsError) {
			console.error('[Student Shared Coursework] Materials fetch error:', materialsError);
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
		const enrichedData = (sharedCourseworkList || []).map((item) => {
			// Handle nested coursework data from Supabase JOIN
			const courseworkData = item.google_classroom_coursework as unknown as
				| {
						id: string;
						title: string;
						description: string | null;
						google_course_id: string;
						due_date: string | null;
						due_time: string | null;
						max_points: number | null;
						work_type: string;
						alternate_link: string;
				  }
				| {
						id: string;
						title: string;
						description: string | null;
						google_course_id: string;
						due_date: string | null;
						due_time: string | null;
						max_points: number | null;
						work_type: string;
						alternate_link: string;
				  }[];

			const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
			const googleCourseId = coursework?.google_course_id;
			const course = courseMap[googleCourseId || ''];

			// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
			const classData = item.classes as unknown as { name: string } | { name: string }[];
			const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

			// Handle nested category data
			const categoryData = item.coursework_categories as unknown as {
				name: string;
				icon: string | null;
			} | null;

			// Get teacher name
			const teacherName = teacherMap[item.shared_by] || 'Unknown Teacher';

			// Custom description overrides original description
			const description = item.description_override || coursework?.description || null;

			return {
				id: item.id,
				courseworkId: item.coursework_id,
				title: coursework?.title || 'Untitled',
				description,
				customDescription: item.description_override,
				originalDescription: coursework?.description || null,
				classId: item.class_id,
				className: className || 'Unknown Class',
				categoryId: item.category_id,
				categoryName: categoryData?.name || null,
				categoryIcon: categoryData?.icon || null,
				teacherName,
				courseName: course?.name || 'Unknown Course',
				materialsCount: materialsCounts[item.coursework_id] || 0,
				dueDate: coursework?.due_date || null,
				dueTime: coursework?.due_time || null,
				maxPoints: coursework?.max_points || null,
				workType: coursework?.work_type || 'ASSIGNMENT',
				alternateLink: coursework?.alternate_link || '',
				sharedAt: item.created_at,
				updatedAt: item.updated_at
			};
		});

		// Calculate pagination metadata
		const totalPages = Math.ceil((count || 0) / limit);

		return json({
			coursework: enrichedData,
			pagination: {
				page,
				limit,
				total: count || 0,
				totalPages
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Student Shared Coursework] Error fetching data:', err);
		throw error(500, 'An error occurred while fetching shared coursework');
	}
};
