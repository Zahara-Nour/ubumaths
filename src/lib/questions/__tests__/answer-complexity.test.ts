/**
 * Garde de complexité d'une réponse (décision Q58 de David, 2026-10-01)
 * =====================================================================
 *
 * Une réponse hostile (radicaux imbriqués, exposant géant, réponse démesurée)
 * est refusée AVANT toute correction, au point d'entrée commun des cases
 * ordinaires : navigateur (`validateAnswer`, `isBlankValueCorrect`) comme
 * serveur (`gradeQuestion`). Statut `incorrect` (0 point), message figé,
 * jamais d'exception. Les cases « intervalles » gardent leur propre garde.
 */

import { describe, it, expect } from 'vitest';
import {
	ANSWER_COMPLEXITY_LIMITS,
	ANSWER_TOO_COMPLEX_FEEDBACK,
	isAnswerTooComplex,
	measureAnswerComplexity
} from '../answer-complexity';
import { gradeQuestion } from '../grading';
import { INTERVAL_FEEDBACK } from '../intervals/interval-answer';
import { isBlankValueCorrect, validateAnswer } from '$lib/utils/answer-validator';
import type { InstanceBlank, QuestionInstance } from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
/** Budget d'une correction hostile (navigateur ET serveur) */
const BUDGET_MS = 50;

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'garde-complexite',
		statement: 'Calcule' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

const expressionBlank: InstanceBlank = { expectedAnswer: '2', type: 'math' };

const nestedSqrt = (n: number) => '\\sqrt{'.repeat(n) + '2' + '}'.repeat(n);

/** Attaques mesurées (Q58) : coût avant la garde, dans le worktree des intervalles */
const ATTACKS: [string, string][] = [
	['\\sqrt imbriqués ×12 (107 ms serveur, 213 ms navigateur)', nestedSqrt(12)],
	['\\sqrt imbriqués ×14 (~500 ms)', nestedSqrt(14)],
	['\\sqrt imbriqués ×60 (~500 ms)', nestedSqrt(60)],
	['\\sqrt imbriqués sans accolades ×14', '\\sqrt'.repeat(14) + '2'],
	['2^{9999999} (764 ms)', '2^{9999999}'],
	['2^{99999999} (544 ms)', '2^{99999999}'],
	['\\sqrt{2^{9999999}} (757 ms)', '\\sqrt{2^{9999999}}'],
	['réponse démesurée', '1+'.repeat(5000) + '1']
];

function timed<T>(run: () => T): { value: T; ms: number } {
	const start = performance.now();
	const value = run();
	return { value, ms: performance.now() - start };
}

describe('measureAnswerComplexity', () => {
	it('mesure longueur, profondeur et chiffres d’exposant', () => {
		expect(measureAnswerComplexity('\\frac{3}{4}x^{2}')).toEqual({
			length: 16,
			depth: 1,
			exponentDigits: 1
		});
		expect(measureAnswerComplexity('10^{-12}').exponentDigits).toBe(2);
		expect(measureAnswerComplexity('0{,}000001').exponentDigits).toBe(0);
	});

	it('compte les radicaux imbriqués avec ou sans accolades', () => {
		expect(measureAnswerComplexity(nestedSqrt(5)).depth).toBe(5);
		expect(measureAnswerComplexity('\\sqrt\\sqrt\\sqrt2').depth).toBe(3);
		expect(measureAnswerComplexity('\\sqrt[3]{\\sqrt{2}}').depth).toBe(2);
	});

	it('compte parenthèses, fractions et puissances emboîtées', () => {
		expect(measureAnswerComplexity('\\left(\\frac{\\sqrt{3}}{2}\\right)^{2}').depth).toBe(3);
		expect(measureAnswerComplexity('2^{2^{2^{2}}}').depth).toBe(3);
	});

	it('ignore les zéros de tête d’un exposant', () => {
		expect(measureAnswerComplexity('2^{0000009}').exponentDigits).toBe(1);
	});

	it('ne lève jamais sur une écriture déséquilibrée', () => {
		for (const text of ['}}}((', '\\sqrt', '^', '\\frac{', '{{{{', ')))]]]', '']) {
			expect(() => measureAnswerComplexity(text)).not.toThrow();
		}
	});
});

describe('isAnswerTooComplex', () => {
	it.each(ATTACKS)('%s : refusée', (_label, answer) => {
		expect(isAnswerTooComplex(answer)).toBe(true);
	});

	it('limites larges : 9 niveaux et 4 chiffres d’exposant passent', () => {
		expect(isAnswerTooComplex(nestedSqrt(ANSWER_COMPLEXITY_LIMITS.depth))).toBe(false);
		expect(isAnswerTooComplex('2^{1000}')).toBe(false);
	});
});

