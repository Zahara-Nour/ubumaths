/**
 * Statuts case par case d'une copie d'évaluation, RECALCULÉS à l'affichage
 * (chantier « résultat attendu », lot 2, décision Q102 a)
 * ======================================================================
 *
 * Aucun stockage : depuis l'instance figée et la réponse enregistrée, le
 * serveur recalcule le verdict détaillé. Non-régression : les statuts par case
 * redonnent le statut global ENREGISTRÉ (celui de la note), et c'est ce dernier
 * qui est servi.
 */
import { describe, it, expect, vi } from 'vitest';
import { detailsWithinBudget, detailOfCorrected, submittedCopyDetails } from '../corrected-detail';
import { gradeQuestion, statusFromBlankStatuses } from '$lib/questions/grading';
import {
	GRADING_BUDGET_EXCEEDED_FEEDBACK,
	SUBMISSION_GRADING_BUDGET_MS,
	SUBMITTED_COPY_DETAIL_BUDGET_MS
} from '../grading-budget';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { DetailedVerdict } from '$lib/utils/answer-validator';
import type { CorrectedDetail } from '$lib/types/evaluation-attempt';

// Fixtures
const math = (expectedAnswer: string): InstanceBlank => ({
	expectedAnswer,
	expectedAnswerLatex: expectedAnswer,
	type: 'math'
});

function blanksInstance(
	blanks: InstanceBlank[],
	options: QuestionInstance['options'] = undefined
): QuestionInstance {
	return {
		templateId: 'detail',
		statement: '$\\placeholder[0]{}$ et $\\placeholder[1]{}$' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1,
		generatedAt: '',
		...(options && { options })
	};
}

const qcm: QuestionInstance = {
	templateId: 'qcm',
	statement: 'Choisis' as ResolvedMarkdown,
	choices: [true, false, true].map((isCorrect, i) => ({
		content: `c${i}` as ResolvedMarkdown,
		isCorrect
	})),
	shuffledChoices: [2, 0, 1].map((originalIndex) => ({
		content: `c${originalIndex}` as ResolvedMarkdown,
		originalIndex
	})),
	correctChoiceIndex: ['0', '2'],
	multipleAnswers: true,
	grades: ['6'],
	theme: 'T',
	domain: 'D',
	level: 1,
	generatedAt: ''
};

const two = blanksInstance([math('7'), math('8')]);

/** Détail recalculé (chemin nominal) : jamais « indisponible » */
function available(detail: CorrectedDetail): DetailedVerdict {
	if ('unavailable' in detail) throw new Error('détail indisponible inattendu');
	return detail;
}
const warnForm = blanksInstance([math('480'), math('1')], { constraints: { form: 'warn' } });

// Tests
describe('verdict détaillé recalculé = statut global enregistré (non-régression)', () => {
	it.each([
		['tout juste', two, ['7', '8']],
		['une fausse', two, ['7', '9']],
		['une vide, l’autre juste (½ partiel)', two, ['7', '']],
		['deux vides', two, ['', '']],
		['forme non optimale (½)', warnForm, ['400+80', '1']],
		['mauvaise forme (0)', blanksInstance([math('480'), math('1')]), ['400+80', '1']]
	])('%s', (_name, instance, values) => {
		const graded = gradeQuestion(instance, { values });
		const detail = available(
			detailOfCorrected({ instance, answer: { values }, status: graded.status })
		);
		expect(detail.status).toBe(graded.status);
		expect(statusFromBlankStatuses(detail.blanks.map((b) => b.status))).toBe(graded.status);
	});

	it('QCM (indices d’ORIGINE enregistrés) : issue de chaque choix', () => {
		// Coché c0 seulement : c2 oublié → ½
		const graded = gradeQuestion(qcm, { choices: [1] });
		expect(graded.status).toBe('unoptimal_form');
		const detail = available(
			detailOfCorrected({
				instance: qcm,
				answer: { choiceIndexes: graded.choiceIndexes },
				status: graded.status
			})
		);
		expect(detail.status).toBe('unoptimal_form');
		expect(detail.choices?.map((c) => c.outcome)).toEqual([
			'checked-correct',
			'unchecked',
			'missed'
		]);
	});

	it('sans réponse : chaque case vide, statut enregistré', () => {
		const detail = available(detailOfCorrected({ instance: two, answer: null, status: 'empty' }));
		expect(detail.status).toBe('empty');
		expect(detail.blanks.map((b) => b.status)).toEqual(['empty', 'empty']);
	});

	it('le statut SERVI est celui enregistré, même si le recalcul diverge', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const detail = detailOfCorrected({
			instance: two,
			answer: { values: ['7', '8'] },
			status: 'incorrect'
		});
		expect(detail.status).toBe('incorrect');
		// Aucune donnée d'élève dans le journal
		expect(JSON.stringify(warn.mock.calls)).not.toContain('"7"');
		warn.mockRestore();
	});
});

