/**
 * L'interrupteur « Résumé / Détaillé » dans le « Comment ? » déplié.
 *
 * On asserte le RENDU : que l'état bascule ne dit rien de ce que l'élève lit.
 * La version détaillée affiche des `.step-explanation` (les « pourquoi ») ; la
 * résumée garde les titres et les calculs, sans elles.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { STEPS_VERBOSITY_KEY } from '../steps-summary';
import CalculView from '$lib/components/atelier/CalculView.svelte';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

function vider(): void {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
}

beforeEach(() => {
	try {
		window.localStorage.removeItem(STEPS_VERBOSITY_KEY);
	} catch {
		// Pas de stockage : rien à vider
	}
});

afterEach(() => {
	vider();
	try {
		window.localStorage.removeItem(STEPS_VERBOSITY_KEY);
	} catch {
		// idem
	}
});

function afficher(...saisies: string[]): HTMLElement {
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

function bouton(racine: HTMLElement, libelle: string): HTMLElement {
	const trouves = boutons(racine, libelle);
	expect(trouves.length, `bouton « ${libelle} » introuvable`).toBeGreaterThan(0);
	return trouves[0];
}

async function deplier(racine: HTMLElement): Promise<void> {
	cliquer(bouton(racine, 'Comment ?'));
	await tick();
}

function explications(racine: HTMLElement): number {
	return racine.querySelectorAll('.etapes .step-explanation').length;
}

describe.each([
	'.simplifier \\frac{6}{8}+\\frac13',
	'.factoriser x^2-9',
	'.dériver x^2\\sin x',
	'.résoudre 3x-4\\leq 2x+1'
])('l’interrupteur de %s', (saisie) => {
	it('absent tant que « Comment ? » est replié', () => {
		const racine = afficher(saisie);
		expect(boutons(racine, 'Résumé')).toHaveLength(0);
	});

	it('« Détaillé » à l’ouverture, puis « Résumé » retire les explications', async () => {
		const racine = afficher(saisie);
		await deplier(racine);

		const resume = bouton(racine, 'Résumé');
		const detaille = bouton(racine, 'Détaillé');
		expect(detaille.getAttribute('aria-pressed')).toBe('true');
		expect(resume.getAttribute('aria-pressed')).toBe('false');
		const titresAvant = [...racine.querySelectorAll('.etapes .step-title')].map(
			(t) => t.textContent
		);
		expect(explications(racine)).toBeGreaterThan(0);
		const reponseAvant = racine.querySelector('.reponse')?.innerHTML;

		cliquer(resume);
		await tick();

		expect(explications(racine)).toBe(0);
		expect(resume.getAttribute('aria-pressed')).toBe('true');
		expect(detaille.getAttribute('aria-pressed')).toBe('false');
		// Les mêmes étapes, dans le même ordre : seul le « pourquoi » disparaît
		expect([...racine.querySelectorAll('.etapes .step-title')].map((t) => t.textContent)).toEqual(
			titresAvant
		);
		// La réponse de la ligne ne bouge pas
		expect(racine.querySelector('.reponse')?.innerHTML).toBe(reponseAvant);

		cliquer(detaille);
		await tick();
		expect(explications(racine)).toBeGreaterThan(0);
	});
});

describe('le choix retenu', () => {
	it('survit à un nouvel affichage de l’atelier', async () => {
		let racine = afficher('.résoudre x^2-5x+6=0');
		await deplier(racine);
		cliquer(bouton(racine, 'Résumé'));
		await tick();
		expect(window.localStorage.getItem(STEPS_VERBOSITY_KEY)).toBe('summarized');
		vider();

		racine = afficher('.résoudre x^2-5x+6=0');
		await deplier(racine);
		expect(bouton(racine, 'Résumé').getAttribute('aria-pressed')).toBe('true');
		expect(explications(racine)).toBe(0);
	});
});

describe('pas d’interrupteur', () => {
	it('sur `.variations`, qui a sa propre rédaction', async () => {
		const racine = afficher('.variations x^2-4x');
		await deplier(racine);
		expect(racine.querySelector('.etapes')).not.toBeNull();
		expect(boutons(racine, 'Résumé')).toHaveLength(0);
	});

	it('sur une ligne sans étapes (V48) : ni « Comment ? » ni interrupteur', () => {
		const racine = afficher('.résoudre \\frac{2x^3}{x}<2');
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
		expect(boutons(racine, 'Résumé')).toHaveLength(0);
	});
});