describe('validateAnswer (navigateur) — case expression', () => {
	it.each(ATTACKS)('%s : fausse, avec le message, en moins de 50 ms', (_label, answer) => {
		const instance = instanceWith([expressionBlank]);
		const { value, ms } = timed(() => validateAnswer([answer], instance, [answer]));
		expect(value.isCorrect).toBe(false);
		expect(value.status ?? 'incorrect').toBe('incorrect');
		expect(value.feedback).toBe(ANSWER_TOO_COMPLEX_FEEDBACK);
		expect(ms).toBeLessThan(BUDGET_MS);
	});

	it.each(ATTACKS)('%s : case colorée fausse en moins de 50 ms', (_label, answer) => {
		const { value, ms } = timed(() =>
			isBlankValueCorrect(answer, expressionBlank, instanceWith([]))
		);
		expect(value).toBe(false);
		expect(ms).toBeLessThan(BUDGET_MS);
	});

	it('case numérique et case à unité : même refus', () => {
		const numeric: InstanceBlank = {
			expectedAnswer: '1.41',
			type: 'math',
			precision: { type: 'decimal', digits: 2 }
		};
		const unit: InstanceBlank = {
			expectedAnswer: '5\\unit{km}',
			type: 'math',
			unit: { expected: true }
		};
		for (const blank of [numeric, unit]) {
			const answer = nestedSqrt(14);
			const { value, ms } = timed(() => validateAnswer([answer], instanceWith([blank]), [answer]));
			expect(value.feedback).toBe(ANSWER_TOO_COMPLEX_FEEDBACK);
			expect(ms).toBeLessThan(BUDGET_MS);
		}
	});

	it('ordre indifférent : refus avec le message, sans appariement coûteux', () => {
		const instance = instanceWith([expressionBlank, { expectedAnswer: '3', type: 'math' }], {
			orderIndependent: true
		});
		const answers = [nestedSqrt(14), '3'];
		const { value, ms } = timed(() => validateAnswer(answers, instance, answers));
		expect(value.isCorrect).toBe(false);
		expect(value.feedback).toBe(ANSWER_TOO_COMPLEX_FEEDBACK);
		expect(ms).toBeLessThan(BUDGET_MS);
	});

	it('réponse légitime longue : développement d’un polynôme de degré 4 à coefficients fractionnaires', () => {
		const expected =
			'\\frac{3}{4}x^4-\\frac{5}{6}x^3+\\frac{7}{12}x^2-\\frac{11}{15}x+\\frac{13}{20}';
		const answer =
			'\\dfrac{3}{4}x^{4}-\\dfrac{5}{6}x^{3}+\\dfrac{7}{12}x^{2}-\\dfrac{11}{15}x+\\dfrac{13}{20}';
		const instance = instanceWith([{ expectedAnswer: expected, type: 'math' }]);
		expect(isAnswerTooComplex(answer)).toBe(false);
		expect(validateAnswer([answer], instance, [answer]).isCorrect).toBe(true);
	});

	it('réponse légitime emboîtée : produit de facteurs au carré', () => {
		const answer = '\\left(\\frac{\\sqrt{3}}{2}x-\\left(1-\\sqrt{2}\\right)\\right)^{2}';
		expect(isAnswerTooComplex(answer)).toBe(false);
	});
});

describe('gradeQuestion (serveur) — case expression', () => {
	it.each(ATTACKS)('%s : 0 point, message, en moins de 50 ms', (_label, answer) => {
		const instance = instanceWith([expressionBlank]);
		const { value, ms } = timed(() => gradeQuestion(instance, { values: [answer] }));
		expect(value).toMatchObject({ status: 'incorrect', points: 0, isCorrect: false });
		expect(value.blankFeedback?.[0] ?? value.feedback).toBe(ANSWER_TOO_COMPLEX_FEEDBACK);
		expect(ms).toBeLessThan(BUDGET_MS);
	});

	it('vingt questions hostiles : bien moins d’une seconde au total', () => {
		const instance = instanceWith([expressionBlank]);
		const { ms } = timed(() => {
			for (let i = 0; i < 20; i++) gradeQuestion(instance, { values: ['\\sqrt{2^{9999999}}'] });
		});
		expect(ms).toBeLessThan(20 * BUDGET_MS);
	});
});

describe('cases intervalles : inchangées', () => {
	it('leur propre garde et leur propre message', () => {
		const blank: InstanceBlank = {
			expectedAnswer: ']-\\infty;2[',
			type: 'math',
			answerKind: 'intervalles'
		};
		const answer = `]-\\infty;${nestedSqrt(12)}[`;
		const result = validateAnswer([answer], instanceWith([blank]), [answer]);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(INTERVAL_FEEDBACK.tooComplex);
	});
});
