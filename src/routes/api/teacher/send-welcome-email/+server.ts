/**
 * Send Welcome Email API
 * ======================
 *
 * Endpoint: POST /api/teacher/send-welcome-email
 * Purpose: Send a welcome email to a student via Brevo
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID
 * - Verifies teacher teaches the student
 *
 * Flow:
 * 1. Validate input with Zod
 * 2. Verify teacher role
 * 3. Verify teacher-student relationship
 * 4. Fetch student info (email, firstname)
 * 5. Send email via Brevo
 * 6. Record in welcome_emails_sent
 * 7. Return success/error
 *
 * Migration note (2026-01-16):
 * - Migrated from Gmail API to Brevo for RGPD compliance
 * - Removes need for gmail.send OAuth scope
 * - Emails now sent from noreply@ubumaths.fr
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { sendWelcomeEmail, isBrevoConfigured } from '$lib/server/email/brevo';

/**
 * Request body schema
 */
const requestSchema = z.object({
	student_id: z.string().uuid('ID eleve invalide')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// 0. Check Brevo configuration
	if (!isBrevoConfigured()) {
		throw error(
			503,
			"Le service d'envoi d'emails n'est pas configure. Contactez l'administrateur."
		);
	}

	// 1. Verify teacher authentication
	const { user, profile } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// 2. Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = requestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { student_id } = validation.data;

	// 3. Verify teacher teaches this student
	const hasAccess = await verifyTeacherStudent(user.id, student_id, supabase);
	if (!hasAccess) {
		throw error(403, "Vous ne pouvez envoyer des emails qu'a vos propres eleves");
	}

	// 4. Fetch student info
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.eq('id', student_id)
		.single();

	if (studentError || !student) {
		console.error('[Send Welcome Email] Error fetching student:', studentError);
		throw error(404, 'Eleve non trouve');
	}

	if (!student.email) {
		throw error(400, "L'eleve n'a pas d'adresse email configuree");
	}

	// 5. Send welcome email via Brevo
	const teacherEmail = profile.email;

	const result = await sendWelcomeEmail(
		student.email,
		student.firstname || 'eleve',
		teacherEmail // Reply-to teacher's email
	);

	if (!result.success) {
		console.error('[Send Welcome Email] Brevo error:', result.error);
		throw error(500, `Echec de l'envoi de l'email: ${result.error}`);
	}

	// 6. Record in welcome_emails_sent
	try {
		const { error: insertError } = await supabase.from('welcome_emails_sent').insert({
			student_id: student_id,
			sent_by: user.id
		});

		if (insertError) {
			// Log but don't fail - email was sent successfully
			console.error('[Send Welcome Email] Failed to record email sent:', insertError);
		}
	} catch (recordError) {
		// Log but don't fail - email was sent successfully
		console.error('[Send Welcome Email] Error recording email:', recordError);
	}

	console.log(
		`[Send Welcome Email] Email sent successfully to ${student.email} by teacher ${user.id}`
	);

	return json({
		success: true,
		message: 'Email de bienvenue envoye avec succes !',
		messageId: result.messageId
	});
};
