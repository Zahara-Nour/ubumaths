/**
 * QCM à plusieurs réponses et préréglage Vrai / Faux (chantier 2)
 * ===============================================================
 *
 * Spécification validée par David le 2026-10-02
 * (`docs/wip/qcm-multi-vrai-faux-progress.md`) :
 * - V1 : sans « plusieurs réponses », exactement une bonne réponse ; avec, au
 *   moins une ; message en français ;
 * - V3/V4 : la validation du navigateur rend le MÊME statut que la note du
 *   serveur (`statusFromChoices`) : ½ = `unoptimal_form`, « Il manque des
 *   réponses. », jamais « juste » (SRS : à revoir) ;
 * - V6 : avec mélange, les bonnes réponses restent les bonnes ;
 * - V8 : un Vrai / Faux (`options.shuffleChoices = false`) n'est jamais mélangé.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer, validateAnswerDetailed } from '$lib/utils/answer-validator';
import { gradeQuestion, isKnownForSrs, statusFromChoices } from '../grading';
import { generateInstance } from '../generator/instance-generator';
import { validateTemplate } from '../validators/template-validator';
import { choiceAnswerCountErrors } from '../validators/choice-answer-count';
import { MISSING_CHOICES_FEEDBACK } from '../feedback';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../types';

// Fixtures
function qcmTemplate(
	correct: boolean[],
	settings: {
		multipleAnswers?: boolean;
		shuffleChoices?: boolean;
		contents?: string[];
		variation?: Partial<QuestionVariation>;
	} = {}
): QuestionTemplate {
	const choices = correct.map((isCorrect, i) => ({
		content: templateMarkdown(settings.contents?.[i] ?? `choix ${i}`),
		isCorrect
	}));
	const indexes = correct.flatMap((c, i) => (c ? [String(i)] : []));
	return {
		id: 'qcm-multi',
		title: 'QCM',
		status: 'draft',
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...(settings.multipleAnswers !== undefined && { multipleAnswers: settings.multipleAnswers }),
		...(settings.shuffleChoices !== undefined && {
			options: { shuffleChoices: settings.shuffleChoices }
		}),
		variations: [
			{
				statement: templateMarkdown('Quels nombres sont pairs ?'),
				choices,
				...(indexes.length > 0 && {
					correctChoiceIndex: indexes.length === 1 ? indexes[0] : indexes
				}),
				...settings.variation
			}
		]
	};
}

function generate(template: QuestionTemplate, seed: number): QuestionInstance {
	const result = generateInstance(template, seed);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

/** Toutes les parties d'un ensemble d'indices */
function subsets(count: number): number[][] {
	const all: number[][] = [];
	for (let mask = 0; mask < 1 << count; mask++) {
		all.push(Array.from({ length: count }, (_, i) => i).filter((i) => mask & (1 << i)));
	}
	return all;
}

// Deux bonnes réponses (0 et 2) sur quatre
const MULTI = qcmTemplate([true, false, true, false], { multipleAnswers: true });

describe('V1 — nombre de bonnes réponses à l’enregistrement', () => {
	it('réponse unique : exactement une bonne réponse est acceptée', () => {
		expect(choiceAnswerCountErrors(qcmTemplate([true, false, false]))).toEqual([]);
		expect(validateTemplate(qcmTemplate([true, false, false]))).toEqual([]);
	});

	it('réponse unique : deux bonnes réponses sont refusées, en français', () => {
		const template = qcmTemplate([true, false, true]);
		const errors = choiceAnswerCountErrors(template);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatch(/Variation 1/);
		expect(errors[0]).toMatch(/plusieurs réponses/);
		expect(validateTemplate(template)).toContain(errors[0]);
	});

	it('plusieurs réponses : deux bonnes réponses sont acceptées', () => {
		expect(choiceAnswerCountErrors(MULTI)).toEqual([]);
		expect(validateTemplate(MULTI)).toEqual([]);
	});

	it('plusieurs réponses : une seule bonne réponse suffit', () => {
		const template = qcmTemplate([true, false, false], { multipleAnswers: true });
		expect(validateTemplate(template)).toEqual([]);
	});

	it('aucune bonne réponse : refusé à la publication, en français, avec ou sans « plusieurs »', () => {
		for (const multipleAnswers of [true, false]) {
			const template = qcmTemplate([false, false], { multipleAnswers });
			const errors = choiceAnswerCountErrors(template);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatch(/aucune bonne réponse/i);
		}
	});

	it('un brouillon peut rester sans bonne réponse, jamais en avoir trop', () => {
		expect(choiceAnswerCountErrors(qcmTemplate([false, false]), { draft: true })).toEqual([]);
		expect(choiceAnswerCountErrors(qcmTemplate([true, true, false]), { draft: true })).toHaveLength(
			1
		);
	});

	it('bonne réponse dynamique (`{{if:…}}`, tableau à un élément) : une seule', () => {
		const template = qcmTemplate([false, false], {
			variation: { correctChoiceIndex: ['{{if:mod(a,2)=0|0|1}}'] }
		});
		expect(choiceAnswerCountErrors(template)).toEqual([]);
	});

	it('choix partagés : le nombre se lit sur la réponse partagée', () => {
		const template: QuestionTemplate = {
			...qcmTemplate([false, false]),
			shared: {
				choices: [
					{ content: templateMarkdown('A'), isCorrect: true },
					{ content: templateMarkdown('B'), isCorrect: true }
				],
				correctChoiceIndex: ['0', '1']
			},
			variations: [{ statement: templateMarkdown('Énoncé') }]
		};
		expect(choiceAnswerCountErrors(template)).toHaveLength(1);
		expect(choiceAnswerCountErrors({ ...template, multipleAnswers: true })).toEqual([]);
	});

	it('une question à cases n’est pas concernée', () => {
		const template: QuestionTemplate = {
			...qcmTemplate([]),
			variations: [
				{ statement: templateMarkdown('$1+1={{blank}}$'), blanks: [{ expectedAnswer: '2' }] }
			]
		};
		expect(choiceAnswerCountErrors(template)).toEqual([]);
	});
});

