/**
 * L'atelier : `.variations`, `.domaine`, `.taylor` calculent en x, sauf `; v`.
 *
 * Même règle que `.dériver`, `.résoudre`, `.intégrer` (décision de David du
 * 2026-10-06) : quand x n'apparaît pas et qu'aucune variable n'est donnée, la
 * réponse est calculée en x et la ligne porte l'indication À PART (`note`).
 * Les chemins de l'atelier (action « Variations », `.variations f`) restent
 * en x, sans indication.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runAction, runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function command(
	input: string,
	s: CalcSession = session()
): Extract<CalcResult, { kind: 'commande' }> {
	const outcome = runInput(s, input);
	expect(outcome.kind).toBe('commande');
	if (outcome.kind !== 'commande') throw new Error(JSON.stringify(outcome));
	return outcome;
}

describe('.variations', () => {
	// Décision de David (2026-10-08, Q1) : une seule lettre → elle, sans indication
	it('`t^2` : t devinée, sans indication', () => {
		const outcome = command('.variations t^2');
		expect(outcome.note).toBeUndefined();
		expect(outcome.output).toContain("f'(t) = 2t");
	});

	it('`t^3-3t ; t` : en t, sans indication', () => {
		const outcome = command('.variations t^3-3t ; t');
		expect(outcome.output).toContain('t = -1');
		expect(outcome.note).toBeUndefined();
	});

	it('`sin x` : refus, des parenthèses', () => {
		expect(runInput(session(), '.variations sin x')).toEqual({
			kind: 'refus',
			message: 'Écris sin(x) avec des parenthèses.'
		});
	});

	it('`.variations f` reste en x, sans indication', () => {
		const s = session();
		runInput(s, 'f(x) = x^2-3x+1');
		const outcome = command('.variations f', s);
		expect(outcome.output).toContain('3/2');
		expect(outcome.note).toBeUndefined();
	});

	// Une fonction de l'atelier sans x et avec une lettre libre (`f(x) = t^2`)
	// reste « en attente » : l'action n'atteint jamais le moteur. Reste une
	// constante, qui n'a aucune variable à proposer.
	it('l’action « Variations » d’une fonction constante reste en x, sans indication', () => {
		const s = session();
		runInput(s, 'f(x) = 5');
		const outcome = runAction(s, 'variations', 'f');
		expect(outcome.ok).toBe(true);
		expect(outcome.ok && outcome.output).not.toContain('Calcul par rapport');
	});
});

describe('.domaine', () => {
	it('`ln(t) ; t` → t > 0', () => {
		const outcome = command('.domaine ln(t) ; t');
		expect(outcome.output).toContain('t > 0');
		expect(outcome.note).toBeUndefined();
	});

	it('`ln(t)` : t devinée, t > 0', () => {
		const outcome = command('.domaine ln(t)');
		expect(outcome.output).toContain('t > 0');
		expect(outcome.note).toBeUndefined();
	});
});

describe('.taylor', () => {
	it('`exp(t) 4` : t devinée, développé en t', () => {
		const outcome = command('.taylor exp(t) 4');
		expect(outcome.output).toContain('t^3');
		expect(outcome.note).toBeUndefined();
	});

	it('`exp(t) 4 ; t` : sans indication', () => {
		const outcome = command('.taylor exp(t) 4 ; t');
		expect(outcome.output).toContain('t^3');
		expect(outcome.note).toBeUndefined();
	});
});
