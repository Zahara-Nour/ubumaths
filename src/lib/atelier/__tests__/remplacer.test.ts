/**
 * « Remplacer mon atelier » — modèle et stockage (phase 0
 * `docs/wip/atelier-remplacer-phase0.md`, R1-R5 et B1-B9, validée par David).
 *
 * - `Atelier.replaceWith` : tout l'état remplacé en UNE étape d'Annuler, la pile
 *   gardée (coordination avec le lot 5) ;
 * - `replace.ts` : la copie mise de côté (R3), écrite AVANT le remplacement, et
 *   les refus (B5, B6, B7).
 */

import { describe, it, expect, vi } from 'vitest';
import { Atelier } from '../atelier.svelte';
import {
	ATELIER_STATE_VERSION,
	ATELIER_STORAGE_KEY,
	SET_ASIDE_STORAGE_KEY,
	loadAtelier,
	saveAtelier,
	type AtelierState
} from '../persistence';
import {
	hasSetAside,
	isBlankAtelier,
	keepAside,
	readPersonal,
	readSetAside,
	replacePersonal,
	replacementLoss,
	swapWithSetAside
} from '../replace';

// =============================================================================
// Décor
// =============================================================================

/** Un stockage de test ; `failOn` fait jeter le quota sur une clé. */
function fakeStorage(failOn: string[] = []): Storage & { map: Map<string, string> } {
	const map = new Map<string, string>();
	return {
		map,
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		setItem: (k: string, v: string) => {
			if (failOn.includes(k)) throw new DOMException('quota', 'QuotaExceededError');
			map.set(k, v);
		}
	} as Storage & { map: Map<string, string> };
}

function stateOf(objects: AtelierState['objects'], grid?: AtelierState['grid']): AtelierState {
	return { version: ATELIER_STATE_VERSION, objects, ...(grid && { grid }) };
}

const MIEN = stateOf(
	[
		{ name: 'a', kind: 'value', definition: '5' },
		{ name: 'f', kind: 'function', definition: 'a*x' }
	],
	{ cells: { C1: '12' } }
);
const RECU = stateOf([{ name: 'g', kind: 'function', definition: 'x^3' }]);

const namesIn = (storage: Storage, key: string) => {
	const loaded = loadAtelier(storage, key);
	return loaded.kind === 'loaded' ? loaded.state.objects.map((o) => o.name) : loaded.kind;
};

// =============================================================================
// Atelier.replaceWith
// =============================================================================

describe('Atelier.replaceWith', () => {
	it('remplace objets et grille, en une seule étape qui porte son nom', () => {
		const atelier = new Atelier();
		atelier.restore(MIEN);

		atelier.replaceWith(RECU, 'remplacer mon atelier');

		expect(atelier.names).toEqual(['g']);
		expect(atelier.serialize().grid).toBeUndefined();
		expect(atelier.history.undo).toBe('remplacer mon atelier');
		expect(atelier.history.steps).toBe(1);
	});

	it('un Ctrl+Z rend l’atelier d’avant, Rétablir le remplacement', () => {
		const atelier = new Atelier();
		atelier.restore(MIEN);

		atelier.replaceWith(RECU, 'remplacer mon atelier');
		atelier.undo();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(atelier.cell(2, 1)).toBe('12');
		atelier.redo();
		expect(atelier.names).toEqual(['g']);
	});

	it('ne vide PAS la pile : les étapes d’avant restent annulables', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '5' }, 'text');

		atelier.replaceWith(RECU, 'remplacer mon atelier');
		atelier.undo();
		atelier.undo();

		expect(atelier.names).toEqual([]);
	});

	it('rend le rapport de la relecture : un y d’avant la géométrie renommé', () => {
		const atelier = new Atelier();

		const report = atelier.replaceWith(
			{ version: 2, objects: [{ name: 'y', kind: 'value', definition: '5' }] },
			'retrouver mon atelier précédent'
		);

		expect(report.renamed).toEqual([{ from: 'y', to: 'a' }]);
		expect(atelier.names).toEqual(['a']);
	});

	it('onLeave : Annuler et Rétablir disent quel atelier ils quittent', () => {
		const atelier = new Atelier();
		atelier.restore(MIEN);
		const onLeave = vi.fn();

		atelier.replaceWith(RECU, 'remplacer mon atelier', { onLeave });
		expect(onLeave).not.toHaveBeenCalled();

		atelier.undo();
		expect(onLeave).toHaveBeenLastCalledWith(
			expect.objectContaining({ objects: [expect.objectContaining({ name: 'g' })] })
		);
		atelier.redo();
		expect(onLeave.mock.lastCall?.[0].objects.map((o: { name: string }) => o.name)).toEqual([
			'a',
			'f'
		]);
	});

	it('onLeave ne suit QUE son étape', () => {
		const atelier = new Atelier();
		const onLeave = vi.fn();
		atelier.replaceWith(RECU, 'remplacer mon atelier', { onLeave });
		atelier.create({ kind: 'value', name: 'b', definition: '1' }, 'text');

		atelier.undo();

		expect(onLeave).not.toHaveBeenCalled();
	});
});

