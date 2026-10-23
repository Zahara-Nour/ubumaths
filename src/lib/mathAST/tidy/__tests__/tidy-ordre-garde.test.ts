/**
 * `tidy({ order: 'kept' })` — les termes d'une somme gardent l'ordre écrit
 * (S2, lot 4c du chantier simplify-carte, comportements validés par David le
 * 2026-10-23, journal § 41).
 *
 * Les termes de CHAQUE somme restent dans l'ordre écrit, parenthèses comprises ;
 * les termes semblables se regroupent à la place du premier. L'ordre des
 * facteurs d'un produit reste canonique (`x·2 → 2x`). Le reste du contrat ne
 * bouge pas (décimaux S1, domaine S3).
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { tidyTerms } from '../terms';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';

const kept = (s: string) => toCustom(tidy(parseCustom(s), { order: 'kept' }));

describe("tidy({ order: 'kept' }) — l'ordre écrit des termes reste", () => {
	it.each([
		['3+2x', '3+2x'],
		['3+x^2-2x', '3+x^2-2x'],
		['-6x+2', '-6x+2'],
		['1-x', '1-x'],
		['3(1+x)', '3(1+x)'],
		['(1+x)^2+x', '(1+x)^2+x'],
		['(1+2x)/3', '{1+2x}/3'],
		['3+2x=5', '3+2x=5']
	])('%s → %s', (input, expected) => {
		expect(kept(input)).toBe(expected);
	});
});

describe("tidy({ order: 'kept' }) — les termes semblables se regroupent à la place du premier", () => {
	it.each([
		['1+2x+3x', '1+5x'],
		['2-x+3x', '2+2x'],
		['x+1+x', '2x+1'],
		['1+x-3x', '1-2x'],
		['x+1-x', '1'],
		['x+1-x+2x', '2x+1'],
		// La comparaison se fait sur la forme rangée : (1+x) et (x+1) sont semblables
		['2(1+x)+3(x+1)', '5(1+x)']
	])('%s → %s', (input, expected) => {
		expect(kept(input)).toBe(expected);
	});
});

describe("tidy({ order: 'kept' }) — le reste du contrat ne change pas", () => {
	it.each([
		// L'ordre des facteurs reste canonique
		['x*2+1', '2x+1'],
		['3+x*2', '3+2x'],
		// Neutres, décimaux (S1), domaine (S3)
		['3+x+0', '3+x'],
		['0.5+0.25+x', '0.75+x'],
		['1+x/x', '1+x/x']
	])('%s → %s', (input, expected) => {
		expect(kept(input)).toBe(expected);
	});

	it("sans l'option, l'ordre canonique reste le défaut : 3+2x → 2x+3", () => {
		expect(toCustom(tidy(parseCustom('3+2x')))).toBe('2x+3');
	});

	it.each(['3+2x', '1+2x+3x', '2(1+x)+3(x+1)', '3+x^2-2x', '-6x+2', '(1+2x)/3'])(
		'%s : valeur conservée et idempotent',
		(input) => {
			const once = tidy(parseCustom(input), { order: 'kept' });
			expect(areEquivalent(once, parseCustom(input))).toBe(true);
			expect(toCustom(tidy(once, { order: 'kept' }))).toBe(toCustom(once));
		}
	);
});

describe("tidyTerms — reconstruit sur order: 'kept' (Q12)", () => {
	const terms = (s: string) => toCustom(tidyTerms(parseCustom(s)));

	it.each([
		// Regroupé sur place, plus tout l'ordre canonique
		['1+2x+3x', '1+5x'],
		['3(1+x)+x', '3(1+x)+x'],
		// Q11 : la règle des dérivées du 2026-10-06 reste par-dessus
		['-6x+2', '2-6x']
	])('%s → %s', (input, expected) => {
		expect(terms(input)).toBe(expected);
	});
});
