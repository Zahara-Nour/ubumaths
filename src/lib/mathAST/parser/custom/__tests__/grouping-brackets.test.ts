/**
 * Crochets de calcul dans la notation `~…~` (2026-09-24).
 *
 * Décision produit :
 * 1. `[` en position PRÉFIXE (début d'expression ou d'opérande) est toujours
 *    un crochet de calcul : `[x-1]^2`, `2+[x-1]`.
 * 2. `[…]` en position POSTFIXE reste une UNITÉ, sauf si son contenu est
 *    clairement une expression : il contient `+`, `=`, `<`, `>` ou un `-` qui
 *    n'est pas le signe d'un exposant. C'est alors un crochet de calcul,
 *    multiplié implicitement par ce qui précède : `2[x+1]`.
 * 3. Le crochet de calcul est un délimiteur « parenthèses » de forme `square` :
 *    même sens mathématique que des parenthèses.
 * 4. LaTeX : `\left[ … \right]` ; notation : `[…]`, ou `(…)` quand le contenu
 *    serait relu comme une unité.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../index';
import { parseLatexSafe } from '../../index';
import { toLatex } from '../../../latex-generator';
import { toCustom } from '../../../custom-generator';
import { isUnit, isDelimiter } from '../../../guards';
import { findNodes } from '../../../transforms';
import { areEquivalent } from '../../../equivalence';
import { evaluateNumeric } from '../../../common/numeric';
import { MathAST } from '../../../factory';
import type { MathNode } from '../../../types';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const LATEX_PARSERS = [
	['Pratt', (s: string) => parseLatexSafe(s)],
	['RD', (s: string) => parseLatexSafe(s, { parser: 'rd' })]
] as const;

/** Le nombre de crochets de calcul (délimiteurs de forme `square`) d'un arbre. */
function squareCount(node: MathNode): number {
	return findNodes(node, (n) => isDelimiter(n) && n.shape === 'square').length;
}

describe.each(CUSTOM_PARSERS)('parseur custom %s — crochets de calcul', (_name, parse) => {
	describe('position préfixe : toujours un crochet de calcul', () => {
		it.each([
			['[x-1]^2', 1],
			['2+[x-1]', 1],
			['[x]^2', 1],
			['[x+1][x-1]', 2],
			['-[x+1]', 1]
		])('%s', (input, count) => {
			const r = parse(input);
			expect(r.errors ?? []).toEqual([]);
			expect(squareCount(r.ast!)).toBe(count);
		});
	});

	describe('position postfixe, contenu d’expression : crochet multiplié', () => {
		it.each([
			['2[x+1]', 1],
			['2[x-1]', 1],
			['2[(x+2)^2-4]+3', 1],
			['x[x=1]', 1],
			['2[x<1]', 1],
			['2[x>1]', 1],
			['2[3(x+1)-[x-2]]', 2],
			['2[x^{-1}+1]', 1]
		])('%s', (input, count) => {
			const r = parse(input);
			expect(r.errors ?? []).toEqual([]);
			expect(squareCount(r.ast!)).toBe(count);
			expect(findNodes(r.ast!, isUnit)).toHaveLength(0);
		});

		it('2[x+1] est 2 × [x+1]', () => {
			const ast = parse('2[x+1]').ast!;
			expect(ast.type).toBe('multiplication');
		});

		it('2[(x+2)^2-4]+3 est une somme dont le premier terme est un produit', () => {
			const ast = parse('2[(x+2)^2-4]+3').ast!;
			expect(ast.type).toBe('addition');
		});
	});

	describe('position postfixe, contenu d’unité : inchangé', () => {
		it.each(['3[cm]', '3[m.s^-1]', '3[m.s^{-1}]', '3[kg/(m.s)]', '3[km/h]', '3[°C]', '3[m^{2}]'])(
			'%s reste une grandeur',
			(input) => {
				const r = parse(input);
				expect(r.errors ?? []).toEqual([]);
				expect(isUnit(r.ast!)).toBe(true);
				expect(squareCount(r.ast!)).toBe(0);
			}
		);

		it.each([
			['3[kms]', /Invalid unit/],
			['3[m s]', /Space inside a unit/],
			['3[kg/m.s]', /./],
			['3[m]^2', /Exponent after a unit/],
			['2[x]', /./]
		])('%s reste une erreur', (input, message) => {
			const r = parse(input);
			expect(r.ast ?? null).toBeNull();
			expect(r.errors?.[0]?.message).toMatch(message);
		});
	});

	describe('sens mathématique : celui des parenthèses', () => {
		it('2[x+1] et 2(x+1) sont équivalents et s’évaluent pareil', () => {
			const square = parse('2[x+1]').ast!;
			const round = parse('2(x+1)').ast!;
			expect(areEquivalent(square, round)).toBe(true);
			expect(evaluateNumeric(square, 'x', 3)).toBe(8);
			expect(evaluateNumeric(round, 'x', 3)).toBe(8);
		});

		it('2[(x+2)^2-4]+3 vaut 2((x+2)^2-4)+3', () => {
			const square = parse('2[(x+2)^2-4]+3').ast!;
			const round = parse('2((x+2)^2-4)+3').ast!;
			expect(areEquivalent(square, round)).toBe(true);
			expect(evaluateNumeric(square, 'x', 1)).toBe(13);
		});
	});

	describe('générateur custom : aller-retour', () => {
		it.each(['2[x+1]', '[x-1]^2', '2+[x-1]', '2[(x+2)^2-4]+3', '2[3(x+1)-[x-2]]'])(
			'%s → toCustom → même arbre',
			(input) => {
				const ast = parse(input).ast!;
				const text = toCustom(ast);
				expect(text).toContain('[');
				const back = parse(text);
				expect(back.errors ?? []).toEqual([]);
				expect(back.ast).toEqual(ast);
			}
		);

		it('un contenu qui serait relu comme une unité s’écrit entre parenthèses', () => {
			const ast = MathAST.multiply(
				MathAST.number('2'),
				MathAST.delimiter('parentheses', MathAST.variable('x'), 'grouping', { shape: 'square' }),
				'implicit'
			);
			expect(toCustom(ast)).toBe('2(x)');
			expect(toCustom(ast, { renderMetadata: true })).toBe('2(x)');
		});

		it('mode renderMetadata : mêmes crochets', () => {
			expect(toCustom(parse('2[x+1]').ast!, { renderMetadata: true })).toBe(
				toCustom(parse('2[x+1]').ast!)
			);
		});
	});

	describe('générateur LaTeX', () => {
		it('2[x+1] → \\left[ … \\right], dans les deux modes', () => {
			const ast = parse('2[x+1]').ast!;
			expect(toLatex(ast)).toBe('2 \\left[ x + 1 \\right]');
			expect(toLatex(ast, { renderMetadata: true })).toBe('2 \\left[ x + 1 \\right]');
		});
	});
});

