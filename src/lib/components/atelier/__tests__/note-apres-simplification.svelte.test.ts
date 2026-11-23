/**
 * E9 (chantier ecarts-verifs) : la note « On peut simplifier davantage pour
 * x ≠ −1 » restait affichée après un clic sur « Simplifier pour x ≠ −1 », qui
 * venait justement de le faire. Elle part avec la bascule et revient avec
 * « Sans simplifier ».
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { Atelier } from '#lib/atelier/atelier.svelte.ts';
import { CalcDesk } from '#lib/atelier/desk.svelte.ts';
import CalculView from '../CalculView.svelte';

const NOTE = 'On peut simplifier davantage pour x ≠ −1';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function afficher(saisie: string): HTMLElement {
	const desk = new CalcDesk(new Atelier());
	desk.submit(saisie);
	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(CalculView, { target: cible, props: { desk } });
	return cible;
}

/** Cliquer comme un navigateur clique — `element.click()` court-circuite. */
function cliquer(element: HTMLElement): void {
	for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	}
}

function bouton(racine: HTMLElement, libelle: string): HTMLElement {
	const trouve = [...racine.querySelectorAll('button')].find((b) =>
		(b.textContent ?? '').includes(libelle)
	);
	expect(trouve, `bouton « ${libelle} » introuvable`).toBeDefined();
	return trouve as HTMLElement;
}

function note(racine: HTMLElement): string {
	return racine.querySelector('.note')?.textContent ?? '';
}

describe('la note « On peut simplifier davantage » suit la bascule', () => {
	it('partie une fois simplifié, revenue sans simplifier', async () => {
		const racine = afficher('.simplifier (x^2-1)/(x+1)');
		expect(note(racine)).toContain(NOTE);

		cliquer(bouton(racine, 'Simplifier pour x ≠ −1'));
		await tick();
		expect(note(racine)).not.toContain('simplifier davantage');

		cliquer(bouton(racine, 'Sans simplifier'));
		await tick();
		expect(note(racine)).toContain(NOTE);
	});

	// Revue : la note passe à la virgule décimale après coup ; la phrase à retirer aussi
	it('une note à virgule décimale part aussi', async () => {
		const racine = afficher('.simplifier ln(x^2)*0.25');
		expect(note(racine)).toContain('Pour x > 0, on peut écrire 0,5');

		cliquer(bouton(racine, 'Simplifier pour x > 0'));
		await tick();
		expect(note(racine)).not.toContain('on peut écrire');
	});
});
