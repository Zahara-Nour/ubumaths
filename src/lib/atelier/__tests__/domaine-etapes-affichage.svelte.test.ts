/**
 * `.domaine` vu depuis l'écran (PR 2 de `.domaine`, décisions de David du
 * 2026-10-13) : la réponse est une FORMULE composée (`D = …`), sans le texte
 * du terminal (« Expression », « Condition ») ; « Comment ? » déplie les
 * étapes, avec l'interrupteur « Résumé / Détaillé ».
 *
 * On asserte le RENDU : qu'un champ `latex` ou `steps` existe ne dit rien de
 * ce que l'élève voit.
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

function boutons(racine: HTMLElement, libelle: string): HTMLElement[] {
	return [...racine.querySelectorAll('button')].filter(
		(b) => (b.textContent ?? '').trim().replace(/^✓/, '') === libelle
	);
}

describe('.domaine \\frac{\\ln x}{x-2} à l’écran', () => {
	it('la réponse est une formule, sans « Expression » ni « Condition »', () => {
		const racine = afficher('.domaine \\frac{\\ln x}{x-2}');
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(false);
		const formule = ligne?.querySelector('.reponse .math');
		expect(formule).not.toBeNull();
		// Le texte du terminal n'est plus montré
		expect(ligne?.querySelector('.reponse .texte')).toBeNull();
		const texte = ligne?.querySelector('.reponse')?.textContent ?? '';
		expect(texte).not.toContain('Condition');
		expect(texte).not.toContain('Expression');
		// La formule : D, l'intervalle, le point exclu
		const lu = formule?.textContent ?? '';
		expect(lu).toContain('D');
		expect(lu).toContain('2');
		expect(lu).toContain('∞');
	});

	it('« Comment ? » déplie les étapes, et l’interrupteur est là', async () => {
		const racine = afficher('.domaine \\frac{\\ln x}{x-2}');
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);
		expect(comment[0].getAttribute('aria-expanded')).toBe('false');

		cliquer(comment[0]);
		await tick();

		expect(comment[0].getAttribute('aria-expanded')).toBe('true');
		const titres = [...racine.querySelectorAll('.etapes .step-title')].map((t) => t.textContent);
		expect(titres.some((t) => t?.includes('logarithme'))).toBe(true);
		expect(titres.some((t) => t?.includes('division'))).toBe(true);
		expect(titres.some((t) => t?.includes('Intersection'))).toBe(true);
		expect(racine.querySelectorAll('.etapes .step-explanation').length).toBeGreaterThan(0);

		const resume = boutons(racine, 'Résumé');
		const detaille = boutons(racine, 'Détaillé');
		expect(resume).toHaveLength(1);
		expect(detaille[0].getAttribute('aria-pressed')).toBe('true');

		cliquer(resume[0]);
		await tick();
		expect(resume[0].getAttribute('aria-pressed')).toBe('true');
		expect(racine.querySelectorAll('.etapes .step-explanation')).toHaveLength(0);
	});

	it('valeur interdite connue en décimal : formule, pas de « Comment ? »', () => {
		const racine = afficher('.domaine \\frac{1}{x^3-2}');
		const ligne = racine.querySelector('.historique li');
		const lu = ligne?.querySelector('.reponse .math')?.textContent ?? '';
		expect(lu).toContain('α');
		expect(lu).toContain('1,26');
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});

	it('refus du moteur : message inchangé, pas de « Comment ? »', () => {
		const racine = afficher('.domaine \\sqrt{\\sin x}');
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(true);
		expect(ligne?.querySelector('.texte')?.textContent).toContain(
			'Je ne sais pas encore déterminer ce domaine.'
		);
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});
});
