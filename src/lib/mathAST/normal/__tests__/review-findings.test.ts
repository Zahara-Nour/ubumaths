/**
 * Findings de la revue de code du correctif des 4 bugs (2026-09-20), chacun
 * reproduit sur le chemin réel avant d'être corrigé.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { normalize } from '../normalize';
import { preprocess } from '../rules';
import { denormalize } from '../denormalize';
import { toCustom } from '../../custom-generator';
import { simplify } from '../../simplify';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));
const round = (s: string) => toCustom(denormalize(normalize(preprocess(parseCustom(s)))));
const simp = (s: string) => toCustom(simplify(parseCustom(s)).result);

describe('unités composées — l’affichage garde l’unité d’origine, pas l’unité de base', () => {
	it('2[km]*3[km] → 6[km^2], pas 6[m^2]', () => {
		expect(simp('2[km]*3[km]')).toBe('6[km^2]');
	});

	it('(3[km])^2 → 9[km^2]', () => {
		expect(simp('(3[km])^2')).toBe('9[km^2]');
	});

	it('2[km]*3[h] → 6[km.h]', () => {
		expect(simp('2[km]*3[h]')).toBe('6[km.h]');
	});

	it('6[km^2] ≡ 2[km]*3[km] (aller-retour par le parseur d’unités)', () => {
		expect(eq('6[km^2]', '2[km]*3[km]')).toBe(true);
	});

	it('12[km/h] reste 12[km/h]', () => {
		expect(simp('12[km/h]')).toBe('12[km/h]');
	});
});

describe('unités affines (°C) — opaques en bloc, jamais composées', () => {
	it('20[°C] ≢ 20[K] (le décalage fait partie du hash)', () => {
		expect(eq('20[°C]', '20[K]')).toBe(false);
	});

	it('20[°C] ≡ 20[°C]', () => {
		expect(eq('20[°C]', '20[°C]')).toBe(true);
	});

	it('20[°C] ≢ 20', () => {
		expect(eq('20[°C]', '20')).toBe(false);
	});

	it('2[°C]*3[m] et (2[°C])^2 ne lèvent pas d’exception dans normalize → denormalize', () => {
		expect(() => round('2[°C]*3[m]')).not.toThrow();
		expect(() => round('(2[°C])^2')).not.toThrow();
	});
});

describe('limite assumée — aucune conversion entre unités', () => {
	it('12[km] ≢ 12000[m] : les unités sont opaques, normalize ne convertit pas', () => {
		expect(eq('12[km]', '12000[m]')).toBe(false);
	});
});

describe('\\sin^{-1}(x) — notation de la réciproque, pas 1/sin(x)', () => {
	it('\\sin^{-1}(x) ≢ \\frac{1}{\\sin(x)}', () => {
		expect(areEquivalent(parseLatex('\\sin^{-1}(x)'), parseLatex('\\frac{1}{\\sin(x)}'))).toBe(
			false
		);
	});

	it('\\sin^{-1}(x) ≡ \\sin^{-1}(x)', () => {
		expect(areEquivalent(parseLatex('\\sin^{-1}(x)'), parseLatex('\\sin^{-1}(x)'))).toBe(true);
	});

	it('\\sin^{-2}(x) ≡ \\frac{1}{\\sin(x)^2} (seul −1 est réservé)', () => {
		expect(areEquivalent(parseLatex('\\sin^{-2}(x)'), parseLatex('\\frac{1}{\\sin(x)^2}'))).toBe(
			true
		);
	});
});

describe('quotients — contenu numérique avec coefficients à radicaux', () => {
	it('(2√2·x)/(4y) ≡ (√2·x)/(2y)', () => {
		expect(eq('(2*sqrt(2)*x)/(4y)', '(sqrt(2)*x)/(2y)')).toBe(true);
	});

	it('(2x+2√2)/(4y) ≡ (x+√2)/(2y)', () => {
		expect(eq('(2x+2*sqrt(2))/(4y)', '(x+sqrt(2))/(2y)')).toBe(true);
	});

	it('(√2·x)/(2y) ≢ (√2·x)/y', () => {
		expect(eq('(sqrt(2)*x)/(2y)', '(sqrt(2)*x)/y')).toBe(false);
	});
});
