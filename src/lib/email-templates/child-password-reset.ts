/**
 * Courriel au parent : nouveau mot de passe pour son enfant (« Mot de passe oublié »)
 * =================================================================================
 *
 * L'enfant inscrit par identifiant n'a pas d'adresse : le lien part à celle du parent,
 * confirmée (R1). Il ouvre une page où le parent choisit le mot de passe sans être connecté
 * au compte de l'enfant (R2). Durée du lien : `otp_expiry` de GoTrue (1 heure).
 */

import { escapeHtml } from '$lib/utils/html-escape';
import { getSiteUrl } from './parental-consent';

// Types

export interface ChildPasswordResetEmailData {
	childFirstname: string;
	loginId: string;
	tokenHash: string;
}

// Functions

export function getChildPasswordResetLink(tokenHash: string): string {
	return `${getSiteUrl()}/auth/reset-password/parent?token_hash=${encodeURIComponent(tokenHash)}`;
}

export function getChildPasswordResetSubject(data: ChildPasswordResetEmailData): string {
	return `Nouveau mot de passe pour ${data.childFirstname} sur Chiphre`;
}

export function getChildPasswordResetEmailText(data: ChildPasswordResetEmailData): string {
	return `Bonjour,

Un nouveau mot de passe a été demandé pour ${data.childFirstname} (identifiant : ${data.loginId}) sur Chiphre.

Choisir le nouveau mot de passe :
${getChildPasswordResetLink(data.tokenHash)}

Ce lien est valable 1 heure et ne sert qu'une fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel : le mot de passe actuel reste valable.

Cordialement,
L'équipe Chiphre`;
}

/** Version HTML : le prénom saisi est échappé. */
export function getChildPasswordResetEmailHtml(data: ChildPasswordResetEmailData): string {
	const firstname = escapeHtml(data.childFirstname);
	const loginId = escapeHtml(data.loginId);
	const link = escapeHtml(getChildPasswordResetLink(data.tokenHash));

	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Nouveau mot de passe pour ${firstname}</h1>
    <p>Bonjour,</p>
    <p>Un nouveau mot de passe a été demandé pour <strong>${firstname}</strong> (identifiant : <strong>${loginId}</strong>) sur <strong>Chiphre</strong>.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
      Choisir le nouveau mot de passe
    </a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien est valable <strong>1 heure</strong> et ne sert qu'une fois.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel : le mot de passe actuel reste valable.
  </p>

  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe Chiphre
  </p>
</body>
</html>`;
}
