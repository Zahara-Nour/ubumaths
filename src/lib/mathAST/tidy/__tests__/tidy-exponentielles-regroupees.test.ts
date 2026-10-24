/**
 * Des exponentielles identiques qui se regroupent s'écrivent avec la règle des
 * exposants (Q29, chantier simplify-carte, David, 2026-10-24) : `eˣ·eˣ → e^{2x}`,
 * comme on l'écrit en classe, et non `(eˣ)²`. Une puissance TAPÉE reste telle
 * quelle (`(eˣ)²`) ; deux exposants différents ne se regroupent pas (Q31 :
 * `eˣ·e^{−x} = 1` est la propriété qu'on enseigne, elle relève de `réduire`).
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';

const canonical = (s: string) => toCustom(tidy(parseCustom(s)));
const kept = (s: string) => toCustom(tidy(parseCustom(s), { order: 'kept' }));

const CASES: readonly (readonly [string, string])[] = [
	// Des facteurs identiques regroupés
	['e^x*e^x', 'e^{2x}'],
	['3e^x*2e^x', '6e^{2x}'],
	['e^x*e^x*x', 'xe^{2x}'],
	['(e^x)^2*e^x', 'e^{3x}'],
	['e^{x+1}*e^{x+1}', 'e^{2(x+1)}'],
	['e^{-x}*e^{-x}', 'e^{-2x}'],
	['2^x*2^x', '2^{2x}'],
	['(e^x)^3/e^x', 'e^{2x}'],
	['1/(e^x*e^x)', '1/{e^{2x}}'],
	// Une puissance tapée reste telle quelle
	['(e^x)^2', '(e^x)^2'],
	['(2^x)^3', '(2^x)^3'],
	// Deux exposants différents : pas de regroupement (Q31)
	['e^x*e^{2x}', 'e^xe^{2x}'],
	['e^x*e^{-x}', 'e^xe^{-x}'],
	// Une base qui contient une inconnue n'est pas une exponentielle
	['x^x*x^x', '(x^x)^2'],
	['(e^x+1)(e^x+1)', '(e^x+1)^2'],
	// Ni π (équivalence non reconnue), ni une base négative ou nulle
	['\\pi^x*\\pi^x', '(\\pi^x)^2'],
	['(-2)^x*(-2)^x', '((-2)^x)^2'],
	// Une puissance tapée reste, mais se regroupe avec sa forme e^{2x} (revue)
	['(e^x)^2+e^x*e^x', '2(e^x)^2'],
	['e^x*e^x+(e^x)^2', '2e^{2x}'],
	['e^x*e^x*e^x+(e^x)^3', '2e^{3x}'],
	['e^x*e^x+e^{2x}', '2e^{2x}'],
	['e^x*e^x-e^{2x}', '0'],
	['(e^x)^2-e^{2x}', '0']
];

describe('exponentielles regroupées (Q29) — défaut', () => {
	it.each(CASES)('%s → %s', (input, expected) => {
		expect(canonical(input)).toBe(expected);
	});
});

describe("exponentielles regroupées (Q29) — order: 'kept'", () => {
	it.each(CASES)('%s → %s', (input, expected) => {
		expect(kept(input)).toBe(expected);
	});
});

// Sur l'arbre : `toCustom` écrit `e^xe^{2x}`, qui se relit `e^{xe^{2x}}`
describe('exponentielles regroupées (Q29) — idempotent', () => {
	it.each(CASES)('%s', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});
});
