/**
 * Classe retenue confrontée aux classes du prof (écart L34).
 *
 * `teacher_selected_class_id` (localStorage) peut désigner une classe
 * supprimée ou désactivée. Quand la liste des classes est connue,
 * `reconcileSelectedClass` remplace un identifiant inconnu par la
 * première classe, ou le vide s'il n'y a aucune classe.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const STORAGE_KEY = 'teacher_selected_class_id';

// localStorage minimal, en mémoire
function createStorage(initial: Record<string, string>) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
		data
	};
}

// Module neuf à chaque test : l'état du store est au niveau du module
async function loadStore(stored: string | null) {
	const storage = createStorage(stored ? { [STORAGE_KEY]: stored } : {});
	vi.stubGlobal('window', {});
	vi.stubGlobal('localStorage', storage);
	vi.resetModules();
	const store = await import('../selectedClass.svelte');
	return { store, storage };
}

describe('reconcileSelectedClass', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('classe retenue inconnue → première classe, persistée', async () => {
		const { store, storage } = await loadStore('classe-supprimee');
		store.reconcileSelectedClass(['class-a', 'class-b']);
		expect(store.getSelectedClassId()).toBe('class-a');
		expect(storage.data.get(STORAGE_KEY)).toBe('class-a');
	});

	it('classe retenue connue → inchangée', async () => {
		const { store } = await loadStore('class-b');
		store.reconcileSelectedClass(['class-a', 'class-b']);
		expect(store.getSelectedClassId()).toBe('class-b');
	});

	it('aucune classe retenue → première classe', async () => {
		const { store } = await loadStore(null);
		store.reconcileSelectedClass(['class-a']);
		expect(store.getSelectedClassId()).toBe('class-a');
	});

	it('aucune classe → sélection vidée, localStorage nettoyé', async () => {
		const { store, storage } = await loadStore('classe-supprimee');
		store.reconcileSelectedClass([]);
		expect(store.getSelectedClassId()).toBeNull();
		expect(storage.data.has(STORAGE_KEY)).toBe(false);
	});
});
