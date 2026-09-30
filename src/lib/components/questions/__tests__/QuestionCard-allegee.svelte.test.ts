/**
 * QuestionCard allégée (demande de David, 2026-09-30) — carte de l'Entraînement
 * ============================================================================
 *
 * Comme le recto de la flash-card : ni titre « Question », ni badge du type, ni
 * intitulés « Énoncé » / « Votre réponse », ni encadré autour de l'énoncé. Pour une
 * question à trous, l'énoncé n'apparaît qu'UNE fois (la zone de saisie le porte
 * déjà) ; pour un QCM : l'énoncé puis les choix.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

const base = {
	grades: ['6'],
	theme: 'Entiers',
	domain: 'Calcul',
	level: 1,
	generatedAt: new Date().toISOString()
};

function blankQuestion(): QuestionInstance {
	return {
		...base,
		templateId: 'tpl-trou',
		statement: resolvedMarkdown('Calcule le double de sept. $$2 \\times 7 = {{blank:0}}$$'),
		blanks: [{ expectedAnswer: '14', expectedAnswerLatex: '14', type: 'math' }]
	} as unknown as QuestionInstance;
}

function qcm(): QuestionInstance {
	return {
		...base,
		templateId: 'tpl-qcm',
		statement: resolvedMarkdown('Quelle est la capitale de la France ?'),
		choices: [
			{ content: resolvedMarkdown('Lyon'), isCorrect: false },
			{ content: resolvedMarkdown('Paris'), isCorrect: true }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown('Lyon'), originalIndex: 0 },
			{ content: resolvedMarkdown('Paris'), originalIndex: 1 }
		],
		correctChoiceIndex: '1'
	} as QuestionInstance;
}

function occurrences(text: string, needle: string): number {
	return text.split(needle).length - 1;
}

describe('QuestionCard — carte allégée', () => {
	it('ni « Question », ni badge du type, ni « Énoncé », ni « Votre réponse »', async () => {
		const { container } = await render(QuestionCard, {
			instance: blankQuestion(),
			interactive: true
		});
		const text = container.textContent ?? '';

		expect(text).not.toMatch(/\bQuestion\b/);
		expect(text).not.toContain('fill_in_blanks');
		expect(text).not.toContain('Énoncé');
		expect(text).not.toContain('Votre réponse');
	});

	it('question à trous : l’énoncé n’apparaît qu’une fois', async () => {
		const { container } = await render(QuestionCard, {
			instance: blankQuestion(),
			interactive: true
		});

		expect(occurrences(container.textContent ?? '', 'Calcule le double de sept.')).toBe(1);
	});

	it('QCM : l’énoncé une fois, puis les choix', async () => {
		const { container } = await render(QuestionCard, { instance: qcm(), interactive: true });
		const text = container.textContent ?? '';

		expect(occurrences(text, 'Quelle est la capitale de la France ?')).toBe(1);
		expect(text).toContain('Paris');
		expect(text).not.toContain('multiple_choice');
	});

	it('pas d’encadré autour de l’énoncé', async () => {
		const { container } = await render(QuestionCard, { instance: qcm(), interactive: true });

		expect(container.querySelector('.statement-content.border')).toBeNull();
	});

	it('non interactive : l’énoncé est affiché (lecture seule)', async () => {
		const { container } = await render(QuestionCard, { instance: qcm(), interactive: false });

		expect(container.textContent).toContain('Quelle est la capitale de la France ?');
	});
});
