/**
 * Taille du texte des PDF de fiche (accessibilité, élèves malvoyants)
 *
 * Trois paliers : normale (10 pt, le gabarit tel quel), grande (14 pt), très
 * grande (18 pt). Tout le gabarit grandit dans la même proportion ; sa mise
 * en page (colonnes) ne change pas : David n'a pas voulu de passage à une
 * colonne (2026-10-16).
 */
import { describe, it, expect } from 'vitest';
import { textSizeOf, withTextSize, TEXT_SIZE_OPTIONS } from '../text-size';
import {
	STUDENT_STYLE_COMMON,
	STUDENT_LANDSCAPE_STYLE_COMMON
} from '../templates/default-templates';

describe('textSizeOf : une valeur inconnue donne la taille normale', () => {
	it.each([
		['normal', 'normal'],
		['large', 'large'],
		['x_large', 'x_large']
	])('%s → %s', (value, expected) => {
		expect(textSizeOf(value)).toBe(expected);
	});

	it.each([[undefined], [null], [''], ['enorme'], [14], [{}]])('%j → normal', (value) => {
		expect(textSizeOf(value)).toBe('normal');
	});
});

describe('withTextSize', () => {
	it('taille normale : le gabarit est rendu tel quel', () => {
		expect(withTextSize(STUDENT_STYLE_COMMON, 'normal')).toBe(STUDENT_STYLE_COMMON);
	});

	it('grande : 10 pt → 14 pt, pied de page 9 pt → 12,6 pt', () => {
		const typst = withTextSize(STUDENT_STYLE_COMMON, 'large');
		expect(typst).toContain('size: 14pt, lang:');
		expect(typst).toContain('#set text(size: 12.6pt, fill: gray)');
		expect(typst).not.toContain('size: 10pt');
	});

	it('très grande : 10 pt → 18 pt', () => {
		const typst = withTextSize(STUDENT_STYLE_COMMON, 'x_large');
		expect(typst).toContain('size: 18pt, lang:');
	});

	it('les colonnes du style ne changent pas, à aucune taille (David, 2026-10-16)', () => {
		for (const common of [STUDENT_STYLE_COMMON, STUDENT_LANDSCAPE_STYLE_COMMON]) {
			for (const size of ['large', 'x_large'] as const) {
				expect(withTextSize(common, size)).toContain('columns: 2,');
			}
		}
		const body = '#set page(columns: 2)\n#columns(3, gutter: 20pt)[x]\n#grid(columns: 2, [a])';
		expect(withTextSize(body, 'x_large')).toBe(
			'#set page(columns: 2)\n#columns(3, gutter: 20pt)[x]\n#grid(columns: 2, [a])'
		);
	});

	it('le paysage reste en paysage', () => {
		expect(withTextSize(STUDENT_LANDSCAPE_STYLE_COMMON, 'large')).toContain('flipped: true');
	});

	it('les tailles relatives (em) ne bougent pas : elles suivent déjà le texte', () => {
		const typst = '#text(size: 1.5em)[Titre]';
		expect(withTextSize(typst, 'large')).toBe(typst);
	});

	it('un gabarit de prof en 11 pt grandit aussi', () => {
		const typst = '#set text(font: "New Computer Modern", size: 11pt)\n#text(size: 18pt)[T]';
		expect(withTextSize(typst, 'large')).toBe(
			'#set text(font: "New Computer Modern", size: 15.4pt)\n#text(size: 25.2pt)[T]'
		);
	});
});

describe('TEXT_SIZE_OPTIONS : le menu', () => {
	it('trois paliers, dans l’ordre, libellés en français', () => {
		expect(TEXT_SIZE_OPTIONS).toEqual([
			{ value: 'normal', label: 'Normale' },
			{ value: 'large', label: 'Grande' },
			{ value: 'x_large', label: 'Très grande' }
		]);
	});
});
