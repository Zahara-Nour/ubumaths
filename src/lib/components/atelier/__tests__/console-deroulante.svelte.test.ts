/**
 * La console déroulante — lot 2 de `docs/wip/atelier-refonte-interface-phase0.md`.
 *
 * Décisions de David (2026-10-18) : la console est un volet qui descend PAR-DESSUS
 * Graphe, Géométrie et Données ; l'onglet Calcul disparaît. Raccourcis : la touche
 * sous Échap (hors d'un champ) et Ctrl+Entrée (partout). Lisibilité : invite `>`,
 * réponse préfixée `-->`, « a est correctement défini » avec le nom en couleur.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

const FIELD = 'input[aria-label="Calcul, définition ou commande"]';

function tabs(container: HTMLElement): string[] {
	return [...container.querySelectorAll('.onglet')].map((t) => t.textContent?.trim() ?? '');
}

function consolePanel(container: HTMLElement): HTMLElement {
	const panel = container.querySelector<HTMLElement>('[role="region"][aria-label="Console"]');
	if (!panel) throw new Error('pas de console');
	return panel;
}

function isOpen(container: HTMLElement): boolean {
	return !consolePanel(container).hasAttribute('inert');
}

function consoleButton(container: HTMLElement): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>('button[aria-label="Console"]');
	if (!button) throw new Error('pas de bouton Console');
	return button;
}

function field(container: HTMLElement): HTMLInputElement {
	return container.querySelector(FIELD) as HTMLInputElement;
}

function press(target: EventTarget, init: KeyboardEventInit) {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

async function submit(container: HTMLElement, text: string) {
	await userEvent.click(field(container));
	await userEvent.keyboard(`${text}{Enter}`);
}

// =============================================================================
// Onglets et ouverture
// =============================================================================

describe('les onglets', () => {
	it('Graphe · Géométrie · Données : plus d’onglet Calcul', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		expect(tabs(container)).toEqual(['Graphe', 'Géométrie', 'Données']);
	});

	it('l’atelier s’ouvre sur le Graphe, console ouverte par-dessus', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		expect(container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim()).toBe(
			'Graphe'
		);
		expect(isOpen(container)).toBe(true);
		expect(field(container)).toBeTruthy();
	});

	it('une vue demandée (/grapheur) s’ouvre console fermée', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true, view: 'graphe' });
		expect(isOpen(container)).toBe(false);
	});
});

describe('ouvrir et fermer la console', () => {
	it('le bouton de la barre ferme puis rouvre la console, le champ prend le focus', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		const button = consoleButton(container);
		expect(button.getAttribute('aria-expanded')).toBe('true');

		button.click();
		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
		expect(button.getAttribute('aria-expanded')).toBe('false');

		button.click();
		await vi.waitFor(() => expect(isOpen(container)).toBe(true));
		await vi.waitFor(() => expect(document.activeElement).toBe(field(container)));
	});

	it('l’infobulle du bouton rappelle les deux raccourcis', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		const title = consoleButton(container).getAttribute('title') ?? '';
		expect(title).toContain('Échap');
		expect(title).toContain('Ctrl+Entrée');
	});

	it('Échap dans la console la ferme et rend le focus au bouton', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		await userEvent.click(field(container));

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
		expect(document.activeElement).toBe(consoleButton(container));
	});

	it('la touche sous Échap, hors d’un champ, ouvre et ferme la console', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true, view: 'graphe' });
		document.body.focus();

		press(document.body, { code: 'Backquote', key: '²' });
		await vi.waitFor(() => expect(isOpen(container)).toBe(true));

		press(document.body, { code: 'Backquote', key: '²' });
		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
	});

	it('la touche sous Échap dans un champ tape son caractère : la console ne bouge pas', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		field(container).focus();

		press(field(container), { code: 'Backquote', key: '²' });

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(isOpen(container)).toBe(true);
	});

	it('Ctrl+Entrée marche aussi depuis le champ', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		field(container).focus();

		press(field(container), { code: 'Enter', key: 'Enter', ctrlKey: true });

		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
	});
});

// =============================================================================
// A3 : un résultat attend dans la console
// =============================================================================

describe('le compteur des nouveaux résultats (A3)', () => {
	it('une action, console fermée : le bouton compte la ligne, l’annonce nomme la console', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe'
		});
		// Lot 3 de la refonte : l'action est dans le menu de la carte
		await chooseCardAction(container, 'f', 'Dériver');

		await vi.waitFor(() =>
			expect(consoleButton(container).parentElement?.querySelector('.nouveau')?.textContent).toBe(
				'1'
			)
		);
		await vi.waitFor(() =>
			expect(container.querySelector('[data-annonce]')?.textContent ?? '').toContain('console')
		);
		// Ouvrir la console efface le compteur
		consoleButton(container).click();
		await vi.waitFor(() =>
			expect(consoleButton(container).parentElement?.querySelector('.nouveau')).toBeNull()
		);
	});
});

// =============================================================================
// Lisibilité
// =============================================================================

describe('la lisibilité des lignes', () => {
	it('l’instruction derrière une invite >, la réponse derrière -->', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		await submit(container, '2+3');

		const line = await vi.waitFor(() => {
			const li = container.querySelector('.historique li');
			expect(li).toBeTruthy();
			return li!;
		});
		expect(line.querySelector('.invite')?.textContent?.trim()).toBe('>');
		expect(line.querySelector('.invite')?.getAttribute('aria-hidden')).toBe('true');
		expect(line.querySelector('.fleche')?.textContent?.trim()).toBe('-->');
		expect(line.querySelector('.fleche')?.getAttribute('aria-hidden')).toBe('true');
	});

	it('une commande en texte est en chasse fixe', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await submit(container, '.dériver f');

		await vi.waitFor(() =>
			expect(container.querySelector('.historique li .saisie.commande')).toBeTruthy()
		);
	});

	it('a = 5 : « a est correctement défini », le nom en couleur', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });

		await submit(container, 'a = 5');

		const line = await vi.waitFor(() => {
			const li = container.querySelector('.historique li');
			expect(li?.querySelector('.nom-defini')).toBeTruthy();
			return li!;
		});
		expect(line.querySelector('.nom-defini')?.textContent).toBe('a');
		expect(line.querySelector('.reponse')?.textContent).toContain('a est correctement défini.');
	});
});

describe('le menu de la console', () => {
	it('l’historique pour une fiche est dans le menu, plus en lien sous la console', async () => {
		const { container } = await render(AtelierContainer, { ephemeral: true });
		await submit(container, '2+3');

		expect(container.querySelector('.pour-fiche')).toBeNull();
		const trigger = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Menu de la console"]'
		);
		expect(trigger).toBeTruthy();
		await userEvent.click(trigger!);
		await vi.waitFor(() =>
			expect(document.body.textContent ?? '').toContain('Copier l’historique pour une fiche')
		);
		expect(document.body.textContent ?? '').toContain('Télécharger l’historique (ubumark)');
	});
});
