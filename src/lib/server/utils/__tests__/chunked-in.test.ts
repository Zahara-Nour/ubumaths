/**
 * Tests pour `src/lib/server/utils/chunked-in.ts`.
 *
 * ⚠️ Pourquoi ce helper existe
 *
 * PostgREST met toute la liste d'un `.in()` dans l'URL. Mesuré en production le
 * 2026-09-15 : 185 points actifs en 2ᵈᵉ = ≈ 6 845 octets (37 par UUID), contre
 * une limite usuelle de 8 Ko pour une ligne de requête HTTP. Au-delà, ce n'est
 * pas une lenteur mais un **414 URI Too Long** — donc un écran cassé.
 *
 * Les listes de templates sont pires : elles grossissent avec l'usage d'une
 * classe, sans borne.
 */

import { describe, it, expect, vi } from 'vitest';
import { chunk, fetchInChunks, IN_CHUNK_SIZE } from '../chunked-in';

// =============================================================================
// chunk
// =============================================================================

describe('chunk', () => {
	it('CH1 — découpe en lots de taille au plus `size`', () => {
		const batches = chunk(
			Array.from({ length: 250 }, (_, i) => i),
			100
		);
		expect(batches.map((b) => b.length)).toEqual([100, 100, 50]);
	});

	it('CH2 — ne perd ni ne duplique aucun élément', () => {
		const items = Array.from({ length: 173 }, (_, i) => `id-${i}`);
		expect(chunk(items, 100).flat()).toEqual(items);
	});

	it('CH3 — liste vide → aucun lot (donc aucune requête)', () => {
		expect(chunk([], 100)).toEqual([]);
	});

	it('CH4 — liste plus courte que la taille → un seul lot', () => {
		expect(chunk(['a', 'b'], 100)).toEqual([['a', 'b']]);
	});
});

// =============================================================================
// fetchInChunks
// =============================================================================

describe('fetchInChunks', () => {
	it('FC1 — une seule requête tant que la liste tient dans un lot', async () => {
		const runBatch = vi.fn().mockResolvedValue({ data: [{ v: 1 }], error: null });
		const result = await fetchInChunks(['a', 'b', 'c'], runBatch);

		expect(runBatch).toHaveBeenCalledTimes(1);
		expect(runBatch).toHaveBeenCalledWith(['a', 'b', 'c']);
		expect(result.data).toEqual([{ v: 1 }]);
		expect(result.error).toBeNull();
	});

	it('FC2 — aucune requête sur une liste vide', async () => {
		const runBatch = vi.fn();
		const result = await fetchInChunks([], runBatch);

		expect(runBatch).not.toHaveBeenCalled();
		expect(result.data).toEqual([]);
		expect(result.error).toBeNull();
	});

	it('FC3 — plusieurs lots, résultats concaténés dans l’ordre', async () => {
		const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
		// Chaque lot rend une ligne par identifiant demandé : un découpage qui
		// perdrait un lot en route se verrait tout de suite.
		const runBatch = vi
			.fn()
			.mockImplementation((batch: string[]) =>
				Promise.resolve({ data: batch.map((id) => ({ id })), error: null })
			);

		const result = await fetchInChunks(ids, runBatch);

		expect(runBatch).toHaveBeenCalledTimes(3);
		expect(result.data.map((r) => r.id)).toEqual(ids);
	});

	it('FC4 — aucun lot ne dépasse IN_CHUNK_SIZE par défaut', async () => {
		const sizes: number[] = [];
		const runBatch = vi.fn().mockImplementation((batch: string[]) => {
			sizes.push(batch.length);
			return Promise.resolve({ data: [], error: null });
		});

		await fetchInChunks(
			Array.from({ length: 450 }, (_, i) => `id-${i}`),
			runBatch
		);

		for (const size of sizes) expect(size).toBeLessThanOrEqual(IN_CHUNK_SIZE);
	});

	it('FC5 — un lot en échec rend l’erreur et AUCUNE donnée', async () => {
		// Un résultat partiel serait pire qu'une erreur : l'appelant croirait
		// avoir tout lu et afficherait des compteurs faux, sans rien signaler.
		const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
		const runBatch = vi
			.fn()
			.mockImplementation((batch: string[]) =>
				Promise.resolve(
					batch.includes('id-200')
						? { data: null, error: { message: 'timeout' } }
						: { data: batch.map((id) => ({ id })), error: null }
				)
			);

		const result = await fetchInChunks(ids, runBatch);

		expect(result.error).toEqual({ message: 'timeout' });
		expect(result.data).toEqual([]);
	});

	it('FC6 — `data` null sans erreur est traité comme un lot vide', async () => {
		const runBatch = vi.fn().mockResolvedValue({ data: null, error: null });
		const result = await fetchInChunks(['a'], runBatch);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});

	it('FC7 — les lots partent en parallèle, pas en série', async () => {
		// Le découpage ne doit pas transformer un aller-retour en une file
		// d'attente : c'est ce qui rendrait la page plus lente qu'avant.
		let enCours = 0;
		let maxSimultane = 0;
		const runBatch = vi.fn().mockImplementation(async () => {
			enCours += 1;
			maxSimultane = Math.max(maxSimultane, enCours);
			await Promise.resolve();
			enCours -= 1;
			return { data: [], error: null };
		});

		await fetchInChunks(
			Array.from({ length: 250 }, (_, i) => `id-${i}`),
			runBatch
		);

		expect(maxSimultane).toBeGreaterThan(1);
	});
});
