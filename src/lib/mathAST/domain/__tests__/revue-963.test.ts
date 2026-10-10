/**
 * Retours de la revue de #963 (domaine exact).
 *
 * 1. x^x en 0⁺ : la branche restreint le domaine à x > 0 (convention
 *    x^a = e^{a ln x}) ; main trouvait 1 par substitution directe de 0^0.
 *    La limite doit aboutir par xˣ = e^{x ln x}, x ln x → 0.
 * 2. Un domaine NON RÉSOLU (`unresolved`) ne s'affiche nulle part comme un
 *    domaine : `.variations` et `analyzeSign` refusent.
 * 3. `.variations` écrit ses bornes comme le domaine (`1/2`, `-√2`), jamais
 *    avec le séparateur interne `:/` de la notation custom.
 * 4. `log2`, `log10` : un dénominateur qui s'annule en 1, comme ln.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { evaluateLimit } from '$lib/mathAST/limits/evaluate';
import { analyzeSign } from '$lib/mathAST/sign';
import { parseLatex } from '$lib/mathAST/parser';
import { toLatex } from '$lib/mathAST/latex-generator';
import { computeDomain } from '../compute';
import { formatInterval } from '../format';
import { fraction, func, number, variable } from '../../factory';

function run(command: string): { success: boolean; output: string; code?: string } {
	const result = new WebReplEngine().execute(command);
	return {
		success: result.success,
		// eslint-disable-next-line no-control-regex -- couleurs de chalk
		output: result.output.replace(/\u001b\[[0-9;]*m/g, ''),
		...(result.error?.code !== undefined && { code: result.error.code })
	};
}

function limitLatex(latex: string): string {
	const result = evaluateLimit(parseLatex(latex));
	return result.value === null ? `(${result.status})` : toLatex(result.value);
}

describe('1. limites de u^v par e^{v ln u}', () => {
	it.each([
		['\\lim_{x\\to 0^+} x^x', '1'],
		['\\lim_{x\\to 0} x^x', '1'],
		['\\lim_{x\\to +\\infty} x^x', '+\\infty'],
		['\\lim_{x\\to +\\infty} x^{\\frac{1}{x}}', '1'],
		['\\lim_{x\\to 0^+} x^{2x}', '1']
	])('%s = %s', (latex, expected) => {
		expect(limitLatex(latex)).toBe(expected);
	});

	it('`.variations x^x` : lim en 0⁺ = 1, en +∞ = +∞', () => {
		const result = run('.variations x^x');
		expect(result.output).toContain('lim (x → 0⁺) f(x) = 1');
		expect(result.output).not.toContain('indétermin');
	});
});

describe('2. domaine non résolu : refus, jamais un domaine', () => {
	it.each(['sqrt(sin(x))', 'tan(x)+1/x'])('`.variations %s` refuse', (expression) => {
		const result = run(`.variations ${expression}`);
		expect(result.success).toBe(false);
		expect(result.code).toBe('DOMAIN_UNRESOLVED');
		expect(result.output).not.toContain('Domaine');
	});

	it('analyzeSign(√(sin x)) refuse', () => {
		expect(() => analyzeSign(parseLatex('\\sqrt{\\sin(x)}'), { variable: 'x' })).toThrow(
			/domaine/i
		);
	});

	it('un domaine résolu passe toujours (garde-fou)', () => {
		expect(run('.variations 1/(2x-1)').success).toBe(true);
		expect(() => analyzeSign(parseLatex('\\frac{1}{2x-1}'), { variable: 'x' })).not.toThrow();
	});
});

describe('3. `.variations` : bornes exactes sans `:/`', () => {
	it.each([
		['1/(2x-1)', 'lim (x → 1/2⁻)'],
		['1/(3x+2)', 'lim (x → -2/3⁻)'],
		['1/(x^2-2)', 'lim (x → -√2⁻)'],
		['ln(2x-1)', ']1/2 ; +∞[']
	])('`.variations %s` contient « %s »', (expression, expected) => {
		// L'écho de la saisie (« Expression : 1:/(2x-1) ») garde la notation
		// custom ; les bornes, non
		const output = run(`.variations ${expression}`)
			.output.split('\n')
			.filter((line) => !line.startsWith('Expression :') && !line.startsWith('Dérivée :'))
			.join('\n');
		expect(output).toContain(expected);
		expect(output).not.toContain(':/');
	});
});

describe('4. log2 / log10 au dénominateur', () => {
	it.each(['log2', 'log10'])('1/%s(x) : ]0 ; +∞[ \\ {1}', (name) => {
		const node = fraction(number('1'), func(name, [variable('x')]));
		const result = computeDomain(node, 'x');
		expect(result.unresolved).toBeUndefined();
		expect(formatInterval(result.domain)).toBe(']0 ; +∞[ \\ {1}');
	});
});
