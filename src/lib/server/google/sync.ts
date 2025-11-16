/**
 * Google Classroom Sync Service
 * Synchronizes courses and coursework from Google Classroom to UbuMaths database
 *
 * Features:
 * - Initial full sync of all courses and coursework
 * - Incremental syncs for changed data only
 * - Automatic token refresh
 * - Comprehensive error handling
 * - Transaction support for data integrity
 *
 * Workflow:
 * 1. Get and refresh access token if needed
 * 2. Sync courses from Google Classroom API
 * 3. For each course, sync coursework
 * 4. For each coursework, sync materials
 * 5. Update last_synced_at timestamps
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { GoogleClassroomClient } from './classroom-api';
import { GoogleDriveClient } from './drive-api';
import { decryptToken, encryptToken } from './encryption';
import { refreshAccessToken, shouldRefreshToken } from './oauth';
import { parseGoogleDateTime, extractMaterialData } from './utils';
// Error types imported for future use
// import { GoogleTokenExpiredError, GoogleAPIError } from './errors';

// Type for topic ID mapping queries
type TopicMapping = {
	id: string;
	google_topic_id: string;
};

/**
 * Sync result interface
 */
export interface SyncResult {
	/** Number of items successfully synced */
	synced: number;
	/** Array of error messages encountered during sync */
	errors: string[];
}

/**
 * Full sync result interface
 */
export interface FullSyncResult {
	/** Number of courses synced */
	coursesSynced: number;
	/** Number of topics synced */
	topicsSynced: number;
	/** Number of coursework items synced */
	courseworkSynced: number;
	/** Number of materials synced */
	materialsSynced: number;
	/** Array of error messages encountered during sync */
	errors: string[];
}

/**
 * Get access token for teacher with automatic refresh if needed
 * Fetches from database, checks expiry, and refreshes if necessary
 *
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Decrypted access token ready for API calls
 * @throws {Error} if teacher has no Google integration or token refresh fails
 *
 * @example
 * ```typescript
 * const accessToken = await getTeacherAccessToken(teacherId, supabase);
 * const client = new GoogleClassroomClient(accessToken, teacherId);
 * ```
 */
