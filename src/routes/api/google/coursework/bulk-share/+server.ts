/**
 * Google Classroom Bulk Coursework Sharing Endpoint
 * ==================================================
 *
 * Endpoint: POST /api/google/coursework/bulk-share
 * Purpose: Share multiple coursework items with multiple classes in a single request
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate request body (courseworkIds, classIds, categoryId, topicId, etc.)
 * 3. Verify ALL coursework exist and belong to teacher (single query with IN clause)
 * 4. Verify teacher owns all selected classes (single query with IN clause)
 * 5. Create shared_coursework records for all coursework+class combinations (bulk upsert)
 *
 * Security:
 * - Teacher role required
 * - Verify ALL coursework belong to teacher (fail if any don't)
 * - Verify teacher owns ALL classes (fail if any don't)
 * - All input validated with Zod
 * - Array limits (max 50 each) to prevent DoS
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { bulkShareCourseworkSchema } from '$lib/server/validation';

/**
 * POST /api/google/coursework/bulk-share
 * Share multiple coursework items with multiple classes
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = bulkShareCourseworkSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkIds, classIds, categoryId, topicId, descriptionOverride, visible } =
		validation.data;

	// Verify ALL coursework exist and belong to teacher (single query)
	const { data: coursework, error: courseworkError } = await locals.supabase
		.from('google_classroom_coursework')
		.select(
			`
			id,
			google_classroom_courses!inner(id, teacher_id)
		`
		)
		.in('id', courseworkIds);

	if (courseworkError) {
		console.error('[Bulk Coursework Share] Error fetching coursework:', courseworkError);
		throw error(500, 'Failed to fetch coursework');
	}

	if (!coursework || coursework.length !== courseworkIds.length) {
		throw error(404, 'One or more coursework items not found');
	}

	// Verify ALL coursework belong to the teacher
	const invalidCoursework = coursework.filter((c) => {
		// Handle nested course data (Supabase JOIN types)
		const courseData = c.google_classroom_courses as unknown as
			| { teacher_id: string }
			| { teacher_id: string }[];
		const teacherId = Array.isArray(courseData)
			? courseData[0]?.teacher_id
			: courseData?.teacher_id;
		return teacherId !== user.id;
	});

	if (invalidCoursework.length > 0) {
		console.error(
			`[Bulk Coursework Share] Unauthorized coursework access attempt by teacher ${user.id}:`,
			invalidCoursework.map((c) => c.id)
		);
		throw error(403, 'You do not own all selected coursework items');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, teacher_id')
		.in('id', classIds)
		.eq('is_active', true);

	if (classesError) {
		console.error('[Bulk Coursework Share] Error fetching classes:', classesError);
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'One or more classes not found or inactive');
	}

	const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
	if (invalidClasses.length > 0) {
		console.error(
			`[Bulk Coursework Share] Unauthorized class access attempt by teacher ${user.id}:`,
			invalidClasses.map((c) => c.id)
		);
		throw error(403, 'You do not own all selected classes');
	}

	// Verify category ownership if provided (SECURITY: Prevent authorization bypass)
	if (categoryId) {
		const { data: category, error: categoryError } = await locals.supabase
			.from('coursework_categories')
			.select('id, class_id')
			.eq('id', categoryId)
			.single();

		if (categoryError || !category) {
			throw error(404, 'Category not found');
		}

		// Verify category belongs to one of the selected classes
		if (!classIds.includes(category.class_id)) {
			console.error(
				`[Bulk Coursework Share] Category ${categoryId} does not belong to any selected class`,
				{ classIds, categoryClassId: category.class_id, teacherId: user.id }
			);
			throw error(403, 'Category does not belong to selected classes');
		}
	}

	// Verify topic ownership if provided (SECURITY: Prevent authorization bypass)
	if (topicId) {
		const { data: topic, error: topicError } = await locals.supabase
			.from('google_classroom_topics')
			.select('id, google_course_id, google_classroom_courses!inner(teacher_id)')
			.eq('id', topicId)
			.single();

		if (topicError || !topic) {
			throw error(404, 'Topic not found');
		}

		// Extract teacher_id from nested course data and verify ownership
		const topicTeacherId = Array.isArray(topic.google_classroom_courses)
			? topic.google_classroom_courses[0]?.teacher_id
			: (topic.google_classroom_courses as unknown as { teacher_id: string })?.teacher_id;

		if (topicTeacherId !== user.id) {
			console.error(
				`[Bulk Coursework Share] Unauthorized topic access attempt by teacher ${user.id}:`,
				{ topicId, topicTeacherId }
			);
			throw error(403, 'You do not own this topic');
		}
	}

	// Create shared_coursework records for all combinations
	const sharesToInsert = [];
	for (const courseworkId of courseworkIds) {
		for (const classId of classIds) {
			sharesToInsert.push({
				coursework_id: courseworkId,
				class_id: classId,
				category_id: categoryId || null,
				topic_id: topicId || null,
				shared_by: user.id,
				description_override: descriptionOverride || null,
				visible: visible
			});
		}
	}

	const { error: insertError } = await locals.supabase
		.from('shared_coursework')
		.upsert(sharesToInsert, {
			onConflict: 'coursework_id,class_id'
		});

	if (insertError) {
		console.error('[Bulk Coursework Share] Error sharing coursework:', insertError);
		throw error(500, 'Failed to share coursework');
	}

	return json({
		success: true,
		courseworkShared: courseworkIds.length,
		sharesCreated: sharesToInsert.length
	});
};
