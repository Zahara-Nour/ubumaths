/**
 * Brevo Email Service
 * ===================
 *
 * Transactional email service using Brevo (ex-Sendinblue).
 * Replaces Gmail API for sending emails, improving RGPD compliance
 * by removing the gmail.send scope from Google OAuth.
 *
 * Benefits:
 * - French company, RGPD compliant by default
 * - 300 emails/day free tier
 * - No need for user's Gmail credentials
 * - Consistent sender address (noreply@ubumaths.fr)
 *
 * Environment variables required:
 * - BREVO_API_KEY: API key from Brevo dashboard
 * - BREVO_SENDER_EMAIL: Verified sender email (e.g., noreply@ubumaths.fr)
 * - BREVO_SENDER_NAME: Sender display name (e.g., Chiphre)
 *
 * Sur la base locale, rien ne part : les courriels sont capturés dans un
 * dossier (voir `capture.ts`, `EMAIL_ENVOI_REEL=1` pour envoyer quand même).
 */

import { BrevoClient, BrevoError, BrevoTimeoutError } from '@getbrevo/brevo';
import * as env from '$app/env/private';
import { createServerLogger } from '#lib/utils/logger.ts';
import { isChildAccountEmail } from '#lib/utils/child-account.ts';
import { captureEmail, isEmailCaptureActive } from './capture';
import type { ChildRegistrationEmailData } from '#lib/email-templates/child-registration.ts';
import type { ChildPasswordResetEmailData } from '#lib/email-templates/child-password-reset.ts';
import type { PrivateLessonInvitationEmailData } from '#lib/email-templates/private-lesson-invitation.ts';
import type { PrivateLessonWelcomeEmailData } from '#lib/email-templates/private-lesson-welcome.ts';
import type {
	CarnetConfirmationEmailData,
	CarnetExceptionEmailData,
	CarnetLinkEmailData,
	CarnetQuarterlyEmailData
} from '#lib/email-templates/carnet.ts';

const logger = createServerLogger('server/email/brevo');

/**
 * Email send result interface (compatible with existing Gmail interface)
 */
export interface EmailSendResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Client Brevo, créé au premier envoi
 */
let client: BrevoClient | null = null;

/**
 * Get or create Brevo API client
 *
 * `maxRetries: 0` : la bibliothèque réessaie sinon d'elle-même sur une réponse
 * 408, 429 ou 5xx, alors que Brevo a pu envoyer le courriel ; le parent
 * recevrait deux fois le même lien. Un échec reste un échec.
 */
function getBrevoClient(): BrevoClient {
	if (!client) {
		const apiKey = env.BREVO_API_KEY;
		if (!apiKey) {
			throw new Error('BREVO_API_KEY environment variable is not set');
		}

		client = new BrevoClient({ apiKey, maxRetries: 0 });
	}
	return client;
}

/**
 * Get sender configuration from environment
 */
function getSenderConfig(): { email: string; name: string } {
	const email = env.BREVO_SENDER_EMAIL || 'noreply@ubumaths.fr';
	const name = env.BREVO_SENDER_NAME || 'Chiphre';
	return { email, name };
}

/**
 * Send an email via Brevo
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - HTML body content
 * @param textContent - Plain text body content (optional, for email clients that don't support HTML)
 * @param replyTo - Optional reply-to email address
 * @returns Email send result
 */
export async function sendEmail(
	to: string,
	subject: string,
	htmlContent: string,
	textContent?: string,
	replyTo?: string,
	headers?: Record<string, string>
): Promise<EmailSendResult> {
	// L'adresse d'un enfant inscrit par son parent est fictive : rien ne doit y partir.
	if (isChildAccountEmail(to)) {
		logger.warn('[Brevo] Envoi refusé : adresse du domaine fictif');
		return { success: false, error: 'Adresse fictive : aucun courriel envoyé' };
	}

	// Base locale : le courriel est écrit dans un dossier, rien ne part (capture.ts).
	if (isEmailCaptureActive()) {
		try {
			const captured = await captureEmail({
				to,
				subject,
				html: htmlContent,
				text: textContent,
				headers
			});
			logger.info(`[Courriel capturé] ${captured.file}`);
			return { success: true, messageId: `capture:${captured.file}` };
		} catch (error) {
			logger.error(
				'[Courriel] Capture impossible :',
				error instanceof Error ? error.message : 'erreur inconnue'
			);
			return { success: false, error: 'Capture du courriel impossible' };
		}
	}

	try {
		const brevo = getBrevoClient();
		const sender = getSenderConfig();

		const response = await brevo.transactionalEmails.sendTransacEmail({
			sender: { email: sender.email, name: sender.name },
			to: [{ email: to }],
			subject,
			htmlContent,
			...(textContent ? { textContent } : {}),
			...(replyTo ? { replyTo: { email: replyTo } } : {}),
			...(headers ? { headers } : {})
		});

		return {
			success: true,
			messageId: response.messageId
		};
	} catch (error) {
		const description = describeBrevoError(error);
		logger.error('[Brevo] Email send error:', description);
		return { success: false, error: description };
	}
}

