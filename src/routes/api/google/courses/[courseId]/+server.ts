/**
 * Google Classroom Course Details Endpoint
 * ==========================================
 *
 * Endpoint: GET /api/google/courses/[courseId]
 * Purpose: Get course details with all coursework and sharing status
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate courseId parameter
 * 3. Fetch course and verify ownership
 * 4. Fetch all coursework for this course with materials and sharing info
 * 5. Return course with enriched coursework data
 *
 * Security:
 * - Teacher role required
 * - Verify course belongs to teacher
 * - Only return teacher's data
 *
 * Response:
 * {
 *   course: {
 *     id: string,
 *     googleCourseId: string,
 *     name: string,
 *     section: string | null,
 *     description: string | null,
 *     room: string | null,
 *     courseState: string,
 *     alternateLink: string,
 *     creationTime: string,
 *     updateTime: string
 *   },
 *   coursework: Array<{
 *     id: string,
 *     googleCourseworkId: string,
 *     title: string,
 *     description: string | null,
 *     state: string,
 *     workType: string,
 *     dueDate: string | null,
 *     dueTime: string | null,
 *     maxPoints: number | null,
 *     alternateLink: string,
 *     materialsCount: number,
 *     sharedWithClasses: Array<{
 *       classId: string,
 *       className: string,
 *       visible: boolean,
 *       categoryName: string | null
 *     }>
 *   }>,
 *   topics: Array<{
 *     id: string,
 *     googleTopicId: string,
 *     name: string,
 *     updateTime: string
 *   }>,
 *   materials: Array<{
 *     id: string,
 *     googleMaterialId: string,
 *     title: string,
 *     description: string | null,
 *     state: string,
 *     createdTime: string,
 *     alternateLink: string,
 *     topic: { id: string, name: string } | null,
 *     attachments: Array<{...}>,
 *     sharedWithClasses: Array<{
 *       classId: string,
 *       className: string,
 *       visible: boolean,
 *       categoryName: string | null
 *     }>
 *   }>
 * }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { courseIdParamSchema } from '$lib/server/validation';

/**
 * Get course details with coursework
 *
 * Security: Teacher role required, course ownership verified
 *
 * Returns course with all coursework items and their sharing status
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	// Only teachers can access course details
	const { user } = await requireRole(locals, 'teacher');

	// Validate courseId parameter
	const paramValidation = courseIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const { courseId } = paramValidation.data;

	try {
		// Fetch course and verify ownership
		const { data: course, error: courseError } = await locals.supabase
			.from('google_classroom_courses')
			.select(
				'id, google_course_id, name, section, description_heading, room, course_state, alternate_link, enrollment_code, last_synced_at, updated_at'
			)
			.eq('id', courseId)
			.eq('teacher_id', user.id)
			.single();

		if (courseError) {
			if (courseError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Course not found or access denied');
			}
			console.error('[Google Course Details] Database error:', courseError);
			throw error(500, 'Failed to fetch course details');
		}

		// Fetch all coursework for this course
		// Note: google_classroom_coursework doesn't have teacher_id column
		// Ownership is already verified via course ownership (line 88)
		const { data: courseworkList, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select(
				`
				id,
				google_coursework_id,
				title,
				description,
				state,
				work_type,
				due_date,
				due_time,
				max_points,
				alternate_link
			`
			)
			.eq('google_course_id', course.id)
			.order('created_time', { ascending: false });

		if (courseworkError) {
			console.error('[Google Course Details] Coursework fetch error:', courseworkError);
			throw error(500, 'Failed to fetch coursework');
		}

		// Fetch topics for this course
		const { data: topics, error: topicsError } = await locals.supabase
			.from('google_classroom_topics')
			.select('id, google_topic_id, name, updated_time')
			.eq('google_course_id', course.id)
			.order('name', { ascending: true });

		if (topicsError) {
			console.error('[Google Course Details] Topics fetch error:', topicsError);
		}

		// Fetch course work materials
		const { data: courseWorkMaterials, error: courseWorkMaterialsError } = await locals.supabase
			.from('google_classroom_materials')
			.select(
				`
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
					material_type,
					google_file_id,
					file_name,
					mime_type,
					file_url,
					thumbnail_url,
					title
				)
			`
			)
			.eq('google_course_id', course.id)
			.eq('state', 'PUBLISHED')
			.order('created_time', { ascending: false });

		if (courseWorkMaterialsError) {
			console.error(
				'[Google Course Details] Course work materials fetch error:',
				courseWorkMaterialsError
			);
		}

		// Optimize: Fetch all materials and sharing data in bulk queries instead of N+1
		const courseworkIds = (courseworkList || []).map((cw) => cw.id);
		const materialIds = (courseWorkMaterials || []).map((m) => m.id);

		// Fetch ALL coursework materials in one query
		const { data: materialsData, error: materialsError } = await locals.supabase
			.from('coursework_materials')
			.select('coursework_id')
			.in('coursework_id', courseworkIds);

		if (materialsError) {
			console.error('[Google Course Details] Materials fetch error:', materialsError);
		}

		// Group materials by coursework_id
		const materialsCounts: Record<string, number> = (materialsData || []).reduce(
			(acc, material) => {
				acc[material.coursework_id] = (acc[material.coursework_id] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		// Fetch ALL sharing data in one query
		// Note: shared_coursework uses 'shared_by' column, not 'teacher_id'
		// But we filter by class ownership via RLS, so we don't need explicit filter here
		const { data: allSharedData, error: sharedError } = await locals.supabase
			.from('shared_coursework')
			.select(
				`
				coursework_id,
				class_id,
				visible,
				classes!inner(name),
				coursework_categories(name)
			`
			)
			.in('coursework_id', courseworkIds);

		if (sharedError) {
			console.error('[Google Course Details] Shared data fetch error:', sharedError);
		}

		// Fetch ALL material sharing data in one query
		const { data: allSharedMaterialsData, error: sharedMaterialsError } = await locals.supabase
			.from('shared_materials')
			.select(
				`
				material_id,
				class_id,
				visible,
				classes!inner(name),
				coursework_categories(name)
			`
			)
			.in('material_id', materialIds);

		if (sharedMaterialsError) {
			console.error('[Google Course Details] Shared materials fetch error:', sharedMaterialsError);
		}

		// Group sharing data by coursework_id
		type SharedDataArray = NonNullable<typeof allSharedData>;
		const sharedDataMap: Record<string, SharedDataArray> = (allSharedData || []).reduce(
			(acc, shared) => {
				if (!acc[shared.coursework_id]) {
					acc[shared.coursework_id] = [];
				}
				acc[shared.coursework_id].push(shared);
				return acc;
			},
			{} as Record<string, SharedDataArray>
		);

		// Group sharing data by material_id
		type SharedMaterialsDataArray = NonNullable<typeof allSharedMaterialsData>;
		const sharedMaterialsDataMap: Record<string, SharedMaterialsDataArray> = (
			allSharedMaterialsData || []
		).reduce(
			(acc, shared) => {
				if (!acc[shared.material_id]) {
					acc[shared.material_id] = [];
				}
				acc[shared.material_id].push(shared);
				return acc;
			},
			{} as Record<string, SharedMaterialsDataArray>
		);

		// Map coursework with pre-fetched data (no additional queries)
		const enrichedCoursework = (courseworkList || []).map((cw) => {
			const sharedData = sharedDataMap[cw.id] || [];

			// Transform shared data
			const sharedWithClasses = sharedData.map((shared) => {
				// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
				const classData = shared.classes as unknown as { name: string } | { name: string }[];
				const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

				// Handle nested category data
				const categoryData = shared.coursework_categories as unknown as { name: string } | null;

				return {
					classId: shared.class_id,
					className: className || 'Unknown Class',
					visible: shared.visible,
					categoryName: categoryData?.name || null
				};
			});

			return {
				id: cw.id,
				googleCourseworkId: cw.google_coursework_id,
				title: cw.title,
				description: cw.description,
				state: cw.state,
				workType: cw.work_type,
				dueDate: cw.due_date,
				dueTime: cw.due_time,
				maxPoints: cw.max_points,
				alternateLink: cw.alternate_link,
				materialsCount: materialsCounts[cw.id] || 0,
				sharedWithClasses
			};
		});

		// Transform course to camelCase
		const transformedCourse = {
			id: course.id,
			googleCourseId: course.google_course_id,
			name: course.name,
			section: course.section,
			description: course.description_heading,
			room: course.room,
			courseState: course.course_state,
			alternateLink: course.alternate_link,
			enrollmentCode: course.enrollment_code,
			lastSyncedAt: course.last_synced_at,
			updatedAt: course.updated_at
		};

		// Transform topics to camelCase
		const transformedTopics = (topics || []).map((topic) => ({
			id: topic.id,
			googleTopicId: topic.google_topic_id,
			name: topic.name,
			updateTime: topic.updated_time
		}));

		// Transform course work materials to camelCase with sharing data
		const transformedMaterials = (courseWorkMaterials || []).map((material) => {
			// Get sharing data for this material
			const sharedMaterialData = sharedMaterialsDataMap[material.id] || [];

			// Transform shared data
			const sharedWithClasses = sharedMaterialData.map((shared) => {
				// Supabase JOIN types don't reflect !inner modifier, handle both cases defensively
				const classData = shared.classes as unknown as { name: string } | { name: string }[];
				const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

				// Handle nested category data
				const categoryData = shared.coursework_categories as unknown as { name: string } | null;

				return {
					classId: shared.class_id,
					className: className || 'Unknown Class',
					visible: shared.visible,
					categoryName: categoryData?.name || null
				};
			});

			// Handle nested topic data
			const topicData = material.google_classroom_topics as unknown as
				| { id: string; name: string }
				| { id: string; name: string }[]
				| null;

			const topic =
				topicData && !Array.isArray(topicData)
					? { id: topicData.id, name: topicData.name }
					: Array.isArray(topicData) && topicData.length > 0
						? { id: topicData[0].id, name: topicData[0].name }
						: null;

			return {
				id: material.id,
				googleMaterialId: material.google_material_id,
				title: material.title,
				description: material.description,
				state: material.state,
				createdTime: material.created_time,
				alternateLink: material.alternate_link,
				topic,
				attachments: material.google_classroom_material_attachments || [],
				sharedWithClasses
			};
		});

		return json({
			course: transformedCourse,
			coursework: enrichedCoursework,
			topics: transformedTopics,
			materials: transformedMaterials
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Course Details] Error:', err);
		throw error(500, 'An error occurred while fetching course details');
	}
};
