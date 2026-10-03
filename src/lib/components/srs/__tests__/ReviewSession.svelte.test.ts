/**
 * Écran de séance : une panne ou des cartes toutes écartées ne félicitent pas
 * ===========================================================================
 *
 * Avant : un `due` en erreur (500, 404) ou une séance dont toutes les cartes
 * avaient été écartées tombait sur l'état vide — « Félicitations ! Toutes vos
 * cartes sont à jour. » L'élève croyait avoir fini alors que rien n'avait été
 * chargé.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ReviewSession from '../ReviewSession.svelte';

const source = { kind: 'chapter', chapterId: 'c1' } as const;
const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

function respond(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ReviewSession — états de chargement', () => {
	it('rien à revoir : l’état vide, avec son titre', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => respond(200, { cards: [], skipped: 0 }))
		);
		const { container } = await render(ReviewSession, {
			source,
			emptyTitle: "Rien à revoir aujourd'hui"
		});
		await expect.poll(() => texte(container)).toContain("Rien à revoir aujourd'hui");
	});

	for (const status of [500, 404]) {
		it(`panne du chargement (${status}) : message d’erreur et « Réessayer », pas de félicitations`, async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(respond(status, { error: 'x' }))
				.mockResolvedValueOnce(respond(200, { cards: [], skipped: 0 }));
			vi.stubGlobal('fetch', fetchMock);
			const { container } = await render(ReviewSession, {
				source,
				emptyTitle: "Rien à revoir aujourd'hui"
			});

			await expect.poll(() => texte(container)).toContain('Impossible de charger');
			expect(texte(container)).not.toContain('Félicitations');
			expect(texte(container)).not.toContain("Rien à revoir aujourd'hui");

			await page.getByRole('button', { name: 'Réessayer' }).click();
			await expect.poll(() => texte(container)).toContain("Rien à revoir aujourd'hui");
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
	}

	it('toutes les cartes écartées : on le dit, pas de félicitations', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => respond(200, { cards: [], skipped: 3 }))
		);
		const { container } = await render(ReviewSession, {
			source,
			emptyTitle: "Rien à revoir aujourd'hui"
		});
		await expect.poll(() => texte(container)).toContain("n'ont pas pu être affichées");
		expect(texte(container)).not.toContain('Félicitations');
		expect(texte(container)).not.toContain("Rien à revoir aujourd'hui");
	});
});
