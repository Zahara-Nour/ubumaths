/**
 * L'unité est un facteur de la forme normale, pas un décor perdu en route.
 *
 * Bug du relevé du 2026-09-20 (§6.3) : `normalize(12[km])` rendait `12` — le
 * `case 'unit'` ne normalisait que l'expression, et `hashMathNode` ignorait
 * l'unité. Conséquences : `12[km] ≡ 12`, `12[km] ≡ 12[m]`, et `simplify`
 * dépouillait toute grandeur de son unité.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { normalize } from '../normalize';
import { preprocess } from '../rules';
import { denormalize } from '../denormalize';
import { toCustom } from '../../custom-generator';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));
const round = (s: string) => toCustom(denormalize(normalize(preprocess(parseCustom(s)))));

describe('unités — équivalence', () => {
	it('12[km] ≢ 12', () => {
		expect(eq('12[km]', '12')).toBe(false);
	});

	it('12[km] ≡ 12[km]', () => {
		expect(eq('12[km]', '12[km]')).toBe(true);
	});

	it('12[km] ≢ 12[m]', () => {
		expect(eq('12[km]', '12[m]')).toBe(false);
	});

	it('12[km]+3[km] ≡ 15[km]', () => {
		expect(eq('12[km]+3[km]', '15[km]')).toBe(true);
	});

	it('2*3[km] ≡ 6[km]', () => {
		expect(eq('2*3[km]', '6[km]')).toBe(true);
	});

	it('12[km]+500[m] ≢ 512', () => {
		expect(eq('12[km]+500[m]', '512')).toBe(false);
	});

	it('x[m] ≡ x[m], et ≢ x', () => {
		expect(eq('x[m]', 'x[m]')).toBe(true);
		expect(eq('x[m]', 'x')).toBe(false);
	});
});

/**
 * Bascule de la PR 3 (§D.1) : le facteur n'est plus posé par unité NOMMÉE mais
 * par unité DE BASE, coefficient exact replié dans le nombre. `normalize` est
 * le décideur, pas le metteur en page : il rend la grandeur en unités de base,
 * et c'est `tidy` qui choisit l'écriture (`12000[m]` → `12 km`).
 */
describe('unités — ce que denormalize rend : l’unité de base', () => {
	it('12[km] ressort 12000[m]', () => {
		expect(round('12[km]')).toBe('12000[m]');
	});

	it('12[km]+3[km] ressort 15000[m]', () => {
		expect(round('12[km]+3[km]')).toBe('15000[m]');
	});

	it('2*3[km] ressort 6000[m]', () => {
		expect(round('2*3[km]')).toBe('6000[m]');
	});
});
