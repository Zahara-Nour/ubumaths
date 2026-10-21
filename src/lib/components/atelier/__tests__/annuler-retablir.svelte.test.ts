/**
 * Annuler / Rétablir dans la barre de l'atelier — lot 5, PR 1
 * (`docs/archive/wip/atelier-annuler-retablir-phase0.md`, validée par David le 2026-10-19).
 *
 * Les boutons nomment l'étape ; Ctrl/Cmd+Z annule, Ctrl+Y ou Ctrl/Cmd+Maj+Z
 * rétablit, jamais dans un champ en cours de frappe ; chaque geste est annoncé.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { CALC_HISTORY_STORAGE_KEY } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const KEY = 'chiphre-atelier';

const settle = () => new Promise((r) => setTimeout(r, 50));

afterEach(() => localStorage.removeItem(KEY));
beforeEach(() => {
	localStorage.removeItem(KEY);
	localStorage.removeItem(CALC_HISTORY_STORAGE_KEY);
});

function toolButtons(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll('[role="toolbar"] button')] as HTMLButtonElement[];
}

function undoButton(container: HTMLElement): HTMLButtonElement {
	const found = toolButtons(container).find((b) =>
		b.getAttribute('aria-label')?.startsWith('Annuler')
	);
	if (found === undefined) throw new Error('pas de bouton Annuler');
	return found;
}

function redoButton(container: HTMLElement): HTMLButtonElement {
	const found = toolButtons(container).find((b) =>
		b.getAttribute('aria-label')?.startsWith('Rétablir')
	);
	if (found === undefined) throw new Error('pas de bouton Rétablir');
	return found;
}

function announced(container: HTMLElement): string {
	return container.querySelector('[data-annonce]')?.textContent ?? '';
}

function press(init: KeyboardEventInit, target: EventTarget = document.body) {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

async function withTwoSteps() {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
	atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
	const view = await render(AtelierContainer, { atelier, ephemeral: true });
	await settle();
	return { ...view, atelier };
}

// =============================================================================
// Les boutons
// =============================================================================

describe('les boutons Annuler / Rétablir', () => {
	it('nomment l’étape, l’annoncent, et la défont puis la refont', async () => {
		const { container, atelier } = await withTwoSteps();

		expect(undoButton(container).getAttribute('aria-label')).toBe('Annuler : ajouter f');
		expect(undoButton(container).title).toContain('Annuler : ajouter f');

		undoButton(container).click();
		await settle();

		expect(atelier.get('f')).toBeUndefined();
		expect(announced(container)).toBe('Annulé : ajouter f.');
		expect(redoButton(container).getAttribute('aria-label')).toBe('Rétablir : ajouter f');
		expect(undoButton(container).getAttribute('aria-label')).toBe('Annuler : ajouter a');

		redoButton(container).click();
		await settle();

		expect(atelier.get('f')).toBeDefined();
		expect(announced(container)).toBe('Rétabli : ajouter f.');
	});

	it('une étape de la console : la ligne qui définit, défaite en une fois', async () => {
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const input = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;
		input.value = 'g(x)=3x+1';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		(input.form as HTMLFormElement).requestSubmit();
		await vi.waitFor(() => expect(atelier.get('g')).toBeDefined());

		expect(undoButton(container).getAttribute('aria-label')).toBe('Annuler : « g(x)=3x+1 »');
		undoButton(container).click();
		await settle();

		expect(atelier.get('g')).toBeUndefined();
	});
});

// =============================================================================
// Le clavier
// =============================================================================

describe('Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z', () => {
	it('hors d’un champ : Ctrl+Z annule, Ctrl+Y et Ctrl+Maj+Z rétablissent', async () => {
		const { atelier } = await withTwoSteps();

		press({ key: 'z', ctrlKey: true });
		await settle();
		expect(atelier.get('f')).toBeUndefined();

		press({ key: 'y', ctrlKey: true });
		await settle();
		expect(atelier.get('f')).toBeDefined();

		press({ key: 'z', ctrlKey: true });
		press({ key: 'Z', ctrlKey: true, shiftKey: true });
		await settle();
		expect(atelier.get('f')).toBeDefined();

		// Cmd+Z sur Mac
		press({ key: 'z', metaKey: true });
		await settle();
		expect(atelier.get('f')).toBeUndefined();
	});

	it('dans un champ en cours de frappe : l’atelier ne bouge pas (le champ annule sa frappe)', async () => {
		const { container, atelier } = await withTwoSteps();
		const input = container.querySelector(
			'input[aria-label="Calcul, définition ou commande"]'
		) as HTMLInputElement;

		press({ key: 'z', ctrlKey: true }, input);
		await settle();

		expect(atelier.get('f')).toBeDefined();
		expect(atelier.history.undo).toBe('ajouter f');
	});

	it('le raccourci consommé ne remonte pas au graphe (`defaultPrevented`)', async () => {
		await withTwoSteps();
		const event = new KeyboardEvent('keydown', {
			key: 'z',
			ctrlKey: true,
			bubbles: true,
			cancelable: true
		});

		document.body.dispatchEvent(event);
		await settle();

		expect(event.defaultPrevented).toBe(true);
	});
});
