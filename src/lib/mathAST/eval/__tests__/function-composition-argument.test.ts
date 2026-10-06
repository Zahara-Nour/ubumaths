/**
 * Substitution d'un appel dont l'argument contient le paramètre.
 *
 * ⚠️ Mesuré le 2026-10-06 : avec f(x) = sin(x), `f(2x)` devenait
 * `sin(1024x)` — le paramètre x était remplacé par 2x, puis le x de 2x
 * encore, dix fois (maxIterations). Le paramètre se remplace en UNE passe.
 */

import { describe, it, expect } from 'vitest';
import { substituteFunction } from '../function-bindings';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

const f = { f: { expression: parseLatex('\\sin(x)'), parameters: ['x'] } };
const p = { f: { expression: parseLatex('3x^2'), parameters: ['x'] } };

describe("substituteFunction : l'argument cite le paramètre", () => {
	it.each([
		['f(2x)', f, '\\sin\\left( 2 x \\right)'],
		['f(x+1)', f, '\\sin\\left( x + 1 \\right)'],
		['f(f(x))', f, '\\sin\\left( \\sin\\left( x \\right) \\right)']
	])('%s', (input, bindings, expected) => {
		expect(toLatex(substituteFunction(parseLatex(input), bindings))).toBe(expected);
	});

	it('f(2x) avec f(x) = 3x² vaut 3(2x)², pas 3(1024x)²', () => {
		const latex = toLatex(substituteFunction(parseLatex('f(2x)'), p));
		expect(latex).not.toContain('1024');
		expect(latex).not.toContain('4 x');
		expect(latex).toMatch(/^3 \\left\( 2 x \\right\)\^\{?2\}?$/);
	});
});
