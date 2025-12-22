/**
 * Tests for French decimal formatting integration in math-utils
 *
 * @module components/markdown/utils/__tests__/math-utils-french.test
 */

import { describe, it, expect } from 'vitest';
import { expressionToLatex } from '../math-utils';

describe('expressionToLatex - French decimal formatting', () => {
	describe('custom syntax', () => {
		it('convertit 3.14 en 3{,}14', () => {
			const result = expressionToLatex('3.14', 'custom');
			expect(result).toBe('3{,}14');
		});

		it('convertit les entrées avec virgule française (3,14) en 3{,}14', () => {
			// Le tokenizer normalise la virgule en point, puis toFrenchDecimal reconvertit
			const result = expressionToLatex('3,14', 'custom');
			expect(result).toBe('3{,}14');
		});

		it('formate les grands nombres avec espaces', () => {
			const result = expressionToLatex('1234567', 'custom');
			expect(result).toBe('1\\,234\\,567');
		});

		it('formate les décimaux avec espaces', () => {
			const result = expressionToLatex('3.14159', 'custom');
			expect(result).toBe('3{,}141\\,59');
		});

		it('préserve les expressions mathématiques', () => {
			const result = expressionToLatex('x + 3.14', 'custom');
			expect(result).toContain('3{,}14');
		});

		it('formate les fractions correctement', () => {
			const result = expressionToLatex('3.14/2', 'custom');
			expect(result).toContain('3{,}14');
		});
	});

	describe('latex syntax', () => {
		it('convertit les décimaux existants', () => {
			const result = expressionToLatex('3.14', 'latex');
			expect(result).toBe('3{,}14');
		});

		it('préserve les commandes LaTeX', () => {
			const result = expressionToLatex('\\frac{3.14}{2}', 'latex');
			expect(result).toBe('\\frac{3{,}14}{2}');
		});

		it('formate les grands nombres', () => {
			const result = expressionToLatex('1234567', 'latex');
			expect(result).toBe('1\\,234\\,567');
		});
	});

	describe('cas limites', () => {
		it('retourne une erreur formatée pour syntaxe invalide', () => {
			// Parenthèse non fermée - syntaxe vraiment invalide
			const result = expressionToLatex('(3 +', 'custom');
			expect(result).toContain('\\textcolor{red}');
		});

		it('gère les expressions vides', () => {
			const result = expressionToLatex('', 'latex');
			expect(result).toBe('');
		});

		it('ne formate pas les petits entiers', () => {
			const result = expressionToLatex('42', 'custom');
			expect(result).toBe('42');
		});
	});
});
