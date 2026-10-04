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
	saveAtelier,
	readForeignWrite
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
				// Ce que jette un vrai navigateur : une DOMException, pas une Error.
				// Fabriquer une Error au nom choisi revenait à tester le code
				// contre lui-même.
				throw new DOMException('quota', 'QuotaExceededError');
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

// =============================================================================
// §5 L5 — reprendre un atelier venu du grapheur
// =============================================================================

describe('un autre onglet écrit', () => {
	/** Fabrique l'événement que le navigateur émet quand une AUTRE page écrit. */
	function storageEvent(key: string, newValue: string | null): StorageEvent {
		return { key, newValue } as StorageEvent;
	}

	it('reconnaît une écriture de l’atelier venue d’ailleurs', () => {
		const next = JSON.stringify({ version: ATELIER_STATE_VERSION, objects: [] });
		const out = readForeignWrite(storageEvent(ATELIER_STORAGE_KEY, next));

		expect(out.kind).toBe('changed');
		if (out.kind !== 'changed') return;
		expect(out.message.toLowerCase()).toContain('onglet');
	});

	it('ignore les écritures qui ne nous concernent pas', () => {
		expect(readForeignWrite(storageEvent('chiphre-calc-history', '[]')).kind).toBe('ignored');
		expect(readForeignWrite(storageEvent('chiphre-grapheur-state', '{}')).kind).toBe('ignored');
	});

	// Un autre onglet a vidé l'atelier : c'est une écriture comme une autre, et
	// elle mérite le même avertissement.
	it('reconnaît un effacement', () => {
		expect(readForeignWrite(storageEvent(ATELIER_STORAGE_KEY, null)).kind).toBe('cleared');
	});

	it('signale un contenu illisible sans jeter', () => {
		expect(readForeignWrite(storageEvent(ATELIER_STORAGE_KEY, '{ cassé')).kind).toBe('corrupt');
	});

	// ⚠️ Le dernier qui écrit gagne — on ne fusionne PAS. Mais on prévient, ce
	// que le grapheur ne fait pas aujourd'hui : deux onglets s'y écrasent en
	// silence.
	it('rend l’état reçu, pour que l’appelant puisse proposer de le reprendre', () => {
		const next = JSON.stringify({
			version: ATELIER_STATE_VERSION,
			objects: [{ name: 'f', kind: 'function', definition: 'x^2' }]
		});
		const out = readForeignWrite(storageEvent(ATELIER_STORAGE_KEY, next));

		expect(out.kind).toBe('changed');
		if (out.kind !== 'changed') return;
		expect(out.state.objects).toHaveLength(1);
	});
});
