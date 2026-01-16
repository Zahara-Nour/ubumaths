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
 * - BREVO_SENDER_NAME: Sender display name (e.g., UbuMaths)
 */

import * as Brevo from '@getbrevo/brevo';
import { env } from '$env/dynamic/private';

/**
 * Email send result interface (compatible with existing Gmail interface)
 */
export interface EmailSendResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Brevo API client singleton
 */
let apiInstance: Brevo.TransactionalEmailsApi | null = null;

/**
 * Get or create Brevo API client
 */
function getBrevoClient(): Brevo.TransactionalEmailsApi {
	if (!apiInstance) {
		const apiKey = env.BREVO_API_KEY;
		if (!apiKey) {
			throw new Error('BREVO_API_KEY environment variable is not set');
		}

		apiInstance = new Brevo.TransactionalEmailsApi();
		apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
	}
	return apiInstance;
}

/**
 * Get sender configuration from environment
 */
function getSenderConfig(): { email: string; name: string } {
	const email = env.BREVO_SENDER_EMAIL || 'noreply@ubumaths.fr';
	const name = env.BREVO_SENDER_NAME || 'UbuMaths';
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
	replyTo?: string
): Promise<EmailSendResult> {
	try {
		const client = getBrevoClient();
		const sender = getSenderConfig();

		const sendSmtpEmail = new Brevo.SendSmtpEmail();
		sendSmtpEmail.sender = { email: sender.email, name: sender.name };
		sendSmtpEmail.to = [{ email: to }];
		sendSmtpEmail.subject = subject;
		sendSmtpEmail.htmlContent = htmlContent;

		if (textContent) {
			sendSmtpEmail.textContent = textContent;
		}

		if (replyTo) {
			sendSmtpEmail.replyTo = { email: replyTo };
		}

		const response = await client.sendTransacEmail(sendSmtpEmail);

		return {
			success: true,
			messageId: response.body?.messageId
		};
	} catch (error) {
		console.error('[Brevo] Email send error:', error);

		if (error instanceof Error) {
			return {
				success: false,
				error: error.message
			};
		}

		return {
			success: false,
			error: 'Unknown error occurred while sending email'
		};
	}
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
	const { WELCOME_EMAIL_SUBJECT, getWelcomeEmailHtml, getWelcomeEmailText } = await import(
		'$lib/email-templates/welcome'
	);

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
	const { CONSENT_EMAIL_SUBJECT, getConsentEmailHtml, getConsentEmailText } = await import(
		'$lib/email-templates/parental-consent'
	);

	return sendEmail(
		toEmail,
		CONSENT_EMAIL_SUBJECT,
		getConsentEmailHtml(data),
		getConsentEmailText(data),
		replyToEmail
	);
}

/**
 * Check if Brevo is properly configured
 * Useful for graceful degradation or admin checks
 */
export function isBrevoConfigured(): boolean {
	return !!env.BREVO_API_KEY;
}
