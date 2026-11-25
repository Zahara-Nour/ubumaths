/**
 * `sanitizeForFileName` : un titre de fiche devient un nom de fichier lisible,
 * accents retirés plutôt que remplacés par « _ » (« Équations » donnait `_quations`).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
	sanitizeForFileName,
	uniqueFileName,
	worksheetPdfFileName
} from '#lib/worksheets/pdf-file-name.ts';

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

	it('la version anglaise garde le titre français et finit par _EN', () => {
		expect(worksheetPdfFileName('Équations', 'worksheet', undefined, 'en')).toBe(
			'Equations_EN.pdf'
		);
		expect(worksheetPdfFileName('Équations', 'correction', 'Dupont Léa', 'en')).toBe(
			'Equations_Dupont_Lea - Corrigé_EN.pdf'
		);
		expect(worksheetPdfFileName('Équations', 'worksheet', undefined, 'fr')).toBe('Equations.pdf');
	});
});

describe('uniqueFileName — deux élèves homonymes dans un lot', () => {
	it('un nom libre est rendu tel quel, puis noté', () => {
		const used = new Set<string>();
		expect(uniqueFileName('Fiche_Martin_Lea.pdf', used)).toBe('Fiche_Martin_Lea.pdf');
		expect(used.has('Fiche_Martin_Lea.pdf')).toBe(true);
	});

	it('un nom déjà pris reçoit _2, puis _3, avant l’extension', () => {
		const used = new Set<string>();
		const names = [1, 2, 3].map(() => uniqueFileName('Fiche_Martin_Lea_EN.pdf', used));
		expect(names).toEqual([
			'Fiche_Martin_Lea_EN.pdf',
			'Fiche_Martin_Lea_EN_2.pdf',
			'Fiche_Martin_Lea_EN_3.pdf'
		]);
	});

	it('sans extension, le rang va à la fin', () => {
		const used = new Set(['Eleve']);
		expect(uniqueFileName('Eleve', used)).toBe('Eleve_2');
	});
});
