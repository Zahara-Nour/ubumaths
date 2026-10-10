/**
 * V7 — la LETTRE e tapée par l'élève est la constante d'Euler.
 *
 * Avant : `\ln(e^{x})` rendait `x \ln(e)` (e lue comme une variable),
 * `e^{\ln x}` restait tel quel en factoriser, et personne ne réduisait `\ln(e)`.
 * Les entrées sont PARSÉES (jamais fabriquées) : c'est la lecture de la lettre
 * qui est en cause.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { simplify } from '../../index';
import { generatePedagogicalSimplifySteps } from '../pipeline';

const CASES: Array<[string, string]> = [
	['\\ln(e^{x})', 'x'],
	['\\ln(e^{3x})', '3 x'],
	['e^{\\ln x}', 'x'],
	['\\ln(e)', '1'],
	['2\\ln(e)', '2'],
	['\\ln(e^2)', '2']
];

const INTENTS = ['auto', 'reduire', 'developper', 'factoriser'] as const;

describe('ln / exp avec la lettre e (constante d’Euler)', () => {
	for (const intent of INTENTS) {
		describe(`intention ${intent}`, () => {
			it.each(CASES)('%s → %s', (input, expected) => {
				const r = generatePedagogicalSimplifySteps(parseLatex(input), {
					intent,
					schoolLevel: 'lycee'
				});
				expect(toLatex(r.result)).toBe(expected);
			});
		});
	}

	describe('simplify()', () => {
		it.each(CASES)('%s → %s', (input, expected) => {
			expect(toLatex(simplify(parseLatex(input)).result)).toBe(expected);
		});
	});
});
