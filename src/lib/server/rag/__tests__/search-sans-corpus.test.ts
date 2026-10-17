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

function clientWithChunks(
	chunks: { id: string }[] | null,
	error: { message: string } | null = null
) {
	const rpc = vi.fn(async () => ({ data: [], error: null }));
	const overlaps = vi.fn();
	const builder = {
		overlaps: overlaps.mockImplementation(() => builder),
		limit: vi.fn(async () => ({ data: chunks, error }))
	};
	const select = vi.fn(() => builder);
	const from = vi.fn(() => ({ select }));
	return { client: { from, rpc } as unknown as SupabaseClient, from, rpc, overlaps };
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
		const { client } = clientWithChunks(null, { message: 'boom' });

		const results = await hybridSearch(client, 'Comment résoudre 2x + 3 = 7 ?');

		expect(results).toEqual([]);
		expect(embedQuery).not.toHaveBeenCalled();
	});

	it('vérifie le corpus avec les filtres de niveau et de thème de la recherche', async () => {
		const { client, overlaps } = clientWithChunks([]);

		await hybridSearch(client, 'Comment résoudre 2x + 3 = 7 ?', {
			grade: '6',
			topics: ['equations']
		});

		expect(overlaps).toHaveBeenCalledWith('rag_documents.grades', ['6']);
		expect(overlaps).toHaveBeenCalledWith('rag_documents.topics', ['equations']);
		expect(embedQuery).not.toHaveBeenCalled();
	});
});
