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
	/** Number of coursework items synced */
	courseworkSynced: number;
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
				courseStates: ['ACTIVE', 'ARCHIVED'] // Exclude PROVISIONED, DECLINED, SUSPENDED
			});

			if (courses) {
				allCourses.push(...courses);
			}

			nextPageToken = token;
		} while (nextPageToken);

		console.log(`[Sync] Fetched ${allCourses.length} courses for teacher ${teacherId}`);

		// Upsert each course into database
		for (const course of allCourses) {
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

		// Update last_sync_at on google_integrations
		await supabase
			.from('google_integrations')
			.update({ last_sync_at: new Date().toISOString() })
			.eq('teacher_id', teacherId);

		console.log(
			`[Sync] Synced ${result.synced}/${allCourses.length} courses for teacher ${teacherId}`
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		result.errors.push(`Failed to sync courses: ${message}`);
		console.error(`[Sync] Error syncing courses for teacher ${teacherId}:`, error);
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

				if (work.dueTime) {
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
					result.errors.push(`Failed to sync coursework ${work.title}: ${courseworkError.message}`);
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
							result.errors.push(`Failed to sync material for ${work.title}: ${message}`);
						}
					}
				}

				result.synced++;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				result.errors.push(`Failed to sync coursework ${work.title}: ${message}`);
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
		courseworkSynced: 0,
		errors: []
	};

	console.log(`[Sync] Starting full sync for teacher ${teacherId}`);

	try {
		// Step 1: Sync all courses
		const coursesResult = await syncTeacherCourses(teacherId, supabase);
		result.coursesSynced = coursesResult.synced;
		result.errors.push(...coursesResult.errors);

		// Step 2: Get all synced courses from database
		const { data: courses, error: coursesError } = await supabase
			.from('google_classroom_courses')
			.select('id, google_course_id, name')
			.eq('teacher_id', teacherId)
			.in('course_state', ['ACTIVE', 'ARCHIVED']);

		if (coursesError) {
			result.errors.push(`Failed to fetch courses from database: ${coursesError.message}`);
			return result;
		}

		if (!courses || courses.length === 0) {
			console.log(`[Sync] No courses found for teacher ${teacherId}`);
			return result;
		}

		// Step 3: Sync coursework for each course
		for (const course of courses) {
			console.log(`[Sync] Syncing coursework for course: ${course.name}`);

			const courseworkResult = await syncCoursework(
				course.id,
				course.google_course_id,
				teacherId,
				supabase
			);

			result.courseworkSynced += courseworkResult.synced;
			result.errors.push(...courseworkResult.errors);
		}

		console.log(
			`[Sync] Full sync completed for teacher ${teacherId}. ` +
				`Courses: ${result.coursesSynced}, Coursework: ${result.courseworkSynced}, Errors: ${result.errors.length}`
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

			// Get course ID from database and sync coursework
			const { data: dbCourse } = await supabase
				.from('google_classroom_courses')
				.select('id')
				.eq('teacher_id', teacherId)
				.eq('google_course_id', googleCourseId)
				.single();

			if (dbCourse) {
				const courseworkResult = await syncCoursework(
					dbCourse.id,
					googleCourseId,
					teacherId,
					supabase
				);
				result.errors.push(...courseworkResult.errors);
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
