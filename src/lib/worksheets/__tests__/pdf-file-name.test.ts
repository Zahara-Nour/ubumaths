/**
 * `sanitizeForFileName` : un titre de fiche devient un nom de fichier lisible,
 * accents retirés plutôt que remplacés par « _ » (« Équations » donnait `_quations`).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { sanitizeForFileName, worksheetPdfFileName } from '$lib/worksheets/pdf-file-name';

describe('sanitizeForFileName', () => {
	it('retire les accents au lieu de remplacer la lettre', () => {
		expect(sanitizeForFileName('Équations du 2ᵉ degré')).toBe('Equations_du_2e_degre');
		expect(sanitizeForFileName('Aperçu professeur')).toBe('Apercu_professeur');
	});

	it('remplace la ponctuation et les espaces par un seul « _ »', () => {
		expect(sanitizeForFileName('Fiche n° 3 : fractions !')).toBe('Fiche_n_3_fractions_');
	});

	it('garde les tirets et les chiffres', () => {
		expect(sanitizeForFileName('3e-B 2026')).toBe('3e-B_2026');
	});

	it('ne laisse passer aucun séparateur de chemin ni guillemet', () => {
		expect(sanitizeForFileName('../"classe"/A')).toBe('_classe_A');
	});
});

describe('worksheetPdfFileName : trois PDF, trois noms', () => {
	it('fiche, réponses et corrigé se distinguent', () => {
		expect(worksheetPdfFileName('Équations', 'worksheet')).toBe('Equations.pdf');
		expect(worksheetPdfFileName('Équations', 'answers')).toBe('Equations - Réponses.pdf');
		expect(worksheetPdfFileName('Équations', 'correction')).toBe('Equations - Corrigé.pdf');
	});

	it('le nom de l’élève suit le titre', () => {
		expect(worksheetPdfFileName('Fiche 1', 'answers', 'Dupont Léa')).toBe(
			'Fiche_1_Dupont_Lea - Réponses.pdf'
		);
	});
});
