/**
 * Les touches de la console restent dans la console — suivi de la revue de
 * #1485 (lot 2 de `docs/archive/wip/atelier-refonte-interface-phase0.md`).
 *
 * Le Graphe reste monté SOUS la console, et ses raccourcis (`KeyboardHandler`)
 * écoutent toute la fenêtre : ↓ sur la poignée décalait le graphe, Échap sur
 * « Fermer » remettait la vue à zéro. Et les Échap fragiles : en écriture
 * mathématique, et quand une liste de propositions est ouverte.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';
import { CALC_HISTORY_STORAGE_KEY } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const ATELIER_KEY = 'chiphre-atelier';
const FIELD = 'input[aria-label="Calcul, définition ou commande"]';

function forget() {
	for (const key of [INPUT_MODE_KEY, CALC_HISTORY_STORAGE_KEY, ATELIER_KEY]) {
		localStorage.removeItem(key);
	}
}

// Le stockage est commun à tous les fichiers de tests du navigateur : démonter
// (qui range ce qui attendait) AVANT d'oublier
// Sous 640 px la console prend tout l'écran, sans poignée : une scène de bureau
beforeEach(async () => {
	forget();
	await page.viewport(1280, 900);
});
afterEach(() => {
	cleanup();
	forget();
	vi.restoreAllMocks();
});

function consolePanel(container: HTMLElement): HTMLElement {
	const panel = container.querySelector<HTMLElement>('[role="region"][aria-label="Console"]');
	if (!panel) throw new Error('pas de console');
	return panel;
}

function isOpen(container: HTMLElement): boolean {
	return !consolePanel(container).hasAttribute('inert');
}

function byLabel(container: HTMLElement, label: string): HTMLElement {
	const el = container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
	if (!el) throw new Error(`pas de « ${label} »`);
	return el;
}

/** Le graphe dessous : ses mouvements, épiés sur toutes les instances. */
function spyGraph() {
	return {
		pan: vi.spyOn(GrapheurStore.prototype, 'pan'),
		zoom: vi.spyOn(GrapheurStore.prototype, 'zoom'),
		reset: vi.spyOn(GrapheurStore.prototype, 'resetViewport')
	};
}

async function openIn(mode: 'text' | 'math') {
	localStorage.setItem(INPUT_MODE_KEY, mode);
	const view = await render(AtelierContainer, { atelier: new Atelier(), ephemeral: true });
	await vi.waitFor(() => expect(isOpen(view.container)).toBe(true));
	return view.container;
}

// =============================================================================
// Le graphe dessous n'entend pas la console
// =============================================================================

describe('les touches de la console ne touchent pas au graphe dessous', () => {
	it('↓ sur la poignée agrandit la console sans décaler le graphe', async () => {
		const container = await openIn('text');
		const graph = spyGraph();
		const handle = byLabel(container, 'Hauteur de la console');
		const before = Number(handle.getAttribute('aria-valuenow'));

		handle.focus();
		await userEvent.keyboard('{ArrowDown}');

		await vi.waitFor(() =>
			expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(before)
		);
		expect(graph.pan).not.toHaveBeenCalled();
	});

	it('Échap sur « Fermer la console » ferme la console sans remettre la vue à zéro', async () => {
		const container = await openIn('text');
		const graph = spyGraph();

		byLabel(container, 'Fermer la console').focus();
		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
		expect(graph.reset).not.toHaveBeenCalled();
	});

	it('une flèche ou « + » sur un bouton de la console ne bouge pas le graphe', async () => {
		const container = await openIn('text');
		const graph = spyGraph();

		byLabel(container, 'Fermer la console').focus();
		await userEvent.keyboard('{ArrowLeft}');
		await userEvent.keyboard('+');

		expect(graph.pan).not.toHaveBeenCalled();
		expect(graph.zoom).not.toHaveBeenCalled();
		expect(isOpen(container)).toBe(true);
	});

	it('console fermée, le graphe garde ses raccourcis', async () => {
		const container = await openIn('text');
		byLabel(container, 'Fermer la console').click();
		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
		const graph = spyGraph();

		(document.activeElement as HTMLElement | null)?.blur();
		await userEvent.keyboard('{ArrowLeft}');

		await vi.waitFor(() => expect(graph.pan).toHaveBeenCalled());
	});
});

// =============================================================================
// Les Échap fragiles
// =============================================================================

describe('Échap dans les champs de la console', () => {
	it('écriture mathématique : Échap ferme la console', async () => {
		const container = await openIn('math');
		const field = await vi.waitFor(() => {
			const found = container.querySelector<MathfieldElement>('.calcul form math-field');
			expect(found).toBeTruthy();
			return found as MathfieldElement;
		});
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(isOpen(container)).toBe(false));
	});

	it('écriture mathématique, liste de propositions ouverte : Échap ne ferme que la liste', async () => {
		const container = await openIn('math');
		const field = await vi.waitFor(() => {
			const found = container.querySelector<MathfieldElement>('.calcul form math-field');
			expect(found).toBeTruthy();
			return found as MathfieldElement;
		});
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('moveToMathfieldEnd');
		await userEvent.keyboard('si');
		await vi.waitFor(() =>
			expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(0)
		);

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(container.querySelectorAll('[role="option"]').length).toBe(0));
		expect(isOpen(container)).toBe(true);
	});

	it('champ texte, liste des commandes ouverte : Échap ne ferme que la liste', async () => {
		const container = await openIn('text');
		await userEvent.click(container.querySelector(FIELD) as HTMLElement);
		await userEvent.keyboard('.');
		await vi.waitFor(() =>
			expect(container.querySelector('ul.commandes:not(.propositions)')).toBeTruthy()
		);

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() =>
			expect(container.querySelector('ul.commandes:not(.propositions)')).toBeNull()
		);
		expect(isOpen(container)).toBe(true);
	});

	it('champ texte, liste des fonctions ouverte : Échap ne ferme que la liste', async () => {
		const container = await openIn('text');
		await userEvent.click(container.querySelector(FIELD) as HTMLElement);
		await userEvent.keyboard('si');
		await vi.waitFor(() => expect(container.querySelector('.propositions')).toBeTruthy());

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(container.querySelector('.propositions')).toBeNull());
		expect(isOpen(container)).toBe(true);
	});
});
