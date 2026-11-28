/**
 * Case « droite paramétrique » (outil 64) dans toute la chaîne, comme la case
 * « résolution » (resolution-answer-wiring.test.ts) : validateur (navigateur), barème
 * serveur, générateur, schémas Zod, specs de test du modèle, version publique.
 * Comportements validés par David (phase 0, 2026-11-28).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import { validateAnswer } from '#lib/utils/answer-validator.ts';
import { formatParametricAnswer } from '../parametric/parametric-lines';
import type { InstanceBlank, QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '#lib/ubumark/index.ts';

// Fixtures
const EXPECTED = 'x=1+2t\\\\y=2\\\\z=-1+3t';

function instanceWith(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'droite',
		statement: 'Représentation de $d$\n\n$$\\placeholder[0]{}$$' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['T_SPE'],
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

const BLANK: InstanceBlank = {
	expectedAnswer: EXPECTED,
	type: 'math',
	answerKind: 'droite-parametrique'
};

function verdictOf(lines: string[]) {
	const answer = formatParametricAnswer(lines);
	return validateAnswer([answer], instanceWith(BLANK), [answer]);
}

function statusOf(lines: string[]): string {
	const result = verdictOf(lines);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

const TEMPLATE_BLANK: TemplateBlank = {
	expectedAnswer: 'x={{a}}+({{u}})t\\\\y=2\\\\z=-1+3t',
	answerKind: 'droite-parametrique'
};

function templateWith(blank: TemplateBlank, cleanCoefficients = false): QuestionTemplate {
	return {
		id: 'test-droite-parametrique',
		title: 'Droite',
		status: 'draft',
		...(cleanCoefficients && { shared: { cleanCoefficients: true } }),
		variations: [
			{
				statement: templateMarkdown('Représentation de $d$\n\n$$?$$'),
				variables: [
					{ name: 'a', expression: '1' },
					{ name: 'u', expression: '-2' }
				],
				blanks: [blank]
			}
		],
		grades: ['T_SPE'],
		level: 1
	};
}

describe('validateAnswer : case droite paramétrique', () => {
	it.each([
		[['1+2t', '2', '-1+3t'], 'correct'],
		[['3+2t', '2', '2+3t'], 'correct'],
		[['1-4k', '2', '-1-6k'], 'correct'],
		[['1+2t-0', '2', '-1+\\frac{6}{2}t'], 'correct'],
		[['2+t', '2t', '3-t'], 'incorrect'],
		[['1+2t', '', '-1+3t'], 'incorrect'],
		[['', '', ''], 'empty']
	] as const)('%j → %s', (lines, status) => {
		expect(statusOf([...lines])).toBe(status);
	});

	it('vecteur non colinéaire : message sous la case', () => {
		expect(verdictOf(['1+2t', '2+t', '-1+3t']).feedback).toBe(
			"Ton vecteur directeur n'est pas colinéaire à celui de la droite."
		);
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		[['3+2t', '2', '2+3t'], 'correct', 1],
		[['1+2t', '2+t', '-1+3t'], 'incorrect', 0],
		[['', '', ''], 'empty', 0]
	] as const)('%j', (lines, status, points) => {
		const answer = formatParametricAnswer([...lines]);
		const server = gradeQuestion(instanceWith(BLANK), { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('générateur, schémas, version publique', () => {
	it('résout les variables et rend le corrigé en système', () => {
		const result = generateInstance(templateWith(TEMPLATE_BLANK), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('droite-parametrique');
		expect(blank.expectedAnswerLatex).toContain('\\begin{cases}');
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('droite-parametrique');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('cleanCoefficients nettoie chaque ligne à part', () => {
		const result = generateInstance(templateWith(TEMPLATE_BLANK, true), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].expectedAnswer).toBe('x=1-2t\\\\y=2\\\\z=-1+3t');
	});

	it('une erreur prévue est refusée', () => {
		const result = generateInstance(
			templateWith({
				...TEMPLATE_BLANK,
				expectedErrors: [{ answer: 'x=2+t\\\\y=2t\\\\z=3-t', message: 'Échangés' }]
			}),
			1
		);
		expect(result.success).toBe(false);
	});

	it('schémas : answerKind accepté', () => {
		expect(blankSchema.safeParse(TEMPLATE_BLANK).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ answerKind: 'droite-parametrique' }).success).toBe(true);
	});
});

describe('specs de test du modèle', () => {
	it('autre représentation de la même droite : la spec passe', () => {
		const result = runTestSpec(templateWith(TEMPLATE_BLANK), {
			description: 'autre point',
			variables: { a: '1', u: '-2' },
			answers: ['x=-1-2t\\\\y=2\\\\z=2+3t'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('attendue sans paramètre : erreur du modèle', () => {
		const result = runTestSpec(
			templateWith({ ...TEMPLATE_BLANK, expectedAnswer: 'x=1\\\\y=2\\\\z=3' }),
			{
				description: 'modèle fautif',
				variables: { a: '1', u: '-2' },
				answers: ['x=1\\\\y=2\\\\z=3'],
				expected: { status: 'correct' }
			}
		);
		expect(result.passed).toBe(false);
		expect(result.error).toContain('Réponse attendue invalide');
	});
});
