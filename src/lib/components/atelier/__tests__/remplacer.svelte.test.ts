/**
 * « Remplacer mon atelier », vu depuis l'écran (phase 0
 * `docs/archive/wip/atelier-remplacer-phase0.md`, R1-R5 et B1-B8, validée par David).
 *
 * Sur un atelier reçu par lien, deux gestes : « Garder dans mon atelier » (la
 * fusion) et « Remplacer mon atelier ». Remplacer confirme en comptant ce qui
 * sera perdu (B2), met l'atelier personnel de côté (R3), et « Retrouver mon
 * atelier précédent » ÉCHANGE les deux (B3). Charger suit le même chemin (B8).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
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
afterEach(() => {
	vi.restoreAllMocks();
	clear();
});

const RECU: AtelierState = {
	version: ATELIER_STATE_VERSION,
	objects: [{ name: 'g', kind: 'function', definition: 'x^3' }]
};

const MIEN: AtelierState = {
	version: ATELIER_STATE_VERSION,
	objects: [
		{ name: 'a', kind: 'value', definition: '5' },
		{ name: 'f', kind: 'function', definition: 'a x' }
	],
	grid: { cells: { C1: '12' } }
};

/** Un atelier reçu par lien, tel que la page l'ouvre : affiché, éphémère. */
async function openReceived(received: AtelierState = RECU) {
	const atelier = new Atelier();
	atelier.restore(received);
	const onLinkLeft = vi.fn();
	const rendered = await render(AtelierContainer, {
		atelier,
		ephemeral: true,
		received,
		onLinkLeft
	});
	return { ...rendered, atelier, onLinkLeft };
}

function buttonNamed(root: ParentNode, label: string): HTMLButtonElement | undefined {
	return [...root.querySelectorAll('button')].find(
		(b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === label
	) as HTMLButtonElement | undefined;
}

function toolbar(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="toolbar"]') as HTMLElement;
}

function dialog(): HTMLElement | null {
	return document.querySelector('[role="alertdialog"], [role="dialog"]');
}

function dialogButton(label: string): HTMLButtonElement | undefined {
	return dialog() === null ? undefined : buttonNamed(dialog()!, label);
}

/** Ce que l'avis (`aria-live`) affiche. */
function notices(container: HTMLElement): HTMLElement {
	return container.querySelector('.avis') as HTMLElement;
}

