/**
 * Courriel au parent qui inscrit son enfant (/auth/register/parent)
 * =================================================================
 *
 * Un seul courriel (décision 3) : l'identifiant de l'enfant et un lien unique qui
 * confirme l'adresse du parent et, si le niveau l'exige, recueille son consentement
 * (RGPD art. 8). Le mot de passe n'y figure jamais : le parent vient de le choisir.
 */

import { escapeHtml } from '$lib/utils/html-escape';
import { getConsentLink, getSiteUrl } from './parental-consent';

// Types

export interface ChildRegistrationEmailData {
	childFirstname: string;
	loginId: string;
	schoolName: string | null;
	consentToken: string;
	expiresAt: Date;
	/** Niveau soumis au consentement parental ; sinon le lien confirme seulement l'adresse. */
	consentRequired: boolean;
}

// Functions

export function getChildRegistrationSubject(data: ChildRegistrationEmailData): string {
	return `Inscription de ${data.childFirstname} sur Chiphre`;
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

function actionSentence(data: ChildRegistrationEmailData): string {
	return data.consentRequired
		? `Comme ${data.childFirstname} a moins de 15 ans, votre consentement est nécessaire (RGPD, article 8). En attendant, son compte est en lecture seule.`
		: 'Merci de confirmer votre adresse : c’est par elle que Chiphre vous joindra au sujet du compte de votre enfant.';
}

function notMeSentence(data: ChildRegistrationEmailData): string {
	return data.consentRequired
		? "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce courriel : sans votre clic, le compte reste en lecture seule."
		: "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce courriel.";
}

function buttonLabel(data: ChildRegistrationEmailData): string {
	return data.consentRequired ? 'Donner mon consentement' : 'Confirmer mon adresse';
}

export function getChildRegistrationEmailText(data: ChildRegistrationEmailData): string {
	const school = data.schoolName ? ` (${data.schoolName})` : '';
	return `Bonjour,

Vous venez d'inscrire ${data.childFirstname} sur Chiphre${school}, une plateforme éducative de mathématiques.

Identifiant de connexion : ${data.loginId}
Le mot de passe est celui que vous avez choisi. Votre enfant se connecte sur ${getSiteUrl()}/auth/login avec cet identifiant.

${actionSentence(data)}

${buttonLabel(data)} :
${getConsentLink(data.consentToken)}

Ce lien expire le ${formatDate(data.expiresAt)}.

${notMeSentence(data)}

Cordialement,
L'équipe Chiphre`;
}

/** Version HTML : tout texte saisi (prénom, école) est échappé. */
export function getChildRegistrationEmailHtml(data: ChildRegistrationEmailData): string {
	const firstname = escapeHtml(data.childFirstname);
	const school = data.schoolName ? ` (${escapeHtml(data.schoolName)})` : '';
	const loginId = escapeHtml(data.loginId);
	const link = getConsentLink(data.consentToken);

	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Inscription de ${firstname}</h1>
    <p>Bonjour,</p>
    <p>Vous venez d'inscrire <strong>${firstname}</strong> sur <strong>Chiphre</strong>${school}, une plateforme éducative de mathématiques.</p>
  </div>

  <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0;">Identifiant de connexion : <strong style="font-size: 1.2em;">${loginId}</strong></p>
    <p style="margin: 8px 0 0; color: #64748b;">Le mot de passe est celui que vous avez choisi.</p>
  </div>

  <p>${escapeHtml(actionSentence(data))}</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
      ${buttonLabel(data)}
    </a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien expire le <strong>${escapeHtml(formatDate(data.expiresAt))}</strong>.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    ${escapeHtml(notMeSentence(data))}
  </p>

  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe Chiphre
  </p>
</body>
</html>`;
}
