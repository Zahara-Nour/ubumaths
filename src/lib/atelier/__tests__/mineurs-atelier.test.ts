/**
 * Trois défauts mineurs de l'atelier (2026-10-09), relevés après #983 et #985.
 *
 * 1. Une carte (valeur, fonction) qui cite une LISTE comme un nombre : même
 *    refus que dans Calcul (#985), « L est une liste : utilise .stats L »,
 *    posé en statut d'erreur de la carte — jamais L lu comme une lettre libre.
 * 2. Une définition `A = (1 ; 2)` ou `A = {1 ; 2}` : le refus français des
 *    couples et des ensembles (#983), dans Calcul comme sur la carte.
 * 3. `.résoudre <inéquation> dans [a ; b]` : l'ensemble solution restreint à
 *    l'intervalle, crochets justes aux bornes.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult, type CalcSession } from '../calcul';
import { COUPLE_MESSAGE, SET_MESSAGE } from '../decimal-comma';

const LIST_MESSAGE = 'L est une liste : utilise .stats L';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

describe('1. une carte qui cite une liste comme un nombre', () => {
	function withList(): Atelier {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		return atelier;
	}

	it('une valeur `L + 1` passe en erreur, avec le message de Calcul', () => {
		const atelier = withList();

		atelier.create({ kind: 'value', name: 'a', definition: 'L+1' });

		const a = atelier.get('a');
		expect(a?.status).toBe('error');
		expect(a?.status === 'error' && a.message).toBe(LIST_MESSAGE);
	});

	it('une fonction `g(x) = x + L` passe en erreur, avec le même message', () => {
		const atelier = withList();

		atelier.create({ kind: 'function', name: 'g', definition: 'x+L' });

		const g = atelier.get('g');
		expect(g?.status).toBe('error');
		expect(g?.status === 'error' && g.message).toBe(LIST_MESSAGE);
	});

	it('une valeur écrite avant la liste passe en erreur quand la liste arrive', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2L' });
		expect(atelier.get('a')?.status).toBe('pending');

		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });

		const a = atelier.get('a');
		expect(a?.status).toBe('error');
		expect(a?.status === 'error' && a.message).toBe(LIST_MESSAGE);
	});

	it('la liste elle-même reste saine', () => {
		const atelier = withList();
		atelier.create({ kind: 'value', name: 'a', definition: 'L+1' });

		expect(atelier.get('L')?.status).toBe('ok');
	});

	it('une liste VIDE laisse en attente, comme un objet non défini', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '' });

		atelier.create({ kind: 'value', name: 'c', definition: 'L+1' });

		expect(atelier.get('c')?.status).toBe('pending');
	});

	it('une récurrence dont le premier terme est une liste vide reste en attente', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '' });

		atelier.create({
			kind: 'sequence',
			name: 'u',
			definition: 'u(n)+1',
			sequence: { mode: 'recurrence', firstIndex: 0, firstTerm: 'L' }
		});

		expect(atelier.get('u')?.status).toBe('pending');
	});

	it('la liste remplie, la carte passe en erreur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '' });
		atelier.create({ kind: 'value', name: 'c', definition: 'L+1' });

		atelier.update('L', '1;2;3');

		const c = atelier.get('c');
		expect(c?.status === 'error' && c.message).toBe(LIST_MESSAGE);
	});

	it('Calcul garde son refus (même détection)', () => {
		const s = session();
		runInput(s, 'L = 1 ; 2 ; 3');

		expect(runInput(s, 'a = L + 1')).toEqual({ kind: 'refus', message: LIST_MESSAGE });
	});
});

describe('2. une définition qui est un couple ou un ensemble', () => {
	it.each([
		['A=(1;2)', COUPLE_MESSAGE],
		['A = (1 ; 2)', COUPLE_MESSAGE],
		['A = {1 ; 2}', SET_MESSAGE]
	])('Calcul : %s est refusé en français, rien n’est créé', (input, message) => {
		const s = session();

		const result = runInput(s, input);

		expect(result).toEqual({ kind: 'refus', message });
		expect(s.atelier.get('A')).toBeUndefined();
	});

	it.each([
		['(1;2)', COUPLE_MESSAGE],
		['{1 ; 2}', SET_MESSAGE]
	])('carte valeur : %s passe en erreur avec le message français', (definition, message) => {
		const atelier = new Atelier();

		atelier.create({ kind: 'value', name: 'A', definition });

		const A = atelier.get('A');
		expect(A?.status).toBe('error');
		expect(A?.status === 'error' && A.message).toBe(message);
	});

	it.each([
		['L = (1;2;3)', 'L = 1 ; 2 ; 3'],
		['L = (1,5 ; 2 ; 3,5 ; 4)', 'L = 1,5 ; 2 ; 3,5 ; 4']
	])('%s : renvoyé vers la liste, la forme proposée crée la liste', (input, fixed) => {
		const s = session();

		const result = runInput(s, input);

		expect(result).toEqual({
			kind: 'refus',
			message: `Pour créer une liste, écris les valeurs sans parenthèses : ${fixed}`
		});
		expect(s.atelier.get('L')).toBeUndefined();
		runInput(s, fixed);
		expect(s.atelier.get('L')?.kind).toBe('list');
	});

	it('A=(1,2) reste le décimal 1,2 (règle #983)', () => {
		const s = session();

		const result = runInput(s, 'A=(1,2)');

		expect(result.kind).toBe('definition');
		expect(s.atelier.get('A')?.status).toBe('ok');
		const value = runInput(s, 'A*5');
		expect(value.kind === 'calcul' && value.output).toBe('6');
	});
});

/** Le rendu LaTeX de la réponse, sans espaces. */
function answer(result: CalcResult): string {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return (result.latex ?? '').replace(/\s+/g, '');
}

