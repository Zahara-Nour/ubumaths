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

import { escapeHtml } from '#lib/utils/html-escape.ts';
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
	/** Expiration du lien : fin de l'année scolaire de l'école */
	expiresAt: Date;
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

/** « 15 juillet 2027 » : le jour d'expiration, tel que la base le compte (UTC) */
function formatExpiry(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

export function getCarnetLinkSubject(data: CarnetLinkEmailData): string {
	return `Le carnet de liaison de ${data.studentFirstname}`;
}

export function getCarnetLinkEmailText(data: CarnetLinkEmailData): string {
	return `Bonjour,

Voici le lien du carnet de liaison de ${data.studentFirstname} sur Chiphre :
${getCarnetLink(data.token)}

Cette page est toujours à jour : régularité des dernières semaines, révisions, évaluations à rendre. Vous pouvez l'ajouter à l'écran d'accueil de votre téléphone.

Ce lien est personnel : ne le transférez pas. Il remplace tout lien reçu auparavant et reste valable jusqu'au ${formatExpiry(data.expiresAt)}.

Gardez ce courriel. Si vous ne le retrouvez plus un jour, demandez un nouveau lien (l'ancien cessera de fonctionner) :
${getCarnetLostLink()}

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
    Ce lien est <strong>personnel</strong> : ne le transférez pas. Il remplace tout lien reçu auparavant et reste valable jusqu'au ${escapeHtml(formatExpiry(data.expiresAt))}.
  </p>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Gardez ce courriel. Si vous ne le retrouvez plus un jour, <a href="${escapeHtml(getCarnetLostLink())}">demandez un nouveau lien</a> (l'ancien cessera de fonctionner).
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    Chiphre ne vous écrira que si quelque chose mérite votre attention. Pour ne plus recevoir ces courriels, utilisez le bouton en bas du carnet.
  </p>
`
	);
}

// --- Courriel d'exception (E1, E5, Q19, Q38) ----------------------------------

/** Le motif d'un courriel d'exception, tel que le journal le garde. */
export type CarnetExceptionReason = 'evaluation_missed' | 'reviews_overdue' | 'inactivity';

export interface CarnetExceptionEmailData {
	studentFirstname: string;
	/** Jeton propre à ce courriel (Q38) : ouvre le carnet, arrête les courriels */
	token: string;
	reasons: CarnetExceptionReason[];
	overdueDays: number;
	inactivityDays: number;
}

export interface CarnetQuarterlyEmailData {
	studentFirstname: string;
	token: string;
	regular: boolean;
	reviewsUpToDate: boolean;
}

/** Le lien « Ne plus recevoir ces courriels » : le bas du carnet, où est le bouton. */
export function getCarnetStopLink(token: string): string {
	return `${getCarnetLink(token)}#courriels`;
}

/** Prénom pour l'objet d'un courriel : ni retour à la ligne ni caractère de contrôle. */
function subjectName(firstname: string): string {
	// eslint-disable-next-line no-control-regex
	return firstname.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

/** Majuscule en début de phrase (« votre enfant » quand le prénom manque). */
function sentence(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Une phrase par motif ; jamais plus que ce que montre le carnet (E5). */
export function carnetExceptionPhrase(
	reason: CarnetExceptionReason,
	data: Pick<CarnetExceptionEmailData, 'studentFirstname' | 'overdueDays' | 'inactivityDays'>
): string {
	switch (reason) {
		case 'evaluation_missed':
			return sentence(`${data.studentFirstname} n'a pas fait une évaluation avant son échéance.`);
		case 'reviews_overdue':
			return `Des révisions de ${data.studentFirstname} attendent depuis plus de ${data.overdueDays} jours.`;
		case 'inactivity':
			return sentence(
				`${data.studentFirstname} n'a pas travaillé sur Chiphre ces ${data.inactivityDays} derniers jours de classe.`
			);
	}
}

/** Q34 : seulement les phrases vraies, sans aucun nombre. */
export function carnetQuarterlyPhrases(data: CarnetQuarterlyEmailData): string[] {
	const phrases: string[] = [];
	if (data.regular) {
		phrases.push(sentence(`${data.studentFirstname} a travaillé régulièrement ce trimestre.`));
	}
	if (data.reviewsUpToDate) phrases.push('Ses révisions sont à jour.');
	return phrases;
}

function noticeText(firstname: string, intro: string, phrases: string[], token: string): string {
	return `Bonjour,

${intro}

${phrases.map((p) => `- ${p}`).join('\n')}

Le carnet de liaison de ${firstname} :
${getCarnetLink(token)}

Ce lien est personnel : ne le transférez pas.

Ne plus recevoir ces courriels (le carnet reste ouvert) :
${getCarnetStopLink(token)}

Cordialement,
L'équipe Chiphre`;
}

function noticeHtml(firstname: string, intro: string, phrases: string[], token: string): string {
	const name = escapeHtml(firstname);
	const link = escapeHtml(getCarnetLink(token));
	const stop = escapeHtml(getCarnetStopLink(token));
	const items = phrases.map((p) => `      <li>${escapeHtml(p)}</li>`).join('\n');

	return htmlPage(
		'Carnet de liaison',
		`  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Carnet de liaison de ${name}</h1>
    <p>Bonjour,</p>
    <p>${escapeHtml(intro)}</p>
    <ul>
${items}
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="${BUTTON_STYLE}">Ouvrir le carnet</a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien est <strong>personnel</strong> : ne le transférez pas.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    <a href="${stop}">Ne plus recevoir ces courriels</a> (le carnet reste ouvert).
  </p>
`
	);
}

const EXCEPTION_INTRO = 'Un point mérite votre attention cette semaine :';

export function getCarnetExceptionSubject(data: CarnetExceptionEmailData): string {
	return `Carnet de liaison de ${subjectName(data.studentFirstname)} : un point d'attention`;
}

export function getCarnetExceptionEmailText(data: CarnetExceptionEmailData): string {
	const phrases = data.reasons.map((r) => carnetExceptionPhrase(r, data));
	return noticeText(data.studentFirstname, EXCEPTION_INTRO, phrases, data.token);
}

export function getCarnetExceptionEmailHtml(data: CarnetExceptionEmailData): string {
	const phrases = data.reasons.map((r) => carnetExceptionPhrase(r, data));
	return noticeHtml(data.studentFirstname, EXCEPTION_INTRO, phrases, data.token);
}

// --- Message trimestriel (E4, Q34) --------------------------------------------

const QUARTERLY_INTRO = 'Le trimestre vient de se terminer :';

export function getCarnetQuarterlySubject(data: CarnetQuarterlyEmailData): string {
	return `Carnet de liaison de ${subjectName(data.studentFirstname)} : le trimestre`;
}

export function getCarnetQuarterlyEmailText(data: CarnetQuarterlyEmailData): string {
	return noticeText(
		data.studentFirstname,
		QUARTERLY_INTRO,
		carnetQuarterlyPhrases(data),
		data.token
	);
}

export function getCarnetQuarterlyEmailHtml(data: CarnetQuarterlyEmailData): string {
	return noticeHtml(
		data.studentFirstname,
		QUARTERLY_INTRO,
		carnetQuarterlyPhrases(data),
		data.token
	);
}
