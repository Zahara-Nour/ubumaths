/**
 * Question à patron à geste (` ```patron ` + `designer:` / `completer:`,
 * chantier `solides`, `docs/archive/wip/solides-progress.md` § 10)
 *
 * Même patron que l'assemblage de cubes à geste : le bloc compte pour une case ;
 * sa réponse attendue est lue du bloc (calculée par le pliage), jamais écrite
 * dans le modèle ; la réponse de l'élève passe par un juge à part.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import { buildExpectedResult } from '../../expected-result';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-patron-gestes',
		title: 'Patron',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CM1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const patron = (...body: string[]) => ['```patron', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — patron à geste', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(
			patron('solide: cube', 'marquer: face 1', 'designer: opposee')
		);
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(
			patron('case: 0', 'solide: cube', 'marquer: face 1', 'designer: opposee')
		);
		expect(result.buildBlanks).toEqual({
			0: { kind: 'patron', source: 'solide: cube\nmarquer: face 1\ndesigner: opposee' }
		});
	});

	it('patron à regarder (sans geste) : aucune case', () => {
		expect(assignBlankIndices(patron('solide: cube', 'forme: 3')).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(
			['> ```patron', '> solide: cube', '> completer: 5', '> ```'].join('\n')
		);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un patron à geste doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});

	it('un assemblage de cubes et un patron à geste : deux cases, dans l’ordre', () => {
		const result = assignBlankIndices(
			[
				patron('solide: cube', 'designer: face EFGH'),
				'',
				'```cubes',
				'hauteurs: 1',
				'dessiner: face',
				'```'
			].join('\n')
		);
		expect(result.totalBlanks).toBe(2);
		expect(result.buildBlanks?.[0].kind).toBe('patron');
		expect(result.buildBlanks?.[1].kind).toBe('cubes');
	});
});

describe('designer: — la case et sa réponse', () => {
	it('sans blanks[] : réponse attendue = la face opposée, mêmes faces', () => {
		const instance = generate(
			template({
				statement: `Touche la face opposée à la face grise.\n\n${patron('solide: cube', 'forme: 1', 'marquer: face 1', 'designer: opposee')}`
			})
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '6',
			construire: 'patron'
		});
		expect(validateAnswer('6', instance, '6').status).toBe('correct');
		expect(validateAnswer('3', instance, '3').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').status).toBe('empty');
		expect(isBlankValueCorrect('6', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('3,6', instance.blanks![0], instance)).toBe(false);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: patron('solide: cube', 'forme: 1', 'marquer: face {{n}}', 'designer: opposee'),
				variables: [{ name: 'n', expression: '2' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('4');
	});

	it('bloc en erreur : refusé avec son message', () => {
		const result = generateInstance(
			template({ statement: patron('solide: pyramide carree 4 3', 'designer: opposee') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(patron à geste\).*face/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: patron('solide: cube', 'designer: face EFGH'),
				blanks: [{ expectedAnswer: '6' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*bloc patron/i);
	});

	it('le validateur de modèle accepte une question sans blanks[]', () => {
		const errors = validateTemplate(
			template({ statement: patron('solide: cube', 'completer: 5') })
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});
});

describe('completer: — la case et sa réponse', () => {
	it('toute pose qui se plie est juste', () => {
		const instance = generate(
			template({ statement: patron('solide: cube', 'forme: 1', 'completer: 5') })
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '00000/00100/01112/00100/00000',
			construire: 'patron'
		});
		const left = '00000/00100/21110/00100/00000';
		expect(validateAnswer(left, instance, left).status).toBe('correct');
		const square = '00000/02100/01110/00100/00000';
		expect(validateAnswer(square, instance, square).isCorrect).toBe(false);
	});
});

describe('résultat attendu', () => {
	it('une ligne « build » patron, la réponse de l’élève', () => {
		const instance = generate(
			template({ statement: `Touche.\n\n${patron('solide: cube', 'designer: face EFGH')}` })
		);
		const { lines } = buildExpectedResult(instance, { values: ['2'] });
		expect(lines.find((l) => l.kind === 'build')).toMatchObject({
			kind: 'build',
			buildKind: 'patron',
			source: 'solide: cube\ndesigner: face EFGH',
			answer: '2',
			status: 'incorrect'
		});
	});

	it('rien touché, rien posé', () => {
		const touched = generate(
			template({ statement: patron('solide: cube', 'designer: face EFGH') })
		);
		expect(
			buildExpectedResult(touched, { values: [''] }).lines.find((l) => l.kind === 'empty')
		).toMatchObject({ text: expect.stringMatching(/touché aucune face/) });
		const placed = generate(template({ statement: patron('solide: cube', 'completer: 5') }));
		expect(
			buildExpectedResult(placed, { values: [''] }).lines.find((l) => l.kind === 'empty')
		).toMatchObject({ text: expect.stringMatching(/posé aucune face/) });
	});
});
