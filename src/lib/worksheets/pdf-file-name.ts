/**
 * Noms des fichiers PDF et ZIP des fiches
 *
 * Un seul filtre pour tous les téléchargements : fiche, corrigé, lot par élève.
 *
 * @module worksheets/pdf-file-name
 */

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
 * Nom du PDF téléchargé : titre (et élève), puis « - Réponses » ou
 * « - Corrigé », pour que les trois fichiers ne s'écrasent pas.
 *
 * @example
 * ```typescript
 * worksheetPdfFileName('Équations', 'answers') // 'Equations - Réponses.pdf'
 * ```
 */
export function worksheetPdfFileName(
	title: string,
	kind: WorksheetPdfKind,
	studentName?: string
): string {
	const student = studentName ? `_${sanitizeForFileName(studentName)}` : '';
	return `${sanitizeForFileName(title)}${student}${PDF_KIND_SUFFIXES[kind]}.pdf`;
}
