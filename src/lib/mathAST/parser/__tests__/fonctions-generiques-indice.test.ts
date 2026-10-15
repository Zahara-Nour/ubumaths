/**
 * Fonctions génériques À INDICE : `f_1`, `f_{12}`.
 *
 * L'atelier déclare des fonctions nommées `f_1`, `g_2` (quand f, g, h sont
 * prises) et les passe au parseur par `genericFunctions.names`. Mesuré sur main
 * le 2026-10-15 : `f_1(3)` se lisait `f_1 × (3)` (indice puis multiplication
 * implicite), jamais comme un appel.
 *
 * Règle : `lettre_nombre` (ou `lettre_{nombre}`) DÉCLARÉ et suivi d'un appel
 * (parenthèses, primes, `^{-1}`) est une fonction de nom `lettre_nombre`. Un
 * nom indicé non déclaré, ou un nom indicé seul, reste une variable indicée.
 * Les deux parseurs pratt (LaTeX et maison) lisent pareil ; les parseurs rd ne
 * connaissent pas les fonctions génériques.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../index';
import { parseCustom } from '../custom';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { func, number, variable, multiply, add } from '../../factory';
import { nodesEqual } from '../../pattern/match';
import type { MathNode } from '../../types';

const NAMES = ['f', 'g', 'f_1', 'f_12', 'g_2'];
const genericFunctions = { names: NAMES, allowDerivatives: true, allowInverse: true };

const readCustom = (s: string, names = NAMES) =>
	parseCustom(s, { genericFunctions: { ...genericFunctions, names } });
const readLatex = (s: string, names = NAMES) =>
	parseLatex(s, { genericFunctions: { ...genericFunctions, names } });

const expectSame = (actual: MathNode, expected: MathNode) =>
	expect(nodesEqual(actual, expected), JSON.stringify(actual)).toBe(true);

const CALLS: ReadonlyArray<[string, MathNode]> = [
	['f_1(3)', func('f_1', [number('3')])],
	['f_{1}(3)', func('f_1', [number('3')])],
	['f_12(x)', func('f_12', [variable('x')])],
	['f_{12}(x)', func('f_12', [variable('x')])],
	['g_2(x,3)', func('g_2', [variable('x'), number('3')])],
	["f_1'(2)", func('f_1', [number('2')], { derivativeOrder: 1 })],
	["f_1''(x)", func('f_1', [variable('x')], { derivativeOrder: 2 })],
	['f_1^{-1}(x)', func('f_1', [variable('x')], { isInverse: true })],
	['5f_1(x)', multiply(number('5'), func('f_1', [variable('x')]), 'implicit')],
	['f_1(x)+f(x)', add(func('f_1', [variable('x')]), func('f', [variable('x')]))]
];

describe('parseur maison : appel d’une fonction à indice déclarée', () => {
	it.each(CALLS)('%s', (input, expected) => expectSame(readCustom(input), expected));
});

describe('parseur LaTeX : appel d’une fonction à indice déclarée', () => {
	it.each(CALLS)('%s', (input, expected) => expectSame(readLatex(input), expected));

	it.each<[string, MathNode]>([
		['f_{1}\\left(3\\right)', func('f_1', [number('3')])],
		["f_{1}'\\left(2\\right)", func('f_1', [number('2')], { derivativeOrder: 1 })],
		['3f_{1}\\left(x\\right)', multiply(number('3'), func('f_1', [variable('x')]), 'implicit')]
	])('%s (MathLive)', (input, expected) => expectSame(readLatex(input), expected));
});

/** Ce qui ne doit PAS changer : la lecture sans la déclaration du nom indicé. */
const UNCHANGED = ['x_1(3)', 'f_2(3)', 'f_1', 'f_{1}', 'f_1^2', 'x_1', '2f_1'];

describe('nom indicé non déclaré ou sans appel : lecture inchangée', () => {
	it.each(UNCHANGED)('maison : %s', (input) =>
		expectSame(readCustom(input), readCustom(input, ['f', 'g']))
	);
	it.each(UNCHANGED)('LaTeX : %s', (input) =>
		expectSame(readLatex(input), readLatex(input, ['f', 'g']))
	);
});

describe('aller-retour : toCustom et toLatex relisent le même arbre', () => {
	const NODES: ReadonlyArray<[string, MathNode]> = [
		['f_1(3)', func('f_1', [number('3')])],
		['f_12(x)', func('f_12', [variable('x')])],
		["f_1'(x)", func('f_1', [variable('x')], { derivativeOrder: 1 })],
		['f_1^{-1}(x)', func('f_1', [variable('x')], { isInverse: true })],
		['2g_2(x)', multiply(number('2'), func('g_2', [variable('x')]), 'implicit')]
	];

	it.each(NODES)('toCustom de %s', (_label, node) => expectSame(readCustom(toCustom(node)), node));
	it.each(NODES)('toLatex de %s', (_label, node) => expectSame(readLatex(toLatex(node)), node));

	it('toLatex met l’indice à plusieurs chiffres entre accolades (sinon affiché f₁2)', () => {
		expect(toLatex(func('f_12', [variable('x')]))).toBe('f_{12}\\left( x \\right)');
		expect(toLatex(func('f_1', [variable('x')]))).toBe('f_1\\left( x \\right)');
	});
});
