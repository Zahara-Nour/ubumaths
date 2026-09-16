/**
 * Cliquer « Comment ? » déplie-t-il vraiment les étapes ?
 *
 * ⚠️ **C'est le maillon que deux moitiés vertes ne prouvent pas.** Que les
 * étapes se calculent (`solve-steps.test.ts`) et que leur LaTeX se compose
 * (`solve-steps-affichage.svelte.test.ts`) ne dit RIEN sur le fait que le
 * bouton fasse quelque chose. Sur ce chantier, 14 tests sont passés au vert
 * pendant qu'une action du panneau était morte, sans aucun appelant (#339).
 *
 * Le composant est donc monté pour de bon, dans un vrai Chromium.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import CalculView from '$lib/components/atelier/CalculView.svelte';

const TITRE = 'Équation du premier degré';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function afficher(saisie: string): HTMLElement {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	desk.submit(saisie);

	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(CalculView, { target: cible, props: { desk } });
	return cible;
}

/**
 * Cliquer comme un navigateur clique.
 *
 * ⚠️ `element.click()` seul court-circuite les étapes qui cassent : on modélise
 * la séquence réelle.
 */
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

describe('le dépliage des étapes', () => {
	it('les étapes sont absentes tant qu’on n’a pas cliqué', () => {
		const racine = afficher('.résoudre 3x+5=14');

		expect(racine.textContent).toContain('Comment ?');
		expect(racine.textContent).not.toContain(TITRE);
	});

	it('cliquer « Comment ? » fait apparaître les étapes', async () => {
		const racine = afficher('.résoudre 3x+5=14');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();

		expect(racine.textContent).toContain(TITRE);
		expect(racine.textContent).toContain('On divise les deux membres par 3');
	});

	it('recliquer les replie', async () => {
		const racine = afficher('.résoudre 3x+5=14');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();
		cliquer(bouton(racine, 'Masquer le détail'));
		await tick();

		expect(racine.textContent).not.toContain(TITRE);
	});

	it('une inéquation déplie aussi ses étapes', async () => {
		// ⚠️ Le chemin des inéquations ne passe PAS par le succès du moteur : sur
		// `2x+1<7` il échoue et ne rend rien. Si le bouton n'apparaissait pas
		// ici, l'élève n'aurait toujours qu'une ligne vide.
		const racine = afficher('.résoudre 2x+1<7');

		expect(racine.textContent).toContain('Comment ?');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();

		expect(racine.textContent).toContain('Inéquation du premier degré');
		expect(racine.textContent).toContain('On divise les deux membres par 2');
	});

	it('une commande sans étapes n’offre pas le bouton', () => {
		// Degré 3 : repli. La ligne garde la sortie du moteur, sans « Comment ? ».
		const racine = afficher('.résoudre x^3-x=0');

		expect(racine.textContent).not.toContain('Comment ?');
	});
});
