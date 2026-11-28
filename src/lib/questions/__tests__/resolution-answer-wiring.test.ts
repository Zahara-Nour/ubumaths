/**
 * Case « résolution » (outil 55) dans toute la chaîne, comme les cases « primitive »
 * et « solution-ed » (calculus-answer-wiring.test.ts) : validateur (navigateur),
 * barème serveur, générateur, schémas Zod, specs de test du modèle, version
 * publique. Comportements validés par David (phase 0, 2026-11-28).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import { validateAnswer } from '#lib/utils/answer-validator.ts';
import { formatResolutionAnswer } from '../resolution/resolution-lines';
import type { InstanceBlank, QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '#lib/ubumark/index.ts';

// Fixtures
function instanceWith(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'equation',
		statement: 'Résous : $3x-5=7$\n\n$$\\placeholder[0]{}$$' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['4e'],
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function resolutionBlank(extra: Partial<InstanceBlank> = {}): InstanceBlank {
	return {
		expectedAnswer: 'x=4',
		type: 'math',
		answerKind: 'resolution',
		equation: '3x-5=7',
		...extra
	};
}

function verdictOf(lines: string[], blank: InstanceBlank = resolutionBlank()) {
	const answer = formatResolutionAnswer(lines);
	return validateAnswer([answer], instanceWith(blank), [answer]);
}

function statusOf(lines: string[], blank?: InstanceBlank): string {
	const result = verdictOf(lines, blank);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

const TEMPLATE_BLANK: TemplateBlank = {
	expectedAnswer: 'x={{s}}',
	answerKind: 'resolution',
	equation: '{{a}}x-{{b}}={{c}}'
};

function templateWith(blank: TemplateBlank): QuestionTemplate {
	return {
		id: 'test-resolution',
		title: 'Équation',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Résous : ${{a}}x-{{b}}={{c}}$\n\n$$?$$'),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '5' },
					{ name: 'c', expression: '7' },
					{ name: 's', expression: '4' }
				],
				blanks: [blank]
			}
		],
		grades: ['4e'],
		level: 1
	};
}

describe('validateAnswer : case résolution (3x − 5 = 7)', () => {
	it.each([
		[['3x=12', 'x=4'], 'correct'],
		[['x=4'], 'correct'],
		[['3x=12', 'x=\\frac{12}{3}'], 'unoptimal_form'],
		[['3x=2', 'x=4'], 'incorrect'],
		[['3x=12'], 'incorrect'],
		[[], 'empty']
	] as const)('%j → %s', (lines, status) => {
		expect(statusOf([...lines])).toBe(status);
	});

	it('la première ligne fausse : message sous la case', () => {
		expect(verdictOf(['3x=2', 'x=\\frac{2}{3}']).feedback).toBe(
			"La ligne 1 n'a pas les mêmes solutions que la précédente."
		);
	});

	it('minLines 2 : x = 4 seul est faux, avec une étape juste', () => {
		const blank = resolutionBlank({ minLines: 2 });
		expect(statusOf(['x=4'], blank)).toBe('incorrect');
		expect(statusOf(['3x=12', 'x=4'], blank)).toBe('correct');
	});

	it('acceptDecimal : x = 2,5 pour 5/2', () => {
		const blank = resolutionBlank({ equation: '2x=5', expectedAnswer: 'x=\\frac{5}{2}' });
		expect(statusOf(['x=2{,}5'], { ...blank, acceptDecimal: true })).toBe('correct');
	});

	it('longue résolution : la garde de complexité mesure chaque ligne, pas la réponse entière', () => {
		const step = '\\frac{3x}{3}-\\frac{5}{3}+\\frac{5}{3}=\\frac{7}{3}+\\frac{5}{3}';
		const lines = [...Array.from({ length: 10 }, () => step), 'x=4'];
		expect(formatResolutionAnswer(lines).length).toBeGreaterThan(400);
		expect(statusOf(lines)).toBe('correct');
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		[['3x=12', 'x=4'], 'correct', 1],
		[['3x=2', 'x=4'], 'incorrect', 0],
		[[], 'empty', 0]
	] as const)('%j', (lines, status, points) => {
		const instance = instanceWith(resolutionBlank());
		const answer = formatResolutionAnswer([...lines]);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('générateur, schémas, version publique', () => {
	it('recopie answerKind, l’équation résolue et minLines', () => {
		const result = generateInstance(templateWith({ ...TEMPLATE_BLANK, minLines: 2 }), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('resolution');
		expect(blank.equation).toBe('3x-5=7');
		expect(blank.minLines).toBe(2);
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('resolution');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('sans équation : génération en échec', () => {
		const result = generateInstance(
			templateWith({ expectedAnswer: 'x=4', answerKind: 'resolution' }),
			1
		);
		expect(result.success).toBe(false);
	});

	it('schémas : answerKind et minLines acceptés, minLines borné', () => {
		expect(blankSchema.safeParse({ ...TEMPLATE_BLANK, minLines: 3 }).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ answerKind: 'resolution', minLines: 2 }).success).toBe(
			true
		);
		expect(blankSchema.safeParse({ ...TEMPLATE_BLANK, minLines: 0 }).success).toBe(false);
		expect(blankSchema.safeParse({ ...TEMPLATE_BLANK, minLines: 2.5 }).success).toBe(false);
		expect(blankSchema.safeParse({ ...TEMPLATE_BLANK, minLines: 21 }).success).toBe(false);
	});
});

describe('specs de test du modèle', () => {
	it('résolution juste : la spec passe', () => {
		const result = runTestSpec(templateWith(TEMPLATE_BLANK), {
			description: 'étapes',
			variables: { a: '3', b: '5', c: '7', s: '4' },
			answers: [formatResolutionAnswer(['3x=12', 'x=4'])],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('attendue qui n’est pas la solution : erreur du modèle', () => {
		const result = runTestSpec(templateWith({ ...TEMPLATE_BLANK, expectedAnswer: 'x=5' }), {
			description: 'modèle fautif',
			variables: { a: '3', b: '5', c: '7', s: '4' },
			answers: [formatResolutionAnswer(['x=4'])],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/pas la solution/);
	});
});
