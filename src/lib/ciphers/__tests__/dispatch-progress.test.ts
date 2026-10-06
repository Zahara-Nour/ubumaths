import { describe, expect, it } from 'vitest';
import { PROGRESS_KEY, loadProgress, saveProgress } from '../dispatch-progress';

function memoryStorage(initial: Record<string, string> = {}) {
	const data = { ...initial };
	return {
		data,
		getItem: (key: string) => data[key] ?? null,
		setItem: (key: string, value: string) => {
			data[key] = value;
		}
	};
}

describe('progression des dépêches', () => {
	it('aller-retour : triée, sans doublon', () => {
		const storage = memoryStorage();
		saveProgress(storage, [3, 1, 2, 1]);
		expect(loadProgress(storage)).toEqual([1, 2, 3]);
	});

	it('rien d’enregistré → progression vide', () => {
		expect(loadProgress(memoryStorage())).toEqual([]);
	});

	it('valeur illisible ou hors bornes → progression vide, sans erreur', () => {
		expect(loadProgress(memoryStorage({ [PROGRESS_KEY]: '{pas du json' }))).toEqual([]);
		expect(loadProgress(memoryStorage({ [PROGRESS_KEY]: '[1, 42]' }))).toEqual([]);
		expect(loadProgress(memoryStorage({ [PROGRESS_KEY]: '"1"' }))).toEqual([]);
	});

	it('stockage absent ou qui refuse l’accès → aucune erreur', () => {
		const refusing = {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {
				throw new Error('QuotaExceededError');
			}
		};
		expect(loadProgress(refusing)).toEqual([]);
		expect(() => saveProgress(refusing, [1])).not.toThrow();
		expect(loadProgress(null)).toEqual([]);
		expect(() => saveProgress(null, [1])).not.toThrow();
	});
});
