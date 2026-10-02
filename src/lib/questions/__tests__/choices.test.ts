/**
 * QCM : l'élève clique une position AFFICHÉE, la validation parle en indices d'ORIGINE
 * ===================================================================================
 *
 * Bug de production (2026-10-01) : les cartes envoyaient les positions affichées à
 * `validateAnswer`. Le générateur mélangeant toujours les choix, le bon choix était
 * refusé 34 fois sur 40 graines, et un mauvais choix accepté quand il occupait la
 * position qui porte l'indice d'origine du bon.
 */

import { describe, it, expect } from 'vitest';
import {
	choiceLetter,
	correctOriginalChoiceIndexes,
	isDisplayedChoiceCorrect,
	toDisplayedChoicePosition,
	toOriginalChoiceIndexes
} from '../choices';
import { generateInstance } from '../generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { resolvedMarkdown, templateMarkdown } from '$lib/ubumark';

// Affiché : [Lyon (2), Paris (0), Nice (3), Marseille (1)] ; bon choix : Paris (0)
const shuffledInstance = {
	correctChoiceIndex: '0',
	choices: ['Paris', 'Marseille', 'Lyon', 'Nice'].map((c, i) => ({
		content: resolvedMarkdown(c),
		isCorrect: i === 0
	})),
	shuffledChoices: [
		{ content: resolvedMarkdown('Lyon'), originalIndex: 2 },
		{ content: resolvedMarkdown('Paris'), originalIndex: 0 },
		{ content: resolvedMarkdown('Nice'), originalIndex: 3 },
		{ content: resolvedMarkdown('Marseille'), originalIndex: 1 }
	]
} satisfies Pick<QuestionInstance, 'correctChoiceIndex' | 'choices' | 'shuffledChoices'>;

describe('toOriginalChoiceIndexes', () => {
	it('traduit chaque position affichée en indice d’origine', () => {
		expect(toOriginalChoiceIndexes(shuffledInstance, [1])).toEqual([0]);
		expect(toOriginalChoiceIndexes(shuffledInstance, [0, 2])).toEqual([2, 3]);
	});

	it('écarte une position hors de la liste affichée', () => {
		expect(toOriginalChoiceIndexes(shuffledInstance, [4, -1, 1])).toEqual([0]);
	});

	it('identité sans choix mélangés', () => {
		expect(toOriginalChoiceIndexes({ correctChoiceIndex: '0' }, [2, 1])).toEqual([2, 1]);
	});
});

describe('toDisplayedChoicePosition / isDisplayedChoiceCorrect', () => {
	it('retrouve la position affichée d’un indice d’origine', () => {
		expect(toDisplayedChoicePosition(shuffledInstance, 0)).toBe(1);
		expect(toDisplayedChoicePosition(shuffledInstance, 1)).toBe(3);
		expect(choiceLetter(toDisplayedChoicePosition(shuffledInstance, 0))).toBe('B');
	});

	it('marque le bon choix à sa position affichée, pas à son indice d’origine', () => {
		expect([0, 1, 2, 3].map((p) => isDisplayedChoiceCorrect(shuffledInstance, p))).toEqual([
			false,
			true,
			false,
			false
		]);
	});

	it('lit correctChoiceIndex simple ou multiple', () => {
		expect(correctOriginalChoiceIndexes({ correctChoiceIndex: ['0', '3'] })).toEqual([0, 3]);
		expect(correctOriginalChoiceIndexes({ correctChoiceIndex: undefined })).toEqual([]);
	});
});

describe('validateAnswer — la lettre de la correction désigne la position AFFICHÉE', () => {
	it('QCM à une réponse : « B », là où Paris est affiché', () => {
		const result = validateAnswer(2, shuffledInstance as QuestionInstance);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Le choix correct est: B');
	});

	it('QCM à réponses multiples : lettres affichées, dans l’ordre', () => {
		// Un mauvais choix coché (1) : la correction nomme les bons. Un choix juste
		// seul vaudrait ½ (« Il manque des réponses. », V3 du chantier 2)
		const result = validateAnswer([1], {
			...shuffledInstance,
			correctChoiceIndex: ['0', '3'],
			multipleAnswers: true
		} as QuestionInstance);
		expect(result.feedback).toBe('Les choix corrects sont: B, C');
	});
});

describe('générateur réel, graines 1 à 40 (la mesure de production)', () => {
	const template: QuestionTemplate = {
		id: 'qcm-capitale',
		title: 'Capitale',
		status: 'draft',
		grades: ['6'],
		theme: 'Culture',
		domain: 'Géographie',
		level: 1,
		variations: [
			{
				statement: templateMarkdown('Capitale de la France ?'),
				choices: ['Paris', 'Marseille', 'Lyon', 'Nice'].map((c) => ({
					content: templateMarkdown(c)
				})),
				correctChoiceIndex: '0'
			}
		]
	};

	function instances(): QuestionInstance[] {
		return Array.from({ length: 40 }, (_, i) => {
			const generated = generateInstance(template, i + 1);
			if (!generated.success) throw new Error(generated.errors.join('; '));
			return generated.instance;
		});
	}

	it('le décor mélange vraiment : la plupart des graines déplacent le bon choix', () => {
		const moved = instances().filter((inst) => toDisplayedChoicePosition(inst, 0) !== 0);
		expect(moved.length).toBeGreaterThan(20);
	});

	it('cliquer le bon choix affiché est accepté 40 fois sur 40', () => {
		const accepted = instances().filter((inst) => {
			const position = inst.shuffledChoices!.findIndex((c) => c.content === 'Paris');
			const [value] = toOriginalChoiceIndexes(inst, [position]);
			return validateAnswer(value, inst).isCorrect;
		});
		expect(accepted).toHaveLength(40);
	});

	it('cliquer un mauvais choix affiché est refusé, quelle que soit sa position', () => {
		for (const inst of instances()) {
			inst.shuffledChoices!.forEach((choice, position) => {
				if (choice.content === 'Paris') return;
				const [value] = toOriginalChoiceIndexes(inst, [position]);
				expect(validateAnswer(value, inst).isCorrect).toBe(false);
			});
		}
	});
});
