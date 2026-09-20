/**
 * Les coefficients se regroupent sans que la forme factorisée soit développée.
 *
 * ⚠️ **Défaut mesuré, relevé en branchant la dérivation sur l'atelier.**
 *
 *   2*3*(x+1)^2   ->  2 \times 3 \times (x+1)^2
 *
 * Deux nombres ADJACENTS que `simplify` laissait tels quels. Sans le facteur
 * parenthésé — `2*3*x`, `3*sin(x)*2` — le regroupement se faisait très bien.
 *
 * CAUSE : le seul chemin qui regroupait les coefficients était `normalizePass`,
 * qui **développe** en même temps — `2*3*(x+1)^2` y devient `6x² + 12x + 6`.
 * La stratégie à point fixe de `simplify` juge cette forme plus chère et rejette
 * tout le résultat, coefficients compris.
 *
 * ⚠️ **La forme factorisée est ce qu'on veut garder** (dit par David) : c'est
 * elle qui permet d'étudier le signe d'une dérivée. La correction regroupe donc
 * les coefficients SANS toucher au reste.
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { toLatex } from '../../latex-generator';

function simplified(source: string): string {
	const parsed = parseCustomSafe(source);
	if (parsed.ast === undefined) throw new Error(`parse KO : ${source}`);
	return toLatex(simplify(parsed.ast).result).replace(/\s+/g, ' ').trim();
}

describe('les coefficients se regroupent devant un facteur parenthésé', () => {
	/**
	 * ⚠️ Le `\times` subsiste parce que l'entrée l'écrit : cette passe regroupe
	 * les coefficients, elle ne restyle pas la multiplication — c'est le travail
	 * de `removeMultOperatorAST`. Ce qui compte ici est que `2 × 3` soit devenu
	 * `6` sans que `(x+1)²` soit développé.
	 */
	it('deux nombres adjacents', () => {
		expect(simplified('2*3*(x+1)^2')).toBe('6 \\left( x + 1 \\right)^2');
	});

	it('deux nombres séparés par le facteur', () => {
		// ⚠️ Les deux nombres ne sont PAS adjacents dans l'arbre — `3 × (x+1)²`
		// puis `× 2`. C'est pour ce cas qu'une règle de réécriture par paires ne
		// suffisait pas : il faut aplatir le produit pour les réunir.
		expect(simplified('3*(x+1)^2*2')).toBe('6 \\left( x + 1 \\right)^2');
	});

	it('le cas qui a fait trouver le défaut', () => {
		// La dérivée de (x²+1)³, telle que `pedagogical-differentiation` la rend.
		// Ordre canonique de tidy : nombre, variables, puis puissances de sommes.
		expect(simplified('3*(x^2+1)^2*2*x')).toBe('6 x \\left( x^2 + 1 \\right)^2');
	});
});

describe('⚠️ la forme factorisée n’est PAS développée', () => {
	/**
	 * Le garde qui compte : c'est pour étudier le signe qu'on garde le produit.
	 * Développer `6(x+1)²` en `6x² + 12x + 6` perdrait les racines de vue.
	 */
	it('un carré parenthésé reste un carré parenthésé', () => {
		const result = simplified('2*3*(x+1)^2');

		expect(result).toContain('\\left( x + 1 \\right)^2');
		expect(result).not.toContain('12');
	});

	it('et celui de la dérivée aussi', () => {
		const result = simplified('3*(x^2+1)^2*2*x');

		expect(result).toContain('\\left( x^2 + 1 \\right)^2');
	});
});

describe('ce qui marchait continue de marcher', () => {
	it('sans facteur parenthésé', () => {
		expect(simplified('2*3*x')).toBe('6 x');
		expect(simplified('3*x*2')).toBe('6 x');
	});

	it('devant une fonction', () => {
		expect(simplified('3*sin(x)*2')).toBe('6 \\sin\\left( x \\right)');
	});

	it('un produit de nombres seuls', () => {
		expect(simplified('2*3')).toBe('6');
	});

	it('un coefficient unique ne bouge pas', () => {
		expect(simplified('3*(x+1)^2')).toBe('3 \\left( x + 1 \\right)^2');
	});
});
