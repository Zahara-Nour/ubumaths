/**
 * L'atelier : `.intégrer`, trois défauts relevés par David (2026-10-08).
 *
 * 1. Une intégrale qui DIVERGE (pôle dans [a ; b]) : le message français du
 *    moteur est montré à l'élève, pas « Non résolu ».
 * 2. L'écho lit `1/x`, jamais `1:/x` (écriture « en ligne » de `toCustom`).
 * 3. Une borne LITTÉRALE (`.intégrer x^2 0 a`) est lue comme une borne ; un
 *    objet de l'atelier nommé `a` y est substitué.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function command(
	input: string,
	s: CalcSession = session()
): Extract<CalcResult, { kind: 'commande' }> {
	const outcome = runInput(s, input);
	if (outcome.kind !== 'commande') throw new Error(JSON.stringify(outcome));
	return outcome;
}

describe('.intégrer : intégrale qui diverge', () => {
	it('`1/x -1 1` : le message du moteur, en français', () => {
		const outcome = runInput(session(), '.intégrer 1/x -1 1');
		expect(outcome).toMatchObject({ kind: 'refus' });
		if (outcome.kind !== 'refus') return;
		expect(outcome.message).toContain("L'intégrale diverge ou n'est pas définie sur [-1 ; 1]");
		expect(outcome.message).toContain('x ≈ 0');
		expect(outcome.message).not.toContain('Non résolu');
	});

	it('`tan(x) 0 3` : le pôle π/2 est nommé', () => {
		const outcome = runInput(session(), '.intégrer tan(x) 0 3');
		expect(outcome).toMatchObject({ kind: 'refus' });
		if (outcome.kind !== 'refus') return;
		expect(outcome.message).toContain("L'intégrale diverge ou n'est pas définie sur [0 ; 3]");
	});

	it('`tan(x) 0 1` : pas de pôle, une valeur', () => {
		expect(command('.intégrer tan(x) 0 1').output).toContain('=');
	});
});

describe('.intégrer : écho lisible', () => {
	it('`1/x 1 2` : l’écho écrit 1/x, pas 1:/x', () => {
		const { output } = command('.intégrer 1/x 1 2');
		expect(output).toContain('1/x');
		expect(output).not.toContain(':/');
	});

	it('`(2x+2)/(x^2+2x+3)` : pas de `:/` dans l’écho', () => {
		expect(command('.intégrer (2x+2)/(x^2+2x+3)').output).not.toContain(':/');
	});
});

describe('.intégrer : bornes littérales', () => {
	it('`x^2 0 a` → a³/3', () => {
		const { output } = command('.intégrer x^2 0 a');
		expect(output.split('\n')[0]).toMatch(/^∫\[0→a\] x\^2 dx = /);
		expect(output.split('\n')[0]).toContain('a^3');
	});

	it('`x 1 b` → (b²−1)/2', () => {
		const { output } = command('.intégrer x 1 b');
		expect(output.split('\n')[0]).toMatch(/^∫\[1→b\] x dx = /);
		expect(output.split('\n')[0]).toContain('b^2');
	});

	it('un objet `a = 2` est substitué : `x^2 0 a` → 8/3', () => {
		const s = session();
		runInput(s, 'a = 2');
		expect(command('.intégrer x^2 0 a', s).output.split('\n')[0]).toMatch(/= 8\/3$/);
	});

	it('pas de bornes sans nombre : `x a b` reste une primitive', () => {
		expect(command('.intégrer x a b').output).not.toContain('∫[');
	});

	it('la variable n’est pas une borne : `3 2 x` reste une primitive', () => {
		expect(runInput(session(), '.intégrer 3 2 x')).not.toMatchObject({
			kind: 'commande',
			output: expect.stringContaining('∫[')
		});
	});

	it('après un opérateur, pas de borne : `x^2 + 3 a` = x² + 3a', () => {
		expect(command('.intégrer x^2 + 3 a').output).not.toContain('∫[');
	});

	it('`t^2 ; t 0 a` : borne littérale après la variable', () => {
		expect(command('.intégrer t^2 ; t 0 a').output.split('\n')[0]).toMatch(/^∫\[0→a\] t\^2 dt = /);
	});

	it('`a x 0 2` → 2a (inchangé)', () => {
		expect(command('.intégrer a x 0 2').output.split('\n')[0]).toMatch(/= 2a$/);
	});
});