// =============================================================================
// Ce qui sera perdu (B1, B2)
// =============================================================================

describe('ce que le remplacement emporte', () => {
	it('B1 : un atelier sans objet ni grille est vide', () => {
		expect(isBlankAtelier(stateOf([]))).toBe(true);
		expect(isBlankAtelier(stateOf([], { cells: { A1: '1' } }))).toBe(false);
		expect(isBlankAtelier(RECU)).toBe(false);
	});

	it('B2 : la confirmation compte les objets et nomme la grille', () => {
		expect(replacementLoss(MIEN)).toBe('Tes 2 objets et ta grille seront remplacés.');
		expect(replacementLoss(RECU)).toBe('Ton objet sera remplacé.');
		expect(replacementLoss(stateOf([], { titles: { A: 'Notes' } }))).toBe(
			'Ta grille sera remplacée.'
		);
		expect(
			replacementLoss(
				stateOf([
					{ name: 'a', kind: 'value', definition: '1' },
					{ name: 'b', kind: 'value', definition: '2' },
					{ name: 'c', kind: 'value', definition: '3' }
				])
			)
		).toBe('Tes 3 objets seront remplacés.');
	});
});

// =============================================================================
// Remplacer l'atelier personnel (R3, B5, B6)
// =============================================================================

describe('remplacer l’atelier personnel', () => {
	it('R3 : l’atelier personnel est mis de côté, puis le reçu enregistré à sa place', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN);

		const done = replacePersonal(storage, RECU);

		expect(done).toEqual({ ok: true, previous: expect.objectContaining({ version: 4 }) });
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['g']);
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(hasSetAside(storage)).toBe(true);
	});

	it('une seule copie : un second remplacement écrase la première', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN);
		replacePersonal(storage, RECU);

		replacePersonal(storage, stateOf([{ name: 'h', kind: 'function', definition: '1' }]));

		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['g']);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['h']);
	});

	it('B1 : atelier personnel vide, rien n’est mis de côté — la copie d’avant reste', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN, SET_ASIDE_STORAGE_KEY);

		const done = replacePersonal(storage, RECU);

		expect(done).toEqual({ ok: true, previous: null });
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['g']);
	});

	it('B5 : la copie ne s’écrit pas (quota) → refus, rien ne change', () => {
		const storage = fakeStorage([SET_ASIDE_STORAGE_KEY]);
		saveAtelier(storage, MIEN);

		const done = replacePersonal(storage, RECU);

		expect(done.ok).toBe(false);
		expect(!done.ok && done.message).toMatch(/rien n’a été remplacé/);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
	});

	it('B5 : l’atelier reçu ne s’écrit pas → refus, et la copie d’avant revient', () => {
		const storage = fakeStorage();
		saveAtelier(
			storage,
			stateOf([{ name: 'k', kind: 'value', definition: '1' }]),
			SET_ASIDE_STORAGE_KEY
		);
		saveAtelier(storage, MIEN);
		const real = storage.setItem;
		storage.setItem = (k: string, v: string) => {
			if (k === ATELIER_STORAGE_KEY) throw new DOMException('quota', 'QuotaExceededError');
			real(k, v);
		};

		const done = replacePersonal(storage, RECU);

		expect(done.ok).toBe(false);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['k']);
	});

	it('B5 : sans stockage, refus', () => {
		const done = replacePersonal(null, RECU);

		expect(done.ok).toBe(false);
	});

	it('B6 : atelier personnel d’une version plus récente → refus, comme la fusion, rien écrasé', () => {
		const storage = fakeStorage();
		const newer = JSON.stringify({ version: ATELIER_STATE_VERSION + 1, objects: [] });
		storage.setItem(ATELIER_STORAGE_KEY, newer);

		const done = replacePersonal(storage, RECU);

		expect(done).toEqual({
			ok: false,
			message: 'Ton atelier enregistré ne peut pas être ouvert ici : rien n’a été remplacé.'
		});
		expect(storage.getItem(ATELIER_STORAGE_KEY)).toBe(newer);
		expect(hasSetAside(storage)).toBe(false);
	});

	it('B6 : atelier personnel abîmé → refus, rien écrasé', () => {
		const storage = fakeStorage();
		storage.setItem(ATELIER_STORAGE_KEY, '{abîmé');

		expect(readPersonal(storage).kind).toBe('refused');
		expect(replacePersonal(storage, RECU).ok).toBe(false);
		expect(storage.getItem(ATELIER_STORAGE_KEY)).toBe('{abîmé');
	});
});

