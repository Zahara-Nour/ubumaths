/**
 * `×`, `·` et `⋅` lus comme `*` par le parseur maison (chantier lecture-grandeurs,
 * décision 7 de David, 2026-10-20 ; docs/archive/wip/lecture-grandeurs-phase0.md, PR 1).
 *
 * Avant : le symbole était pris pour une lettre — `2×3` refusé (« Unexpected
 * token: 3 »), `2×` accepté comme « 2 fois la lettre × », `3[m·s^-1]` refusé
 * (« Expected ']' after unit »).
 *
 * Le parseur LaTeX ne change pas : il lit `\times` et `\cdot`, et refuse le
 * caractère Unicode en conseillant `\cdot` (MathLive n'écrit jamais l'Unicode).
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../index';
import { parseLatexSafe } from '../../index';

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const SYMBOLS = ['×', '·', '⋅'] as const;

describe.each(CUSTOM_PARSERS)('parseur maison %s : ×, ·, ⋅ = *', (_, parse) => {
	function astOf(input: string) {
		const result = parse(input);
		expect(result.errors).toEqual([]);
		return result.ast;
	}

	describe.each(SYMBOLS)('%s', (symbol) => {
		it.each([
			[`2${symbol}3`, '2*3'],
			[`2 ${symbol} 3`, '2*3'],
			[`x${symbol}y`, 'x*y'],
			[`2.5${symbol}10^3[m]`, '2.5*10^3[m]'],
			[`2[m]${symbol}3[m]`, '2[m]*3[m]'],
			[`(x+1)${symbol}(x-1)`, '(x+1)*(x-1)']
		])('%s se lit comme %s', (written, expected) => {
			expect(astOf(written)).toEqual(astOf(expected));
		});

		it(`${symbol} en tête est refusé comme * en tête, avec le même code`, () => {
			const withSymbol = parse(`${symbol}3`);
			const withStar = parse('*3');
			expect(withSymbol.errors.length).toBeGreaterThan(0);
			expect(withSymbol.errors[0].code).toBe(withStar.errors[0].code);
		});

		it(`${symbol} en fin est refusé comme * en fin, avec le même code et le même message`, () => {
			const withSymbol = parse(`2${symbol}`);
			const withStar = parse('2*');
			expect(withSymbol.errors.length).toBeGreaterThan(0);
			expect(withSymbol.errors[0].code).toBe(withStar.errors[0].code);
			expect(withSymbol.errors[0].message).toBe(withStar.errors[0].message);
		});
	});

	describe('entre les crochets d’une unité, · et ⋅ valent le point', () => {
		it.each(['3[m·s^-1]', '3[m⋅s^-1]', '3[ m·s^-1 ]'])('%s = 3[m.s^-1]', (written) => {
			expect(astOf(written)).toEqual(astOf('3[m.s^-1]'));
		});

		it('3[N·m] = 3[N.m]', () => {
			expect(astOf('3[N·m]')).toEqual(astOf('3[N.m]'));
		});

		// × y vaut `*`, déjà admis entre crochets (David, 2026-10-20)
		it('3[m×s] = 3[m*s]', () => {
			expect(astOf('3[m×s]')).toEqual(astOf('3[m*s]'));
		});

		it.each(['3[m ·s]', '3[m· s]'])('%s est refusé comme une espace dans l’unité', (written) => {
			const withDot = parse(written);
			const withPoint = parse('3[m .s]');
			expect(withDot.errors.length).toBeGreaterThan(0);
			expect(withDot.errors[0].code).toBe(withPoint.errors[0].code);
			expect(withDot.errors[0].message).toBe(withPoint.errors[0].message);
		});

		it('kg/m·s reste ambigu, comme kg/m.s', () => {
			const withDot = parse('3[kg/m·s]');
			const withPoint = parse('3[kg/m.s]');
			expect(withDot.errors.length).toBeGreaterThan(0);
			expect(withDot.errors[0].code).toBe(withPoint.errors[0].code);
			expect(withDot.errors[0].message).toBe(withPoint.errors[0].message);
		});
	});

	it('2.5 reste un décimal, 2·5 un produit', () => {
		const decimal = astOf('2.5');
		const product = astOf('2·5');
		expect(decimal).toMatchObject({ type: 'number', value: '2.5' });
		expect(product).toEqual(astOf('2*5'));
		expect(product).not.toEqual(decimal);
	});
});

describe('parseur LaTeX : inchangé', () => {
	it.each(['2\\times 3', '2\\cdot 3'])('%s reste un produit', (written) => {
		const result = parseLatexSafe(written);
		expect(result.errors).toEqual([]);
		expect(result.ast?.type).toBe('multiplication');
	});

	it.each(SYMBOLS)('2%s3 (Unicode) reste refusé', (symbol) => {
		expect(parseLatexSafe(`2${symbol}3`).errors.length).toBeGreaterThan(0);
	});
});
