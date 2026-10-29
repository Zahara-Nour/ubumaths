/**
 * Question à figure à colorier (` ```partage ` + `colorier:`, chantier
 * `docs/wip/fractions-a-colorier-progress.md` § 4, 6)
 *
 * Même patron que l'horloge à placer : le bloc compte pour une case ; sa réponse
 * attendue est lue du bloc (`3/8`), jamais écrite dans le modèle ; la réponse de
 * l'élève (les rangs coloriés) passe par un juge à part.
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
		id: 'test-partage-colorier',
		title: 'Colorier',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CM1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const fig = (...body: string[]) => ['```partage', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — figure à colorier', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(fig('forme: bande 8', 'colorier: 3/8'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(fig('case: 0', 'forme: bande 8', 'colorier: 3/8'));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'partage', source: 'forme: bande 8\ncolorier: 3/8' }
		});
	});

	it('figure à interpréter (gris:) : aucune case', () => {
		expect(assignBlankIndices(fig('forme: bande 8', 'gris: 3')).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(['> ```partage', '> colorier: 1/2', '> ```'].join('\n'));
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Une figure à colorier doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('figure à colorier : la case et sa réponse', () => {
	it('sans blanks[] : la case est créée, réponse = parts à colorier / total', () => {
		const instance = generate(
			template({ statement: `Colorie les 3/8.\n\n${fig('forme: bande 8', 'colorier: 3/8')}` })
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '3/8',
			construire: 'partage'
		});
		expect(validateAnswer('2, 5, 8', instance, '2, 5, 8').status).toBe('correct');
		expect(validateAnswer('1, 2', instance, '1, 2').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').status).toBe('empty');
		expect(isBlankValueCorrect('1, 2, 3', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('1, 2', instance.blanks![0], instance)).toBe(false);
	});

	it('deux parts sur quatre : juste pour 1/2', () => {
		const instance = generate(template({ statement: fig('forme: bande 4', 'colorier: 1/2') }));
		expect(instance.blanks?.[0].expectedAnswer).toBe('2/4');
		expect(validateAnswer('1, 4', instance, '1, 4').status).toBe('correct');
	});

	it('plusieurs figures (unites:) : 7/4, sept parts quelconques des trois bandes', () => {
		const instance = generate(
			template({ statement: fig('forme: bande 4', 'unites: 3', 'colorier: 7/4') })
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('7/4');
		expect(validateAnswer('1, 2, 3, 4, 5, 6, 9', instance, '1, 2, 3, 4, 5, 6, 9').status).toBe(
			'correct'
		);
		expect(validateAnswer('1, 2, 3, 4', instance, '1, 2, 3, 4').isCorrect).toBe(false);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: fig('forme: bande {{d}}', 'colorier: {{n}}/{{d}}'),
				variables: [
					{ name: 'n', expression: '3' },
					{ name: 'd', expression: '8' }
				]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('3/8');
	});

	it('fraction qui ne tombe pas juste : refusée avec son message', () => {
		const result = generateInstance(
			template({ statement: fig('forme: bande 8', 'colorier: 1/3') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(figure à colorier\).*ne tombe pas juste/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: fig('forme: bande 8', 'colorier: 3/8'),
				blanks: [{ expectedAnswer: '3/8' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*fraction du bloc partage \(colorier:\)/i);
	});

	it('le validateur de modèle accepte une question sans blanks[]', () => {
		const errors = validateTemplate(
			template({ statement: fig('forme: bande 8', 'colorier: 3/8') })
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});

	it('résultat attendu : une ligne « build » partage, la réponse de l’élève', () => {
		const instance = generate(
			template({ statement: `Colorie.\n\n${fig('forme: bande 8', 'colorier: 3/8')}` })
		);
		const { lines } = buildExpectedResult(instance, { values: ['1, 2'] });
		expect(lines.find((l) => l.kind === 'build')).toMatchObject({
			kind: 'build',
			buildKind: 'partage',
			source: 'forme: bande 8\ncolorier: 3/8',
			answer: '1, 2',
			status: 'incorrect'
		});
	});

	it('résultat attendu, rien colorié : « Tu n’as rien colorié. »', () => {
		const instance = generate(template({ statement: fig('forme: bande 8', 'colorier: 3/8') }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(lines.find((l) => l.kind === 'empty')).toMatchObject({
			text: expect.stringMatching(/rien colorié/)
		});
	});
});
