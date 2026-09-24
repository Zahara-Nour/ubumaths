/**
 * Trois pièges de la notation des unités (2026-09-24, docs/ref/notation-unites.md).
 *
 * 1. `kg/m.s` se lisait kg·m⁻¹·s — alors que le formateur écrit kg·m⁻¹·s⁻¹
 *    `g/m.s`. Désormais refusé comme ambigu ; `kg/(m.s)` est accepté, et le
 *    formateur écrit les parenthèses.
 * 2. `3[m]^2` se lisait (3 m)² = 9 m², et le LaTeX empilait deux exposants.
 *    Un exposant juste après une unité est refusé ; `(3[m])^2` reste valide, et
 *    les générateurs parenthèsent une grandeur élevée à une puissance.
 * 3. Le parseur LaTeX refusait toute commande d'espacement (`a\,b`, `3\,\unit{cm}`)
 *    et exigeait `~` devant `\unit`. Les espacements sont ignorés, `\unit` se
 *    colle à ce qui précède.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../index';
import { parseLatexSafe } from '../../index';
import { parse as parseUnit, unitWritingProblem } from '../../../units/parser';
import { format } from '../../../units/formatter';
import { unitWritingToLatex, unitWritingToTypst } from '../../../units/display';
import { toLatex } from '../../../latex-generator';
import { toCustom } from '../../../custom-generator';
import { number, superscript, withUnit } from '../../../factory';
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

function unitComponents(writing: string): string {
	const u = parseUnit(writing);
	return u ? JSON.stringify([...u.components].sort()) + ` ×${u.coefficient}` : 'null';
}

function quantity(node: MathNode | null | undefined): string {
	if (!node || !isUnit(node)) return 'pas une grandeur';
	return `${toLatex(node.expression)} | ${JSON.stringify([...node.unit.components].sort())} ×${node.unit.coefficient}`;
}

// =============================================================================
// Piège 1 — la portée du `/`
// =============================================================================

describe('piège 1 — lecteur d’unités : `/` puis `.` est ambigu', () => {
	it.each(['kg/m.s', 'kg/m*s', 'kg/m·s', 'J/kg.K'])('%s est refusé', (writing) => {
		expect(parseUnit(writing)).toBeNull();
		expect(unitWritingProblem(writing)).toMatch(/ambiguous/i);
	});

	it.each([
		['kg/(m.s)', 'kg.m^-1.s^-1'],
		['kg/(m.s^2)', 'kg.m^-1.s^-2'],
		['J/(kg.K)', 'J.kg^-1.K^-1'],
		['kg/m/s', 'kg.m^-1.s^-1'],
		['m.s/kg', 'm.s.kg^-1'],
		['km/h', 'km.h^-1']
	])('%s vaut %s', (writing, expected) => {
		expect(unitComponents(writing)).toBe(unitComponents(expected));
	});

	it.each(['kg/(m.s', 'kg/(m.(s))', '(m.s)', 'kg/()', 'kg/(m.s)^2', 'kg/(m.s).K'])(
		'%s reste invalide',
		(writing) => {
			expect(parseUnit(writing)).toBeNull();
		}
	);

	it('une écriture valide n’a pas de problème à signaler', () => {
		expect(unitWritingProblem('kg/(m.s)')).toBeNull();
	});
});

describe('piège 1 — le formateur écrit ce que le parseur relit', () => {
	it.each([
		['kg.m^-1.s^-1', 'g/(m.s)'],
		['kg.m^-1.s^-2', 'g/(m.s^2)'],
		['m.s^-2', 'm/s^2'],
		['kg.m^-3', 'g/m^3']
	])('%s → %s', (writing, expected) => {
		expect(format(parseUnit(writing)!, 'fraction')).toBe(expected);
	});

	it('la forme « fraction » se relit avec les mêmes composants', () => {
		const u = parseUnit('kg.m^-1.s^-1')!;
		const back = parseUnit(format(u, 'fraction'))!;
		expect([...back.components].sort()).toEqual([...u.components].sort());
	});
});

describe.each(CUSTOM_PARSERS)('piège 1 — parseur custom %s', (_name, parse) => {
	it('3[kg/m.s] est refusé avec un message qui dit quoi écrire', () => {
		expect(parse('3[kg/m.s]').errors?.[0]?.message).toMatch(/ambiguous.*kg\/\(m\.s\)/i);
	});

	it('3[kg/(m.s)] se lit', () => {
		expect(quantity(parse('3[kg/(m.s)]').ast)).toBe(quantity(parse('3[kg.m^-1.s^-1]').ast));
	});
});

describe.each(LATEX_PARSERS)('piège 1 — parseur LaTeX %s', (_name, parse) => {
	it('3~\\unit{kg/(m.s)} se lit, 3~\\unit{kg/m.s} est refusé', () => {
		expect(quantity(parse('3~\\unit{kg/(m.s)}').ast)).toBe(
			quantity(parse('3~\\unit{kg.m^-1.s^-1}').ast)
		);
		expect(parse('3~\\unit{kg/m.s}').errors?.[0]?.message).toMatch(/ambiguous/i);
	});
});

describe('piège 1 — affichage des parenthèses', () => {
	it('LaTeX', () => {
		expect(unitWritingToLatex('kg/(m.s)')).toBe('\\mathrm{kg}/(\\mathrm{m}\\cdot\\mathrm{s})');
	});

	it('Typst : la barre reste collée, les parenthèses sont des symboles', () => {
		expect(unitWritingToTypst('kg/(m.s)')).toBe(
			'upright("kg")"/"paren.l upright("m") dot.op upright("s") paren.r'
		);
	});
});

// =============================================================================
// Piège 2 — un exposant juste après une unité
// =============================================================================

describe.each(CUSTOM_PARSERS)('piège 2 — parseur custom %s', (_name, parse) => {
	it.each(['3[m]^2', '3[m^2]^2', '3[m]^{2}'])('%s est refusé', (input) => {
		const r = parse(input);
		expect(r.ast ?? null).toBeNull();
		expect(r.errors?.[0]?.message).toMatch(/exponent after a unit.*3\[m\^2\].*\(3\[m\]\)\^2/i);
	});

	it('(3[m])^2 reste la puissance de la grandeur', () => {
		expect(parse('(3[m])^2').errors ?? []).toEqual([]);
	});
});

describe.each(LATEX_PARSERS)('piège 2 — parseur LaTeX %s', (_name, parse) => {
	it('3~\\unit{m}^2 est refusé, \\left(3~\\unit{m}\\right)^2 est lu', () => {
		expect(parse('3~\\unit{m}^2').errors?.[0]?.message).toMatch(/exponent after a unit/i);
		expect(parse('\\left(3~\\unit{m}\\right)^2').errors ?? []).toEqual([]);
	});
});

describe('piège 2 — les générateurs parenthèsent une grandeur élevée à une puissance', () => {
	// Un arbre construit par le code (tidy, calcul) n'est pas passé par le parseur
	const squared = superscript(withUnit(number('3'), parseUnit('m')!), number('2'));

	it('LaTeX : pas de double exposant, et le résultat se relit', () => {
		const latex = toLatex(squared);
		expect(latex).not.toMatch(/\\unit\{[^}]*\}\^/);
		expect(parseLatexSafe(latex).errors ?? []).toEqual([]);
	});

	it('même chose en mode couleurs (renderMetadata)', () => {
		expect(toLatex(squared, { renderMetadata: true })).not.toMatch(/\\unit\{[^}]*\}\^/);
		expect(toCustom(squared, { renderMetadata: true })).toBe('(3[m])^2');
	});

	it('custom : (3[m])^2, qui se relit', () => {
		expect(toCustom(squared)).toBe('(3[m])^2');
		expect(parseCustomPrattSafeRaw(toCustom(squared)).errors ?? []).toEqual([]);
	});
});

// =============================================================================
// Piège 3 — espacements LaTeX
// =============================================================================

describe.each(LATEX_PARSERS)('piège 3 — parseur LaTeX %s : espacements ignorés', (_name, parse) => {
	it.each([
		['a\\,b', 'ab'],
		['2\\,x', '2x'],
		['2\\;x', '2x'],
		['2\\:x', '2x'],
		['2\\ x', '2x'],
		['2\\!x', '2x'],
		['2\\quad x', '2x'],
		['3~x', '3x']
	])('%s se lit comme %s', (spaced, plain) => {
		const a = parse(spaced);
		expect(a.errors ?? []).toEqual([]);
		expect(toLatex(a.ast!)).toBe(toLatex(parse(plain).ast!));
	});

	it.each([
		'3~\\unit{cm}',
		'3\\,\\unit{cm}',
		'3\\;\\unit{cm}',
		'3\\ \\unit{cm}',
		'3 \\unit{cm}',
		'3\\unit{cm}'
	])('%s est la grandeur 3 cm', (input) => {
		expect(quantity(parse(input).ast)).toBe(quantity(parse('3~\\unit{cm}').ast));
	});

	it('une espace DANS l’unité reste refusée, même écrite \\,', () => {
		expect(parse('3~\\unit{m\\,s}').errors?.[0]?.message).toMatch(/space/i);
	});

	it('\\unit seul reste une unité sans nombre', () => {
		expect(parse('\\unit{cm}').errors ?? []).toEqual([]);
	});
});
