/**
 * `changeTemplatesStatus` — appel par paquets depuis la page admin
 *
 * Tout publier (640 modèles × 50 tirages par variation) en une requête dépasserait
 * le délai d'une fonction : la page envoie des paquets de 50 et agrège. Si un
 * paquet échoue, ce qui est déjà passé doit rester dans le compte rendu.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BULK_CLIENT_CHUNK_SIZE, BulkStatusError, changeTemplatesStatus } from '../bulk-status';

const ids = Array.from(
	{ length: BULK_CLIENT_CHUNK_SIZE + 10 },
	(_, index) => `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`
);

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('changeTemplatesStatus', () => {
	it('envoie des paquets et agrège publiés et refus', async () => {
		const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
			const { ids: part } = JSON.parse(String(init.body)) as { ids: string[] };
			return jsonResponse({
				published: part.slice(1).map((id) => ({ id, title: 'ok' })),
				refused: [{ id: part[0], title: 'ko', reasons: ['aucune spec de test'] }]
			});
		});
		vi.stubGlobal('fetch', fetchMock);
		const progress: number[] = [];

		const summary = await changeTemplatesStatus(ids, 'published', (done) => progress.push(done));

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(summary.changed).toHaveLength(ids.length - 2);
		expect(summary.refused.map((entry) => entry.id)).toEqual([ids[0], ids[BULK_CLIENT_CHUNK_SIZE]]);
		expect(progress).toEqual([BULK_CLIENT_CHUNK_SIZE, ids.length]);
	});

	it('lit `unpublished` pour un retour en brouillon', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ unpublished: [{ id: ids[0], title: 'a' }], refused: [] }))
		);

		const summary = await changeTemplatesStatus([ids[0]], 'draft');

		expect(summary).toEqual({
			status: 'draft',
			changed: [{ id: ids[0], title: 'a' }],
			refused: []
		});
	});

	it('garde ce qui est déjà passé quand un paquet échoue', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ published: [{ id: ids[0], title: 'a' }], refused: [] }))
			.mockResolvedValueOnce(jsonResponse({ message: 'Impossible de lire les modèles' }, 500));
		vi.stubGlobal('fetch', fetchMock);

		const failure = await changeTemplatesStatus(ids, 'published').catch((err: unknown) => err);

		expect(failure).toBeInstanceOf(BulkStatusError);
		const bulkError = failure as BulkStatusError;
		expect(bulkError.message).toBe('Impossible de lire les modèles');
		expect(bulkError.partial.changed).toEqual([{ id: ids[0], title: 'a' }]);
	});

	it('met les rivaux d’une même catégorie dans le MÊME paquet (A en 10, B en 55)', async () => {
		const sixty = ids.slice(0, 60);
		const rivalA = sixty[10];
		const rivalB = sixty[55];
		const groupOf = (id: string) => (id === rivalA || id === rivalB ? 'rivaux' : id);
		const sentParts: string[][] = [];
		// Serveur simulé : refuse les modèles qui partagent une catégorie DANS le paquet reçu
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init: RequestInit) => {
				const { ids: part } = JSON.parse(String(init.body)) as { ids: string[] };
				sentParts.push(part);
				const clash = (id: string) =>
					part.filter((other) => groupOf(other) === groupOf(id)).length > 1;
				return jsonResponse({
					published: part.filter((id) => !clash(id)).map((id) => ({ id, title: id })),
					refused: part
						.filter(clash)
						.map((id) => ({ id, title: id, reasons: ['même catégorie dans la sélection'] }))
				});
			})
		);

		const summary = await changeTemplatesStatus(sixty, 'published', undefined, groupOf);

		expect(summary.refused.map((entry) => entry.id).sort()).toEqual([rivalA, rivalB].sort());
		expect(summary.changed).toHaveLength(58);
		// Chaque identifiant part une fois, aucun paquet ne dépasse la taille prévue
		expect(sentParts.flat().sort()).toEqual([...sixty].sort());
		expect(sentParts.every((part) => part.length <= BULK_CLIENT_CHUNK_SIZE)).toBe(true);
	});

	it('lève BulkStatusError avec le partiel quand le réseau tombe au 2e paquet', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(
					jsonResponse({ published: [{ id: ids[0], title: 'a' }], refused: [] })
				)
				.mockRejectedValueOnce(new TypeError('Failed to fetch'))
		);

		const failure = await changeTemplatesStatus(ids, 'published').catch((err: unknown) => err);

		expect(failure).toBeInstanceOf(BulkStatusError);
		expect((failure as BulkStatusError).partial.changed).toEqual([{ id: ids[0], title: 'a' }]);
	});

	it('lève BulkStatusError quand une réponse 200 est illisible', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('<html>passerelle</html>', { status: 200 }))
		);

		const failure = await changeTemplatesStatus([ids[0]], 'published').catch((err: unknown) => err);

		expect(failure).toBeInstanceOf(BulkStatusError);
		expect((failure as BulkStatusError).partial.changed).toEqual([]);
	});
});
