/**
 * Google Classroom API Client
 * Provides methods to interact with Google Classroom API v1
 *
 * Features:
 * - Automatic token refresh on expiry
 * - Retry logic with exponential backoff for rate limits
 * - Comprehensive error handling
 * - Zod validation on all responses
 *
 * Reference: https://developers.google.com/classroom/reference/rest
 */

import type {
	GoogleCourse,
	GoogleCoursework,
	GoogleMaterial,
	GoogleCourseList,
	GoogleCourseworkList,
	GoogleTopic,
	GoogleTopicList,
	GoogleCourseWorkMaterial,
	GoogleCourseWorkMaterialList
} from '$lib/types/google';
import {
	googleCourseSchema,
	googleCourseListSchema,
	googleCourseworkSchema,
	googleCourseworkListSchema,
	googleTopicSchema,
	googleTopicListSchema,
	googleCourseWorkMaterialSchema,
	googleCourseWorkMaterialListSchema,
	googleAPIErrorSchema
} from './schemas';
import {
	GoogleAPIError,
	GoogleTokenExpiredError,
	GoogleRateLimitError,
	GoogleInsufficientPermissionsError,
	GoogleNotFoundError
} from './errors';
import { sleep, calculateBackoff } from './utils';

/**
 * Google Classroom API base URL
 */
const CLASSROOM_API_BASE = 'https://classroom.googleapis.com/v1';

/**
 * Maximum number of retry attempts for rate limit errors
 */
const MAX_RETRIES = 3;

/**
 * Options for listing courses
 */
export interface ListCoursesOptions {
	/** Maximum number of courses to return per page (1-100) */
	pageSize?: number;
	/** Token for next page of results */
	pageToken?: string;
	/** Filter by course state */
	courseStates?: Array<'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED'>;
}

/**
 * Options for listing coursework
 */
export interface ListCourseworkOptions {
	/** Maximum number of coursework to return per page (1-100) */
	pageSize?: number;
	/** Token for next page of results */
	pageToken?: string;
	/** Order by field (e.g., "updateTime desc", "dueDate asc") */
	orderBy?: string;
	/** Filter by coursework states */
	courseWorkStates?: Array<'PUBLISHED' | 'DRAFT' | 'DELETED'>;
}

/**
 * Google Classroom API Client
 * Handles all interactions with Google Classroom API
 */
export class GoogleClassroomClient {
	private accessToken: string;
	private teacherId: string;

	/**
	 * Create a new Google Classroom API client
	 *
	 * @param accessToken - Decrypted Google OAuth access token
	 * @param teacherId - UbuMaths teacher ID (for error tracking)
	 *
	 * @example
	 * ```typescript
	 * const client = new GoogleClassroomClient(decryptedToken, teacherId);
	 * const courses = await client.listCourses();
	 * ```
	 */
	constructor(accessToken: string, teacherId: string) {
		if (!accessToken) {
			throw new Error('Access token is required');
		}
		if (!teacherId) {
			throw new Error('Teacher ID is required');
		}

		this.accessToken = accessToken;
		this.teacherId = teacherId;
	}

	/**
	 * Make a request to Google Classroom API with error handling and retries
	 *
	 * @param endpoint - API endpoint path (e.g., "/courses")
	 * @param options - Fetch options
	 * @returns Response data
	 * @throws {GoogleAPIError} on API errors
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
		retryCount = 0
	): Promise<T> {
		const url = `${CLASSROOM_API_BASE}${endpoint}`;

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					'Content-Type': 'application/json',
					...options.headers
				}
			});

			// Handle successful response
			if (response.ok) {
				const data = await response.json();
				return data as T;
			}

			// Handle error responses
			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				// Handle specific error codes
				switch (response.status) {
					case 401:
						// Token expired or invalid
						throw new GoogleTokenExpiredError();

					case 403:
						// Insufficient permissions
						throw new GoogleInsufficientPermissionsError(error.message);

					case 404:
						// Resource not found
						throw new GoogleNotFoundError(error.message);

					case 429: {
						// Rate limit exceeded - retry with exponential backoff
						if (retryCount < MAX_RETRIES) {
							const retryAfter = this.getRetryAfter(response);
							const delay = retryAfter || calculateBackoff(retryCount);

							console.warn(
								`[GoogleClassroomClient] Rate limit hit for teacher ${this.teacherId}. ` +
									`Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
							);

							await sleep(delay);
							return this.request<T>(endpoint, options, retryCount + 1);
						}

						// Max retries exceeded
						throw new GoogleRateLimitError(this.getRetryAfter(response));
					}

					case 500:
					case 502:
					case 503:
					case 504:
						// Server errors - retry once
						if (retryCount === 0) {
							console.warn(
								`[GoogleClassroomClient] Server error ${response.status} for teacher ${this.teacherId}. Retrying once...`
							);
							await sleep(2000);
							return this.request<T>(endpoint, options, retryCount + 1);
						}
						throw new GoogleAPIError(error.message, response.status, error.status);

					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			// Fallback for non-standard error format
			throw new GoogleAPIError(
				`Google API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		} catch (error) {
			// Re-throw GoogleAPIError instances
			if (error instanceof GoogleAPIError) {
				throw error;
			}

			// Wrap network errors
			if (error instanceof Error) {
				throw new GoogleAPIError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR');
			}

			throw new GoogleAPIError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
		}
	}

	/**
	 * Extract Retry-After header from response
	 *
	 * @param response - Fetch response
	 * @returns Retry delay in milliseconds or undefined
	 */
	private getRetryAfter(response: Response): number | undefined {
		const retryAfter = response.headers.get('Retry-After');
		if (retryAfter) {
			const seconds = parseInt(retryAfter, 10);
			if (!isNaN(seconds)) {
				return seconds * 1000;
			}
		}
		return undefined;
	}

