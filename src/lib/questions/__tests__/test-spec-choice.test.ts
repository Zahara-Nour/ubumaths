/**
 * Test specs d'une case choix (chantier figure-et-choix, PR 1b) : la réponse
 * d'une case choix s'écrit dans `answers[i]` en indices d'origine (`"0;2"`).
 */
import { describe, it, expect } from 'vitest';
import { runTestSpec } from '../test-spec-runner';
import type { QuestionTemplate, TestSpec } from '../types';
import { templateMarkdown } from '$lib/ubumark';

function makeTemplate(statement: string, expectedAnswers: string[]): QuestionTemplate {
	return {
		id: 'test-spec-choix',
		title: 'Case choix',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(statement),
				variables: [{ name: 'a', expression: '{{random:1..10}}' }],
				blanks: expectedAnswers.map((expectedAnswer) => ({ expectedAnswer }))
			}
		],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	};
}

const SINGLE =
	'Combien fait ${{a}} + 1$ ?\n\n```choix\n- ${{eval:{{a}}+1}}$\n- ${{a}}$\n- $0$\n```';
const MULTIPLE = 'Lesquels sont pairs ?\n\n```choix\nplusieurs: oui\n- $2$\n- $3$\n- $4$\n```';
const MIXED =
	'Calcule ${{a}} + 1 = ?$\n\nEst-ce pair ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```';

function spec(answers: string[], status: TestSpec['expected']['status']): TestSpec {
	return { description: '', variables: { a: '3' }, answers, expected: { status } };
}

describe('test specs — case choix', () => {
	it('une bonne réponse en indice d’origine est juste', () => {
		const result = runTestSpec(makeTemplate(SINGLE, ['0']), spec(['0'], 'correct'));
		expect(result.error).toBeUndefined();
		expect(result.actual.status).toBe('correct');
	});

	it('un mauvais choix est faux', () => {
		const result = runTestSpec(makeTemplate(SINGLE, ['0']), spec(['2'], 'incorrect'));
		expect(result.actual.status).toBe('incorrect');
	});

	it('rien coché : vide', () => {
		const result = runTestSpec(makeTemplate(SINGLE, ['0']), spec([''], 'empty'));
		expect(result.actual.status).toBe('empty');
	});

	it('à plusieurs réponses : toutes = juste, une partie = forme non optimale', () => {
		const template = makeTemplate(MULTIPLE, ['0;2']);
		expect(runTestSpec(template, spec(['0;2'], 'correct')).actual.status).toBe('correct');
		expect(runTestSpec(template, spec(['2'], 'unoptimal_form')).actual.status).toBe(
			'unoptimal_form'
		);
	});

	it('mêlée à une case maths : chaque case dans son ordre', () => {
		const template = makeTemplate(MIXED, ['{{eval:{{a}}+1}}', '0']);
		expect(runTestSpec(template, spec(['4', '0'], 'correct')).actual.status).toBe('correct');
		expect(runTestSpec(template, spec(['4', '1'], 'incorrect')).passed).toBe(true);
	});
});