describe.each(LATEX_PARSERS)('parseur LaTeX %s — \\left[ … \\right]', (_name, parseL) => {
	it('lit \\left[ x+1 \\right] comme un crochet de calcul', () => {
		const r = parseL('2\\left[ x+1 \\right]');
		expect(r.errors ?? []).toEqual([]);
		expect(squareCount(r.ast!)).toBe(1);
	});

	it.each(['2[x+1]', '[x-1]^2', '2[(x+2)^2-4]+3', '2[3(x+1)-[x-2]]'])(
		'aller-retour %s : parseCustom → toLatex → parseLatex',
		(input) => {
			const ast = parseCustomPrattSafeRaw(input).ast!;
			const back = parseL(toLatex(ast));
			expect(back.errors ?? []).toEqual([]);
			expect(squareCount(back.ast!)).toBe(squareCount(ast));
			expect(areEquivalent(back.ast!, ast)).toBe(true);
		}
	);

	it('\\left[ doit se fermer par \\right]', () => {
		const r = parseL('\\left[ x+1 \\right)');
		expect(r.ast ?? null).toBeNull();
	});
});

describe('écran — expressionToLatex', () => {
	it.each([
		['2[x+1]', '2 \\left[ x + 1 \\right]'],
		['[x-1]^2', '\\left[ x - 1 \\right]^2']
	])('%s → %s', (input, expected) => {
		expect(expressionToLatex(input, 'custom')).toBe(expected);
	});

	it('2[(x+2)^2-4]+3 sans erreur rouge', () => {
		const latex = expressionToLatex('2[(x+2)^2-4]+3', 'custom');
		expect(latex).not.toContain('red');
		expect(latex).toContain('\\left[');
	});
});

describe('PDF (Typst) — de bout en bout', () => {
	it('~2[(x+2)^2-4]+3~ donne des crochets, sans erreur', () => {
		const typst = generateTypst(parseMarkdown('Calculer ~2[(x+2)^2-4]+3~.'), {
			includeSetup: false
		});
		expect(typst).not.toMatch(/Unexpected|red/);
		// Typst écrit les crochets `bracket.l` / `bracket.r`
		expect(typst).toContain('$2  bracket.l  ( x + 2 )^2 - 4  bracket.r + 3$');
	});
});