/**
 * Texte d'un échec d'envoi, journalisé et parfois montré au professeur. Rien de
 * l'objet d'erreur de Brevo n'y passe tel quel : sa réponse peut citer l'adresse
 * du destinataire, et sa `cause` la requête (liens à jeton du carnet, du
 * consentement). On ne garde que le statut HTTP et le code court de Brevo.
 */
function describeBrevoError(error: unknown): string {
	if (error instanceof BrevoTimeoutError) {
		return 'Brevo n’a pas répondu à temps';
	}
	if (error instanceof BrevoError) {
		if (error.statusCode === undefined) {
			return 'Brevo injoignable';
		}
		const body: unknown = error.body;
		const code =
			typeof body === 'object' &&
			body !== null &&
			'code' in body &&
			typeof body.code === 'string' &&
			/^[a-z_]{1,64}$/.test(body.code)
				? `, ${body.code}`
				: '';
		return `Envoi refusé par Brevo (statut ${error.statusCode}${code})`;
	}
	return 'Erreur inconnue à l’envoi du courriel';
}

/**
 * Send a welcome email to a student
 *
 * @param toEmail - Student's email address
 * @param studentFirstname - Student's first name for personalization
 * @param replyToEmail - Optional teacher's email for reply-to
 * @returns Email send result
 */
export async function sendWelcomeEmail(
	toEmail: string,
	studentFirstname: string,
	replyToEmail?: string
): Promise<EmailSendResult> {
	const { WELCOME_EMAIL_SUBJECT, getWelcomeEmailHtml, getWelcomeEmailText } =
		await import('#lib/email-templates/welcome.ts');

	return sendEmail(
		toEmail,
		WELCOME_EMAIL_SUBJECT,
		getWelcomeEmailHtml(studentFirstname),
		getWelcomeEmailText(studentFirstname),
		replyToEmail
	);
}

/**
 * Send a parental consent request email
 *
 * @param toEmail - Parent's email address
 * @param data - Consent email data (student info, token, etc.)
 * @param replyToEmail - Optional teacher's email for reply-to
 * @returns Email send result
 */
export async function sendConsentEmail(
	toEmail: string,
	data: {
		studentFirstname: string | null;
		studentLastname: string | null;
		studentGrade: string | null;
		schoolName: string | null;
		teacherName: string | null;
		consentToken: string;
		expiresAt: Date;
	},
	replyToEmail?: string
): Promise<EmailSendResult> {
	const { CONSENT_EMAIL_SUBJECT, getConsentEmailHtml, getConsentEmailText } =
		await import('#lib/email-templates/parental-consent.ts');

	return sendEmail(
		toEmail,
		CONSENT_EMAIL_SUBJECT,
		getConsentEmailHtml(data),
		getConsentEmailText(data),
		replyToEmail
	);
}

/**
 * Courriel au parent qui vient d'inscrire son enfant : identifiant + lien unique
 * (consentement ou confirmation d'adresse).
 */
export async function sendChildRegistrationEmail(
	toEmail: string,
	data: ChildRegistrationEmailData
): Promise<EmailSendResult> {
	const {
		getChildRegistrationSubject,
		getChildRegistrationEmailHtml,
		getChildRegistrationEmailText
	} = await import('#lib/email-templates/child-registration.ts');

	return sendEmail(
		toEmail,
		getChildRegistrationSubject(data),
		getChildRegistrationEmailHtml(data),
		getChildRegistrationEmailText(data)
	);
}

/**
 * Courriel au parent : lien pour choisir le nouveau mot de passe de son enfant. Toujours à
 * l'adresse du parent, jamais à celle (fictive) de l'enfant : `sendEmail` le refuserait.
 */
export async function sendChildPasswordResetEmail(
	toEmail: string,
	data: ChildPasswordResetEmailData
): Promise<EmailSendResult> {
	const {
		getChildPasswordResetSubject,
		getChildPasswordResetEmailHtml,
		getChildPasswordResetEmailText
	} = await import('#lib/email-templates/child-password-reset.ts');

	return sendEmail(
		toEmail,
		getChildPasswordResetSubject(data),
		getChildPasswordResetEmailHtml(data),
		getChildPasswordResetEmailText(data)
	);
}

/**
 * Courriel au parent invité en cours particulier : le lien qui crée l'espace de l'enfant
 * (chantier `invitation-cours-particulier`).
 */
