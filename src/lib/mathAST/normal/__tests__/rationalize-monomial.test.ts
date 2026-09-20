/**
 * Rationalisation d'un dénominateur réduit à un **monôme** radical.
 *
 * Relevé du 2026-09-20 §6.8 : `areEquivalent(1/√2, √2/2)` rendait faux.
 * `normalFormFromFraction` sait rationaliser un dénominateur **binôme**
 * (`1/(1+√2)`, par conjugué) et les exposants fractionnaires d'un monôme
 * symbolique (`1/√x`), mais pas un dénominateur réduit à un seul terme
 * algébrique portant un radical : `rationalizeByConjugate` exige exactement
 * deux termes algébriques.
 *
 * C'est le décideur d'équivalence, donc la correction des copies : un élève qui
 * rationalise, comme on le lui enseigne, était compté faux.
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

describe('dénominateur monôme radical — équivalence', () => {
	it.each([
		['1/sqrt(2)', 'sqrt(2)/2'],
		['1/sqrt(3)', 'sqrt(3)/3'],
		['1/sqrt(6)', 'sqrt(6)/6'],
		['2/sqrt(2)', 'sqrt(2)'],
		['3/sqrt(3)', 'sqrt(3)'],
		['1/(2*sqrt(2))', 'sqrt(2)/4'],
		['5/(3*sqrt(5))', 'sqrt(5)/3'],
		['x/sqrt(2)', 'x*sqrt(2)/2'],
		['1/(x*sqrt(2))', 'sqrt(2)/(2x)'],
		['(x+1)/sqrt(2)', '(x+1)*sqrt(2)/2'],
		['sqrt(3)/sqrt(2)', 'sqrt(6)/2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['1/sqrt(2)', 'sqrt(2)'],
		['1/sqrt(2)', 'sqrt(2)/4'],
		['2/sqrt(2)', '2*sqrt(2)']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('dénominateur monôme radical — ce que denormalize rend', () => {
	it.each([
		['1/sqrt(2)', '{1/2}sqrt(2)'],
		['2/sqrt(2)', 'sqrt(2)'],
		['1/(2*sqrt(2))', '{1/4}sqrt(2)']
	])('%s → %s', (input, expected) => {
		expect(round(input)).toBe(expected);
	});
});

describe('ce qui marchait continue de marcher', () => {
	it.each([
		['1/(1+sqrt(2))', 'sqrt(2)-1'],
		['1/sqrt(4)', '1/2'],
		['1/sqrt(x)', 'sqrt(x)/x'],
		['sqrt(2)*sqrt(8)', '4'],
		['1/2+1/3', '5/6'],
		['(x^2-1)/(x+1)', 'x-1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('une racine d’indice 3 reste équivalente à elle-même, sans exception', () => {
		expect(eq('1/root(3)(2)', '1/root(3)(2)')).toBe(true);
		expect(() => normalize(preprocess(parseCustom('1/root(3)(2)')))).not.toThrow();
	});

	it('un dénominateur imaginaire garde son chemin : 1/i ≡ -i', () => {
		expect(eq('1/i', '-i')).toBe(true);
	});

	it('x/x reste 1, et 1/x n’est pas rationalisé', () => {
		expect(eq('x/x', '1')).toBe(true);
		expect(eq('1/x', 'x')).toBe(false);
	});
});
