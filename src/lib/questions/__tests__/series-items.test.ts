/**
 * Génération des questions d'une série : chaque question porte SA durée et SON
 * modèle (ADR 0035). Avant, les durées étaient reconstruites à part depuis le
 * panier et se décalaient dès qu'une ligne était sautée ou qu'une génération
 * échouait.
 */
import { describe, it, expect, vi } from 'vitest';
import {
	buildSeriesItems,
	drawSeriesQuestions,
	DEFAULT_QUESTION_DELAY_SECONDS
} from '$lib/questions/series-items';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { SeriesItem } from '$lib/validation/series';
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

/** Ligne de série : le modèle porte l'id fourni (`add`, `mul`…) */
function line(templateId: string, quantity: number, delay: number): SeriesItem {
	return { templateId, quantity, delay };
}

/** Générateur factice : l'instance porte l'id du modèle ; `failing` échoue */
function fakeGenerate(failing: Set<string> = new Set()) {
	return (t: QuestionTemplate): GenerationResult =>
		failing.has(t.id)
			? { success: false, errors: ['échec'] }
			: ({ success: true, instance: { templateId: t.id } as QuestionInstance } as GenerationResult);
}

describe('buildSeriesItems', () => {
	it('une question par répétition, chacune avec la durée et le modèle de sa ligne', () => {
		const items = buildSeriesItems(
			[line('add', 2, 15), line('mul', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate: fakeGenerate() }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([
			['add', 15],
			['add', 15],
			['mul', 30]
		]);
		expect(items.map((i) => i.templateId)).toEqual(['add', 'add', 'mul']);
	});

	it('une ligne dont le modèle manque est sautée, les suivantes gardent LEUR durée', () => {
		const items = buildSeriesItems(
			[line('div', 2, 10), line('mul', 1, 30)],
			[template('Multiplier', 'mul')],
			{ generate: fakeGenerate() }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([['mul', 30]]);
	});

	it('une génération qui échoue est omise, sans décaler les durées suivantes', () => {
		const items = buildSeriesItems(
			[line('add', 1, 15), line('mul', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate: fakeGenerate(new Set(['add'])) }
		);

		expect(items.map((i) => [i.instance.templateId, i.delaySeconds])).toEqual([['mul', 30]]);
	});

	it('durée absente ou nulle : 20 s par défaut', () => {
		const items = buildSeriesItems([line('add', 1, 0)], [template('Additionner', 'add')], {
			generate: fakeGenerate()
		});

		expect(DEFAULT_QUESTION_DELAY_SECONDS).toBe(20);
		expect(items[0].delaySeconds).toBe(20);
	});

	it('exclut les cartes de cours sur demande', () => {
		const card = template('Additionner', 'carte', {
			options: { courseCard: true }
		} as Partial<QuestionTemplate>);
		const lines = [line('carte', 1, 15)];
		// Sans l'exclusion, la carte est bien tirée : le test prouve l'exclusion
		expect(
			buildSeriesItems(lines, [card], { generate: fakeGenerate() }).map((i) => i.templateId)
		).toEqual(['carte']);
		const items = buildSeriesItems(lines, [card], {
			generate: fakeGenerate(),
			excludeCourseCards: true
		});

		expect(items).toEqual([]);
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
			[line('add', 2, 15), line('mul', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate, nextSeed: () => seeds.shift() ?? -1 }
		);

		expect(generate.mock.calls.map((call) => call[1])).toEqual([11, 22, 33]);
		expect(items.map((i) => i.instance.seed)).toEqual([11, 22, 33]);
	});

	it('Q20 : par défaut, la graine est un entier positif tiré à chaque question', () => {
		const mocked = vi.mocked(generateInstance);
		mocked.mockClear();
		const items = buildSeriesItems([line('add', 3, 15)], [template('Additionner', 'add')]);

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
	it('même règle que buildSeriesItems : un tirage par répétition, durée du modèle de la ligne', () => {
		const seeds = [5, 6, 7];
		const draws = drawSeriesQuestions(
			[line('add', 2, 15), line('absent', 1, 50), line('mul', 1, 0)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ nextSeed: () => seeds.shift() ?? -1 }
		);
		expect(draws.map((d) => [d.template.id, d.seed, d.delaySeconds])).toEqual([
			['add', 5, 15],
			['add', 6, 15],
			['mul', 7, DEFAULT_QUESTION_DELAY_SECONDS]
		]);
	});

	it('cartes de cours exclues sur demande', () => {
		const card = template('Additionner', 'carte', {
			options: { courseCard: true }
		} as Partial<QuestionTemplate>);
		const draws = drawSeriesQuestions(
			[line('carte', 1, 15), line('add', 2, 15)],
			[card, template('Additionner', 'add')],
			{ excludeCourseCards: true }
		);
		expect(draws.map((d) => d.template.id)).toEqual(['add', 'add']);
	});

	it('ne génère rien (tirage seul)', () => {
		const mocked = vi.mocked(generateInstance);
		mocked.mockClear();
		drawSeriesQuestions([line('add', 2, 15)], [template('Additionner', 'add')]);
		expect(mocked).not.toHaveBeenCalled();
	});
});
