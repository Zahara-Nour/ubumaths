/**
 * Annonce des nouveautés de la Chatterie (naissance, croissance, étoile).
 *
 * Spec validée par David le 2026-10-21 (docs/wip/mathoux-annonce-progress.md) :
 * naissance, croissance et étoile annoncées ; 3 au plus, puis « et N autres » ;
 * premier calcul d'un élève (mémoire vide) avec plusieurs Mathoux → une seule
 * phrase « N Mathoux t'attendent » ; seule une nouveauté ÉCRITE par ce calcul
 * est annoncée (jamais deux fois).
 */

import { describe, it, expect } from 'vitest';
import type { Mathou, MathouCollection, MathouMemory } from '../collection-logic';
import {
	mathouNews,
	newsItemPhrase,
	newsSummaryPhrase,
	moreNewsPhrase,
	MAX_NEWS_ITEMS,
	type MathouNews,
	type MathouNewsItem
} from '../news';
import { mathouxSummarySchema } from '../summary';

// Décor
function mathou(notionId: string, growth: Mathou['growth'], stars: string[] = []): Mathou {
	return {
		notionId,
		notionName: notionId,
		name: `Nom ${notionId}`,
		raceIndex: 2,
		growth,
		asleep: false,
		dueForRevision: false,
		trainingCategories: null,
		stars,
		workablePoints: 2,
		acquiredPoints: 1,
		byGrade: []
	};
}

function collectionOf(...mathoux: Mathou[]): MathouCollection {
	return {
		races: [{ branchId: 'b', branchName: 'Branche', raceIndex: 2, mathoux }],
		counts: { born: mathoux.length, napping: 0, toDiscover: 0 }
	};
}

function memoryOf(entries: Record<string, MathouMemory>): Map<string, MathouMemory> {
	return new Map(Object.entries(entries));
}

const ALL = (collection: MathouCollection) =>
	new Set(collection.races.flatMap((race) => race.mathoux.map((m) => m.notionId)));

describe('mathouNews', () => {
	it('naissance : un Mathou né sans ligne en mémoire', () => {
		const collection = collectionOf(mathou('n1', 'chaton'));
		const news = mathouNews(
			collection,
			memoryOf({ autre: { bestStage: 'matou', starredGrades: [] } }),
			ALL(collection)
		);
		expect(news).toEqual({
			firstVisit: false,
			total: 1,
			items: [
				{
					kind: 'birth',
					notionId: 'n1',
					name: 'Nom n1',
					raceIndex: 2,
					stage: 'chaton',
					newStars: []
				}
			]
		});
	});

	it('croissance : stade au-dessus de la mémoire', () => {
		const collection = collectionOf(mathou('n1', 'matou'));
		const news = mathouNews(
			collection,
			memoryOf({ n1: { bestStage: 'chaton', starredGrades: [] } }),
			ALL(collection)
		);
		expect(news.items).toEqual([
			expect.objectContaining({ kind: 'growth', notionId: 'n1', stage: 'matou' })
		]);
	});

	it('étoile : nouvelles étoiles seules, sans changement de stade', () => {
		const collection = collectionOf(mathou('n1', 'grand_matou', ['5', '4']));
		const news = mathouNews(
			collection,
			memoryOf({ n1: { bestStage: 'grand_matou', starredGrades: ['5'] } }),
			ALL(collection)
		);
		expect(news.items).toEqual([
			expect.objectContaining({ kind: 'star', notionId: 'n1', newStars: ['4'] })
		]);
	});

	it('croissance ET étoile sur le même Mathou : une seule nouveauté, la croissance, étoiles jointes', () => {
		const collection = collectionOf(mathou('n1', 'grand_matou', ['2']));
		const news = mathouNews(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: [] } }),
			ALL(collection)
		);
		expect(news.total).toBe(1);
		expect(news.items[0]).toMatchObject({ kind: 'growth', stage: 'grand_matou', newStars: ['2'] });
	});

	it('rien de nouveau : mémoire à jour → total 0', () => {
		const collection = collectionOf(mathou('n1', 'matou', ['5']));
		const news = mathouNews(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: ['5'] } }),
			ALL(collection)
		);
		expect(news).toEqual({ firstVisit: false, total: 0, items: [] });
	});

	it('une silhouette n’est jamais une nouveauté', () => {
		const collection = collectionOf(mathou('n1', 'a_decouvrir'));
		expect(mathouNews(collection, new Map(), ALL(collection)).total).toBe(0);
	});

	it('seul ce que CE calcul a écrit est annoncé (un autre calcul l’a déjà écrit → rien)', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'chaton'));
		const news = mathouNews(
			collection,
			memoryOf({ x: { bestStage: 'chaton', starredGrades: [] } }),
			new Set(['n2'])
		);
		expect(news.items.map((item) => item.notionId)).toEqual(['n2']);
	});

	it('ordre : naissances, puis croissances, puis étoiles ; 3 au plus, total complet', () => {
		const collection = collectionOf(
			mathou('etoile', 'grand_matou', ['5']),
			mathou('grandit', 'matou'),
			mathou('ne1', 'chaton'),
			mathou('ne2', 'chaton'),
			mathou('ne3', 'matou')
		);
		const news = mathouNews(
			collection,
			memoryOf({
				etoile: { bestStage: 'grand_matou', starredGrades: [] },
				grandit: { bestStage: 'chaton', starredGrades: [] }
			}),
			ALL(collection)
		);
		expect(MAX_NEWS_ITEMS).toBe(3);
		expect(news.total).toBe(5);
		expect(news.items.map((item) => item.notionId)).toEqual(['ne1', 'ne2', 'ne3']);
	});

	it('premier calcul : mémoire vide → firstVisit', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'matou'));
		const news = mathouNews(collection, new Map(), ALL(collection));
		expect(news.firstVisit).toBe(true);
		expect(news.total).toBe(2);
	});

	it('le résultat passe le schéma du résumé de l’endpoint', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'grand_matou', ['2']));
		const news = mathouNews(collection, new Map(), ALL(collection));
		const parsed = mathouxSummarySchema.safeParse({ born: 2, napping: 0, toDiscover: 0, news });
		expect(parsed.success).toBe(true);
	});
});

