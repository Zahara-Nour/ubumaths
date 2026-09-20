/**
 * Findings de la revue de code du module `tidy` (2026-09-20), chacun reproduit
 * avant d'être corrigé. Complète `tidy.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import {
	add,
	subtract,
	implicitMultiply,
	fraction,
	number,
	positiveInfinity,
	withUnit
} from '../../factory';
import { parseOrThrow as unitOf } from '../../units/parser';
import type { MathNode } from '../../types';

const t = (s: string) => toCustom(tidy(parseCustom(s)));
const twice = (s: string) => toCustom(tidy(tidy(parseCustom(s))));

// =============================================================================
// C1 — idempotence : la base d'un facteur est mise au propre AVANT d'être absorbée
// =============================================================================

describe('C1 — une seule passe suffit', () => {
	it.each([
		['x*(3-1)', '2x'],
		['x/(2-1)', 'x'],
		['(1+1)^3*sqrt(y)', '8sqrt(y)'],
		['(0+sqrt(8))^2', '8'],
		['(0-1)/cos(3)', '-1/cos(3)']
	])('%s → %s en une passe', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it.each(['(y+sin(x))/(2-1)+cos(1)', 'x*(3-1)', '(1+1)^3*sqrt(y)', '(0+sqrt(8))^2'])(
		'idempotent dès la première passe : %s',
		(input) => {
			expect(twice(input)).toBe(t(input));
		}
	);

	it('une somme arrivée comme base de facteur est aplatie', () => {
		expect(t('(y+sin(x))/(2-1)')).toBe(t('y+sin(x)'));
	});
});

// =============================================================================
// C2 — un coefficient nul n'efface pas une division par zéro
// =============================================================================

describe('C2 — 0/0 n’est pas 0', () => {
	it('0/0 reste 0/0', () => {
		expect(t('0/0')).toBe('0/0');
	});

	it('0*(1/0) ne devient pas 0', () => {
		expect(t('0*(1/0)')).not.toBe('0');
	});

	it('x/0 reste tel quel', () => {
		expect(t('x/0')).toBe('x/0');
	});
});

// =============================================================================
// C3 — l'infini est laissé tel quel, même au milieu d'une somme ou d'un produit
// =============================================================================

describe('C3 — infini opaque (nœuds construits par la fabrique : « ∞ » parsé est une variable)', () => {
	const inf = positiveInfinity();
	const unchanged = (node: MathNode) => expect(toCustom(tidy(node))).toBe(toCustom(node));

	it('∞ − ∞ reste ∞ − ∞', () => {
		unchanged(subtract(inf, inf));
	});

	it('∞ / ∞ reste ∞ / ∞', () => {
		unchanged(fraction(inf, inf));
	});

	it('∞ · ∞ reste ∞ · ∞', () => {
		unchanged(implicitMultiply(inf, inf));
	});

	it('x + ∞ + x : les x se regroupent, ∞ reste', () => {
		const node = add(add(parseCustom('x'), inf), parseCustom('x'));
		const out = toCustom(tidy(node));
		expect(out).toContain('2x');
		expect(out).toContain(toCustom(inf));
	});
});

// =============================================================================
// C4 / C5 — grandeurs : produits et quotients composent l'unité ; les affines restent opaques
// =============================================================================

describe('C4 — produit et quotient de grandeurs', () => {
	it('12[km]*3[km] → 36[km^2], en une passe', () => {
		expect(t('12[km]*3[km]')).toBe('36[km^2]');
		expect(twice('12[km]*3[km]')).toBe('36[km^2]');
	});

	it('6[km] / 2[h] → 3[km/h]', () => {
		const node = fraction(withUnit(number('6'), unitOf('km')), withUnit(number('2'), unitOf('h')));
		expect(toCustom(tidy(node))).toBe('3[km/h]');
	});

	it('jamais de nœud unit imbriqué', () => {
		const out = tidy(parseCustom('12[km]*3[km]'));
		expect(out.type).toBe('unit');
		if (out.type !== 'unit') return;
		expect(out.expression.type).not.toBe('unit');
	});

	it('12[km]+3[h] ne fusionne pas', () => {
		expect(t('12[km]+3[h]')).toBe('12[km]+3[h]');
	});
});

describe('C5 — températures : opaques, jamais composées', () => {
	it('20[°C]+5[°C] reste tel quel', () => {
		expect(t('20[°C]+5[°C]')).toBe('20[°C]+5[°C]');
	});

	it('2*20[°C] reste tel quel', () => {
		expect(t('2*20[°C]')).toBe('2*20[°C]');
	});
});

// =============================================================================
// C6 — exposant nul · C7 — racine d'une fraction
// =============================================================================

describe('C6 — exposant nul', () => {
	it('x^0 → 1 et 2^0 → 1', () => {
		expect(t('x^0')).toBe('1');
		expect(t('2^0')).toBe('1');
	});

	it('0^0 reste 0^0', () => {
		expect(t('0^0')).toBe('0^0');
	});
});

describe('C7 — sqrt(1/2) comme 1/sqrt(2)', () => {
	it('sqrt(1/2) → sqrt(2)/2', () => {
		expect(t('sqrt(1/2)')).toBe('sqrt(2)/2');
	});

	it('sqrt(4/9) → 2/3', () => {
		expect(t('sqrt(4/9)')).toBe('2/3');
	});
});

// =============================================================================
// R2 — les grands exposants restent symboliques
// =============================================================================

describe('R2 — plafond sur l’évaluation des puissances', () => {
	it('2^10 → 1024 et (1/2)^3 → 1/8', () => {
		expect(t('2^10')).toBe('1024');
		expect(t('(1/2)^3')).toBe('1/8');
	});

	it('2^100000 reste 2^100000', () => {
		expect(t('2^100000')).toBe('2^100000');
	});
});

// =============================================================================
// K1 — un seul ordre canonique, aussi dans les sommes imbriquées
// =============================================================================

describe('K1 — sommes imbriquées canoniques', () => {
	it.each([
		['2(x+h)^2+3(h+x)^2', '5(h+x)^2'],
		['(x+h)^2*(h+x)', '(h+x)^3'],
		['(y+z)^2+(z+y)^2', '2(y+z)^2'],
		['x*(z+y)', 'x(y+z)'],
		['sin(b+a)+sin(a+b)', '2sin(a+b)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it.each(['2(x+h)^2+3(h+x)^2', '(x+h)^2*(h+x)'])('conserve la valeur : %s', (input) => {
		const node = parseCustom(input);
		expect(areEquivalent(tidy(node), node)).toBe(true);
	});
});
