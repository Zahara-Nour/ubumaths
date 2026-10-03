/**
 * Barème d'une évaluation (chantier 5, spécification A1-A5 validée par David)
 * ==========================================================================
 *
 * Repris de TinyMath (`assessItem`) : une question vaut 1, ½ ou 0 ; la note est
 * ramenée sur 20 au demi-point le plus proche (un quart arrondit au-dessus).
 */

import { describe, it, expect } from 'vitest';
import {
	gradeOutOf20,
	gradeQuestion,
	isKnownForSrs,
	pointsOfStatus,
	roundToHalfPoint,
	statusFromBlankStatuses,
	statusFromChoices
} from '../grading';
import type { SubmittedAnswer } from '../grading';
import type { InstanceBlank, QuestionInstance } from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function blanksInstance(
	blanks: InstanceBlank[],
	options: QuestionInstance['options'] = undefined
): QuestionInstance {
	return {
		templateId: 'grading',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function choicesInstance(correct: boolean[], order: number[], multipleAnswers = true) {
	return {
		templateId: 'grading-qcm',
		statement: 'Choisis' as ResolvedMarkdown,
		choices: correct.map((isCorrect, i) => ({
			content: `c${i}` as ResolvedMarkdown,
			isCorrect
		})),
		// Ordre AFFICHÉ : position → indice d'origine
		shuffledChoices: order.map((originalIndex) => ({
			content: `c${originalIndex}` as ResolvedMarkdown,
			originalIndex
		})),
		correctChoiceIndex: correct.flatMap((c, i) => (c ? [String(i)] : [])),
		multipleAnswers,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	} satisfies QuestionInstance;
}

const math = (expectedAnswer: string): InstanceBlank => ({ expectedAnswer, type: 'math' });

describe('A1-A3 : statut d’une question à cases, depuis le statut de chaque case', () => {
	it('A1 : toutes justes → correct (1 point)', () => {
		expect(statusFromBlankStatuses(['correct', 'correct'])).toBe('correct');
		expect(pointsOfStatus('correct')).toBe(1);
	});

	it('A1 : une case en forme non optimale → ½', () => {
		const status = statusFromBlankStatuses(['correct', 'unoptimal_form']);
		expect(status).toBe('unoptimal_form');
		expect(pointsOfStatus(status)).toBe(0.5);
	});

	it('A2 : une case fausse → 0, même si les autres sont justes', () => {
		const status = statusFromBlankStatuses(['correct', 'incorrect', 'correct']);
		expect(status).toBe('incorrect');
		expect(pointsOfStatus(status)).toBe(0);
	});

	it('A2 : une case en mauvaise forme → 0', () => {
		const status = statusFromBlankStatuses(['correct', 'bad_form']);
		expect(status).toBe('bad_form');
		expect(pointsOfStatus(status)).toBe(0);
	});

	it('A3 : cases remplies justes, vides ≤ moitié → ½', () => {
		expect(pointsOfStatus(statusFromBlankStatuses(['correct', 'empty']))).toBe(0.5);
		expect(pointsOfStatus(statusFromBlankStatuses(['correct', 'correct', 'empty']))).toBe(0.5);
	});

	it('A3 : vides > moitié → 0', () => {
		const status = statusFromBlankStatuses(['correct', 'empty', 'empty']);
		expect(status).toBe('incorrect');
		expect(pointsOfStatus(status)).toBe(0);
	});

	it('A3 : tout vide → 0 (statut empty)', () => {
		expect(statusFromBlankStatuses(['empty', 'empty'])).toBe('empty');
		expect(pointsOfStatus('empty')).toBe(0);
	});

	it('A3 : une case vide ET une case fausse → 0', () => {
		expect(pointsOfStatus(statusFromBlankStatuses(['incorrect', 'correct', 'empty']))).toBe(0);
	});
});

describe('A4 : QCM', () => {
	it('exactement les bonnes → 1', () => {
		expect(statusFromChoices([0, 2], [2, 0])).toBe('correct');
	});

	it('une mauvaise cochée → 0, même avec toutes les bonnes', () => {
		expect(statusFromChoices([0, 1, 2], [0, 2])).toBe('incorrect');
	});

	it('bonnes cochées mais il en manque → ½', () => {
		const status = statusFromChoices([0], [0, 2]);
		expect(status).toBe('unoptimal_form');
		expect(pointsOfStatus(status)).toBe(0.5);
	});

	it('rien coché → 0 (empty)', () => {
		expect(statusFromChoices([], [1])).toBe('empty');
	});

	it('choix unique : le mauvais → 0', () => {
		expect(statusFromChoices([1], [0])).toBe('incorrect');
	});
});

describe('A5 : note sur 20 au demi-point, quart au-dessus', () => {
	it.each([
		[7.5, 10, 15],
		[6.25, 8, 15.5], // 15,625 → 15,5
		[10, 10, 20],
		[0, 10, 0],
		[0.5, 8, 1.5], // 1,25 : quart → au-dessus
		[3, 8, 7.5],
		[1, 3, 6.5], // 6,666… : plus près de 6,5 que de 7
		[10.5, 17, 12.5] // 12,352… → 12,5
	])('%d points sur %d → %d', (points, total, expected) => {
		expect(gradeOutOf20(points, total)).toBe(expected);
	});

	it('12,46 → 12,5 : arrondi par le code (numeric arrondirait avant le CHECK)', () => {
		expect(roundToHalfPoint(12.46)).toBe(12.5);
		expect(roundToHalfPoint(12.24)).toBe(12);
		expect(roundToHalfPoint(12.25)).toBe(12.5);
		expect(roundToHalfPoint(12.75)).toBe(13);
	});

	it('toujours un multiple de 0,5 entre 0 et 20', () => {
		for (let total = 1; total <= 40; total++) {
			for (let halfPoints = 0; halfPoints <= total * 2; halfPoints++) {
				const grade = gradeOutOf20(halfPoints / 2, total);
				expect(grade * 2).toBe(Math.trunc(grade * 2));
				expect(grade).toBeGreaterThanOrEqual(0);
				expect(grade).toBeLessThanOrEqual(20);
			}
		}
	});

	it('aucune question → 0', () => {
		expect(gradeOutOf20(0, 0)).toBe(0);
	});
});

describe('gradeQuestion : corrige une vraie instance', () => {
	it('deux cases justes → 1', () => {
		const verdict = gradeQuestion(blanksInstance([math('7'), math('8')]), {
			values: ['7', '8'],
			latex: ['7', '8']
		});
		expect(verdict).toMatchObject({ status: 'correct', points: 1, isCorrect: true });
	});

	it('une case fausse → 0', () => {
		const verdict = gradeQuestion(blanksInstance([math('7'), math('8')]), {
			values: ['7', '9'],
			latex: ['7', '9']
		});
		expect(verdict).toMatchObject({ status: 'incorrect', points: 0, isCorrect: false });
	});

	it('une case vide sur deux, l’autre juste → ½', () => {
		const verdict = gradeQuestion(blanksInstance([math('7'), math('8')]), {
			values: ['7', ''],
			latex: ['7', '']
		});
		expect(verdict).toMatchObject({ status: 'unoptimal_form', points: 0.5, isCorrect: false });
	});

	it('mauvaise forme (400+80 pour 480, forme stricte par défaut) → 0', () => {
		const verdict = gradeQuestion(blanksInstance([math('480')]), {
			values: ['400+80'],
			latex: ['400+80']
		});
		expect(verdict).toMatchObject({ status: 'bad_form', points: 0 });
	});

	it('sans ordre, arrondi non fait mais juste (1,136 pour 1,14) → bad_form, 0', () => {
		const hundredth = { type: 'decimal', digits: 2 } as const;
		const verdict = gradeQuestion(
			blanksInstance(
				[
					{ expectedAnswer: '2.5', type: 'math', precision: hundredth },
					{ expectedAnswer: '1.136', type: 'math', precision: hundredth }
				],
				{ orderIndependent: true }
			),
			{ values: ['1{,}136', '2{,}5'], latex: ['1{,}136', '2{,}5'] }
		);
		expect(verdict).toMatchObject({ status: 'bad_form', points: 0, isCorrect: false });
	});

	it('forme non optimale (form: warn) → ½', () => {
		const verdict = gradeQuestion(
			blanksInstance([math('480')], { constraints: { form: 'warn' } }),
			{ values: ['400+80'], latex: ['400+80'] }
		);
		expect(verdict).toMatchObject({ status: 'unoptimal_form', points: 0.5 });
	});

	it('réponse absente → 0 (empty)', () => {
		const verdict = gradeQuestion(blanksInstance([math('7')]), {});
		expect(verdict).toMatchObject({ status: 'empty', points: 0 });
	});

	it('nombre de cases différent de l’attendu → 0, jamais une exception', () => {
		const verdict = gradeQuestion(blanksInstance([math('7'), math('8')]), { values: ['7'] });
		expect(verdict.points).toBe(0);
	});

	describe('forme exigée jugée sur la VALEUR envoyée, jamais sur un LaTeX fourni à part (audit)', () => {
		const factorise = () =>
			blanksInstance([{ ...math('(x+1)(x+2)'), requiredForm: 'product' }], {
				constraints: { form: 'off' }
			});

		it('forme factorisée : 1 point', () => {
			expect(gradeQuestion(factorise(), { values: ['(x+1)(x+2)'] }).points).toBe(1);
		});

		it('forme développée, sans LaTeX : pas 1 point', () => {
			expect(gradeQuestion(factorise(), { values: ['x^2+3x+2'] }).points).toBe(0);
		});

		it('forme développée, LaTeX trompeur (factorisé) : pas 1 point', () => {
			const lying = { values: ['x^2+3x+2'], latex: ['(x+1)(x+2)'] } as SubmittedAnswer;
			expect(gradeQuestion(factorise(), lying).points).toBe(0);
		});
	});

	it('orderIndependent : statut par réponse, cases trouvées par appariement', () => {
		const instance = blanksInstance([math('7'), math('8')], { orderIndependent: true });
		expect(gradeQuestion(instance, { values: ['8', '7'], latex: ['8', '7'] }).points).toBe(1);
		expect(gradeQuestion(instance, { values: ['8', ''], latex: ['8', ''] }).points).toBe(0.5);
		expect(gradeQuestion(instance, { values: ['9', '7'], latex: ['9', '7'] }).points).toBe(0);
	});

	it('QCM : les positions AFFICHÉES sont ramenées aux indices d’origine', () => {
		// Affichage : [c2, c0, c1] ; bonnes : c0 et c2 → positions 0 et 1
		const instance = choicesInstance([true, false, true], [2, 0, 1]);
		expect(gradeQuestion(instance, { choices: [0, 1] })).toMatchObject({
			status: 'correct',
			points: 1
		});
		expect(gradeQuestion(instance, { choices: [1] })).toMatchObject({
			status: 'unoptimal_form',
			points: 0.5
		});
		expect(gradeQuestion(instance, { choices: [1, 2] })).toMatchObject({
			status: 'incorrect',
			points: 0
		});
	});

	it('QCM : la réponse rendue est en indices d’ORIGINE (ceux que lit la copie)', () => {
		const instance = choicesInstance([true, false, true], [2, 0, 1]);
		expect(gradeQuestion(instance, { choices: [0, 1] }).choiceIndexes).toEqual([2, 0]);
		expect(gradeQuestion(instance, { choices: [2] }).choiceIndexes).toEqual([1]);
	});

	it('QCM : position hors bornes → 0', () => {
		const instance = choicesInstance([true, false], [0, 1], false);
		expect(gradeQuestion(instance, { choices: [5] }).points).toBe(0);
	});
});

describe('Q40 (choix a de David) : le ½ point ne vaut « Bien » pour le SRS que pour la forme', () => {
	it('forme non optimale (form: warn) : ½ point, « Bien »', () => {
		const verdict = gradeQuestion(
			blanksInstance([math('480')], { constraints: { form: 'warn' } }),
			{
				values: ['400+80']
			}
		);
		expect(verdict).toMatchObject({ points: 0.5, partial: false });
		expect(isKnownForSrs(verdict)).toBe(true);
	});

	it('cases partiellement vides (le reste juste) : ½ point, « À revoir »', () => {
		const verdict = gradeQuestion(blanksInstance([math('7'), math('8')]), { values: ['7', ''] });
		expect(verdict).toMatchObject({ points: 0.5, partial: true });
		expect(isKnownForSrs(verdict)).toBe(false);
	});

	it('QCM coché partiellement, sans erreur : ½ point, « À revoir »', () => {
		const verdict = gradeQuestion(choicesInstance([true, false, true], [2, 0, 1]), {
			choices: [1]
		});
		expect(verdict).toMatchObject({ points: 0.5, partial: true });
		expect(isKnownForSrs(verdict)).toBe(false);
	});

	it('juste : « Bien » ; faux : « À revoir »', () => {
		const instance = blanksInstance([math('7')]);
		expect(isKnownForSrs(gradeQuestion(instance, { values: ['7'] }))).toBe(true);
		expect(isKnownForSrs(gradeQuestion(instance, { values: ['9'] }))).toBe(false);
	});
});
