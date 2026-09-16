/**
 * Le cycle de vie d'un atelier ouvert : charger, sauver, écouter les autres
 * onglets. §5 vu depuis l'usage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { openSession } from '../session';
import { saveAtelier, ATELIER_STORAGE_KEY, ATELIER_STATE_VERSION } from '../persistence';

function fakeStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => void map.set(k, v),
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear()
	} as Storage;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ouverture', () => {
	// N1 — l'atelier est comme on l'a laissé
	it('charge ce qui était rangé', () => {
		const storage = fakeStorage();
		saveAtelier(storage, {
			version: ATELIER_STATE_VERSION,
			objects: [{ name: 'f', kind: 'function', definition: 'x^2' }]
		});

		const atelier = new Atelier();
		const session = openSession(atelier, { storage });

		expect(atelier.names).toEqual(['f']);
		session.close();
	});

	it('s’ouvre vide quand rien n’était rangé', () => {
		const atelier = new Atelier();
		const session = openSession(atelier, { storage: fakeStorage() });

		expect(atelier.objects).toEqual([]);
		session.close();
	});

	// L3 — atelier vide et message, jamais d'écran blanc
	it('prévient sur un état illisible sans rien casser', () => {
		const storage = fakeStorage();
		storage.setItem(ATELIER_STORAGE_KEY, '{ cassé');

		const notices: string[] = [];
		const atelier = new Atelier();
		const session = openSession(atelier, { storage, onNotice: (n) => notices.push(n.message) });

		expect(atelier.objects).toEqual([]);
		expect(notices.join(' ')).toBeTruthy();
		session.close();
	});

	// Ce qu'une restauration n'a pas pu recréer doit être DIT
	it('signale les objets qu’il n’a pas pu restaurer', () => {
		const storage = fakeStorage();
		storage.setItem(
			ATELIER_STORAGE_KEY,
			JSON.stringify({
				version: ATELIER_STATE_VERSION,
				objects: [
					{ name: 'f', kind: 'function', definition: 'x^2' },
					{ name: 'x', kind: 'value', definition: '1' }
				]
			})
		);

		const notices: string[] = [];
		const atelier = new Atelier();
		const session = openSession(atelier, { storage, onNotice: (n) => notices.push(n.message) });

		expect(atelier.names).toEqual(['f']);
		expect(notices.join(' ')).toContain('x');
		session.close();
	});
});

describe('sauvegarde', () => {
	// N2 — sauvegarde différée, pas à chaque frappe
	it('ne sauve pas immédiatement, puis sauve', () => {
		const storage = fakeStorage();
		const atelier = new Atelier();
		const session = openSession(atelier, { storage });

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		session.touch();
		expect(storage.getItem(ATELIER_STORAGE_KEY)).toBeNull();

		vi.advanceTimersByTime(600);
		expect(storage.getItem(ATELIER_STORAGE_KEY)).toContain('x^2');
		session.close();
	});

	it('ne garde qu’une sauvegarde pour une rafale de modifications', () => {
		const storage = fakeStorage();
		const atelier = new Atelier();
		const spy = vi.spyOn(storage, 'setItem');
		const session = openSession(atelier, { storage });

		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		session.touch();
		session.touch();
		session.touch();
		vi.advanceTimersByTime(600);

		expect(spy).toHaveBeenCalledTimes(1);
		session.close();
	});

	// L1 — le quota ne se perd pas en silence
	it('prévient quand il n’y a plus de place', () => {
		const storage = fakeStorage();
		vi.spyOn(storage, 'setItem').mockImplementation(() => {
			throw new DOMException('plein', 'QuotaExceededError');
		});

		const notices: string[] = [];
		const atelier = new Atelier();
		const session = openSession(atelier, { storage, onNotice: (n) => notices.push(n.message) });

		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		session.touch();
		vi.advanceTimersByTime(600);

		expect(notices.join(' ').toLowerCase()).toContain('export');
		session.close();
	});

	// ⚠️ Ce test disait « ne sauve plus après avoir été fermée » et gravait une
	// perte : l'élève supprime un objet, clique un lien dans la demi-seconde, et
	// son geste disparaît. Fermer doit RANGER ce qui attend, pas le jeter.
	it('range ce qui attendait avant de fermer', () => {
		const storage = fakeStorage();
		const atelier = new Atelier();
		const session = openSession(atelier, { storage });

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		session.touch();
		session.close();

		expect(storage.getItem(ATELIER_STORAGE_KEY)).toContain('x^2');
	});

	it('ne sauve plus rien APRÈS la fermeture', () => {
		const storage = fakeStorage();
		const atelier = new Atelier();
		const session = openSession(atelier, { storage });
		session.close();

		atelier.create({ kind: 'function', name: 'g', definition: 'x^3' });
		session.touch();
		vi.advanceTimersByTime(600);

		expect(storage.getItem(ATELIER_STORAGE_KEY) ?? '').not.toContain('x^3');
	});

	// La fermeture d'onglet est le dernier moment fiable pour ranger — et
	// `beforeunload` ne se déclenche pas sur iOS.
	it('range quand l’onglet part', () => {
		const storage = fakeStorage();
		const listeners = new Map<string, (e: Event) => void>();
		const target = {
			addEventListener: (type: string, fn: (e: Event) => void) => listeners.set(type, fn),
			removeEventListener: () => {}
		} as unknown as Window;

		const atelier = new Atelier();
		const session = openSession(atelier, { storage, target });

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		session.touch();
		listeners.get('pagehide')?.(new Event('pagehide'));

		expect(storage.getItem(ATELIER_STORAGE_KEY)).toContain('x^2');
		session.close();
	});
});

describe('un autre onglet', () => {
	// L4 — le dernier qui écrit gagne, mais on prévient
	it('prévient quand un autre onglet a écrit', () => {
		const storage = fakeStorage();
		const listeners: ((e: StorageEvent) => void)[] = [];
		const target = {
			addEventListener: (_: string, fn: (e: StorageEvent) => void) => listeners.push(fn),
			removeEventListener: () => {}
		} as unknown as Window;

		const notices: string[] = [];
		const atelier = new Atelier();
		const session = openSession(atelier, {
			storage,
			target,
			onNotice: (n) => notices.push(n.message)
		});

		listeners[0]?.({
			key: ATELIER_STORAGE_KEY,
			newValue: JSON.stringify({ version: ATELIER_STATE_VERSION, objects: [] })
		} as StorageEvent);

		expect(notices.join(' ').toLowerCase()).toContain('onglet');
		// ⚠️ on prévient, on n'écrase PAS ce que l'élève a sous les yeux
		expect(atelier.objects).toEqual([]);
		session.close();
	});

	it('ignore les écritures des autres outils', () => {
		const storage = fakeStorage();
		const listeners: ((e: StorageEvent) => void)[] = [];
		const target = {
			addEventListener: (_: string, fn: (e: StorageEvent) => void) => listeners.push(fn),
			removeEventListener: () => {}
		} as unknown as Window;

		const notices: string[] = [];
		const session = openSession(new Atelier(), {
			storage,
			target,
			onNotice: (n) => notices.push(n.message)
		});

		listeners[0]?.({ key: 'chiphre-grapheur-state', newValue: '{}' } as StorageEvent);
		expect(notices).toEqual([]);
		session.close();
	});
});
