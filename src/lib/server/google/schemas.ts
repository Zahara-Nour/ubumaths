/**
 * Zod validation schemas for Google API responses
 * These schemas validate data received from Google Classroom and Drive APIs
 */

import { z } from 'zod';

/**
 * Google OAuth token response schema
 */
export const googleOAuthTokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number().int().positive(),
	refresh_token: z.string().optional(),
	scope: z.string(),
	token_type: z.literal('Bearer')
});

/**
 * Google token info schema
 */
export const googleTokenInfoSchema = z.object({
	azp: z.string(),
	aud: z.string(),
	sub: z.string(),
	scope: z.string(),
	exp: z.string(),
	expires_in: z.string(),
	email: z.string().email().optional(),
	email_verified: z.string().optional()
});

/**
 * Google date schema (used in dueDate)
 */
export const googleDateSchema = z.object({
	year: z.number().int().min(1970).max(2100),
	month: z.number().int().min(1).max(12),
	day: z.number().int().min(1).max(31)
});

/**
 * Google time schema (used in dueTime)
 */
export const googleTimeSchema = z.object({
	hours: z.number().int().min(0).max(23).optional(),
	minutes: z.number().int().min(0).max(59).optional(),
	seconds: z.number().int().min(0).max(59).optional(),
	nanos: z.number().int().min(0).max(999999999).optional()
});

/**
 * Google Drive file material schema
 */
export const googleDriveFileMaterialSchema = z.object({
	id: z.string().optional(),
	title: z.string().optional(),
	alternateLink: z.string().url().max(2048).optional(),
	thumbnailUrl: z.string().url().max(2048).optional()
});

/**
 * Google YouTube video material schema
 */
export const googleYoutubeVideoMaterialSchema = z.object({
	id: z.string(),
	title: z.string(),
	alternateLink: z.string().url().max(2048),
	thumbnailUrl: z.string().url().max(2048).optional()
});

/**
 * Google link material schema
 */
export const googleLinkMaterialSchema = z.object({
	url: z.string().url().max(2048),
	title: z.string().optional(),
	thumbnailUrl: z.string().url().max(2048).optional()
});

/**
 * Google form material schema
 */
export const googleFormMaterialSchema = z.object({
	formUrl: z.string().url().max(2048),
	title: z.string(),
	thumbnailUrl: z.string().url().max(2048).optional(),
	responseUrl: z.string().url().max(2048).optional()
});

/**
 * Google material schema (union of all material types)
 */
export const googleMaterialSchema = z.object({
	driveFile: googleDriveFileMaterialSchema.optional(),
	youtubeVideo: googleYoutubeVideoMaterialSchema.optional(),
	link: googleLinkMaterialSchema.optional(),
	form: googleFormMaterialSchema.optional()
});

/**
 * Teacher folder schema
 */
export const teacherFolderSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	alternateLink: z.string().url().max(2048).optional()
});

/**
 * Google course schema
 */
export const googleCourseSchema = z.object({
	id: z.string(),
	name: z.string(),
	section: z.string().optional(),
	descriptionHeading: z.string().optional(),
	description: z.string().optional(),
	room: z.string().optional(),
	ownerId: z.string(),
	creationTime: z.string(),
	updateTime: z.string(),
	enrollmentCode: z.string().optional(),
	courseState: z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']),
	alternateLink: z.string().url().max(2048),
	teacherFolder: teacherFolderSchema.optional(),
	teacherGroupEmail: z.string().email().optional(),
	courseGroupEmail: z.string().email().optional()
});

/**
 * Google course list schema
 */
export const googleCourseListSchema = z.object({
	courses: z.array(googleCourseSchema).optional(),
	nextPageToken: z.string().optional()
});

/**
 * Assignment submission schema
 */
export const assignmentSubmissionSchema = z.object({
	attachments: z.array(googleMaterialSchema).optional()
});

/**
 * Multiple choice question schema
 */
export const multipleChoiceQuestionSchema = z.object({
	choices: z.array(z.string()).optional()
});

/**
 * Google coursework schema
 */
export const googleCourseworkSchema = z.object({
	id: z.string(),
	courseId: z.string(),
	title: z.string(),
	description: z.string().optional(),
	materials: z.array(googleMaterialSchema).optional(),
	state: z.enum(['PUBLISHED', 'DRAFT', 'DELETED']),
	alternateLink: z.string().url().max(2048),
	creationTime: z.string(),
	updateTime: z.string(),
	dueDate: googleDateSchema.optional(),
	dueTime: googleTimeSchema.optional(),
	maxPoints: z.number().nonnegative().optional(),
	workType: z.enum(['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION']),
	assignmentSubmission: assignmentSubmissionSchema.optional(),
	multipleChoiceQuestion: multipleChoiceQuestionSchema.optional(),
	scheduledTime: z.string().optional(),
	topicId: z.string().optional()
});

/**
 * Google coursework list schema
 */
export const googleCourseworkListSchema = z.object({
	courseWork: z.array(googleCourseworkSchema).optional(),
	nextPageToken: z.string().optional()
});

/**
 * Google API error detail schema
 */
export const googleAPIErrorDetailSchema = z.object({
	'@type': z.string(),
	reason: z.string().optional(),
	domain: z.string().optional(),
	metadata: z.record(z.string(), z.string()).optional()
});

/**
 * Google API error response schema
 */
export const googleAPIErrorSchema = z.object({
	error: z.object({
		code: z.number().int(),
		message: z.string(),
		status: z.string(),
		details: z.array(googleAPIErrorDetailSchema).optional()
	})
});

/**
 * Google Drive file metadata schema
 */
export const googleDriveFileMetadataSchema = z.object({
	id: z.string(),
	name: z.string(),
	mimeType: z.string(),
	webViewLink: z.string().url().max(2048),
	webContentLink: z.string().url().max(2048).optional(),
	thumbnailLink: z.string().url().max(2048).optional(),
	iconLink: z.string().url().max(2048)
});