describe('budget de temps (réponses hostiles) : détail INDISPONIBLE (Q173)', () => {
	it('question non corrigée faute de budget : PAS de recalcul, aucun statut par case', () => {
		const validate = vi.fn();
		const [detail] = detailsWithinBudget(
			[
				{
					instance: two,
					answer: { values: ['7', ''] },
					status: 'incorrect',
					feedback: GRADING_BUDGET_EXCEEDED_FEEDBACK
				}
			],
			{ validate }
		);
		expect(validate).not.toHaveBeenCalled();
		expect(detail).toEqual({ unavailable: true, status: 'incorrect' });
	});

	it('budget épuisé en cours d’affichage : nominal intact, restantes indisponibles', () => {
		let now = 0;
		// Validateur factice : 1re case juste, 2de fausse (statut global : faux)
		const validate = vi.fn((instance: QuestionInstance) => {
			now += 10;
			return {
				status: 'incorrect' as const,
				blanks: (instance.blanks ?? []).map((_, index) => ({
					index,
					status: index === 0 ? ('correct' as const) : ('incorrect' as const),
					remarks: [],
					answer: ''
				}))
			};
		});
		const items = [
			{ instance: two, answer: { values: ['7', '9'] }, status: 'incorrect' as const },
			{ instance: two, answer: { values: ['7', '9'] }, status: 'incorrect' as const },
			// Juste + fausse : l'ancien repli affichait les DEUX cases « faux »
			{ instance: two, answer: { values: ['7', '9'] }, status: 'incorrect' as const },
			// ½ point (une case vide) : l'ancien repli affichait « forme à améliorer » sur la juste
			{ instance: two, answer: { values: ['7', ''] }, status: 'unoptimal_form' as const },
			{ instance: qcm, answer: { choiceIndexes: [0] }, status: 'unoptimal_form' as const }
		];
		const details = detailsWithinBudget(items, { budgetMs: 15, clock: () => now, validate });
		expect(validate).toHaveBeenCalledTimes(2);
		// Chemin nominal : les VRAIS statuts par case
		for (const detail of details.slice(0, 2)) {
			expect('unavailable' in detail).toBe(false);
			if (!('unavailable' in detail)) {
				expect(detail.blanks.map((b) => b.status)).toEqual(['correct', 'incorrect']);
			}
		}
		// Repli : seul le statut ENREGISTRÉ, aucun statut par case inventé
		expect(details.slice(2)).toEqual([
			{ unavailable: true, status: 'incorrect' },
			{ unavailable: true, status: 'unoptimal_form' },
			{ unavailable: true, status: 'unoptimal_form' }
		]);
	});

	it('validateur en échec : détail indisponible, statut enregistré', () => {
		const validate = vi.fn(() => {
			throw new Error('boum');
		});
		const [detail] = detailsWithinBudget(
			[{ instance: two, answer: { values: ['7', '9'] }, status: 'incorrect' }],
			{ validate }
		);
		expect(detail).toEqual({ unavailable: true, status: 'incorrect' });
	});
});

describe('copie déjà notée relue (renvoi, 409) : budget RÉDUIT', () => {
	it('le recalcul s’arrête à SUBMITTED_COPY_DETAIL_BUDGET_MS, même si un budget plus long est fourni', () => {
		expect(SUBMITTED_COPY_DETAIL_BUDGET_MS).toBeLessThan(SUBMISSION_GRADING_BUDGET_MS);
		let now = 0;
		// Chaque recalcul coûte 60 % du budget réduit : le 2e le dépasse
		const validate = vi.fn((instance: QuestionInstance) => {
			now += SUBMITTED_COPY_DETAIL_BUDGET_MS * 0.6;
			return {
				status: 'correct' as const,
				blanks: (instance.blanks ?? []).map((_, index) => ({
					index,
					status: 'correct' as const,
					remarks: [],
					answer: ''
				}))
			};
		});
		const items = [0, 1, 2].map(() => ({
			instance: two,
			answer: { values: ['7', '8'] },
			status: 'correct' as const
		}));
		const details = submittedCopyDetails(items, {
			budgetMs: SUBMISSION_GRADING_BUDGET_MS,
			clock: () => now,
			validate
		});
		expect(validate).toHaveBeenCalledTimes(2);
		expect(details[2]).toEqual({ unavailable: true, status: 'correct' });
	});
});
