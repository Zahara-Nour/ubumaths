/**
 * Portée de `\lim` sans parenthèses (décision de David, 2026-10-07).
 *
 * Comme un élève la lit, `\lim_{x\to a}` porte sur TOUTE l'expression qui
 * suit. L'argument s'arrête :
 * - à la fin de l'expression ou du groupe englobant (`}`, `)`, `\right`…) ;
 * - devant un opérateur de relation (`=`, `<`, `>`, `\le`, `\ge`, `\neq`,
 *   `\approx`…) : `\lim_{x\to1}x^2=1` est une égalité dont le membre de
 *   gauche est la limite de x² ;
 * - devant une virgule ou un `;` (déjà sans puissance de liaison) ;
 * - devant un opérateur binaire (`+`, `-`, `\times`, `\cdot`, `*`, `/`, `:`,
 *   `\div`) immédiatement suivi d'un autre `\lim` : `\lim A + \lim B` reste
 *   lim(A) + lim(B), `\lim A \times \lim B` reste lim(A) × lim(B).
 *
 * Les parenthèses explicites `(\lim …) + 1` gardent leur sens. Les deux
 * parseurs (Pratt et RD) doivent rendre le même arbre.
 */

import { describe, it, expect } from 'vitest';
import { parsePratt } from '../parser-pratt';
import { parseRD } from '../parser-rd';
import { toLatex } from '../../../latex-generator';
import { MathAST } from '../../../factory';
import type { MathNode } from '../../../types';

const PARSERS: ReadonlyArray<readonly [string, (latex: string) => MathNode]> = [
	['Pratt', parsePratt],
	['RD', parseRD]
];

/** Squelette lisible : `lim(corps)` pour une limite, type + enfants sinon. */
function shape(node: MathNode): string {
	switch (node.type) {
		case 'limit':
			return `lim(${shape(node.expression)})`;
		case 'addition':
			return `add(${shape(node.left)}, ${shape(node.right)})`;
		case 'subtraction':
			return `sub(${shape(node.left)}, ${shape(node.right)})`;
		case 'multiplication':
			return `mul(${shape(node.left)}, ${shape(node.right)})`;
		case 'division':
			return `div(${shape(node.numerator)}, ${shape(node.denominator)})`;
		case 'relation':
			return `rel${node.relation}(${shape(node.left)}, ${shape(node.right)})`;
		case 'delimiter':
			return `(${shape(node.content)})`;
		default:
			return toLatex(node).replace(/\s+/g, '');
	}
}

