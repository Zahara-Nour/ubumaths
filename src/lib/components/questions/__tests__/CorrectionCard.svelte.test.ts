/**
 * CorrectionCard — la « Réponse correcte » affichée dans les résultats
 * (Entraînement, Course aux nombres).
 *
 * Défaut constaté le 2026-09-30 : la carte affichait `correctChoiceIndex`,
 * qui n'existe que pour un QCM → « undefined » pour toute question à trous, et
 * un numéro de choix au lieu de son contenu pour un QCM.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { resolvedMarkdown } from '$lib/ubumark';

function result(instance: Partial<QuestionInstance>): TestAnswerResult {
	return {
		index: 0,
		instance: {
			templateId: 't',
			statement: resolvedMarkdown('Calcule.'),
			grades: ['6'],
			theme: 'Entiers',
			domain: 'Multiplier',
			level: 1,
			generatedAt: new Date().toISOString(),
			...instance
		} as QuestionInstance,
		userAnswer: { value: ['150'], isCorrect: false, timeSpent: 3, attempts: 1, submittedAt: '' },
		isCorrect: false
	};
}

function correctSection(container: HTMLElement): string {
	return container.querySelector('.correct-answer-section')?.textContent ?? '';
}

describe('CorrectionCard — réponse correcte', () => {
	it('question à trou : la réponse attendue, jamais « undefined »', async () => {
		const { container } = await render(CorrectionCard, {
			answerResult: result({
				blanks: [{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }]
			} as Partial<QuestionInstance>)
		});

		expect(correctSection(container)).toContain('160');
		expect(correctSection(container)).not.toContain('undefined');
	});

	it('plusieurs trous : toutes les réponses attendues', async () => {
		const { container } = await render(CorrectionCard, {
			answerResult: result({
				blanks: [
					{ expectedAnswer: '2', expectedAnswerLatex: '2', type: 'math' },
					{ expectedAnswer: 'dizaines', type: 'text' }
				]
			} as Partial<QuestionInstance>)
		});

		expect(correctSection(container)).toContain('2');
		expect(correctSection(container)).toContain('dizaines');
	});

	it('QCM : le contenu du bon choix, pas son numéro', async () => {
		const { container } = await render(CorrectionCard, {
			answerResult: result({
				choices: [
					{ content: resolvedMarkdown('Lyon'), isCorrect: false },
					{ content: resolvedMarkdown('Paris'), isCorrect: true }
				],
				correctChoiceIndex: '1'
			} as Partial<QuestionInstance>)
		});

		expect(correctSection(container)).toContain('Paris');
		expect(correctSection(container)).not.toContain('Lyon');
	});
});

/**
 * Le choix coché est enregistré en indice d'ORIGINE (correctif du 2026-10-01) ;
 * l'élève l'a vu à une position mélangée : la lettre doit être celle qu'il a vue.
 */
describe('CorrectionCard — votre réponse à un QCM mélangé', () => {
	it('lettre de la position affichée et contenu du choix coché', async () => {
		const answerResult = result({
			choices: [
				{ content: resolvedMarkdown('Paris'), isCorrect: true },
				{ content: resolvedMarkdown('Marseille'), isCorrect: false },
				{ content: resolvedMarkdown('Lyon'), isCorrect: false }
			],
			// Lyon (origine 2) affiché en A
			shuffledChoices: [
				{ content: resolvedMarkdown('Lyon'), originalIndex: 2 },
				{ content: resolvedMarkdown('Paris'), originalIndex: 0 },
				{ content: resolvedMarkdown('Marseille'), originalIndex: 1 }
			],
			correctChoiceIndex: '0'
		} as Partial<QuestionInstance>);
		answerResult.userAnswer = { ...answerResult.userAnswer!, value: 2 };

		const main = document.body.appendChild(document.createElement('main'));
		const { container } = await render(CorrectionCard, { target: main, props: { answerResult } });

		const answer = container.querySelector('.user-answer-section li')?.textContent ?? '';
		expect(answer.trim().startsWith('A')).toBe(true);
		expect(answer).toContain('Lyon');
	});
});
