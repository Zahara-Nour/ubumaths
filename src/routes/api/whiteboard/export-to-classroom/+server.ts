/**
 * Export Whiteboard to Google Classroom Endpoint (V2 - Simplified)
 * =================================================================
 *
 * Endpoint: POST /api/whiteboard/export-to-classroom
 * Purpose: Export a whiteboard PDF to Google Classroom as a CourseWorkMaterial
 *
 * Simplified Flow:
 * 1. Validate inputs (classId, date, pdfBase64)
 * 2. Get class and verify ownership + google_classroom_course_id
 * 3. Find "Notes de cours" topic for the course
 * 4. Get next export counter from DB (atomic increment)
 * 5. Generate title (French date) and filename
 * 6. Upload PDF to Google Drive
 * 7. Create CourseWorkMaterial in Google Classroom
 * 8. Return links to the created material
 *
 * Security:
 * - Teacher role required
 * - Class ownership verified
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
 * Request body schema - Simplified
 * - pdfBase64: PDF file encoded as base64 (max ~5MB after encoding)
 * - classId: Internal class UUID (from classes table)
 * - date: Export date in YYYY-MM-DD format
 */
const exportToClassroomRequestSchema = z.object({
	pdfBase64: z
		.string()
		.min(100, 'PDF data appears to be invalid or empty')
		.max(5_000_000, 'PDF file is too large (max 3MB)'),
	classId: z.string().uuid('Invalid class ID'),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
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

	const { pdfBase64, classId, date } = validation.data;

	try {
		// Step 1: Get class and verify ownership + google_classroom_course_id
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
			.eq('teacher_id', user.id)
			.single();

		if (classError) {
			if (classError.code === 'PGRST116') {
				throw error(404, 'Classe introuvable ou accès refusé');
			}
			console.error('[Export to Classroom] Class lookup error:', classError);
			throw error(500, 'Échec de la vérification de la classe');
		}

		// Step 2: Verify class has a Google Classroom course associated
		if (!classData.google_classroom_course_id) {
			throw error(
				400,
				"Cette classe n'est pas associée à un cours Google Classroom. Associez d'abord un cours dans Mes Classes."
			);
		}

		const course = classData.google_classroom_courses;
		if (!course || (Array.isArray(course) && course.length === 0)) {
			throw error(400, 'Le cours Google Classroom associé est introuvable.');
		}

		// Handle both single object and array (Supabase may return either)
		const courseData = Array.isArray(course) ? course[0] : course;

		if (courseData.course_state !== 'ACTIVE') {
			throw error(400, 'Le cours Google Classroom est archivé ou inactif.');
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
				`Le topic "Notes de cours" n'existe pas dans le cours "${courseData.name}". Créez-le d'abord dans Google Classroom.`
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
			console.error('[Export to Classroom] Counter error:', counterError);
			throw error(500, "Erreur lors de la génération du numéro d'export");
		}

		if (counter === null || counter === undefined) {
			console.error('[Export to Classroom] Counter is null/undefined');
			throw error(500, "Erreur: compteur d'export invalide");
		}

		// Step 5: Generate title and filename
		const title = generateFrenchTitle(date);
		const filename = generateFilename(classData.join_code, date, counter);
		console.log(`[Export to Classroom] Generated filename: ${filename} (counter: ${counter})`);

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
				throw error(400, 'Fichier invalide: le contenu ne semble pas être un PDF');
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

		// Step 7: Upload PDF to Google Drive
		const driveFile = await driveClient.createFile({
			name: filename,
			content: pdfBase64Content,
			mimeType: 'application/pdf',
			folderId,
			description: `Notes de cours - ${classData.name} - ${title}`,
			isBase64: true
		});

		console.log(
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

		console.log(
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
