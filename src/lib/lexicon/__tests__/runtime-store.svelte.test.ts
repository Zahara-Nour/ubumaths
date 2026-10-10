/**
 * Chargement des mots cliquables (ADR 0022, comportement 3) : un onglet ouvert
 * longtemps relit le dictionnaire, et l'admin peut forcer la relecture.
 */

import { describe, expect, it, vi } from 'vitest';
import type { MathTerm } from '$lib/dictionary/model';

const fetchDictionary = vi.fn<() => Promise<MathTerm[]>>();
vi.mock('$lib/dictionary/fetch-dictionary', () => ({ fetchDictionary: () => fetchDictionary() }));

const { lexiconRuntime, loadLexiconRuntime, refreshLexiconRuntime } = await import(
	'../runtime-store.svelte'
);

function entry(content: string): MathTerm {
	return {
		term: 'carré',
		tags: [],
		grade: 'CP',
		definitions: { items: [{ grade: 'CP', content }] }
	};
}

function definition(): string | undefined {
	return lexiconRuntime()?.lexiconCard(['carré'], 'CP')[0]?.definitions[0];
}

describe('runtime des mots cliquables', () => {
	it('charge une fois, relit après 5 minutes, et à la demande de l’admin', async () => {
		fetchDictionary.mockResolvedValueOnce([entry('v1')]);
		const start = Date.now();
		await loadLexiconRuntime(start);
		expect(definition()).toBe('v1');

		// Moins de 5 minutes : pas de nouvelle lecture
		await loadLexiconRuntime(start + 4 * 60_000);
		expect(fetchDictionary).toHaveBeenCalledTimes(1);

		// Au-delà : relu ; la version précédente reste affichée en attendant
		fetchDictionary.mockResolvedValueOnce([entry('v2')]);
		const reload = loadLexiconRuntime(start + 6 * 60_000);
		expect(definition()).toBe('v1');
		await reload;
		expect(definition()).toBe('v2');
		expect(fetchDictionary).toHaveBeenCalledTimes(2);

		// L'admin vient d'enregistrer : relu tout de suite
		fetchDictionary.mockResolvedValueOnce([entry('v3')]);
		await refreshLexiconRuntime();
		expect(definition()).toBe('v3');
	});

	it('un échec garde les mots déjà chargés et réessaie au prochain besoin', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		fetchDictionary.mockRejectedValueOnce(new Error('réseau'));
		await refreshLexiconRuntime();
		expect(definition()).toBe('v3');
		fetchDictionary.mockResolvedValueOnce([entry('v4')]);
		await loadLexiconRuntime();
		expect(definition()).toBe('v4');
	});
});
