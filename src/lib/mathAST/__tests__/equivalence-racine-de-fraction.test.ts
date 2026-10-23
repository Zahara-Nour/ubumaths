/**
 * La racine d'une fraction numérique se compare à sa forme rationalisée, même
 * quand aucun carré ne sort (chantier simplify-carte, lot 4b-bis, § 39).
 * Avant : `√(1/3)` restait opaque dans la forme d'équivalence, et un élève qui
 * tapait `√(1/3)` pour `√3/3` était refusé.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '../parser/custom';
import { areEquivalent } from '../equivalence';

const eq = (a: string, b: string) => areEquivalent(parseCustom(a), parseCustom(b));

describe("areEquivalent — racine d'une fraction numérique", () => {
	it.each([
		['sqrt(1/2)', 'sqrt(2)/2'],
		['sqrt(1/2)', '1/sqrt(2)'],
		['sqrt(1/3)', 'sqrt(3)/3'],
		['sqrt(3/2)', 'sqrt(6)/2'],
		['sqrt(5/3)', 'sqrt(15)/3'],
		['sqrt(2/3)', 'sqrt(6)/3'],
		['sqrt(0.5)', 'sqrt(2)/2'],
		['sqrt(0.2)', 'sqrt(5)/5'],
		['sqrt(2.5)', 'sqrt(10)/2'],
		['2sqrt(1/2)', 'sqrt(2)'],
		['sqrt(1/2)+1', '1+sqrt(2)/2'],
		['x*sqrt(1/3)', 'x*sqrt(3)/3'],
		// Déjà justes avant, à garder
		['sqrt(1/8)', 'sqrt(2)/4'],
		['sqrt(3/4)', 'sqrt(3)/2'],
		['sqrt(1/4)', '1/2'],
		['sqrt(0.25)', '0.5']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it.each([
		['sqrt(1/2)', 'sqrt(2)'],
		['sqrt(1/3)', 'sqrt(3)'],
		['sqrt(1/3)', '1/3'],
		['sqrt(3/2)', 'sqrt(3)/2']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});
