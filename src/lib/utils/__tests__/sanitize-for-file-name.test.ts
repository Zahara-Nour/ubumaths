/**
 * `sanitizeForFileName` : un titre de fiche devient un nom de fichier lisible,
 * accents retirés plutôt que remplacés par « _ » (« Équations » donnait `_quations`).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { sanitizeForFileName } from '$lib/utils/filename';

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
