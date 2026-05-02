/**
 * Tests for reservation of `\pi` and `e` as constants — they cannot be
 * assigned to as variables in any LHS form (assignment, indexed, destructure).
 *
 * Phase 6 of dsl-mathast-routing plan. Q7 = α (strict reservation).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(source: string) {
	return interpret(parse(source));
}

describe('Phase 6 — \\pi reserved in LHS', () => {
	it('A6: \\pi = 5 → erreur "constante réservée"', () => {
		expect(() => run('\\pi = 5')).toThrow(/réservée|reservee/i);
	});

	it('A7: \\pi[0] = 5 → erreur', () => {
		expect(() => run('\\pi[0] = 5')).toThrow(/réservée|reservee/i);
	});

	it('A8: (\\pi, x) = (1, 2) → erreur', () => {
		expect(() => run('(\\pi, x) = (1, 2)')).toThrow(/réservée|reservee/i);
	});

	it('A9: e = 5 → erreur "constante réservée"', () => {
		expect(() => run('e = 5')).toThrow(/réservée|reservee/i);
	});

	it('e[0] = 5 → erreur', () => {
		expect(() => run('e[0] = 5')).toThrow(/réservée|reservee/i);
	});

	it('(e, x) = (1, 2) → erreur', () => {
		expect(() => run('(e, x) = (1, 2)')).toThrow(/réservée|reservee/i);
	});

	it('reading \\pi (not assigning) is OK', () => {
		const { symbols } = run('r = \\pi');
		expect(symbols.get('r')?.value).toBeCloseTo(Math.PI, 10);
	});

	it('reading e (not assigning) is OK', () => {
		const { symbols } = run('r = e');
		expect(symbols.get('r')?.value).toBeCloseTo(Math.E, 10);
	});
});

describe('Phase 6 — \\pi/e reserved as loop variables', () => {
	it('pour e de 1 a 3: → erreur (e is reserved)', () => {
		expect(() => run('pour e de 1 a 3:\n    x = 1')).toThrow(/réservée|reservee/i);
	});

	it('pour \\pi de 1 a 3: → erreur', () => {
		expect(() => run('pour \\pi de 1 a 3:\n    x = 1')).toThrow(/réservée|reservee/i);
	});

	it('pour e dans (1, 2, 3): → erreur', () => {
		expect(() => run('pour e dans (1, 2, 3):\n    x = 1')).toThrow(/réservée|reservee/i);
	});

	it('pour \\pi dans (1, 2, 3): → erreur', () => {
		expect(() => run('pour \\pi dans (1, 2, 3):\n    x = 1')).toThrow(/réservée|reservee/i);
	});
});
