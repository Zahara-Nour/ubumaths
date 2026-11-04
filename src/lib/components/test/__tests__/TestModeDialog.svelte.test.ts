/**
 * Fenêtre de choix de la forme d'une série (panier) : la forme
 * « Flash-cards » (2026-09-30) y figure et se lance sans temps imparti.
 * Un clic sur une carte lance la série (2026-11-04), sauf la Course aux
 * nombres, qui demande d'abord le temps imparti.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import TestModeDialog from '../TestModeDialog.svelte';
import type { TestMode } from '$lib/types/test';

function findButton(label: string): HTMLButtonElement | undefined {
	return [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
		candidate.textContent?.includes(label)
	);
}

async function click(label: string) {
	const found = findButton(label);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	found.click();
	flushSync();
	await tick();
}

describe('TestModeDialog — forme Flash-cards', () => {
	it('propose la forme Flash-cards avec sa description', async () => {
		await render(TestModeDialog, { open: true, onSelect: vi.fn() });
		await tick();

		const card = findButton('Flash-cards');
		expect(card).toBeDefined();
		expect(card?.textContent).toContain(
			'Retourne chaque carte et dis si tu avais trouvé. Sans chrono.'
		);
	});

	it('lance le mode flash, sans temps imparti', async () => {
		const onSelect = vi.fn<(mode: TestMode, timeLimit?: number) => void>();
		await render(TestModeDialog, { open: true, onSelect });
		await tick();

		await click('Flash-cards');

		expect(onSelect).toHaveBeenCalledWith('flash', undefined);
	});
});

describe('TestModeDialog — un clic sur une carte lance la série', () => {
	it.each([
		['En classe', 'display'],
		['Entraînement', 'interactive'],
		['Flash-cards', 'flash']
	] as const)('« %s » lance « %s » aussitôt', async (label, mode) => {
		const onSelect = vi.fn<(mode: TestMode, timeLimit?: number) => void>();
		await render(TestModeDialog, { open: true, onSelect });
		await tick();

		await click(label);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(mode, undefined);
	});

	it('pas de bouton « Commencer le test » tant que la Course n’est pas choisie', async () => {
		await render(TestModeDialog, { open: true, onSelect: vi.fn() });
		await tick();

		expect(findButton('Commencer le test')).toBeUndefined();
	});

	it('la Course aux nombres demande le temps, puis se lance par « Commencer le test »', async () => {
		const onSelect = vi.fn<(mode: TestMode, timeLimit?: number) => void>();
		await render(TestModeDialog, { open: true, onSelect });
		await tick();

		await click('Course aux nombres');
		expect(onSelect).not.toHaveBeenCalled();
		expect(document.body.querySelector('#time-limit')).not.toBeNull();

		await click('Commencer le test');
		expect(onSelect).toHaveBeenCalledWith('course', 300);
	});
});
