/**
 * Quand le tableau est là, la ligne ne répète pas ce qu'il dit.
 *
 * ⚠️ Relevé par David sur capture : le bloc texte du moteur s'affichait au-dessus
 * du tableau et redisait presque tout — domaine, points critiques, signe de f',
 * extremum, limites aux bornes. Six informations, toutes déjà dans le tableau,
 * et dans une forme moins lisible.
 *
 * Une seule ne s'y trouve pas : **l'expression de la dérivée**. Le tableau
 * montre le SIGNE de f', jamais f' elle-même. C'est donc la seule chose que la
 * ligne garde — et c'est ce qu'on écrit au-dessus d'un tableau de variations.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('la ligne porte la dérivée, et rien d’autre', () => {
	it('l’expression de la dérivée, que le tableau ne donne pas', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'variations', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		// ⚠️ `2 x` et non `2x` : la multiplication implicite sort de `toLatex`
		// avec une espace, que LaTeX ignore en mode mathématique — les deux
		// formes s'affichent à l'identique. On assert ce qui sort vraiment.
		expect(outcome.latex).toBe("f'(x) = 2 x - 3");
	});

	it('elle porte le nom de l’objet', () => {
		const s = session();
		runInput(s, 'g(x) = x^3 - 3x');

		const outcome = runAction(s, 'variations', 'g');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.latex).toBe("g'(x) = 3 x^2 - 3");
	});

	it('plus rien de ce que le tableau dit déjà', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const outcome = runAction(s, 'variations', 'f');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		const ligne = outcome.latex ?? '';
		// Les six doublons relevés sur la capture.
		expect(ligne).not.toContain('Domaine');
		expect(ligne).not.toContain('Points critiques');
		expect(ligne).not.toContain('Signe');
		expect(ligne).not.toContain('Extrema');
		expect(ligne).not.toContain('Limites');
		expect(ligne).not.toContain('Expression');
	});
});

describe('sans tableau, rien ne change', () => {
	it('une fonction à asymptote garde le bloc du moteur', () => {
		const s = session();
		runInput(s, 'h(x) = 1/x');

		const outcome = runAction(s, 'variations', 'h');

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.table).toBeUndefined();
		// ⚠️ La ligne ne doit surtout pas devenir vide : sans tableau, le bloc
		// texte est la SEULE réponse que l'élève reçoit.
		expect(outcome.latex).toBeUndefined();
		expect(outcome.output).toContain('Domaine');
	});
});

describe('la ligne d’historique reçoit les deux', () => {
	it('la dérivée en tête, le tableau dessous', () => {
		const desk = new CalcDesk(new Atelier());
		desk.atelier.create({ kind: 'function', name: 'f', definition: 'x^2 - 3x + 2' });

		desk.runFromPanel('variations', 'f');

		expect(desk.entries[0].latex).toBe("f'(x) = 2 x - 3");
		expect(desk.entries[0].table).toBeDefined();
	});
});