/** Le compte affiché en tête de « Mes objets ». */
function count(container: HTMLElement): string {
	return container.querySelector('.compte')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

const stored = (key: string) => {
	const loaded = loadAtelier(localStorage, key);
	return loaded.kind === 'loaded' ? loaded.state.objects.map((o) => o.name) : loaded.kind;
};

// =============================================================================
// Remplacer mon atelier
// =============================================================================

describe('remplacer mon atelier (atelier reçu par lien)', () => {
	it('R1 : deux gestes sur un atelier reçu, Garder et Remplacer', async () => {
		const { container } = await openReceived();

		expect(buttonNamed(container, 'Garder dans mon atelier')).toBeDefined();
		expect(buttonNamed(container, 'Remplacer mon atelier')).toBeDefined();
	});

	it('B2 : la confirmation compte ce qui sera perdu, et rassure', async () => {
		saveAtelier(localStorage, MIEN);
		const { container } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();

		expect(dialog()?.textContent).toContain('Tes 2 objets et ta grille seront remplacés.');
		expect(dialog()?.textContent).toContain(
			'Ton atelier est mis de côté : tu pourras le retrouver.'
		);
		// Rien n'a encore changé
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
	});

	it('renoncer ne change rien', async () => {
		saveAtelier(localStorage, MIEN);
		const { container } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Renoncer')!.click();
		await settle();

		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toBe('empty');
		expect(container.querySelector('.bandeau')).not.toBeNull();
	});

	it('R3 : confirmé, l’atelier reçu devient le mien, l’ancien est mis de côté, le lien est quitté', async () => {
		saveAtelier(localStorage, MIEN);
		const { container, atelier, onLinkLeft } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Remplacer')!.click();
		await settle();

		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['g']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(atelier.names).toEqual(['g']);
		expect(count(container)).toBe('1 objet');
		// Plus en mode éphémère : ni bandeau ni Garder, la barre complète
		expect(container.querySelector('.bandeau')).toBeNull();
		expect(buttonNamed(container, 'Garder dans mon atelier')).toBeUndefined();
		expect(buttonNamed(toolbar(container), 'Charger un atelier')).toBeDefined();
		expect(buttonNamed(toolbar(container), 'Partager')).toBeDefined();
		expect(onLinkLeft).toHaveBeenCalledOnce();
		// Le bouton Remplacer a disparu : le focus va à « Mes objets », pas sur la page
		await vi.waitFor(() => expect(document.activeElement?.id).toBe('atelier-mes-objets'));
	});

	it('B4 : l’avis dit que l’atelier est mis de côté, et propose de le retrouver — la barre aussi', async () => {
		saveAtelier(localStorage, MIEN);
		const { container } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Remplacer')!.click();
		await settle();

		expect(notices(container).getAttribute('aria-live')).toBe('polite');
		expect(notices(container).textContent).toContain('Ton atelier précédent est mis de côté.');
		expect(buttonNamed(notices(container), 'Retrouver mon atelier précédent')).toBeDefined();
		expect(buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')).toBeDefined();
	});

	it('un Ctrl+Z rend l’atelier d’avant (une étape annulable)', async () => {
		saveAtelier(localStorage, MIEN);
		const { container, atelier } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Remplacer')!.click();
		await settle();
		expect(buttonNamed(toolbar(container), 'Annuler : remplacer mon atelier')).toBeDefined();

		document.body.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
		);
		await settle();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(count(container)).toBe('2 objets');
		// Rien n'est perdu : c'est le reçu qui est désormais de côté (B3), et l'atelier
		// rendu est rangé AUSSITÔT — pas 500 ms plus tard, la copie déjà réécrite (revue)
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['g']);
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
	});

	it('B1 : atelier personnel vide, ni confirmation ni copie', async () => {
		const { container, atelier } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();

		expect(dialog()).toBeNull();
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['g']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toBe('empty');
		expect(atelier.names).toEqual(['g']);
		expect(buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')).toBeUndefined();
		expect(container.querySelector('.bandeau')).toBeNull();
	});

	it('R4 : la console de l’élève est gardée — c’est la sienne qui revient', async () => {
		saveAtelier(localStorage, MIEN);
		const desk = new CalcDesk(new Atelier());
		desk.submit('2+3');
		saveCalcHistory(localStorage, desk.entries, desk.typedInputs);
		const { container } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Remplacer')!.click();
		await settle();

		const lines = [...container.querySelectorAll('.historique > li')];
		expect(lines.length).toBe(1);
		expect(lines[0].textContent).toContain('2+3');
	});

	it('B5 : la copie ne s’écrit pas (stockage plein) → refus, rien ne change', async () => {
		saveAtelier(localStorage, MIEN);
		const { container, atelier } = await openReceived();
		const real = Storage.prototype.setItem;
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
			this: Storage,
			key: string,
			value: string
		) {
			if (key === SET_ASIDE_STORAGE_KEY) throw new DOMException('quota', 'QuotaExceededError');
			real.call(this, key, value);
		});

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();
		dialogButton('Remplacer')!.click();
		await settle();

		expect(notices(container).textContent).toContain('rien n’a été remplacé');
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(atelier.names).toEqual(['g']);
		// Toujours sur le lien reçu
		expect(container.querySelector('.bandeau')).not.toBeNull();
	});

	it('B6 : un atelier personnel plus récent n’est pas remplacé, comme la fusion', async () => {
		const newer = JSON.stringify({ version: ATELIER_STATE_VERSION + 1, objects: [] });
		localStorage.setItem(ATELIER_STORAGE_KEY, newer);
		const { container } = await openReceived();

		buttonNamed(container, 'Remplacer mon atelier')!.click();
		await settle();

		expect(dialog()).toBeNull();
		expect(notices(container).textContent).toContain('ne peut pas être ouvert ici');
		expect(localStorage.getItem(ATELIER_STORAGE_KEY)).toBe(newer);
	});
});

// =============================================================================
// Retrouver mon atelier précédent
// =============================================================================