describe('phrases', () => {
	const item = (over: Partial<MathouNewsItem>): MathouNewsItem => ({
		kind: 'birth',
		notionId: 'n',
		name: 'Pile-Poil',
		raceIndex: 0,
		stage: 'chaton',
		newStars: [],
		...over
	});

	it('naissance d’un chaton', () => {
		expect(newsItemPhrase(item({}))).toBe('Un chaton est né à la Chatterie : Pile-Poil !');
	});

	it('naissance directement au stade matou ou grand matou', () => {
		expect(newsItemPhrase(item({ stage: 'matou' }))).toBe(
			'Un matou est arrivé à la Chatterie : Pile-Poil !'
		);
		expect(newsItemPhrase(item({ stage: 'grand_matou' }))).toBe(
			'Un grand matou est arrivé à la Chatterie : Pile-Poil !'
		);
	});

	it('croissance, nom générique en tête de phrase : majuscule', () => {
		expect(
			newsItemPhrase(item({ kind: 'growth', stage: 'matou', name: 'le Mathou des Fractions' }))
		).toBe('Le Mathou des Fractions est devenu un matou !');
		expect(newsItemPhrase(item({ kind: 'growth', stage: 'grand_matou' }))).toBe(
			'Pile-Poil est devenu un grand matou !'
		);
	});

	it('étoiles : libellé court de la classe', () => {
		expect(newsItemPhrase(item({ kind: 'star', stage: 'grand_matou', newStars: ['2'] }))).toBe(
			'Pile-Poil gagne l’étoile ★ 2nde !'
		);
		expect(newsItemPhrase(item({ kind: 'star', stage: 'grand_matou', newStars: ['5', '4'] }))).toBe(
			'Pile-Poil gagne les étoiles ★ 5e ★ 4e !'
		);
	});

	it('reste : « et 1 autre » / « et 4 autres »', () => {
		expect(moreNewsPhrase(1)).toBe('Et 1 autre nouveauté à la Chatterie.');
		expect(moreNewsPhrase(4)).toBe('Et 4 autres nouveautés à la Chatterie.');
	});

	describe('newsSummaryPhrase (bulle du Palotin)', () => {
		const news = (over: Partial<MathouNews>): MathouNews => ({
			firstVisit: false,
			total: 1,
			items: [item({})],
			...over
		});

		it('rien → null', () => {
			expect(newsSummaryPhrase(news({ total: 0, items: [] }))).toBeNull();
		});

		it('une nouveauté → sa phrase', () => {
			expect(newsSummaryPhrase(news({}))).toBe('Un chaton est né à la Chatterie : Pile-Poil !');
		});

		it('plusieurs → la première, puis le reste', () => {
			expect(
				newsSummaryPhrase(news({ total: 3, items: [item({}), item({ notionId: 'b' })] }))
			).toBe(
				'Un chaton est né à la Chatterie : Pile-Poil ! Et 2 autres nouveautés à la Chatterie.'
			);
		});

		it('premier calcul avec plusieurs Mathoux → une seule phrase', () => {
			expect(newsSummaryPhrase(news({ firstVisit: true, total: 7 }))).toBe(
				'7 Mathoux t’attendent à la Chatterie !'
			);
		});

		it('premier calcul avec UN seul Mathou → sa phrase', () => {
			expect(newsSummaryPhrase(news({ firstVisit: true, total: 1 }))).toBe(
				'Un chaton est né à la Chatterie : Pile-Poil !'
			);
		});
	});
});
