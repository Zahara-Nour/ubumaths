/**
 * Send Welcome Email API
 * ======================
 *
 * Endpoint: POST /api/teacher/send-welcome-email
 * Purpose: Send a welcome email to a student via the teacher's Gmail account
 *
 * Why Gmail API (not Brevo):
 * - School email addresses (@ecole.fr) often block external emails
 * - Sending from teacher's Gmail ensures delivery to student school accounts
 * - Teacher appears as sender, improving trust and deliverability
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID
 * - Verifies teacher teaches the student
 * - Requires Gmail scope in Google integration
 * - Refreshes token if expired
 *
 * Flow:
 * 1. Validate input with Zod
 * 2. Verify teacher role
 * 3. Verify teacher-student relationship
 * 4. Fetch student info (email, firstname)
 * 5. Fetch Google integration with gmail.send scope
 * 6. Refresh token if needed
 * 7. Decrypt token and send email
 * 8. Record in welcome_emails_sent
 * 9. Return success/error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { sendWelcomeEmail } from '$lib/server/google/gmail';
import { decryptToken, encryptToken } from '$lib/server/google/encryption';
import { refreshAccessToken, shouldRefreshToken } from '$lib/server/google/oauth';

/**
 * Request body schema
 */
const requestSchema = z.object({
	student_id: z.string().uuid('ID eleve invalide')
});

/**
 * Gmail send scope required for this endpoint
 */
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const POST: RequestHandler = async ({ request, locals }) => {
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

	// 5. Fetch Google integration
	const { data: integration, error: integrationError } = await supabase
		.from('google_integrations')
		.select('id, access_token, refresh_token, token_expiry, scopes, google_email')
		.eq('teacher_id', user.id)
		.single();

	if (integrationError || !integration) {
		console.error('[Send Welcome Email] No Google integration found:', integrationError);
		throw error(
			400,
			"Google Classroom n'est pas connecte. Connectez votre compte dans les parametres."
		);
	}

	// 6. Verify Gmail scope is present
	if (!integration.scopes?.includes(GMAIL_SEND_SCOPE)) {
		throw error(
			400,
			"L'acces Gmail n'est pas autorise. Veuillez reconnecter votre compte Google pour activer l'envoi d'emails."
		);
	}

	// 7. Get access token (refresh if needed)
	let accessToken: string;

	try {
		if (shouldRefreshToken(integration.token_expiry)) {
			console.log(`[Send Welcome Email] Refreshing token for teacher ${user.id}`);

			// Decrypt refresh token
			const decryptedRefreshToken = decryptToken(integration.refresh_token);

			// Refresh the token
			const { access_token: newAccessToken, expires_in } =
				await refreshAccessToken(decryptedRefreshToken);

			// Encrypt and update in database
			const encryptedNewToken = encryptToken(newAccessToken);
			const newExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

			const { error: updateError } = await supabase
				.from('google_integrations')
				.update({
					access_token: encryptedNewToken,
					token_expiry: newExpiry,
					updated_at: new Date().toISOString()
				})
				.eq('id', integration.id);

			if (updateError) {
				console.error('[Send Welcome Email] Failed to update token:', updateError);
				// Continue with new token even if DB update fails
			}

			accessToken = newAccessToken;
		} else {
			// Decrypt existing token
			accessToken = decryptToken(integration.access_token);
		}
	} catch (tokenError) {
		console.error('[Send Welcome Email] Token error:', tokenError);
		throw error(500, "Erreur lors de l'acces au compte Google. Veuillez reconnecter votre compte.");
	}

	// 8. Send welcome email
	const teacherEmail = integration.google_email || profile.email;

	if (!teacherEmail) {
		throw error(500, "Email de l'enseignant non disponible");
	}

	const result = await sendWelcomeEmail(
		accessToken,
		student.email,
		student.firstname || 'eleve',
		teacherEmail
	);

	if (!result.success) {
		console.error('[Send Welcome Email] Gmail API error:', result.error);
		throw error(500, `Echec de l'envoi de l'email: ${result.error}`);
	}

	// 9. Record in welcome_emails_sent
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
