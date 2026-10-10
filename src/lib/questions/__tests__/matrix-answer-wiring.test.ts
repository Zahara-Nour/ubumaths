/**
 * Case « matrice » (`answerKind: 'matrice'`) dans toute la chaîne, câblée comme
 * la case « vecteur » : validateur (navigateur), barème serveur,
 * `orderIndependent`, générateur, schémas Zod, specs de test du modèle, verdicts
 * par case, version publique ; puis écriture de chaque coefficient jugée comme
 * une case ordinaire (comme les coordonnées d'un vecteur).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import { validateAnswer, validateBlanksDetailed } from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
const M = '\\begin{pmatrix}2&-1\\\\0&3\\end{pmatrix}';

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'matrice',
		statement: 'Calculer AB' as ResolvedMarkdown,
		blanks,
		grades: ['T_EXP'],
		theme: 'Graphes et matrices',
		domain: 'Matrices',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function matrixBlank(expectedAnswer: string): InstanceBlank {
	return { expectedAnswer, type: 'math', answerKind: 'matrice' };
}

function judge(answer: string, expected = M) {
	const result = validateAnswer([answer], instanceWith([matrixBlank(expected)]), [answer]);
	return { status: result.status ?? (result.isCorrect ? 'correct' : 'incorrect'), result };
}

function ordinary(answer: string, expected: string): string {
	const blank: InstanceBlank = { expectedAnswer: expected, type: 'math' };
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function productTemplate(expected = M): QuestionTemplate {
	return {
		id: 'test-matrice',
		title: 'Produit',
		status: 'draft',
		shared: { blankDefaults: { answerKind: 'matrice' } },
		variations: [
			{
				statement: templateMarkdown('$AB=?$'),
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '-1' }
				],
				blanks: [{ expectedAnswer: expected }]
			}
		],
		grades: ['T_EXP'],
		theme: 'Graphes et matrices',
		domain: 'Matrices',
		level: 1
	};
}

describe('validateAnswer : case matrice', () => {
	it.each([
		[M, 'correct'],
		// Écriture de MathLive (espaces) : juste — dans une case ordinaire, c'était faux
		['\\begin{pmatrix}2 & -1\\\\ 0 & 3\\end{pmatrix}', 'correct'],
		['\\begin{pmatrix}2&-1\\\\0&4\\end{pmatrix}', 'incorrect'],
		['\\begin{pmatrix}2&0\\\\-1&3\\end{pmatrix}', 'incorrect'],
		['', 'empty']
	] as const)('%s → %s', (answer, status) => {
		expect(judge(answer).status).toBe(status);
	});

	it('mauvaise dimension : message sous la case', () => {
		const { status, result } = judge('\\begin{pmatrix}2&-1\\end{pmatrix}');
		expect(status).toBe('incorrect');
		expect(result.feedback).toBe('La matrice attendue a 2 lignes et 2 colonnes.');
	});

	it('pas une matrice : message', () => {
		expect(judge('2').result.feedback).toMatch(/Écris une matrice/);
	});
});

describe('écriture des coefficients, comme une case ordinaire', () => {
	it('fraction égale à un entier : juste avec avertissement', () => {
		expect(ordinary('\\frac{4}{2}', '2')).toBe('unoptimal_form');
		const { status, result } = judge('\\begin{pmatrix}\\frac{4}{2}&-1\\\\0&3\\end{pmatrix}');
		expect(status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBe('La fraction peut être simplifiée.');
	});

	it('décimal pour une fraction attendue : même verdict qu’une case', () => {
		const expected = '\\begin{pmatrix}\\frac{1}{2}&0\\\\0&1\\end{pmatrix}';
		expect(ordinary('0.5', '\\frac{1}{2}')).toBe('bad_form');
		expect(judge('\\begin{pmatrix}0.5&0\\\\0&1\\end{pmatrix}', expected).status).toBe('bad_form');
	});

	it('calcul non effectué : même verdict qu’une case', () => {
		const single = ordinary('1+1', '2');
		expect(judge('\\begin{pmatrix}1+1&-1\\\\0&3\\end{pmatrix}').status).toBe(single);
	});

	it('valeur fausse : faux, sans message de forme', () => {
		const { status, result } = judge('\\begin{pmatrix}\\frac{4}{2}&-1\\\\0&4\\end{pmatrix}');
		expect(status).toBe('incorrect');
		expect(result.constraintViolations ?? []).toEqual([]);
	});
});

describe('facteur devant la matrice (décision du 2026-10-06)', () => {
	it('valeur juste : perfectible, avertissement « Distribue le facteur »', () => {
		const answer = '\\frac{1}{2}\\begin{pmatrix}4&-2\\\\0&6\\end{pmatrix}';
		const { status, result } = judge(answer);
		expect(status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBe('Distribue le facteur dans la matrice.');
		expect(result.constraintViolations?.map((v) => [v.constraint, v.severity])).toEqual([
			['form', 'warning']
		]);
		// Couleur de la case : la valeur est juste
		expect(computeBlankVerdicts([answer], instanceWith([matrixBlank(M)]))).toEqual([true]);
	});

	it('valeur fausse : faux', () => {
		const answer = '\\frac{1}{3}\\begin{pmatrix}4&-2\\\\0&6\\end{pmatrix}';
		expect(judge(answer).status).toBe('incorrect');
		expect(computeBlankVerdicts([answer], instanceWith([matrixBlank(M)]))).toEqual([false]);
	});
});

describe('acceptDecimal : attendue exacte, décimal exact juste dans chaque coefficient', () => {
	const expected =
		'\\begin{pmatrix}\\frac{7}{10}&\\frac{3}{10}\\\\\\frac{3}{5}&\\frac{2}{5}\\end{pmatrix}';
	function judgeDecimal(answer: string) {
		const blank: InstanceBlank = { ...matrixBlank(expected), acceptDecimal: true };
		const result = validateAnswer([answer], instanceWith([blank]), [answer]);
		return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
	}

	it.each([
		['\\begin{pmatrix}0.7&0.3\\\\0.6&0.4\\end{pmatrix}', 'correct'],
		['\\begin{pmatrix}0{,}7 & 0{,}3\\\\ 0{,}6 & 0{,}4\\end{pmatrix}', 'correct'],
		[expected, 'correct'],
		['\\begin{pmatrix}0.7&\\frac{3}{10}\\\\0.6&\\frac{2}{5}\\end{pmatrix}', 'correct'],
		['\\begin{pmatrix}0.7&0.3\\\\0.6&0.5\\end{pmatrix}', 'incorrect']
	] as const)('%s → %s', (answer, status) => {
		expect(judgeDecimal(answer)).toBe(status);
	});
});

describe('sans answerKind : rien ne change', () => {
	it('une matrice dans une case ordinaire garde son verdict', () => {
		expect(ordinary(M, M)).toBe('correct');
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		[M, 'correct', 1],
		['\\begin{pmatrix}2 & -1\\\\ 0 & 3\\end{pmatrix}', 'correct', 1],
		['\\begin{pmatrix}2&-1\\\\0&4\\end{pmatrix}', 'incorrect', 0],
		['', 'empty', 0]
	] as const)('%s → %s', (answer, status, points) => {
		const instance = instanceWith([matrixBlank(M)]);
		const browser = validateAnswer([answer], instance, [answer]);
		expect(browser.status ?? (browser.isCorrect ? 'correct' : 'incorrect')).toBe(status);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('orderIndependent', () => {
	const options = { orderIndependent: true };
	const A = '\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}';
	const B = '\\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}';

	it('dans le désordre, écriture de MathLive : juste', () => {
		const answers = ['\\begin{pmatrix}0 & 1\\\\ 1 & 0\\end{pmatrix}', A];
		const instance = instanceWith([matrixBlank(A), matrixBlank(B)], options);
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
	});

	it('fraction simplifiable appariée : avertissement gardé', () => {
		const answers = ['\\begin{pmatrix}0&\\frac{2}{2}\\\\1&0\\end{pmatrix}', A];
		const instance = instanceWith([matrixBlank(A), matrixBlank(B)], options);
		const statuses = validateBlanksDetailed(answers, instance, answers).statuses;
		expect(statuses).toEqual(['unoptimal_form', 'correct']);
	});
});

describe('verdicts par case (couleur des cases)', () => {
	it('écriture de MathLive : la case est verte', () => {
		const instance = instanceWith([matrixBlank(M)]);
		expect(
			computeBlankVerdicts(['\\begin{pmatrix}2 & -1\\\\ 0 & 3\\end{pmatrix}'], instance)
		).toEqual([true]);
	});
});

describe('générateur, schémas, version publique', () => {
	it('recopie answerKind, résout les variables, rend l’attendue en pmatrix', () => {
		const result = generateInstance(
			productTemplate('\\begin{bmatrix}{{a}}&{{b}}\\\\{{eval:a+b}}&0\\end{bmatrix}'),
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('matrice');
		expect(blank.expectedAnswer).toBe('\\begin{bmatrix}2&-1\\\\1&0\\end{bmatrix}');
		expect(blank.expectedAnswerLatex).toBe('\\begin{pmatrix}2&-1\\\\1&0\\end{pmatrix}');
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('matrice');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('cleanCoefficients ne touche pas une matrice', () => {
		const template = productTemplate('\\begin{pmatrix}1&{{b}}\\\\0&1\\end{pmatrix}');
		const result = generateInstance(
			{ ...template, shared: { ...template.shared, cleanCoefficients: true } },
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].expectedAnswer).toBe(
			'\\begin{pmatrix}1&-1\\\\0&1\\end{pmatrix}'
		);
	});

	it('schémas : answerKind matrice accepté (souple et strict)', () => {
		const { id: _id, ...withoutId } = productTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: M, answerKind: 'matrice' }).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ answerKind: 'matrice' }).success).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: M, answerKind: 'matrix' }).success).toBe(false);
		const strictCase = {
			...withoutId,
			variations: [
				{ ...withoutId.variations[0], blanks: [{ expectedAnswer: M, answerKind: 'matrice' }] }
			]
		};
		expect(questionTemplateSchema.safeParse(strictCase).success).toBe(true);
	});
});

describe('specs de test du modèle', () => {
	it('écriture de MathLive : la spec passe', () => {
		const result = runTestSpec(productTemplate(), {
			description: 'espaces',
			variables: { a: '2', b: '-1' },
			answers: ['\\begin{pmatrix}2 & -1\\\\ 0 & 3\\end{pmatrix}'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('attendue illisible : la spec échoue avec un message', () => {
		const result = runTestSpec(productTemplate('{{a}}&{{b}}'), {
			description: 'modèle fautif',
			variables: { a: '2', b: '-1' },
			answers: [M],
			expected: { status: 'incorrect' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/illisible/);
	});
});
