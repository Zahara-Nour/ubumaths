/**
 * L76 (registre des écarts) : la limite (x + 1)/(πx) en +∞ restait exacte
 * (1/π) seulement parce que l'évaluateur flottant des limites
 * (`evaluateNumeric`, `common/numeric.ts`) ne lit ni π ni e. Le choix est
 * maintenant écrit dans L'Hôpital : deux limites finies exactes sans valeur
 * rationnelle donnent leur quotient exact.
 *
 * Ici, l'évaluateur est remplacé par un évaluateur qui LIT π et e (constantes
 * remplacées par leur valeur décimale avant l'évaluation) : la limite doit
 * rester exacte. Sans le choix écrit, elle rendait 0.3183098862 « approché ».
 */

import { describe, it, expect, vi } from 'vitest';
import type { MathNode } from '../../types';

// Pas d'import dans la fabrique du simulacre : `transforms` ou `factory`
// importent ce module à leur tour, et l'attente circulaire bloquait le test.
// Le nœud décimal vient de `numericNode` du module réel lui-même.
vi.mock('../../common/numeric', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../common/numeric')>();
	const withDecimalConstants = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(withDecimalConstants);
		if (value === null || typeof value !== 'object') return value;
		if ('type' in value && value.type === 'constant' && 'constant' in value) {
			return actual.numericNode(value.constant === 'pi' ? Math.PI : Math.E);
		}
		return Object.fromEntries(
			Object.entries(value).map(([key, child]) => [key, withDecimalConstants(child)])
		);
	};
	return {
		...actual,
		evaluateNumeric: (...[expr, ...rest]: Parameters<typeof actual.evaluateNumeric>) =>
			actual.evaluateNumeric(withDecimalConstants(expr) as MathNode, ...rest)
	};
});

const { evaluateLimit } = await import('../evaluate');
const { evaluateNumeric } = await import('../../common/numeric');
const { parseLatex } = await import('../../parser');
const { infinity } = await import('../../factory');
const { toLatex } = await import('../../latex-generator');

describe('L76 — limite exacte même quand l’évaluateur flottant lit π et e', () => {
	it('témoin : l’évaluateur de ce test lit π', () => {
		expect(evaluateNumeric(parseLatex('\\pi x'), 'x', 1)).toBeCloseTo(Math.PI);
	});

	it.each([
		['\\frac{x+1}{\\pi x}', '\\dfrac{1}{\\pi}'],
		['\\frac{x+1}{e x}', '\\dfrac{1}{\\exponentialE}'],
		['\\frac{3x+1}{2\\pi x}', '\\dfrac{3}{2 \\pi}']
	])('%s en +∞ → %s, exact', (latex, expected) => {
		const result = evaluateLimit(parseLatex(latex), 'x', infinity('positive'));
		expect(result.status).toBe('exact');
		expect(result.value === null ? null : toLatex(result.value)).toBe(expected);
	});
});
