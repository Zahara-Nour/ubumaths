/**
 * `.intégrer \frac1x de -1 à 1` vu depuis l'écran (décision de David,
 * 2026-10-13) : la ligne reste un REFUS — message du moteur inchangé, en
 * couleur de refus — et porte « Comment ? », qui déplie les étapes du refus
 * rédigé, avec l'interrupteur « Résumé / Détaillé ».
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

describe('.intégrer : pôle dans [a ; b], la ligne de refus se déplie', () => {
	it('message du refus inchangé, « Comment ? » sur la ligne de refus', () => {
		const racine = afficher('.intégrer \\frac1x de -1 à 1');
		const ligne = racine.querySelector('.historique li');
		expect(ligne?.classList.contains('refus')).toBe(true);
		// Le message du moteur, en texte (pas de formule), tel quel
		expect(ligne?.querySelector('.math')).toBeNull();
		expect(ligne?.querySelector('.texte')?.textContent).toContain(
			"L'intégrale diverge ou n'est pas définie sur [-1 ; 1]"
		);
		const comment = boutons(racine, 'Comment ?');
		expect(comment).toHaveLength(1);
		expect(ligne?.contains(comment[0])).toBe(true);
		expect(comment[0].getAttribute('aria-expanded')).toBe('false');
	});

	it('déplié : les étapes disent pourquoi, et l’interrupteur est là', async () => {
		const racine = afficher('.intégrer \\frac1x de -1 à 1');
		const comment = boutons(racine, 'Comment ?')[0];
		cliquer(comment);
		await tick();

		expect(comment.getAttribute('aria-expanded')).toBe('true');
		const etapes = racine.querySelector('.etapes');
		expect(etapes).not.toBeNull();
		// `aria-controls` désigne bien le bloc déplié
		expect(comment.getAttribute('aria-controls')).toBe(etapes?.id);
		const titres = [...racine.querySelectorAll('.etapes .step-title')].map((t) => t.textContent);
		expect(titres.some((t) => t?.includes('non définie'))).toBe(true);
		expect(racine.querySelectorAll('.etapes .step-explanation').length).toBeGreaterThan(0);

		const resume = boutons(racine, 'Résumé');
		const detaille = boutons(racine, 'Détaillé');
		expect(resume).toHaveLength(1);
		expect(detaille[0].getAttribute('aria-pressed')).toBe('true');
		const groupe = racine.querySelector('.redaction');
		expect(groupe?.getAttribute('role')).toBe('group');
		expect(groupe?.getAttribute('aria-label')).toContain('ligne 1');

		cliquer(resume[0]);
		await tick();
		expect(resume[0].getAttribute('aria-pressed')).toBe('true');
		expect(racine.querySelectorAll('.etapes .step-explanation')).toHaveLength(0);
		// Le message du refus n'a pas bougé
		expect(racine.querySelector('.historique li .texte')?.textContent).toContain(
			"L'intégrale diverge ou n'est pas définie sur [-1 ; 1]"
		);
	});

	it('non-régression : le refus d’une autre commande n’a pas de « Comment ? »', () => {
		const racine = afficher('.dériver |x|');
		expect(racine.querySelector('.historique li')?.classList.contains('refus')).toBe(true);
		expect(boutons(racine, 'Comment ?')).toHaveLength(0);
	});
});
