/**
 * Exposant signé sans accolades (`10^-3`, B7) et exposants empilés (`2^3^2`, B9) —
 * chantier lecture-grandeurs, décisions 8, 9 et 11 de David (2026-10-20 ;
 * docs/archive/wip/lecture-grandeurs-phase0.md, PR 2).
 *
 * Avant : le parseur maison refusait `10^-3` (« Negative exponent requires braces »)
 * et `10^+3` (« Expected exponent »), et lisait `2^3^2` de gauche à droite, (2³)² ;
 * le parseur LaTeX lisait `2^3^2` de droite à gauche, 2^(3²). Deux lectures pour une
 * même écriture : elle est désormais refusée dans les deux, seules `2^{3^2}` et
 * `(2^3)^2` disent l'empilement.
 *
 * Règle : après `^`, un signe suivi d'UN nombre ou d'UNE lettre forme l'exposant ;
 * un signe devant un groupe (`2^-sin(x)`, `2^-(x+1)`) est refusé.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw, parseCustomSafe } from '../index';
import { parsePrattSafe, parseRDSafe } from '../../latex';

// =============================================================================
// Constantes
// =============================================================================

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const LATEX_PARSERS = [
	['Pratt', parsePrattSafe],
	['RD', parseRDSafe]
] as const;

const STACKED_MESSAGE = 'Two exponents in a row: write 2^{3^2} or (2^3)^2';
const BEFORE_GROUP_MESSAGE = 'Negative exponent before a group: write 2^{-…} or 2^(-…)';

// =============================================================================
// Tests
// =============================================================================

describe.each(CUSTOM_PARSERS)('parseur maison %s : exposant signé', (_, parse) => {
	function astOf(input: string) {
		const result = parse(input);
		expect(result.errors).toEqual([]);
		return result.ast;
	}

	it.each([
		['10^-3', '10^{-3}'],
		['2^-x', '2^{-x}'],
		['x^-1', 'x^{-1}'],
		['10^-3[m]', '10^{-3}[m]'],
		['10^-3*4', '10^{-3}*4'],
		['10^-3+4', '10^{-3}+4'],
		['10^-2.5', '10^{-2.5}'],
		['10^+3', '10^{+3}'],
		['2^-x*y', '2^{-x}*y'],
		['2^-3x', '2^{-3}x'],
		['2^ - 3', '2^{-3}']
	])('%s se lit comme %s', (written, expected) => {
		expect(astOf(written)).toEqual(astOf(expected));
	});

	// Le message proposé par le refus d'un signe devant un groupe doit se lire
	it('2^(-x-1) se lit comme 2^{-x-1}', () => {
		expect(astOf('2^(-x-1)')).toEqual(astOf('2^{-x-1}'));
	});

	it('2^-x y est refusé comme 2^x y, avec le même code et le même message', () => {
		const signed = parse('2^-x y');
		const unsigned = parse('2^x y');
		expect(signed.errors.length).toBeGreaterThan(0);
		expect(signed.errors[0].code).toBe(unsigned.errors[0].code);
		expect(signed.errors[0].message).toBe(unsigned.errors[0].message);
	});

	it.each(['2^-sin(x)', '2^-(x+1)', '2^-{3}'])(
		'%s est refusé : signe devant un groupe',
		(written) => {
			const result = parse(written);
			expect(result.ast).toBeNull();
			expect(result.errors[0]).toMatchObject({
				code: 'NEGATIVE_EXPONENT_BEFORE_GROUP',
				message: BEFORE_GROUP_MESSAGE,
				position: written.indexOf('^') + 1
			});
		}
	);

	// Même règle pour le `+` : un signe, puis UN nombre ou UNE lettre
	it('2^+(x+1) est refusé avec le même code', () => {
		expect(parse('2^+(x+1)').errors[0]?.code).toBe('NEGATIVE_EXPONENT_BEFORE_GROUP');
	});
});

describe.each(CUSTOM_PARSERS)('parseur maison %s : exposants empilés', (_, parse) => {
	it.each(['2^3^2', 'e^x^2', '2^3^2[m]', 'e^-x^2', 'x^2^-3', '2^{3}^2', '2^(3)^2', 'a^b^c^d'])(
		'%s est refusé',
		(written) => {
			const result = parse(written);
			expect(result.ast).toBeNull();
			expect(result.errors[0]).toMatchObject({
				code: 'STACKED_EXPONENTS',
				message: STACKED_MESSAGE,
				// la position est celle du DEUXIÈME ^
				position: written.indexOf('^', written.indexOf('^') + 1)
			});
		}
	);

	it('2^{3^2} reste 2 puissance (3²)', () => {
		const result = parse('2^{3^2}');
		expect(result.errors).toEqual([]);
		expect(result.ast).toMatchObject({
			type: 'superscript',
			base: { type: 'number', value: '2' },
			superscript: { type: 'superscript' }
		});
	});

	it('(2^3)^2 reste (2³)²', () => {
		const result = parse('(2^3)^2');
		expect(result.errors).toEqual([]);
		expect(result.ast).toMatchObject({
			type: 'superscript',
			base: { type: 'delimiter', content: { type: 'superscript' } },
			superscript: { type: 'number', value: '2' }
		});
	});

	it.each(['x_1^2', 'x^2_1', '2^3[m]', 'sqrt(2)^2'])('%s se lit toujours', (written) => {
		expect(parse(written).errors).toEqual([]);
	});
});

// Fonctions génériques (`f`, `g`… : parseur maison Pratt, celui de l'atelier ; le RD n'en a pas)
describe('parseur maison : exposant signé et fonctions génériques', () => {
	it('2^-f(x) est refusé comme 2^-sin(x) : signe devant un groupe', () => {
		expect(parseCustomSafe('2^-f(x)').errors[0]).toMatchObject({
			code: 'NEGATIVE_EXPONENT_BEFORE_GROUP',
			position: 2
		});
	});

	it("2^-f'(x) est refusé aussi", () => {
		expect(parseCustomSafe("2^-f'(x)").errors[0]?.code).toBe('NEGATIVE_EXPONENT_BEFORE_GROUP');
	});

	it('2^-f (sans appel) se lit 2^{-f}', () => {
		const read = parseCustomSafe('2^-f');
		expect(read.errors).toEqual([]);
		expect(read.ast).toEqual(parseCustomSafe('2^{-f}').ast);
	});

	// Sans ça, f^-1(x) se lisait f⁻¹·(x), une puissance multipliée par (x)
	it.each(['f^-1(x)', 'f^-1'])('%s est la réciproque, comme avec les accolades', (written) => {
		const read = parseCustomSafe(written);
		expect(read.errors).toEqual([]);
		expect(read.ast).toEqual(parseCustomSafe(written.replace('^-1', '^{-1}')).ast);
		expect(read.ast).toMatchObject({ type: 'function', name: 'f', isInverse: true });
	});
});

describe.each(LATEX_PARSERS)('parseur LaTeX %s : exposants empilés', (_, parse) => {
	it.each(['2^3^2', 'e^x^2', '2^{3}^{2}', 'e^{x}^2', 'a^b^c^d', '2^\\pi^2'])(
		'%s est refusé',
		(written) => {
			const result = parse(written);
			expect(result.ast).toBeNull();
			expect(result.errors[0]).toMatchObject({
				code: 'STACKED_EXPONENTS',
				message: STACKED_MESSAGE,
				position: written.indexOf('^', written.indexOf('^') + 1)
			});
		}
	);

	it.each([
		'2^{3^2}',
		'{2^3}^2',
		'\\left(2^3\\right)^2',
		'\\left( 2^3 \\right)^2',
		'x_1^2',
		'x^2_1',
		'2^{-3}',
		'\\sqrt{2}^2'
	])('%s se lit toujours', (written) => {
		expect(parse(written).errors).toEqual([]);
	});
});