function text(result: CalcResult): string {
	if (result.kind !== 'commande') {
		throw new Error(`attendu une réponse, reçu ${JSON.stringify(result)}`);
	}
	return result.output;
}

const solve = (input: string): CalcResult => runInput(session(), `.résoudre ${input}`);

describe('3. une inéquation résolue dans un intervalle', () => {
	it('0,8^n<0,1 dans [0;100] : ]ln(0,1)/ln(0,8) ; 100], valeur approchée de la borne', () => {
		const result = solve('0,8^n<0,1 dans [0;100]');

		expect(answer(result)).toBe(
			'S=]\\dfrac{\\ln\\left(0{,}1\\right)}{\\ln\\left(0{,}8\\right)};100]\\text{avec}\\dfrac{\\ln\\left(0{,}1\\right)}{\\ln\\left(0{,}8\\right)}\\approx10{,}32'
		);
		expect(text(result)).toBe('S = ]ln(0,1)/ln(0,8) ; 100] avec ln(0,1)/ln(0,8) ≈ 10,32');
	});

	it.each([
		['x^2>4 dans [0;10]', 'S=]2;10]'],
		['x^2<4 dans [0;5]', 'S=[0;2['],
		['x>3 dans [0;2]', 'S=\\emptyset'],
		['2x+1<7 dans [0;5]', 'S=[0;3['],
		['2x+1\\leq7 dans ]0;5]', 'S=]0;3]'],
		['x^2\\geq4 dans [-5;5]', 'S=[-5;-2]\\cup[2;5]']
	])('%s → %s', (input, expected) => {
		expect(answer(solve(input))).toBe(expected);
	});

	it('x>3 dans [0;2] le dit en texte', () => {
		expect(text(solve('x>3 dans [0;2]'))).toBe('Pas de solution dans cet intervalle');
	});

	it('sin(x)>0 dans [0;2\\pi] : ]0 ; π[, ou un refus en français', () => {
		const result = solve('sin(x)>0 dans [0;2\\pi]');

		if (result.kind === 'commande') {
			expect(answer(result)).toBe('S=]0;\\pi[');
		} else {
			expect(result.kind).toBe('refus');
			expect(result.kind === 'refus' && result.message).not.toMatch(/dans » ne s/);
			expect(result.kind === 'refus' && result.message).toMatch(/[éèà]|Je n/);
		}
	});
});
