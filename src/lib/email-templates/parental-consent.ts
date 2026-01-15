/**
 * Parental Consent Email Template
 *
 * Used to request parental consent for minors under 15 (RGPD Article 8).
 * The email contains a unique link for the parent to grant consent.
 */

import { PUBLIC_APP_URL } from '$env/static/public';

export const CONSENT_EMAIL_SUBJECT = 'Consentement parental requis - UbuMaths';
export const SITE_URL = PUBLIC_APP_URL || 'https://ubumaths-6op8.vercel.app';

/**
 * Escape HTML entities to prevent XSS in emails
 */
function escapeHtml(text: string | null): string {
	if (!text) return '';
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export interface ConsentEmailData {
	studentFirstname: string | null;
	studentLastname: string | null;
	studentGrade: string | null;
	schoolName: string | null;
	teacherName: string | null;
	consentToken: string;
	expiresAt: Date;
}

/**
 * Format grade code to human-readable French
 */
function formatGrade(grade: string | null): string {
	if (!grade) return 'non spécifiée';
	const gradeNames: Record<string, string> = {
		'6': '6ème',
		'5': '5ème',
		'4': '4ème',
		'3': '3ème',
		'2': '2nde',
		'1_GEN': '1ère Générale',
		'1_TECHNO': '1ère Technologique',
		'1_PRO': '1ère Professionnelle',
		TERM_GEN: 'Terminale Générale',
		TERM_TECHNO: 'Terminale Technologique',
		TERM_PRO: 'Terminale Professionnelle'
	};
	return gradeNames[grade] || grade;
}

/**
 * Format date in French
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Get student display name
 */
function getStudentName(data: ConsentEmailData): string {
	if (data.studentFirstname && data.studentLastname) {
		return `${data.studentFirstname} ${data.studentLastname}`;
	}
	if (data.studentFirstname) {
		return data.studentFirstname;
	}
	return 'votre enfant';
}

/**
 * Get the consent link URL
 */
export function getConsentLink(token: string): string {
	return `${SITE_URL}/consent/${token}`;
}

/**
 * Get plain text version of the consent email
 */
export function getConsentEmailText(data: ConsentEmailData): string {
	const studentName = getStudentName(data);
	const grade = formatGrade(data.studentGrade);
	const expiryDate = formatDate(data.expiresAt);
	const consentLink = getConsentLink(data.consentToken);

	let text = `Bonjour,

${studentName} souhaite utiliser UbuMaths, une plateforme éducative de mathématiques.

Informations de l'élève :
- Nom : ${studentName}
- Classe : ${grade}`;

	if (data.schoolName) {
		text += `\n- Établissement : ${data.schoolName}`;
	}
	if (data.teacherName) {
		text += `\n- Enseignant : ${data.teacherName}`;
	}

	text += `

Conformément au RGPD (Article 8), votre consentement est requis car votre enfant a moins de 15 ans.

Pour autoriser l'accès, cliquez sur le lien ci-dessous :
${consentLink}

Ce lien expire le ${expiryDate}.

Si vous n'avez pas demandé ce consentement, vous pouvez ignorer cet email.

Cordialement,
L'équipe UbuMaths`;

	return text;
}

/**
 * Get HTML version of the consent email
 * All user-generated content is escaped to prevent XSS attacks
 */
export function getConsentEmailHtml(data: ConsentEmailData): string {
	const studentName = escapeHtml(getStudentName(data));
	const grade = escapeHtml(formatGrade(data.studentGrade));
	const expiryDate = escapeHtml(formatDate(data.expiresAt));
	const consentLink = getConsentLink(data.consentToken);

	let studentInfo = `
      <li><strong>Nom :</strong> ${studentName}</li>
      <li><strong>Classe :</strong> ${grade}</li>`;

	if (data.schoolName) {
		studentInfo += `\n      <li><strong>Établissement :</strong> ${escapeHtml(data.schoolName)}</li>`;
	}
	if (data.teacherName) {
		studentInfo += `\n      <li><strong>Enseignant :</strong> ${escapeHtml(data.teacherName)}</li>`;
	}

	return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1e40af; margin-top: 0;">Consentement parental requis</h1>
    <p>Bonjour,</p>
    <p><strong>${studentName}</strong> souhaite utiliser <strong>UbuMaths</strong>, une plateforme éducative de mathématiques.</p>
  </div>

  <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #475569; margin-top: 0; font-size: 1.1em;">Informations de l'élève</h2>
    <ul style="list-style: none; padding: 0; margin: 0;">${studentInfo}
    </ul>
  </div>

  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; color: #92400e;">
      <strong>Conformément au RGPD (Article 8)</strong>, votre consentement est requis car votre enfant a moins de 15 ans.
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${consentLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
      Autoriser l'accès
    </a>
  </div>

  <p style="color: #64748b; font-size: 0.9em; text-align: center;">
    Ce lien expire le <strong>${expiryDate}</strong>.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 0.85em;">
    Si vous n'avez pas demandé ce consentement, vous pouvez ignorer cet email.
  </p>

  <p style="color: #64748b; font-size: 0.9em;">
    Cordialement,<br>
    L'équipe UbuMaths
  </p>
</body>
</html>`;
}
