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
	seriesSeedSequence,
	DEFAULT_QUESTION_DELAY_SECONDS,
	MAX_QUESTION_SEED
} from '#lib/questions/series-items.ts';
import type { GenerationResult, QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import type { SeriesItem } from '#lib/validation/series.ts';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';

// Générateur réel remplacé : on vérifie seulement ce que `buildSeriesItems` lui passe
vi.mock('#lib/questions/generator/instance-generator.ts', () => ({
	generateInstance: vi.fn(
		(t: QuestionTemplate, seed?: number): GenerationResult =>
			({
				success: true,
				instance: { templateId: t.id, seed, statement: `${t.id}-${seed}` } as QuestionInstance
			}) as GenerationResult
	)
}));

function template(domain: string, id: string, overrides: Partial<QuestionTemplate> = {}) {
	return {
		id,
		domain,
		level: 1,
		...overrides
	} as unknown as QuestionTemplate;
}

/** Ligne de série : le modèle porte l'id fourni (`add`, `mul`…) */
function line(templateId: string, quantity: number, delay: number): SeriesItem {
	return { templateId, quantity, delay };
}

/**
 * Générateur factice : l'instance porte l'id du modèle et un énoncé propre à sa
 * graine (sinon toutes seraient des doublons) ; `failing` échoue
 */
function fakeGenerate(failing: Set<string> = new Set()) {
	return (t: QuestionTemplate, seed: number): GenerationResult =>
		failing.has(t.id)
			? { success: false, errors: ['échec'] }
			: ({
					success: true,
					instance: { templateId: t.id, statement: `${t.id}-${seed}` } as QuestionInstance
				} as GenerationResult);
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

	it('Q20 : chaque question porte la graine avec laquelle elle a été générée', () => {
		const generate = vi.fn(
			(t: QuestionTemplate, seed?: number): GenerationResult =>
				({
					success: true,
					instance: { templateId: t.id, seed, statement: `${t.id}-${seed}` } as QuestionInstance
				}) as GenerationResult
		);
		const lineSeeds = [11, 22];
		const items = buildSeriesItems(
			[line('add', 2, 15), line('mul', 1, 30)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')],
			{ generate, nextSeed: () => lineSeeds.shift() ?? -1 }
		);

		expect(items).toHaveLength(3);
		expect(items.map((i) => i.instance.seed)).toEqual(generate.mock.calls.map((call) => call[1]));
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
		const draws = drawSeriesQuestions(
			[line('add', 2, 15), line('absent', 1, 50), line('mul', 1, 0)],
			[template('Additionner', 'add'), template('Multiplier', 'mul')]
		);
		expect(draws.map((d) => [d.template.id, d.delaySeconds])).toEqual([
			['add', 15],
			['add', 15],
			['mul', DEFAULT_QUESTION_DELAY_SECONDS]
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

	it('rend l’instance générée avec la graine du tirage (le serveur ne régénère pas)', () => {
		const draws = drawSeriesQuestions([line('add', 2, 15)], [template('Additionner', 'add')]);
		for (const d of draws) expect(d.instance.seed).toBe(d.seed);
	});
});

describe('seriesSeedSequence (mêmes nombres pour tous)', () => {
	it('une même graine de série rend la même suite de graines de questions', () => {
		const a = seriesSeedSequence(123456);
		const b = seriesSeedSequence(123456);
		const suiteA = Array.from({ length: 10 }, () => a());
		const suiteB = Array.from({ length: 10 }, () => b());

		expect(suiteA).toEqual(suiteB);
		for (const seed of suiteA) {
			expect(Number.isInteger(seed)).toBe(true);
			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThanOrEqual(MAX_QUESTION_SEED);
		}
	});

	it('deux graines de série différentes rendent des suites différentes', () => {
		const a = seriesSeedSequence(1);
		const b = seriesSeedSequence(2);
		expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
	});

	it('ligne répétée : questions différentes entre elles, mais les mêmes pour tous', () => {
		const series = [line('add', 3, 15), line('mul', 2, 30)];
		const templates = [template('Additionner', 'add'), template('Multiplier', 'mul')];
		const seedsOf = () =>
			buildSeriesItems(series, templates, { nextSeed: seriesSeedSequence(42) }).map(
				(item) => item.instance.seed
			);

		const eleve1 = seedsOf();
		const eleve2 = seedsOf();
		expect(eleve1).toEqual(eleve2);
		expect(new Set(eleve1).size).toBe(5);
	});
});

describe('mêmes nombres pour tous : un modèle absent ne décale pas les autres', () => {
	it('une ligne au modèle absent laisse inchangées les graines des lignes suivantes', () => {
		const templates = [template('Additionner', 'add'), template('Multiplier', 'mul')];
		const complete = buildSeriesItems([line('add', 2, 15), line('mul', 2, 30)], templates, {
			nextSeed: seriesSeedSequence(42)
		});
		// Chez un autre élève, le modèle « add » manque (retiré, cache d'onglet en retard)
		const sansAdd = buildSeriesItems(
			[line('add', 2, 15), line('mul', 2, 30)],
			[template('Multiplier', 'mul')],
			{ nextSeed: seriesSeedSequence(42) }
		);

		expect(sansAdd.map((item) => item.instance.seed)).toEqual(
			complete.filter((item) => item.templateId === 'mul').map((item) => item.instance.seed)
		);
	});
});
