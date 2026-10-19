/**
 * Charger et Repartir de zéro, annulables — vus depuis l'écran (lot 5, PR 3).
 *
 * Phase 0 `docs/wip/atelier-annuler-retablir-phase0.md`, et la décision de David
 * du 2026-10-19 : charger un fichier garde la console ; ses lignes s'ajoutent à
 * la suite, après « Atelier chargé depuis … », barrée si on annule. La copie
 * mise de côté suit Annuler / Rétablir (B3, `atelier-remplacer-phase0.md`).
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { CalcDesk } from '$lib/atelier/desk.svelte';
import {
	ATELIER_STATE_VERSION,
	ATELIER_STORAGE_KEY,
	SET_ASIDE_STORAGE_KEY,
	loadAtelier,
	saveAtelier,
	type AtelierState
} from '$lib/atelier/persistence';
import { CALC_HISTORY_STORAGE_KEY, saveCalcHistory } from '$lib/atelier/history-storage';
import { atelierFileToJson } from '$lib/atelier/atelier-file';

// =============================================================================
// Décor
// =============================================================================

const settle = () => new Promise((r) => setTimeout(r, 50));

function clear() {
	localStorage.removeItem(ATELIER_STORAGE_KEY);
	localStorage.removeItem(SET_ASIDE_STORAGE_KEY);
	localStorage.removeItem(CALC_HISTORY_STORAGE_KEY);
}
beforeEach(clear);
afterEach(clear);

const MIEN: AtelierState = {
	version: ATELIER_STATE_VERSION,
	objects: [
		{ name: 'a', kind: 'value', definition: '5' },
		{ name: 'f', kind: 'function', definition: 'a x' }
	],
	grid: { cells: { C1: '12' } }
};

/** Un fichier `.atelier.json` : l'atelier `h`, et une ligne de console à lui. */
function atelierFile(): File {
	const atelier = new Atelier();
	const desk = new CalcDesk(atelier);
	desk.submit('h(x) = x+1');
	const text = atelierFileToJson(atelier.serialize(), desk.entries, desk.typedInputs, new Date());
	return new File([text], 'mon-atelier.atelier.json', { type: 'application/json' });
}

function buttonNamed(root: ParentNode, label: string): HTMLButtonElement | undefined {
	return [...root.querySelectorAll('button')].find(
		(b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label
	) as HTMLButtonElement | undefined;
}

function toolbar(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="toolbar"]') as HTMLElement;
}

function dialogButton(label: string): HTMLButtonElement | undefined {
	const dialog = document.querySelector('[role="alertdialog"], [role="dialog"]');
	return dialog === null ? undefined : buttonNamed(dialog, label);
}

function press(init: KeyboardEventInit) {
	document.body.dispatchEvent(
		new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
	);
}

async function choose(container: HTMLElement, file: File) {
	const input = toolbar(container).querySelector('input[type="file"]') as HTMLInputElement;
	const transfer = new DataTransfer();
	transfer.items.add(file);
	input.files = transfer.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	await settle();
}

const stored = (key: string) => {
	const loaded = loadAtelier(localStorage, key);
	return loaded.kind === 'loaded' ? loaded.state.objects.map((o) => o.name) : loaded.kind;
};

/** Les lignes de la console, telles qu'affichées : texte, et barrée ou non. */
function consoleLines(container: HTMLElement): { text: string; struck: boolean }[] {
	return [...container.querySelectorAll('.historique > li')].map((li) => ({
		text: li.textContent?.replace(/\s+/g, ' ').trim() ?? '',
		struck: li.classList.contains('annulee') || li.querySelector('.annulee') !== null
	}));
}

// =============================================================================
// Charger
// =============================================================================

