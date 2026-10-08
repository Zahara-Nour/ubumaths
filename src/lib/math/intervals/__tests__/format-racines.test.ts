/**
 * Bornes écrites avec l'indice de leur racine (revues du 2026-10-08) :
 * ∛4 s'écrivait √4, ⁵√2 s'écrivait sqrt(2) — lus comme des racines carrées.
 */
import { describe, it, expect } from 'vitest';
import { formatEndpointValue } from '../format';
import { parseLatex } from '$lib/mathAST/parser';

describe('formatEndpointValue — indice des racines', () => {
	it.each([
		['\\sqrt{2}', '√2'],
		['\\sqrt[3]{4}', '∛4'],
		['3\\sqrt[3]{4}', '3*∛4'],
		['\\sqrt[4]{2}', '∜2'],
		['\\sqrt[5]{2}', 'sqrt[5](2)'],
		['2\\sqrt[5]{2}', '2*sqrt[5](2)'],
		['\\log_{2}(3)', 'log_2(3)']
	])('%s → %s', (latex, expected) => {
		expect(formatEndpointValue(parseLatex(latex))).toBe(expected);
	});
});
