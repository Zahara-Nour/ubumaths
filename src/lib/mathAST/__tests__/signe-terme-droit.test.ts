/**
 * Deux signes ne se suivent pas, et le signe d'un opposé de somme ne se perd pas,
 * dans AUCUN des modes d'écriture.
 *
 * ⚠️ **Mesuré** (revues de #838) :
 * - en mode métadonnées (étapes pédagogiques), `2 · (−(x+2))` s'écrivait
 *   `2 \left( -x + 2 \right)` : le signe ne portait plus que sur x, la valeur
 *   changeait. Le mode normal écrivait `-\left( x + 2 \right)`.
 * - `a − (−b)` s'écrivait `a - -b` (snapshot de ∫x sin x :
 *   `x \left( -\cos(x) \right) - -\sin(x)`).
 *
 * Construits en interne (dérivée, intégration, tidy), ces nœuds n'ont pas de
 * délimiteur : c'est le générateur qui doit poser les parenthèses.
 */
import { describe, it, expect } from 'vitest';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { MathAST } from '../index';
import type { MathNode } from '../types';

const x = MathAST.variable('x');
const a = MathAST.variable('a');
const b = MathAST.variable('b');
const c = MathAST.variable('c');
const n = (v: string) => MathAST.number(v);

type Case = [label: string, build: () => MathNode, latex: string, custom: string];

const fixed: Case[] = [
	[
		'2 · (−(x+2))',
		() => MathAST.multiply(n('2'), MathAST.opposite(MathAST.add(x, n('2'))), 'implicit'),
		'2 \\left( -\\left( x + 2 \\right) \\right)',
		'2*(-(x+2))'
	],
	[
		'x · (−(x−1))',
		() => MathAST.multiply(x, MathAST.opposite(MathAST.subtract(x, n('1'))), 'implicit'),
		'x \\left( -\\left( x - 1 \\right) \\right)',
		'x*(-(x-1))'
	],
	['a − (−b)', () => MathAST.subtract(a, MathAST.opposite(b)), 'a - \\left( -b \\right)', 'a-(-b)'],
	[
		'x − (−sin x)',
		() => MathAST.subtract(x, MathAST.opposite(MathAST.sin(x))),
		'x - \\left( -\\sin\\left( x \\right) \\right)',
		'x-(-sin(x))'
	],
	[
		'3 − (−2)',
		() => MathAST.subtract(n('3'), MathAST.opposite(n('2'))),
		'3 - \\left( -2 \\right)',
		'3-(-2)'
	],
	['a + (−b)', () => MathAST.add(a, MathAST.opposite(b)), 'a + \\left( -b \\right)', 'a+(-b)']
];

const unchanged: Case[] = [
	['a − b', () => MathAST.subtract(a, b), 'a - b', 'a-b'],
	[
		'−(x+2) seul',
		() => MathAST.opposite(MathAST.add(x, n('2'))),
		'-\\left( x + 2 \\right)',
		'-(x+2)'
	],
	[
		'2(x+2)',
		() => MathAST.multiply(n('2'), MathAST.add(x, n('2')), 'implicit'),
		'2 \\left( x + 2 \\right)',
		'2(x+2)'
	],
	['−2x', () => MathAST.multiply(MathAST.opposite(n('2')), x, 'implicit'), '-2 x', '-2x'],
	[
		'a − (b + c)',
		() => MathAST.subtract(a, MathAST.add(b, c)),
		'a - \\left( b + c \\right)',
		'a-(b+c)'
	]
];

describe.each([
	['corrigés', fixed],
	['témoins inchangés', unchanged]
])('signe à droite — %s', (_group, cases) => {
	it.each(cases)('%s : LaTeX, mode normal', (_label, build, latex) => {
		expect(toLatex(build())).toBe(latex);
	});

	it.each(cases)('%s : LaTeX, mode métadonnées', (_label, build, latex) => {
		expect(toLatex(build(), { renderMetadata: true })).toBe(latex);
	});

	it.each(cases)('%s : syntaxe texte, mode normal', (_label, build, _latex, custom) => {
		expect(toCustom(build())).toBe(custom);
	});

	it.each(cases)('%s : syntaxe texte, mode métadonnées', (_label, build, _latex, custom) => {
		expect(toCustom(build(), { renderMetadata: true })).toBe(custom);
	});
});

describe('signe à droite — mode métadonnées coloré', () => {
	// Les parenthèses posées par le générateur appartiennent à l'opposé et prennent
	// sa couleur, comme celles d'un délimiteur coloré (extended-metadata.test.ts).
	it('le signe coloré d’un opposé de somme reste devant la parenthèse', () => {
		const expr = MathAST.multiply(
			n('2'),
			MathAST.opposite(MathAST.add(x, n('2')), { color: 'red' }),
			'implicit'
		);
		expect(toLatex(expr, { renderMetadata: true })).toBe(
			'2 \\left( \\textcolor{red}{-\\left( }x + 2\\textcolor{red}{ \\right)} \\right)'
		);
	});
});
