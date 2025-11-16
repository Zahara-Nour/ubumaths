/**
 * Google Classroom Shared Materials Endpoint
 * ============================================
 *
 * Endpoint: GET/POST/DELETE/PATCH /api/google/shared-materials
 * Purpose: List and manage shared materials
 *
 * GET - List all shared materials
 * Flow:
 * 1. Verify user is a teacher
 * 2. Parse and validate query params (pagination, filters)
 * 3. Query shared_materials with JOINs
 * 4. Apply filters (classId, courseId, visible)
 * 5. Paginate results
 * 6. Return data with pagination metadata
 *
 * POST - Share a single material with multiple classes (bulk)
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (materialId, classIds, settings)
 * 3. Verify material exists and belongs to teacher
 * 4. Verify all classes exist and belong to teacher
 * 5. Verify categoryId/topicId if provided
 * 6. Bulk upsert shared_materials records
 * 7. Return success with count
 *
 * DELETE - Bulk unshare material from multiple classes
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (materialId, classIds)
 * 3. Verify material belongs to teacher
 * 4. Verify all classes belong to teacher
 * 5. Delete shared_materials records (bulk)
 * 6. Return success
 *
 * PATCH - Update shared material settings
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (sharedMaterialId, updates)
 * 3. Verify record exists and belongs to teacher
 * 4. Update fields (only provided fields)
 * 5. Return updated record
 *
 * Security:
 * - Teacher role required
 * - Verify material ownership via RLS + explicit checks
 * - Verify class ownership
 * - Verify category/topic belongs to teacher's classes
 * - All inputs validated with Zod
 * - Array size limits to prevent DoS
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	listSharedMaterialsSchema,
	updateSharedMaterialSchema,
	shareSingleMaterialSchema,
	bulkUnshareMaterialSchema,
	uuidSchema
} from '$lib/server/validation';

/**
 * List all shared materials for the teacher
 *
 * Security: Teacher role required
 *
 * Supports pagination and filtering by class, course, and visibility
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Only teachers can list shared materials
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate query params
	const queryParams = {
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit'),
		classId: url.searchParams.get('classId'),
		courseId: url.searchParams.get('courseId'),
		materialId: url.searchParams.get('materialId'),
		visible: url.searchParams.get('visible')
	};

	const validation = listSharedMaterialsSchema.safeParse(queryParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit, classId, courseId, materialId, visible } = validation.data;

	try {
		// Build base query with JOINs
		// Note: Schema uses 'description_override' not 'custom_description'
		// No need to filter by teacher - RLS policies handle this via class ownership
		let query = locals.supabase.from('shared_materials').select(
			`
				id,
				material_id,
				class_id,
				visible,
				category_id,
				description_override,
				created_at,
				updated_at,
				google_classroom_materials!inner(
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
			query = query.eq('google_classroom_materials.google_course_id', courseId);
		}

		if (materialId) {
			query = query.eq('material_id', materialId);
		}

		if (visible !== undefined) {
			query = query.eq('visible', visible);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

		const { data: sharedMaterialsList, error: fetchError, count } = await query;

		if (fetchError) {
			console.error('[Google Shared Materials] Database error:', fetchError);
			throw error(500, 'Failed to fetch shared materials');
		}

		// Optimize: Fetch all courses in bulk queries instead of N+1
		const googleCourseIds = [
			...new Set(
				(sharedMaterialsList || [])
					.map((item) => {
						const materialData = item.google_classroom_materials as unknown as
							| { title: string; description: string | null; google_course_id: string }
							| { title: string; description: string | null; google_course_id: string }[];
						const material = Array.isArray(materialData) ? materialData[0] : materialData;
						return material?.google_course_id;
					})
					.filter(Boolean) as string[]
			)
		];

		const materialIds = (sharedMaterialsList || []).map((item) => item.material_id);

		// Fetch ALL courses in one query
		const { data: courses, error: coursesError } = await locals.supabase
			.from('google_classroom_courses')
			.select('id, name, google_course_id')
			.in('google_course_id', googleCourseIds)
			.eq('teacher_id', user.id);

		if (coursesError) {
			console.error('[Google Shared Materials] Courses fetch error:', coursesError);
		}

		// Create course lookup map
		const courseMap: Record<string, { id: string; name: string }> = (courses || []).reduce(
			(acc, c) => {
				acc[c.google_course_id] = { id: c.id, name: c.name };
				return acc;
			},
			{} as Record<string, { id: string; name: string }>
		);

		// Fetch ALL attachments in one query
		const { data: attachmentsData, error: attachmentsError } = await locals.supabase
			.from('google_classroom_material_attachments')
			.select('google_material_id')
			.in('google_material_id', materialIds);

		if (attachmentsError) {
			console.error('[Google Shared Materials] Attachments fetch error:', attachmentsError);
		}

		// Group attachments by material_id
		const attachmentsCounts: Record<string, number> = (attachmentsData || []).reduce(
			(acc, attachment) => {
				acc[attachment.google_material_id] = (acc[attachment.google_material_id] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		// Map with pre-fetched data (no additional queries)
		const enrichedData = (sharedMaterialsList || []).map((item) => {
			// Handle nested material data from Supabase JOIN
			const materialData = item.google_classroom_materials as unknown as
				| { title: string; description: string | null; google_course_id: string }
				| { title: string; description: string | null; google_course_id: string }[];

			const material = Array.isArray(materialData) ? materialData[0] : materialData;
			const googleCourseId = material?.google_course_id;
			const course = courseMap[googleCourseId || ''];

			// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
			const classData = item.classes as unknown as { name: string } | { name: string }[];
			const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

			// Handle nested category data
			const categoryData = item.coursework_categories as unknown as { name: string } | null;

			return {
				id: item.id,
				materialId: item.material_id,
				materialTitle: material?.title || 'Untitled',
				materialDescription: material?.description || null,
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
				attachmentsCount: attachmentsCounts[item.material_id] || 0
			};
		});

		// Calculate pagination metadata
		const totalPages = Math.ceil((count || 0) / limit);

		return json({
			sharedMaterials: enrichedData,
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
		console.error('[Google Shared Materials] Error fetching data:', err);
		throw error(500, 'An error occurred while fetching shared materials');
	}
};

/**
 * Share a single material with multiple classes (bulk)
 *
 * Security: Teacher role required, ownership verified
 *
 * Creates shared_materials records for material+class combinations
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = shareSingleMaterialSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { materialId, classIds, categoryId, topicId, descriptionOverride, visible } =
		validation.data;

	// Verify material exists and belongs to teacher (RLS + explicit check)
	const { data: material, error: materialError } = await locals.supabase
		.from('google_classroom_materials')
		.select(
			`
			id,
			google_classroom_courses!inner(id, teacher_id)
		`
		)
		.eq('id', materialId)
		.single();

	if (materialError) {
		if (materialError.code === 'PGRST116') {
			throw error(404, 'Material not found or access denied');
		}
		console.error('[Share Material] Error fetching material:', materialError);
		throw error(500, 'Failed to fetch material');
	}

	if (!material) {
		throw error(404, 'Material not found');
	}

	// Verify material belongs to teacher
	const courseData = material.google_classroom_courses as unknown as
		| { teacher_id: string }
		| { teacher_id: string }[];
	const teacherId = Array.isArray(courseData) ? courseData[0]?.teacher_id : courseData?.teacher_id;

	if (teacherId !== user.id) {
		console.error(
			`[Share Material] Unauthorized material access attempt by teacher ${user.id}: material ${materialId}`
		);
		throw error(403, 'You do not own this material');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, teacher_id')
		.in('id', classIds)
		.eq('is_active', true);

	if (classesError) {
		console.error('[Share Material] Error fetching classes:', classesError);
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'One or more classes not found or inactive');
	}

	const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
	if (invalidClasses.length > 0) {
		console.error(
			`[Share Material] Unauthorized class access attempt by teacher ${user.id}:`,
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

	// If topicId is provided, verify it belongs to the material's course
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

	// Create shared_materials records for all material+class combinations
	const sharesToInsert = classIds.map((classId) => ({
		material_id: materialId,
		class_id: classId,
		category_id: categoryId || null,
		topic_id: topicId || null,
		shared_by: user.id,
		description_override: descriptionOverride || null,
		visible: visible
	}));

	const { error: insertError } = await locals.supabase
		.from('shared_materials')
		.upsert(sharesToInsert, {
			onConflict: 'material_id,class_id'
		});

	if (insertError) {
		console.error('[Share Material] Error sharing material:', insertError);
		throw error(500, 'Failed to share material');
	}

	return json({
		success: true,
		sharesCreated: sharesToInsert.length
	});
};

/**
 * Bulk unshare material from multiple classes
 *
 * Security: Teacher role required, ownership verified
 *
 * Deletes shared_materials records (idempotent)
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = bulkUnshareMaterialSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { materialId, classIds } = validation.data;

	// Verify material belongs to teacher (via RLS)
	const { data: material, error: materialError } = await locals.supabase
		.from('google_classroom_materials')
		.select('id')
		.eq('id', materialId)
		.single();

	if (materialError || !material) {
		if (materialError?.code === 'PGRST116') {
			throw error(404, 'Material not found or access denied');
		}
		console.error('[Unshare Material] Material verification error:', materialError);
		throw error(403, 'Material does not belong to you');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id')
		.in('id', classIds)
		.eq('teacher_id', user.id);

	if (classesError) {
		console.error('[Unshare Material] Error fetching classes:', classesError);
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'One or more classes not found or access denied');
	}

	// Delete from shared_materials (bulk, idempotent - no error if not found)
	const { error: deleteError } = await locals.supabase
		.from('shared_materials')
		.delete()
		.eq('material_id', materialId)
		.in('class_id', classIds)
		.eq('shared_by', user.id);

	if (deleteError) {
		console.error('[Unshare Material] Delete error:', deleteError);
		throw error(500, 'Failed to unshare material');
	}

	return json({
		success: true,
		message: 'Material unshared successfully'
	});
};

/**
 * Update shared material settings
 *
 * Security: Teacher role required, ownership verified
 *
 * Updates visibility, category, or custom description
 */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	// Only teachers can update shared materials
	const { user } = await requireRole(locals, 'teacher');

	// Parse request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Extract and validate sharedMaterialId
	if (!requestBody || typeof requestBody !== 'object' || !('sharedMaterialId' in requestBody)) {
		throw error(400, 'sharedMaterialId is required');
	}

	const idValidation = uuidSchema.safeParse(requestBody.sharedMaterialId);
	if (!idValidation.success) {
		throw error(400, 'Invalid sharedMaterialId: ' + idValidation.error.issues[0].message);
	}

	const sharedMaterialId = idValidation.data;

	// Validate update fields
	const { sharedMaterialId: _, ...updateFields } = requestBody as Record<string, unknown>;
	const validation = updateSharedMaterialSchema.safeParse(updateFields);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	try {
		// Verify record exists and belongs to teacher
		// Note: RLS policy handles ownership via class_id, so no need to filter by teacher
		const { data: existingRecord, error: fetchError } = await locals.supabase
			.from('shared_materials')
			.select('id')
			.eq('id', sharedMaterialId)
			.single();

		if (fetchError || !existingRecord) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Shared material not found or access denied');
			}
			console.error('[Google Shared Materials] Record verification error:', fetchError);
			throw error(403, 'You do not have permission to update this record');
		}

		// If categoryId is being updated and is not null, verify it belongs to teacher (via class)
		if (updates.categoryId !== undefined && updates.categoryId !== null) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id, class_id')
				.eq('id', updates.categoryId)
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
			.from('shared_materials')
			.update(updateObject)
			.eq('id', sharedMaterialId)
			.select(
				`
				id,
				material_id,
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
			console.error('[Google Shared Materials] Update error:', updateError);
			throw error(500, 'Failed to update shared material');
		}

		// Transform to camelCase
		return json({
			success: true,
			sharedMaterial: {
				id: updatedRecord.id,
				materialId: updatedRecord.material_id,
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
		console.error('[Google Shared Materials] Error updating record:', err);
		throw error(500, 'An error occurred while updating shared material');
	}
};
