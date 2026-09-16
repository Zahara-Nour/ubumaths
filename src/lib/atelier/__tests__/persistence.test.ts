/**
 * Persistance locale — comportements du §5.
 *
 * Le stockage est injecté : la logique se teste en node, sans navigateur, et
 * `null` représente le cas « stockage refusé » (navigation privée).
 */

import { describe, it, expect } from 'vitest';
import {
	ATELIER_STORAGE_KEY,
	ATELIER_STATE_VERSION,
	loadAtelier,
	saveAtelier
} from '../persistence';
import type { AtelierState } from '../persistence';

/** Un stockage de test, avec un plafond optionnel pour éprouver le quota. */
function fakeStorage(limit = Infinity): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		setItem: (k: string, v: string) => {
			if (v.length > limit) {
				const err = new Error('quota');
				err.name = 'QuotaExceededError';
				throw err;
			}
			map.set(k, v);
		}
	} as Storage;
}

const state: AtelierState = {
	version: ATELIER_STATE_VERSION,
	objects: [{ name: 'f', kind: 'function', definition: 'x^2' }]
};

describe('aller-retour', () => {
	// N1 — l'atelier est comme on l'a laissé
	it('rend ce qui a été rangé', () => {
		const s = fakeStorage();
		expect(saveAtelier(s, state).kind).toBe('saved');

		const out = loadAtelier(s);
		expect(out.kind).toBe('loaded');
		if (out.kind !== 'loaded') return;
		expect(out.state.objects).toEqual(state.objects);
	});

	it('rend « empty » quand rien n’a été rangé', () => {
		expect(loadAtelier(fakeStorage()).kind).toBe('empty');
	});
});

describe('cas limites', () => {
	// L1 — ne jamais perdre en silence
	it('signale le quota dépassé, sans rien jeter', () => {
		const s = fakeStorage(10);
		const out = saveAtelier(s, state);

		expect(out.kind).toBe('quota');
		if (out.kind !== 'quota') return;
		// La racine, pas la conjugaison : le message s'adresse à l'élève, donc
		// « exporte-le » plutôt que « exporter ».
		expect(out.message.toLowerCase()).toContain('export');
		// l'état précédent n'est pas détruit par une tentative ratée
		expect(s.getItem(ATELIER_STORAGE_KEY)).toBeNull();
	});

	// L2 — ne pas écraser un état plus récent
	it('refuse un état venu d’une version plus récente', () => {
		const s = fakeStorage();
		s.setItem(
			ATELIER_STORAGE_KEY,
			JSON.stringify({ version: ATELIER_STATE_VERSION + 1, objects: [] })
		);

		const out = loadAtelier(s);
		expect(out.kind).toBe('too-recent');
		if (out.kind !== 'too-recent') return;
		expect(out.version).toBe(ATELIER_STATE_VERSION + 1);
		// le contenu brut reste disponible pour être exporté
		expect(out.raw).toContain('objects');
	});

	it('ne réécrit jamais par-dessus un état plus récent', () => {
		const s = fakeStorage();
		const future = JSON.stringify({ version: ATELIER_STATE_VERSION + 1, objects: [] });
		s.setItem(ATELIER_STORAGE_KEY, future);

		expect(saveAtelier(s, state).kind).toBe('refused-newer');
		expect(s.getItem(ATELIER_STORAGE_KEY)).toBe(future);
	});

	// L3 — atelier vide et message, jamais d'écran blanc
	it('signale un état illisible sans jeter', () => {
		const s = fakeStorage();
		s.setItem(ATELIER_STORAGE_KEY, '{ pas du json');
		expect(loadAtelier(s).kind).toBe('corrupt');
	});

	it('signale un état de forme inattendue', () => {
		const s = fakeStorage();
		s.setItem(ATELIER_STORAGE_KEY, JSON.stringify({ version: 1, objects: 'pas un tableau' }));
		expect(loadAtelier(s).kind).toBe('corrupt');
	});

	// E1 — navigation privée : tout marche, mais rien n'est conservé
	it('se passe de stockage sans planter', () => {
		expect(loadAtelier(null).kind).toBe('unavailable');
		expect(saveAtelier(null, state).kind).toBe('unavailable');
	});

	it('survit à un stockage qui refuse la lecture', () => {
		const hostile = {
			getItem() {
				throw new Error('SecurityError');
			},
			setItem() {
				throw new Error('SecurityError');
			}
		} as unknown as Storage;

		expect(loadAtelier(hostile).kind).toBe('unavailable');
		expect(saveAtelier(hostile, state).kind).toBe('unavailable');
	});
});
