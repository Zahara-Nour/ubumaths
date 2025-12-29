/**
 * Welcome Email Template
 *
 * Single source of truth for welcome email content.
 * Used by both the preview page and the Gmail sending function.
 */

export const WELCOME_EMAIL_SUBJECT = 'Bienvenue sur UbuMaths !';
export const SITE_URL = 'https://ubumaths-6op8.vercel.app/';

/**
 * Get the greeting for the email
 */
export function getGreeting(firstname: string | null | undefined): string {
	return firstname || 'cher(e) élève';
}

/**
 * Get plain text version of the welcome email (for preview)
 */
export function getWelcomeEmailText(firstname: string | null | undefined): string {
	const greeting = getGreeting(firstname);
	return `Bonjour ${greeting},

Ton compte UbuMaths a été validé. Tu peux maintenant te connecter sur ${SITE_URL}.

Bonne année mathématique !`;
}

/**
 * Get HTML version of the welcome email (for sending via Gmail)
 */
export function getWelcomeEmailHtml(firstname: string | null | undefined): string {
	const greeting = getGreeting(firstname);
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Bonjour ${greeting},</p>
  <p>Ton compte UbuMaths a été validé. Tu peux maintenant te connecter sur <a href="${SITE_URL}" style="color: #2563eb; text-decoration: underline;">${SITE_URL}</a>.</p>
  <p>Bonne année mathématique !</p>
</body>
</html>`;
}
