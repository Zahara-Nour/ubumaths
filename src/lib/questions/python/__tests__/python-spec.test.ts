/**
 * Specs d'un modèle à case « programme Python » (suite de l'outil 49, décision de David du
 * 2026-11-28) :
 * - Python seul : pas de spec exigée (le serveur ne fait pas tourner le programme) ;
 * - Python + une case ordinaire : spec exigée, comme tout modèle ;
 * - dans une spec, la case Python laissée vide (`""`) est comptée juste d'office : la spec
 *   vérifie vraiment la case ordinaire, et ne prétend rien sur le programme.
 */

import { describe, it, expect } from 'vitest';
import type { QuestionTemplate, TestSpec } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { checkTemplate } from '../../review/check-template';
import { runTestSpec } from '../../test-spec-runner';
import { writePythonAnswer } from '../python-answer';

const python = [
	'```python-a-ecrire',
	'fonction: seuil',
	'solution: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while u <= A:',
	'          u = 1.5 * u',
	'          n = n + 1',
	'      return n',
	'essais: seuil(2) ; seuil(100)',
	'```'
].join('\n');

const PYTHON_SEUL = `Écris la fonction \`seuil\`.\n\n${python}`;
const AVEC_RANG = `${PYTHON_SEUL}\n\nLe plus petit rang tel que $u_n > 100$ est $?$`;

function template(statement: string, testSpecs: TestSpec[] = []): QuestionTemplate {
	return {
		id: 'python-spec',
		title: 'Programme Python',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(statement),
				blanks: [{ expectedAnswer: '' }, { expectedAnswer: '10' }]
			}
		],
		grades: ['T_SPE'],
		level: 1,
		testSpecs
	} as QuestionTemplate;
}

function spec(answers: string[], status: 'correct' | 'incorrect'): TestSpec {
	return { description: `rang ${answers[1]}`, variables: {}, answers, expected: { status } };
}

describe('spec exigée selon les cases du modèle', () => {
	it('Python seul : pas de spec exigée', () => {
		const t = {
			...template(PYTHON_SEUL),
			variations: [{ statement: templateMarkdown(PYTHON_SEUL) }]
		};
		expect(checkTemplate(t as QuestionTemplate).reasons).not.toContain('aucune spec de test');
	});

	it('Python + une case ordinaire, sans spec : « aucune spec de test »', () => {
		expect(checkTemplate(template(AVEC_RANG)).reasons).toContain('aucune spec de test');
	});

	it('Python + une case ordinaire, avec une spec juste : pas de refus de spec', () => {
		const reasons = checkTemplate(template(AVEC_RANG, [spec(['', '10'], 'correct')])).reasons;
		expect(reasons).not.toContain('aucune spec de test');
		expect(reasons.filter((r) => r.includes('spec'))).toEqual([]);
	});
});

describe('la case Python laissée vide dans une spec est comptée juste', () => {
	it('bon rang → correct', () => {
		const result = runTestSpec(template(AVEC_RANG), spec(['', '10'], 'correct'));
		expect(result.actual.status).toBe('correct');
		expect(result.passed).toBe(true);
	});

	it('mauvais rang → incorrect : la case ordinaire est vraiment vérifiée', () => {
		const result = runTestSpec(template(AVEC_RANG), spec(['', '9'], 'correct'));
		expect(result.actual.status).not.toBe('correct');
		expect(result.passed).toBe(false);
	});

	it('une réponse écrite pour la case Python est gardée telle quelle (verdict faux → pas juste)', () => {
		const faux = writePythonAnswer({ code: 'def seuil(A): return 0', verdict: { juste: false } });
		const result = runTestSpec(template(AVEC_RANG), spec([faux, '10'], 'correct'));
		expect(result.actual.status).not.toBe('correct');
	});
});
