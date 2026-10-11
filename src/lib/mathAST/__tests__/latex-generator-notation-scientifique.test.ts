/**
 * `toLatex` d'un nombre dont la chaîne est en notation scientifique JS
 * (`String(1e-7)` = '1e-7', `String(1e21)` = '1e+21') écrit une puissance de
 * 10, JAMAIS `1e-7` : depuis que le parseur LaTeX ne lit plus la notation
 * scientifique, `1e-7` se relirait 1·e − 7 (constante d'Euler).
 *
 * Le LaTeX produit doit se relire (parseLatex puis evaluate) à la même valeur.
 * La syntaxe custom, elle, lit `1e-7` : `toCustom` le garde tel quel.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex, parseCustom, toLatex, toCustom } from '../index';
import {
	PI,
	add,
	divide,
	multiply,
	number,
	opposite,
	percentage,
	power,
	subtract,
	variable
} from '../factory';
import { numericNode } from '../common/numeric';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import type { MathNode } from '../types';

const approx = (node: MathNode): number => evaluateNodeToApproximatedNumber(node);

const CASES: Array<{ value: number; latex: string }> = [
	{ value: 1e-7, latex: '10^{-7}' },
	{ value: 1e21, latex: '10^{21}' },
	{ value: 1.5e-7, latex: '1.5 \\times 10^{-7}' },
	{ value: -2.5e30, latex: '-2.5 \\times 10^{30}' }
];

describe('toLatex : un nombre en notation scientifique JS devient une puissance de 10', () => {
	for (const { value, latex } of CASES) {
		it(`${String(value)} s'écrit ${latex} et se relit à la même valeur`, () => {
			const node = numericNode(value);
			const tex = toLatex(node);
			expect(tex).toBe(latex);
			expect(tex).not.toMatch(/\de[+-]?\d/);
			const back = approx(parseLatex(tex));
			expect(Math.abs(back - value)).toBeLessThanOrEqual(Math.abs(value) * 1e-12);
		});
	}

	it('en base de puissance, la puissance de 10 est parenthésée', () => {
		const tex = toLatex(power(number('1e-7'), number('2')));
		expect(tex).not.toMatch(/\de[+-]?\d/);
		expect(approx(parseLatex(tex))).toBeCloseTo(1e-14, 25);
	});

	it('facteur implicite devant une variable : 3 × 10⁻⁷ · x se relit à l’identique', () => {
		const node = multiply(number('3e-7'), variable('x'), 'implicit');
		const tex = toLatex(node);
		expect(tex).not.toMatch(/\de[+-]?\d/);
		const back = parseLatex(tex);
		expect(toLatex(back)).toBe(tex);
	});

	it('mode metadata (spans colorés) : même règle', () => {
		const tex = toLatex(numericNode(1.5e-7), { renderMetadata: true });
		expect(tex).not.toMatch(/\de[+-]?\d/);
		expect(approx(parseLatex(tex))).toBeCloseTo(1.5e-7, 20);
	});

	it('un nombre ordinaire ne change pas', () => {
		expect(toLatex(number('0.001'))).toBe('0.001');
		expect(toLatex(number('123456.5'))).toBe('123456.5');
	});
});

// Le nombre réécrit (`mantisse × 10^k`) doit se relire à sa valeur QUEL QUE SOIT
// son contexte : avant, l'ancien tokenizer relisait juste `x / 2.5e-8` et
// `x 3e-7` ; la réécriture ne doit ni fausser la valeur, ni produire un refus.
// π joue le facteur non numérique (évaluable sans liaison).
const CONTEXTS: Array<{ name: string; build: (n: MathNode) => MathNode; smallOnly?: boolean }> = [
	{ name: 'seul', build: (n) => n },
	{ name: 'sous un opposé', build: (n) => opposite(n) },
	{ name: 'terme de droite d’une somme', build: (n) => add(PI, n) },
	{ name: 'terme de gauche d’une somme', build: (n) => add(n, PI) },
	{ name: 'terme de droite d’une différence', build: (n) => subtract(PI, n) },
	{ name: 'facteur implicite de droite', build: (n) => multiply(PI, n, 'implicit') },
	{ name: 'facteur implicite après un nombre', build: (n) => multiply(number('2'), n, 'implicit') },
	{ name: 'facteur implicite de gauche', build: (n) => multiply(n, PI, 'implicit') },
	{
		name: 'facteur implicite de gauche, nombre à droite',
		build: (n) => multiply(n, number('2'), 'implicit')
	},
	{ name: 'facteur × de droite', build: (n) => multiply(PI, n, 'cross') },
	{ name: 'facteur · de droite', build: (n) => multiply(PI, n, 'dot') },
	{ name: 'dénominateur d’une division en ligne', build: (n) => divide(PI, n, 'inline') },
	{ name: 'numérateur d’une division en ligne', build: (n) => divide(n, PI, 'inline') },
	{ name: 'dénominateur d’une fraction', build: (n) => divide(PI, n, 'fraction') },
	{ name: 'base d’une puissance', build: (n) => power(n, number('2')) },
	{ name: 'exposant', build: (n) => power(PI, n), smallOnly: true },
	{ name: 'pourcentage', build: (n) => percentage(n) }
];

describe('toLatex : le nombre réécrit se relit juste dans tout contexte', () => {
	for (const value of [1e-7, 1.5e-7, -2.5e30, 1e21]) {
		for (const { name, build, smallOnly } of CONTEXTS) {
			if (smallOnly && Math.abs(value) > 1) continue;
			it(`${String(value)} — ${name}`, () => {
				const tree = build(numericNode(value));
				const expected = approx(tree);
				const tex = toLatex(tree);
				expect(tex).not.toMatch(/\de[+-]?\d/);
				const back = approx(parseLatex(tex));
				expect(Math.abs(back - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-12);
			});
		}
	}
});

describe('toCustom garde la notation scientifique (la syntaxe custom la lit)', () => {
	for (const value of [1e-7, 1e21, 1.5e-7, -2.5e30]) {
		it(`${String(value)} : aller-retour custom juste`, () => {
			const src = toCustom(numericNode(value));
			const back = approx(parseCustom(src));
			expect(Math.abs(back - value)).toBeLessThanOrEqual(Math.abs(value) * 1e-12);
		});
	}
});
