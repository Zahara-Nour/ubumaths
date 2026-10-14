/**
 * Le garde-fou des étapes de `.limite` (PR 3, décision de David du
 * 2026-10-14) : des étapes ne s'affichent que si elles concluent la réponse
 * de `.limite` — même valeur (comparée par valeur), même « pas de limite »
 * (mêmes limites à gauche et à droite), même côté implicite.
 *
 * Aucun cas réel ne discorde aujourd'hui : on fabrique la discordance en
 * confrontant des étapes JUSTES à une réponse fausse.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '$lib/mathAST/cli/core/pipeline';
import { generatePedagogicalLimitSteps } from '$lib/mathAST/pedagogical-limits/pipeline';
import type { PedagogicalLimitResult } from '$lib/mathAST/pedagogical-limits/types';
import type { LimitDirection } from '$lib/mathAST/limits/types';
import type { MathNode } from '$lib/mathAST/types';
import { fraction, infinity, number } from '$lib/mathAST/factory';
import { concludesLimitAnswer, showsNothing } from '../limit-steps-check';

// =============================================================================
// Décor
// =============================================================================

function tree(text: string): MathNode {
	const ast = parse(text).ast;
	if (ast === undefined) throw new Error(`illisible : ${text}`);
	return ast;
}

function explained(
	text: string,
	approach: MathNode,
	direction: LimitDirection = 'both'
): PedagogicalLimitResult {
	return generatePedagogicalLimitSteps(tree(text), {
		variable: 'x',
		approach,
		direction,
		schoolLevel: 'lycee'
	});
}

// =============================================================================
// Concordance
// =============================================================================

describe('une valeur', () => {
	const factored = explained('(x^2-1)/(x-1)', number('1'));

	it('la même valeur : concorde', () => {
		expect(
			concludesLimitAnswer(factored, { kind: 'value', value: number('2'), impliedSide: null })
		).toBe(true);
	});

	it('la même valeur écrite autrement (4/2) : concorde', () => {
		const value = fraction(number('4'), number('2'));
		expect(concludesLimitAnswer(factored, { kind: 'value', value, impliedSide: null })).toBe(true);
	});

	it('une autre valeur : discorde', () => {
		expect(
			concludesLimitAnswer(factored, { kind: 'value', value: number('3'), impliedSide: null })
		).toBe(false);
	});

	it('une valeur finie contre +∞ : discorde', () => {
		const value = infinity('positive');
		expect(concludesLimitAnswer(factored, { kind: 'value', value, impliedSide: null })).toBe(false);
	});
});

describe('une limite infinie', () => {
	const right = explained('1/x', number('0'), 'right');

	it('+∞ contre +∞ : concorde', () => {
		const value = infinity('positive');
		expect(concludesLimitAnswer(right, { kind: 'value', value, impliedSide: null })).toBe(true);
	});

	it('+∞ contre −∞ : discorde', () => {
		const value = infinity('negative');
		expect(concludesLimitAnswer(right, { kind: 'value', value, impliedSide: null })).toBe(false);
	});
});

describe('le côté implicite', () => {
	const ln = explained('ln(x)', number('0'));

	it('à droite, comme la réponse (x → 0⁺) : concorde', () => {
		const value = infinity('negative');
		expect(concludesLimitAnswer(ln, { kind: 'value', value, impliedSide: 'right' })).toBe(true);
	});

	it('la réponse dit « à gauche » : discorde', () => {
		const value = infinity('negative');
		expect(concludesLimitAnswer(ln, { kind: 'value', value, impliedSide: 'left' })).toBe(false);
	});

	it('la réponse ne dit aucun côté : discorde', () => {
		const value = infinity('negative');
		expect(concludesLimitAnswer(ln, { kind: 'value', value, impliedSide: null })).toBe(false);
	});
});

describe('pas de limite', () => {
	const pole = explained('1/x', number('0'));

	it('à gauche −∞, à droite +∞, comme la réponse : concorde', () => {
		const answer = {
			kind: 'sides',
			left: infinity('negative'),
			right: infinity('positive')
		} as const;
		expect(concludesLimitAnswer(pole, answer)).toBe(true);
	});

	it('les côtés inversés : discorde', () => {
		const answer = {
			kind: 'sides',
			left: infinity('positive'),
			right: infinity('negative')
		} as const;
		expect(concludesLimitAnswer(pole, answer)).toBe(false);
	});

	it('la réponse a une valeur, les étapes « pas de limite » : discorde', () => {
		expect(
			concludesLimitAnswer(pole, { kind: 'value', value: infinity('positive'), impliedSide: null })
		).toBe(false);
	});

	it('la réponse dit « pas de limite », les étapes une valeur : discorde', () => {
		const answer = { kind: 'sides', left: number('2'), right: number('2') } as const;
		expect(concludesLimitAnswer(explained('(x^2-1)/(x-1)', number('1')), answer)).toBe(false);
	});
});

// =============================================================================
// Rien à montrer
// =============================================================================

describe('rien à montrer', () => {
	it('la substitution directe seule : rien', () => {
		expect(showsNothing(explained('x^2+1', number('2')).steps)).toBe(true);
	});

	it('une factorisation : quelque chose', () => {
		expect(showsNothing(explained('(x^2-1)/(x-1)', number('1')).steps)).toBe(false);
	});
});
