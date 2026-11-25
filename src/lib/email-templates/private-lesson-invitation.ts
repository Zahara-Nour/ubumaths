/**
 * Courriel d'invitation de cours particulier
 * ==========================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2. L'admin invite un élève de moins de 15 ans : le parent reçoit un lien (7 jours,
 * usage unique) qui crée le compte et la classe de l'enfant, et recueille CGU et
 * consentement en une fois (décision 1). La page du lien vient avec la PR 3.
 *
 * L'adresse du parent n'apparaît pas dans le courriel ; le prénom est échappé en HTML (il
 * vient d'un formulaire, même si Zod n'y laisse que lettres, espaces, tirets, apostrophes).
 */

import { escapeHtml } from '#lib/utils/html-escape.ts';
import { getSiteUrl } from './parental-consent';

// Types

export interface PrivateLessonInvitationEmailData {
	childFirstname: string;
	schoolName: string;
	/** Jeton en clair : seule son empreinte est en base. */
	token: string;
	expiresAt: Date;
}

// Functions

export function getPrivateLessonInvitationSubject(data: PrivateLessonInvitationEmailData): string {
	return `Créez l'espace de ${data.childFirstname} sur Chiphre`;
}

/** Page du parent (PR 3) : `/auth/register/invitation/<jeton>`. */
export function getPrivateLessonInvitationLink(token: string): string {
	return `${getSiteUrl()}/auth/register/invitation/${encodeURIComponent(token)}`;
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});
}

function introSentence(data: PrivateLessonInvitationEmailData): string {
	return `Pour les cours particuliers de ${data.childFirstname} (${data.schoolName}), voici le lien qui crée son espace sur Chiphre, une plateforme éducative de mathématiques.`;
}

function stepsSentence(data: PrivateLessonInvitationEmailData): string {
	return `Sur la page du lien, vous choisissez le mot de passe de ${data.childFirstname}, puis vous acceptez les conditions d'utilisation et donnez votre consentement (RGPD, article 8 : votre enfant a moins de 15 ans). Son identifiant de connexion s'affiche à la fin, et vous le recevez aussi par courriel.`;
}

const NOT_ME_SENTENCE =
	"Si vous n'attendiez pas cette invitation, ignorez ce courriel : sans votre clic, aucun compte n'est créé.";

export function getPrivateLessonInvitationEmailText(
	data: PrivateLessonInvitationEmailData
): string {
	return `Bonjour,

${introSentence(data)}

${stepsSentence(data)}

Créer l'espace de ${data.childFirstname} :
${getPrivateLessonInvitationLink(data.token)}

Ce lien sert une seule fois et expire le ${formatDate(data.expiresAt)}.

${NOT_ME_SENTENCE}

Cordialement,
L'équipe Chiphre`;
}

/** Version HTML : prénom et école échappés. */
export function getPrivateLessonInvitationEmailHtml(
	data: PrivateLessonInvitationEmailData
): string {
	const firstname = escapeHtml(data.childFirstname);
	const link = getPrivateLessonInvitationLink(data.token);

	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">L'espace de ${firstname} sur Chiphre</h1>
    <p>Bonjour,</p>
    <p>${escapeHtml(introSentence(data))}</p>
  </div>

  <p>${escapeHtml(stepsSentence(data))}</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
      Créer l'espace de ${firstname}
    </a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien sert une seule fois et expire le <strong>${escapeHtml(formatDate(data.expiresAt))}</strong>.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    ${escapeHtml(NOT_ME_SENTENCE)}
  </p>

  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe Chiphre
  </p>
</body>
</html>`;
}
