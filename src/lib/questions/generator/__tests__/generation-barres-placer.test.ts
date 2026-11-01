/**
 * Question à diagramme en barres à construire (` ```barres ` + `placer:`,
 * chantier `docs/wip/reponses-a-placer-progress.md` § 17, 18)
 *
 * Même patron que la droite à plusieurs points : une case par barre à construire
 * (note partielle), dans l'ordre des données ; réponse attendue = l'effectif de
 * la barre, jamais écrit dans le modèle ; juge ordinaire (`12`).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-barres-placer',
		title: 'Construire un diagramme en barres',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CE1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const bars = (...body: string[]) => ['```barres', ...body, '```'].join('\n');

const SPORTS = ['Football = 12', 'Natation = 8', 'Danse = 7', 'axe: 0 à 20, de 2 en 2'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — barres à construire', () => {
	it('une case par barre à construire, numéro de la première posé dans le bloc', () => {
		const result = assignBlankIndices(bars(...SPORTS, 'placer: Natation ; Danse'));
		expect(result.totalBlanks).toBe(2);
		expect(result.blankTypes).toEqual(['math', 'math']);
		expect(result.statement).toBe(bars('case: 0', ...SPORTS, 'placer: Natation ; Danse'));
		const source = [...SPORTS, 'placer: Natation ; Danse'].join('\n');
		expect(result.buildBlanks).toEqual({
			0: { kind: 'barres', source, point: 0 },
			1: { kind: 'barres', source, point: 1 }
		});
	});

	it('diagramme à lire : aucune case', () => {
		expect(assignBlankIndices(bars('A = 1', 'B = 2')).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(
			['> ```barres', '> A = 1', '> axe: 0 à 5', '> placer: A', '> ```'].join('\n')
		);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un diagramme en barres à construire doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('barres à construire : les cases et leurs réponses', () => {
	it('sans blanks[] : une case par barre, réponse = l’effectif', () => {
		const instance = generate(
			template({
				statement: `Construis le diagramme.\n\n${bars(...SPORTS, 'placer: Natation ; Danse')}`
			})
		);
		expect(instance.blanks).toHaveLength(2);
		expect(instance.blanks?.[0]).toMatchObject({ expectedAnswer: '8', construire: 'barres' });
		expect(instance.blanks?.[1]).toMatchObject({ expectedAnswer: '7', construire: 'barres' });
		// Note partielle : Natation juste, Danse fausse
		const verdict = validateAnswer(['8', '9'], instance, ['8', '9']);
		expect(verdict.isCorrect).toBe(false);
		expect(validateAnswer(['8', '7'], instance, ['8', '7']).status).toBe('correct');
	});

	it('placer: toutes, données brutes : l’élève compte', () => {
		const instance = generate(
			template({ statement: bars('données: 2 ; 3 ; 2 ; 2 ; 5', 'axe: 0 à 5', 'placer: toutes') })
		);
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['3', '1', '1']);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: bars('A = {{n}}', 'B = 3', 'axe: 0 à 10', 'placer: A'),
				variables: [{ name: 'n', expression: '6' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('6');
	});

	it('diagramme mal écrit : refusé avec son message', () => {
		const result = generateInstance(template({ statement: bars('A = 1', 'placer: A') }), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(diagramme en barres\).*axe vertical/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: bars('A = 1', 'axe: 0 à 5', 'placer: A'),
				blanks: [{ expectedAnswer: '1' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*l’effectif de la barre \(placer:\)/i);
	});

	it('le validateur de modèle accepte une question sans blanks[] à barres à construire', () => {
		const errors = validateTemplate(
			template({ statement: bars('A = 1', 'axe: 0 à 5', 'placer: A') })
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : UN diagramme, la réponse de chaque barre', () => {
		const instance = generate(
			template({ statement: `Construis.\n\n${bars(...SPORTS, 'placer: Natation ; Danse')}` })
		);
		const { lines } = buildExpectedResult(instance, { values: ['8', '9'] });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			kind: 'build',
			buildKind: 'barres',
			answer: '8 ; 9',
			status: 'incorrect',
			answers: [
				{ answer: '8', status: 'correct' },
				{ answer: '9', status: 'incorrect' }
			]
		});
	});
});

describe('échelle choisie par l’élève (axe: à choisir, § 24-25)', () => {
	const VILLES = ['Alphaville = 42', 'Bêtaville = 35', 'Gammaville = 18', 'axe: à choisir'];

	it('une case échelle d’abord, puis une case par barre', () => {
		const result = assignBlankIndices(bars(...VILLES, 'placer: toutes'));
		expect(result.totalBlanks).toBe(4);
		expect(result.blankTypes).toEqual(['math', 'math', 'math', 'math']);
	});

	it('réponses : la plus petite échelle où tout rentre, puis les effectifs', () => {
		const instance = generate(template({ statement: bars(...VILLES, 'placer: toutes') }));
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['5', '42', '35', '18']);
		// Note partielle : échelle trop grande, barres justes
		const verdict = validateAnswer(['10', '42', '35', '18'], instance, ['10', '42', '35', '18']);
		expect(verdict.isCorrect).toBe(false);
		expect(validateAnswer(['5', '42', '35', '18'], instance, ['5', '42', '35', '18']).status).toBe(
			'correct'
		);
	});

	it('variables : l’échelle suit les données tirées', () => {
		const instance = generate(
			template({
				statement: bars('A = {{n}}', 'B = 3', 'axe: à choisir', 'placer: toutes'),
				variables: [{ name: 'n', expression: '64' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('10');
	});

	it('résultat attendu : un diagramme, l’échelle puis chaque barre', () => {
		const instance = generate(template({ statement: bars(...VILLES, 'placer: toutes') }));
		const { lines } = buildExpectedResult(instance, { values: ['10', '42', '35', '18'] });
		const built = lines.filter((l) => l.kind === 'build');
		expect(built).toHaveLength(1);
		expect(built[0]).toMatchObject({
			buildKind: 'barres',
			status: 'incorrect',
			answers: [
				{ answer: '10', status: 'incorrect' },
				{ answer: '42', status: 'correct' },
				{ answer: '35', status: 'correct' },
				{ answer: '18', status: 'correct' }
			]
		});
	});
});
