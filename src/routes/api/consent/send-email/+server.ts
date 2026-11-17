/**
 * Send Parental Consent Email API
 * ================================
 *
 * Endpoint: POST /api/consent/send-email
 * Purpose: Send a parental consent request email via Brevo
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID and parent_email format
 * - Verifies teacher teaches the student
 * - Limits to 5 emails per student (RGPD compliance)
 *
 * Flow:
 * 1. Validate input with Zod
 * 2. Verify teacher role
 * 3. Verify teacher-student relationship
 * 4. Fetch student info (name, grade)
 * 5. Create or update parental_consents record
 * 6. Send email via Brevo
 * 7. Reserve one send in email_count (conditional update), released if Brevo
 *    refuses the send: a failed send must not eat into the quota
 * 8. Return success/error
 *
 * Migration note (2026-01-16):
 * - Migrated from Gmail API to Brevo for RGPD compliance
 * - Removes need for gmail.send OAuth scope
 * - Emails now sent from noreply@ubumaths.fr
 */

import { json, error } from '@sveltejs/kit';
import {
	closePendingConsentRequest,
	consentRequestPlan
} from '$lib/server/parental-consent-requests';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { sendConsentEmail, isBrevoConfigured } from '$lib/server/email/brevo';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/consent/send-email/+server');

/**
 * Request body schema
 */
const requestSchema = z.object({
	student_id: z.string().uuid('ID élève invalide'),
	parent_email: z.string().email('Email parent invalide')
});

/**
 * Maximum emails per student (RGPD limit)
 */
const MAX_EMAILS_PER_STUDENT = 5;

