/**
 * Case « primitive » (`answerKind: 'primitive'`) : verdict seul, sans la chaîne
 * de validation (voir questions/__tests__/calculus-answer-wiring.test.ts).
 * Comportements validés par David (Phase 0, 2026-10-04).
 */

import { describe, it, expect } from 'vitest';
import {
	judgePrimitiveAnswer,
	readExpectedPrimitive,
	PRIMITIVE_FEEDBACK
} from '../primitive-answer';

const F = { integrand: '3x^2' };

describe('judgePrimitiveAnswer — f = 3x²', () => {
	it.each([
		['x^3', 'correct'],
		['x^3+5', 'correct'],
		['x^3-\\frac{1}{2}', 'correct'],
		['x^3+C', 'correct'],
		['x^3+K', 'correct'],
		['x^3+k', 'correct'],
		['x^3+\\lambda', 'correct'],
		['F(x)=x^3+C', 'correct'],
		['\\frac{3x^3}{3}', 'correct'],
		['3x^3', 'incorrect'],
		['x^3+x', 'incorrect'],
		['6x', 'incorrect'],
		['x^{3', 'incorrect'],
		['', 'empty'],
		['  ', 'empty']
	] as const)('%s → %s', (answer, status) => {
		expect(judgePrimitiveAnswer(answer, F).status).toBe(status);
	});

	it('la dérivée de f : message dédié', () => {
		expect(judgePrimitiveAnswer('6x', F)).toEqual({
			status: 'incorrect',
			feedback: PRIMITIVE_FEEDBACK.derivative
		});
		expect(PRIMITIVE_FEEDBACK.derivative).toBe("C'est la dérivée de f, pas une primitive.");
	});

	it('3x³ : faux sans message', () => {
		expect(judgePrimitiveAnswer('3x^3', F)).toEqual({ status: 'incorrect' });
	});

	it('variable déclarée : t', () => {
		expect(judgePrimitiveAnswer('t^3+C', { integrand: '3t^2', variable: 't' }).status).toBe(
			'correct'
		);
		// x est alors une constante
		expect(judgePrimitiveAnswer('x^3', { integrand: '3t^2', variable: 't' }).status).toBe(
			'incorrect'
		);
	});
});

describe('intervalle déclaré — f = 1/x', () => {
	const INVERSE = { integrand: '\\frac{1}{x}', interval: ']0;+\\infty[' };

	it.each([
		['\\ln(x)', 'correct'],
		['\\ln x+C', 'correct'],
		['\\ln|x|', 'correct'],
		['\\ln\\left|x\\right|', 'correct'],
		['\\ln(-x)', 'incorrect']
	] as const)('%s → %s', (answer, status) => {
		expect(judgePrimitiveAnswer(answer, INVERSE).status).toBe(status);
	});

	it('sur ]-∞;0[ : ln(-x) juste, ln(x) faux', () => {
		const negative = { integrand: '\\frac{1}{x}', interval: ']-\\infty;0[' };
		expect(judgePrimitiveAnswer('\\ln(-x)', negative).status).toBe('correct');
		expect(judgePrimitiveAnswer('\\ln(x)', negative).status).toBe('incorrect');
	});
});

describe('readExpectedPrimitive (specs de test du modèle)', () => {
	it('attendue juste : ok', () => {
		expect(readExpectedPrimitive('x^3', F)).toEqual({ ok: true });
	});

	it('attendue qui n’est pas une primitive : erreur', () => {
		const result = readExpectedPrimitive('x^4', F);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/primitive/);
	});

	it('fonction à intégrer absente ou illisible : erreur', () => {
		expect(readExpectedPrimitive('x^3', {}).ok).toBe(false);
		expect(readExpectedPrimitive('x^3', { integrand: '3x^{' }).ok).toBe(false);
	});

	it('intervalle illisible : erreur', () => {
		expect(readExpectedPrimitive('x^3', { ...F, interval: '0;1' }).ok).toBe(false);
	});
});
