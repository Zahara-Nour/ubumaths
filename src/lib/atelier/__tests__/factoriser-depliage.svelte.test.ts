/**
 * `.factoriser` à l'écran : la réponse se compose-t-elle, et « Comment ? »
 * déplie-t-il vraiment ?
 *
 * ⚠️ Cette commande est la première que l'atelier sert SANS moteur. Les trois
 * issues (factorisée / inchangée / refus) donnent trois lignes différentes, et
 * rien d'autre ne les distingue à l'écran : c'est ici qu'on vérifie que la
 * ligne « je ne sais pas » n'est pas rouge, et que la ligne factorisée porte
 * bien des maths et pas du texte.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, tick } from 'svelte';
import { convertLatexToMarkup } from 'mathlive';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { factorSteps } from '../factor-steps';
import CalculView from '$lib/components/atelier/CalculView.svelte';

/** Le marqueur que MathLive pose sur ce qu'il n'a pas su composer. */
const ERROR_MARKER = 'ML__error';

const TITRE = 'On met le facteur commun en évidence';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function markupOf(latex: string): string {
	return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
}

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

describe('la factorisation se compose', () => {
	it('le marqueur d’erreur existe bien — sinon ce fichier ne garde rien', () => {
		expect(markupOf('\\pasunecommande{3}')).toContain(ERROR_MARKER);
	});

	it('la réponse et ses étapes passent MathLive', () => {
		const outcome = factorSteps('exp(x)+x*exp(x)');
		expect(outcome.kind).toBe('factorisee');
		if (outcome.kind !== 'factorisee') return;

		expect(markupOf(outcome.answer)).not.toContain(ERROR_MARKER);
		for (const step of outcome.steps) {
			if (step.expressionLatex === undefined) continue;
			expect(markupOf(step.expressionLatex)).not.toContain(ERROR_MARKER);
		}
	});
});

describe('le dépliage de `.factoriser`', () => {
	it('cliquer « Comment ? » fait apparaître la règle', async () => {
		const racine = afficher('.factoriser exp(x)+x*exp(x)');

		expect(racine.textContent).toContain('Comment ?');
		expect(racine.textContent).not.toContain(TITRE);

		cliquer(bouton(racine, 'Comment ?'));
		await tick();

		expect(racine.textContent).toContain(TITRE);
		expect(racine.textContent).toContain('facteur commun');
	});

	it('recliquer les replie', async () => {
		const racine = afficher('.factoriser exp(x)+x*exp(x)');

		cliquer(bouton(racine, 'Comment ?'));
		await tick();
		cliquer(bouton(racine, 'Masquer le détail'));
		await tick();

		expect(racine.textContent).not.toContain(TITRE);
	});
});

describe('les lignes sans étapes', () => {
	it('« je ne sais pas » s’affiche en clair, sans bouton', () => {
		const racine = afficher('.factoriser 3x+6');

		expect(racine.textContent).toContain('Je ne sais pas factoriser');
		expect(racine.textContent).not.toContain('Comment ?');
	});

	it('et la ligne n’est PAS rouge — la commande a bien tourné', () => {
		const racine = afficher('.factoriser 3x+6');

		expect(racine.querySelector('li.refus')).toBeNull();
	});

	it('un refus, lui, est bien rouge', () => {
		const racine = afficher('.factoriser ###');

		expect(racine.querySelector('li.refus')).not.toBeNull();
	});
});
