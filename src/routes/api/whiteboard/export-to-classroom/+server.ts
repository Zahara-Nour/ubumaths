/**
 * Export Whiteboard to Google Classroom Endpoint (V2 - Simplified)
 * =================================================================
 *
 * Endpoint: POST /api/whiteboard/export-to-classroom
 * Purpose: Export a whiteboard PDF to Google Classroom as a CourseWorkMaterial
 *
 * Simplified Flow:
 * 1. Validate inputs (classId, date, pdfBase64)
 * 2. Get class (RLS-scoped: teacher/admin) + google_classroom_course_id
 * 3. Find "Notes de cours" topic for the course
 * 4. Get next export counter from DB (atomic increment)
 * 5. Generate title (French date) and filename
 * 6. Upload PDF to Google Drive
 * 7. Create CourseWorkMaterial in Google Classroom
 * 8. Return links to the created material
 *
 * Security:
 * - Teacher role required
 * - Class access scoped by RLS (mono-teacher: teacher/admin)
 * - PDF content validated (magic bytes)
 * - Google integration with drive.file scope required
 */

import { json, error } from '@sveltejs/kit';
import { assertGoogleClassroomEnabled } from '$lib/server/google/feature-guard';
import type { RequestHandler } from './$types';
import {
	GoogleNotConnectedError,
	GoogleTokenExpiredError,
	GoogleInsufficientPermissionsError
} from '$lib/server/google/errors';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { GoogleDriveClient } from '$lib/server/google/drive-api';
import { GoogleClassroomClient } from '$lib/server/google/classroom-api';
import { getTeacherAccessToken } from '$lib/server/google/sync';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/whiteboard/export-to-classroom/+server');

/**
 * Request body schema - Simplified
 * - pdfBase64: PDF file encoded as base64 (max ~5MB after encoding)
 * - classId: Internal class UUID (from classes table)
 * - date: Export date in YYYY-MM-DD format
 */
const exportToClassroomRequestSchema = z.object({
	pdfBase64: z
		.string()
		.min(100, 'Données PDF vides ou invalides')
		.max(5_000_000, 'Fichier PDF trop lourd (3 Mo au maximum)'),
	classId: z.string().uuid('Identifiant de classe invalide'),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')
});

/**
 * Generate French date title (e.g., "12 janvier 2026")
 */
