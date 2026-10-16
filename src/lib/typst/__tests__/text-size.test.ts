/**
 * Taille du texte des PDF de fiche (accessibilité, élèves malvoyants)
 *
 * Trois paliers : normale (10 pt, le gabarit tel quel), grande (14 pt), très
 * grande (18 pt). Tout le gabarit grandit dans la même proportion ; au-delà
 * de la taille normale, la page passe sur une seule colonne.
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

	it('au-delà de la taille normale : une seule colonne (portrait et paysage)', () => {
		for (const common of [STUDENT_STYLE_COMMON, STUDENT_LANDSCAPE_STYLE_COMMON]) {
			const typst = withTextSize(common, 'large');
			expect(typst).toContain('columns: 1,');
			expect(typst).not.toContain('columns: 2');
		}
	});

	it('le paysage reste en paysage', () => {
		expect(withTextSize(STUDENT_LANDSCAPE_STYLE_COMMON, 'large')).toContain('flipped: true');
	});

	it('seules les colonnes de la PAGE changent, pas celles d’une grille', () => {
		const typst = '#set page(paper: "a4", columns: 2)\n#grid(columns: 2, [a], [b])';
		expect(withTextSize(typst, 'large')).toBe(
			'#set page(paper: "a4", columns: 1)\n#grid(columns: 2, [a], [b])'
		);
	});

	it('un gabarit sans colonnes dans sa page ne prend pas celles d’une grille', () => {
		const typst = '#set page(paper: "a4")\n#grid(columns: 3, [a])';
		expect(withTextSize(typst, 'x_large')).toBe(typst);
	});

	it('colonnes posées dans le corps (#columns, columns.with) : une seule', () => {
		const typst = '#columns(3, gutter: 20pt)[x]\n#show: columns.with(2)';
		expect(withTextSize(typst, 'large')).toBe(
			'#columns(1, gutter: 20pt)[x]\n#show: columns.with(1)'
		);
	});

	it('la grille du pied de page, dans le #set page, ne bouge pas', () => {
		const typst = '#set page(paper: "a4", footer: grid(columns: 3, [a], [b], [c]))';
		expect(withTextSize(typst, 'large')).toBe(typst);
		const withPageColumns = '#set page(footer: grid(columns: 3, [a]), columns: 2)';
		expect(withTextSize(withPageColumns, 'large')).toBe(
			'#set page(footer: grid(columns: 3, [a]), columns: 1)'
		);
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

describe('filet entre les colonnes du style « Fiche élève »', () => {
	// Sur une colonne, le filet du milieu barrerait le texte (vu sur le PDF le 2026-10-16)
	it('dessiné seulement quand la page a plus d’une colonne', () => {
		for (const common of [STUDENT_STYLE_COMMON, STUDENT_LANDSCAPE_STYLE_COMMON]) {
			expect(common).toContain('background: context if page.columns > 1 {');
		}
	});
});
