/**
 * Une puissance d'exposant IRRATIONNEL (`2^{ln 1000 / ln 2}`) se calcule en
 * flottant, sans boucler.
 *
 * Mesuré le 2026-10-09 : l'exposant, converti en rationnel à partir d'un
 * flottant, a un dénominateur de l'ordre de 2⁵² ; `nonNegativeRationalPower`
 * cherchait la racine entière d'indice ce dénominateur (`integerNthRoot`, une
 * boucle de 2⁵² multiplications) — le processus ne rendait jamais la main.
 * C'est le zéro de `2^n − 1000` que le tableau de signes de `2^n > 1000`
 * réinjecte dans l'expression.
 */
import { describe, it, expect } from 'vitest';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { parseLatex } from '../../parser';

const value = (latex: string) => evaluateNodeToApproximatedNumber(parseLatex(latex));

describe('puissance d’exposant irrationnel', () => {
	it('2^{ln 1000 / ln 2} ≈ 1000', () => {
		expect(value('2^{\\frac{\\ln(1000)}{\\ln(2)}}')).toBeCloseTo(1000, 6);
	});

	it('0.8^{ln 0.1 / ln 0.8} ≈ 0.1', () => {
		expect(value('0.8^{\\frac{\\ln(0.1)}{\\ln(0.8)}}')).toBeCloseTo(0.1, 9);
	});

	// L'exact reste exact : un petit dénominateur garde la racine entière
	it('8^{2/3} = 4', () => {
		expect(value('8^{\\frac{2}{3}}')).toBe(4);
	});
});