describe.each(PARSERS)('portée de \\lim — parseur %s', (_name, parse) => {
	it.each([
		['\\lim_{x\\to+\\infty}3x^2-5x+1', 'lim(add(sub(mul(3, x^2), mul(5, x)), 1))'],
		['\\lim_{x\\to+\\infty}\\sqrt{x^2+1}-x', 'lim(sub('],
		['\\lim_{x\\to 0}\\frac{\\sin x}{x}+1', 'lim(add('],
		['\\lim_{x\\to1}x^2=1', 'rel=(lim(x^2), 1)'],
		['\\lim_{x\\to0}x+\\lim_{x\\to0}x^2', 'add(lim(x), lim(x^2))'],
		['\\lim_{x\\to0}x-\\lim_{x\\to0}x^2', 'sub(lim(x), lim(x^2))'],
		['\\lim_{x\\to0}(x+1)\\times\\lim_{x\\to0}x^2', 'mul(lim((add(x, 1))), lim(x^2))'],
		['\\lim_{x\\to0}(x+1)\\cdot\\lim_{x\\to0}x^2', 'mul(lim((add(x, 1))), lim(x^2))'],
		['(\\lim_{x\\to0}x)+1', 'add((lim(x)), 1)'],
		['\\left(\\lim_{x\\to0}x\\right)+1', 'add((lim(x)), 1)'],
		[
			'\\lim_{x\\to+\\infty}f(x)=\\lim_{x\\to+\\infty}2x^{3}=+\\infty',
			'rel=(rel=(lim(mul(f, (x))), lim(mul(2, x^3))), +\\infty)'
		],
		['\\lim_{n\\to+\\infty}u_n=0', 'rel=(lim(u_n), 0)'],
		[
			'\\lim_{n\\to\\infty}\\left(\\frac{1}{n+1}\\right)+\\lim_{n\\to\\infty}\\left(\\frac{1}{n}\\right)',
			'add(lim((div('
		]
	])('%s', (latex, expected) => {
		expect(shape(parse(latex))).toContain(expected);
	});

	it('\\lim A + \\lim B : deux limites, pas une limite imbriquée', () => {
		const node = parse('\\lim_{x\\to0}x+\\lim_{x\\to0}x^2');
		expect(node.type).toBe('addition');
	});

	it.each([
		['\\lim_{x\\to0}\\frac{x}{2}\\lim_{x\\to1}x', 'mul(lim(div(x, 2)), lim(x))'],
		['\\lim_{x\\to0}x\\lim_{x\\to0}x', 'mul(lim(x), lim(x))']
	])('juxtaposition %s : un autre \\lim arrête la portée, comme \\cdot', (latex, expected) => {
		expect(shape(parse(latex))).toBe(expected);
	});

	it('une limite dans un groupe ne déborde pas du groupe', () => {
		expect(shape(parse('\\frac{\\lim_{x\\to0}x+1}{2}'))).toBe('div(lim(add(x, 1)), 2)');
	});

	it('une somme dans un groupe garde ses termes, même suivis de \\lim', () => {
		expect(shape(parse('\\lim_{x\\to0}\\frac{1+\\lim_{y\\to0}y}{2}'))).toBe(
			'lim(div(add(1, lim(y)), 2))'
		);
	});

	it('Pratt et RD rendent le même arbre', () => {
		const cases = [
			'\\lim_{x\\to+\\infty}3x^2-5x+1',
			'\\lim_{x \\to +\\infty } 2 - \\dfrac{3}{\\ln(x)}+\\frac{1}{x}',
			'\\lim_{x\\to0}x+\\lim_{x\\to0}x^2=0'
		];
		for (const latex of cases) {
			expect(shape(parse(latex))).toBe(shape(parsePratt(latex)));
		}
	});
});

