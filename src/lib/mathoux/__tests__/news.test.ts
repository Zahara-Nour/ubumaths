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
	gidouillesPhrase,
	hasNews,
	moreNewsPhrase,
	MAX_NEWS_ITEMS,
	type MathouNews,
	type MathouNewsItem
} from '../news';
import { mathouNewsSchema, mathouxSummarySchema } from '../summary';

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
		decoration: null,
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

/** Mémoire de test ; `asleep` faux sauf mention. */
function memoryOf(
	entries: Record<string, Omit<MathouMemory, 'asleep'> & { asleep?: boolean }>
): Map<string, MathouMemory> {
	return new Map(
		Object.entries(entries).map(([id, entry]) => [id, { asleep: false, ...entry }] as const)
	);
}

/** Ce calcul a écrit chaque Mathou, en remplaçant la ligne de `memory` (absente : insérée). */
function newsAll(collection: MathouCollection, memory: Map<string, MathouMemory>) {
	const written = new Map<string, MathouMemory | null>(
		collection.races.flatMap((race) =>
			race.mathoux.map((m) => [m.notionId, memory.get(m.notionId) ?? null] as const)
		)
	);
	return mathouNews(collection, memory, written);
}

describe('mathouNews', () => {
	it('naissance : un Mathou né sans ligne en mémoire', () => {
		const collection = collectionOf(mathou('n1', 'chaton'));
		const news = newsAll(
			collection,
			memoryOf({ autre: { bestStage: 'matou', starredGrades: [] } })
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
					decoration: null,
					newStars: []
				}
			]
		});
	});

	it('la décoration portée suit la nouveauté (dessin de la carte de fin de séance)', () => {
		const collection = collectionOf({ ...mathou('n1', 'matou'), decoration: 'medal' });
		const news = newsAll(collection, memoryOf({ n1: { bestStage: 'chaton', starredGrades: [] } }));
		expect(news.items[0]).toMatchObject({ kind: 'growth', decoration: 'medal' });
		expect(mathouNewsSchema.parse(news).items[0].decoration).toBe('medal');
	});

	it('croissance : stade au-dessus de la mémoire', () => {
		const collection = collectionOf(mathou('n1', 'matou'));
		const news = newsAll(collection, memoryOf({ n1: { bestStage: 'chaton', starredGrades: [] } }));
		expect(news.items).toEqual([
			expect.objectContaining({ kind: 'growth', notionId: 'n1', stage: 'matou' })
		]);
	});

	it('étoile : nouvelles étoiles seules, sans changement de stade', () => {
		const collection = collectionOf(mathou('n1', 'grand_matou', ['5', '4']));
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'grand_matou', starredGrades: ['5'] } })
		);
		expect(news.items).toEqual([
			expect.objectContaining({ kind: 'star', notionId: 'n1', newStars: ['4'] })
		]);
	});

	it('croissance ET étoile sur le même Mathou : une seule nouveauté, la croissance, étoiles jointes', () => {
		const collection = collectionOf(mathou('n1', 'grand_matou', ['2']));
		const news = newsAll(collection, memoryOf({ n1: { bestStage: 'matou', starredGrades: [] } }));
		expect(news.total).toBe(1);
		expect(news.items[0]).toMatchObject({ kind: 'growth', stage: 'grand_matou', newStars: ['2'] });
	});

	it('rien de nouveau : mémoire à jour → total 0', () => {
		const collection = collectionOf(mathou('n1', 'matou', ['5']));
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: ['5'] } })
		);
		expect(news).toEqual({ firstVisit: false, total: 0, items: [] });
	});

	it('une silhouette n’est jamais une nouveauté', () => {
		const collection = collectionOf(mathou('n1', 'a_decouvrir'));
		expect(newsAll(collection, new Map()).total).toBe(0);
	});

	it('seul ce que CE calcul a écrit est annoncé (un autre calcul l’a déjà écrit → rien)', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'chaton'));
		const news = mathouNews(
			collection,
			memoryOf({ x: { bestStage: 'chaton', starredGrades: [] } }),
			new Map([['n2', null]])
		);
		expect(news.items.map((item) => item.notionId)).toEqual(['n2']);
	});

	it('concurrence : classé contre la ligne REMPLACÉE, pas la mémoire lue avant (revue de #PR)', () => {
		// Mémoire lue vide ; un autre calcul a inséré « chaton » (et l'a annoncé) ;
		// celui-ci a réécrit « matou » par-dessus : croissance, pas une seconde naissance
		const collection = collectionOf(mathou('n1', 'matou'));
		const news = mathouNews(
			collection,
			new Map(),
			new Map([['n1', { bestStage: 'chaton', starredGrades: [], asleep: false }]])
		);
		expect(news.items).toEqual([expect.objectContaining({ kind: 'growth', stage: 'matou' })]);
	});

	it('concurrence : l’autre calcul a déjà écrit le stade, celui-ci n’ajoute qu’une étoile → étoile', () => {
		const collection = collectionOf(mathou('n1', 'matou', ['5']));
		const news = mathouNews(
			collection,
			memoryOf({ n1: { bestStage: 'chaton', starredGrades: [] } }),
			new Map([['n1', { bestStage: 'matou', starredGrades: [], asleep: false }]])
		);
		expect(news.items).toEqual([expect.objectContaining({ kind: 'star', newStars: ['5'] })]);
	});

	it('ordre : naissances, puis croissances, puis étoiles ; 3 au plus, total complet', () => {
		const collection = collectionOf(
			mathou('etoile', 'grand_matou', ['5']),
			mathou('grandit', 'matou'),
			mathou('ne1', 'chaton'),
			mathou('ne2', 'chaton'),
			mathou('ne3', 'matou')
		);
		const news = newsAll(
			collection,
			memoryOf({
				etoile: { bestStage: 'grand_matou', starredGrades: [] },
				grandit: { bestStage: 'chaton', starredGrades: [] }
			})
		);
		expect(MAX_NEWS_ITEMS).toBe(3);
		expect(news.total).toBe(5);
		expect(news.items.map((item) => item.notionId)).toEqual(['ne1', 'ne2', 'ne3']);
	});

	it('premier calcul : mémoire vide → firstVisit', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'matou'));
		const news = newsAll(collection, new Map());
		expect(news.firstVisit).toBe(true);
		expect(news.total).toBe(2);
	});

	it('le résultat passe le schéma du résumé de l’endpoint', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'grand_matou', ['2']));
		const news = newsAll(collection, new Map());
		const parsed = mathouxSummarySchema.safeParse({ born: 2, napping: 0, toDiscover: 0, news });
		expect(parsed.success).toBe(true);
	});

	it('croissance : porte le stade d’avant (celui de la ligne remplacée), même en sautant un stade', () => {
		const collection = collectionOf(mathou('n1', 'matou'), mathou('n2', 'grand_matou'));
		const news = newsAll(
			collection,
			memoryOf({
				n1: { bestStage: 'chaton', starredGrades: [] },
				n2: { bestStage: 'chaton', starredGrades: [] }
			})
		);
		expect(news.items).toEqual([
			expect.objectContaining({ notionId: 'n1', kind: 'growth', previousStage: 'chaton' }),
			expect.objectContaining({ notionId: 'n2', kind: 'growth', previousStage: 'chaton' })
		]);
	});

	it('réveil : il dormait au calcul précédent, il ne dort plus', () => {
		const collection = collectionOf(mathou('n1', 'matou'));
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: [], asleep: true } })
		);
		expect(news.items).toEqual([
			{
				kind: 'wake',
				notionId: 'n1',
				name: 'Nom n1',
				raceIndex: 2,
				stage: 'matou',
				decoration: null,
				newStars: []
			}
		]);
	});

	it('il s’endort : rien à annoncer', () => {
		const collection = collectionOf({ ...mathou('n1', 'matou'), asleep: true });
		const news = newsAll(collection, memoryOf({ n1: { bestStage: 'matou', starredGrades: [] } }));
		expect(news.total).toBe(0);
	});

	it('il grandit en se réveillant : une seule nouveauté, la croissance', () => {
		const collection = collectionOf(mathou('n1', 'grand_matou'));
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: [], asleep: true } })
		);
		expect(news.items).toEqual([expect.objectContaining({ kind: 'growth' })]);
	});

	it('réveil et nouvelle étoile : le réveil, étoiles jointes', () => {
		const collection = collectionOf(mathou('n1', 'matou', ['4']));
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: [], asleep: true } })
		);
		expect(news.items).toEqual([expect.objectContaining({ kind: 'wake', newStars: ['4'] })]);
	});

	it('Mathou de la seule mémoire (aucun point travaillable) : jamais annoncé réveillé', () => {
		const collection = collectionOf({ ...mathou('n1', 'matou'), workablePoints: 0 });
		const news = newsAll(
			collection,
			memoryOf({ n1: { bestStage: 'matou', starredGrades: [], asleep: true } })
		);
		expect(news.total).toBe(0);
	});

	it('ordre : naissances, croissances, réveils, étoiles', () => {
		const collection = collectionOf(
			mathou('star', 'matou', ['4']),
			mathou('wake', 'matou'),
			mathou('grow', 'matou'),
			mathou('born', 'chaton')
		);
		const news = newsAll(
			collection,
			memoryOf({
				star: { bestStage: 'matou', starredGrades: [] },
				wake: { bestStage: 'matou', starredGrades: [], asleep: true },
				grow: { bestStage: 'chaton', starredGrades: [] }
			})
		);
		expect(news.total).toBe(4);
		expect(news.items.map((item) => item.kind)).toEqual(['birth', 'growth', 'wake']);
	});

	it('naissance et étoile : pas de stade d’avant', () => {
		const collection = collectionOf(mathou('n1', 'chaton'), mathou('n2', 'matou', ['4']));
		const news = newsAll(collection, memoryOf({ n2: { bestStage: 'matou', starredGrades: [] } }));
		expect(news.items.map((item) => item.kind)).toEqual(['birth', 'star']);
		for (const item of news.items) expect(item).not.toHaveProperty('previousStage');
	});

	it('schéma : stade d’avant accepté s’il est valide, refusé sinon', () => {
		const growth = {
			kind: 'growth',
			notionId: 'n1',
			name: 'Pile-Poil',
			raceIndex: 0,
			stage: 'matou',
			previousStage: 'chaton',
			newStars: []
		};
		const summary = (item: object) => ({
			born: 1,
			napping: 0,
			toDiscover: 0,
			news: { firstVisit: false, total: 1, items: [item] }
		});
		expect(mathouxSummarySchema.safeParse(summary(growth)).success).toBe(true);
		expect(
			mathouxSummarySchema.safeParse(summary({ ...growth, previousStage: 'tigre' })).success
		).toBe(false);
		const { previousStage: _, ...wake } = { ...growth, kind: 'wake' };
		expect(mathouxSummarySchema.safeParse(summary(wake)).success).toBe(true);
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

	it('réveil : « … s’est réveillé ! »', () => {
		expect(newsItemPhrase(item({ kind: 'wake', stage: 'matou' }))).toBe(
			'Pile-Poil s’est réveillé !'
		);
		expect(
			newsItemPhrase(item({ kind: 'wake', stage: 'matou', name: 'le Mathou des Fractions' }))
		).toBe('Le Mathou des Fractions s’est réveillé !');
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

		it('gidouilles seules (rattrapage) → Faustroll les verse', () => {
			expect(newsSummaryPhrase(news({ total: 0, items: [], gidouilles: 18 }))).toBe(
				'Faustroll te verse 18 gidouilles pour tes Mathoux !'
			);
		});

		it('une nouveauté et ses gidouilles → les deux', () => {
			expect(newsSummaryPhrase(news({ gidouilles: 3 }))).toBe(
				'Un chaton est né à la Chatterie : Pile-Poil ! +3 gidouilles pour tes Mathoux.'
			);
		});
	});

	describe('gidouilles', () => {
		const base: MathouNews = { firstVisit: false, total: 0, items: [] };

		it('phrase : au singulier, au pluriel, seule ou sous les nouveautés', () => {
			expect(gidouillesPhrase(1, false)).toBe('+1 gidouille pour tes Mathoux.');
			expect(gidouillesPhrase(8, false)).toBe('+8 gidouilles pour tes Mathoux.');
			expect(gidouillesPhrase(18, true)).toBe(
				'Faustroll te verse 18 gidouilles pour tes Mathoux !'
			);
		});

		it('hasNews : une nouveauté détaillée, ou des gidouilles', () => {
			expect(hasNews(base)).toBe(false);
			expect(hasNews({ ...base, gidouilles: 0 })).toBe(false);
			expect(hasNews({ ...base, gidouilles: 5 })).toBe(true);
			expect(hasNews({ ...base, total: 1, items: [item({})] })).toBe(true);
		});

		it('le résumé accepte les gidouilles, et un résumé sans elles (absent : 0)', () => {
			const summary = { born: 1, napping: 0, toDiscover: 0, news: base };
			expect(mathouxSummarySchema.safeParse(summary).success).toBe(true);
			const paid = { ...summary, news: { ...base, gidouilles: 8 } };
			expect(mathouxSummarySchema.parse(paid).news.gidouilles).toBe(8);
			const negative = { ...summary, news: { ...base, gidouilles: -1 } };
			expect(mathouxSummarySchema.safeParse(negative).success).toBe(false);
		});
	});
});
