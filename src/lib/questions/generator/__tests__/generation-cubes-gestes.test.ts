/**
 * Question à assemblage de cubes à geste (` ```cubes ` + `dessiner:` /
 * `retrouver:`, chantier `solides`, `docs/wip/solides-progress.md` § 7)
 *
 * Même patron que la figure à colorier : le bloc compte pour une case ; sa
 * réponse attendue est lue du bloc, jamais écrite dans le modèle ; la réponse de
 * l'élève (quadrillage colorié ou hauteurs) passe par un juge à part.
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
		id: 'test-cubes-gestes',
		title: 'Cubes',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const cubes = (...body: string[]) => ['```cubes', ...body, '```'].join('\n');

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — assemblage à geste', () => {
	it('une case texte, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(cubes('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(cubes('case: 0', 'hauteurs: 2 1 1 / 1 0 1', 'dessiner: face'));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'cubes', source: 'hauteurs: 2 1 1 / 1 0 1\ndessiner: face' }
		});
	});

	it('assemblage à regarder (sans geste) : aucune case', () => {
		expect(assignBlankIndices(cubes('hauteurs: 2 1')).totalBlanks).toBe(0);
	});

	it('bloc cité : pas de case, signalé', () => {
		const result = assignBlankIndices(
			['> ```cubes', '> hauteurs: 1', '> dessiner: face', '> ```'].join('\n')
		);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Un assemblage de cubes à geste doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('dessiner: — la case et sa réponse', () => {
	it('sans blanks[] : réponse attendue = la vue, jugée à une translation près', () => {
		const instance = generate(
			template({
				statement: `Colorie la vue de face.\n\n${cubes('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face')}`
			})
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: '100/111',
			construire: 'cubes'
		});
		const shifted = '00000/01000/01110/00000';
		expect(validateAnswer(shifted, instance, shifted).status).toBe('correct');
		const wrong = '00000/01100/01110/00000';
		expect(validateAnswer(wrong, instance, wrong).isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').status).toBe('empty');
		expect(isBlankValueCorrect(shifted, instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect(wrong, instance.blanks![0], instance)).toBe(false);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: cubes('hauteurs: {{a}} 1', 'dessiner: face'),
				variables: [{ name: 'a', expression: '3' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('10/10/11');
	});

	it('bloc en erreur : refusé avec son message', () => {
		const result = generateInstance(
			template({ statement: cubes('hauteurs: 2 1', 'dessiner: dessous') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(assemblage de cubes\).*dessous/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({
				statement: cubes('hauteurs: 2 1', 'dessiner: face'),
				blanks: [{ expectedAnswer: '11' }]
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*bloc cubes/i);
	});

	it('le validateur de modèle accepte une question sans blanks[]', () => {
		const errors = validateTemplate(
			template({ statement: cubes('hauteurs: 1', 'dessiner: face') })
		);
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});
});

describe('retrouver: — la case et sa réponse', () => {
	it('mêmes vues : plusieurs assemblages justes', () => {
		const instance = generate(
			template({ statement: cubes('hauteurs: 2 1 / 1 2', 'retrouver: face, droite') })
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'text',
			expectedAnswer: 'face, droite : 2 1 / 1 2',
			construire: 'cubes'
		});
		expect(validateAnswer('1 2 / 2 1', instance, '1 2 / 2 1').status).toBe('correct');
		expect(validateAnswer('2 2 / 1 1', instance, '2 2 / 1 1').isCorrect).toBe(false);
		expect(validateAnswer('2 - / 1 2', instance, '2 - / 1 2').isCorrect).toBe(false);
	});
});

describe('résultat attendu', () => {
	it('une ligne « build » cubes, la réponse de l’élève', () => {
		const instance = generate(
			template({ statement: `Colorie.\n\n${cubes('hauteurs: 2 1', 'dessiner: face')}` })
		);
		const { lines } = buildExpectedResult(instance, { values: ['0110'] });
		expect(lines.find((l) => l.kind === 'build')).toMatchObject({
			kind: 'build',
			buildKind: 'cubes',
			source: 'hauteurs: 2 1\ndessiner: face',
			answer: '0110',
			status: 'incorrect'
		});
	});

	it('rien colorié : « Tu n’as rien colorié. »', () => {
		const instance = generate(template({ statement: cubes('hauteurs: 2 1', 'dessiner: face') }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(lines.find((l) => l.kind === 'empty')).toMatchObject({
			text: expect.stringMatching(/rien colorié/)
		});
	});

	it('retrouver:, rien rempli : « Tu n’as pas rempli toutes les cases. »', () => {
		const instance = generate(template({ statement: cubes('hauteurs: 2 1', 'retrouver: face') }));
		const { lines } = buildExpectedResult(instance, { values: [''] });
		expect(lines.find((l) => l.kind === 'empty')).toMatchObject({
			text: expect.stringMatching(/pas rempli toutes les cases/)
		});
	});
});
