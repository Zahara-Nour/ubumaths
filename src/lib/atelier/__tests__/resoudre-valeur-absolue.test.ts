/**
 * `.résoudre` sur une équation avec valeur absolue (2026-10-13)
 *
 * Avant : `solveSteps` rendait `null` (degré non défini), la ligne retombait
 * sur le texte du moteur — « Equation mixte: |x-2|=3 / x = -1 ou x = 5 » —
 * sans aucune étape à déplier. Ces tests gardent le CHEMIN COMPLET : la
 * commande de l'élève reçoit les étapes rédigées.
 */

import { describe, expect, it } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { rendererFor, solveSteps } from '../solve-steps';
import {
	AbsoluteValueEquationRenderer,
	LinearEquationRenderer,
	QuadraticEquationRenderer
} from '$lib/mathAST/pedagogical-solve';

describe('le renderer se choisit sans `else` fourre-tout', () => {
	it("'absolute-value' prend le renderer de la valeur absolue", () => {
		const { renderer, schoolLevel } = rendererFor('absolute-value');

		expect(renderer).toBeInstanceOf(AbsoluteValueEquationRenderer);
		// Le niveau que l'atelier demande : les branches se rédigent comme au collège
		expect(schoolLevel).toBe('college');
	});

	it('les autres types gardent le leur', () => {
		expect(rendererFor('linear').renderer).toBeInstanceOf(LinearEquationRenderer);
		expect(rendererFor('quadratic').renderer).toBeInstanceOf(QuadraticEquationRenderer);
		expect(rendererFor('rational').renderer).toBeInstanceOf(QuadraticEquationRenderer);
	});
});

describe('.résoudre |u| = c', () => {
	it('|2x+1|=5 : la ligne porte S, les étapes rédigées se déplient', () => {
		const result = runInput(
			{ atelier: new Atelier(), engine: new WebReplEngine() },
			'.résoudre |2x+1|=5'
		);

		expect(result.kind === 'commande' && result.latex).toBe(
			'S = \\left\\{ -3 \\,;\\, 2 \\right\\}'
		);
		const steps = result.kind === 'commande' ? result.steps : undefined;
		expect(steps?.map((s) => s.title)).toEqual([
			'Équation avec une valeur absolue',
			'Deux nombres ont pour valeur absolue $5$ : $5$ et $-5$',
			'On résout $2x + 1 = 5$',
			'On soustrait $1$ aux deux membres',
			'On divise les deux membres par $2$',
			'On résout $2x + 1 = -5$',
			'On soustrait $1$ aux deux membres',
			'On divise les deux membres par $2$',
			'On réunit les solutions des deux équations'
		]);
	});

	it('|x|=-2 : pas de solution, rédigé', () => {
		const solved = solveSteps('|x|=-2');

		expect(solved?.answer).toBe('S = \\emptyset');
		expect(solved?.steps[1].title).toBe('Une valeur absolue est positive ou nulle');
	});

	it('|x-1|=|1-x| : S = ℝ passe le garde-fou (le moteur dit « infini »)', () => {
		expect(solveSteps('|x-1|=|1-x|')?.answer).toBe('S = \\mathbb{R}');
	});
});
