/**
 * Ce que le moteur reçoit ne contient JAMAIS de référence.
 *
 * ⚠️ Défaut vu à l'écran le 2026-09-16 : après `g = f'`, taper `g(3)` rendait
 * « Evaluation error: Cannot evaluate derivative function 'f'(x) without a
 * definition » — en anglais, et en échec.
 *
 * `syncEngine` poussait la définition **brute** (`f'`) dans l'`EvalState`. Le
 * moteur ne sait pas lier `f'` : il lui faut l'expression. C'est le §6 bis
 * appliqué à la synchronisation — le même principe que pour les commandes et
 * les actions, au troisième endroit où il manquait.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

function session() {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');
	return s;
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : '';

describe('un objet défini par une dérivée s’évalue', () => {
	it('g(3) donne un nombre, pas une erreur', () => {
		const s = session();
		runInput(s, "g=f'");

		const result = runInput(s, 'g(3)');

		// f' = 2x-3, donc g(3) = 3
		expect(outputOf(result)).toBe('3');
	});

	it('et jamais un message en anglais', () => {
		const s = session();
		runInput(s, "g=f'");

		expect(outputOf(runInput(s, 'g(3)'))).not.toMatch(/Evaluation error|without a definition/);
	});

	/**
	 * ⚠️ `g(x)` rend « g(x) » — et c'est le comportement ATTENDU : `f(x)` rend
	 * « f(x) » de la même façon. Le moteur n'évalue pas un appel dont l'argument
	 * est une variable libre. Mon premier test demandait à `g` de faire mieux
	 * que `f` : il aurait figé une différence que rien ne justifie.
	 */
	it('se comporte comme une fonction ordinaire sur un argument libre', () => {
		const s = session();
		runInput(s, "g=f'");

		expect(outputOf(runInput(s, 'g(x)'))).toBe(outputOf(runInput(s, 'f(x)')).replace('f', 'g'));
	});

	it('g suit f jusque dans le moteur', () => {
		const s = session();
		runInput(s, "g=f'");

		s.atelier.update('f', 'x^3', 'text');

		// f' = 3x², donc g(2) = 12
		expect(outputOf(runInput(s, 'g(2)'))).toBe('12');
	});

	it('s’emploie dans un calcul composé', () => {
		const s = session();
		runInput(s, "g=f'");

		expect(outputOf(runInput(s, 'g(3) + 1'))).toBe('4');
	});
});

describe('ce que ça ne doit pas casser', () => {
	it('une fonction ordinaire s’évalue toujours', () => {
		const s = session();

		expect(outputOf(runInput(s, 'f(2)'))).toBe('-1');
	});

	it('une fonction qui en cite une autre aussi', () => {
		const s = session();
		runInput(s, 'h(x) = f(x) + 1');

		expect(outputOf(runInput(s, 'h(2)'))).toBe('0');
	});

	it('une valeur reste utilisable', () => {
		const s = session();
		runInput(s, 'a = 3');

		expect(outputOf(runInput(s, 'a + 1'))).toBe('4');
	});

	it('un objet en attente ne rend toujours rien', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'k', definition: 'b*x' }, 'text');

		expect(runInput(s, 'k(2)').kind).toBe('calcul');
		expect(outputOf(runInput(s, 'k(2)'))).not.toBe('2');
	});
});
