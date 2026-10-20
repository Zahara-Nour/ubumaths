/**
 * Une fraction dont le numérateur ou le dénominateur est une somme, rendue
 * irréductible sur ses coefficients numériques (décisions de David, 2026-10-20).
 *
 * - le facteur numérique commun du numérateur et du dénominateur se simplifie :
 *   `(6x+3)/9` → `(2x+1)/3` — une seule barre de fraction, jamais
 *   `2x/3 + 1/3` (ce serait distribuer la division) ;
 * - les fractions numériques internes sont chassées : `(x/2+1)/3` → `(x+2)/6` ;
 * - le signe d'un dénominateur négatif passe dans le numérateur :
 *   `(6x−3)/(−9)` → `(1−2x)/3` ;
 * - un facteur NON numérique ne se simplifie jamais (domaine) :
 *   `(6x²−3x)/(3x)` → `(2x²−x)/x`, pas `2x−1`.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';

// `toCustom` écrit un numérateur ou un dénominateur composé entre accolades.
const t = (s: string) => toCustom(tidy(parseCustom(s)));

describe('fraction de sommes : facteur numérique commun simplifié', () => {
	it.each([
		['(6x+3)/9', '{2x+1}/3'],
		['(2x+4)/2', 'x+2'],
		['(2x)/(4x+6)', 'x/{2x+3}'],
		['(4x+6)/(2x)', '{2x+3}/x'],
		['(6x^2-3x)/(3x)', '{2x^2-x}/x'],
		['6/(4x+6)', '3/{2x+3}'],
		['(3(x+1))/6', '{x+1}/2']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('fractions numériques internes chassées', () => {
	it.each([
		['(x/2+1)/3', '{x+2}/6'],
		['(x/2+1/3)/5', '{3x+2}/30'],
		['1/(x/2+1)', '2/{x+2}'],
		['(0.5x+1)/3', '{x+2}/6']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('signe du dénominateur', () => {
	it.each([
		['(6x-3)/(-9)', '{1-2x}/3'],
		['(2x+1)/(-3)', '-{2x+1}/3']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('témoins : rien à simplifier, rien ne bouge', () => {
	it.each([
		['(2x+1)/3', '{2x+1}/3'],
		['(6x+3)/2', '{6x+3}/2'],
		['(2x)/3+1/3', '{2x}/3+1/3'],
		['x/2+1', 'x/2+1'],
		['(3(x+1))/4', '{3(x+1)}/4'],
		['(x^2-1)/(x+1)', '{x^2-1}/{x+1}'],
		['-(2x-1)/3', '-{2x-1}/3']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

/**
 * Cas de la revue de la PR (2026-10-20) : la réduction se fait sur le terme
 * ACCUMULÉ — elle ne dépend donc pas de l'écriture — et ne fait jamais
 * apparaître une somme qui s'annulerait avec un autre facteur.
 */
describe('revue : jamais de simplification par une somme (domaine)', () => {
	it.each([
		['(2x+2)/(4(x+1))', '{2x+2}/{4(x+1)}'],
		['(2x+2)/(2(x+1))', '{2x+2}/{2(x+1)}'],
		['(2x+2)/(4(x+1)^2)', '{2x+2}/{4(x+1)^2}']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('revue : même résultat quelle que soit l’écriture', () => {
	it.each([
		['(-(6x+3))/9', '-{2x+1}/3'],
		['(-(2x+4))/(-6)', '{x+2}/3'],
		['(x(6x+3))/(9x)', '{2x+1}/3'],
		['((x+1)(2x+2))/(4(x+1))', '{x+1}/2']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('revue : un nombre venu de l’autre côté de la barre n’est pas distribué', () => {
	it.each([
		['(x+1)/(1/2)', '2(x+1)'],
		['(1/2)/(x+1)', '1/{2(x+1)}'],
		['((x+1)/2)/(x+3)', '{x+1}/{2(x+3)}'],
		['(2x+1)/(x/2)', '{2(2x+1)}/x'],
		['3(x/2+1)', '3(x/2+1)']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('revue : deux sommes égales du même côté se multiplient', () => {
	it('tidy((6x+3)(4x+2)/12) = (2x+1)²/2', () => {
		expect(t('((6x+3)(4x+2))/12')).toBe('{(2x+1)^2}/2');
	});

	it('un dénominateur nul arrête la réduction', () => {
		expect(t('(6x+3)/(9*0)')).toContain('6x+3');
	});
});

describe('invariants', () => {
	const PANEL = [
		'(6x+3)/9',
		'(2x+4)/2',
		'(2x)/(4x+6)',
		'(4x+6)/(2x)',
		'(6x^2-3x)/(3x)',
		'(x/2+1)/3',
		'(x/2+1/3)/5',
		'1/(x/2+1)',
		'(6x-3)/(-9)',
		'(2x+1)/(-3)',
		'(6x+3)/2',
		'(2x+2)/(4(x+1))',
		'(-(6x+3))/9',
		'(-(2x+4))/(-6)',
		'(6x+3)/(-(9x+3))',
		'(x(6x+3))/(9x)',
		'((x+1)(2x+2))/(4(x+1))',
		'((6x+3)/9)^2',
		'(x+1)/(1/2)',
		'(2x+1)/(x/2)'
	];

	it.each(PANEL)('valeur conservée sur %s', (input) => {
		const node = parseCustom(input);
		expect(areEquivalent(tidy(node), node)).toBe(true);
	});

	it.each(PANEL)('idempotent sur %s', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});
});
