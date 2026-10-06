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

const hint = (name: string) =>
	`Calcul par rapport à x. Pour une autre variable, écris « ; ${name} ».`;

describe('.variations', () => {
	it('`t^2` : en x, l’indication à part, pas dans le texte', () => {
		const outcome = command('.variations t^2');
		expect(outcome.note).toBe(hint('t'));
		expect(outcome.output).not.toContain('Calcul par rapport');
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

	it('`ln(t)` : en x, avec l’indication', () => {
		expect(command('.domaine ln(t)').note).toBe(hint('t'));
	});
});

describe('.taylor', () => {
	it('`exp(t) 4` : l’indication dit où mettre les nombres', () => {
		const outcome = runInput(session(), '.taylor exp(t) 4');
		expect(outcome).toMatchObject({
			note: 'Calcul par rapport à x. Pour une autre variable, écris « ; t » ; l’ordre et le point se mettent à la fin : « ; t 4 0 ».'
		});
	});

	it('`exp(t) 4 ; t` : sans indication', () => {
		const outcome = command('.taylor exp(t) 4 ; t');
		expect(outcome.output).toContain('t^3');
		expect(outcome.note).toBeUndefined();
	});
});
