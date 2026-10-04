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
