/**
 * Question à droite à graduer (` ```line ` + `graduer:`, outil n° 61, phase 0 :
 * `docs/wip/outil-graduer-segment-progress.md`)
 *
 * Une case pour le nombre de parts (case N, réponse `3`), puis une par point de
 * `placer:` (N + 1 + k) ; chaque point jugé sur sa valeur (10/6 vaut 5/3). Dans
 * l'énoncé envoyé, `graduer: ?` comme `placer: A=?`.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { isBlankValueCorrect } from '#lib/utils/answer-validator.ts';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';

function template(statement: string) {
	return {
		id: 'test-graduer',
		title: 'Graduer',
		status: 'draft',
		variations: [{ statement: templateMarkdown(statement) }],
		grades: ['6'],
		level: 1
	} as QuestionTemplate;
}

const line = (...body: string[]) => ['```line', ...body, '```'].join('\n');
const LINE = ['start: 0', 'end: 2', 'step: 1'];

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

describe('assignBlankIndices — droite à graduer', () => {
	it('une case pour les parts, une par point ; seul N est posé', () => {
		const result = assignBlankIndices(line(...LINE, 'graduer: 3', 'placer: A=5/3'));
		expect(result.totalBlanks).toBe(2);
		expect(result.blankTypes).toEqual(['math', 'math']);
		expect(result.statement).toBe(line('case: 0', ...LINE, 'graduer: 3', 'placer: A=5/3'));
	});

	it('sans placer: une seule case', () => {
		expect(assignBlankIndices(line(...LINE, 'graduer: 4')).totalBlanks).toBe(1);
	});
});

describe('droite à graduer : les cases et leurs réponses', () => {
	it('parts = « 3 », point = sa valeur ; juge sur les nombres', () => {
		const instance = generate(
			template(`Place A d’abscisse 5/3.\n\n${line(...LINE, 'graduer: 3', 'placer: A=5/3')}`)
		);
		const [parts, point] = instance.blanks ?? [];
		expect(parts).toMatchObject({ expectedAnswer: '3', construire: 'line' });
		expect(point).toMatchObject({ expectedAnswer: '\\frac{5}{3}', construire: 'line' });
		expect(isBlankValueCorrect('3', parts, instance)).toBe(true);
		expect(isBlankValueCorrect('6', parts, instance)).toBe(false);
		expect(isBlankValueCorrect('', parts, instance)).toBe(false);
		// 6 parts et A sur 10/6 : graduations fausses, A juste
		expect(isBlankValueCorrect('\\frac{5}{3}', point, instance)).toBe(true);
		expect(isBlankValueCorrect('\\frac{4}{3}', point, instance)).toBe(false);
		expect(isBlankValueCorrect('', point, instance)).toBe(false);
	});

	it('sans placer: la case des parts seule', () => {
		const instance = generate(template(line(...LINE, 'graduer: 4')));
		expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(['4']);
	});

	it('variable dans graduer: résolue avant le bloc', () => {
		const instance = generate({
			...template(line(...LINE, 'graduer: {{d}}')),
			variations: [
				{
					statement: templateMarkdown(line(...LINE, 'graduer: {{d}}')),
					variables: [{ name: 'd', expression: '5' }]
				}
			]
		} as QuestionTemplate);
		expect(instance.blanks?.[0].expectedAnswer).toBe('5');
	});

	it('point hors de la grille : refusé au générateur', () => {
		const result = generateInstance(template(line(...LINE, 'graduer: 3', 'placer: 5/4')), 42);
		expect(result.success).toBe(false);
	});

	it('graduer: ? écrit dans le modèle : refusé (rien à attendre)', () => {
		const result = generateInstance(template(line(...LINE, 'graduer: ?')), 42);
		expect(result.success).toBe(false);
	});
});

describe('énoncé envoyé : la réponse masquée', () => {
	it('graduer: ? et placer: A=?', () => {
		const sent = line('case: 0', ...LINE, 'graduer: 3', 'placer: A=5/3');
		expect(maskGestureAnswers(sent)).toBe(line('case: 0', ...LINE, 'graduer: ?', 'placer: A=?'));
		expect(maskGestureAnswers(line('case: 0', ...LINE, 'graduer: 4'))).toBe(
			line('case: 0', ...LINE, 'graduer: ?')
		);
	});

	it('la garde voit un nombre de parts non masqué', () => {
		expect(findUnmaskedAnswers(line(...LINE, 'graduer: 3'))).toEqual(['line']);
		expect(findUnmaskedAnswers(line(...LINE, 'graduer: 3', 'placer: A=?'))).toEqual(['line']);
		expect(findUnmaskedAnswers(line(...LINE, 'graduer: ?', 'placer: A=?'))).toEqual([]);
	});
});
