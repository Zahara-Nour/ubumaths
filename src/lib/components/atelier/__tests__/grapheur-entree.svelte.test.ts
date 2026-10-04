/**
 * `/grapheur` ouvre l'atelier — lot 6 (phase 0 §6 B2, B3, B7).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

const KEY = 'chiphre-atelier';

afterEach(() => localStorage.removeItem(KEY));

function currentView(container: HTMLElement): string {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim() ?? '';
}

describe('ouvrir /grapheur', () => {
	// B2
	it('ouvre sur le Graphe, « Mes objets » visible', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: new Atelier(),
			ephemeral: true,
			view: 'graphe',
			startWith: 'function'
		});

		expect(currentView(container)).toBe('Graphe');
		expect(container.querySelector('.panneau')).toBeTruthy();
	});

	// B3 : une carte f vide, tracée, prête à taper — pas de x² d'office
	it('un atelier vide reçoit une carte f prête à taper', async () => {
		const atelier = new Atelier();
		await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe',
			startWith: 'function'
		});

		await vi.waitFor(() => {
			expect(atelier.names).toEqual(['f']);
			expect(atelier.get('f')).toMatchObject({ definition: '', plotted: true });
			expect(document.activeElement?.tagName.toLowerCase()).toBe('math-field');
		});
	});

	it('un atelier qui a déjà des objets n’en reçoit pas', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'g', definition: 'x' }, 'text');

		await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe',
			startWith: 'function'
		});

		await new Promise((r) => setTimeout(r, 50));
		expect(atelier.names).toEqual(['g']);
	});
});

describe('repartir de zéro (B7)', () => {
	it('vide l’atelier, après confirmation', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier });

		const reset = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Repartir de zéro'
		) as HTMLButtonElement;
		reset.click();
		// Rien n'est vidé avant la confirmation
		expect(atelier.names).toEqual(['f']);

		const confirm = await vi.waitFor(() => {
			const found = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
				b.textContent?.includes('Vider')
			) as HTMLButtonElement | undefined;
			expect(found).toBeTruthy();
			return found!;
		});
		confirm.click();

		await vi.waitFor(() => expect(atelier.names).toEqual([]));
	});

	it('n’est pas proposé sur un atelier reçu par lien', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: new Atelier(),
			ephemeral: true
		});

		const reset = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Repartir de zéro'
		);
		expect(reset).toBeUndefined();
	});
});

describe('revues du lot 6', () => {
	// C2 : la simple visite enregistrait une carte vide
	it('la carte d’accueil n’est pas enregistrée tant qu’on n’y touche pas', async () => {
		await render(AtelierContainer, {
			atelier: new Atelier(),
			view: 'graphe',
			startWith: 'function'
		});

		await new Promise((r) => setTimeout(r, 800));

		expect(localStorage.getItem(KEY)).toBeNull();
	});

	// C3 : l'historique de Calcul restait, sur des objets supprimés
	it('« Repartir de zéro » vide aussi l’historique de Calcul', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier });
		const input = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
		input.value = 'f(3)';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		(input.form as HTMLFormElement).requestSubmit();
		await vi.waitFor(() => expect(container.querySelectorAll('.historique li').length).toBe(1));

		(
			[...container.querySelectorAll('button')].find(
				(b) => b.textContent?.trim() === 'Repartir de zéro'
			) as HTMLButtonElement
		).click();
		const confirm = await vi.waitFor(() => {
			const found = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
				b.textContent?.includes('Vider')
			) as HTMLButtonElement | undefined;
			expect(found).toBeTruthy();
			return found!;
		});
		confirm.click();

		await vi.waitFor(() => expect(container.querySelectorAll('.historique li').length).toBe(0));
	});

	// A11y : un titre de niveau 1, et un bouton qui ne sert à rien est désactivé
	it('la page a un titre de niveau 1', async () => {
		const { container } = await render(AtelierContainer, {
			atelier: new Atelier(),
			ephemeral: true,
			heading: 'Grapheur'
		});

		expect(container.querySelector('h1')?.textContent?.trim()).toBe('Grapheur');
	});

	it('« Repartir de zéro » est désactivé sur un atelier vide', async () => {
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		const reset = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Repartir de zéro'
		) as HTMLButtonElement;
		expect(reset.disabled).toBe(true);
	});
});
