/**
 * Noms des fichiers PDF et ZIP des fiches
 *
 * Un seul filtre pour tous les téléchargements : fiche, corrigé, lot par élève.
 *
 * @module worksheets/pdf-file-name
 */

import type { ContentLocale } from '#lib/types/locale.ts';

/**
 * Nom de fichier lisible à partir d'un titre (fiche, élève, classe)
 *
 * - Retire les accents au lieu de remplacer la lettre (`NFKD` : « Équations »
 *   donne `Equations`, et « 2ᵉ » donne `2e`)
 * - Remplace tout autre caractère que lettres, chiffres, `_` et `-` par `_`
 * - Fusionne les `_` consécutifs
 *
 * Aucun `/`, `\`, `.` ni guillemet ne survit : le résultat entre tel quel dans
 * un chemin d'archive ou un en-tête `Content-Disposition`.
 *
 * @param name - Titre d'origine
 * @returns Nom ASCII sans extension
 *
 * @example
 * ```typescript
 * sanitizeForFileName('Équations du 2ᵉ degré') // 'Equations_du_2e_degre'
 * ```
 */
export function sanitizeForFileName(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.replace(/__+/g, '_');
}

/** Les trois PDF d'une fiche : la fiche, ses réponses, son corrigé */
export type WorksheetPdfKind = 'worksheet' | 'answers' | 'correction' | 'worksheet_correction';

const PDF_KIND_SUFFIXES: Record<WorksheetPdfKind, string> = {
	worksheet: '',
	answers: ' - Réponses',
	correction: ' - Corrigé',
	// Fiche + corrigé du prof : chaque correction sous son énoncé
	worksheet_correction: ' - Fiche et corrigé'
};

/**
 * Marque de langue en fin de nom : la version anglaise d'une fiche garde le
 * titre français et finit par `_EN`, pour la distinguer de la française.
 */
export function localeFileNameSuffix(locale: ContentLocale | undefined): string {
	return locale && locale !== 'fr' ? `_${locale.toUpperCase()}` : '';
}

/**
 * Nom du PDF téléchargé : titre (et élève), puis « - Réponses » ou
 * « - Corrigé », pour que les trois fichiers ne s'écrasent pas ; `_EN` à la
 * fin pour la version anglaise.
 *
 * @example
 * ```typescript
 * worksheetPdfFileName('Équations', 'answers') // 'Equations - Réponses.pdf'
 * worksheetPdfFileName('Équations', 'answers', undefined, 'en') // 'Equations - Réponses_EN.pdf'
 * ```
 */
export function worksheetPdfFileName(
	title: string,
	kind: WorksheetPdfKind,
	studentName?: string,
	locale?: ContentLocale
): string {
	const student = studentName ? `_${sanitizeForFileName(studentName)}` : '';
	return `${sanitizeForFileName(title)}${student}${PDF_KIND_SUFFIXES[kind]}${localeFileNameSuffix(locale)}.pdf`;
}

/**
 * Un nom de fichier libre dans une archive : `name`, ou `name` suivi de « _2 »,
 * « _3 »… avant l'extension s'il est déjà pris (deux élèves homonymes, noms
 * vides). Le nom rendu est noté dans `used`.
 */
export function uniqueFileName(name: string, used: Set<string>): string {
	const dot = name.lastIndexOf('.');
	const stem = dot > 0 ? name.slice(0, dot) : name;
	const extension = dot > 0 ? name.slice(dot) : '';
	let candidate = name;
	for (let rank = 2; used.has(candidate); rank++) {
		candidate = `${stem}_${rank}${extension}`;
	}
	used.add(candidate);
	return candidate;
}
