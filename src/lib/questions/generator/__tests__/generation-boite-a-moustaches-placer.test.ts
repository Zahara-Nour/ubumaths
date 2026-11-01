/**
 * Question à boîte à moustaches à construire (` ```boite-a-moustaches ` + `placer:`,
 * chantier `docs/wip/boite-a-moustaches-progress.md` § 5, palier 2)
 *
 * Même patron que les barres à construire : cinq cases par boîte (minimum, Q1,
 * médiane, Q3, maximum), note partielle ; réponse attendue = la valeur écrite
 * (ou calculée par `describe.ts` avec `données:`), jamais dans le modèle ; juge
 * ordinaire (`11`). En évaluation, l'énoncé envoyé ne porte aucune des cinq valeurs.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';
import { toPublicQuestion } from '../../public-question';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-boite-placer',
		title: 'Construire une boîte à moustaches',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['3'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as unknown as QuestionTemplate;
}

const boite = (...body: string[]) => ['```boite-a-moustaches', ...body, '```'].join('\n');

const NOTES = ['axe: 0 à 20, de 1 en 1', 'Notes = 4 ; 8 ; 11 ; 14 ; 19'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** Corps du premier bloc ```boite-a-moustaches (sans clôtures) */
function body(markdown: string): string {
	const lines = markdown.split('\n');
	const start = lines.findIndex((line) => line.trim() === '```boite-a-moustaches');
	const end = lines.findIndex((line, i) => i > start && line.trim() === '```');
	return lines.slice(start + 1, end).join('\n');
}

describe('assignBlankIndices — boîte à construire', () => {
	it('cinq cases par boîte, numéro de la première posé dans le bloc', () => {
		const result = assignBlankIndices(boite(...NOTES, 'placer: Notes'));
		expect(result.totalBlanks).toBe(5);
		expect(result.blankTypes).toEqual(['math', 'math', 'math', 'math', 'math']);
		expect(result.statement).toBe(boite('case: 0', ...NOTES, 'placer: Notes'));
		const source = [...NOTES, 'placer: Notes'].join('\n');
		expect(result.buildBlanks?.[0]).toEqual({ kind: 'boite-a-moustaches', source, point: 0 });
		expect(result.buildBlanks?.[4]).toEqual({ kind: 'boite-a-moustaches', source, point: 4 });
	});

	it('boîte à lire : aucune case', () => {
		expect(assignBlankIndices(boite(...NOTES)).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(
			[
				'> ```boite-a-moustaches',
				'> axe: 0 à 5',
				'> A = 1 ; 2 ; 3 ; 4 ; 5',
				'> placer: A',
				'> ```'
			].join('\n')
		);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Une boîte à moustaches à construire doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('boîte à construire : les cases et leurs réponses', () => {
	it('sans blanks[] : cinq cases, réponses = les cinq valeurs', () => {
		const instance = generate(
			template({ statement: `Construis la boîte.\n\n${boite(...NOTES, 'placer: Notes')}` })
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['4', '8', '11', '14', '19']);
		expect(instance.blanks?.[0]).toMatchObject({ construire: 'boite-a-moustaches' });
		const right = ['4', '8', '11', '14', '19'];
		expect(validateAnswer(right, instance, right).status).toBe('correct');
		const wrong = ['4', '8', '12', '14', '19'];
		expect(validateAnswer(wrong, instance, wrong).isCorrect).toBe(false);
	});

	it('données: + placer: toutes : l’attendu calculé par describe.ts', () => {
		const instance = generate(
			template({
				statement: boite(
					'axe: 0 à 25',
					'données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21',
					'placer: toutes'
				)
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['3', '7', '12', '14', '21']);
	});

	it('deux boîtes à construire : dix cases, boîte après boîte', () => {
		const instance = generate(
			template({
				statement: boite(
					'axe: 25 à 60',
					'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
					'Neptune = 36 ; 37 ; 39 ; 42 ; 46',
					'placer: toutes'
				)
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual([
			'28',
			'30',
			'37',
			'45',
			'58',
			'36',
			'37',
			'39',
			'42',
			'46'
		]);
	});

	it('valeurs décimales : écrites avec un point, jugées comme un nombre', () => {
		const instance = generate(
			template({
				statement: boite('axe: 0 à 5, de 0,5 en 0,5', 'A = 0,5 ; 1 ; 2,5 ; 3 ; 4,5', 'placer: A')
			})
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['0.5', '1', '2.5', '3', '4.5']);
	});

	it('boîte mal écrite : refusée avec son message', () => {
		const result = generateInstance(
			template({ statement: boite('A = 1 ; 2 ; 3 ; 4 ; 5', 'placer: A') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(boîte à moustaches\).*axe/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à boîte à construire', () => {
		const errors = validateTemplate(template({ statement: boite(...NOTES, 'placer: Notes') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : UNE boîte, la réponse de chaque trait', () => {
		const instance = generate(
			template({ statement: `Construis.\n\n${boite(...NOTES, 'placer: Notes')}` })
		);
		const { lines } = buildExpectedResult(instance, { values: ['4', '8', '12', '14', ''] });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			kind: 'build',
			buildKind: 'boite-a-moustaches',
			status: 'incorrect'
		});
	});
});

describe('boîte à construire : énoncé d’évaluation sans la réponse', () => {
	const META = { position: 0, delaySeconds: 20 };

	it('les cinq valeurs deviennent ?, le nom et l’axe restent, le bloc se lit', () => {
		const full = generate(
			template({
				statement: `Construis.\n\n${boite('axe: 25 à 60', 'Nautic = 28 ; 30 ; 37 ; 45 ; 58', 'Neptune = 36 ; 37 ; 39 ; 42 ; 46', 'placer: Neptune')}`
			})
		);
		const before = full.statement;
		const { statement } = toPublicQuestion(full, META);
		expect(full.statement).toBe(before);
		expect(statement).toContain('Neptune = ? ; ? ; ? ; ? ; ?');
		expect(statement).toContain('Nautic = 28 ; 30 ; 37 ; 45 ; 58');
		expect(statement).not.toContain('36 ; 37');
		const node = parseStatChartContent('boite-a-moustaches', body(statement));
		expect(node.errors).toEqual([]);
		expect(node.spec!.boxPlot!.toPlace).toEqual([1]);
		expect(node.spec!.boxPlot!.axis).toEqual({ min: 25, max: 60, step: 1 });
	});

	it('données: : la série ne reste pas dans le bloc', () => {
		const full = generate(
			template({
				statement: `Série : 3, 5, 7, 8, 12, 13, 14, 18, 21.\n\n${boite('axe: 0 à 25', 'données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21', 'placer: toutes')}`
			})
		);
		const { statement } = toPublicQuestion(full, META);
		expect(body(statement)).not.toMatch(/données/);
		const node = parseStatChartContent('boite-a-moustaches', body(statement));
		expect(node.errors).toEqual([]);
		expect(node.spec!.boxPlot!.toPlace).toEqual([0]);
	});

	it('« ? » écrit par l’auteur dans un modèle : refusé', () => {
		const result = generateInstance(
			template({ statement: boite('axe: 0 à 20', 'A = ? ; ? ; ? ; ? ; ?', 'placer: A') }),
			42
		);
		expect(result.success).toBe(false);
	});
});