describe('V3/V4 — même statut dans le navigateur et sur le serveur', () => {
	const instance = generate(MULTI, 7);

	it('juste : toutes les bonnes, aucune mauvaise', () => {
		const result = validateAnswer([0, 2], instance);
		expect(result.status).toBe('correct');
		expect(result.isCorrect).toBe(true);
	});

	it('partiel : une partie des bonnes sans mauvaise → ½, « Il manque des réponses. », pas juste', () => {
		const result = validateAnswer([2], instance);
		expect(result.status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(MISSING_CHOICES_FEEDBACK);
		expect(MISSING_CHOICES_FEEDBACK).toBe('Il manque des réponses.');
	});

	it('une mauvaise cochée → faux, même avec toutes les bonnes', () => {
		const result = validateAnswer([0, 1, 2], instance);
		expect(result.status).toBe('incorrect');
		expect(result.isCorrect).toBe(false);
	});

	it('rien coché → vide', () => {
		const result = validateAnswer([], instance);
		expect(result.status).toBe('empty');
		expect(result.isCorrect).toBe(false);
	});

	it('réponse unique : le bon choix est juste, un autre est faux (inchangé)', () => {
		const single = generate(qcmTemplate([false, true, false]), 3);
		expect(validateAnswer(1, single)).toMatchObject({ isCorrect: true });
		expect(validateAnswer(0, single)).toMatchObject({ isCorrect: false, status: 'incorrect' });
	});

	it('avec mélange : pour chaque graine et chaque réponse, statut navigateur = statut serveur', () => {
		for (const seed of [1, 2, 3, 4, 5, 11, 42]) {
			const shuffled = generate(MULTI, seed);
			const order = shuffled.shuffledChoices!.map((c) => c.originalIndex);
			for (const positions of subsets(4)) {
				const originals = positions.map((p) => order[p]);
				const server = gradeQuestion(shuffled, { choices: positions });
				const browser = validateAnswer(originals, shuffled);
				expect(browser.status, `graine ${seed}, positions ${positions}`).toBe(server.status);
				expect(browser.isCorrect).toBe(server.isCorrect);
				expect(browser.status).toBe(statusFromChoices(originals, [0, 2]));
			}
		}
	});

	it('détail (verso, résultat attendu) : même statut ½', () => {
		const detail = validateAnswerDetailed(instance, { choiceIndexes: [0] });
		expect(detail.status).toBe('unoptimal_form');
	});

	it('SRS / statistiques : un ½ partiel n’est pas « su » (à revoir, Q40)', () => {
		const partial = gradeQuestion(instance, {
			choices: [instance.shuffledChoices!.findIndex((c) => c.originalIndex === 0)]
		});
		expect(partial).toMatchObject({ status: 'unoptimal_form', points: 0.5, partial: true });
		expect(isKnownForSrs(partial)).toBe(false);
		// Entraînement / flash-cards : le SRS et les tentatives lisent `isCorrect`
		expect(validateAnswer([0], instance).isCorrect).toBe(false);
	});
});

describe('V6 — mélange : les bonnes réponses restent les bonnes', () => {
	it('quelle que soit la graine, les choix justes gardent leur indice d’origine', () => {
		const orders = new Set<string>();
		for (let seed = 0; seed < 40; seed++) {
			const instance = generate(MULTI, seed);
			const order = instance.shuffledChoices!.map((c) => c.originalIndex);
			orders.add(order.join());
			expect(instance.correctChoiceIndex).toEqual(['0', '2']);
			expect(instance.choices!.map((c) => c.isCorrect)).toEqual([true, false, true, false]);
			// Le contenu affiché suit son indice d'origine
			for (const choice of instance.shuffledChoices!) {
				expect(choice.content).toBe(`choix ${choice.originalIndex}`);
			}
		}
		// Le mélange a bien lieu
		expect(orders.size).toBeGreaterThan(1);
	});
});

describe('V8 — Vrai / Faux : jamais mélangé (Q106)', () => {
	const trueFalse = qcmTemplate([false, true], {
		shuffleChoices: false,
		contents: ['Vrai', 'Faux']
	});

	it('l’instance garde l’ordre Vrai, Faux, quelle que soit la graine', () => {
		for (let seed = 0; seed < 30; seed++) {
			const instance = generate(trueFalse, seed);
			expect(instance.shuffledChoices!.map((c) => c.content)).toEqual(['Vrai', 'Faux']);
			expect(instance.shuffledChoices!.map((c) => c.originalIndex)).toEqual([0, 1]);
		}
	});

	it('reste un QCM ordinaire : même notation', () => {
		const instance = generate(trueFalse, 5);
		expect(validateAnswer(1, instance).isCorrect).toBe(true);
		expect(gradeQuestion(instance, { choices: [1] }).points).toBe(1);
		expect(gradeQuestion(instance, { choices: [0] }).points).toBe(0);
	});
});
