/**
 * Cases « primitive » et « solution-ed » dans toute la chaîne, comme la case
 * « vecteur » (vector-answer-wiring.test.ts) : validateur (navigateur), barème
 * serveur, `orderIndependent`, générateur, schémas Zod, specs de test du modèle,
 * verdicts par case, version publique. Comportements validés par David
 * (Phase 0, 2026-10-04).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import { validateAnswer, validateBlanksDetailed } from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'analyse',
		statement: 'Donner une primitive' as ResolvedMarkdown,
		blanks,
		grades: ['T_SPE'],
		theme: 'Analyse',
		domain: 'Primitives',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function primitiveBlank(integrand: string, extra: Partial<InstanceBlank> = {}): InstanceBlank {
	return { expectedAnswer: 'x^3', type: 'math', answerKind: 'primitive', integrand, ...extra };
}

function solutionBlank(equation: string, extra: Partial<InstanceBlank> = {}): InstanceBlank {
	return {
		expectedAnswer: 'Ce^{2x}+3',
		type: 'math',
		answerKind: 'solution-ed',
		equation,
		...extra
	};
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function templateWith(blank: TemplateBlank, id = 'test-calculus'): QuestionTemplate {
	return {
		id,
		title: 'Analyse',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Réponse : $?$'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '2' }
				],
				blanks: [blank]
			}
		],
		grades: ['T_SPE'],
		theme: 'Analyse',
		domain: 'Primitives',
		level: 1
	};
}

const PRIMITIVE_TEMPLATE_BLANK: TemplateBlank = {
	expectedAnswer: 'x^{{a}}',
	answerKind: 'primitive',
	integrand: '{{a}}x^{{b}}'
};

const SOLUTION_TEMPLATE_BLANK: TemplateBlank = {
	expectedAnswer: 'Ce^{ {{b}}x}+{{a}}',
	answerKind: 'solution-ed',
	solutionMode: 'generale',
	equation: "y'={{b}}y-{{eval:{{a}}*{{b}}}}"
};

describe('validateAnswer : case primitive (f = 3x²)', () => {
	it.each([
		['x^3', 'correct'],
		['x^3+5', 'correct'],
		['x^3+C', 'correct'],
		['6x', 'incorrect'],
		['3x^3', 'incorrect'],
		['\\frac{3x^3}{3}', 'unoptimal_form'],
		['x^{3', 'incorrect'],
		['', 'empty']
	] as const)('%s → %s', (answer, status) => {
		expect(statusOf(answer, primitiveBlank('3x^2'))).toBe(status);
	});

	it('la dérivée : message sous la case', () => {
		const result = validateAnswer(['6x'], instanceWith([primitiveBlank('3x^2')]), ['6x']);
		expect(result.feedback).toBe("C'est la dérivée de f, pas une primitive.");
	});

	it('fraction simplifiable : même message qu’une case ordinaire', () => {
		const result = validateAnswer(['\\frac{3x^3}{3}'], instanceWith([primitiveBlank('3x^2')]), [
			'\\frac{3x^3}{3}'
		]);
		expect(result.feedback).toBe('La fraction peut être simplifiée.');
	});

	it('intervalle : ln(-x) faux pour 1/x sur ]0;+∞[, ln|x| juste', () => {
		const blank = primitiveBlank('\\frac{1}{x}', {
			expectedAnswer: '\\ln(x)',
			interval: ']0;+\\infty['
		});
		expect(statusOf('\\ln(-x)', blank)).toBe('incorrect');
		expect(statusOf('\\ln|x|', blank)).toBe('correct');
	});

	it('trop complexe : garde Q58', () => {
		const huge = `x^3+${'('.repeat(60)}1${')'.repeat(60)}`;
		expect(statusOf(huge, primitiveBlank('3x^2'))).toBe('incorrect');
	});
});

describe('validateAnswer : case solution-ed', () => {
	it.each([
		["y'=2y", 'generale', 'Ce^{2x}', 'correct'],
		["y'=2y", 'generale', 'Ce^{2x}+3', 'incorrect'],
		["y'=2y-6", 'generale', 'Ce^{2x}+3', 'correct'],
		["y'=2y", 'generale', '5e^{2x}', 'incorrect'],
		["y'=2y", 'une', '5e^{2x}', 'correct'],
		["y'=2y", 'une', 'Ce^{2x}', 'correct'],
		["y'=2y-6", 'generale', '\\frac{6}{2}+Ce^{2x}', 'unoptimal_form'],
		["y'=2y-6", 'generale', '', 'empty']
	] as const)('%s (%s) : %s → %s', (equation, solutionMode, answer, status) => {
		expect(statusOf(answer, solutionBlank(equation, { solutionMode }))).toBe(status);
	});

	it('solution particulière en mode generale : message', () => {
		const blank = solutionBlank("y'=2y", { solutionMode: 'generale' });
		const result = validateAnswer(['5e^{2x}'], instanceWith([blank]), ['5e^{2x}']);
		expect(result.feedback).toBe("C'est une solution particulière : il manque la constante.");
	});
});

describe('sans answerKind : rien ne change', () => {
	it('x^3+5 dans une case ordinaire reste faux', () => {
		expect(statusOf('x^3+5', { expectedAnswer: 'x^3', type: 'math' })).toBe('incorrect');
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		[primitiveBlank('3x^2'), 'x^3+C', 'correct', 1],
		[primitiveBlank('3x^2'), '6x', 'incorrect', 0],
		[solutionBlank("y'=2y-6", { solutionMode: 'generale' }), 'Ce^{2x}+3', 'correct', 1],
		[solutionBlank("y'=2y", { solutionMode: 'generale' }), '5e^{2x}', 'incorrect', 0],
		[primitiveBlank('3x^2'), '', 'empty', 0]
	] as const)('%#', (blank, answer, status, points) => {
		const instance = instanceWith([blank]);
		const browser = validateAnswer([answer], instance, [answer]);
		expect(browser.status ?? (browser.isCorrect ? 'correct' : 'incorrect')).toBe(status);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('orderIndependent', () => {
	const options = { orderIndependent: true };
	const blanks = [primitiveBlank('3x^2'), primitiveBlank('2x', { expectedAnswer: 'x^2' })];

	it('dans le désordre : juste', () => {
		const answers = ['x^2+1', 'x^3+C'];
		const instance = instanceWith(blanks, options);
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
	});

	it('appariée : l’écriture est jugée (fraction simplifiable)', () => {
		const answers = ['x^2', '\\frac{3x^3}{3}'];
		const instance = instanceWith(blanks, options);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'unoptimal_form'
		]);
	});

	it('la dérivée : faux', () => {
		const answers = ['6x', 'x^2'];
		expect(validateAnswer(answers, instanceWith(blanks, options), answers).isCorrect).toBe(false);
	});
});

describe('verdicts par case (couleur des cases)', () => {
	it('primitive à une constante près : verte', () => {
		expect(computeBlankVerdicts(['x^3+7'], instanceWith([primitiveBlank('3x^2')]))).toEqual([true]);
	});

	it('solution-ed écrite autrement : verte', () => {
		const blank = solutionBlank("y'=2y-6", { solutionMode: 'generale' });
		expect(computeBlankVerdicts(['3+Ke^{2x}'], instanceWith([blank]))).toEqual([true]);
	});
});

describe('générateur, schémas, version publique', () => {
	it('primitive : recopie answerKind et les champs résolus', () => {
		const result = generateInstance(
			templateWith({ ...PRIMITIVE_TEMPLATE_BLANK, interval: ']0;+\\infty[', variable: 'x' }),
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('primitive');
		expect(blank.integrand).toBe('3x^2');
		expect(blank.interval).toBe(']0;+\\infty[');
		expect(blank.variable).toBe('x');
		expect(blank.expectedAnswer).toBe('x^3');
		expect(blank.equation).toBeUndefined();
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('primitive');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('solution-ed : recopie équation, mode, condition initiale résolus', () => {
		const result = generateInstance(
			templateWith({ ...SOLUTION_TEMPLATE_BLANK, function: 'y', initial: 'y(0)={{a}}' }),
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('solution-ed');
		expect(blank.equation).toBe("y'=2y-6");
		expect(blank.solutionMode).toBe('generale');
		expect(blank.function).toBe('y');
		expect(blank.initial).toBe('y(0)=3');
		expect(blank.integrand).toBeUndefined();
	});

	it('champs hérités de blankDefaults', () => {
		const template = templateWith({ expectedAnswer: 'x^{{a}}' });
		const result = generateInstance(
			{
				...template,
				shared: { blankDefaults: { answerKind: 'primitive', integrand: '{{a}}x^{{b}}' } }
			},
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].integrand).toBe('3x^2');
	});

	it('primitive sans fonction à intégrer : génération en échec', () => {
		const result = generateInstance(
			templateWith({ expectedAnswer: 'x^3', answerKind: 'primitive' }),
			1
		);
		expect(result.success).toBe(false);
	});

	it('schémas : nouveaux answerKind et champs acceptés, valeurs bornées', () => {
		const { id: _id, ...withoutId } = templateWith(SOLUTION_TEMPLATE_BLANK);
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const { id: _id2, ...primitive } = templateWith({
			...PRIMITIVE_TEMPLATE_BLANK,
			interval: ']0;+\\infty[',
			variable: 'x'
		});
		expect(questionTemplateSchema.safeParse(primitive).success).toBe(true);
		expect(
			blankSchema.safeParse({
				expectedAnswer: 'x^3',
				answerKind: 'primitive',
				integrand: '3x^2',
				variable: 'x'
			}).success
		).toBe(true);
		expect(
			blankDefaultsSchema.safeParse({
				answerKind: 'solution-ed',
				solutionMode: 'une',
				equation: "y'=y",
				function: 'y',
				initial: 'y(0)=1'
			}).success
		).toBe(true);
		// Mode inconnu, chaîne démesurée, nom de variable qui n'est pas une lettre
		expect(blankSchema.safeParse({ expectedAnswer: 'x', solutionMode: 'general' }).success).toBe(
			false
		);
		expect(
			blankSchema.safeParse({ expectedAnswer: 'x', integrand: 'x'.repeat(2001) }).success
		).toBe(false);
		expect(blankSchema.safeParse({ expectedAnswer: 'x', variable: 'xy' }).success).toBe(false);
		expect(blankSchema.safeParse({ expectedAnswer: 'x', function: '1' }).success).toBe(false);
	});
});

describe('specs de test du modèle', () => {
	it('primitive à une constante près : la spec passe', () => {
		const result = runTestSpec(templateWith(PRIMITIVE_TEMPLATE_BLANK), {
			description: 'constante',
			variables: { a: '3', b: '2' },
			answers: ['x^3+C'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it.each([
		['\\frac{3x^3}{3}', 'unoptimal_form', ['reducedFractions']],
		['6x', 'incorrect', []]
	] as const)('primitive %s : spec %s', (answer, status, constraintViolations) => {
		const result = runTestSpec(templateWith(PRIMITIVE_TEMPLATE_BLANK), {
			description: status,
			variables: { a: '3', b: '2' },
			answers: [answer],
			expected: { status, constraintViolations: [...constraintViolations] }
		});
		expect(result.passed).toBe(true);
	});

	it('fraction simplifiable en contrainte stricte : spec bad_form', () => {
		const template = {
			...templateWith(PRIMITIVE_TEMPLATE_BLANK),
			options: { constraints: { reducedFractions: 'strict' as const } }
		};
		const result = runTestSpec(template, {
			description: 'bad_form',
			variables: { a: '3', b: '2' },
			answers: ['\\frac{3x^3}{3}'],
			expected: { status: 'bad_form', constraintViolations: ['reducedFractions', 'form'] }
		});
		// Même jugement qu'une case ordinaire comparée à elle-même en contrainte stricte
		expect(result.actual.status).toBe('bad_form');
		expect(result.passed).toBe(true);
	});

	it('attendue qui n’est pas une primitive : erreur du modèle', () => {
		const result = runTestSpec(
			templateWith({ ...PRIMITIVE_TEMPLATE_BLANK, expectedAnswer: 'x^4' }),
			{
				description: 'modèle fautif',
				variables: { a: '3', b: '2' },
				answers: ['x^3'],
				expected: { status: 'correct' }
			}
		);
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/primitive/);
	});

	it('solution-ed : la spec passe, attendue fausse = erreur du modèle', () => {
		const ok = runTestSpec(templateWith(SOLUTION_TEMPLATE_BLANK), {
			description: 'générale',
			variables: { a: '3', b: '2' },
			answers: ['3+Ke^{2x}'],
			expected: { status: 'correct' }
		});
		expect(ok.passed).toBe(true);
		const broken = runTestSpec(
			templateWith({ ...SOLUTION_TEMPLATE_BLANK, expectedAnswer: 'Ce^{ {{b}}x}' }),
			{
				description: 'modèle fautif',
				variables: { a: '3', b: '2' },
				answers: ['Ce^{2x}+3'],
				expected: { status: 'correct' }
			}
		);
		expect(broken.passed).toBe(false);
		expect(broken.error).toMatch(/solution/);
	});
});