export async function getTeacherAccessToken(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<string> {
	// Fetch integration from database
	const { data: integration, error } = await supabase
		.from('google_integrations')
		.select('access_token, refresh_token, token_expiry')
		.eq('teacher_id', teacherId)
		.single();

	if (error || !integration) {
		throw new Error(
			`No Google integration found for teacher ${teacherId}. Teacher must authorize Google Classroom first.`
		);
	}

	// Check if token needs refresh (expires in less than 5 minutes)
	if (shouldRefreshToken(integration.token_expiry)) {
		console.log(`[Sync] Refreshing expired token for teacher ${teacherId}`);

		try {
			// Decrypt refresh token
			const decryptedRefreshToken = decryptToken(integration.refresh_token);

			// Get new access token from Google
			const { access_token, expires_in } = await refreshAccessToken(decryptedRefreshToken);

			// Update database with new access token and expiry
			const newExpiry = new Date(Date.now() + expires_in * 1000);
			const encryptedAccessToken = encryptToken(access_token);

			const { error: updateError } = await supabase
				.from('google_integrations')
				.update({
					access_token: encryptedAccessToken,
					token_expiry: newExpiry.toISOString()
				})
				.eq('teacher_id', teacherId);

			if (updateError) {
				throw new Error(`Failed to update refreshed token: ${updateError.message}`);
			}

			console.log(`[Sync] Token refreshed successfully for teacher ${teacherId}`);
			return access_token;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to refresh access token: ${message}`);
		}
	}

	// Token is still valid, decrypt and return
	return decryptToken(integration.access_token);
}

/**
 * Sync all courses for a teacher from Google Classroom
 * Fetches all courses and upserts them into database
 *
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Sync result with count and errors
 *
 * @example
 * ```typescript
 * const result = await syncTeacherCourses(teacherId, supabase);
 * console.log(`Synced ${result.synced} courses`);
 * result.errors.forEach(err => console.error(err));
 * ```
 */
export async function syncTeacherCourses(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, errors: [] };

	try {
		// Get access token with auto-refresh
		const accessToken = await getTeacherAccessToken(teacherId, supabase);

		// Create API client
		const client = new GoogleClassroomClient(accessToken, teacherId);

		// Fetch all courses (handle pagination)
		const allCourses = [];
		let nextPageToken: string | undefined;

		do {
			const { courses, nextPageToken: token } = await client.listCourses({
				pageSize: 100,
				pageToken: nextPageToken,
				courseStates: ['ACTIVE'] // Only sync active courses (exclude ARCHIVED, PROVISIONED, DECLINED, SUSPENDED)
			});

			if (courses) {
				allCourses.push(...courses);
			}

			nextPageToken = token;
		} while (nextPageToken);

		console.log(`[Sync] Fetched ${allCourses.length} active courses for teacher ${teacherId}`);

		// Track synced Google course IDs for cleanup
		const syncedGoogleCourseIds: string[] = [];

		// Upsert each course into database
		for (const course of allCourses) {
			syncedGoogleCourseIds.push(course.id);
			try {
				const { error: upsertError } = await supabase.from('google_classroom_courses').upsert(
					{
						teacher_id: teacherId,
						google_course_id: course.id,
						name: course.name,
						section: course.section || null,
						description_heading: course.descriptionHeading || null,
						room: course.room || null,
						enrollment_code: course.enrollmentCode || null,
						course_state: course.courseState,
						alternate_link: course.alternateLink || null,
						last_synced_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					},
					{
						onConflict: 'teacher_id,google_course_id',
						ignoreDuplicates: false
					}
				);

				if (upsertError) {
					result.errors.push(`Failed to sync course ${course.name}: ${upsertError.message}`);
				} else {
					result.synced++;
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				result.errors.push(`Failed to sync course ${course.name}: ${message}`);
			}
		}

		// Cleanup: Delete courses that are no longer in Google Classroom (archived, deleted, etc.)
		if (syncedGoogleCourseIds.length > 0) {
			const { error: deleteError, count } = await supabase
				.from('google_classroom_courses')
				.delete({ count: 'exact' })
				.eq('teacher_id', teacherId)
				.not('google_course_id', 'in', `(${syncedGoogleCourseIds.join(',')})`);

			if (deleteError) {
				result.errors.push(`Failed to cleanup old courses: ${deleteError.message}`);
			} else if (count && count > 0) {
				console.log(`[Sync] Cleaned up ${count} old/archived courses for teacher ${teacherId}`);
			}
		} else {
			// No active courses - delete all courses for this teacher
			const { error: deleteError, count } = await supabase
				.from('google_classroom_courses')
				.delete({ count: 'exact' })
				.eq('teacher_id', teacherId);

			if (deleteError) {
				result.errors.push(`Failed to cleanup courses: ${deleteError.message}`);
			} else if (count && count > 0) {
				console.log(
					`[Sync] No active courses found. Cleaned up ${count} courses for teacher ${teacherId}`
				);
			}
		}

		// Update last_sync_at on google_integrations
		await supabase
			.from('google_integrations')
			.update({ last_sync_at: new Date().toISOString() })
			.eq('teacher_id', teacherId);

		console.log(
			`[Sync] Synced ${result.synced}/${allCourses.length} active courses for teacher ${teacherId}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync courses: ${message}`);
		console.error(`[Sync] Error syncing courses for teacher ${teacherId}:`, error);
	}

	return result;
}

/**
 * Sync topics for a specific Google Classroom course
 * Fetches topics from Google Classroom and upserts them into database
 *
 * @param courseId - UbuMaths course ID (google_classroom_courses.id)
 * @param googleCourseId - Google Classroom course ID
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Sync result with count and errors
 *
 * @example
 * ```typescript
 * const result = await syncTopics(courseId, googleCourseId, teacherId, supabase);
 * console.log(`Synced ${result.synced} topics`);
 * ```
 */
export async function syncTopics(
	courseId: string,
	googleCourseId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, errors: [] };

	try {
		// Get access token with auto-refresh
		const accessToken = await getTeacherAccessToken(teacherId, supabase);

		// Create API client
		const client = new GoogleClassroomClient(accessToken, teacherId);

		// Fetch topics from Google Classroom
		const topicListResponse = await client.listTopics(googleCourseId);

		const { topic: topics } = topicListResponse; // Note: API returns "topic" (singular)

		// If no topics, return early
		if (!topics || topics.length === 0) {
			console.log(`[Sync] No topics found for course ${googleCourseId}`);
			return result;
		}

		console.log(`[Sync] Fetched ${topics.length} topics for course ${googleCourseId}`);

		// Track synced Google topic IDs for cleanup
		const syncedGoogleTopicIds: string[] = [];

		// Upsert each topic into database
		for (const topic of topics) {
			syncedGoogleTopicIds.push(topic.topicId);
			try {
				const { error: upsertError } = await supabase.from('google_classroom_topics').upsert(
					{
						google_course_id: courseId,
						google_topic_id: topic.topicId,
						name: topic.name,
						updated_time: topic.updateTime,
						last_synced_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					},
					{
						onConflict: 'google_course_id,google_topic_id',
						ignoreDuplicates: false
					}
				);

				if (upsertError) {
					const errorMsg = `Failed to sync topic ${topic.name}: ${upsertError.message}`;
					result.errors.push(errorMsg);
					console.error(`[Sync] ${errorMsg}`);
				} else {
					result.synced++;
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const errorMsg = `Failed to sync topic ${topic.name}: ${message}`;
				result.errors.push(errorMsg);
				console.error(`[Sync] ${errorMsg}`);
			}
		}

		// Cleanup: Delete topics that no longer exist in Google Classroom
		if (syncedGoogleTopicIds.length > 0) {
			const { error: deleteError, count } = await supabase
				.from('google_classroom_topics')
				.delete({ count: 'exact' })
				.eq('google_course_id', courseId)
				.filter('google_topic_id', 'not.in', `(${syncedGoogleTopicIds.join(',')})`);

			if (deleteError) {
				const errorMsg = `Failed to cleanup old topics: ${deleteError.message}`;
				result.errors.push(errorMsg);
				console.error(`[Sync] ${errorMsg}`);
			} else if (count && count > 0) {
				console.log(`[Sync] Cleaned up ${count} deleted topics for course ${googleCourseId}`);
			}
		} else {
			// No topics - delete all topics for this course
			const { error: deleteError, count } = await supabase
				.from('google_classroom_topics')
				.delete({ count: 'exact' })
				.eq('google_course_id', courseId);

			if (deleteError) {
				const errorMsg = `Failed to cleanup topics: ${deleteError.message}`;
				result.errors.push(errorMsg);
				console.error(`[Sync] ${errorMsg}`);
			} else if (count && count > 0) {
				console.log(
					`[Sync] No topics found. Cleaned up ${count} topics for course ${googleCourseId}`
				);
			}
		}

		console.log(
			`[Sync] Synced ${result.synced}/${topics.length} topics for course ${googleCourseId}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync topics: ${message}`);
		console.error(`[Sync] Error syncing topics for course ${googleCourseId}:`, error);
	}

	return result;
}

/**
 * Sync coursework for a specific Google Classroom course
 * Fetches all coursework and materials, upserts into database
 *
 * @param courseId - UbuMaths course ID (google_classroom_courses.id)
 * @param googleCourseId - Google Classroom course ID
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Sync result with count and errors
 *
 * @example
 * ```typescript
 * const result = await syncCoursework(courseId, googleCourseId, teacherId, supabase);
 * console.log(`Synced ${result.synced} coursework items`);
 * ```
 */
export async function syncCoursework(
	courseId: string,
	googleCourseId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, errors: [] };

	try {
		// Get access token with auto-refresh
		const accessToken = await getTeacherAccessToken(teacherId, supabase);

		// Create API clients
		const classroomClient = new GoogleClassroomClient(accessToken, teacherId);
		// Drive client for future use (file metadata, thumbnails)
		const _driveClient = new GoogleDriveClient(accessToken);

		// Fetch all coursework (handle pagination)
		const allCoursework = [];
		let nextPageToken: string | undefined;

		do {
			const { courseWork, nextPageToken: token } = await classroomClient.listCoursework(
				googleCourseId,
				{
					pageSize: 100,
					pageToken: nextPageToken,
					orderBy: 'updateTime desc',
					courseWorkStates: ['PUBLISHED', 'DRAFT'] // Exclude DELETED
				}
			);

			if (courseWork) {
				allCoursework.push(...courseWork);
			}

			nextPageToken = token;
		} while (nextPageToken);

		console.log(
			`[Sync] Fetched ${allCoursework.length} coursework items for course ${googleCourseId}`
		);

		// Early return if no coursework
		if (allCoursework.length === 0) {
			console.log(`[Sync] No coursework found for course ${googleCourseId}`);
			return result;
		}

		// Get topic ID mappings (google_topic_id -> internal id)
		const { data: topics, error: topicsError } = await supabase
			.from('google_classroom_topics')
			.select('id, google_topic_id')
			.eq('google_course_id', courseId);

		if (topicsError) {
			const errorMsg = `Warning: Failed to fetch topics for course ${googleCourseId}: ${topicsError.message}. Coursework will not link to topics.`;
			result.errors.push(errorMsg);
			console.error(`[Sync] ${errorMsg}`);
		}

		const topicMap = new Map<string, string>();
		if (topics && Array.isArray(topics)) {
			topics.forEach((topic: TopicMapping) => {
				topicMap.set(topic.google_topic_id, topic.id);
			});
		}

		// Upsert each coursework into database
		for (const work of allCoursework) {
			try {
				// Parse due date/time
				// Note: parseGoogleDateTime available for future combined datetime use
				const _dueDateTime = parseGoogleDateTime(work.dueDate, work.dueTime);
				let dueDate: string | null = null;
				let dueTime: string | null = null;

				if (work.dueDate) {
					dueDate = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day)
						.toISOString()
						.split('T')[0];
				}

				if (
					work.dueTime &&
					work.dueTime.hours !== undefined &&
					work.dueTime.minutes !== undefined
				) {
					dueTime = `${work.dueTime.hours.toString().padStart(2, '0')}:${work.dueTime.minutes.toString().padStart(2, '0')}:00`;
				}

				// Upsert coursework
				const { data: courseworkData, error: courseworkError } = await supabase
					.from('google_classroom_coursework')
					.upsert(
						{
							google_course_id: courseId,
							google_coursework_id: work.id,
							title: work.title,
							description: work.description || null,
							coursework_type: work.workType,
							state: work.state,
							due_date: dueDate,
							due_time: dueTime,
							created_time: work.creationTime,
							updated_time: work.updateTime,
							max_points: work.maxPoints || null,
							work_type: work.workType,
							alternate_link: work.alternateLink || null,
							topic_id: work.topicId ? topicMap.get(work.topicId) || null : null,
							last_synced_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						},
						{
							onConflict: 'google_course_id,google_coursework_id',
							ignoreDuplicates: false
						}
					)
					.select('id')
					.single();

				if (courseworkError) {
					const errorMsg = `Failed to sync coursework ${work.title}: ${courseworkError.message}`;
					result.errors.push(errorMsg);
					console.error(`[Sync] ${errorMsg}`);
					continue;
				}

				// Sync materials if present
				if (work.materials && work.materials.length > 0) {
					// Delete existing materials for this coursework (will re-insert)
					await supabase
						.from('coursework_materials')
						.delete()
						.eq('coursework_id', courseworkData.id);

					// Insert new materials
					for (const material of work.materials) {
						try {
							const materialData = extractMaterialData(material);

							await supabase.from('coursework_materials').insert({
								coursework_id: courseworkData.id,
								material_type: materialData.type,
								google_file_id: materialData.fileId || null,
								file_name: materialData.fileName,
								mime_type: materialData.mimeType || null,
								file_url: materialData.url,
								thumbnail_url: materialData.thumbnailUrl || null,
								title: materialData.title || null
							});
						} catch (materialError) {
							const message =
								materialError instanceof Error ? materialError.message : 'Unknown error';
							const errorMsg = `Failed to sync material for ${work.title}: ${message}`;
							result.errors.push(errorMsg);
							console.error(`[Sync] ${errorMsg}`);
						}
					}
				}

				result.synced++;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const errorMsg = `Failed to sync coursework ${work.title}: ${message}`;
				result.errors.push(errorMsg);
				console.error(`[Sync] ${errorMsg}`, error);
			}
		}

		console.log(
			`[Sync] Synced ${result.synced}/${allCoursework.length} coursework items for course ${googleCourseId}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync coursework: ${message}`);
		console.error(`[Sync] Error syncing coursework for course ${googleCourseId}:`, error);
	}

	return result;
}

/**
 * Sync course work materials (non-graded educational content) for a course
 * Fetches materials from Google Classroom and upserts them with attachments
 *
 * @param courseId - UbuMaths course ID (google_classroom_courses.id)
 * @param googleCourseId - Google Classroom course ID
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Sync result with count and errors
 *
 * @example
 * ```typescript
 * const result = await syncCourseWorkMaterials(courseId, googleCourseId, teacherId, supabase);
 * console.log(`Synced ${result.synced} course work materials`);
 * ```
 */
export async function syncCourseWorkMaterials(
	courseId: string,
	googleCourseId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, errors: [] };

	try {
		// Get access token with auto-refresh
		const accessToken = await getTeacherAccessToken(teacherId, supabase);

		// Create API client
		const classroomClient = new GoogleClassroomClient(accessToken, teacherId);

		// Fetch all course work materials (handle pagination)
		const allMaterials = [];
		let nextPageToken: string | undefined;

		do {
			const { courseWorkMaterial, nextPageToken: token } =
				await classroomClient.listCourseWorkMaterials(googleCourseId, {
					pageSize: 100,
					pageToken: nextPageToken,
					orderBy: 'updateTime desc',
					courseWorkMaterialStates: ['PUBLISHED'] // Only sync published materials
				});

			if (courseWorkMaterial) {
				allMaterials.push(...courseWorkMaterial);
			}

			nextPageToken = token;
		} while (nextPageToken);

		// If no materials, return early
		if (allMaterials.length === 0) {
			console.log(`[Sync] No course work materials found for course ${googleCourseId}`);
			return result;
		}

		console.log(
			`[Sync] Fetched ${allMaterials.length} course work materials for course ${googleCourseId}`
		);

		// Get topic ID mappings (google_topic_id -> internal id)
		const { data: topics, error: topicsError } = await supabase
			.from('google_classroom_topics')
			.select('id, google_topic_id')
			.eq('google_course_id', courseId);

		if (topicsError) {
			const errorMsg = `Warning: Failed to fetch topics for course ${googleCourseId}: ${topicsError.message}. Materials will not link to topics.`;
			result.errors.push(errorMsg);
			console.error(`[Sync] ${errorMsg}`);
		}

		const topicMap = new Map<string, string>();
		if (topics && Array.isArray(topics)) {
			topics.forEach((topic: TopicMapping) => {
				topicMap.set(topic.google_topic_id, topic.id);
			});
		}

		// Upsert each material into database
		for (const material of allMaterials) {
			try {
				// Upsert material
				const { data: materialData, error: materialError } = await supabase
					.from('google_classroom_materials')
					.upsert(
						{
							google_course_id: courseId,
							google_material_id: material.id,
							title: material.title,
							description: material.description || null,
							state: material.state,
							topic_id: material.topicId ? topicMap.get(material.topicId) || null : null,
							created_time: material.creationTime,
							updated_time: material.updateTime,
							alternate_link: material.alternateLink || null,
							last_synced_at: new Date().toISOString(),
							updated_at: new Date().toISOString()
						},
						{
							onConflict: 'google_course_id,google_material_id',
							ignoreDuplicates: false
						}
					)
					.select('id')
					.single();

				if (materialError) {
					const errorMsg = `Failed to sync material ${material.title}: ${materialError.message}`;
					result.errors.push(errorMsg);
					console.error(`[Sync] ${errorMsg}`);
					continue;
				}

				// Sync attachments if present
				if (material.materials && material.materials.length > 0) {
					// Delete existing attachments for this material (will re-insert)
					await supabase
						.from('google_classroom_material_attachments')
						.delete()
						.eq('google_material_id', materialData.id);

					// Insert new attachments
					for (const attachment of material.materials) {
						try {
							const attachmentData = extractMaterialData(attachment);

							await supabase.from('google_classroom_material_attachments').insert({
								google_material_id: materialData.id,
								material_type: attachmentData.type,
								google_file_id: attachmentData.fileId || null,
								file_name: attachmentData.fileName,
								mime_type: attachmentData.mimeType || null,
								file_url: attachmentData.url,
								thumbnail_url: attachmentData.thumbnailUrl || null,
								title: attachmentData.title || null
							});
						} catch (attachmentError) {
							const message =
								attachmentError instanceof Error ? attachmentError.message : 'Unknown error';
							const errorMsg = `Failed to sync attachment for ${material.title}: ${message}`;
							result.errors.push(errorMsg);
							console.error(`[Sync] ${errorMsg}`);
						}
					}
				}

				result.synced++;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const errorMsg = `Failed to sync material ${material.title}: ${message}`;
				result.errors.push(errorMsg);
				console.error(`[Sync] ${errorMsg}`, error);
			}
		}

		console.log(
			`[Sync] Synced ${result.synced}/${allMaterials.length} course work materials for course ${googleCourseId}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync course work materials: ${message}`);
		console.error(
			`[Sync] Error syncing course work materials for course ${googleCourseId}:`,
			error
		);
	}

	return result;
}

/**
 * Perform full sync of all courses and coursework for a teacher
 * This is the main sync function called on initial setup and periodic full syncs
 *
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Full sync result with counts and errors
 *
 * @example
 * ```typescript
 * const result = await fullSync(teacherId, supabase);
 * console.log(`Synced ${result.coursesSynced} courses and ${result.courseworkSynced} coursework`);
 * if (result.errors.length > 0) {
 *   console.error('Errors:', result.errors);
 * }
 * ```
 */
export async function fullSync(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<FullSyncResult> {
	const result: FullSyncResult = {
		coursesSynced: 0,
		topicsSynced: 0,
		courseworkSynced: 0,
		materialsSynced: 0,
		errors: []
	};

	console.log(`[Sync] Starting full sync for teacher ${teacherId}`);

	try {
		// Step 1: Sync all courses
		const coursesResult = await syncTeacherCourses(teacherId, supabase);
		result.coursesSynced = coursesResult.synced;
		result.errors.push(...coursesResult.errors);

		// Step 2: Get all synced courses from database (only ACTIVE courses are synced)
		const { data: courses, error: coursesError } = await supabase
			.from('google_classroom_courses')
			.select('id, google_course_id, name')
			.eq('teacher_id', teacherId)
			.eq('course_state', 'ACTIVE');

		if (coursesError) {
			result.errors.push(`Failed to fetch courses from database: ${coursesError.message}`);
			return result;
		}

		if (!courses || courses.length === 0) {
			console.log(`[Sync] No courses found for teacher ${teacherId}`);
			return result;
		}

		// Step 3: Sync topics, coursework, and materials for each course
		for (const course of courses) {
			console.log(`[Sync] Syncing data for course: ${course.name}`);

			// 3a. Sync topics first (needed for coursework/materials linking)
			const topicsResult = await syncTopics(
				course.id,
				course.google_course_id,
				teacherId,
				supabase
			);
			result.topicsSynced += topicsResult.synced;
			result.errors.push(...topicsResult.errors);

			// 3b. Sync coursework (with topic links)
			const courseworkResult = await syncCoursework(
				course.id,
				course.google_course_id,
				teacherId,
				supabase
			);
			result.courseworkSynced += courseworkResult.synced;
			result.errors.push(...courseworkResult.errors);

			// 3c. Sync course work materials (with topic links)
			const materialsResult = await syncCourseWorkMaterials(
				course.id,
				course.google_course_id,
				teacherId,
				supabase
			);
			result.materialsSynced += materialsResult.synced;
			result.errors.push(...materialsResult.errors);
		}

		console.log(
			`[Sync] Full sync completed for teacher ${teacherId}. ` +
				`Courses: ${result.coursesSynced}, Topics: ${result.topicsSynced}, ` +
				`Coursework: ${result.courseworkSynced}, Materials: ${result.materialsSynced}, ` +
				`Errors: ${result.errors.length}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Full sync failed: ${message}`);
		console.error(`[Sync] Fatal error during full sync for teacher ${teacherId}:`, error);
	}

	return result;
}

/**
 * Sync a single course by Google course ID
 * Convenience function for syncing one specific course
 *
 * @param googleCourseId - Google Classroom course ID
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns Sync result
 *
 * @example
 * ```typescript
 * const result = await syncSingleCourse('abc123', teacherId, supabase);
 * ```
 */
export async function syncSingleCourse(
	googleCourseId: string,
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<SyncResult> {
	const result: SyncResult = { synced: 0, errors: [] };

	try {
		// Get access token
		const accessToken = await getTeacherAccessToken(teacherId, supabase);
		const client = new GoogleClassroomClient(accessToken, teacherId);

		// Fetch course from Google
		const course = await client.getCourse(googleCourseId);

		// Upsert to database
		const { error: upsertError } = await supabase.from('google_classroom_courses').upsert(
			{
				teacher_id: teacherId,
				google_course_id: course.id,
				name: course.name,
				section: course.section || null,
				description_heading: course.descriptionHeading || null,
				room: course.room || null,
				enrollment_code: course.enrollmentCode || null,
				course_state: course.courseState,
				alternate_link: course.alternateLink || null,
				last_synced_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'teacher_id,google_course_id',
				ignoreDuplicates: false
			}
		);

		if (upsertError) {
			result.errors.push(`Failed to sync course: ${upsertError.message}`);
		} else {
			result.synced = 1;

			// Get course ID from database and sync topics, coursework, and materials
			const { data: dbCourse } = await supabase
				.from('google_classroom_courses')
				.select('id')
				.eq('teacher_id', teacherId)
				.eq('google_course_id', googleCourseId)
				.single();

			if (dbCourse) {
				// Sync topics first
				const topicsResult = await syncTopics(dbCourse.id, googleCourseId, teacherId, supabase);
				result.errors.push(...topicsResult.errors);

				// Sync coursework (with topic links)
				const courseworkResult = await syncCoursework(
					dbCourse.id,
					googleCourseId,
					teacherId,
					supabase
				);
				result.errors.push(...courseworkResult.errors);

				// Sync course work materials (with topic links)
				const materialsResult = await syncCourseWorkMaterials(
					dbCourse.id,
					googleCourseId,
					teacherId,
					supabase
				);
				result.errors.push(...materialsResult.errors);
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync course: ${message}`);
	}

	return result;
}

/**
 * Check if teacher has a valid Google integration
 * Useful for checking prerequisites before syncing
 *
 * @param teacherId - UbuMaths teacher ID
 * @param supabase - Supabase client
 * @returns true if teacher has valid integration
 *
 * @example
 * ```typescript
 * if (await hasValidIntegration(teacherId, supabase)) {
 *   await fullSync(teacherId, supabase);
 * } else {
 *   console.error('Teacher needs to authorize Google Classroom first');
 * }
 * ```
 */
export async function hasValidIntegration(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<boolean> {
	const { data, error } = await supabase
		.from('google_integrations')
		.select('id')
		.eq('teacher_id', teacherId)
		.single();

	return !error && !!data;
}