// =============================================================================
// Retrouver mon atelier précédent (B3, B7)
// =============================================================================

describe('retrouver l’atelier mis de côté', () => {
	it('B3 : ÉCHANGE — la copie devient l’atelier, l’atelier courant devient la copie', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN, SET_ASIDE_STORAGE_KEY);
		saveAtelier(storage, RECU);

		const swapped = swapWithSetAside(storage, RECU);

		expect(swapped.kind).toBe('swapped');
		expect(swapped.kind === 'swapped' && swapped.state.objects.map((o) => o.name)).toEqual([
			'a',
			'f'
		]);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['g']);
	});

	it('B3 : un atelier courant vide ne laisse pas de copie vide derrière lui', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN, SET_ASIDE_STORAGE_KEY);

		swapWithSetAside(storage, stateOf([]));

		expect(hasSetAside(storage)).toBe(false);
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['a', 'f']);
	});

	it('B5 : l’échange ne s’écrit pas → refus, rien ne change', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN, SET_ASIDE_STORAGE_KEY);
		saveAtelier(storage, RECU);
		const real = storage.setItem;
		storage.setItem = (k: string, v: string) => {
			if (k === SET_ASIDE_STORAGE_KEY) throw new DOMException('quota', 'QuotaExceededError');
			real(k, v);
		};

		const swapped = swapWithSetAside(storage, RECU);

		expect(swapped.kind).toBe('refused');
		expect(namesIn(storage, ATELIER_STORAGE_KEY)).toEqual(['g']);
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['a', 'f']);
	});

	it('B7 : relue par Zod, objet abîmé écarté, les autres gardés', () => {
		const storage = fakeStorage();
		storage.setItem(
			SET_ASIDE_STORAGE_KEY,
			JSON.stringify({
				version: 4,
				objects: [
					{ name: 'a', kind: 'value', definition: '5' },
					{ name: '', kind: 'inconnu', definition: 3 }
				]
			})
		);

		const read = readSetAside(storage);

		expect(read).toEqual({ kind: 'loaded', state: expect.anything(), dropped: 1 });
		expect(read.kind === 'loaded' && read.state.objects.map((o) => o.name)).toEqual(['a']);
	});

	it('B7 : une copie illisible est oubliée, avec un message', () => {
		const storage = fakeStorage();
		storage.setItem(SET_ASIDE_STORAGE_KEY, '{abîmé');

		const read = readSetAside(storage);

		expect(read.kind).toBe('forgotten');
		expect(read.kind === 'forgotten' && read.message).toMatch(/abîmé|illisible/);
		expect(hasSetAside(storage)).toBe(false);
	});

	it('une copie d’une version plus récente n’est ni relue ni oubliée', () => {
		const storage = fakeStorage();
		const newer = JSON.stringify({ version: ATELIER_STATE_VERSION + 1, objects: [] });
		storage.setItem(SET_ASIDE_STORAGE_KEY, newer);

		expect(readSetAside(storage).kind).toBe('refused');
		expect(storage.getItem(SET_ASIDE_STORAGE_KEY)).toBe(newer);
	});

	it('keepAside : un atelier vide efface la copie au lieu d’en ranger une vide', () => {
		const storage = fakeStorage();
		saveAtelier(storage, MIEN, SET_ASIDE_STORAGE_KEY);

		expect(keepAside(storage, stateOf([]))).toEqual({ ok: true });
		expect(hasSetAside(storage)).toBe(false);
		expect(keepAside(storage, RECU)).toEqual({ ok: true });
		expect(namesIn(storage, SET_ASIDE_STORAGE_KEY)).toEqual(['g']);
	});
});
