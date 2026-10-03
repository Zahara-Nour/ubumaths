import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST';
import { areEquivalent } from '$lib/math';

// `\le`, `\ge`, `\ne` (abréviations LaTeX, produites par MathLive) et les caractères
// `≤`, `≥`, `≠` : mêmes relations que `\leq`, `\geq`, `\neq`
const cases: [string, string][] = [
	['x^2+x\\le 2', 'x^2+x\\leq 2'],
	['x\\ge 3', 'x\\geq 3'],
	['x\\ne 1', 'x\\neq 1'],
	['x^2+x≤2', 'x^2+x\\leq 2'],
	['x≥3', 'x\\geq 3'],
	['x≠1', 'x\\neq 1'],
	['x\\le2', 'x\\leq 2'],
	['1\\le x\\le 3', '1\\leq x\\leq 3']
];

describe('relations abrégées et caractères ≤ ≥ ≠', () => {
	for (const [written, canonical] of cases) {
		it(`${written} = ${canonical}`, () => {
			expect(parseLatex(written)).toEqual(parseLatex(canonical));
		});
	}
	it('une réponse en \\le est équivalente à l’attendu en \\leqslant', () => {
		expect(areEquivalent('x^2+x\\le 2', 'x^2+x\\leqslant 2')).toBe(true);
	});
	it('les commandes voisines ne changent pas de sens (\\left, \\neg, \\geqslant)', () => {
		expect(() => parseLatex('\\left(x\\right)\\geqslant 0')).not.toThrow();
	});
});
