/**
 * Question « programme Python » (bloc ```python-a-ecrire, outil 49 ; chantier `outil-python`,
 * journal `docs/wip/outil-python-progress.md`)
 *
 * Une case par bloc ; réponse attendue = la fonction, la solution de l'auteur, les essais et
 * les exigences (variables résolues), jamais écrite dans le modèle. La case est jugée dans le
 * navigateur AVANT la validation : le juge lit le verdict rangé dans la valeur. Jamais dans
 * une évaluation notée ni corrigée par le serveur (Q1).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import { validateTemplate } from '../../validators/template-validator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { validateAnswer } from '#lib/utils/answer-validator.ts';
import { buildExpectedResult, EMPTY_PROGRAM_TEXT } from '../../expected-result';
import { findUnmaskedAnswers, maskGestureAnswers } from '../../masked-statement';
import { gradeQuestion } from '../../grading';
import { checkTemplate } from '../../review/check-template';
import { drawSeriesQuestions } from '../../series-items';
import { isCombatInstance } from '#lib/descente/combat-templates.ts';
import {
	PYTHON_NOT_RUN,
	readExpectedPythonAnswer,
	writePythonAnswer
} from '../../python/python-answer';
import { hasPythonCase } from '../../python/python-case';

const SOLUTION = [
	'solution: |',
	'  def seuil(A):',
	'      u = {{u0}}',
	'      n = 0',
	'      while u <= A:',
	'          u = {{q}} * u',
	'          n = n + 1',
	'      return n'
];
const CORPS = [
	'fonction: seuil',
	'depart: |',
	'  def seuil(A):',
	'      u = {{u0}}',
	'      return 0',
	...SOLUTION,
	'essais: seuil(2) ; seuil(100)',
	'exiger: boucle'
];
const python = (...body: string[]) => ['```python-a-ecrire', ...body, '```'].join('\n');
const ENONCE = `Écris la fonction \`seuil\`.\n\n${python(...CORPS)}`;
const VARIABLES = [
	{ name: 'u0', expression: '2' },
	{ name: 'q', expression: '1.5' }
];

function template(
	variation: Omit<QuestionVariation, 'statement'> & { statement: string },
	id = 'test-python'
) {
	return {
		id,
		title: 'Programme Python',
		status: 'draft',
		variations: [
			{ variables: VARIABLES, ...variation, statement: templateMarkdown(variation.statement) }
		],
		grades: ['T_SPE'],
		level: 1
	} as QuestionTemplate;
}

function generate(t: QuestionTemplate) {
	const result = generateInstance(t, 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function generationErrors(t: QuestionTemplate): string {
	const result = generateInstance(t, 42);
	expect(result.success).toBe(false);
	return result.success ? '' : result.errors.join(' ; ');
}

const juste = writePythonAnswer({ code: 'def seuil(A): ...', verdict: { juste: true } });

describe('assignBlankIndices — programme Python', () => {
	it('une case texte, `case:` posée dans le bloc', () => {
		const result = assignBlankIndices(python(...CORPS));
		expect(result.totalBlanks).toBe(1);
		expect(result.blankTypes).toEqual(['text']);
		expect(result.statement).toBe(python('case: 0', ...CORPS));
		expect(result.buildBlanks).toEqual({ 0: { kind: 'python', source: CORPS.join('\n') } });
	});

	it('bloc dans une liste : pas de case, signalé', () => {
		const statement = [
			'- Écris :',
			'',
			'  ```python-a-ecrire',
			...CORPS.map((l) => `  ${l}`),
			'  ```'
		].join('\n');
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.buildErrors?.join(' ')).toMatch(
			/Un programme Python doit être au premier niveau/
		);
	});
});

describe('programme Python : la case et sa réponse', () => {
	it('réponse attendue lisible, variables résolues ; corrigé = la solution', () => {
		const instance = generate(template({ statement: ENONCE }));
		const blank = instance.blanks![0];
		expect([blank.type, blank.construire]).toEqual(['text', 'python']);
		const attendu = readExpectedPythonAnswer(blank.expectedAnswer);
		expect(attendu).toEqual({
			fonction: 'seuil',
			solution: [
				'def seuil(A):',
				'    u = 2',
				'    n = 0',
				'    while u <= A:',
				'        u = 1.5 * u',
				'        n = n + 1',
				'    return n'
			].join('\n'),
			essais: ['seuil(2)', 'seuil(100)'],
			exiger: ['boucle']
		});
		expect(blank.expectedAnswerLatex).toBe(attendu?.solution);
	});

	it('le juge lit le verdict rangé dans la valeur ; sans verdict ou illisible : faux', () => {
		const instance = generate(template({ statement: ENONCE }));
		expect(validateAnswer([juste], instance, [juste]).status).toBe('correct');
		const faux = writePythonAnswer({
			code: 'def seuil(A): return 0',
			verdict: { juste: false, message: '`seuil(2)` : ta fonction rend 0, on attendait 1.' }
		});
		const verdict = validateAnswer([faux], instance, [faux]);
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback).toBe('`seuil(2)` : ta fonction rend 0, on attendait 1.');
		const pasLance = writePythonAnswer({ code: 'def seuil(A): return 1', verdict: null });
		expect(validateAnswer([pasLance], instance, [pasLance]).feedback).toBe(PYTHON_NOT_RUN);
		expect(validateAnswer(['def seuil(A): return 1'], instance, ['x']).isCorrect).toBe(false);
		expect(validateAnswer([''], instance, ['']).isCorrect).toBe(false);
	});

	it('fonction, solution ou essais manquants, essai sans la fonction : refusés au prof', () => {
		expect(generationErrors(template({ statement: python(...CORPS.slice(1)) }))).toMatch(
			/Case 1 \(programme Python\).*il manque la ligne fonction:/
		);
		expect(
			generationErrors(
				template({ statement: python(...CORPS.filter((l) => !l.startsWith('essais'))) })
			)
		).toMatch(/il manque la ligne essais:/);
		expect(
			generationErrors(
				template({ statement: python(...CORPS.map((l) => l.replace('seuil(100)', 'print(100)'))) })
			)
		).toMatch(/essai « print\(100\) » n’appelle pas la fonction seuil/);
		const report = checkTemplate(template({ statement: python(...CORPS.slice(0, 5)) }));
		expect(report.passed).toBe(false);
	});

	it('`case:` écrite par le prof, réponse écrite dans blanks[] : refusées', () => {
		expect(generationErrors(template({ statement: python('case: 0', ...CORPS) }))).toMatch(
			/case: est posée automatiquement/
		);
		expect(
			generationErrors(template({ statement: python(...CORPS), blanks: [{ expectedAnswer: 'x' }] }))
		).toMatch(/Case 1.*programme Python/);
	});

	it('le validateur de modèle accepte une question sans blanks[] à programme Python', () => {
		expect(validateTemplate(template({ statement: ENONCE })).join(' ')).not.toMatch(
			/requires blanks/
		);
	});

	it('modèle bien écrit : checkTemplate le dit importable', () => {
		const report = checkTemplate(template({ statement: ENONCE }));
		expect(report.reasons).toEqual([]);
	});

	it('copie corrigée : une ligne pour le bloc ; sans programme, « aucun programme »', () => {
		const instance = generate(template({ statement: ENONCE }));
		const builds = buildExpectedResult(instance, { values: [juste] }).lines.filter(
			(l) => l.kind === 'build'
		);
		expect(builds).toHaveLength(1);
		expect(builds[0]).toMatchObject({ kind: 'build', buildKind: 'python', status: 'correct' });
		expect(JSON.stringify(buildExpectedResult(instance, { values: [''] }).lines)).toContain(
			EMPTY_PROGRAM_TEXT
		);
	});
});

describe('jamais corrigé par le serveur (Q1)', () => {
	it('un modèle à programme Python est repéré, dans le tronc commun ou une variation', () => {
		expect(hasPythonCase(template({ statement: ENONCE }))).toBe(true);
		expect(
			hasPythonCase(
				template({ statement: 'Combien font 2 + 2 ? [_]', blanks: [{ expectedAnswer: '4' }] })
			)
		).toBe(false);
		expect(
			hasPythonCase({
				shared: { statement: templateMarkdown(ENONCE) },
				variations: [{ statement: templateMarkdown('') }]
			})
		).toBe(true);
	});

	it('tirage d’une évaluation (`excludePythonCases`) : le modèle est écarté', () => {
		const items = [
			{ templateId: 'test-python', quantity: 1, delay: 20 },
			{ templateId: 'test-calcul', quantity: 1, delay: 20 }
		];
		const templates = [
			template({ statement: ENONCE }),
			template(
				{ statement: 'Combien font 2 + 2 ? [_]', blanks: [{ expectedAnswer: '4' }] },
				'test-calcul'
			)
		];
		const draws = drawSeriesQuestions(items, templates, { excludePythonCases: true });
		expect(draws.map((d) => d.template.id)).toEqual(['test-calcul']);
		expect(drawSeriesQuestions(items, templates).map((d) => d.template.id)).toEqual([
			'test-python',
			'test-calcul'
		]);
	});

	it('énoncé masqué d’évaluation : la solution y reste, la garde des fuites l’écarte', () => {
		const instance = generate(template({ statement: ENONCE }));
		expect(findUnmaskedAnswers(maskGestureAnswers(String(instance.statement)))).toContain('python');
	});

	it('note serveur (`gradeQuestion`) : un verdict « juste » venu du navigateur n’est jamais cru', () => {
		const instance = generate(template({ statement: ENONCE }));
		expect(gradeQuestion(instance, { values: [juste] })).toMatchObject({
			status: 'incorrect',
			points: 0,
			isCorrect: false
		});
	});

	it('combat de la Descente : jamais une question Python', () => {
		expect(isCombatInstance(generate(template({ statement: ENONCE })))).toBe(false);
	});
});
