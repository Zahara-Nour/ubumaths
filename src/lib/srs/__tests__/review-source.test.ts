/**
 * Source d'une séance de révision : paquet (deck) ou paquet calculé d'un chapitre
 * ==============================================================================
 *
 * Un même écran de séance pour les deux. Avant, l'écran lisait `card.card.id` /
 * `card.card.cardType` alors que `GET /api/srs/review/due` rend des cartes
 * PLATES (`cardId`, `cardType`) : chaque carte d'un paquet faisait planter
 * l'écran. La traduction est désormais testée pour les deux formes.
 */
import { describe, it, expect } from 'vitest';
import {
	dueUrl,
	submitRequest,
	toSessionPayload,
	type ReviewSource,
	type SessionCard
} from '../review-source';
import type { ChapterDueResponse, DueCardsResponse, DueReviewCardStats } from '../types';
import type { QuestionInstance } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark/types/template';

const deck: ReviewSource = { kind: 'deck', deckId: 'd1', states: 'review', all: true };
const chapter: ReviewSource = { kind: 'chapter', chapterId: 'c1' };
/** Instance factice : seule sa forme d'objet compte pour la traduction. */
const instance = { id: 'i1', statement: '1+1' } as unknown as QuestionInstance;
const stats: DueReviewCardStats = {
	state: 'new',
	difficulty: 5,
	stability: 0,
	totalReviews: 0,
	lastReview: null,
	nextReview: '2026-10-03T00:00:00Z'
};

describe('dueUrl', () => {
	it('paquet : deck, filtre d’états et révision forcée', () => {
		expect(dueUrl(deck)).toBe('/api/srs/review/due?deck_id=d1&states=review&all=true');
		expect(dueUrl({ kind: 'deck', deckId: 'd1' })).toBe('/api/srs/review/due?deck_id=d1');
	});

	it('chapitre : route du paquet calculé', () => {
		expect(dueUrl(chapter)).toBe('/api/srs/chapters/c1/due');
	});
});

describe('submitRequest', () => {
	const card: SessionCard = { key: 'k1', kind: 'template', instance };

	it('paquet : carte et deck', () => {
		expect(submitRequest(deck, card, 3, 12)).toEqual({
			url: '/api/srs/review/submit',
			body: { cardId: 'k1', deckId: 'd1', grade: 3, timeSpent: 12 }
		});
	});

	it('chapitre : le modèle, jamais une carte', () => {
		expect(submitRequest(chapter, card, 4, 5)).toEqual({
			url: '/api/srs/chapters/c1/submit',
			body: { templateId: 'k1', grade: 4, timeSpent: 5 }
		});
	});
});

describe('toSessionPayload', () => {
	it('paquet : cartes PLATES du serveur (modèle et carte libre)', () => {
		const response: DueCardsResponse = {
			cards: [
				{ cardId: 'c-t', cardType: 'template', templateId: 't', instance, stats },
				{
					cardId: 'c-c',
					cardType: 'custom',
					frontContent: templateMarkdown('Q'),
					backContent: templateMarkdown('R'),
					stats
				}
			],
			skipped: 1
		};
		const payload = toSessionPayload(deck, response);
		expect(payload.skipped).toBe(1);
		expect(payload.cards).toEqual([
			{ key: 'c-t', kind: 'template', instance },
			{ key: 'c-c', kind: 'custom', frontContent: 'Q', backContent: 'R' }
		]);
	});

	it('chapitre : la clé est le modèle', () => {
		const response: ChapterDueResponse = {
			chapter: { id: 'c1', title: 'Fonctions' },
			cards: [{ templateId: 't1', instance, isNew: true }],
			skipped: 0
		};
		const payload = toSessionPayload(chapter, response);
		expect(payload).toEqual({ cards: [{ key: 't1', kind: 'template', instance }], skipped: 0 });
	});

	it('carte mal formée : écartée et comptée, pas de plantage', () => {
		const payload = toSessionPayload(chapter, { cards: [{ templateId: 't1' }, 42] });
		expect(payload).toEqual({ cards: [], skipped: 2 });
		expect(toSessionPayload(deck, null)).toEqual({ cards: [], skipped: 0 });
	});
});
