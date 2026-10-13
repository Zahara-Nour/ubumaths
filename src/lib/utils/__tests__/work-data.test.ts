/**
 * Données de travail d'élève dans le navigateur : jamais montrées à un autre compte
 * (T17 étendu, décision de David du 2026-10-13 : effacées à la déconnexion).
 */
import { describe, it, expect, vi } from 'vitest';
import {
	claimWorkData,
	clearWorkData,
	enforceWorkDataOwner,
	isWorkDataKey,
	watchWorkDataOwner
} from '../work-data';

class MemoryStorage implements Storage {
	private items = new Map<string, string>();
	get length() {
		return this.items.size;
	}
	clear() {
		this.items.clear();
	}
	getItem(key: string) {
		return this.items.get(key) ?? null;
	}
	key(index: number) {
		return [...this.items.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.items.delete(key);
	}
	setItem(key: string, value: string) {
		this.items.set(key, value);
	}
}

const OWNER = 'chiphre:work-data-owner';
const WORK = {
	'chiphre-python-playground': 'print("A")',
	'chiphre-calc-history': '[1]',
	minesweeper_game: '{}',
	game_player: '{"xp":3}',
	'chiphre-exercise-123': 'code',
	evoland_save_0: '{}',
	'chatHistory:eleve-a': '[]'
};
const PREFERENCES = {
	theme: 'dark',
	'chiphre-python-splitter': '50',
	teacher_selected_class_id: 'c1',
	chiphre_question_cart: '[]'
};

function storageWith(owner: string | null, entries: Record<string, string> = WORK) {
	const storage = new MemoryStorage();
	for (const [k, v] of Object.entries({ ...entries, ...PREFERENCES })) storage.setItem(k, v);
	if (owner !== null) storage.setItem(OWNER, owner);
	return storage;
}

function workKeysLeft(storage: Storage) {
	return Object.keys(WORK).filter((k) => storage.getItem(k) !== null);
}

function preferencesKept(storage: Storage) {
	return Object.entries(PREFERENCES).every(([k, v]) => storage.getItem(k) === v);
}

describe('claimWorkData', () => {
	it('même compte : rien ne change', () => {
		const storage = storageWith('eleve-a');
		expect(claimWorkData(storage, 'eleve-a')).toBe(false);
		expect(workKeysLeft(storage)).toEqual(Object.keys(WORK));
	});

	it('un autre compte arrive : les données du précédent sont effacées', () => {
		const storage = storageWith('eleve-a');
		expect(claimWorkData(storage, 'eleve-b')).toBe(true);
		expect(workKeysLeft(storage)).toEqual([]);
		expect(storage.getItem(OWNER)).toBe('eleve-b');
		expect(preferencesKept(storage)).toBe(true);
	});

	it('session expirée, un visiteur sans compte arrive : effacées aussi', () => {
		const storage = storageWith('eleve-a');
		expect(claimWorkData(storage, null)).toBe(true);
		expect(workKeysLeft(storage)).toEqual([]);
		expect(storage.getItem(OWNER)).toBe('anonymous');
	});

	it('un visiteur se connecte : son compte reprend son travail', () => {
		const storage = storageWith('anonymous');
		expect(claimWorkData(storage, 'eleve-a')).toBe(false);
		expect(workKeysLeft(storage)).toEqual(Object.keys(WORK));
		expect(storage.getItem(OWNER)).toBe('eleve-a');
	});

	it('propriétaire inconnu (données d’avant ce correctif) : effacées', () => {
		const storage = storageWith(null);
		expect(claimWorkData(storage, 'eleve-a')).toBe(true);
		expect(workKeysLeft(storage)).toEqual([]);
		expect(storage.getItem(OWNER)).toBe('eleve-a');
	});

	it('le propriétaire ne peut pas être écrit : l’effacement compte quand même', () => {
		const storage = storageWith('eleve-a');
		storage.setItem = () => {
			throw new Error('QuotaExceededError');
		};
		// Les modules ont déjà lu les données de A : sans rechargement, B les verrait.
		expect(claimWorkData(storage, 'eleve-b')).toBe(true);
		expect(workKeysLeft(storage)).toEqual([]);
	});

	it('propriétaire inconnu, rien à effacer : pas de rechargement', () => {
		const storage = storageWith(null, {});
		expect(claimWorkData(storage, null)).toBe(false);
		expect(storage.getItem(OWNER)).toBe('anonymous');
	});
});

describe('clearWorkData (déconnexion, suppression du compte)', () => {
	it('efface les données de travail et leur propriétaire, garde les préférences', () => {
		const storage = storageWith('eleve-a');
		expect(clearWorkData(storage)).toBe(Object.keys(WORK).length);
		expect(workKeysLeft(storage)).toEqual([]);
		expect(storage.getItem(OWNER)).toBeNull();
		expect(preferencesKept(storage)).toBe(true);
	});
});

describe('enforceWorkDataOwner (chargement de la page)', () => {
	it('recharge la page quand des données ont été effacées', () => {
		const reload = vi.fn();
		expect(enforceWorkDataOwner('eleve-b', storageWith('eleve-a'), reload)).toBe(true);
		expect(reload).toHaveBeenCalledOnce();
	});

	it('ne recharge pas quand rien n’a changé', () => {
		const reload = vi.fn();
		expect(enforceWorkDataOwner('eleve-a', storageWith('eleve-a'), reload)).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});

	it('un stockage inaccessible (navigation privée) ne bloque pas la page', () => {
		const reload = vi.fn();
		const broken = storageWith('eleve-a');
		broken.getItem = () => {
			throw new Error('SecurityError');
		};
		expect(enforceWorkDataOwner('eleve-b', broken, reload)).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});
});

describe('isWorkDataKey', () => {
	it('reconnaît les clés exactes et les préfixes, pas les préférences', () => {
		for (const key of Object.keys(WORK)) expect(isWorkDataKey(key)).toBe(true);
		for (const key of Object.keys(PREFERENCES)) expect(isWorkDataKey(key)).toBe(false);
		expect(isWorkDataKey(OWNER)).toBe(false);
	});
});

describe('watchWorkDataOwner (autre onglet)', () => {
	// `StorageEvent` n'existe pas sous Node : même forme, mêmes champs lus.
	function storageEvent(key: string | null, newValue: string | null) {
		return Object.assign(new Event('storage'), { key, newValue });
	}

	it('un autre compte prend l’appareil dans un autre onglet : cet onglet se recharge', () => {
		const target = new EventTarget();
		const reload = vi.fn();
		watchWorkDataOwner(target, () => 'eleve-a', reload);
		target.dispatchEvent(storageEvent('chiphre:work-data-owner', 'eleve-b'));
		expect(reload).toHaveBeenCalledOnce();
	});

	it('déconnexion dans un autre onglet (propriétaire retiré) : cet onglet se recharge', () => {
		const target = new EventTarget();
		const reload = vi.fn();
		watchWorkDataOwner(target, () => 'eleve-a', reload);
		target.dispatchEvent(storageEvent('chiphre:work-data-owner', null));
		expect(reload).toHaveBeenCalledOnce();
	});

	it('même propriétaire, ou autre clé : rien', () => {
		const target = new EventTarget();
		const reload = vi.fn();
		watchWorkDataOwner(target, () => 'eleve-a', reload);
		target.dispatchEvent(storageEvent('chiphre:work-data-owner', 'eleve-a'));
		target.dispatchEvent(storageEvent('theme', 'dark'));
		expect(reload).not.toHaveBeenCalled();
	});
});
