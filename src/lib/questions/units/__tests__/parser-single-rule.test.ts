/**
 * Une seule règle d'écriture des unités pour la correction
 * =========================================================
 *
 * `parseUnitExpression` (correction des réponses) doit lire les unités comme
 * `mathAST/units/parser.ts` (référence : `docs/ref/notation-unites.md`), après
 * conversion des exposants Unicode (`m²` → `m^2`). En particulier `kg/m.s`,
 * ambigu, est refusé partout.
 */

import { describe, test, expect } from 'vitest';
import { parseUnitExpression, parseLatexQuantity } from '../parser';
import { validateQuantityAnswer } from '../validator';
import type { Unit } from '../types';

/** Composants triés, pour comparer sans dépendre de l'ordre d'insertion. */
function componentsOf(unit: Unit | null): [string, number][] {
	if (!unit) return [];
	return [...unit.components.entries()].sort(([a], [b]) => a.localeCompare(b));
}

describe('parseUnitExpression — écritures déjà lues, inchangées', () => {
	const cases: { input: string; components: [string, number][]; coefficient: number }[] = [
		{ input: 'km', components: [['m', 1]], coefficient: 1000 },
		{
			input: 'm.s^-1',
			components: [
				['m', 1],
				['s', -1]
			],
			coefficient: 1
		},
		{
			input: 'm.s^{-1}',
			components: [
				['m', 1],
				['s', -1]
			],
			coefficient: 1
		},
		{
			input: 'kg/(m.s)',
			components: [
				['g', 1],
				['m', -1],
				['s', -1]
			],
			coefficient: 1000
		},
		{
			input: 'km/h',
			components: [
				['m', 1],
				['s', -1]
			],
			coefficient: 1000 / 3600
		},
		{ input: 'min', components: [['s', 1]], coefficient: 60 },
		{
			input: 'm/s^2',
			components: [
				['m', 1],
				['s', -2]
			],
			coefficient: 1
		}
	];

	for (const { input, components, coefficient } of cases) {
		test(`${input}`, () => {
			const unit = parseUnitExpression(input);
			expect(unit).not.toBeNull();
			expect(componentsOf(unit)).toEqual(components);
			expect(unit?.coefficient).toBeCloseTo(coefficient, 10);
		});
	}

	test('°C reste lu comme une unité simple', () => {
		const unit = parseUnitExpression('°C');
		expect(unit).not.toBeNull();
		expect(unit?.components.size).toBe(1);
	});
});

describe('parseUnitExpression — exposants Unicode convertis en ^n', () => {
	test('m² = m^2', () => {
		expect(componentsOf(parseUnitExpression('m²'))).toEqual([['m', 2]]);
	});

	test('cm³ = cm^3', () => {
		const unit = parseUnitExpression('cm³');
		expect(componentsOf(unit)).toEqual([['m', 3]]);
		expect(unit?.coefficient).toBeCloseTo(1e-6, 12);
	});

	test('m.s⁻¹ = m.s^-1', () => {
		expect(componentsOf(parseUnitExpression('m.s⁻¹'))).toEqual([
			['m', 1],
			['s', -1]
		]);
	});
});

describe('parseUnitExpression — écriture ambiguë refusée', () => {
	test('kg/m.s est refusé (null), comme dans mathAST', () => {
		expect(parseUnitExpression('kg/m.s')).toBeNull();
	});
});

describe('parseLatexQuantity — même règle au travers de \\unit{}', () => {
	test('5\\unit{m²} → 5 m²', () => {
		const q = parseLatexQuantity('5\\unit{m²}');
		expect(q).not.toBeNull();
		expect(q?.value).toBe(5);
		expect(componentsOf(q?.unit ?? null)).toEqual([['m', 2]]);
	});

	test('3\\unit{kg/m.s} → null', () => {
		expect(parseLatexQuantity('3\\unit{kg/m.s}')).toBeNull();
	});
});

describe('validateQuantityAnswer — kg/(m.s) = kg.m^-1.s^-1', () => {
	test('la réponse parenthésée est correcte', () => {
		const result = validateQuantityAnswer('3\\unit{kg/(m.s)}', '3\\unit{kg.m^-1.s^-1}');
		expect(result.isCorrect).toBe(true);
	});
});
