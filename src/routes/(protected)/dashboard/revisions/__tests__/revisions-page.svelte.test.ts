/**
 * « Mes révisions » : ce que l'élève LIT dans les compteurs.
 *
 * Régression : la page lisait `stats.due_cards` / `new_cards`, alors que le
 * serveur rend `due_count` / `new_count` (fonction `get_deck_stats`). Les
 * compteurs « À réviser » et « Nouvelles » valaient donc toujours 0. Les
 * données de ce test ont la forme exacte rendue par `+page.server.ts`.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { PageData } from '../$types';
import RevisionsPage from '../+page.svelte';

const goto = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({ goto })
);

type DeckRow = PageData['decks'][number];

function deck(id: string, name: string, isAssigned: boolean, stats: DeckRow['stats']): DeckRow {
	return {
		id,
		name,
		description: null,
		ownerId: '00000000-0000-4000-8000-000000000001',
		deckType: 'personal',
		isAssigned,
		isAutoManaged: false,
		config: {},
		createdAt: '2026-11-01T08:00:00Z',
		updatedAt: '2026-11-01T08:00:00Z',
		stats
	};
}

const DATA = {
	decks: [
		deck('00000000-0000-4000-8000-0000000000a1', 'Tables de multiplication', true, {
			total_cards: 20,
			due_count: 4,
			new_count: 6,
			learning_count: 2,
			review_count: 12
		}),
		deck('00000000-0000-4000-8000-0000000000a2', 'Fractions', false, {
			total_cards: 10,
			due_count: 3,
			new_count: 1,
			learning_count: 0,
			review_count: 9
		})
	],
	chapterDecks: [],
	chapterDecksUnavailable: false
} as unknown as PageData;

describe('Mes révisions : compteurs des paquets', () => {
	it('le total « À Réviser » additionne les cartes dues de chaque paquet', async () => {
		await render(RevisionsPage, { data: DATA });

		await expect.element(page.getByText('Commencez maintenant !')).toBeVisible();
		await expect.element(page.getByTestId('total-due')).toHaveTextContent('7');
	});

	it('chaque paquet affiche ses cartes à réviser et ses nouvelles', async () => {
		await render(RevisionsPage, { data: DATA });

		// Onglet « Tous » : une carte par paquet.
		const tables = page.getByTestId('deck-card-00000000-0000-4000-8000-0000000000a1').first();
		await expect.element(tables.getByTestId('deck-due')).toHaveTextContent('4');
		await expect.element(tables.getByTestId('deck-new')).toHaveTextContent('6');
		await expect.element(tables.getByTestId('deck-learning')).toHaveTextContent('2');
	});

	it('sans carte due, la page le dit', async () => {
		const data = {
			...DATA,
			decks: [
				deck('00000000-0000-4000-8000-0000000000a3', 'Vide', false, {
					total_cards: 5,
					due_count: 0,
					new_count: 0,
					learning_count: 0,
					review_count: 5
				})
			]
		} as unknown as PageData;
		await render(RevisionsPage, { data });

		await expect.element(page.getByText('Tout est à jour !')).toBeVisible();
		await expect.element(page.getByTestId('total-due')).toHaveTextContent('0');
	});
});
