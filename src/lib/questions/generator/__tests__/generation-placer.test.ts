/**
 * Question à droite graduée à placer (` ```line ` + `placer:`, phase 0 :
 * `docs/wip/reponses-a-placer-progress.md` § 4, 6)
 *
 * Même patron que les blocs à construire : le bloc compte pour une case ; sa
 * réponse attendue est la graduation de `placer:`, jamais écrite dans le
 * modèle ; elle passe au juge ordinaire.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { graduationCount, placerAnswer } from '$lib/ubumark/utils/number-line-placer';

function template(variation: Omit<QuestionVariation, 'statement'> & { statement: string }) {
	return {
		id: 'test-placer',
		title: 'Placer',
		status: 'draft',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['CP'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

const line = (...body: string[]) => ['```line', ...body, '```'].join('\n');
const LINE_0_20 = ['start: 0', 'end: 20', 'step: 1'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — droite à placer', () => {
	it('une case, numéro posé dans le bloc', () => {
		const result = assignBlankIndices(line(...LINE_0_20, 'placer: 7'));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['math']);
		expect(result.statement).toBe(line('case: 0', ...LINE_0_20, 'placer: 7'));
		expect(result.buildBlanks).toEqual({
			0: { kind: 'line', source: [...LINE_0_20, 'placer: 7'].join('\n') }
		});
	});

	it('droite sans placer: : aucune case, bloc inchangé', () => {
		const statement = line(...LINE_0_20);
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.statement).toBe(statement);
	});

	it('dans l’ordre du texte avec une autre case', () => {
		const statement = [`Calcule $2+3=?$.`, '', line(...LINE_0_20, 'placer: 5')].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(2);
		expect(result.statement).toContain('case: 1');
		expect(Object.keys(result.buildBlanks ?? {})).toEqual(['1']);
	});

	it('bloc en retrait (liste) : pas de case, signalé', () => {
		const statement = [
			'- Place 7 :',
			'',
			'  ```line',
			'  start: 0',
			'  end: 9',
			'  step: 1',
			'  placer: 7',
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors).toEqual([
			'Une droite à placer doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});
});

describe('droite à placer : la case et sa réponse', () => {
	it('sans blanks[] : la case est créée, réponse = la graduation, juge ordinaire', () => {
		const instance = generate(
			template({ statement: `Place le nombre 7.\n\n${line(...LINE_0_20, 'placer: 7')}` })
		);
		expect(instance.blanks?.[0]).toMatchObject({
			type: 'math',
			expectedAnswer: '7',
			construire: 'line'
		});
		expect(validateAnswer('7', instance, '7').status).toBe('correct');
		expect(validateAnswer('9', instance, '9').isCorrect).toBe(false);
		expect(validateAnswer('', instance, '').isCorrect).toBe(false);
	});

	it('variables résolues avant le bloc', () => {
		const instance = generate(
			template({
				statement: line(...LINE_0_20, 'placer: {{a}}'),
				variables: [{ name: 'a', expression: '13' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('13');
	});

	it('fraction : réponse écrite comme celle de l’élève', () => {
		const instance = generate(
			template({ statement: line('start: 0', 'end: 2', 'step: 1/3', 'placer: 4/3') })
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('\\frac{4}{3}');
		expect(validateAnswer('\\frac{4}{3}', instance, '\\frac{4}{3}').status).toBe('correct');
		expect(validateAnswer('1', instance, '1').isCorrect).toBe(false);
	});

	it.each([
		[['start: 0', 'end: 1', 'step: 0.1'], '0.7', 7],
		[['start: -1', 'end: 1', 'step: 1/3'], '-1/3', 2],
		[['start: 0', 'end: 2', 'step: 1/4'], '0.75', 3],
		[['start: 0', 'end: 2', 'step: 0.25'], '3/4', 3],
		[['start: -5', 'end: 5', 'step: 1'], '-2', 3]
	] as const)('seule la graduation attendue est juste : %s, placer: %s', (decor, placer, rank) => {
		const instance = generate(template({ statement: line(...decor, `placer: ${placer}`) }));
		const c = parseNumberLineContent([...decor]).node!.config;
		for (let k = 0; k < graduationCount(c); k++) {
			const answer = placerAnswer(c, k);
			expect(validateAnswer(answer, instance, answer).status === 'correct').toBe(k === rank);
		}
	});

	it('placer: hors graduation : refusé avec son message', () => {
		const result = generateInstance(
			template({ statement: line('start: 0', 'end: 20', 'step: 2', 'placer: 7') }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(droite graduée\).*pas sur une graduation/);
	});

	it('une réponse écrite pour le bloc : refusée', () => {
		const result = generateInstance(
			template({ statement: line(...LINE_0_20, 'placer: 7'), blanks: [{ expectedAnswer: '7' }] }),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/case 1.*droite graduée/i);
	});

	it('bloc non fermé : refusé', () => {
		const result = generateInstance(
			template({
				statement: ['Place 7.', '```line', ...LINE_0_20, 'placer: 7', '', 'Fin.'].join('\n')
			}),
			42
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toMatch(/Case 1 \(droite graduée\).*non fermé/);
	});

	it('bloc montré dans un bloc de code : refusé', () => {
		const result = generateInstance(
			template({
				statement: ['Exemple :', '', '````text', line(...LINE_0_20, 'placer: 7'), '````'].join('\n')
			}),
			42
		);
		expect(result.success).toBe(false);
	});

	it('le validateur de modèle accepte une question sans blanks[] à droite à placer', () => {
		const errors = validateTemplate(template({ statement: line(...LINE_0_20, 'placer: 7') }));
		expect(errors.join(' ')).not.toMatch(/requires blanks/);
	});
});