export async function sendPrivateLessonInvitationEmail(
	toEmail: string,
	data: PrivateLessonInvitationEmailData
): Promise<EmailSendResult> {
	const {
		getPrivateLessonInvitationSubject,
		getPrivateLessonInvitationEmailHtml,
		getPrivateLessonInvitationEmailText
	} = await import('#lib/email-templates/private-lesson-invitation.ts');

	return sendEmail(
		toEmail,
		getPrivateLessonInvitationSubject(data),
		getPrivateLessonInvitationEmailHtml(data),
		getPrivateLessonInvitationEmailText(data)
	);
}

/**
 * Courriel final au parent invité en cours particulier : identifiant et adresse de
 * connexion de l'espace qu'il vient de créer (chantier `invitation-cours-particulier`).
 */
export async function sendPrivateLessonWelcomeEmail(
	toEmail: string,
	data: PrivateLessonWelcomeEmailData
): Promise<EmailSendResult> {
	const {
		getPrivateLessonWelcomeSubject,
		getPrivateLessonWelcomeEmailHtml,
		getPrivateLessonWelcomeEmailText
	} = await import('#lib/email-templates/private-lesson-welcome.ts');

	return sendEmail(
		toEmail,
		getPrivateLessonWelcomeSubject(data),
		getPrivateLessonWelcomeEmailHtml(data),
		getPrivateLessonWelcomeEmailText(data)
	);
}

/** Carnet de liaison : confirmation d'une adresse saisie (A2, Q18). */
export async function sendCarnetConfirmationEmail(
	toEmail: string,
	data: CarnetConfirmationEmailData
): Promise<EmailSendResult> {
	const {
		getCarnetConfirmationSubject,
		getCarnetConfirmationEmailHtml,
		getCarnetConfirmationEmailText
	} = await import('#lib/email-templates/carnet.ts');

	return sendEmail(
		toEmail,
		getCarnetConfirmationSubject(data),
		getCarnetConfirmationEmailHtml(data),
		getCarnetConfirmationEmailText(data)
	);
}

/** Carnet de liaison : le lien du carnet, vers une adresse confirmée seulement (A1, Q26). */
export async function sendCarnetLinkEmail(
	toEmail: string,
	data: CarnetLinkEmailData
): Promise<EmailSendResult> {
	const { getCarnetLinkSubject, getCarnetLinkEmailHtml, getCarnetLinkEmailText } =
		await import('#lib/email-templates/carnet.ts');

	return sendEmail(
		toEmail,
		getCarnetLinkSubject(data),
		getCarnetLinkEmailHtml(data),
		getCarnetLinkEmailText(data)
	);
}

/**
 * En-tête `List-Unsubscribe` des courriels du carnet (E5) : la messagerie
 * propose « Se désabonner », qui ouvre le bas du carnet (bouton « Ne plus
 * recevoir »). Pas de `List-Unsubscribe-Post` : SvelteKit refuse, avant tout
 * hook, un POST de formulaire sans en-tête `Origin` de notre site (le clic
 * « un seul geste » des messageries).
 */
function carnetUnsubscribeHeaders(stopLink: string): Record<string, string> {
	return { 'List-Unsubscribe': `<${stopLink}>` };
}

/** Carnet de liaison : courriel d'exception, vers une adresse confirmée (E1, E5, Q38). */
export async function sendCarnetExceptionEmail(
	toEmail: string,
	data: CarnetExceptionEmailData
): Promise<EmailSendResult> {
	const {
		getCarnetExceptionSubject,
		getCarnetExceptionEmailHtml,
		getCarnetExceptionEmailText,
		getCarnetStopLink
	} = await import('#lib/email-templates/carnet.ts');

	return sendEmail(
		toEmail,
		getCarnetExceptionSubject(data),
		getCarnetExceptionEmailHtml(data),
		getCarnetExceptionEmailText(data),
		undefined,
		carnetUnsubscribeHeaders(getCarnetStopLink(data.token))
	);
}

/** Carnet de liaison : message de fin de trimestre (E4, Q34). */
export async function sendCarnetQuarterlyEmail(
	toEmail: string,
	data: CarnetQuarterlyEmailData
): Promise<EmailSendResult> {
	const {
		getCarnetQuarterlySubject,
		getCarnetQuarterlyEmailHtml,
		getCarnetQuarterlyEmailText,
		getCarnetStopLink
	} = await import('#lib/email-templates/carnet.ts');

	return sendEmail(
		toEmail,
		getCarnetQuarterlySubject(data),
		getCarnetQuarterlyEmailHtml(data),
		getCarnetQuarterlyEmailText(data),
		undefined,
		carnetUnsubscribeHeaders(getCarnetStopLink(data.token))
	);
}

/**
 * Check if Brevo is properly configured
 * Useful for graceful degradation or admin checks
 */
export function isBrevoConfigured(): boolean {
	// En local, la capture tient lieu de service : les pages d'envoi restent utilisables.
	return !!env.BREVO_API_KEY || isEmailCaptureActive();
}
