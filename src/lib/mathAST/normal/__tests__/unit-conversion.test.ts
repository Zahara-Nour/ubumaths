/**
 * Les grandeurs dans `normalize` : équivalentes à conversion près.
 *
 * Contrat : docs/wip/tidy-phase0.md §D.1 (unités de base, coefficients
 * rationnels exacts) et §D.2 (températures : les règles de `evaluateWithUnits`,
 * sans exception). Décision 2 de David, 2026-09-20.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { normalize } from '../normalize';
import { preprocess } from '../rules';
import { hashNormalForm } from '../hash';
import { withUnit, number } from '../../factory';
import { dimensionless } from '../../units/factory';
import { parseOrThrow as unitOf } from '../../units/parser';
import type { MathNode } from '../../types';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));
const hash = (node: MathNode) => hashNormalForm(normalize(preprocess(node)));

// =============================================================================
// D.1 — unités de base, coefficients exacts
// =============================================================================

describe('grandeurs — équivalence à conversion près', () => {
	it.each([
		['12000[m]', '12[km]'],
		['1[h]', '3600[s]'],
		['90[km/h]', '25[m/s]'],
		['6[km^2]', '2[km]*3[km]'],
		['1[ft]', '0.3048[m]'],
		['1500[g]', '1.5[kg]'],
		['2[h]', '7200[s]'],
		['1[L]', '1000[mL]']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['12[km]', '12'],
		['12[km]', '12[kg]'],
		['12[km]', '12[m]'],
		['1[km/h]', '1[m/s]']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('les coefficients sont exacts : 90 km/h vaut exactement 25 m/s (5/18, pas 0,2777…)', () => {
		expect(hash(parseCustom('90[km/h]'))).toBe(hash(parseCustom('25[m/s]')));
	});

	it('1 ft vaut exactement 381/1250 m', () => {
		expect(hash(parseCustom('1250[ft]'))).toBe(hash(parseCustom('381[m]')));
	});
});

describe('grandeurs — angles et Fahrenheit, les coefficients sans écriture décimale finie', () => {
	it('180° ≡ π rad (le degré est un multiple symbolique de π)', () => {
		const degrees = parseCustom('180[°]');
		const radians = withUnit(parseLatex('\\pi'), unitOf('rad'));
		expect(areEquivalent(degrees, radians)).toBe(true);
	});

	it('32 °F ≡ 0 °C (5/9 exact)', () => {
		expect(eq('32[°F]', '0[°C]')).toBe(true);
	});
});

// =============================================================================
// D.2 — températures : les règles de evaluateWithUnits, sans exception
// =============================================================================

describe('températures — une grandeur seule se lit en absolu', () => {
	it('20 °C ≡ 293,15 K', () => {
		expect(eq('20[°C]', '293.15[K]')).toBe(true);
	});

	it('20 °C ≢ 20 K', () => {
		expect(eq('20[°C]', '20[K]')).toBe(false);
	});

	it('20 °C ≡ 20 °C', () => {
		expect(eq('20[°C]', '20[°C]')).toBe(true);
	});
});

describe('températures — différence, écart, compositions interdites', () => {
	it('30 °C − 20 °C ≡ 10 K (différence de deux absolues = un écart)', () => {
		expect(eq('30[°C]-20[°C]', '10[K]')).toBe(true);
	});

	it('20 °C + 5 K ≡ 25 °C (absolue + écart = absolue)', () => {
		expect(eq('20[°C]+5[K]', '25[°C]')).toBe(true);
	});

	it('20 °C − 5 K ≡ 15 °C', () => {
		expect(eq('20[°C]-5[K]', '15[°C]')).toBe(true);
	});

	it('20 °C + 5 °C : opaque, équivalent à lui-même et à rien d’autre', () => {
		expect(eq('20[°C]+5[°C]', '20[°C]+5[°C]')).toBe(true);
		expect(eq('20[°C]+5[°C]', '25[°C]')).toBe(false);
		expect(eq('20[°C]+5[°C]', '571.3[K]')).toBe(false);
	});

	it('2 × 20 °C : opaque, jamais 40 °C ni 586,3 K', () => {
		expect(eq('2*20[°C]', '40[°C]')).toBe(false);
		expect(eq('2*20[°C]', '586.3[K]')).toBe(false);
	});

	it('aucune exception, jamais', () => {
		for (const input of ['20[°C]+5[°C]', '2*20[°C]', '(20[°C])^2', '20[°C]*3[m]', '5[K]-20[°C]']) {
			expect(() => normalize(preprocess(parseCustom(input)))).not.toThrow();
		}
	});
});

// =============================================================================
// Revue du 2026-09-20 — findings reproduits, chacun un test rouge avant correction
// =============================================================================

describe('B2 — l’opposé d’une grandeur affine', () => {
	it('-20[°C]+30[°C] ≡ 10[K] (un opposé dans une somme est une soustraction)', () => {
		expect(eq('-20[°C]+30[°C]', '10[K]')).toBe(true);
	});

	it('30[°C]-20[°C] ≡ -20[°C]+30[°C] (normalize est commutatif)', () => {
		expect(eq('30[°C]-20[°C]', '-20[°C]+30[°C]')).toBe(true);
	});

	it('-20[°C] seul est une température : ≡ 253.15[K]', () => {
		expect(eq('-20[°C]', '253.15[K]')).toBe(true);
	});
});

describe('B3 — exactitude des unités préfixées dérivées', () => {
	it.each([
		['1[nN]', '0.000000001[N]'],
		['1000000000[nN]', '1[N]'],
		['1[nL]', '0.000000001[L]'],
		['1000[nJ]', '0.000001[J]']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('même hash, sans flottant : 1000000000[nN] et 1[N]', () => {
		expect(hash(parseCustom('1000000000[nN]'))).toBe(hash(parseCustom('1[N]')));
	});
});

describe('I1 — une unité sans composant ne fait pas lever normalize', () => {
	it('withUnit(5, sans dimension)', () => {
		expect(() => normalize(preprocess(withUnit(number('5'), dimensionless())))).not.toThrow();
	});
});

describe('racine d’une grandeur — l’unité ne disparaît pas', () => {
	it('sqrt(4[m^2]) ≡ 2[m], ≢ 2', () => {
		expect(eq('sqrt(4[m^2])', '2[m]')).toBe(true);
		expect(eq('sqrt(4[m^2])', '2')).toBe(false);
	});
});

describe('F1 — signes en chaîne autour d’une grandeur affine (seconde revue)', () => {
	it.each([
		['-(-20[°C])', '20[°C]'],
		['-(+20[°C])', '-20[°C]'],
		['+(-20[°C])', '253.15[K]'],
		['-(-20[°C])', '293.15[K]']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('2*(-20[°C]) ≡ 2*(-20[°C]) et ≢ -2*20[°C] (composition interdite, opaque en bloc)', () => {
		expect(eq('2*(-20[°C])', '2*(-20[°C])')).toBe(true);
		expect(eq('2*(-20[°C])', '-40[°C]')).toBe(false);
	});
});