describe('retrouver mon atelier précédent', () => {
	it('B4 : absent de la barre sans copie', async () => {
		const { container } = await render(AtelierContainer, { atelier: new Atelier() });

		expect(buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')).toBeUndefined();
	});

	it('B3 : ÉCHANGE — la copie revient, l’atelier quitté est mis de côté, annulable', async () => {
		saveAtelier(localStorage, RECU);
		saveAtelier(localStorage, MIEN, SET_ASIDE_STORAGE_KEY);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		expect(atelier.names).toEqual(['g']);

		buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')!.click();
		await settle();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(count(container)).toBe('2 objets');
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['g']);
		expect(notices(container).textContent).toContain('Ton atelier précédent est revenu');
		// Une étape : Annuler revient, et la copie suit (rien n'est perdu)
		buttonNamed(toolbar(container), 'Annuler : retrouver mon atelier précédent')!.click();
		await settle();
		expect(atelier.names).toEqual(['g']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(stored(ATELIER_STORAGE_KEY)).toEqual(['g']);
	});

	it('B7 : une copie abîmée est oubliée, avec un message, et le bouton disparaît', async () => {
		saveAtelier(localStorage, RECU);
		localStorage.setItem(SET_ASIDE_STORAGE_KEY, '{abîmé');
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });

		buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')!.click();
		await settle();

		expect(notices(container).textContent).toContain('abîmé');
		expect(atelier.names).toEqual(['g']);
		expect(localStorage.getItem(SET_ASIDE_STORAGE_KEY)).toBeNull();
		expect(buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')).toBeUndefined();
	});

	it('B7 : la copie est relue avec les migrations — un y d’avant la géométrie est renommé, et dit', async () => {
		saveAtelier(localStorage, RECU);
		localStorage.setItem(
			SET_ASIDE_STORAGE_KEY,
			JSON.stringify({ version: 2, objects: [{ name: 'y', kind: 'value', definition: '5' }] })
		);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });

		buttonNamed(toolbar(container), 'Retrouver mon atelier précédent')!.click();
		await settle();

		expect(atelier.names).toEqual(['a']);
		expect(notices(container).textContent).toContain('ton objet s’appelle maintenant a');
	});
});

// =============================================================================
// Charger (R5, B8)
// =============================================================================

describe('charger met aussi l’atelier de côté', () => {
	function atelierFile(build: (atelier: Atelier) => void): File {
		const atelier = new Atelier();
		build(atelier);
		const text = atelierFileToJson(atelier.serialize(), [], [], new Date());
		return new File([text], 'atelier.atelier.json', { type: 'application/json' });
	}

	async function choose(container: HTMLElement, file: File) {
		const input = toolbar(container).querySelector('input[type="file"]') as HTMLInputElement;
		const transfer = new DataTransfer();
		transfer.items.add(file);
		input.files = transfer.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await settle();
	}

	it('B8 : la confirmation rassure, et l’atelier remplacé se retrouve', async () => {
		saveAtelier(localStorage, MIEN);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });

		await choose(
			container,
			atelierFile((a) => a.create({ kind: 'function', name: 'h', definition: 'x+1' }, 'text'))
		);
		expect(dialog()?.textContent).toContain(
			'Ton atelier est mis de côté : tu pourras le retrouver.'
		);
		dialogButton('Charger')!.click();
		await settle();

		expect(atelier.names).toEqual(['h']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(buttonNamed(notices(container), 'Retrouver mon atelier précédent')).toBeDefined();

		buttonNamed(notices(container), 'Retrouver mon atelier précédent')!.click();
		await settle();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(stored(SET_ASIDE_STORAGE_KEY)).toEqual(['h']);
	});

	it('B5 : l’atelier ne peut pas être mis de côté → rien n’est chargé', async () => {
		saveAtelier(localStorage, MIEN);
		const atelier = new Atelier();
		const { container } = await render(AtelierContainer, { atelier });
		const real = Storage.prototype.setItem;
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
			this: Storage,
			key: string,
			value: string
		) {
			if (key === SET_ASIDE_STORAGE_KEY) throw new DOMException('quota', 'QuotaExceededError');
			real.call(this, key, value);
		});

		await choose(
			container,
			atelierFile((a) => a.create({ kind: 'function', name: 'h', definition: 'x+1' }, 'text'))
		);
		dialogButton('Charger')!.click();
		await settle();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(notices(container).textContent).toContain('rien n’a été chargé');
	});
});