function generateFrenchTitle(dateString: string): string {
	const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
	return date.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Generate filename (e.g., "6AWB - 2026-01-12 - 01.pdf")
 */
function generateFilename(joinCode: string, date: string, counter: number): string {
	const paddedCounter = counter.toString().padStart(2, '0');
	return `${joinCode} - ${date} - ${paddedCounter}.pdf`;
}

/**
 * Export whiteboard PDF to Google Classroom
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	assertGoogleClassroomEnabled();

	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch (err) {
		logger.error('[Export to Classroom] Invalid JSON body:', err);
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = exportToClassroomRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { pdfBase64, classId, date } = validation.data;

	try {
		// Step 1: Get class (RLS-scoped: teacher/admin) + google_classroom_course_id
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select(
				`
				id,
				name,
				join_code,
				google_classroom_course_id,
				google_classroom_courses!classes_google_classroom_course_id_fkey (
					id,
					google_course_id,
					name,
					course_state
				)
			`
			)
			.eq('id', classId)
			.single();

		if (classError) {
			if (classError.code === 'PGRST116') {
				throw error(404, 'Classe introuvable ou accès refusé');
			}
			logger.error('[Export to Classroom] Class lookup error:', classError);
			throw error(500, 'Impossible de vérifier la classe');
		}

		// Step 2: Verify class has a Google Classroom course associated
		if (!classData.google_classroom_course_id) {
			throw error(
				400,
				'Cette classe n’est associée à aucun cours Classroom. Associer d’abord un cours dans Mes Classes.'
			);
		}

		const course = classData.google_classroom_courses;
		if (!course || (Array.isArray(course) && course.length === 0)) {
			throw error(400, 'Cours Classroom associé introuvable');
		}

		// Handle both single object and array (Supabase may return either)
		const courseData = Array.isArray(course) ? course[0] : course;

		if (courseData.course_state !== 'ACTIVE') {
			throw error(400, 'Le cours Classroom est archivé ou inactif');
		}

		// Step 3: Find "Notes de cours" topic
		const { data: topic, error: topicError } = await locals.supabase
			.from('google_classroom_topics')
			.select('id, google_topic_id')
			.eq('google_course_id', courseData.id)
			.eq('name', 'Notes de cours')
			.single();

		if (topicError || !topic) {
			throw error(
				400,
				`Le thème « Notes de cours » n’existe pas dans le cours Classroom « ${courseData.name} ». Le créer d’abord dans Google Classroom.`
			);
		}

		// Step 4: Get next export counter (atomic increment)
		const { data: counter, error: counterError } = await locals.supabase.rpc(
			'get_next_export_counter',
			{
				p_class_id: classId,
				p_export_date: date
			}
		);

		if (counterError) {
			logger.error('[Export to Classroom] Counter error:', counterError);
			throw error(500, 'Impossible de numéroter l’export');
		}

		if (counter === null || counter === undefined) {
			logger.error('[Export to Classroom] Counter is null/undefined');
			throw error(500, 'Compteur d’export invalide');
		}

		// Step 5: Generate title and filename
		const title = generateFrenchTitle(date);
		const filename = generateFilename(classData.join_code, date, counter);
		logger.info(`[Export to Classroom] Generated filename: ${filename} (counter: ${counter})`);

		// Step 6: Get access token and initialize clients
		const accessToken = await getTeacherAccessToken(user.id, locals.supabase);
		const driveClient = new GoogleDriveClient(accessToken);
		const classroomClient = new GoogleClassroomClient(accessToken, user.id);

		// Validate and extract base64 PDF content
		let pdfBase64Content: string;
		try {
			// Remove data URL prefix if present (data:application/pdf;base64,)
			pdfBase64Content = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

			// Validate by decoding a small portion to check PDF magic bytes
			const testDecode = atob(pdfBase64Content.slice(0, 20));
			if (!testDecode.startsWith('%PDF-')) {
				throw error(400, 'Fichier invalide : ce n’est pas un PDF');
			}
		} catch (err) {
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			logger.error('[Export to Classroom] Base64 validation error:', err);
			throw error(400, 'Données PDF invalides : encodage base64 incorrect');
		}

		// Get or create the app folder in Google Drive
		const folderId = await driveClient.getOrCreateAppFolder();

		// Step 7: Upload PDF to Google Drive
		const driveFile = await driveClient.createFile({
			name: filename,
			content: pdfBase64Content,
			mimeType: 'application/pdf',
			folderId,
			description: `Notes de cours - ${classData.name} - ${title}`,
			isBase64: true
		});

		logger.info(
			`[Export to Classroom] Uploaded PDF ${driveFile.id} (${filename}) for teacher ${user.id}`
		);

		// Step 8: Create CourseWorkMaterial in Google Classroom
		// Note: Google Classroom API doesn't allow adding materials to existing CourseWorkMaterials,
		// so each export creates a new entry. To group by date, we use a consistent title.
		const material = await classroomClient.createCourseWorkMaterial(courseData.google_course_id, {
			title,
			topicId: topic.google_topic_id,
			state: 'PUBLISHED',
			materials: [
				{
					driveFile: {
						driveFile: {
							id: driveFile.id,
							title: filename
						},
						shareMode: 'VIEW'
					}
				}
			]
		});

		logger.info(
			`[Export to Classroom] Created material ${material.id} in course ${courseData.google_course_id} for class ${classData.name}`
		);

		return json({
			success: true,
			materialId: material.id,
			alternateLink: material.alternateLink,
			driveFileId: driveFile.id,
			className: classData.name,
			filename
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle specific Google API errors with user-friendly French messages
		if (err instanceof Error) {
			if (err instanceof GoogleNotConnectedError) {
				throw error(401, 'Compte Google non connecté : à connecter dans les Paramètres');
			}
			if (err instanceof GoogleTokenExpiredError || err.message.includes('401')) {
				throw error(401, 'Session Google expirée : reconnecter le compte Google');
			}
			if (err instanceof GoogleInsufficientPermissionsError || err.message.includes('403')) {
				throw error(
					403,
					'Droits insuffisants : reconnecter le compte Google avec l’accès à Classroom'
				);
			}
		}

		// Log detailed error server-side only
		logger.error('[Export to Classroom] Internal error:', err);
		// Return generic error to client (no internal details)
		throw error(500, 'Impossible d’exporter vers Google Classroom');
	}
};
