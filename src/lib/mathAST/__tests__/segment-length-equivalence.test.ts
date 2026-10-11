/**
 * Longueurs de segments et équivalence (garde du lot 1).
 *
 * Le hachage des nœuds (`normal/hash.ts`) rendait `'UNKNOWN'` pour tout type qu'il ne
 * connaissait pas : deux longueurs DIFFÉRENTES (`AB`, `AC`) avaient la même empreinte,
 * donc `areEquivalent(AB, AC)` était vrai. Une longueur s'empreinte désormais par ses
 * points, dans l'ordre canonique (`AB` = `BA`, décision Q2 du 2026-10-11).
 *
 * Toujours sur des entrées PARSÉES, coefficient ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { parseLatex } from '../parser';
import { tidy } from '../tidy';
import { toLatex } from '../latex-generator';

/** Lecture en mode longueur, demandé explicitement (défaut du parseur : produit). */
function read(latex: string) {
	return parseLatex(latex, { capitalPairs: 'length' });
}

function equivalent(a: string, b: string): boolean {
	return areEquivalent(read(a), read(b));
}

describe('longueurs : deux segments différents ne sont jamais équivalents', () => {
	it.each([
		['AB', 'AC'],
		['3AB', '3CD'],
		['AB^2', 'AC^2'],
		['AB^2=9', 'AC^2=9'],
		["A'B'", 'AB'],
		['A_1B_1', 'AB'],
		['ABC', 'ABD'],
		['ABC', 'ACB']
	])('%s ≢ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(false);
	});
});

describe('longueurs : AB = BA', () => {
	it.each([
		['BA', 'AB'],
		['3BA^2', '3AB^2'],
		['BA^2=9', 'AB^2=9'],
		['2AB', 'AB+BA']
	])('%s ≡ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(true);
	});

	it('une longueur n’est pas le produit de ses lettres : AB ≢ A×B', () => {
		expect(equivalent('AB', 'A\\times B')).toBe(false);
	});

	it('tidy(3AB + 2BA) = 5AB', () => {
		expect(toLatex(tidy(read('3AB+2BA')))).toBe('5 AB');
	});

	it('tidy(3AB + 2AC) garde deux termes', () => {
		expect(toLatex(tidy(read('3AB+2AC')))).toBe('3 AB + 2 AC');
	});
});
