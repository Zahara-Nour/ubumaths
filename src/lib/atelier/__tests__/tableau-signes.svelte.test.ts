/**
 * Le tableau de signes s'affiche-t-il VRAIMENT ?
 *
 * ⚠️ Toute la chaîne était verte avant ce lot pendant que l'élève voyait une
 * boîte d'erreur : la grille se calculait, le LaTeX se produisait, et MathLive
 * ne savait pas le composer. Ce test monte donc le composant pour de bon et
 * regarde ce qui atterrit dans le DOM.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import { solveSteps } from '../solve-steps';
import GeneratedStepsCorrection from '$lib/components/questions/GeneratedStepsCorrection.svelte';

/** Le marqueur que MathLive pose sur ce qu'il n'a pas su composer. */
const ERROR_MARKER = 'ML__error';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function afficher(equation: string): HTMLElement {
	const solved = solveSteps(equation);
	expect(solved, equation).not.toBeNull();

	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(GeneratedStepsCorrection, {
		target: cible,
		props: { steps: solved!.steps }
	});
	return cible;
}

describe('le tableau de signes dans le DOM', () => {
	it('second degré : un vrai tableau, et aucune boîte d’erreur', () => {
		const racine = afficher('x^2-3x+2>0');

		// ⚠️ C'est exactement ce que l'élève voyait avant ce lot.
		expect(racine.innerHTML).not.toContain(ERROR_MARKER);

		const tableaux = racine.querySelectorAll('table');
		expect(tableaux.length).toBeGreaterThan(0);
		// Les racines figurent dans l'en-tête du tableau.
		expect(racine.textContent).toContain('On dresse le tableau de signes');
	});

	it('quotient : la double barre de la valeur interdite est dessinée', () => {
		const racine = afficher('(x-1)/(x+2)>0');

		expect(racine.innerHTML).not.toContain(ERROR_MARKER);
		// La classe que `VariationTable` pose sur une double barre de ligne de
		// signes — c'est le signe distinctif d'un tableau de quotient.
		expect(racine.innerHTML).toContain('vt-asymptote-bar-sign');
	});

	it('les zéros sont dessinés comme des zéros', () => {
		const racine = afficher('x^2-3x+2>0');

		expect(racine.innerHTML).toContain('vt-zero');
	});

	it('une étape sans tableau garde son rendu mathématique', () => {
		const racine = afficher('3x+5=14');

		expect(racine.innerHTML).not.toContain(ERROR_MARKER);
		expect(racine.querySelectorAll('table').length).toBe(0);
		expect(racine.textContent).toContain('Solution : x = 3');
	});
});
