/**
 * Carnet de liaison — les deux courriels aux parents (ADR 0040 ; A1, A2, Q18, Q26)
 * ===============================================================================
 *
 * - **Confirmation** : part vers une adresse saisie (professeur ou élève), peut-être
 *   fausse. Il ne dit de l'élève que son PRÉNOM et le nom du professeur (Q18) :
 *   ni nom de famille, ni école, ni classe. Le lien mène à une page où le parent
 *   confirme, ou dit « Je ne suis pas le parent de cet élève » (A5).
 * - **Lien du carnet** : part vers une adresse CONFIRMÉE seulement. Le jeton n'est
 *   stocké nulle part en clair : ce courriel est le seul endroit où il existe.
 *
 * Le jeton est dans le chemin : `redactSecretUrl` le masque dans les journaux.
 */

import { escapeHtml } from '$lib/utils/html-escape';
import { getSiteUrl } from './parental-consent';

// Types

export interface CarnetConfirmationEmailData {
	studentFirstname: string;
	teacherName: string | null;
	token: string;
}

export interface CarnetLinkEmailData {
	studentFirstname: string;
	token: string;
}

// Constantes

/** A4 : la confirmation vaut 7 jours (dit dans le courriel, posé par le serveur). */
export const CARNET_CONFIRM_DAYS = 7;

const BODY_STYLE =
	'font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;';
const BUTTON_STYLE =
	'display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;';

// Functions

export function getCarnetConfirmLink(token: string): string {
	return `${getSiteUrl()}/carnet/confirmer/${token}`;
}

export function getCarnetLink(token: string): string {
	return `${getSiteUrl()}/carnet/${token}`;
}

/** A6 : redemander un lien, sans le professeur. */
export function getCarnetLostLink(): string {
	return `${getSiteUrl()}/carnet/lien-perdu`;
}

function teacherPhrase(teacherName: string | null): string {
	return teacherName ? `son professeur, ${teacherName}` : 'son professeur';
}

function htmlPage(title: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${BODY_STYLE}">
${body}
  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe Chiphre
  </p>
</body>
</html>`;
}

// --- Confirmation de l'adresse (A2) -----------------------------------------

export function getCarnetConfirmationSubject(data: CarnetConfirmationEmailData): string {
	return `Carnet de liaison de ${data.studentFirstname} : confirmez votre adresse`;
}

export function getCarnetConfirmationEmailText(data: CarnetConfirmationEmailData): string {
	return `Bonjour,

Votre adresse a été donnée pour recevoir le carnet de liaison de ${data.studentFirstname} sur Chiphre, l'application de mathématiques qu'utilise ${teacherPhrase(data.teacherName)}. Le carnet est une page qui montre sa régularité, ses révisions et ses évaluations à rendre.

Confirmer votre adresse :
${getCarnetConfirmLink(data.token)}

Ce lien est valable ${CARNET_CONFIRM_DAYS} jours. Une fois l'adresse confirmée, le lien du carnet vous sera envoyé dans un second courriel.

Si vous n'êtes pas le parent de cet élève, ouvrez le même lien et choisissez « Je ne suis pas le parent de cet élève » : votre adresse sera effacée. Sans réponse, rien d'autre ne vous sera envoyé.

Cordialement,
L'équipe Chiphre`;
}

export function getCarnetConfirmationEmailHtml(data: CarnetConfirmationEmailData): string {
	const firstname = escapeHtml(data.studentFirstname);
	const teacher = escapeHtml(teacherPhrase(data.teacherName));
	const link = escapeHtml(getCarnetConfirmLink(data.token));

	return htmlPage(
		'Carnet de liaison',
		`  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Carnet de liaison de ${firstname}</h1>
    <p>Bonjour,</p>
    <p>Votre adresse a été donnée pour recevoir le carnet de liaison de <strong>${firstname}</strong> sur <strong>Chiphre</strong>, l'application de mathématiques qu'utilise ${teacher}. Le carnet est une page qui montre sa régularité, ses révisions et ses évaluations à rendre.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="${BUTTON_STYLE}">Confirmer mon adresse</a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien est valable <strong>${CARNET_CONFIRM_DAYS} jours</strong>. Une fois l'adresse confirmée, le lien du carnet vous sera envoyé dans un second courriel.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    Si vous n'êtes pas le parent de cet élève, ouvrez le même lien et choisissez « Je ne suis pas le parent de cet élève » : votre adresse sera effacée. Sans réponse, rien d'autre ne vous sera envoyé.
  </p>
`
	);
}

// --- Lien du carnet (A1, Q26, A6, D2) ---------------------------------------

export function getCarnetLinkSubject(data: CarnetLinkEmailData): string {
	return `Le carnet de liaison de ${data.studentFirstname}`;
}

export function getCarnetLinkEmailText(data: CarnetLinkEmailData): string {
	return `Bonjour,

Voici le lien du carnet de liaison de ${data.studentFirstname} sur Chiphre :
${getCarnetLink(data.token)}

Cette page est toujours à jour : régularité des dernières semaines, révisions, évaluations à rendre. Vous pouvez l'ajouter à l'écran d'accueil de votre téléphone.

Ce lien est personnel : ne le transférez pas. Il remplace tout lien reçu auparavant et reste valable jusqu'au 31 août. Lien perdu ? ${getCarnetLostLink()}

Chiphre ne vous écrira que si quelque chose mérite votre attention. Pour ne plus recevoir ces courriels, utilisez le bouton en bas du carnet.

Cordialement,
L'équipe Chiphre`;
}

export function getCarnetLinkEmailHtml(data: CarnetLinkEmailData): string {
	const firstname = escapeHtml(data.studentFirstname);
	const link = escapeHtml(getCarnetLink(data.token));

	return htmlPage(
		'Carnet de liaison',
		`  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Carnet de liaison de ${firstname}</h1>
    <p>Bonjour,</p>
    <p>Voici le lien du carnet de liaison de <strong>${firstname}</strong> sur <strong>Chiphre</strong>. Cette page est toujours à jour : régularité des dernières semaines, révisions, évaluations à rendre. Vous pouvez l'ajouter à l'écran d'accueil de votre téléphone.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="${BUTTON_STYLE}">Ouvrir le carnet</a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien est <strong>personnel</strong> : ne le transférez pas. Il remplace tout lien reçu auparavant et reste valable jusqu'au 31 août.
    Lien perdu ? <a href="${escapeHtml(getCarnetLostLink())}">Demandez-en un nouveau</a>.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    Chiphre ne vous écrira que si quelque chose mérite votre attention. Pour ne plus recevoir ces courriels, utilisez le bouton en bas du carnet.
  </p>
`
	);
}
