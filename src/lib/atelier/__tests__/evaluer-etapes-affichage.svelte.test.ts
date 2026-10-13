/**
 * `.évaluer` vu depuis l'écran (PR 3 de `.évaluer`, décisions de David du
 * 2026-10-14) : « Comment ? » déplie le remplacement puis une opération par
 * étape ; « Résumé » ne garde que le remplacement et le résultat ; rien à
 * montrer (`e^0`) → pas de « Comment ? ».
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

describe('.évaluer 2x^2-3x+1 en x=-1 à l’écran', () => {
	it('« Comment ? » : le remplacement, puis une opération par étape', async () => {
		const racine = afficher(['.évaluer 2x^2-3x+1 en x=-1']);
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);

		cliquer(comment[0]);
		await tick();

		const lus = titres(racine);
		expect(lus[0]).toContain('On remplace');
		expect(lus.some((t) => t.includes('Soustraire'))).toBe(true);
		expect(lus.length).toBeGreaterThan(2);
		// Aucun astérisque à l'écran
		const etapes = racine.querySelector('.etapes')?.textContent ?? '';
		expect(etapes).not.toContain('*');
	});

	it('« Résumé » : le remplacement et le résultat seulement', async () => {
		const racine = afficher(['.évaluer 2x^2-3x+1 en x=-1']);
		cliquer(boutons(racine, 'Comment ?')[0]);
		await tick();
		const resume = boutons(racine, 'Résumé');
		expect(resume).toHaveLength(1);

		cliquer(resume[0]);
		await tick();

		const lus = titres(racine);
		expect(lus).toHaveLength(2);
		expect(lus[0]).toContain('On remplace');
		expect(lus[1]).toContain('On effectue les calculs');
	});

	it('une fonction de l’atelier : f(2) = 5, et « Comment ? »', async () => {
		const racine = afficher(['f(x) = x^2+1', '.évaluer f en x=2']);
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);
		cliquer(comment[0]);
		await tick();
		expect(titres(racine)[0]).toContain('On remplace');
	});
});

describe('rien à montrer', () => {
	it('e^x en x=0 : la réponse, sans « Comment ? »', () => {
		const racine = afficher(['.évaluer e^x en x=0']);
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(false);
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});

	it('valeur interdite : le refus, sans « Comment ? »', () => {
		const racine = afficher(['.évaluer \\frac{x+1}{x-1} en x=1']);
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(true);
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});
});
