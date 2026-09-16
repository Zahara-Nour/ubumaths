/**
 * Une commande qui cite un objet de l'atelier doit parler de CET objet.
 *
 * ⚠️ Défaut vu à l'écran le 2026-09-16 : `.dériver f` rendait **0**, avec un
 * message de succès. Le moteur traite `f` comme une variable libre et la dérive
 * par rapport à `x` — zéro. L'action « Dériver » du panneau, elle, rendait bien
 * `2x-3`, parce qu'elle substitue.
 *
 * C'est le §6 bis, par un chemin que je n'avais pas couvert : la commande
 * **tapée à la main**.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

function session(definition = 'x^2-3x+1') {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	s.atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return s;
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'commande' || r.kind === 'calcul' ? r.output : '';

describe('une commande qui cite un objet', () => {
	it('dérive vraiment la fonction, pas une constante', () => {
		const s = session();

		const result = runInput(s, '.dériver f');

		expect(outputOf(result)).toContain('2x-3');
		expect(outputOf(result)).not.toMatch(/=\s*0\s*$/);
	});

	it('accepte aussi la forme avec la variable', () => {
		const s = session();

		expect(outputOf(runInput(s, '.dériver f(x)'))).toContain('2x-3');
	});

	it('étudie les variations de la fonction', () => {
		const s = session();

		expect(outputOf(runInput(s, '.variations f'))).toContain('3/2');
	});

	it('résout l’équation de la fonction', () => {
		const s = session();

		// Discriminant de x^2-3x+1 : 5
		expect(outputOf(runInput(s, '.résoudre f=0'))).toMatch(/5/);
	});

	it('substitue à travers un autre objet', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		s.atelier.create({ kind: 'function', name: 'g', definition: 'x^2' }, 'text');
		s.atelier.create({ kind: 'function', name: 'f', definition: 'g(x) + 1' }, 'text');

		expect(outputOf(runInput(s, '.dériver f'))).toContain('2x');
	});
});

describe('ce que la substitution ne doit pas casser', () => {
	it('laisse passer une expression qui ne cite personne', () => {
		const s = session();

		expect(outputOf(runInput(s, '.dériver x^3'))).toContain('3x^2');
	});

	it('ne touche pas une commande sans argument', () => {
		const s = session();

		expect(runInput(s, '.valeurs').kind).toBe('commande');
	});

	it('laisse le moteur répondre sur un nom qu’il ne connaît pas', () => {
		const s = session();

		// `zzz` n'est pas un objet : rien à substituer, le moteur fait ce qu'il peut
		expect(runInput(s, '.dériver zzz').kind).toBe('commande');
	});

	it('n’abîme pas une commande de statistiques', () => {
		const s = session();

		expect(outputOf(runInput(s, '.stats 12,15,9'))).toContain('n=3');
	});
});
