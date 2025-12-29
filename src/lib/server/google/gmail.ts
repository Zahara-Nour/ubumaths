/**
 * Gmail API Utilities
 * Provides methods to send emails via Gmail API v1
 *
 * Features:
 * - Send welcome emails to students
 * - MIME message construction
 * - Base64url encoding
 * - Error handling with Zod validation
 *
 * Reference: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
 */

import { z } from 'zod';
import { googleAPIErrorSchema } from './schemas';
import {
	GoogleAPIError,
	GoogleTokenExpiredError,
	GoogleRateLimitError,
	GoogleInsufficientPermissionsError
} from './errors';

/**
 * Gmail API base URL
 */
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Gmail send response schema
 */
const gmailSendResponseSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	labelIds: z.array(z.string()).optional()
});

/**
 * Email send result interface
 */
export interface EmailSendResult {
	success: boolean;
	messageId?: string;
	threadId?: string;
	error?: string;
}

/**
 * Encode a string to base64url format (RFC 4648)
 * Gmail API requires this specific encoding for raw message content
 *
 * @param str - String to encode
 * @returns Base64url encoded string
 */
function base64urlEncode(str: string): string {
	// Use Buffer for Node.js environment
	const base64 = Buffer.from(str, 'utf-8').toString('base64');
	// Convert to base64url: replace + with -, / with _, remove padding =
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build a MIME message for email sending (HTML format)
 *
 * @param to - Recipient email address
 * @param from - Sender email address
 * @param subject - Email subject
 * @param htmlBody - Email body (HTML)
 * @returns MIME formatted message string
 */
function buildMimeMessage(to: string, from: string, subject: string, htmlBody: string): string {
	// Encode subject for UTF-8 support (RFC 2047)
	const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

	// Build MIME message with proper headers
	const messageParts = [
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${encodedSubject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/html; charset=UTF-8',
		'Content-Transfer-Encoding: base64',
		'',
		Buffer.from(htmlBody, 'utf-8').toString('base64')
	];

	return messageParts.join('\r\n');
}

/**
 * Send an email via Gmail API
 *
 * @param accessToken - Decrypted Google OAuth access token
 * @param to - Recipient email address
 * @param from - Sender email address (teacher's email)
 * @param subject - Email subject
 * @param body - Email body (plain text)
 * @returns Email send result with message ID on success
 */
async function sendEmail(
	accessToken: string,
	to: string,
	from: string,
	subject: string,
	body: string
): Promise<EmailSendResult> {
	// Build MIME message
	const mimeMessage = buildMimeMessage(to, from, subject, body);

	// Encode to base64url
	const encodedMessage = base64urlEncode(mimeMessage);

	try {
		const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				raw: encodedMessage
			})
		});

		// Handle error responses
		if (!response.ok) {
			const errorData = await response.json();
			const errorValidation = googleAPIErrorSchema.safeParse(errorData);

			if (errorValidation.success) {
				const error = errorValidation.data.error;

				switch (response.status) {
					case 401:
						throw new GoogleTokenExpiredError();
					case 403:
						throw new GoogleInsufficientPermissionsError(error.message);
					case 429:
						throw new GoogleRateLimitError();
					default:
						throw new GoogleAPIError(error.message, response.status, error.status);
				}
			}

			throw new GoogleAPIError(
				`Gmail API error: ${response.statusText}`,
				response.status,
				'UNKNOWN_ERROR'
			);
		}

		// Parse successful response
		const data = await response.json();
		const validation = gmailSendResponseSchema.safeParse(data);

		if (!validation.success) {
			throw new GoogleAPIError(
				`Invalid Gmail response: ${validation.error.message}`,
				0,
				'VALIDATION_ERROR'
			);
		}

		return {
			success: true,
			messageId: validation.data.id,
			threadId: validation.data.threadId
		};
	} catch (error) {
		// Re-throw GoogleAPIError instances
		if (error instanceof GoogleAPIError) {
			return {
				success: false,
				error: error.message
			};
		}

		// Handle network errors
		if (error instanceof Error) {
			return {
				success: false,
				error: `Network error: ${error.message}`
			};
		}

		return {
			success: false,
			error: 'Unknown error occurred while sending email'
		};
	}
}

/**
 * Send a welcome email to a student via Gmail API
 *
 * Sends a pre-formatted welcome email informing the student that their
 * UbuMaths account has been activated and they can now log in.
 *
 * @param accessToken - Decrypted Google OAuth access token
 * @param toEmail - Student's email address
 * @param studentFirstname - Student's first name (for personalization)
 * @param fromEmail - Teacher's email address (for the From header)
 * @returns Email send result
 *
 * @example
 * ```typescript
 * const result = await sendWelcomeEmail(
 *   decryptedToken,
 *   'student@school.com',
 *   'Alice',
 *   'teacher@school.com'
 * );
 *
 * if (result.success) {
 *   console.log(`Email sent with ID: ${result.messageId}`);
 * } else {
 *   console.error(`Failed to send email: ${result.error}`);
 * }
 * ```
 */
export async function sendWelcomeEmail(
	accessToken: string,
	toEmail: string,
	studentFirstname: string,
	fromEmail: string
): Promise<EmailSendResult> {
	const subject = 'Bienvenue sur UbuMaths !';

	const siteUrl = 'https://ubumaths-6op8.vercel.app/';
	const greeting = studentFirstname || 'cher(e) élève';

	const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Bonjour ${greeting},</p>
  <p>Ton compte UbuMaths a été validé. Tu peux maintenant te connecter sur <a href="${siteUrl}" style="color: #2563eb; text-decoration: underline;">${siteUrl}</a>.</p>
  <p>Bonne année mathématique !</p>
</body>
</html>`;

	return sendEmail(accessToken, toEmail, fromEmail, subject, htmlBody);
}
