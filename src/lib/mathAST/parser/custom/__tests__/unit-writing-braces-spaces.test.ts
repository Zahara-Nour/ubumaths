/**
 * Écriture d'une unité : accolades d'exposant et espaces (2026-09-24).
 *
 * A. Un exposant négatif s'écrit `x^{-2}` — le parseur refuse `x^-2`. L'unité
 *    refusait au contraire les accolades : `3[m.s^{-1}]` échouait (« Expected ']'
 *    after unit »), dans les deux parseurs custom, le parseur LaTeX et le lecteur
 *    d'unités. Les deux formes sont désormais acceptées.
 * C. Une espace dans une unité était avalée en silence : `3[m s^-1]` devenait
 *    `ms^-1`, soit « par milliseconde » (1000 s⁻¹ au lieu de m·s⁻¹). Elle est
 *    désormais refusée avec un message qui dit comment écrire.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../index';
import { parseLatexSafe } from '../../index';
import { parse as parseUnit } from '../../../units/parser';
import { toLatex } from '../../../latex-generator';
import { toCustom } from '../../../custom-generator';
import { isUnit } from '../../../guards';
import type { MathNode } from '../../../types';

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const LATEX_PARSERS = [
	['Pratt', (s: string) => parseLatexSafe(s)],
	['RD', (s: string) => parseLatexSafe(s, { parser: 'rd' })]
] as const;

/** Les composants d'unité d'un nœud grandeur, triés, pour comparer deux écritures. */
function components(node: MathNode | undefined): string {
	if (!node || !isUnit(node)) return 'pas une grandeur';
	return JSON.stringify([...node.unit.components].sort()) + ` ×${node.unit.coefficient}`;
}

describe('A — lecteur d’unités : exposant entre accolades', () => {
	it.each([
		['m.s^{-1}', 'm.s^-1'],
		['m^{2}', 'm^2'],
		['m/s^{2}', 'm/s^2'],
		['kg.m^{-3}', 'kg.m^-3']
	])('%s vaut %s', (braced, plain) => {
		const a = parseUnit(braced);
		const b = parseUnit(plain);
		expect(a).not.toBeNull();
		expect([...a!.components].sort()).toEqual([...b!.components].sort());
		expect(a!.coefficient).toBe(b!.coefficient);
	});

	it.each(['m^{-}', 'm^{2', 'm^{}', 'm^(-1)'])('%s reste invalide', (bad) => {
		expect(parseUnit(bad)).toBeNull();
	});
});

describe.each(CUSTOM_PARSERS)(
	'A — parseur custom %s : accolades dans une unité',
	(_name, parse) => {
		it.each([
			['3[m.s^{-1}]', '3[m.s^-1]'],
			['3[m^{2}]', '3[m^2]'],
			['3[m/s^{2}]', '3[m/s^2]']
		])('%s se lit comme %s', (braced, plain) => {
			const a = parse(braced);
			expect(a.errors ?? []).toEqual([]);
			expect(components(a.ast)).toBe(components(parse(plain).ast));
		});

		it('l’écriture relue garde ses accolades', () => {
			expect(toCustom(parse('3[m.s^{-1}]').ast!)).toBe('3[m.s^{-1}]');
		});

		it('la grandeur produite se relit en LaTeX', () => {
			const latex = toLatex(parse('3[m.s^{-1}]').ast!);
			const back = parseLatexSafe(latex);
			expect(back.errors ?? []).toEqual([]);
			expect(components(back.ast)).toBe(components(parse('3[m.s^-1]').ast));
		});
	}
);

describe.each(LATEX_PARSERS)('A — parseur LaTeX %s : accolades dans \\unit', (_name, parse) => {
	it.each([
		['3~\\unit{m.s^{-1}}', '3~\\unit{m.s^-1}'],
		['3~\\unit{m^{2}}', '3~\\unit{m^2}']
	])('%s se lit comme %s', (braced, plain) => {
		const a = parse(braced);
		expect(a.errors ?? []).toEqual([]);
		expect(components(a.ast)).toBe(components(parse(plain).ast));
	});
});

describe.each(CUSTOM_PARSERS)('C — parseur custom %s : espace dans une unité', (_name, parse) => {
	it.each(['3[m s^-1]', '3[km h^-1]', '3[km / h]'])(
		'%s est refusé, sans lecture silencieuse',
		(input) => {
			const r = parse(input);
			expect(r.ast ?? null).toBeNull();
			expect(r.errors?.[0]?.message).toMatch(/space/i);
		}
	);

	it('une espace autour de l’unité reste admise', () => {
		expect(parse('3[ km/h ]').errors ?? []).toEqual([]);
	});
});

describe.each(LATEX_PARSERS)('C — parseur LaTeX %s : espace dans \\unit', (_name, parse) => {
	it('3~\\unit{m s^-1} est refusé', () => {
		const r = parse('3~\\unit{m s^-1}');
		expect(r.ast ?? null).toBeNull();
		expect(r.errors?.[0]?.message).toMatch(/space/i);
	});

	it('l’espace qui termine une commande (\\cdot s) n’en est pas une', () => {
		const r = parse('3~\\unit{m\\cdot s^-1}');
		expect(r.errors ?? []).toEqual([]);
		expect(components(r.ast)).toBe(components(parse('3~\\unit{m.s^-1}').ast));
	});
});
