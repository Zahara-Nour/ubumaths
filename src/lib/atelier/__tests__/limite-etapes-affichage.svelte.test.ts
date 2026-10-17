/**
 * `.limite` vu depuis l'écran (PR 3 de `.limite`, décisions de David du
 * 2026-10-14) : « Comment ? » déplie les étapes de `pedagogical-limits` ;
 * « Résumé » ne garde que la forme, la technique et la conclusion ; une
 * substitution directe seule → pas de « Comment ? ».
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
	return [...racine.querySelectorAll('.etapes .step-title')].map((t) =>
		(t.textContent ?? '').trim()
	);
}

describe('.limite (x^2-1)/(x-1) en 1 à l’écran', () => {
	const saisie = '.limite (x^2-1)/(x-1) en 1';

	it('« Comment ? » : la forme 0/0, la factorisation, la conclusion', async () => {
		const racine = afficher([saisie]);
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);

		cliquer(comment[0]);
		await tick();

		const lus = titres(racine);
		expect(lus.some((t) => t.startsWith('Forme indéterminée'))).toBe(true);
		expect(lus).toContain('Simplification du facteur commun');
		expect(lus[lus.length - 1]).toContain('La limite vaut');
		const etapes = racine.querySelector('.etapes')?.textContent ?? '';
		expect(etapes).not.toContain('*');
	});

	it('« Résumé » : la technique, la conclusion', async () => {
		const racine = afficher([saisie]);
		cliquer(boutons(racine, 'Comment ?')[0]);
		await tick();
		const detaille = titres(racine).length;
		const resume = boutons(racine, 'Résumé');
		expect(resume).toHaveLength(1);

		cliquer(resume[0]);
		await tick();

		const lus = titres(racine);
		expect(lus.length).toBeLessThan(detaille);
		expect(lus[0]).toBe('Simplification du facteur commun');
		expect(lus.some((t) => t.startsWith('Forme indéterminée'))).toBe(false);
		expect(lus[lus.length - 1]).toContain('La limite vaut');
	});
});

describe('pas de « Comment ? »', () => {
	it('x^2+1 en 2 : la réponse seule (substitution directe)', () => {
		const racine = afficher(['.limite x^2+1 en 2']);
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(false);
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});

	it('« Je ne sais pas » : sans « Comment ? »', () => {
		const racine = afficher(['.limite x sin(x) en +inf']);
		expect(racine.textContent).toContain('Je ne sais pas');
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});
});
