/**
 * Send Welcome Email API
 * ======================
 *
 * Endpoint: POST /api/teacher/send-welcome-email
 * Purpose: Send a welcome email to a student via Brevo (transactional email).
 *
 * Why Brevo (migrated from the Gmail API):
 * - Removes the gmail.send OAuth scope dependency (RGPD: no teacher Gmail token needed).
 * - Consistent with the parental-consent flow, which already uses Brevo.
 * - The email is sent from the verified Brevo sender (authenticated domain); the teacher's
 *   email is set as Reply-To so student replies still reach the teacher.
 *
 * Historical note: welcome emails used to be sent through the teacher's Gmail account
 * (better deliverability to same-domain school inboxes). That path was abandoned once the
 * teacher's Google Workspace account no longer existed; the previous Gmail implementation
 * still lives in $lib/server/google/gmail.ts (see git history).
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID
 * - Verifies teacher teaches the student
 *
 * Flow:
 * 1. Verify teacher role
 * 2. Check the transactional email service (Brevo) is configured
 * 3. Validate input with Zod
 * 4. Verify teacher-student relationship
 * 5. Fetch student info (email, firstname)
 * 6. Send email via Brevo (reply-to = teacher email)
 * 7. Record in welcome_emails_sent
 * 8. Return success/error
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
	// 1. Verify teacher authentication
	const { user, profile } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// 2. Ensure the transactional email service is configured
	if (!isBrevoConfigured()) {
		throw error(
			503,
			"Le service d'envoi d'emails n'est pas configuré. Contactez l'administrateur."
		);
	}

	// 3. Validate request body
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

	// 4. Verify teacher teaches this student
	const hasAccess = await verifyTeacherStudent(user.id, student_id, supabase);
	if (!hasAccess) {
		throw error(403, "Vous ne pouvez envoyer des emails qu'a vos propres eleves");
	}

	// 5. Fetch student info
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, email')
		.eq('id', student_id)
		.single();

	if (studentError || !student) {
		console.error('[Send Welcome Email] Error fetching student:', studentError);
		throw error(404, 'Eleve non trouve');
	}

	if (!student.email) {
		throw error(400, "L'eleve n'a pas d'adresse email configuree");
	}

	// 6. Send welcome email via Brevo. The teacher's email is used as Reply-To so the
	//    student can reply to a real person (the email itself is sent from the Brevo sender).
	const result = await sendWelcomeEmail(
		student.email,
		student.firstname || 'eleve',
		profile.email ?? undefined
	);

	if (!result.success) {
		console.error('[Send Welcome Email] Brevo error:', result.error);
		throw error(500, `Echec de l'envoi de l'email: ${result.error}`);
	}

	// 7. Record in welcome_emails_sent
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
