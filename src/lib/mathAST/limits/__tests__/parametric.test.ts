/**
 * V103 : le garde-fou des valeurs d'essai de `limits/parametric.ts`. La limite
 * annoncée doit être celle que le moteur calcule, la lettre remplacée par
 * chaque valeur d'essai admise : un essai qui rend une autre valeur, un autre
 * infini ou « pas de limite » fait refuser ; seul un refus du moteur est ignoré.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { infinity, number } from '../../factory';
import { limitAgreesOnSamples, limitParameterCondition } from '../parametric';

const ZERO = number('0');
const everyValue = () => true;

describe('limitAgreesOnSamples', () => {
	it('un essai hors de k = 0 qui contredit la réponse : désaccord (1/(x² + k) en 0 annoncé 1/k²)', () => {
		// k = −1 : la limite vaut −1, la réponse 1
		const agrees = limitAgreesOnSamples(
			parseLatex('\\frac{1}{x^2+k}'),
			'x',
			ZERO,
			'both',
			parseLatex('\\frac{1}{k^2}'),
			(assignment) => assignment.k !== 0
		);

		expect(agrees).toBe(false);
	});

	it('un essai sans limite : désaccord (x/(x² + k) en 0 annoncé 0, k = 0 compris)', () => {
		expect(
			limitAgreesOnSamples(parseLatex('\\frac{x}{x^2+k}'), 'x', ZERO, 'both', ZERO, everyValue)
		).toBe(false);
	});

	it('un essai qui rend l’autre infini : désaccord ((k − 1)/x en 0⁺ annoncé +∞)', () => {
		// k = −2 : −3/x → −∞
		expect(
			limitAgreesOnSamples(
				parseLatex('\\frac{k-1}{x}'),
				'x',
				ZERO,
				'right',
				infinity('positive'),
				everyValue
			)
		).toBe(false);
	});

	it('la bonne réponse : accord ((k² + 1)/x en 0⁺ → +∞)', () => {
		expect(
			limitAgreesOnSamples(
				parseLatex('\\frac{k^2+1}{x}'),
				'x',
				ZERO,
				'right',
				infinity('positive'),
				everyValue
			)
		).toBe(true);
	});
});

describe('limitParameterCondition', () => {
	it('x/(x² + k) en 0, limite 0 : la condition k ≠ 0', () => {
		expect(
			limitParameterCondition(parseLatex('\\frac{x}{x^2+k}'), 'x', ZERO, 'both', ZERO)
		).toEqual({ kind: 'when', latex: 'k \\neq 0', text: 'k ≠ 0' });
	});

	it('une réponse que les essais contredisent : refus (null)', () => {
		expect(
			limitParameterCondition(
				parseLatex('\\frac{1}{x^2+k}'),
				'x',
				ZERO,
				'both',
				parseLatex('\\frac{1}{k^2}')
			)
		).toBeNull();
	});
});
