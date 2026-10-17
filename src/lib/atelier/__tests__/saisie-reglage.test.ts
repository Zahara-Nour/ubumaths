/**
 * Le réglage « Saisie dans Calcul », retenu dans ce navigateur.
 *
 * Phase 0 `docs/wip/atelier-reglages-phase0.md` (A, C) : « Texte » par défaut,
 * le choix gardé à part de l'atelier, un navigateur qui refuse le stockage
 * n'est pas une erreur.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_INPUT_MODE, INPUT_MODE_KEY, readInputMode, writeInputMode } from '../input-mode';

/** Un `Storage` minimal en mémoire. */
function memoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => void values.delete(key),
		setItem: (key, value) => void values.set(key, value)
	};
}

/** Un navigateur qui refuse tout accès (mode privé strict, quota). */
function hostileStorage(): Storage {
	const refuse = () => {
		throw new DOMException('refusé', 'SecurityError');
	};
	return {
		length: 0,
		clear: refuse,
		getItem: refuse,
		key: refuse,
		removeItem: refuse,
		setItem: refuse
	};
}

describe('le mode de saisie retenu', () => {
	it('« Texte » par défaut (décision de David, 2026-10-14)', () => {
		expect(DEFAULT_INPUT_MODE).toBe('text');
		expect(readInputMode(memoryStorage())).toBe('text');
		expect(readInputMode(null)).toBe('text');
	});

	it('le choix est retenu, à part de l’atelier', () => {
		const storage = memoryStorage();
		writeInputMode(storage, 'math');
		expect(INPUT_MODE_KEY).not.toBe('chiphre-atelier');
		expect(storage.getItem(INPUT_MODE_KEY)).toBe('math');
		expect(readInputMode(storage)).toBe('math');
	});

	it('une valeur inconnue redonne « Texte »', () => {
		const storage = memoryStorage();
		storage.setItem(INPUT_MODE_KEY, 'manuscrit');
		expect(readInputMode(storage)).toBe('text');
	});

	it('un navigateur qui refuse le stockage n’est pas une erreur', () => {
		expect(readInputMode(hostileStorage())).toBe('text');
		expect(() => writeInputMode(hostileStorage(), 'math')).not.toThrow();
	});
});
