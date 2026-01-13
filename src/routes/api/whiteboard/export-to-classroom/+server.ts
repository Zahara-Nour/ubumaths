/**
 * Export Whiteboard to Google Classroom Endpoint
 * ================================================
 *
 * Endpoint: POST /api/whiteboard/export-to-classroom
 * Purpose: Export a whiteboard PDF to Google Classroom as a CourseWorkMaterial
 *
 * Flow:
 * 1. Validate inputs
 * 2. Verify teacher role and Google integration
 * 3. Get course details and verify ownership
 * 4. Upload PDF to Google Drive
 * 5. Create CourseWorkMaterial in Google Classroom
 * 6. Return links to the created material
 *
 * Security:
 * - Teacher role required
 * - Course ownership verified
 * - Course must be ACTIVE
 * - PDF content validated (magic bytes)
 * - Google integration with drive.file scope required
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { GoogleClassroomClient } from '$lib/server/google/classroom-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';

/**
 * Request body schema
 * - pdfBase64: PDF file encoded as base64 (max ~15MB after encoding)
 * - filename: Name for the file (will be used in Drive)
 * - courseId: Internal course UUID (from google_classroom_courses table)
 * - topicId: Optional topic ID to organize the material
 * - title: Title for the CourseWorkMaterial
 * - description: Optional description
 */
const exportToClassroomRequestSchema = z.object({
	pdfBase64: z
		.string()
		.min(100, 'PDF data appears to be invalid or empty')
		.max(20_000_000, 'PDF file is too large (max 15MB)'),
	filename: z
		.string()
		.min(1, 'Filename is required')
		.max(200, 'Filename is too long')
		.regex(/^[^<>:"/\\|?*]+$/, 'Filename contains invalid characters')
		.refine((s) => s.trim() === s, 'Filename cannot start or end with spaces')
		.refine((s) => !s.includes('..'), 'Filename cannot contain path traversal'),
	courseId: z.string().uuid('Invalid course ID'),
	topicId: z.string().uuid('Invalid topic ID').optional(),
	title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
	description: z.string().max(5000, 'Description is too long (max 5000 characters)').optional()
});

/**
 * Export whiteboard PDF to Google Classroom
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch (err) {
		console.error('[Export to Classroom] Invalid JSON body:', err);
		throw error(400, 'Invalid JSON body');
	}

	const validation = exportToClassroomRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { pdfBase64, filename, courseId, topicId, title, description } = validation.data;

	try {
		// Verify course ownership, state and get Google course ID
		const { data: course, error: courseError } = await locals.supabase
			.from('google_classroom_courses')
			.select('id, google_course_id, name, course_state')
			.eq('id', courseId)
			.eq('teacher_id', user.id)
			.eq('course_state', 'ACTIVE')
			.single();

		if (courseError) {
			if (courseError.code === 'PGRST116') {
				throw error(404, 'Cours introuvable, archivé ou accès refusé');
			}
			console.error('[Export to Classroom] Course lookup error:', courseError);
			throw error(500, 'Échec de la vérification du cours');
		}

		// If topicId provided, verify it belongs to this course and get google_topic_id
		let googleTopicId: string | undefined;
		if (topicId) {
			// SECURITY: topicId validated as UUID by Zod schema
			// Supabase PostgREST uses parameterized queries, preventing SQL injection
			const { data: topic, error: topicError } = await locals.supabase
				.from('google_classroom_topics')
				.select('id, google_topic_id')
				.eq('id', topicId)
				.eq('google_course_id', course.id)
				.single();

			if (topicError || !topic) {
				throw error(400, "Rubrique invalide ou n'appartient pas à ce cours");
			}

			googleTopicId = topic.google_topic_id;
		}

		// Get access token (with automatic refresh if needed)
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);
		const classroomClient = new GoogleClassroomClient(accessToken, user.id);

		// Validate and extract base64 PDF content
		let pdfBase64Content: string;
		try {
			// Remove data URL prefix if present (data:application/pdf;base64,)
			pdfBase64Content = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

			// Validate by decoding a small portion to check PDF magic bytes
			// We decode just enough to verify the file starts with %PDF-
			const testDecode = atob(pdfBase64Content.slice(0, 20));
			if (!testDecode.startsWith('%PDF-')) {
				throw error(400, 'Fichier invalide: le contenu ne semble pas être un PDF');
			}

			// Check if base64 appears valid (only valid base64 characters)
			if (!/^[A-Za-z0-9+/=]+$/.test(pdfBase64Content)) {
				throw error(400, 'Données PDF invalides: encodage base64 incorrect');
			}
		} catch (err) {
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			console.error('[Export to Classroom] Base64 validation error:', err);
			throw error(400, 'Données PDF invalides: encodage base64 incorrect');
		}

		// Get or create the app folder in Google Drive
		const folderId = await driveClient.getOrCreateAppFolder();

		// Ensure filename has .pdf extension
		const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

		// Upload PDF to Google Drive (using base64 to preserve binary data)
		const driveFile = await driveClient.createFile({
			name: finalFilename,
			content: pdfBase64Content,
			mimeType: 'application/pdf',
			folderId,
			description: `Exported from UbuMaths Whiteboard: ${title}`,
			isBase64: true
		});

		console.log(
			`[Export to Classroom] Uploaded PDF ${driveFile.id} for teacher ${user.id} to folder ${folderId}`
		);

		// Create CourseWorkMaterial in Google Classroom
		const material = await classroomClient.createCourseWorkMaterial(course.google_course_id, {
			title,
			description,
			topicId: googleTopicId,
			state: 'PUBLISHED',
			materials: [
				{
					driveFile: {
						driveFile: {
							id: driveFile.id,
							title: finalFilename
						},
						shareMode: 'VIEW'
					}
				}
			]
		});

		console.log(
			`[Export to Classroom] Created material ${material.id} in course ${course.google_course_id} for teacher ${user.id}`
		);

		return json({
			success: true,
			materialId: material.id,
			alternateLink: material.alternateLink,
			driveFileId: driveFile.id,
			courseName: course.name
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle specific Google API errors with user-friendly French messages
		if (err instanceof Error) {
			if (err.message.includes('No Google integration')) {
				throw error(
					401,
					'Compte Google non connecté. Veuillez vous connecter dans les Paramètres.'
				);
			}
			if (err.message.includes('Token expired') || err.message.includes('401')) {
				throw error(401, 'Session Google expirée. Veuillez reconnecter votre compte Google.');
			}
			if (err.message.includes('403') || err.message.includes('Insufficient')) {
				throw error(
					403,
					'Permissions insuffisantes. Veuillez reconnecter votre compte avec les accès Classroom.'
				);
			}
		}

		// Log detailed error server-side only
		console.error('[Export to Classroom] Internal error:', err);
		// Return generic error to client (no internal details)
		throw error(500, "Une erreur est survenue lors de l'export. Veuillez réessayer.");
	}
};
