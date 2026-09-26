/**
 * Tests for French Number Formatting
 *
 * @module utils/french-math.test
 */

import { describe, it, expect } from 'vitest';
import { toFrenchDecimal } from '../french-math';

describe('toFrenchDecimal', () => {
	describe('conversion basique point → virgule', () => {
		it('convertit le point en virgule pour les décimaux simples', () => {
			expect(toFrenchDecimal('3.14')).toBe('3{,}14');
		});

		it('laisse les entiers < 4 chiffres inchangés', () => {
			expect(toFrenchDecimal('42')).toBe('42');
			expect(toFrenchDecimal('123')).toBe('123');
		});

		it('gère les nombres négatifs', () => {
			expect(toFrenchDecimal('-3.14')).toBe('-3{,}14');
		});

		it('gère les nombres avec zéro initial', () => {
			expect(toFrenchDecimal('0.5')).toBe('0{,}5');
		});
	});

	describe('formatage avec espaces (≥ 4 chiffres)', () => {
		it('ajoute des espaces aux entiers ≥ 4 chiffres', () => {
			expect(toFrenchDecimal('1234')).toBe('1\\,234');
			expect(toFrenchDecimal('1234567')).toBe('1\\,234\\,567');
		});

		it("n'ajoute pas d'espaces aux entiers < 4 chiffres", () => {
			expect(toFrenchDecimal('123')).toBe('123');
		});

		it('ajoute des espaces à la partie décimale ≥ 4 chiffres', () => {
			expect(toFrenchDecimal('3.1415')).toBe('3{,}141\\,5');
			expect(toFrenchDecimal('3.14159265')).toBe('3{,}141\\,592\\,65');
		});

		it("n'ajoute pas d'espaces à la partie décimale < 4 chiffres", () => {
			expect(toFrenchDecimal('3.14')).toBe('3{,}14');
			expect(toFrenchDecimal('3.141')).toBe('3{,}141');
		});

		it('formate correctement quand partie entière ET décimale ≥ 4 chiffres', () => {
			expect(toFrenchDecimal('1234567.89012345')).toBe('1\\,234\\,567{,}890\\,123\\,45');
		});

		it('formate partie entière ≥ 4 chiffres avec partie décimale < 4 chiffres', () => {
			expect(toFrenchDecimal('1234.5')).toBe('1\\,234{,}5');
			expect(toFrenchDecimal('1234.56')).toBe('1\\,234{,}56');
		});

		it('formate partie décimale ≥ 4 chiffres avec partie entière < 4 chiffres', () => {
			expect(toFrenchDecimal('3.14159')).toBe('3{,}141\\,59');
		});
	});

	describe('option formatSpaces: false', () => {
		it("ne met pas d'espaces mais convertit la virgule", () => {
			expect(toFrenchDecimal('1234.56', { formatSpaces: false })).toBe('1234{,}56');
		});

		it('laisse les entiers inchangés même grands', () => {
			expect(toFrenchDecimal('1234567', { formatSpaces: false })).toBe('1234567');
		});
	});

	describe('préservation LaTeX', () => {
		it('ne modifie pas les commandes LaTeX', () => {
			expect(toFrenchDecimal('\\alpha')).toBe('\\alpha');
		});

		it('gère les fractions', () => {
			expect(toFrenchDecimal('\\frac{3.14}{2}')).toBe('\\frac{3{,}14}{2}');
		});

		it('gère les exposants', () => {
			expect(toFrenchDecimal('x^{3.14}')).toBe('x^{3{,}14}');
		});

		it('gère les racines', () => {
			expect(toFrenchDecimal('\\sqrt{3.14}')).toBe('\\sqrt{3{,}14}');
		});

		it('ne modifie pas les nombres dans les commandes comme frac123', () => {
			// Numbers immediately after command letters should not be modified
			expect(toFrenchDecimal('\\log10')).toBe('\\log10');
		});

		it('convertit les nombres après \\times', () => {
			expect(toFrenchDecimal('1.2\\times3.4')).toBe('1{,}2\\times3{,}4');
			expect(toFrenchDecimal('\\times3.14')).toBe('\\times3{,}14');
		});

		it('convertit les nombres après \\div', () => {
			expect(toFrenchDecimal('10.5\\div2.5')).toBe('10{,}5\\div2{,}5');
		});

		it('convertit les nombres après \\cdot', () => {
			expect(toFrenchDecimal('1.5\\cdot2.5')).toBe('1{,}5\\cdot2{,}5');
		});

		it('convertit les nombres après \\pm et \\mp', () => {
			expect(toFrenchDecimal('3.14\\pm0.01')).toBe('3{,}14\\pm0{,}01');
			expect(toFrenchDecimal('5\\mp2.5')).toBe('5\\mp2{,}5');
		});

		it('convertit les nombres après les opérateurs de comparaison', () => {
			expect(toFrenchDecimal('x\\leq3.5')).toBe('x\\leq3{,}5');
			expect(toFrenchDecimal('y\\geq1.2')).toBe('y\\geq1{,}2');
		});

		it('convertit les entiers ≥ 4 chiffres après les opérateurs', () => {
			expect(toFrenchDecimal('x\\times1234')).toBe('x\\times1\\,234');
			expect(toFrenchDecimal('y\\div12345')).toBe('y\\div12\\,345');
		});

		it('préserve les expressions complexes', () => {
			expect(toFrenchDecimal('x = 3.14 + \\frac{1234.5}{2}')).toBe(
				'x = 3{,}14 + \\frac{1\\,234{,}5}{2}'
			);
		});
	});

	describe('cas limites', () => {
		it('gère les chaînes vides', () => {
			expect(toFrenchDecimal('')).toBe('');
		});

		it('gère les chaînes sans nombres', () => {
			expect(toFrenchDecimal('x + y')).toBe('x + y');
		});

		it('gère plusieurs nombres dans une expression', () => {
			expect(toFrenchDecimal('3.14 + 2.71')).toBe('3{,}14 + 2{,}71');
		});

		it('gère les nombres dans des accolades', () => {
			expect(toFrenchDecimal('{3.14}')).toBe('{3{,}14}');
		});

		it('gère les nombres après des opérateurs', () => {
			expect(toFrenchDecimal('x = 3.14')).toBe('x = 3{,}14');
			expect(toFrenchDecimal('y + 1234')).toBe('y + 1\\,234');
		});
	});

	// Constaté le 2026-09-25 (fiches de probabilités) : un décimal écrit avec la virgule
	// LaTeX, `0{,}0484`, s'affichait « 0,0 484 » (écran et PDF). La virgule coupait le
	// nombre en deux et « 0484 » était groupé comme un entier, depuis la droite.
	describe('virgule LaTeX {,} déjà présente', () => {
		it('groupe les décimales depuis la gauche, comme après un point', () => {
			expect(toFrenchDecimal('1-0{,}0484')).toBe('1-0{,}048\\,4');
			expect(toFrenchDecimal('0{,}5625')).toBe('0{,}562\\,5');
		});

		it('laisse intacte une partie décimale de moins de 4 chiffres', () => {
			expect(toFrenchDecimal('0{,}105')).toBe('0{,}105');
		});

		it('rend le même résultat que la notation à point, et reste stable si réappliqué', () => {
			expect(toFrenchDecimal('0{,}0484')).toBe(toFrenchDecimal('0.0484'));
			const once = toFrenchDecimal('0.0484');
			expect(toFrenchDecimal(once)).toBe(once);
		});
	});
});

// Couleurs des corrections (`\textcolor{#FF5722}{…}`) : les chiffres d'un code couleur
// ne sont pas un nombre. Groupés (`#FF5\,722`, `#2\,196F3`), la couleur devenait invalide.
describe('toFrenchDecimal — codes couleur', () => {
	it.each([
		['\\textcolor{#FF5722}{3}', '\\textcolor{#FF5722}{3}'],
		['3 \\textcolor{#2196F3}{\\times 9}', '3 \\textcolor{#2196F3}{\\times 9}'],
		['\\color{#4CAF50} 12', '\\color{#4CAF50} 12'],
		['\\textcolor{#FF5722}{8000} + 1234.5', '\\textcolor{#FF5722}{8\\,000} + 1\\,234{,}5']
	])('%s', (input, expected) => {
		expect(toFrenchDecimal(input)).toBe(expected);
	});
});
