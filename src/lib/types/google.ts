/**
 * TypeScript types for Google Classroom API responses
 * Based on Google Classroom API v1 documentation
 * https://developers.google.com/classroom/reference/rest
 */

/**
 * OAuth token response from Google
 */
export interface GoogleOAuthTokenResponse {
	/** Access token for API requests */
	access_token: string;
	/** Token expiration time in seconds */
	expires_in: number;
	/** Refresh token for obtaining new access tokens (only on first authorization) */
	refresh_token?: string;
	/** Space-separated list of granted scopes */
	scope: string;
	/** Token type (always 'Bearer') */
	token_type: 'Bearer';
}

/**
 * Token information from Google's tokeninfo endpoint
 */
export interface GoogleTokenInfo {
	/** Authorized party (client ID) */
	azp: string;
	/** Audience (client ID) */
	aud: string;
	/** Subject (user ID) */
	sub: string;
	/** Space-separated list of scopes */
	scope: string;
	/** Expiration timestamp (seconds since epoch) */
	exp: string;
	/** Seconds until expiration */
	expires_in: string;
	/** User's email address (if email scope granted) */
	email?: string;
	/** Whether email is verified */
	email_verified?: string;
}

/**
 * Google Classroom course
 */
export interface GoogleCourse {
	/** Unique identifier for the course */
	id: string;
	/** Name of the course */
	name: string;
	/** Section of the course (e.g., "Period 2") */
	section?: string;
	/** Description heading for the course */
	descriptionHeading?: string;
	/** Optional description of the course */
	description?: string;
	/** Optional room location for the course */
	room?: string;
	/** Identifier of the owner (teacher) */
	ownerId: string;
	/** Creation time (ISO 8601 format) */
	creationTime: string;
	/** Update time (ISO 8601 format) */
	updateTime: string;
	/** Enrollment code for students to join */
	enrollmentCode?: string;
	/** State of the course */
	courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
	/** Absolute link to this course in the Classroom web UI */
	alternateLink: string;
	/** Teaching folder for the course */
	teacherFolder?: {
		id: string;
		title: string;
		alternateLink: string;
	};
	/** Teacher group email (optional) */
	teacherGroupEmail?: string;
	/** Course group email (optional) */
	courseGroupEmail?: string;
}

/**
 * List of courses from Google Classroom API
 */
export interface GoogleCourseList {
	/** List of courses */
	courses?: GoogleCourse[];
	/** Token for next page of results */
	nextPageToken?: string;
}

/**
 * Google Classroom coursework (assignment, question, etc.)
 */
export interface GoogleCoursework {
	/** Unique identifier for the coursework */
	id: string;
	/** Identifier of the course */
	courseId: string;
	/** Title of the coursework */
	title: string;
	/** Optional description */
	description?: string;
	/** Additional materials attached to the coursework */
	materials?: GoogleMaterial[];
	/** State of the coursework */
	state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
	/** Absolute link to this coursework in the Classroom web UI */
	alternateLink: string;
	/** Timestamp when the coursework was created */
	creationTime: string;
	/** Timestamp when the coursework was last updated */
	updateTime: string;
	/** Optional due date */
	dueDate?: {
		/** Year (e.g., 2024) */
		year: number;
		/** Month (1-12) */
		month: number;
		/** Day of month (1-31) */
		day: number;
	};
	/** Optional due time */
	dueTime?: {
		/** Hours (0-23) */
		hours: number;
		/** Minutes (0-59) */
		minutes: number;
		/** Seconds (0-59, optional) */
		seconds?: number;
		/** Nanoseconds (0-999999999, optional) */
		nanos?: number;
	};
	/** Maximum points for the coursework */
	maxPoints?: number;
	/** Type of work */
	workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
	/** Assignment submission type (only for ASSIGNMENT workType) */
	assignmentSubmission?: {
		attachments?: GoogleMaterial[];
	};
	/** Multiple choice question (only for MULTIPLE_CHOICE_QUESTION workType) */
	multipleChoiceQuestion?: {
		choices?: string[];
	};
	/** Scheduled time for coursework to become published */
	scheduledTime?: string;
	/** Topic ID */
	topicId?: string;
}

