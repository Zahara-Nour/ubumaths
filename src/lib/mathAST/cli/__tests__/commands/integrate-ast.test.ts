/**
 * `.integrate` : `ast` porte le RÉSULTAT de la commande — la primitive, ou la
 * VALEUR d'une intégrale définie (exacte, ou approchée avec `--numeric`).
 * L'atelier le rend en LaTeX (2026-10-08) ; avant, une intégrale définie
 * portait sa primitive.
 */

import { describe, it, expect } from 'vitest';
import { IntegrateCommand } from '../../commands/integrate.command';
import { toLatex } from '../../../latex-generator';
import type { CommandContext } from '../../types';

function integrate(input: string, options: CommandContext['options'] = {}) {
	return new IntegrateCommand().execute({ input, format: 'custom', options, isRepl: true });
}

describe('.integrate : ast = résultat', () => {
	it('primitive', () => {
		const result = integrate('x^2');
		expect(result.ast && toLatex(result.ast)).toBe('\\dfrac{1}{3} x^3');
	});

	it('intégrale définie exacte : la valeur, pas la primitive', () => {
		const result = integrate('x^2 0 1');
		expect(result.ast && toLatex(result.ast)).toBe('\\dfrac{1}{3}');
	});

	it('intégrale définie approchée (--numeric) : la valeur décimale', () => {
		const result = integrate('e^(x^2) 0 1', { numeric: true });
		expect(result.success).toBe(true);
		expect(result.ast && toLatex(result.ast)).toMatch(/^1[.,]46/);
	});
});
