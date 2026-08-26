/**
 * Welcome Email Template
 *
 * Single source of truth for welcome email content.
 * Used by both the preview page and the Brevo sending function.
 *
 * Tone: pataphysical (Chiphre lore). Wording works for both self-registered students
 * (already logged in → "file au Cabinet…") and manually-added ones (invitation to come).
 */

export const WELCOME_EMAIL_SUBJECT = 'Cornegidouille, bienvenue sur Chiphre !';
export const SITE_URL = 'https://www.chiph.re/';

/**
 * Get the greeting for the email
 */
export function getGreeting(firstname: string | null | undefined): string {
	return firstname || 'cher Galopin';
}

/**
 * Get plain text version of the welcome email (for preview)
 */
export function getWelcomeEmailText(firstname: string | null | undefined): string {
	const greeting = getGreeting(firstname);
	return `Bonjour ${greeting},

Te voilà enrôlé dans ton Bataillon, Galopin ! Ton compte est scellé et bien vivant.

File au Cabinet des Phynances sur ${SITE_URL} : des Corvées à dompter, des Gidouilles à empocher, et quelques Médailles de la Gidouille à décrocher.

Bonne année de Mathres — et gare au Décervelage !`;
}

/**
 * Get HTML version of the welcome email (for sending via Brevo)
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
  <p>Te voilà enrôlé dans ton <strong>Bataillon</strong>, Galopin ! Ton compte est scellé et bien vivant.</p>
  <p>File au <strong>Cabinet des Phynances</strong> sur <a href="${SITE_URL}" style="color: #2563eb; text-decoration: underline;">${SITE_URL}</a> : des <strong>Corvées</strong> à dompter, des <strong>Gidouilles</strong> à empocher, et quelques <strong>Médailles de la Gidouille</strong> à décrocher.</p>
  <p>Bonne année de <strong>Mathres</strong> — et gare au Décervelage&nbsp;! ⚙️</p>
</body>
</html>`;
}