describe('charger un atelier, puis Annuler', () => {
	it('Ctrl+Z rend l’atelier et la grille d’avant, Ctrl+Y l’atelier chargé', async () => {
		saveAtelier(localStorage, MIEN);
		saveCalcHistory(
			localStorage,
			[{ id: 0, label: 'a = 5', text: 'a est correctement défini.', failed: false }],
			[]
		);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		await settle();
		const before = atelier.serialize();

		await choose(container, atelierFile());
		dialogButton('Charger')!.click();
		await settle();
		expect(atelier.names).toEqual(['h']);

		press({ key: 'z', ctrlKey: true });
		await settle();
		expect(atelier.serialize()).toEqual(before);

		press({ key: 'y', ctrlKey: true });
		await settle();
		expect(atelier.names).toEqual(['h']);
	});

	it('la console garde ses lignes, ajoute celles du fichier, et barre le chargement annulé', async () => {
		saveAtelier(localStorage, MIEN);
		saveCalcHistory(
			localStorage,
			[{ id: 0, label: 'a = 5', text: 'a est correctement défini.', failed: false }],
			[]
		);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		await settle();

		await choose(container, atelierFile());
		dialogButton('Charger')!.click();
		await settle();

		const texts = consoleLines(container).map((l) => l.text);
		const loadIndex = texts.findIndex((t) =>
			t.includes('Atelier chargé depuis mon-atelier.atelier.json.')
		);
		expect(loadIndex).toBeGreaterThan(0);
		expect(texts[0]).toContain('a = 5');
		expect(texts.slice(loadIndex + 1).join(' ')).toContain('h(x)');

		press({ key: 'z', ctrlKey: true });
		await settle();
		const lines = consoleLines(container);
		expect(lines.find((l) => l.text.includes('Atelier chargé depuis'))?.struck).toBe(true);
		expect(lines.some((l) => l.text.includes('h(x)'))).toBe(true);
	});

	it('la copie mise de côté suit Annuler et Rétablir (B3)', async () => {
		saveAtelier(localStorage, MIEN);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		await settle();

		await choose(container, atelierFile());
		dialogButton('Charger')!.click();
		await settle();
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);

		press({ key: 'z', ctrlKey: true });
		await settle();
		// L'atelier chargé, quitté, est maintenant de côté
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['h']);

		press({ key: 'y', ctrlKey: true });
		await settle();
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
	});
});

// =============================================================================
// Repartir de zéro
// =============================================================================

describe('repartir de zéro, puis Annuler', () => {
	it('Ctrl+Z rend tout l’atelier, grille comprise ; la console est restée', async () => {
		saveAtelier(localStorage, MIEN);
		saveCalcHistory(
			localStorage,
			[{ id: 0, label: 'a = 5', text: 'a est correctement défini.', failed: false }],
			['a = 5']
		);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		await settle();
		const before = atelier.serialize();

		buttonNamed(toolbar(container), 'Repartir de zéro')!.click();
		await settle();
		dialogButton('Vider l’atelier')!.click();
		await settle();
		expect(atelier.objects).toEqual([]);
		// Décision de David du 2026-10-19 : la console n'est pas vidée
		expect(consoleLines(container).map((l) => l.text)).toEqual([
			expect.stringContaining('a = 5'),
			expect.stringContaining('Atelier vidé.')
		]);

		press({ key: 'z', ctrlKey: true });
		await settle();
		expect(atelier.serialize()).toEqual(before);
		expect(consoleLines(container).find((l) => l.text.includes('Atelier vidé.'))?.struck).toBe(
			true
		);
	});

	it('ne touche pas à la copie mise de côté', async () => {
		saveAtelier(localStorage, MIEN);
		saveAtelier(
			localStorage,
			{ version: ATELIER_STATE_VERSION, objects: [{ name: 'k', kind: 'value', definition: '1' }] },
			SET_ASIDE_STORAGE_KEY
		);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		await settle();

		buttonNamed(toolbar(container), 'Repartir de zéro')!.click();
		await settle();
		dialogButton('Vider l’atelier')!.click();
		await settle();
		press({ key: 'z', ctrlKey: true });
		await settle();
		press({ key: 'y', ctrlKey: true });
		await settle();

		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['k']);
	});
});