export const POST: RequestHandler = async ({ request, locals }) => {
	// 0. Check Brevo configuration
	if (!isBrevoConfigured()) {
		throw error(
			503,
			"Le service d'envoi d'emails n'est pas configuré. Voir avec l'administrateur."
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
		throw error(403, "Envoi d'emails réservé aux élèves du professeur");
	}

	// 4. Fetch student info
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, grade')
		.eq('id', student_id)
		.single();

	if (studentError || !student) {
		logger.error('[Send Consent Email] Error fetching student:', studentError);
		throw error(404, 'Élève non trouvé');
	}

	// 5. Get school name from class membership
	const { data: classInfo, error: classInfoError } = await supabase
		.from('class_members')
		.select('classes(schools(name))')
		.eq('student_id', student_id)
		// ⚠️ Ce nom part dans un courriel aux parents. Une adhésion archivée le
		// ferait signer par l'ancienne école. Tranché par David le 2026-09-15 :
		// sans classe active, le courriel part sans nom d'école.
		.eq('status', 'active')
		.limit(1)
		.single();

	// Le nom de l'école n'est qu'un ornement du courriel ; PGRST116 signifie
	// « élève hors classe », cas normal.
	if (classInfoError && classInfoError.code !== 'PGRST116') {
		logger.error('[Send Consent Email] École illisible :', classInfoError);
	}

	const schoolName = (classInfo?.classes as { schools?: { name?: string } })?.schools?.name ?? null;

	// 6. Check total emails sent for this student (across ALL consent records)
	const { data: allConsents, error: allConsentsError } = await supabase
		.from('parental_consents')
		.select('email_count')
		.eq('student_id', student_id);

	// ⚠️ Ce décompte borne un quota. Une panne le ramenait à zéro, donc à
	// « quota intact » : la limite sautait aussi souvent que la requête échouait.
	if (allConsentsError) {
		logger.error('Quota illisible :', allConsentsError);
		throw error(500, 'Impossible de vérifier le quota');
	}

	const totalEmailsSent = (allConsents || []).reduce((sum, c) => sum + (c.email_count || 0), 0);

	if (totalEmailsSent >= MAX_EMAILS_PER_STUDENT) {
		throw error(
			400,
			`Limite de ${MAX_EMAILS_PER_STUDENT} emails atteinte pour cet élève. Voir avec l'administrateur.`
		);
	}

	// 7. Check existing consent record or create new one
	const { data: existingConsent, error: existingConsentError } = await supabase
		.from('parental_consents')
		.select('id, email_count, status, consent_token, expires_at, parent_email')
		.eq('student_id', student_id)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingConsentError && existingConsentError.code !== 'PGRST116') {
		logger.error('Lecture impossible :', existingConsentError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

	let consentToken: string;
	let expiresAt: Date;
	// Envois déjà comptés sur la demande utilisée (une panne de Brevo mangeait le
	// quota quand le compteur avançait sans retour arrière, 2026-11-11).
	let sentBefore: number;

	// Le même lien ne repart que vers la même adresse : envoyé ailleurs, le lien déjà reçu
	// par l'ancienne adresse accorderait la demande à la nouvelle, que personne n'a
	// confirmée (contre-revue de la PR 3). Autre adresse → ancienne fermée, jeton neuf.
	const plan = consentRequestPlan(existingConsent, parent_email);

	if (plan === 'replace' && existingConsent) {
		if (!(await closePendingConsentRequest(supabase, existingConsent.id))) {
			throw error(409, 'La demande précédente n’a pas pu être fermée');
		}
	}

	if (plan === 'reuse' && existingConsent) {
		// Use existing token
		consentToken = existingConsent.consent_token;
		expiresAt = new Date(existingConsent.expires_at);
		sentBefore = existingConsent.email_count;
	} else {
		// Create new consent record
		const { data: newConsent, error: insertError } = await supabase
			.from('parental_consents')
			.insert({
				student_id,
				parent_email,
				status: 'pending',
				email_count: 0
			})
			.select('consent_token, expires_at')
			.single();

		if (insertError || !newConsent) {
			logger.error('[Send Consent Email] Error creating consent record:', insertError);
			throw error(500, 'Erreur lors de la création de la demande de consentement');
		}

		consentToken = newConsent.consent_token;
		expiresAt = new Date(newConsent.expires_at);
		sentBefore = 0;
	}

	// 7 bis. Réserver l'envoi AVANT l'appel à Brevo, sous condition que le compteur
	// n'ait pas bougé : deux requêtes simultanées (double clic) ne passent pas toutes
	// les deux. Zéro ligne rendue (course perdue, ou RLS qui refuse en silence) →
	// rien ne part, sinon l'envoi échapperait au quota.
	const { data: reserved, error: reserveError } = await supabase
		.from('parental_consents')
		.update({ email_count: sentBefore + 1 })
		.eq('consent_token', consentToken)
		.eq('email_count', sentBefore)
		.select('id');

	if (reserveError || !reserved?.length) {
		logger.error('[Send Consent Email] Réservation de l’envoi refusée :', reserveError);
		throw error(409, 'Un envoi est déjà en cours pour cet élève. Réessayer dans un instant.');
	}

	// 8. Get teacher info for reply-to
	const teacherEmail = profile.email;
	const teacherName =
		profile.firstname && profile.lastname
			? `${profile.firstname} ${profile.lastname}`
			: profile.firstname || null;

	// 9. Send consent email via Brevo
	const result = await sendConsentEmail(
		parent_email,
		{
			studentFirstname: student.firstname,
			studentLastname: student.lastname,
			studentGrade: student.grade,
			schoolName,
			teacherName,
			consentToken,
			expiresAt
		},
		teacherEmail // Reply-to teacher's email
	);

	if (!result.success) {
		logger.error('[Send Consent Email] Brevo error:', result.error);
		// Rien n'est parti : la réservation est rendue.
		const { data: released, error: releaseError } = await supabase
			.from('parental_consents')
			.update({ email_count: sentBefore })
			.eq('consent_token', consentToken)
			.eq('email_count', sentBefore + 1)
			.select('id');
		if (releaseError || !released?.length) {
			logger.error('[Send Consent Email] Réservation non rendue :', releaseError);
		}
		throw error(500, `Échec de l'envoi de l'email: ${result.error}`);
	}

	// 10. Update last_email_sent_at (le courriel est parti : une erreur ici est
	// seulement journalisée, un 500 ferait renvoyer)
	const { error: sentAtError } = await supabase
		.from('parental_consents')
		.update({ last_email_sent_at: new Date().toISOString() })
		.eq('consent_token', consentToken);
	if (sentAtError) {
		logger.error('[Send Consent Email] Date d’envoi non écrite :', sentAtError);
	}

	logger.info(
		`[Send Consent Email] Email sent successfully to ${parent_email} for student ${student_id} by teacher ${user.id}`
	);

	return json({
		success: true,
		message: 'Email de consentement envoyé avec succès !',
		messageId: result.messageId,
		expiresAt: expiresAt.toISOString()
	});
};
