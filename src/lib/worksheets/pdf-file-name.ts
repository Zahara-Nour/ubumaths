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
