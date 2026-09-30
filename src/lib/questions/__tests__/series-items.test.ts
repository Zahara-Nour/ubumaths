/**
 * Génération des questions d'une série : chaque question porte SA durée et SA
 * catégorie. Avant, les durées étaient reconstruites à part depuis le panier
 * et se décalaient dès qu'une catégorie était sautée ou qu'une génération
 * échouait.
 */
import { describe, it, expect, vi } from 'vitest';
import {
	buildSeriesItems,
	categoryKeyOf,
	drawSeriesQuestions,
	DEFAULT_QUESTION_DELAY_SECONDS
} from '$lib/questions/series-items';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { CartItem, QuestionCategory } from '$lib/stores/questionCart.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';

// Générateur réel remplacé : on vérifie seulement ce que `buildSeriesItems` lui passe
vi.mock('$lib/questions/generator/instance-generator', () => ({
	generateInstance: vi.fn(
		(t: QuestionTemplate, seed?: number): GenerationResult =>
			({
				success: true,
				instance: { templateId: t.id, seed } as QuestionInstance
			}) as GenerationResult
	)
}));

function category(domain: string, level = 1): QuestionCategory {
	return { theme: 'Entiers', domain, subdomain: 'Somme', level };
}

function template(domain: string, id: string, overrides: Partial<QuestionTemplate> = {}) {
	return {
		id,
		theme: 'Entiers',
		domain,
		subdomain: 'Somme',
		level: 1,
		...overrides
	} as unknown as QuestionTemplate;
}

function cart(domain: string, quantity: number, delay: number): CartItem {
	return { category: category(domain), quantity, delay };
}

/** Générateur factice : l'instance porte l'id du modèle ; `failing` échoue */
function fakeGenerate(failing: Set<string> = new Set()) {
	return (t: QuestionTemplate): GenerationResult =>
		failing.has(t.id)
			? { success: false, errors: ['échec'] }
			: ({ success: true, instance: { templateId: t.id } as QuestionInstance } as GenerationResult);
}

describe('buildSeriesItems', () => {
	it('une question par répétition, chacune avec la durée et la clé de sa catégorie', () => {
		const items = buildSeriesItems(
			[cart('Additionner', 2, 15), cart('Multiplier', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate: fakeGenerate() }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([
			['add', 15],
			['add', 15],
			['mul', 30]
		]);
		expect(items[0].categoryKey).toBe(categoryKeyOf(category('Additionner')));
		expect(items[2].categoryKey).not.toBe(items[0].categoryKey);
	});

	it('une catégorie sans modèle est sautée, les suivantes gardent LEUR durée', () => {
		const items = buildSeriesItems(
			[cart('Diviser', 2, 10), cart('Multiplier', 1, 30)],
			[template('Multiplier', 'mul')],
			{ generate: fakeGenerate() }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([['mul', 30]]);
	});

	it('une génération qui échoue est omise, sans décaler les durées suivantes', () => {
		const items = buildSeriesItems(
			[cart('Additionner', 1, 15), cart('Multiplier', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate: fakeGenerate(new Set(['add'])) }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([['mul', 30]]);
	});

	it('durée absente ou nulle : 20 s par défaut', () => {
		const items = buildSeriesItems([cart('Additionner', 1, 0)], [template('Additionner', 'add')], {
			generate: fakeGenerate()
		});

		expect(DEFAULT_QUESTION_DELAY_SECONDS).toBe(20);
		expect(items[0].delaySeconds).toBe(20);
	});

	it('exclut les cartes de cours sur demande', () => {
		const card = template('Additionner', 'carte', {
			options: { courseCard: true }
		} as Partial<QuestionTemplate>);
		const items = buildSeriesItems([cart('Additionner', 1, 15)], [card], {
			generate: fakeGenerate(),
			excludeCourseCards: true
		});

		expect(items).toEqual([]);
	});

	it('niveau en chaîne (ancien panier) et sous-domaine null ≡ absent', () => {
		const legacy: CartItem = {
			category: {
				theme: 'Entiers',
				domain: 'Vocabulaire',
				subdomain: null,
				level: '1' as unknown as number
			},
			quantity: 1,
			delay: 12
		};
		const items = buildSeriesItems(
			[legacy],
			[template('Vocabulaire', 'voc', { subdomain: undefined })],
			{ generate: fakeGenerate() }
		);

		expect(items.map((i) => i.instance.templateId)).toEqual(['voc']);
	});

	it('Q20 : une graine entière par question, passée à la génération', () => {
		const seeds = [11, 22, 33];
		const generate = vi.fn(
			(t: QuestionTemplate, seed?: number): GenerationResult =>
				({
					success: true,
					instance: { templateId: t.id, seed } as QuestionInstance
				}) as GenerationResult
		);
		const items = buildSeriesItems(
			[cart('Additionner', 2, 15), cart('Multiplier', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate, nextSeed: () => seeds.shift() ?? -1 }
		);

		expect(generate.mock.calls.map((call) => call[1])).toEqual([11, 22, 33]);
		expect(items.map((i) => i.instance.seed)).toEqual([11, 22, 33]);
	});

	it('Q20 : par défaut, la graine est un entier positif tiré à chaque question', () => {
		const mocked = vi.mocked(generateInstance);
		mocked.mockClear();
		const items = buildSeriesItems([cart('Additionner', 3, 15)], [template('Additionner', 'add')]);

		const seeds = mocked.mock.calls.map((call) => call[1]);
		expect(seeds).toHaveLength(3);
		for (const seed of seeds) {
			expect(Number.isInteger(seed)).toBe(true);
			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThanOrEqual(2 ** 31 - 1);
		}
		// L'instance porte la graine avec laquelle elle a été générée
		expect(items.map((i) => i.instance.seed)).toEqual(seeds);
	});
});

describe('drawSeriesQuestions (évaluation : le serveur tire modèle + graine)', () => {
	it('même règle que buildSeriesItems : un tirage par répétition, durée et clé de catégorie', () => {
		const seeds = [5, 6, 7];
		const draws = drawSeriesQuestions(
			[cart('Additionner', 2, 15), cart('Absent', 1, 50), cart('Multiplier', 1, 0)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ nextSeed: () => seeds.shift() ?? -1, pickIndex: () => 0 }
		);
		expect(draws.map((d) => [d.template.id, d.seed, d.delaySeconds, d.categoryKey])).toEqual([
			['add', 5, 15, categoryKeyOf(category('Additionner'))],
			['add', 6, 15, categoryKeyOf(category('Additionner'))],
			['mul', 7, DEFAULT_QUESTION_DELAY_SECONDS, categoryKeyOf(category('Multiplier'))]
		]);
	});

	it('cartes de cours exclues sur demande', () => {
		const card = template('Additionner', 'carte', {
			options: { courseCard: true }
		} as Partial<QuestionTemplate>);
		const draws = drawSeriesQuestions(
			[cart('Additionner', 2, 15)],
			[card, template('Additionner', 'add')],
			{ excludeCourseCards: true }
		);
		expect(draws.map((d) => d.template.id)).toEqual(['add', 'add']);
	});

	it('ne génère rien (tirage seul)', () => {
		const mocked = vi.mocked(generateInstance);
		mocked.mockClear();
		drawSeriesQuestions([cart('Additionner', 2, 15)], [template('Additionner', 'add')]);
		expect(mocked).not.toHaveBeenCalled();
	});
});