/**
 * List of coursework from Google Classroom API
 */
export interface GoogleCourseworkList {
	/** List of coursework */
	courseWork?: GoogleCoursework[];
	/** Token for next page of results */
	nextPageToken?: string;
}

/**
 * Material attached to coursework
 */
export interface GoogleMaterial {
	/** Google Drive file */
	driveFile?: {
		/** Drive file ID */
		id: string;
		/** Title of the file */
		title: string;
		/** URL to the Drive file */
		alternateLink: string;
		/** Thumbnail URL */
		thumbnailUrl?: string;
	};
	/** YouTube video */
	youtubeVideo?: {
		/** YouTube video ID */
		id: string;
		/** Title of the video */
		title: string;
		/** URL to the YouTube video */
		alternateLink: string;
		/** Thumbnail URL */
		thumbnailUrl?: string;
	};
	/** Link to external resource */
	link?: {
		/** URL of the link */
		url: string;
		/** Title of the link */
		title?: string;
		/** Thumbnail URL */
		thumbnailUrl?: string;
	};
	/** Google Form */
	form?: {
		/** URL to the form */
		formUrl: string;
		/** Title of the form */
		title: string;
		/** Thumbnail URL */
		thumbnailUrl?: string;
		/** Form response URL (for viewing responses) */
		responseUrl?: string;
	};
}

/**
 * Google API error response
 */
export interface GoogleAPIError {
	error: {
		/** Error code */
		code: number;
		/** Error message */
		message: string;
		/** Error status */
		status: string;
		/** Detailed error information */
		details?: Array<{
			'@type': string;
			reason?: string;
			domain?: string;
			metadata?: Record<string, string>;
		}>;
	};
}

/**
 * Material type enum for easier type checking
 */
export type MaterialType = 'DRIVE_FILE' | 'YOUTUBE_VIDEO' | 'LINK' | 'FORM';

/**
 * Coursework state enum
 */
export type CourseworkState = 'PUBLISHED' | 'DRAFT' | 'DELETED';

/**
 * Course state enum
 */
export type CourseState = 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';

/**
 * Work type enum
 */
export type WorkType = 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';

/**
 * Helper function to extract material type from GoogleMaterial
 */
export function getMaterialType(material: GoogleMaterial): MaterialType | null {
	if (material.driveFile) return 'DRIVE_FILE';
	if (material.youtubeVideo) return 'YOUTUBE_VIDEO';
	if (material.link) return 'LINK';
	if (material.form) return 'FORM';
	return null;
}

/**
 * Helper function to get material URL
 */
export function getMaterialUrl(material: GoogleMaterial): string | null {
	if (material.driveFile) return material.driveFile.alternateLink;
	if (material.youtubeVideo) return material.youtubeVideo.alternateLink;
	if (material.link) return material.link.url;
	if (material.form) return material.form.formUrl;
	return null;
}

/**
 * Helper function to get material title
 */
export function getMaterialTitle(material: GoogleMaterial): string {
	if (material.driveFile) return material.driveFile.title;
	if (material.youtubeVideo) return material.youtubeVideo.title;
	if (material.link) return material.link.title || material.link.url;
	if (material.form) return material.form.title;
	return 'Unknown material';
}

/**
 * Helper function to get material thumbnail
 */
export function getMaterialThumbnail(material: GoogleMaterial): string | null {
	if (material.driveFile) return material.driveFile.thumbnailUrl || null;
	if (material.youtubeVideo) return material.youtubeVideo.thumbnailUrl || null;
	if (material.link) return material.link.thumbnailUrl || null;
	if (material.form) return material.form.thumbnailUrl || null;
	return null;
}
