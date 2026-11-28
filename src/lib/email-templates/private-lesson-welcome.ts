/**
 * Courriel final de l'invitation de cours particulier
 * ===================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 3. Le parent vient de créer l'espace de son enfant par le lien reçu : ce courriel lui
 * redit l'identifiant et l'adresse de connexion (phase 0, « Écran final »). Le mot de passe
 * n'y figure jamais : le parent vient de le choisir.
 *
 * Prénom et identifiant échappés en HTML (le prénom vient d'un formulaire de l'admin).
 */

import { escapeHtml } from '#lib/utils/html-escape.ts';
import { getSiteUrl } from './parental-consent';

// Types

export interface PrivateLessonWelcomeEmailData {
	childFirstname: string;
	loginId: string;
}

// Functions

export function getPrivateLessonWelcomeSubject(data: PrivateLessonWelcomeEmailData): string {
	return `L'espace de ${data.childFirstname} est prêt sur Chiphre`;
}

/** Page de connexion : l'enfant y tape son identifiant. */
export function getPrivateLessonLoginLink(): string {
	return `${getSiteUrl()}/auth/login`;
}

function introSentence(data: PrivateLessonWelcomeEmailData): string {
	return `L'espace de ${data.childFirstname} sur Chiphre est créé. Voici de quoi vous connecter.`;
}

function forgottenPasswordSentence(data: PrivateLessonWelcomeEmailData): string {
	return `Si ${data.childFirstname} oublie son mot de passe : sur la page de connexion, « Mot de passe oublié » avec l'identifiant ${data.loginId}. Le lien vous arrivera à cette adresse.`;
}

export function getPrivateLessonWelcomeEmailText(data: PrivateLessonWelcomeEmailData): string {
	return `Bonjour,

${introSentence(data)}

Identifiant : ${data.loginId}
Mot de passe : celui que vous venez de choisir.
Adresse de connexion : ${getPrivateLessonLoginLink()}

${forgottenPasswordSentence(data)}

Cordialement,
L'équipe Chiphre`;
}

/** Version HTML : prénom et identifiant échappés. */
export function getPrivateLessonWelcomeEmailHtml(data: PrivateLessonWelcomeEmailData): string {
	const firstname = escapeHtml(data.childFirstname);
	const loginId = escapeHtml(data.loginId);
	const loginLink = getPrivateLessonLoginLink();

	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">L'espace de ${firstname} est prêt</h1>
    <p>Bonjour,</p>
    <p>${escapeHtml(introSentence(data))}</p>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <p style="margin: 0; color: #64748b;">Identifiant de connexion</p>
    <p style="margin: 4px 0 0; font-family: monospace; font-size: 1.8em; font-weight: bold; letter-spacing: 0.05em;">${loginId}</p>
    <p style="margin: 8px 0 0; color: #64748b; font-size: 0.9em;">Mot de passe : celui que vous venez de choisir.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${loginLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
      Se connecter
    </a>
    <p style="color: #64748b; font-size: 0.85em; margin-top: 8px;">${escapeHtml(loginLink)}</p>
  </div>

  <p style="color: #64748b; font-size: 0.9em;">${escapeHtml(forgottenPasswordSentence(data))}</p>

  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe Chiphre
  </p>
</body>
</html>`;
}
