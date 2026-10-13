/**
 * T16 (décision de David, 2026-10-13) : le message de l'élève ne part chez HuggingFace
 * (États-Unis) que s'il existe au moins un extrait du corpus qu'il peut lire. Sans corpus,
 * la recherche ne peut rien rendre : inutile d'envoyer quoi que ce soit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const embedQuery = vi.fn<(query: string) => Promise<number[] | null>>();

vi.mock('../embeddings', () => ({
	getEmbeddingService: () => ({ embedQuery })
}));

import { hybridSearch } from '../search';

function clientWithChunks(chunks: { id: string }[]) {
	const rpc = vi.fn(async () => ({ data: [], error: null }));
	const limit = vi.fn(async () => ({ data: chunks, error: null }));
	const select = vi.fn(() => ({ limit }));
	const from = vi.fn(() => ({ select }));
	return { client: { from, rpc } as unknown as SupabaseClient, from, rpc };
}

describe('hybridSearch sans corpus lisible', () => {
	beforeEach(() => {
		embedQuery.mockReset();
		embedQuery.mockResolvedValue([0.1, 0.2]);
	});

	it("n'envoie pas le message de l'élève quand aucun extrait n'est lisible", async () => {
		const { client, from, rpc } = clientWithChunks([]);

		const results = await hybridSearch(client, 'Comment résoudre 2x + 3 = 7 ?');

		expect(results).toEqual([]);
		expect(from).toHaveBeenCalledWith('rag_chunks');
		expect(embedQuery).not.toHaveBeenCalled();
		expect(rpc).not.toHaveBeenCalled();
	});

	it('cherche quand au moins un extrait est lisible', async () => {
		const { client, rpc } = clientWithChunks([{ id: 'c1' }]);

		await hybridSearch(client, 'Comment résoudre 2x + 3 = 7 ?');

		expect(embedQuery).toHaveBeenCalledOnce();
		expect(rpc).toHaveBeenCalledWith('rag_hybrid_search', expect.anything());
	});

	it("n'envoie rien si la vérification du corpus échoue", async () => {
		const limit = vi.fn(async () => ({ data: null, error: { message: 'boom' } }));
		const client = {
			from: vi.fn(() => ({ select: vi.fn(() => ({ limit })) })),
			rpc: vi.fn()
		} as unknown as SupabaseClient;

		const results = await hybridSearch(client, 'Comment résoudre 2x + 3 = 7 ?');

		expect(results).toEqual([]);
		expect(embedQuery).not.toHaveBeenCalled();
	});
});
