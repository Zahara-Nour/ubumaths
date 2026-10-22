/**
 * Test d'égalité `a = b` de la console (et de l'Atelier) : comparer passe par
 * `areEquivalent` (ADR 0006), pas par `normalize` seul, qui ignore les
 * identités lourdes (simplify-carte § 31 : `sin²x + cos²x = 1` répondait `false`).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function run(input: string) {
	return new WebReplEngine().execute(input);
}

describe('une identité est vraie', () => {
	it.each([
		'\\sin^2(x)+\\cos^2(x) = 1',
		'sin(x)^2+cos(x)^2=1',
		'\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}',
		'2^{x+1} = 2\\cdot 2^x',
		'\\frac{1}{\\cos^2(x)} = 1+\\tan^2(x)',
		'\\sin^2(2)+\\cos^2(2)=1'
	])('%s', (input) => {
		expect(run(input).output).toBe('true');
	});
});

describe('ce qui répondait déjà juste ne change pas', () => {
	it.each([
		['(x+1)^2 = x^2+2x+1', 'true'],
		['\\ln(e^x) = x', 'true'],
		['\\frac{x^2}{x} = x', 'true'],
		['\\sin^2(x)+\\cos^2(x) = 2', 'false'],
		['\\tan(x) = \\frac{\\cos(x)}{\\sin(x)}', 'false'],
		['2^{x+1} = 2^x', 'false'],
		['x+1 = x', 'false'],
		['1/2 = 0.5', 'true']
	])('%s : %s', (input, output) => {
		expect(run(input).output).toBe(output);
	});
});
