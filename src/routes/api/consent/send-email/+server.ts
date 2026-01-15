/**
 * Send Parental Consent Email API
 * ================================
 *
 * Endpoint: POST /api/consent/send-email
 * Purpose: Send a parental consent request email via the teacher's Gmail account
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID and parent_email format
 * - Verifies teacher teaches the student
 * - Requires Gmail scope in Google integration
 * - Limits to 5 emails per student (RGPD compliance)
 *
 * Flow:
 * 1. Validate input with Zod
 * 2. Verify teacher role
 * 3. Verify teacher-student relationship
 * 4. Fetch student info (name, grade)
 * 5. Create or update parental_consents record
 * 6. Fetch Google integration with gmail.send scope
 * 7. Refresh token if needed
 * 8. Decrypt token and send email
 * 9. Update email_count in parental_consents
 * 10. Return success/error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { sendConsentEmail } from '$lib/server/google/gmail';
import { decryptToken, encryptToken } from '$lib/server/google/encryption';
import { refreshAccessToken, shouldRefreshToken } from '$lib/server/google/oauth';

/**
 * Request body schema
 */
const requestSchema = z.object({
	student_id: z.string().uuid('ID élève invalide'),
	parent_email: z.string().email('Email parent invalide')
});

/**
 * Gmail send scope required for this endpoint
 */
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

/**
 * Maximum emails per student (RGPD limit)
 */
const MAX_EMAILS_PER_STUDENT = 5;

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Verify teacher authentication
	const { user, profile } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// 2. Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = requestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { student_id, parent_email } = validation.data;

	// 3. Verify teacher teaches this student
	const hasAccess = await verifyTeacherStudent(user.id, student_id, supabase);
	if (!hasAccess) {
		throw error(403, "Vous ne pouvez envoyer des emails qu'à vos propres élèves");
	}

	// 4. Fetch student info
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, grade')
		.eq('id', student_id)
		.single();

	if (studentError || !student) {
		console.error('[Send Consent Email] Error fetching student:', studentError);
		throw error(404, 'Élève non trouvé');
	}

	// 5. Get school name from class membership
	const { data: classInfo } = await supabase
		.from('class_members')
		.select('classes(schools(name))')
		.eq('student_id', student_id)
		.limit(1)
		.single();

	const schoolName = (classInfo?.classes as { schools?: { name?: string } })?.schools?.name ?? null;

	// 6. Check total emails sent for this student (across ALL consent records)
	const { data: allConsents } = await supabase
		.from('parental_consents')
		.select('email_count')
		.eq('student_id', student_id);

	const totalEmailsSent = (allConsents || []).reduce((sum, c) => sum + (c.email_count || 0), 0);

	if (totalEmailsSent >= MAX_EMAILS_PER_STUDENT) {
		throw error(
			400,
			`Limite de ${MAX_EMAILS_PER_STUDENT} emails atteinte pour cet élève. Contactez l'administrateur.`
		);
	}

	// 7. Check existing consent record or create new one
	const { data: existingConsent } = await supabase
		.from('parental_consents')
		.select('id, email_count, status, consent_token, expires_at')
		.eq('student_id', student_id)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	let consentToken: string;
	let expiresAt: Date;

	if (existingConsent && existingConsent.status === 'pending') {
		// Check if token is expired
		if (new Date(existingConsent.expires_at) < new Date()) {
			// Create new consent record with fresh token
			const { data: newConsent, error: insertError } = await supabase
				.from('parental_consents')
				.insert({
					student_id,
					parent_email,
					status: 'pending',
					email_count: 1
				})
				.select('consent_token, expires_at')
				.single();

			if (insertError || !newConsent) {
				console.error('[Send Consent Email] Error creating consent record:', insertError);
				throw error(500, 'Erreur lors de la création de la demande de consentement');
			}

			consentToken = newConsent.consent_token;
			expiresAt = new Date(newConsent.expires_at);
		} else {
			// Use existing token, increment count
			consentToken = existingConsent.consent_token;
			expiresAt = new Date(existingConsent.expires_at);

			// Update email count and parent_email (in case it changed)
			const { error: updateError } = await supabase
				.from('parental_consents')
				.update({
					email_count: existingConsent.email_count + 1,
					parent_email,
					last_email_sent_at: new Date().toISOString()
				})
				.eq('id', existingConsent.id);

			if (updateError) {
				console.error('[Send Consent Email] Error updating consent record:', updateError);
			}
		}
	} else {
		// Create new consent record
		const { data: newConsent, error: insertError } = await supabase
			.from('parental_consents')
			.insert({
				student_id,
				parent_email,
				status: 'pending',
				email_count: 1
			})
			.select('consent_token, expires_at')
			.single();

		if (insertError || !newConsent) {
			console.error('[Send Consent Email] Error creating consent record:', insertError);
			throw error(500, 'Erreur lors de la création de la demande de consentement');
		}

		consentToken = newConsent.consent_token;
		expiresAt = new Date(newConsent.expires_at);
	}

	// 7. Fetch Google integration
	const { data: integration, error: integrationError } = await supabase
		.from('google_integrations')
		.select('id, access_token, refresh_token, token_expiry, scopes, google_email')
		.eq('teacher_id', user.id)
		.single();

	if (integrationError || !integration) {
		console.error('[Send Consent Email] No Google integration found:', integrationError);
		throw error(
			400,
			"Google Classroom n'est pas connecté. Connectez votre compte dans les paramètres."
		);
	}

	// 8. Verify Gmail scope is present
	if (!integration.scopes?.includes(GMAIL_SEND_SCOPE)) {
		throw error(
			400,
			"L'accès Gmail n'est pas autorisé. Veuillez reconnecter votre compte Google pour activer l'envoi d'emails."
		);
	}

	// 9. Get access token (refresh if needed)
	let accessToken: string;

	try {
		if (shouldRefreshToken(integration.token_expiry)) {
			console.log(`[Send Consent Email] Refreshing token for teacher ${user.id}`);

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
				console.error('[Send Consent Email] Failed to update token:', updateError);
			}

			accessToken = newAccessToken;
		} else {
			// Decrypt existing token
			accessToken = decryptToken(integration.access_token);
		}
	} catch (tokenError) {
		console.error('[Send Consent Email] Token error:', tokenError);
		throw error(500, "Erreur lors de l'accès au compte Google. Veuillez reconnecter votre compte.");
	}

	// 10. Send consent email
	const teacherEmail = integration.google_email || profile.email;
	const teacherName =
		profile.firstname && profile.lastname
			? `${profile.firstname} ${profile.lastname}`
			: profile.firstname || null;

	if (!teacherEmail) {
		throw error(500, "Email de l'enseignant non disponible");
	}

	const result = await sendConsentEmail(accessToken, parent_email, teacherEmail, {
		studentFirstname: student.firstname,
		studentLastname: student.lastname,
		studentGrade: student.grade,
		schoolName,
		teacherName,
		consentToken,
		expiresAt
	});

	if (!result.success) {
		console.error('[Send Consent Email] Gmail API error:', result.error);
		throw error(500, `Échec de l'envoi de l'email: ${result.error}`);
	}

	// Update last_email_sent_at
	await supabase
		.from('parental_consents')
		.update({ last_email_sent_at: new Date().toISOString() })
		.eq('consent_token', consentToken);

	console.log(
		`[Send Consent Email] Email sent successfully to ${parent_email} for student ${student_id} by teacher ${user.id}`
	);

	return json({
		success: true,
		message: 'Email de consentement envoyé avec succès !',
		messageId: result.messageId,
		expiresAt: expiresAt.toISOString()
	});
};
