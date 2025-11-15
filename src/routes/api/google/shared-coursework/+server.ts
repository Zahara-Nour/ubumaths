/**
 * Google Classroom Shared Coursework Endpoint
 * ============================================
 *
 * Endpoint: GET/PATCH /api/google/shared-coursework
 * Purpose: List and manage shared coursework
 *
 * GET - List all shared coursework
 * Flow:
 * 1. Verify user is a teacher
 * 2. Parse and validate query params (pagination, filters)
 * 3. Query shared_coursework with JOINs
 * 4. Apply filters (classId, courseId, visible)
 * 5. Paginate results
 * 6. Return data with pagination metadata
 *
 * PATCH - Update shared coursework settings
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (sharedCourseworkId, updates)
 * 3. Verify record exists and belongs to teacher
 * 4. Update fields (only provided fields)
 * 5. Return updated record
 *
 * Security:
 * - Teacher role required
 * - Only return/update teacher's data
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	listSharedCourseworkSchema,
	updateSharedCourseworkSchema,
	uuidSchema
} from '$lib/server/validation';

/**
 * List all shared coursework for the teacher
 *
 * Security: Teacher role required
 *
 * Supports pagination and filtering by class, course, and visibility
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
		visible: url.searchParams.get('visible')
	};

	const validation = listSharedCourseworkSchema.safeParse(queryParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit, classId, courseId, visible } = validation.data;

	try {
		// Build base query with JOINs
		// Note: Schema uses 'description_override' not 'custom_description', 'created_at' not 'shared_at'
		// No need to filter by teacher - RLS policies handle this via class ownership
		let query = locals.supabase.from('shared_coursework').select(
			`
				id,
				coursework_id,
				class_id,
				visible,
				category_id,
				description_override,
				created_at,
				updated_at,
				google_classroom_coursework!inner(
					title,
					description,
					google_course_id
				),
				classes!inner(
					name
				),
				coursework_categories(
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

		if (visible !== undefined) {
			query = query.eq('visible', visible);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.order('shared_at', { ascending: false }).range(offset, offset + limit - 1);

		const { data: sharedCourseworkList, error: fetchError, count } = await query;

		if (fetchError) {
			console.error('[Google Shared Coursework] Database error:', fetchError);
			throw error(500, 'Failed to fetch shared coursework');
		}

		// Optimize: Fetch all courses and materials in bulk queries instead of N+1
		const googleCourseIds = [
			...new Set(
				(sharedCourseworkList || [])
					.map((item) => {
						const courseworkData = item.google_classroom_coursework as unknown as
							| { title: string; description: string | null; google_course_id: string }
							| { title: string; description: string | null; google_course_id: string }[];
						const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
						return coursework?.google_course_id;
					})
					.filter(Boolean) as string[]
			)
		];

		const courseworkIds = (sharedCourseworkList || []).map((item) => item.coursework_id);

		// Fetch ALL courses in one query
		const { data: courses, error: coursesError } = await locals.supabase
			.from('google_classroom_courses')
			.select('id, name, google_course_id')
			.in('google_course_id', googleCourseIds)
			.eq('teacher_id', user.id);

		if (coursesError) {
			console.error('[Google Shared Coursework] Courses fetch error:', coursesError);
		}

		// Create course lookup map
		const courseMap: Record<string, { id: string; name: string }> = (courses || []).reduce(
			(acc, c) => {
				acc[c.google_course_id] = { id: c.id, name: c.name };
				return acc;
			},
			{} as Record<string, { id: string; name: string }>
		);

		// Fetch ALL materials in one query
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
		const enrichedData = (sharedCourseworkList || []).map((item) => {
			// Handle nested coursework data from Supabase JOIN
			const courseworkData = item.google_classroom_coursework as unknown as
				| { title: string; description: string | null; google_course_id: string }
				| { title: string; description: string | null; google_course_id: string }[];

			const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;
			const googleCourseId = coursework?.google_course_id;
			const course = courseMap[googleCourseId || ''];

			// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
			const classData = item.classes as unknown as { name: string } | { name: string }[];
			const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

			// Handle nested category data
			const categoryData = item.coursework_categories as unknown as { name: string } | null;

			return {
				id: item.id,
				courseworkId: item.coursework_id,
				courseworkTitle: coursework?.title || 'Untitled',
				courseworkDescription: coursework?.description || null,
				courseId: course?.id || null,
				courseName: course?.name || 'Unknown Course',
				classId: item.class_id,
				className: className || 'Unknown Class',
				visible: item.visible,
				categoryId: item.category_id,
				categoryName: categoryData?.name || null,
				customDescription: item.description_override,
				sharedAt: item.created_at,
				updatedAt: item.updated_at,
				materialsCount: materialsCounts[item.coursework_id] || 0
			};
		});

		// Calculate pagination metadata
		const totalPages = Math.ceil((count || 0) / limit);

		return json({
			sharedCoursework: enrichedData,
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
		console.error('[Google Shared Coursework] Error fetching data:', err);
		throw error(500, 'An error occurred while fetching shared coursework');
	}
};

/**
 * Update shared coursework settings
 *
 * Security: Teacher role required, ownership verified
 *
 * Updates visibility, category, or custom description
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	// Only teachers can update shared coursework
	const { user } = await requireRole(locals, 'teacher');

	// Parse request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Extract and validate sharedCourseworkId
	if (!requestBody || typeof requestBody !== 'object' || !('sharedCourseworkId' in requestBody)) {
		throw error(400, 'sharedCourseworkId is required');
	}

	const idValidation = uuidSchema.safeParse(requestBody.sharedCourseworkId);
	if (!idValidation.success) {
		throw error(400, 'Invalid sharedCourseworkId: ' + idValidation.error.issues[0].message);
	}

	const sharedCourseworkId = idValidation.data;

	// Validate update fields
	const { sharedCourseworkId: _, ...updateFields } = requestBody as Record<string, unknown>;
	const validation = updateSharedCourseworkSchema.safeParse(updateFields);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	try {
		// Verify record exists and belongs to teacher
		// Note: RLS policy handles ownership via class_id, so no need to filter by teacher
		const { data: existingRecord, error: fetchError } = await locals.supabase
			.from('shared_coursework')
			.select('id')
			.eq('id', sharedCourseworkId)
			.single();

		if (fetchError || !existingRecord) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Shared coursework not found or access denied');
			}
			console.error('[Google Shared Coursework] Record verification error:', fetchError);
			throw error(403, 'You do not have permission to update this record');
		}

		// If categoryId is being updated and is not null, verify it belongs to teacher
		if (updates.categoryId !== undefined && updates.categoryId !== null) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id')
				.eq('id', updates.categoryId)
				.eq('teacher_id', user.id)
				.single();

			if (categoryError || !category) {
				throw error(400, 'Invalid category or category does not belong to you');
			}
		}

		// Build update object (only include provided fields)
		// Note: Schema uses 'description_override' not 'custom_description'
		const updateObject: Record<string, unknown> = {
			updated_at: new Date().toISOString()
		};

		if (updates.visible !== undefined) {
			updateObject.visible = updates.visible;
		}

		if (updates.categoryId !== undefined) {
			updateObject.category_id = updates.categoryId;
		}

		if (updates.customDescription !== undefined) {
			updateObject.description_override = updates.customDescription;
		}

		// Update the record
		// Note: No need to filter by teacher_id - RLS policy handles ownership via class_id
		const { data: updatedRecord, error: updateError } = await locals.supabase
			.from('shared_coursework')
			.update(updateObject)
			.eq('id', sharedCourseworkId)
			.select(
				`
				id,
				coursework_id,
				class_id,
				visible,
				category_id,
				description_override,
				created_at,
				updated_at
			`
			)
			.single();

		if (updateError) {
			console.error('[Google Shared Coursework] Update error:', updateError);
			throw error(500, 'Failed to update shared coursework');
		}

		// Transform to camelCase
		return json({
			success: true,
			sharedCoursework: {
				id: updatedRecord.id,
				courseworkId: updatedRecord.coursework_id,
				classId: updatedRecord.class_id,
				visible: updatedRecord.visible,
				categoryId: updatedRecord.category_id,
				customDescription: updatedRecord.description_override,
				sharedAt: updatedRecord.created_at,
				updatedAt: updatedRecord.updated_at
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Shared Coursework] Error updating record:', err);
		throw error(500, 'An error occurred while updating shared coursework');
	}
};