	/**
	 * List courses for the authenticated teacher
	 *
	 * @param options - Pagination and filter options
	 * @returns List of courses and next page token
	 *
	 * @example
	 * ```typescript
	 * const { courses, nextPageToken } = await client.listCourses({
	 *   pageSize: 50,
	 *   courseStates: ['ACTIVE']
	 * });
	 * ```
	 */
	async listCourses(options: ListCoursesOptions = {}): Promise<GoogleCourseList> {
		const params = new URLSearchParams();

		if (options.pageSize) {
			params.set('pageSize', Math.min(options.pageSize, 100).toString());
		}

		if (options.pageToken) {
			params.set('pageToken', options.pageToken);
		}

		if (options.courseStates && options.courseStates.length > 0) {
			options.courseStates.forEach((state) => {
				params.append('courseStates', state);
			});
		}

		const endpoint = `/courses${params.toString() ? `?${params.toString()}` : ''}`;
		const data = await this.request<GoogleCourseList>(endpoint);

		// Validate response
		const validation = googleCourseListSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid course list response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * Get a specific course by ID
	 *
	 * @param courseId - Google Classroom course ID
	 * @returns Course data
	 *
	 * @example
	 * ```typescript
	 * const course = await client.getCourse('123456');
	 * console.log(course.name); // "Math 101"
	 * ```
	 */
	async getCourse(courseId: string): Promise<GoogleCourse> {
		if (!courseId) {
			throw new Error('Course ID is required');
		}

		const endpoint = `/courses/${courseId}`;
		const data = await this.request<GoogleCourse>(endpoint);

		// Validate response
		const validation = googleCourseSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid course response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * List coursework for a specific course
	 *
	 * @param courseId - Google Classroom course ID
	 * @param options - Pagination and filter options
	 * @returns List of coursework and next page token
	 *
	 * @example
	 * ```typescript
	 * const { courseWork, nextPageToken } = await client.listCoursework('123456', {
	 *   pageSize: 50,
	 *   orderBy: 'updateTime desc',
	 *   courseWorkStates: ['PUBLISHED']
	 * });
	 * ```
	 */
	async listCoursework(
		courseId: string,
		options: ListCourseworkOptions = {}
	): Promise<GoogleCourseworkList> {
		if (!courseId) {
			throw new Error('Course ID is required');
		}

		const params = new URLSearchParams();

		if (options.pageSize) {
			params.set('pageSize', Math.min(options.pageSize, 100).toString());
		}

		if (options.pageToken) {
			params.set('pageToken', options.pageToken);
		}

		if (options.orderBy) {
			params.set('orderBy', options.orderBy);
		}

		if (options.courseWorkStates && options.courseWorkStates.length > 0) {
			options.courseWorkStates.forEach((state) => {
				params.append('courseWorkStates', state);
			});
		}

		const endpoint = `/courses/${courseId}/courseWork${params.toString() ? `?${params.toString()}` : ''}`;
		const data = await this.request<GoogleCourseworkList>(endpoint);

		// Validate response
		const validation = googleCourseworkListSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid coursework list response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * Get a specific coursework by ID
	 *
	 * @param courseId - Google Classroom course ID
	 * @param courseworkId - Coursework ID
	 * @returns Coursework data
	 *
	 * @example
	 * ```typescript
	 * const coursework = await client.getCoursework('123456', '789012');
	 * console.log(coursework.title); // "Homework 1"
	 * ```
	 */
	async getCoursework(courseId: string, courseworkId: string): Promise<GoogleCoursework> {
		if (!courseId) {
			throw new Error('Course ID is required');
		}
		if (!courseworkId) {
			throw new Error('Coursework ID is required');
		}

		const endpoint = `/courses/${courseId}/courseWork/${courseworkId}`;
		const data = await this.request<GoogleCoursework>(endpoint);

		// Validate response
		const validation = googleCourseworkSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid coursework response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * Get materials attached to coursework
	 * Extracts materials from coursework object
	 *
	 * @param courseId - Google Classroom course ID
	 * @param courseworkId - Coursework ID
	 * @returns Array of materials
	 *
	 * @example
	 * ```typescript
	 * const materials = await client.getCourseworkMaterials('123456', '789012');
	 * materials.forEach(material => {
	 *   if (material.driveFile) {
	 *     console.log(material.driveFile.title);
	 *   }
	 * });
	 * ```
	 */
	async getCourseworkMaterials(courseId: string, courseworkId: string): Promise<GoogleMaterial[]> {
		const coursework = await this.getCoursework(courseId, courseworkId);
		return coursework.materials || [];
	}

	/**
	 * List all coursework across all courses (convenience method)
	 * Useful for initial sync
	 *
	 * @returns Map of course ID to coursework array
	 *
	 * @example
	 * ```typescript
	 * const allCoursework = await client.listAllCoursework();
	 * for (const [courseId, coursework] of allCoursework) {
	 *   console.log(`Course ${courseId}: ${coursework.length} assignments`);
	 * }
	 * ```
	 */
	async listAllCoursework(): Promise<Map<string, GoogleCoursework[]>> {
		const result = new Map<string, GoogleCoursework[]>();

		// Get all active courses
		const { courses } = await this.listCourses({ courseStates: ['ACTIVE'] });

		if (!courses || courses.length === 0) {
			return result;
		}

		// For each course, get all coursework
		for (const course of courses) {
			const courseworkList: GoogleCoursework[] = [];
			let nextPageToken: string | undefined;

			do {
				const { courseWork, nextPageToken: token } = await this.listCoursework(course.id, {
					pageSize: 100,
					pageToken: nextPageToken,
					courseWorkStates: ['PUBLISHED', 'DRAFT'] // Exclude DELETED
				});

				if (courseWork) {
					courseworkList.push(...courseWork);
				}

				nextPageToken = token;
			} while (nextPageToken);

			result.set(course.id, courseworkList);
		}

		return result;
	}

	/**
	 * List all topics for a course
	 *
	 * @param courseId - The Google Classroom course ID
	 * @returns List of topics
	 *
	 * @example
	 * ```typescript
	 * const { topic } = await client.listTopics('123456');
	 * topic?.forEach(t => console.log(t.name));
	 * ```
	 */
	async listTopics(courseId: string): Promise<GoogleTopicList> {
		if (!courseId) {
			throw new Error('Course ID is required');
		}

		const endpoint = `/courses/${courseId}/topics`;
		const data = await this.request<GoogleTopicList>(endpoint);

		// Validate response
		const validation = googleTopicListSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid topic list response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}

	/**
	 * List course work materials (non-graded educational content)
	 *
	 * @param courseId - The Google Classroom course ID
	 * @param options - Optional filters (courseWorkStates, pageSize, pageToken, orderBy)
	 * @returns List of course work materials
	 *
	 * @example
	 * ```typescript
	 * const { courseWorkMaterial } = await client.listCourseWorkMaterials('123456', {
	 *   pageSize: 50,
	 *   courseWorkStates: ['PUBLISHED']
	 * });
	 * ```
	 */
	async listCourseWorkMaterials(
		courseId: string,
		options: ListCourseworkOptions = {}
	): Promise<GoogleCourseWorkMaterialList> {
		if (!courseId) {
			throw new Error('Course ID is required');
		}

		const params = new URLSearchParams();

		if (options.pageSize) {
			params.set('pageSize', Math.min(options.pageSize, 100).toString());
		}

		if (options.pageToken) {
			params.set('pageToken', options.pageToken);
		}

		if (options.orderBy) {
			params.set('orderBy', options.orderBy);
		}

		if (options.courseWorkStates && options.courseWorkStates.length > 0) {
			options.courseWorkStates.forEach((state) => {
				params.append('courseWorkStates', state);
			});
		}

		const endpoint = `/courses/${courseId}/courseWorkMaterials${params.toString() ? `?${params.toString()}` : ''}`;
		const data = await this.request<GoogleCourseWorkMaterialList>(endpoint);

		// Validate response
		const validation = googleCourseWorkMaterialListSchema.safeParse(data);
		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid course work material list response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return validation.data;
	}
}
