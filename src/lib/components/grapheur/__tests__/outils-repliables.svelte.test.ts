import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import ViewportControls from '../ViewportControls.svelte';
import { GrapheurStore } from '#lib/stores/grapheur.svelte.ts';
import { grapheurContext } from '#lib/stores/grapheur-context.ts';

const STORAGE_KEY = 'grapheur-outils-replies';

async function renderControls(expanded = false) {
	return await render(ViewportControls, {
		props: { svgWidth: 400, svgHeight: 300, expanded, onToggleExpanded: () => {} },
		context: grapheurContext(new GrapheurStore())
	});
}

function button(container: HTMLElement, label: string): HTMLButtonElement | null {
	return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
}

/**
 * Les icônes du graphe (zoom, maison, grille, export, agrandir) se replient
 * derrière un seul bouton ; le choix est gardé dans le navigateur.
 */
describe('outils du graphe repliables', () => {
	beforeEach(() => {
		window.localStorage.removeItem(STORAGE_KEY);
	});

	// Les autres tests du grapheur montent le même composant : ne rien leur laisser.
	afterEach(() => {
		window.localStorage.removeItem(STORAGE_KEY);
	});

	it('dépliés par défaut, avec un bouton pour les replier', async () => {
		const screen = await renderControls();
		const toggle = button(screen.container, 'Replier les outils du graphe');
		expect(toggle).not.toBeNull();
		expect(toggle!.getAttribute('aria-expanded')).toBe('true');
		expect(button(screen.container, 'Zoom avant')).not.toBeNull();
		expect(button(screen.container, 'Agrandir le graphe')).not.toBeNull();
	});

	it('repliés : il ne reste que le bouton pour les déplier', async () => {
		const screen = await renderControls();
		button(screen.container, 'Replier les outils du graphe')!.click();
		flushSync();

		expect(screen.container.querySelectorAll('button')).toHaveLength(1);
		const toggle = button(screen.container, 'Afficher les outils du graphe');
		expect(toggle).not.toBeNull();
		expect(toggle!.getAttribute('aria-expanded')).toBe('false');

		toggle!.click();
		flushSync();
		expect(button(screen.container, 'Zoom avant')).not.toBeNull();
	});

	it('graphe agrandi : « Réduire » reste visible outils repliés', async () => {
		const screen = await renderControls(true);
		button(screen.container, 'Replier les outils du graphe')!.click();
		flushSync();

		expect(button(screen.container, 'Zoom avant')).toBeNull();
		expect(button(screen.container, 'Réduire le graphe')).not.toBeNull();
		expect(screen.container.querySelectorAll('button')).toHaveLength(2);
	});

	it('le repli est gardé d’une visite à l’autre', async () => {
		const first = await renderControls();
		button(first.container, 'Replier les outils du graphe')!.click();
		flushSync();
		await first.unmount();

		const second = await renderControls();
		flushSync();
		expect(button(second.container, 'Zoom avant')).toBeNull();
		expect(button(second.container, 'Afficher les outils du graphe')).not.toBeNull();
	});

	it('sans localStorage (refusé), dépliés et toujours repliables', async () => {
		const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('refusé');
			}
		});
		try {
			const screen = await renderControls();
			expect(button(screen.container, 'Zoom avant')).not.toBeNull();
			button(screen.container, 'Replier les outils du graphe')!.click();
			flushSync();
			expect(button(screen.container, 'Zoom avant')).toBeNull();
		} finally {
			if (original) Object.defineProperty(window, 'localStorage', original);
		}
	});
});
