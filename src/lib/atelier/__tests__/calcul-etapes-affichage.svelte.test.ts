/**
 * « Comment ? » d'une ligne de Calcul sans lettre, vu depuis l'écran (phase 0
 * de `docs/wip/retrait-calc-progress.md`, 2026-10-24).
 *
 * On asserte le RENDU : qu'un champ `steps` existe ne dit rien de ce que
 * l'élève voit.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { STEPS_VERBOSITY_KEY } from '../steps-summary';
import CalculView from '$lib/components/atelier/CalculView.svelte';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

function oublierRedaction(): void {
	try {
		window.localStorage.removeItem(STEPS_VERBOSITY_KEY);
	} catch {
		// Pas de stockage : rien à vider
	}
}

beforeEach(oublierRedaction);

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
	oublierRedaction();
});

function afficher(saisies: readonly string[]): HTMLElement {
	const desk = new CalcDesk(new Atelier());
	for (const saisie of saisies) desk.submit(saisie);
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

function boutons(racine: HTMLElement, libelle: string): HTMLElement[] {
	return [...racine.querySelectorAll('button')].filter(
		(b) => (b.textContent ?? '').trim().replace(/^✓/, '') === libelle
	);
}

function titres(racine: HTMLElement): string[] {
	return [...racine.querySelectorAll('.etapes .step-title')].map((t) => t.textContent ?? '');
}

describe('2+3*4 à l’écran', () => {
	it('« Comment ? » déplie une opération par étape', async () => {
		const racine = afficher(['2+3*4']);
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);

		cliquer(comment[0]);
		await tick();

		expect(titres(racine)).toEqual(['Multiplication', 'Addition']);
		const etapes = racine.querySelector('.etapes')?.textContent ?? '';
		expect(etapes).not.toContain('*');
	});

	it('pas de bouton « Résumé »', async () => {
		const racine = afficher(['10-2*3+4']);
		cliquer(boutons(racine, 'Comment ?')[0]);
		await tick();
		expect(boutons(racine, 'Résumé')).toHaveLength(0);
	});
});

describe('pas de « Comment ? »', () => {
	it('un nombre seul', () => {
		expect(boutons(afficher(['14']), 'Comment ?')).toHaveLength(0);
	});

	it('une valeur de l’atelier citée', () => {
		expect(boutons(afficher(['a = 3', 'a+2']), 'Comment ?')).toHaveLength(0);
	});
});
