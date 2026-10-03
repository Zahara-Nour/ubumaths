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

const deck: ReviewSource = { kind: 'deck', deckId: 'd1', states: 'review', all: true };
const chapter: ReviewSource = { kind: 'chapter', chapterId: 'c1' };
const instance = { id: 'i1', statement: '1+1' };

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
	const card: SessionCard = { key: 'k1', kind: 'template', instance: instance as never };

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
		const payload = toSessionPayload(deck, {
			cards: [
				{ cardId: 'c-t', cardType: 'template', templateId: 't', instance, stats: {} },
				{ cardId: 'c-c', cardType: 'custom', frontContent: 'Q', backContent: 'R', stats: {} }
			],
			skipped: 1
		});
		expect(payload.skipped).toBe(1);
		expect(payload.cards).toEqual([
			{ key: 'c-t', kind: 'template', instance },
			{ key: 'c-c', kind: 'custom', frontContent: 'Q', backContent: 'R' }
		]);
	});

	it('chapitre : la clé est le modèle', () => {
		const payload = toSessionPayload(chapter, {
			chapter: { id: 'c1', title: 'Fonctions' },
			cards: [{ templateId: 't1', instance, isNew: true }],
			skipped: 0
		});
		expect(payload).toEqual({ cards: [{ key: 't1', kind: 'template', instance }], skipped: 0 });
	});

	it('carte mal formée : écartée et comptée, pas de plantage', () => {
		const payload = toSessionPayload(chapter, { cards: [{ templateId: 't1' }, 42] });
		expect(payload).toEqual({ cards: [], skipped: 2 });
		expect(toSessionPayload(deck, null)).toEqual({ cards: [], skipped: 0 });
	});
});