describe('LaTeX régénéré : la portée de \\lim survit à l’aller-retour', () => {
	const limitOfX = MathAST.limit(MathAST.variable('x'), 'x', MathAST.number('0'), 'both');

	it.each([
		['lim(x) + 1', MathAST.add(limitOfX, MathAST.number('1')), 'add((lim(x)), 1)'],
		['lim(x) − 1', MathAST.subtract(limitOfX, MathAST.number('1')), 'sub((lim(x)), 1)'],
		['lim(x) · 2', MathAST.multiply(limitOfX, MathAST.number('2'), 'dot'), 'mul((lim(x)), 2)']
	])('%s construit en interne garde sa portée', (_label, node, expected) => {
		expect(shape(parsePratt(toLatex(node)))).toBe(expected);
		// Rendu avec métadonnées (couleurs) : même parenthésage
		expect(shape(parsePratt(toLatex(node, { renderMetadata: true })))).toBe(expected);
	});

	it.each([
		'\\lim_{x\\to+\\infty} x^2+3x+1',
		'\\lim_{n\\to+\\infty}3\\sqrt{n}=+\\infty',
		'\\lim_{n\\to\\infty}\\left(\\frac{1}{n+1}\\right)+\\lim_{n\\to\\infty}\\left(\\frac{1}{n}\\right)=0',
		'\\lim_{x\\to+\\infty}f(x)=\\lim_{x\\to+\\infty}2x^{3}=+\\infty',
		'\\lim_{x \\to +\\infty } 2 - \\dfrac{3}{\\ln(x)}+\\frac{1}{x}',
		'\\lim_{n\\to+\\infty}u_n=2',
		'\\lim_{x\\to0}x+\\lim_{x\\to0}x^2'
	])('contenu en production %s : même arbre, aucune parenthèse ajoutée', (latex) => {
		const node = parsePratt(latex);
		const regenerated = toLatex(node);
		expect(shape(parsePratt(regenerated))).toBe(shape(node));
		expect(regenerated.match(/\\left\(/g)?.length ?? 0).toBe(
			latex.match(/\\left\(|\(/g)?.length ?? 0
		);
	});
});

/** Même squelette, délimiteurs effacés : le parenthésage ajouté au rendu est permis. */
function bareShape(node: MathNode): string {
	switch (node.type) {
		case 'limit':
			return `lim(${bareShape(node.expression)})`;
		case 'addition':
			return `add(${bareShape(node.left)}, ${bareShape(node.right)})`;
		case 'subtraction':
			return `sub(${bareShape(node.left)}, ${bareShape(node.right)})`;
		case 'multiplication':
			return `mul(${bareShape(node.left)}, ${bareShape(node.right)})`;
		case 'division':
			return `div(${bareShape(node.numerator)}, ${bareShape(node.denominator)})`;
		case 'opposite':
			return `opp(${bareShape(node.operand)})`;
		case 'superscript':
			return `pow(${bareShape(node.base)}, ${bareShape(node.superscript)})`;
		case 'delimiter':
			return bareShape(node.content);
		default:
			return toLatex(node).replace(/\s+/g, '');
	}
}

describe('aller-retour toLatex → parseLatex : toute limite suivie d’autre chose est parenthésée', () => {
	const x = MathAST.variable('x');
	const one = MathAST.number('1');
	const two = MathAST.number('2');
	const three = MathAST.number('3');
	const lim = (body: MathNode): MathNode => MathAST.limit(body, 'x', MathAST.number('0'), 'both');
	const A = lim(x);
	const B = lim(MathAST.power(x, two));
	const { add, subtract: sub, multiply: mul, divide: div, opposite: opp } = MathAST;

	const TREES: ReadonlyArray<readonly [string, MathNode]> = [
		['(lim A + lim B) + 1', add(add(A, B), one)],
		['(lim A − lim B) − 1', sub(sub(A, B), one)],
		['lim A + lim B', add(A, B)],
		['lim A − (lim B + 1)', sub(A, add(B, one))],
		['lim A + (lim B)·2', add(A, mul(B, two, 'dot'))],
		['lim x + (lim x)·2', add(A, mul(A, two, 'dot'))],
		['lim·lim implicite', mul(A, A, 'implicit')],
		['lim·lim point', mul(A, B, 'dot')],
		['(lim·lim)·3', mul(mul(A, B, 'dot'), three, 'dot')],
		['lim / 2 en ligne', div(A, two, 'inline')],
		['lim : 2', div(A, two, 'ratio')],
		['lim / lim en ligne', div(A, B, 'inline')],
		['(lim / 2) + 1', add(div(A, two, 'inline'), one)],
		['lim en \\frac', div(A, two, 'fraction')],
		['\\frac{lim}{2} + 1', add(div(A, two, 'fraction'), one)],
		['lim·3 implicite', mul(A, three, 'implicit')],
		['lim × 3', mul(A, three, 'cross')],
		['2·lim implicite', mul(two, A, 'implicit')],
		['(2·lim) + 1', add(mul(two, A, 'implicit'), one)],
		['(1 + lim) + 2', add(add(one, A), two)],
		['(1 − lim)·2', mul(sub(one, A), two, 'dot')],
		['−lim + 1', add(opp(A), one)],
		['(lim)² + 1', add(MathAST.power(A, two), one)],
		['lim(lim x + 1)', lim(add(A, one))],
		['lim(x + lim x)', lim(add(x, A))],
		['lim(lim x) + 1', add(lim(A), one)],
		['1 + lim', add(one, A)],
		['lim A · (lim B + 1)', mul(A, add(B, one), 'dot')]
	];

	it.each(TREES)('%s', (_label, tree) => {
		for (const options of [{}, { renderMetadata: true }]) {
			const latex = toLatex(tree, options);
			expect(bareShape(parsePratt(latex)), latex).toBe(bareShape(tree));
			expect(bareShape(parseRD(latex)), latex).toBe(bareShape(tree));
		}
	});
});
